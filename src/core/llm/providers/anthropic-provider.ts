import { Injectable, Inject } from '@core/di/decorators';
import { Result } from '@core/result/result';
import { BaseLLMProvider } from '@core/llm/llm-provider';
import { LLMProviderError } from '@core/llm/llm-provider-errors';
import type { ILogger } from '@core/services/logger-service';
import { LLMConfig } from 'types/shared';
import { ChatAnthropic } from '@langchain/anthropic';

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
    // Anthropic uses its own token counting, use approximation for now
    return Promise.resolve(Math.ceil(text.length / 4));
  }
}
