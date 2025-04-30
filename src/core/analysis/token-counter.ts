import { Injectable, Inject } from '../di/decorators';
import { ILogger } from '../services/logger-service';
import { LLMAgent } from '../llm/llm-agent';
import { Result } from '../result/result';
import { ITokenCounter } from './interfaces';

@Injectable()
export class LLMTokenCounter implements ITokenCounter {
  constructor(
    @Inject('LLMAgent') private readonly llmAgent: LLMAgent,
    @Inject('ILogger') private readonly logger: ILogger
  ) {}

  async countTokens(content: string): Promise<Result<number, Error>> {
    try {
      const providerResult = await this.llmAgent.getProvider();
      if (providerResult.isErr() || !providerResult.value) {
        return Result.err(new Error('Failed to get LLM provider for token counting'));
      }

      const tokenCount = await providerResult.value.countTokens(content);
      this.logger.debug(`Counted ${tokenCount} tokens for content`);
      return Result.ok(tokenCount);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error counting tokens: ${errorMessage}`);
      return Result.err(new Error(`Failed to count tokens: ${errorMessage}`));
    }
  }

  async getContextWindowSize(): Promise<Result<number, Error>> {
    try {
      const contextSize = await this.llmAgent.getModelContextWindow();
      this.logger.debug(`Got context window size: ${contextSize}`);
      return Result.ok(contextSize);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error getting context window size: ${errorMessage}`);
      return Result.err(new Error(`Failed to get context window size: ${errorMessage}`));
    }
  }
}
