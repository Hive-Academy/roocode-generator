import { ContentProcessor } from '../../src/memory-bank/content-processor';
import { ILogger } from '../../src/core/services/logger-service'; // Keep type import
import { createMockLogger } from '../__mocks__/logger.mock'; // Import mock factory (Corrected path)

describe('ContentProcessor', () => {
  let processor: ContentProcessor;
  let mockLogger: jest.Mocked<ILogger>; // Keep declaration

  beforeEach(() => {
    mockLogger = createMockLogger(); // Initialize mock logger here

    processor = new ContentProcessor(mockLogger);
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
  });
});
