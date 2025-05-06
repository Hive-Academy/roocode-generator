import { Result } from '../../core/result/result';
import { MessageContent } from './types';

export interface IContentProcessor {
  stripMarkdownCodeBlock(content: MessageContent): Result<string>;
  /**
   * Removes HTML comments (<!-- ... -->) from the content.
   * @param content - The input string content.
   * @returns A Result containing the content with comments removed or an Error.
   */
  stripHtmlComments(content: string): Result<string, Error>;
  processTemplate(template: string, data: Record<string, unknown>): Promise<Result<string>>;
}
