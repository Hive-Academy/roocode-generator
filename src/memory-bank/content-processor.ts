import { Injectable } from '../core/di/decorators';
import { IContentProcessor, MessageContent } from './interfaces';
import { Result } from '../core/result/result';

@Injectable()
export class ContentProcessor implements IContentProcessor {
  stripMarkdownCodeBlock(content: MessageContent): Result<string> {
    try {
      const processed = content
        .replace(/^```\s*([\s\S]*?)\s*```$/im, '$1')
        .replace(/^```\s*([\s\S]*?)\s*```$/im, '$1');
      return Result.ok(processed);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return Result.err(err);
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
      const err = error instanceof Error ? error : new Error(String(error));
      return Result.err(err);
    }
  }
}
