/* eslint-disable @typescript-eslint/unbound-method */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MemoryBankTemplateProcessor } from '../../src/memory-bank/memory-bank-template-processor';
import { IMemoryBankTemplateManager } from '../../src/memory-bank/interfaces/template-manager.interface';
import { ILogger } from '../../src/core/services/logger-service';
import { Result } from '../../src/core/result/result';
import { MemoryBankFileType } from '../../src/memory-bank/interfaces';
import { MemoryBankTemplateError } from '../../src/core/errors/memory-bank-errors';
import { TemplateError } from '../../src/core/template-manager/errors';
import { ITemplate, ITemplateMetadata } from '../../src/core/template-manager/interfaces';

describe('MemoryBankTemplateProcessor', () => {
  let templateProcessor: MemoryBankTemplateProcessor;
  let mockTemplateManager: jest.Mocked<IMemoryBankTemplateManager>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    // Create mock template manager
    mockTemplateManager = {
      loadTemplate: jest.fn(),
      validateTemplate: jest.fn(),
      processTemplate: jest.fn(),
      getTemplatePath: jest.fn(),
    } as unknown as jest.Mocked<IMemoryBankTemplateManager>;

    // Create mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    // Create template processor instance with mocks
    templateProcessor = new MemoryBankTemplateProcessor(mockTemplateManager, mockLogger);
  });

  describe('loadAndProcessTemplate', () => {
    it('should successfully load and process a template', async () => {
      // Arrange
      const fileType = MemoryBankFileType.ProjectOverview;
      const context = { projectName: 'Test Project' };
      const processedContent = '# Test Project Overview';

      // Create a properly typed mock template
      const mockTemplate: ITemplate = {
        metadata: { name: 'test', version: '1.0.0' } as ITemplateMetadata,
        validate: () => Result.ok(undefined),
        process: () => Result.ok('processed content'),
      };

      // Mock successful template loading
      mockTemplateManager.loadTemplate.mockResolvedValue(Result.ok(mockTemplate));

      // Mock successful template processing
      mockTemplateManager.processTemplate.mockResolvedValue(Result.ok(processedContent));

      // Act
      const result = await templateProcessor.loadAndProcessTemplate(fileType, context);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.value).toBe(processedContent);
      expect(mockTemplateManager.loadTemplate).toHaveBeenCalledWith(String(fileType));
      expect(mockTemplateManager.processTemplate).toHaveBeenCalledWith(String(fileType), context);
      expect(mockLogger.debug).toHaveBeenCalledTimes(3); // Loading, processing, success logs
    });

    it('should handle template loading errors', async () => {
      // Arrange
      const fileType = MemoryBankFileType.TechnicalArchitecture;
      const context = { projectName: 'Test Project' };
      const templateError = new TemplateError('Template not found', 'test-template');

      // Mock template loading error
      mockTemplateManager.loadTemplate.mockResolvedValue(Result.err(templateError));

      // Act
      const result = await templateProcessor.loadAndProcessTemplate(fileType, context);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankTemplateError);
      expect(result.error?.message).toContain('Failed to load template');
      expect(mockTemplateManager.loadTemplate).toHaveBeenCalledWith(String(fileType));
      expect(mockTemplateManager.processTemplate).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle template processing errors', async () => {
      // Arrange
      const fileType = MemoryBankFileType.DeveloperGuide;
      const context = { projectName: 'Test Project' };
      const templateError = new TemplateError('Processing failed', 'test-template');

      // Create a properly typed mock template
      const mockTemplate: ITemplate = {
        metadata: { name: 'test', version: '1.0.0' } as ITemplateMetadata,
        validate: () => Result.ok(undefined),
        process: () => Result.ok('processed content'),
      };

      // Mock successful template loading
      mockTemplateManager.loadTemplate.mockResolvedValue(Result.ok(mockTemplate));

      // Mock template processing error
      mockTemplateManager.processTemplate.mockResolvedValue(Result.err(templateError));

      // Act
      const result = await templateProcessor.loadAndProcessTemplate(fileType, context);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankTemplateError);
      expect(result.error?.message).toContain('Failed to process template content');
      expect(mockTemplateManager.loadTemplate).toHaveBeenCalledWith(String(fileType));
      expect(mockTemplateManager.processTemplate).toHaveBeenCalledWith(String(fileType), context);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle empty processed content', async () => {
      // Arrange
      const fileType = MemoryBankFileType.ProjectOverview;
      const context = { projectName: 'Test Project' };

      // Create a properly typed mock template
      const mockTemplate: ITemplate = {
        metadata: { name: 'test', version: '1.0.0' } as ITemplateMetadata,
        validate: () => Result.ok(undefined),
        process: () => Result.ok('processed content'),
      };

      // Mock successful template loading
      mockTemplateManager.loadTemplate.mockResolvedValue(Result.ok(mockTemplate));

      // Mock empty processed content
      mockTemplateManager.processTemplate.mockResolvedValue(Result.ok(''));

      // Act
      const result = await templateProcessor.loadAndProcessTemplate(fileType, context);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankTemplateError);
      expect(result.error?.message).toContain('Processed template content is empty');
      expect(mockTemplateManager.loadTemplate).toHaveBeenCalledWith(String(fileType));
      expect(mockTemplateManager.processTemplate).toHaveBeenCalledWith(String(fileType), context);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle unexpected errors', async () => {
      // Arrange
      const fileType = MemoryBankFileType.ProjectOverview;
      const context = { projectName: 'Test Project' };
      const unexpectedError = new Error('Unexpected error');

      // Mock template loading throwing an error
      mockTemplateManager.loadTemplate.mockImplementation(() => {
        throw unexpectedError;
      });

      // Act
      const result = await templateProcessor.loadAndProcessTemplate(fileType, context);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankTemplateError);
      expect(result.error?.message).toContain('Unexpected error during template processing');
      expect(mockTemplateManager.loadTemplate).toHaveBeenCalledWith(String(fileType));
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
