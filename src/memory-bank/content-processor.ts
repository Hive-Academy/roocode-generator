import { Injectable, Inject } from '../core/di/decorators';
import { IContentProcessor, MessageContent } from './interfaces';
import { Result } from '../core/result/result';
import { MemoryBankError } from '../core/errors/memory-bank-errors';
import { ILogger } from '../core/services/logger-service';

@Injectable()
export class ContentProcessor implements IContentProcessor {
  constructor(@Inject('ILogger') private readonly logger: ILogger) {}

  // Helper method to wrap caught errors during processing
  private _wrapProcessingError(
    message: string,
    operation: string,
    caughtError: unknown,
    additionalContext?: Record<string, unknown>
  ): Result<never> {
    const cause = caughtError instanceof Error ? caughtError : new Error(String(caughtError));
    const error = new MemoryBankError(message, { ...additionalContext, operation }, cause);
    this.logger.error(error.message, error);
    return Result.err(error);
  }

  stripMarkdownCodeBlock(content: MessageContent): Result<string> {
    try {
      // Remove ^ and $ anchors to match code blocks anywhere in the string
      // Also match and discard optional language identifier after ```
      const processed = content
        .replace(/```markdown\s*([\s\S]*?)\s*```/im, '$1') // Specific markdown block
        .replace(/```[a-zA-Z]*\s*([\s\S]*?)\s*```/im, '$1'); // Generic block with optional language
      return Result.ok(processed);
    } catch (error) {
      return this._wrapProcessingError(
        'Content processing failed during markdown stripping',
        'stripMarkdownCodeBlock',
        error
      );
    }
  }

  async processTemplate(template: string, data: Record<string, unknown>): Promise<Result<string>> {
    await Promise.resolve();
    try {
      let processed = template;
      for (const [key, value] of Object.entries(data)) {
        const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        processed = processed.replace(regex, String(value));
      }
      return Result.ok(processed);
    } catch (error) {
      return this._wrapProcessingError(
        'Content processing failed during template processing',
        'processTemplate',
        error,
        { templateKeys: Object.keys(data) }
      );
    }
  }
}
