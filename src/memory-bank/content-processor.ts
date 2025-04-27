import { Injectable } from '../core/di/decorators';
import { IContentProcessor, MessageContent } from './interfaces';
import { Result } from '../core/result/result';
import { MemoryBankError } from '../core/errors/memory-bank-errors';

@Injectable()
export class ContentProcessor implements IContentProcessor {
  // Helper method to wrap caught errors during processing
  private _wrapProcessingError(
    message: string,
    operation: string,
    caughtError: unknown,
    additionalContext?: Record<string, unknown>
  ): Result<never> {
    const cause = caughtError instanceof Error ? caughtError : new Error(String(caughtError));
    const error = new MemoryBankError(message, { ...additionalContext, operation }, cause);
    // Note: ContentProcessor doesn't have a logger injected currently.
    // If logging is desired here, it would need to be added via DI.
    return Result.err(error);
  }

  stripMarkdownCodeBlock(content: MessageContent): Result<string> {
    try {
      const processed = content
        .replace(/^```markdown\s*([\s\S]*?)\s*```$/im, '$1')
        .replace(/^```\s*([\s\S]*?)\s*```$/im, '$1');
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
