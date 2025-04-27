import { IFileOperations } from '../../../src/core/file-operations/interfaces';
import { LLMAgent } from '../../../src/core/llm/llm-agent';
import { ILogger } from '../../../src/core/services/logger-service';
import { RulesTemplateManager } from '../../../src/core/templating/rules-template-manager';

describe('RulesTemplateManager', () => {
  let mockFileOperations: jest.Mocked<IFileOperations>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockLLMAgent: jest.Mocked<LLMAgent>;
  let templateManager: RulesTemplateManager;

  beforeEach(() => {
    mockFileOperations = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      exists: jest.fn(),
      isDirectory: jest.fn(),
      isFile: jest.fn(),
      readDir: jest.fn(),
      copyFile: jest.fn(),
      copyDirectoryRecursive: jest.fn(),
      deleteFile: jest.fn(),
      deleteDirectory: jest.fn(),
      createDirectory: jest.fn(),
      getRelativePath: jest.fn(),
      getAbsolutePath: jest.fn(),
      joinPaths: jest.fn(),
      dirname: jest.fn(),
      basename: jest.fn(),
      extname: jest.fn(),
    } as unknown as jest.Mocked<IFileOperations>;

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as jest.Mocked<ILogger>;

    mockLLMAgent = {
      getCompletion: jest.fn(),
      getChatCompletion: jest.fn(),
    } as unknown as jest.Mocked<LLMAgent>;

    templateManager = new RulesTemplateManager(mockFileOperations, mockLogger, mockLLMAgent);
  });

  describe('validateTemplate', () => {
    it('should validate a non-empty template', () => {
      const result = templateManager.validateTemplate('# Valid template content');
      expect(result.isOk()).toBe(true);
    });

    it('should return an error for an empty template', () => {
      const result = templateManager.validateTemplate('');
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('Template content is empty');
    });
  });

  describe('mergeTemplates', () => {
    it('should merge base and custom templates', () => {
      const base =
        'Mode: typescript\n\n# Template for Mode: typescript\n\n## Overview\nBase content';
      const custom = 'Mode: typescript\n\n# Custom content\n\n## Custom Section\nCustom content';

      const result = templateManager.mergeTemplates(base, custom);

      expect(result.isOk()).toBe(true);
      expect(result.value).toContain('Template for Mode: typescript');
      expect(result.value).toContain('Overview');
      expect(result.value).toContain('Custom Section');
    });
  });
});
