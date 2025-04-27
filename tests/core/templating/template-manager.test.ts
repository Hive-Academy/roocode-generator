import { TemplateManager } from '../../../src/core/template-manager/template-manager';
import { IFileOperations } from '../../../src/core/file-operations/interfaces';
import { ILogger } from '../../../src/core/services/logger-service';

describe('TemplateManager', () => {
  // Create a subclass to expose protected method for testing
  class TestTemplateManager extends TemplateManager {
    public exposeGetTemplatePath(name: string): string {
      return this.getTemplatePath(name);
    }
  }

  let mockFileOperations: jest.Mocked<IFileOperations>;
  let mockLogger: jest.Mocked<ILogger>;
  let templateManager: TestTemplateManager;

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

    templateManager = new TestTemplateManager(mockFileOperations, mockLogger, {
      templateDir: 'templates',
      templateExt: '.tpl',
    });
  });

  describe('getTemplatePath', () => {
    it('should resolve template path using configured templateDir and templateExt', () => {
      expect(templateManager.exposeGetTemplatePath('myTemplate')).toBe('templates/myTemplate.tpl');
    });

    it('should handle different template directory and extension', () => {
      const customManager = new TestTemplateManager(mockFileOperations, mockLogger, {
        templateDir: 'custom-templates',
        templateExt: '.md',
      });
      expect(customManager.exposeGetTemplatePath('myTemplate')).toBe(
        'custom-templates/myTemplate.md'
      );
    });
  });
});
