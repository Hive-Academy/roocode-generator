import { Result } from '../../core/result/result';
import { MessageContent } from './types';

export interface IContentProcessor {
  stripMarkdownCodeBlock(content: MessageContent): Result<string>;
  processTemplate(template: string, data: Record<string, unknown>): Promise<Result<string>>;
}
