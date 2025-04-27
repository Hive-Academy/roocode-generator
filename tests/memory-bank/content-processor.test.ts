/* eslint-disable @typescript-eslint/unbound-method */
import { ContentProcessor } from '../../src/memory-bank/content-processor';
// Removed unused Result import
import { MemoryBankError } from '../../src/core/errors/memory-bank-errors';

describe('ContentProcessor', () => {
  let processor: ContentProcessor;

  beforeEach(() => {
    processor = new ContentProcessor();
  });

  describe('stripMarkdownCodeBlock', () => {
    it('should remove markdown code block fences', () => {
      const content = '```markdown\nHello World\n```';
      const result = processor.stripMarkdownCodeBlock(content);
      expect(result.isOk()).toBe(true);
      expect(result.value).toBe('Hello World');
    });

    it('should remove generic code block fences', () => {
      const content = '```\nHello World\n```';
      const result = processor.stripMarkdownCodeBlock(content);
      expect(result.isOk()).toBe(true);
      expect(result.value).toBe('Hello World');
    });

    it('should handle content without code blocks', () => {
      const content = 'Hello World';
      const result = processor.stripMarkdownCodeBlock(content);
      expect(result.isOk()).toBe(true);
      expect(result.value).toBe('Hello World');
    });

    it('should handle content with leading/trailing whitespace', () => {
      const content = '  ```markdown\n  Hello World  \n```  ';
      const result = processor.stripMarkdownCodeBlock(content);
      expect(result.isOk()).toBe(true);
      // Note: The regex removes the fences, but surrounding whitespace remains
      expect(result.value).toBe('  Hello World  ');
    });

    it('should handle empty content', () => {
      const content = '';
      const result = processor.stripMarkdownCodeBlock(content);
      expect(result.isOk()).toBe(true);
      expect(result.value).toBe('');
    });

    it('should handle empty code block', () => {
      const content = '```markdown\n```';
      const result = processor.stripMarkdownCodeBlock(content);
      expect(result.isOk()).toBe(true);
      expect(result.value).toBe('');
    });

    // Although unlikely with string replace, test error wrapping
    it('should return MemoryBankError if replace throws (mocked)', () => {
      const error = new Error('Regex error');
      const originalReplace = String.prototype.replace;
      String.prototype.replace = jest.fn().mockImplementation(() => {
        throw error;
      });

      const content = '```markdown\nHello\n```';
      const result = processor.stripMarkdownCodeBlock(content);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankError);
      const mbError = result.error as MemoryBankError;
      expect(mbError.message).toContain('Content processing failed during markdown stripping');
      expect(mbError.context?.operation).toBe('stripMarkdownCodeBlock');
      expect(mbError.cause).toBe(error);

      String.prototype.replace = originalReplace; // Restore original function
    });
  });

  describe('processTemplate', () => {
    it('should replace placeholders with data values', async () => {
      const template = 'Hello {{name}}, welcome to {{place}}!';
      const data = { name: 'Roo', place: 'World' };
      const result = await processor.processTemplate(template, data);
      expect(result.isOk()).toBe(true);
      expect(result.value).toBe('Hello Roo, welcome to World!');
    });

    it('should handle templates with no placeholders', async () => {
      const template = 'Just static text.';
      const data = { name: 'Roo' };
      const result = await processor.processTemplate(template, data);
      expect(result.isOk()).toBe(true);
      expect(result.value).toBe('Just static text.');
    });

    it('should handle empty data object', async () => {
      const template = 'Hello {{name}}';
      const data = {};
      const result = await processor.processTemplate(template, data);
      expect(result.isOk()).toBe(true);
      expect(result.value).toBe('Hello {{name}}'); // Placeholder remains
    });

    it('should handle empty template string', async () => {
      const template = '';
      const data = { name: 'Roo' };
      const result = await processor.processTemplate(template, data);
      expect(result.isOk()).toBe(true);
      expect(result.value).toBe('');
    });

    it('should handle data values that are not strings', async () => {
      const template = 'Value: {{num}}, Flag: {{bool}}';
      const data = { num: 123, bool: true };
      const result = await processor.processTemplate(template, data);
      expect(result.isOk()).toBe(true);
      expect(result.value).toBe('Value: 123, Flag: true');
    });

    // Test error wrapping
    it('should return MemoryBankError if replace throws (mocked)', async () => {
      const error = new Error('Processing error');
      const originalReplace = String.prototype.replace;
      String.prototype.replace = jest.fn().mockImplementation(() => {
        throw error;
      });

      const template = 'Hello {{name}}';
      const data = { name: 'Roo' };
      const result = await processor.processTemplate(template, data);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankError);
      const mbError = result.error as MemoryBankError;
      expect(mbError.message).toContain('Content processing failed during template processing');
      expect(mbError.context?.operation).toBe('processTemplate');
      expect(mbError.context?.templateKeys).toEqual(['name']);
      expect(mbError.cause).toBe(error);

      String.prototype.replace = originalReplace; // Restore original function
    });
  });
});
