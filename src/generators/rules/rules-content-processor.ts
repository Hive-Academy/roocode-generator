import { Injectable } from '../../core/di';
import { Result } from '../../core/result/result';
import { IRulesContentProcessor } from './interfaces';

@Injectable()
export class RulesContentProcessor implements IRulesContentProcessor {
  stripMarkdownCodeBlock(content: string): Result<string, Error> {
    if (typeof content !== 'string') {
      return Result.err(new Error('Invalid input: content must be a string'));
    }
    // Basic regex to remove triple backticks and optional language identifier
    const strippedContent = content
      .replace(/^```(?:\w+\n)?/, '')
      .replace(/```$/, '')
      .trim();

    // Ensure the result is a string before returning ok
    if (typeof strippedContent === 'string') {
      return Result.ok(strippedContent);
    } else {
      // This case should theoretically not happen with the regex replace/trim, but good for safety
      return Result.err(new Error('Failed to strip markdown, result was not a string'));
    }
  }
}
