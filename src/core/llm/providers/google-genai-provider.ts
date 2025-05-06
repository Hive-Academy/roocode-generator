import { Injectable, Inject } from '@core/di/decorators';
import { Result } from '@core/result/result';
import { BaseLLMProvider } from '@core/llm/llm-provider';
import { LLMProviderError } from '@core/llm/llm-provider-errors';
import type { ILogger } from '@core/services/logger-service';
import { LLMConfig } from 'types/shared';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { GoogleGenAITokenResponse, GoogleGenAIErrorResponse } from '../types/google-genai.types';
import { retryWithBackoff } from '@core/utils/retry-utils';

// Define a custom error for fetch failures to include status
class FetchError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'FetchError';
    this.status = status;
  }
}

// Retry configuration
const RETRY_OPTIONS = {
  retries: 3,
  initialDelay: 500, // ms
  shouldRetry: (error: any): boolean => {
    // Check for status code in common error structures (fetch response, axios error, potentially langchain errors)
    const status = error?.status ?? error?.response?.status;
    return status === 429 || status === 500 || status === 503;
  },
};

@Injectable()
export class GoogleGenAIProvider extends BaseLLMProvider {
  public readonly name = 'google-genai';
  private model: ChatGoogleGenerativeAI;

  constructor(
    private readonly config: LLMConfig,
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly clientFactory: () => ChatGoogleGenerativeAI
  ) {
    super();
    this.defaultContextSize = 8192;
    const model = this.clientFactory();
    model.temperature = this.config.temperature;
    model.model = this.config.model;
    this.model = model;
  }

  async getCompletion(systemPrompt: string, userPrompt: string): Promise<Result<string, Error>> {
    try {
      this.logger.debug(
        `Sending completion request to Google GenAI (model: ${this.config.model}) with retry`
      );

      const response = await retryWithBackoff(async () => {
        // The actual API call
        return this.model.predict(`${systemPrompt}\n\nUser Input: ${userPrompt}`);
      }, RETRY_OPTIONS);

      return Result.ok(response);
    } catch (error) {
      // This catches the final error after retries are exhausted or if shouldRetry returned false
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to get completion from Google GenAI after retries', err);
      // Wrap the final error
      return Result.err(LLMProviderError.fromError(err, this.name));
    }
  }

  async getContextWindowSize(): Promise<number> {
    return Promise.resolve(this.defaultContextSize);
  }

  async countTokens(text: string): Promise<number> {
    this.logger.debug(`Counting tokens for Google GenAI (model: ${this.config.model}) with retry`);
    try {
      const tokenCount = await retryWithBackoff(
        () => this.performCountTokensRequest(text),
        RETRY_OPTIONS
      );
      return tokenCount;
    } catch (error: any) {
      // This catch block handles the final error after retries or non-retriable errors
      this.logger.warn(
        `Failed to count tokens for Google GenAI model ${this.config.model} after retries, using approximation: ${error?.message}`
      );
      // Log specific details if it was a FetchError
      if (error instanceof FetchError && error.status) {
        this.logger.warn(`Final error status code: ${error.status}`);
      }
      return Math.ceil(text.length / 4); // Return approximation on final failure
    }
  }

  private async performCountTokensRequest(text: string): Promise<number> {
    const response = await fetch(
      `https://${this.config.location}-aiplatform.googleapis.com/v1/projects/${this.config.projectId}/locations/${this.config.location}/publishers/google/models/${this.config.model}:countTokens`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: text,
                },
              ],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      let errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
      try {
        // Try to get more specific error details from the body
        const errorData = (await response.json()) as GoogleGenAIErrorResponse;
        if (errorData?.error?.message) {
          errorMessage = `API Error ${response.status}: ${errorData.error.message} (Code: ${errorData.error.code})`;
        }
      } catch (jsonError: any) {
        // Ignore if error body isn't JSON, use the basic HTTP error message
        this.logger.debug(
          `Could not parse error response body for countTokens: ${jsonError.message}`
        );
      }
      // Throw a custom error including the status code for the retry logic
      throw new FetchError(errorMessage, response.status);
    }

    // Handle successful response
    try {
      const data = (await response.json()) as GoogleGenAITokenResponse;
      if (data && typeof data.totalTokens === 'number') {
        return data.totalTokens;
      } else {
        this.logger.warn(
          `Unexpected successful response structure from countTokens: ${JSON.stringify(data)}. Using approximation.`
        );
        throw new Error('Invalid response structure from countTokens API.'); // Throw to be caught by retry or outer catch
      }
    } catch (jsonParseError: any) {
      this.logger.warn(
        `Failed to parse successful countTokens response: ${jsonParseError.message}. Using approximation.`
      );
      throw new Error(`Failed to parse successful countTokens response: ${jsonParseError.message}`); // Throw to be caught
    }
  }
}
