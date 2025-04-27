import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MemoryBankTemplateManager } from '../../src/memory-bank/memory-bank-template-manager';
import { IFileOperations } from '../../src/core/file-operations/interfaces';
import { ILogger } from '../../src/core/services/logger-service';
import { ITemplateManager } from '../../src/core/template-manager/interfaces';
import { MemoryBankFileType } from '../../src/memory-bank/interfaces';
import { Result } from '../../src/core/result/result';
import { Template } from '../../src/core/template-manager/template';
import { TemplateError } from '../../src/core/template-manager/errors';

describe('MemoryBankTemplateManager', () => {
  let templateManager: MemoryBankTemplateManager;
  let mockFileOps: jest.Mocked<IFileOperations>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockCoreTemplateManager: jest.Mocked<ITemplateManager>;

  beforeEach(() => {
    mockFileOps = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      createDirectory: jest.fn(),
    } as any;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    mockCoreTemplateManager = {
      loadTemplate: jest.fn(),
      validateTemplate: jest.fn(),
      processTemplate: jest.fn(),
    } as any;

    templateManager = new MemoryBankTemplateManager(
      mockFileOps,
      mockLogger,
      mockCoreTemplateManager
    );
  });

  describe('loadTemplate', () => {
    it('should return cached template if available', async () => {
      const type = MemoryBankFileType.ProjectOverview;
      const mockTemplate = new Template({ name: 'test', version: '1.0.0' }, 'test content');

      // Load template first time to cache it
      mockCoreTemplateManager.loadTemplate.mockResolvedValueOnce(Result.ok(mockTemplate));
      await templateManager.loadTemplate(type);

      // Try loading again
      const result = await templateManager.loadTemplate(type);

      expect(result.isOk()).toBe(true);
      expect(result.value).toBe(mockTemplate);
      expect(mockCoreTemplateManager.loadTemplate.mock.calls.length).toBe(1);
    });

    it('should create fallback template if core template manager fails', async () => {
      const type = MemoryBankFileType.ProjectOverview;
      mockCoreTemplateManager.loadTemplate.mockResolvedValueOnce(
        Result.err(new TemplateError('Not found'))
      );
      mockFileOps.createDirectory.mockResolvedValueOnce(Result.ok(undefined));
      mockFileOps.writeFile.mockResolvedValueOnce(Result.ok(undefined));

      const result = await templateManager.loadTemplate(type);

      expect(result.isOk()).toBe(true);
      expect(result.value).toBeInstanceOf(Template);
      expect(result.value?.metadata.name).toBe(String(type));
      expect(result.value?.metadata.generated).toBe(true);
    });
  });

  describe('validateTemplate', () => {
    it('should validate template successfully', async () => {
      const type = MemoryBankFileType.ProjectOverview;
      const mockTemplate = new Template({ name: 'test', version: '1.0.0' }, 'test content');

      mockCoreTemplateManager.loadTemplate.mockResolvedValueOnce(Result.ok(mockTemplate));
      jest.spyOn(mockTemplate, 'validate').mockReturnValueOnce(Result.ok(undefined));

      const result = await templateManager.validateTemplate(type);

      expect(result.isOk()).toBe(true);
    });

    it('should return error if validation fails', async () => {
      const type = MemoryBankFileType.ProjectOverview;
      const mockTemplate = new Template({ name: 'test', version: '1.0.0' }, 'test content');

      mockCoreTemplateManager.loadTemplate.mockResolvedValueOnce(Result.ok(mockTemplate));
      jest
        .spyOn(mockTemplate, 'validate')
        .mockReturnValueOnce(Result.err(new TemplateError('Invalid template')));

      const result = await templateManager.validateTemplate(type);

      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('Template validation failed');
    });
  });

  describe('processTemplate', () => {
    it('should process template successfully', async () => {
      const type = MemoryBankFileType.ProjectOverview;
      const context = { test: 'data' };
      const mockTemplate = new Template({ name: 'test', version: '1.0.0' }, 'test content');
      const processedContent = 'processed content';

      mockCoreTemplateManager.loadTemplate.mockResolvedValueOnce(Result.ok(mockTemplate));
      jest.spyOn(mockTemplate, 'process').mockReturnValueOnce(Result.ok(processedContent));

      const result = await templateManager.processTemplate(type, context);

      expect(result.isOk()).toBe(true);
      expect(result.value).toBe(processedContent);
    });

    it('should return error if processing fails', async () => {
      const type = MemoryBankFileType.ProjectOverview;
      const context = { test: 'data' };
      const mockTemplate = new Template({ name: 'test', version: '1.0.0' }, 'test content');

      mockCoreTemplateManager.loadTemplate.mockResolvedValueOnce(Result.ok(mockTemplate));
      jest
        .spyOn(mockTemplate, 'process')
        .mockReturnValueOnce(Result.err(new TemplateError('Processing failed')));

      const result = await templateManager.processTemplate(type, context);

      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('Template processing failed');
    });
  });
});
