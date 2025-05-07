import { Injectable, Inject } from '@core/di/decorators';
import { Result } from '@core/result/result';
import { BaseLLMProvider } from '@core/llm/llm-provider';
import { LLMProviderError } from '@core/llm/llm-provider-errors';
import type { ILogger } from '@core/services/logger-service';
import { LLMConfig } from 'types/shared';
import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';

// Type definitions for OpenAI API responses
type OpenAIModelResponse = {
  data: Array<{
    id: string;
    object: string;
    created: number;
    model: string;
    owned_by: string;
    context_length?: number;
  }>;
};

type OpenAITokenCountResponse = {
  usage: {
    total_tokens: number;
  };
};

@Injectable()
export class OpenAIProvider extends BaseLLMProvider {
  public readonly name = 'openai';
  private model: ChatOpenAI;

  constructor(
    private readonly config: LLMConfig,
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly clientFactory: () => ChatOpenAI
  ) {
    super();
    const model = this.clientFactory();
    model.temperature = this.config.temperature;
    model.modelName = this.config.model;
    this.model = model;
  }

  async getCompletion(systemPrompt: string, userPrompt: string): Promise<Result<string, Error>> {
    try {
      this.logger.debug(`Sending completion request to OpenAI (model: ${this.config.model})`);
      const response = await this.model.predict(`${systemPrompt}\n\nUser Input: ${userPrompt}`);
      return Result.ok(response);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to get completion from OpenAI', err);
      return Result.err(LLMProviderError.fromError(error, this.name));
    }
  }

  async getContextWindowSize(): Promise<number> {
    try {
      // Get model info from OpenAI API
      const response = await fetch(`https://api.openai.com/v1/models/${this.config.model}`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.warn(
          `Failed to get context window size for model ${this.config.model}, using default`
        );
        return Promise.resolve(this.defaultContextSize);
      }

      const data = (await response.json()) as OpenAIModelResponse;
      // Extract context window size from model info
      // Different models have different context sizes
      const contextSize = data?.data?.[0]?.context_length || this.defaultContextSize;
      return Promise.resolve(contextSize);
    } catch (error: any) {
      this.logger.warn(
        `Failed to get context window size for model ${this.config.model}, using default ${error?.message}`
      );
      return Promise.resolve(this.defaultContextSize);
    }
  }

  async countTokens(text: string): Promise<number> {
    try {
      // Use OpenAI's token counting API
      const response = await fetch(
        'https://api.openai.com/v1/engines/' + this.config.model + '/embeddings',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: text,
            model: this.config.model,
          }),
        }
      );

      if (!response.ok) {
        this.logger.warn(
          `Failed to count tokens for model ${this.config.model}, using approximation`
        );
        return Promise.resolve(Math.ceil(text.length / 4));
      }

      const data = (await response.json()) as OpenAITokenCountResponse;
      // Extract token count from response
      const tokenCount = data?.usage?.total_tokens || Math.ceil(text.length / 4);
      return Promise.resolve(tokenCount);
    } catch (error: any) {
      this.logger.warn(
        `Failed to count tokens for model ${this.config.model}, using approximation ${error?.message}`
      );
      return Promise.resolve(Math.ceil(text.length / 4));
    }
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
