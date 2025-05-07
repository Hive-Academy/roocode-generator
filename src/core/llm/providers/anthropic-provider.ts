import { Injectable, Inject } from '@core/di/decorators';
import { Result } from '@core/result/result';
import { BaseLLMProvider } from '@core/llm/llm-provider';
import { LLMProviderError } from '@core/llm/llm-provider-errors';
import type { ILogger } from '@core/services/logger-service';
import { LLMConfig } from 'types/shared';
import { ChatAnthropic } from '@langchain/anthropic';
import { z } from 'zod';

type AnthropicTokenCountResponse = {
  total_tokens: number;
};
@Injectable()
export class AnthropicProvider extends BaseLLMProvider {
  public readonly name = 'anthropic';
  private model: ChatAnthropic;

  constructor(
    private readonly config: LLMConfig,
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly clientFactory: () => ChatAnthropic
  ) {
    super();
    this.defaultContextSize = 100000; // Claude has a large context window
    const model = this.clientFactory();
    model.temperature = this.config.temperature;
    model.modelName = this.config.model;
    this.model = model;
  }

  async getCompletion(systemPrompt: string, userPrompt: string): Promise<Result<string, Error>> {
    try {
      this.logger.debug(`Sending completion request to Anthropic (model: ${this.config.model})`);
      const response = await this.model.predict(`${systemPrompt}\n\nUser Input: ${userPrompt}`);
      return Result.ok(response);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to get completion from Anthropic', err);
      return Result.err(LLMProviderError.fromError(error, this.name));
    }
  }

  async getContextWindowSize(): Promise<number> {
    return Promise.resolve(this.defaultContextSize);
  }

  async countTokens(text: string): Promise<number> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages/count_tokens', {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          text: text,
        }),
      });

      if (!response.ok) {
        this.logger.warn(
          `Failed to count tokens for Anthropic model ${this.config.model}, using approximation`
        );
        return Promise.resolve(Math.ceil(text.length / 4));
      }

      const data = (await response.json()) as AnthropicTokenCountResponse;
      const tokenCount = data?.total_tokens || Math.ceil(text.length / 4);
      return Promise.resolve(tokenCount);
    } catch (error: any) {
      this.logger.warn(
        `Failed to count tokens for Anthropic model ${this.config.model}, using approximation: ${error?.message}`
      );
      return Promise.resolve(Math.ceil(text.length / 4));
    }
  }

  async getStructuredCompletion<T extends z.ZodTypeAny>(
    _systemPrompt: string,
    _userPrompt: string,
    _schema: T
  ): Promise<Result<z.infer<T>, Error>> {
    this.logger.warn(
      `getStructuredCompletion is not yet fully implemented for ${this.name}. Attempting fallback or throwing error.`
    );
    // For now, throw a NotImplementedError.
    // Alternatively, one could try to use this.getCompletion and then parse/validate,
    // but that bypasses the benefits of withStructuredOutput.
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
