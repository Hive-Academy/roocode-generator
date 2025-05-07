import { z } from 'zod';
import { Injectable, Inject } from '@core/di/decorators';
import { Result } from '@core/result/result';
import { BaseLLMProvider } from '@core/llm/llm-provider';
import { LLMProviderError } from '@core/llm/llm-provider-errors';
import type { ILogger } from '@core/services/logger-service';
import { LLMConfig } from 'types/shared';

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: number;
    completion: number;
  };
}

interface OpenRouterCompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

interface OpenRouterCompletionResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
}

@Injectable()
export class OpenRouterProvider extends BaseLLMProvider {
  public readonly name = 'openrouter';
  private readonly apiUrl: string;
  private readonly apiKey: string;

  private readonly DEFAULT_API_URL = 'https://openrouter.ai/api/v1';
  private readonly DEFAULT_CONTEXT_SIZE = 4096; // Default to conservative size

  constructor(
    private readonly config: LLMConfig,
    @Inject('ILogger') private readonly logger: ILogger
  ) {
    super();
    this.apiUrl = this.DEFAULT_API_URL;
    this.apiKey = config.apiKey;
  }

  async getCompletion(systemPrompt: string, userPrompt: string): Promise<Result<string, Error>> {
    try {
      this.logger.debug(`Sending completion request to OpenRouter (model: ${this.config.model})`);

      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/roocode-generator',
          'X-Title': 'RooCode Generator',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
        } as OpenRouterCompletionRequest),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ error: response.statusText }))) as {
          error?: string;
        };
        const errorDetails: Record<string, unknown> = {
          statusCode: response.status,
          statusText: response.statusText,
          error: errorData.error,
        };
        throw new LLMProviderError(
          `OpenRouter API error: ${errorData.error || response.statusText}`,
          `HTTP_${response.status}`,
          this.name,
          errorDetails
        );
      }

      const data = (await response.json()) as OpenRouterCompletionResponse;

      // Check for error structure in the response body even if status is OK
      if (data && typeof data === 'object' && 'error' in data) {
        this.logger.error(
          'OpenRouter response contained an error in the body',
          new Error('OpenRouter API error in body')
        );
        const errorMessage = (data as any).error?.message || JSON.stringify((data as any).error);
        throw new LLMProviderError(
          `OpenRouter API error in body: ${errorMessage}`,
          'API_ERROR_IN_BODY',
          this.name,
          { responseData: data }
        );
      }

      // Perform robust checks for the expected structure
      if (!data || !Array.isArray(data.choices) || data.choices.length === 0) {
        this.logger.error(
          'OpenRouter response has invalid structure: missing or empty choices array. Response data: ' +
            JSON.stringify(data),
          new Error('Invalid response structure')
        );
        throw new LLMProviderError(
          'OpenRouter response has invalid structure: missing or empty choices array',
          'INVALID_RESPONSE_FORMAT',
          this.name,
          { responseData: data } as Record<string, unknown>
        );
      }

      const firstChoice = data.choices[0];
      if (!firstChoice || !firstChoice.message) {
        throw new LLMProviderError(
          'OpenRouter response has invalid structure: first choice or message missing',
          'INVALID_RESPONSE_FORMAT',
          this.name,
          { responseData: data } as Record<string, unknown>
        );
      }

      const completion = firstChoice.message.content;

      if (completion === undefined || completion === null) {
        throw new LLMProviderError(
          'OpenRouter response missing completion content',
          'EMPTY_COMPLETION_CONTENT',
          this.name,
          { choices: data.choices } as Record<string, unknown>
        );
      }

      this.logger.debug(
        `Received completion from OpenRouter (model: ${this.config.model}, length: ${completion.length})`
      );

      return Result.ok(completion);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to get completion from OpenRouter', err);
      return Result.err(LLMProviderError.fromError(error, this.name));
    }
  }

  async listModels(): Promise<Result<string[], LLMProviderError>> {
    try {
      const response = await fetch(`${this.apiUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/roocode-generator',
          'X-Title': 'RooCode Generator',
        },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({ error: response.statusText }))) as {
          error?: string;
        };
        const errorDetails: Record<string, unknown> = {
          statusCode: response.status,
          statusText: response.statusText,
          error: errorData.error,
        };
        throw new LLMProviderError(
          `OpenRouter API error: ${errorData.error || response.statusText}`,
          `HTTP_${response.status}`,
          this.name,
          errorDetails
        );
      }

      const data = (await response.json()) as { data: OpenRouterModel[] };
      const models = data.data.map((model) => model.id);
      return Result.ok(models);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to fetch OpenRouter models', err);
      return Result.err(LLMProviderError.fromError(error, this.name));
    }
  }

  /**
   * Get the maximum context window size for the model.
   * Uses the context_length from modelParams if available, otherwise defaults.
   * @returns Promise resolving to the context window size in tokens
   */
  async getContextWindowSize(): Promise<number> {
    // Check if context length is provided in modelParams
    const contextLength = this.config.modelParams?.context_length as number | undefined;
    // Use defaultContextSize from the base class
    return Promise.resolve(contextLength ?? this.defaultContextSize);
  }

  /**
   * Count the number of tokens in a text string using the base class implementation.
   * @param text The text to count tokens for
   * @returns Promise resolving to the token count
   */
  async countTokens(text: string): Promise<number> {
    // OpenRouter doesn't provide a token counting API
    // Use the default implementation from the base class
    return super.countTokens(text);
  }

  async getStructuredCompletion<T extends z.ZodTypeAny>(
    _systemPrompt: string,
    _userPrompt: string,
    _schema: T
  ): Promise<Result<z.infer<T>, Error>> {
    this.logger.warn(`getStructuredCompletion is not yet fully implemented for ${this.name}.`);
    return Promise.resolve(
      Result.err(
        new LLMProviderError(
          `getStructuredCompletion not implemented for ${this.name}`,
          'NOT_IMPLEMENTED',
          this.name
        )
      )
    );
  }
}
