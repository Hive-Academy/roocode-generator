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
      const completion = data.choices[0]?.message?.content;

      if (!completion) {
        throw new LLMProviderError(
          'OpenRouter response missing completion content',
          'INVALID_RESPONSE',
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
}
