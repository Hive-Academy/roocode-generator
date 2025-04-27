import { ProjectAnalyzer } from '../../../src/core/analysis/project-analyzer';
import { IFileOperations } from '../../../src/core/file-operations/interfaces';
import { ILogger } from '../../../src/core/services/logger-service';
import { LLMAgent } from '../../../src/core/llm/llm-agent';
import { ResponseParser } from '../../../src/core/analysis/response-parser';
import { ProgressIndicator } from '../../../src/core/ui/progress-indicator';

describe('ProjectAnalyzer', () => {
  let projectAnalyzer: ProjectAnalyzer;
  let mockFileOps: jest.Mocked<IFileOperations>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockLLMAgent: jest.Mocked<LLMAgent>;
  let mockResponseParser: jest.Mocked<ResponseParser>;
  let mockProgressIndicator: jest.Mocked<ProgressIndicator>;

  beforeEach(() => {
    mockFileOps = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      exists: jest.fn(),
      isDirectory: jest.fn(),
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
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as jest.Mocked<ILogger>;

    mockLLMAgent = {
      getCompletion: jest.fn(),
      getChatCompletion: jest.fn(),
    } as unknown as jest.Mocked<LLMAgent>;

    mockResponseParser = {
      parseJSON: jest.fn(),
    } as unknown as jest.Mocked<ResponseParser>;

    mockProgressIndicator = {
      start: jest.fn(),
      update: jest.fn(),
      succeed: jest.fn(),
      fail: jest.fn(),
    } as unknown as jest.Mocked<ProgressIndicator>;

    projectAnalyzer = new ProjectAnalyzer(
      mockFileOps,
      mockLogger,
      mockLLMAgent,
      mockResponseParser,
      mockProgressIndicator
    );
  });

  describe('shouldAnalyzeFile', () => {
    // Access the private method using type assertion
    const shouldAnalyzeFile = (fileName: string) => {
      return (projectAnalyzer as any).shouldAnalyzeFile(fileName);
    };

    it('should return true for common file extensions', () => {
      expect(shouldAnalyzeFile('app.js')).toBe(true);
      expect(shouldAnalyzeFile('component.jsx')).toBe(true);
      expect(shouldAnalyzeFile('service.ts')).toBe(true);
      expect(shouldAnalyzeFile('component.tsx')).toBe(true);
      expect(shouldAnalyzeFile('config.json')).toBe(true);
      expect(shouldAnalyzeFile('config.yml')).toBe(true);
      expect(shouldAnalyzeFile('config.yaml')).toBe(true);
      expect(shouldAnalyzeFile('README.md')).toBe(true);
    });

    it('should return false for test files', () => {
      expect(shouldAnalyzeFile('app.test.js')).toBe(false);
      expect(shouldAnalyzeFile('component.spec.tsx')).toBe(false);
    });

    it('should return false for declaration and map files', () => {
      expect(shouldAnalyzeFile('types.d.ts')).toBe(false);
      expect(shouldAnalyzeFile('app.js.map')).toBe(false);
    });

    it('should return false for unsupported file extensions', () => {
      expect(shouldAnalyzeFile('image.png')).toBe(false);
      expect(shouldAnalyzeFile('document.pdf')).toBe(false);
      expect(shouldAnalyzeFile('archive.zip')).toBe(false);
    });
  });
});
