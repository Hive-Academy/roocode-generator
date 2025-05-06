import { Injectable } from '../../core/di';
import { Result } from '../../core/result/result';
import { IRulesContentProcessor, RulesMetadata } from './interfaces';

@Injectable()
export class RulesContentProcessor implements IRulesContentProcessor {
  processContent(content: string, metadata: RulesMetadata): Result<string, Error> {
    // Stub implementation - actual logic will be in a later subtask
    console.log('RulesContentProcessor.processContent called with:', { content, metadata });
    if (!content) {
      return Result.err(new Error('Missing content for processing (stub)'));
    }
    // For now, just return the content after stripping potential markdown blocks
    const strippedResult = this.stripMarkdownCodeBlock(content);
    if (strippedResult.isErr()) {
      return strippedResult; // Propagate error
    }

    // Explicitly check if the value is a string before returning ok
    const finalContent = strippedResult.value;
    if (typeof finalContent === 'string') {
      // Potentially add more processing later based on metadata
      return Result.ok(finalContent);
    } else {
      // This should not happen if stripMarkdownCodeBlock works correctly, but safety first
      return Result.err(
        new Error('Content processing failed: stripped value was not a string (stub)')
      );
    }
  }

  stripMarkdownCodeBlock(content: string): Result<string, Error> {
    // Stub implementation - actual logic might be more robust
    console.log('RulesContentProcessor.stripMarkdownCodeBlock called');
    if (typeof content !== 'string') {
      return Result.err(new Error('Invalid input: content must be a string (stub)'));
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
      return Result.err(new Error('Failed to strip markdown, result was not a string (stub)'));
    }
  }
}
