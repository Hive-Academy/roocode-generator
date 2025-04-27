/* eslint-disable @typescript-eslint/unbound-method */
import { ProjectAnalyzer } from '../../../src/core/analysis/project-analyzer';
import { ResponseParser } from '../../../src/core/analysis/response-parser';
import { IFileOperations } from '../../../src/core/file-operations/interfaces';
import { LLMAgent } from '../../../src/core/llm/llm-agent';
import { Result } from '../../../src/core/result/result';
import { ILogger } from '../../../src/core/services/logger-service';
import { ProgressIndicator } from '../../../src/core/ui/progress-indicator';

describe('ProjectAnalyzer Directory Handling', () => {
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

  describe('isDirectory', () => {
    // Access the private method using type assertion
    const isDirectory = (filePath: string) => {
      return (projectAnalyzer as any).isDirectory(filePath);
    };

    it('should return true for directories', async () => {
      mockFileOps.isDirectory.mockResolvedValue(Result.ok(true));

      const result = await isDirectory('/path/to/directory');

      expect(result.isOk()).toBe(true);
      expect(result.value).toBe(true);
      expect(mockFileOps.isDirectory).toHaveBeenCalledWith('/path/to/directory');
    });

    it('should return false for files', async () => {
      mockFileOps.isDirectory.mockResolvedValue(Result.ok(false));

      const result = await isDirectory('/path/to/file.txt');

      expect(result.isOk()).toBe(true);
      expect(result.value).toBe(false);
      expect(mockFileOps.isDirectory).toHaveBeenCalledWith('/path/to/file.txt');
    });

    it('should handle errors gracefully', async () => {
      const error = new Error('ENOTDIR: not a directory');
      mockFileOps.isDirectory.mockResolvedValue(Result.err(error));

      const result = await isDirectory('/path/to/nonexistent');

      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(error);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Error checking if path is directory')
      );
    });
  });

  describe('collectProjectFiles', () => {
    // Access the private method using type assertion
    const collectProjectFiles = (rootDir: string) => {
      return (projectAnalyzer as any).collectProjectFiles(rootDir);
    };

    it('should handle empty directories', async () => {
      mockFileOps.readDir.mockResolvedValue(Result.ok([]));

      const files = await collectProjectFiles('/empty/dir');

      expect(files).toEqual([]);
      expect(mockFileOps.readDir).toHaveBeenCalledWith('/empty/dir');
    });

    it('should skip excluded directories', async () => {
      mockFileOps.readDir.mockResolvedValue(
        Result.ok([
          {
            name: 'node_modules',
            path: 'node_modules',
            parentPath: '/root',
            isDirectory: () => true,
            isFile: () => false,
            isBlockDevice: () => false,
            isCharacterDevice: () => false,
            isSymbolicLink: () => false,
            isFIFO: () => false,
            isSocket: () => false,
          },
          {
            name: 'dist',
            path: 'dist',
            parentPath: '/root',
            isDirectory: () => true,
            isFile: () => false,
            isBlockDevice: () => false,
            isCharacterDevice: () => false,
            isSymbolicLink: () => false,
            isFIFO: () => false,
            isSocket: () => false,
          },
          {
            name: '.git',
            path: '.git',
            parentPath: '/root',
            isDirectory: () => true,
            isFile: () => false,
            isBlockDevice: () => false,
            isCharacterDevice: () => false,
            isSymbolicLink: () => false,
            isFIFO: () => false,
            isSocket: () => false,
          },
          {
            name: 'coverage',
            path: 'coverage',
            parentPath: '/root',
            isDirectory: () => true,
            isFile: () => false,
            isBlockDevice: () => false,
            isCharacterDevice: () => false,
            isSymbolicLink: () => false,
            isFIFO: () => false,
            isSocket: () => false,
          },
        ])
      );

      const files = await collectProjectFiles('/root');

      expect(files).toEqual([]);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Skipping excluded directory')
      );
    });

    it('should handle directory read errors', async () => {
      mockFileOps.readDir.mockResolvedValue(Result.err(new Error('Permission denied')));

      const files = await collectProjectFiles('/root');

      expect(files).toEqual([]);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Failed to read directory')
      );
    });
  });
});
