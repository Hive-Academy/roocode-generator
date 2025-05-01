import { Injectable, Inject } from '@core/di/decorators';
import { Result } from '@core/result/result';
import { BaseLLMProvider } from '@core/llm/llm-provider';
import { LLMProviderError } from '@core/llm/llm-provider-errors';
import type { ILogger } from '@core/services/logger-service';
import { LLMConfig } from 'types/shared';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { GoogleGenAITokenResponse, GoogleGenAIErrorResponse } from '../types/google-genai.types';

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
      this.logger.debug(`Sending completion request to Google GenAI (model: ${this.config.model})`);
      const response = await this.model.predict(`${systemPrompt}\n\nUser Input: ${userPrompt}`);
      return Result.ok(response);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to get completion from Google GenAI', err);
      return Result.err(LLMProviderError.fromError(error, this.name));
    }
  }

  async getContextWindowSize(): Promise<number> {
    return Promise.resolve(this.defaultContextSize);
  }

  async countTokens(text: string): Promise<number> {
    try {
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
        try {
          const errorData = (await response.json()) as GoogleGenAIErrorResponse;
          this.logger.warn(
            `Failed to count tokens for Google GenAI model ${this.config.model}. API Error: ${errorData.error.message} (Code: ${errorData.error.code}). Using approximation.`
          );
        } catch (jsonError: any) {
          // Handle cases where the error response is not valid JSON
          this.logger.warn(
            `Failed to count tokens for Google GenAI model ${this.config.model}. Received non-OK response but could not parse error details. Error: ${jsonError?.message}. Using approximation.`
          );
        }
        return Promise.resolve(Math.ceil(text.length / 4));
      }

      const data = (await response.json()) as GoogleGenAITokenResponse;
      const tokenCount = data?.totalTokens || Math.ceil(text.length / 4);
      return Promise.resolve(tokenCount);
    } catch (error: any) {
      // This catch block handles network errors or issues before the response is received
      this.logger.warn(
        `Failed to count tokens for Google GenAI model ${this.config.model}, using approximation: ${error?.message}`
      );
      return Promise.resolve(Math.ceil(text.length / 4));
    }
  }
}
