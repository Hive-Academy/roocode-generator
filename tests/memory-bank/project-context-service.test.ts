/* eslint-disable @typescript-eslint/unbound-method */

import path from 'path';
import { ProjectContextService } from '../../src/memory-bank/project-context-service';
import { IFileOperations } from '../../src/core/file-operations/interfaces';
import { IProjectConfigService } from '../../src/core/config/interfaces';
import { ILogger } from '../../src/core/services/logger-service';
import { Result } from '../../src/core/result/result';
import { MemoryBankError } from '../../src/core/errors/memory-bank-errors';
import { Dirent } from 'fs';

// Helper to create mock Dirent objects
const createMockDirent = (name: string, isDirectory: boolean): Dirent =>
  ({
    name,
    isDirectory: () => isDirectory,
    isFile: () => !isDirectory,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isSymbolicLink: () => false,
    isFIFO: () => false,
    isSocket: () => false,
  }) as Dirent;

describe('ProjectContextService', () => {
  let service: ProjectContextService;
  let mockFileOps: jest.Mocked<IFileOperations>;
  let mockConfigService: jest.Mocked<IProjectConfigService>;
  let mockLogger: jest.Mocked<ILogger>;

  const testBaseDir = '/test/project';
  const file1Path = path.join(testBaseDir, 'file1.ts');
  const file2Path = path.join(testBaseDir, 'subdir', 'file2.js');
  const subDirPath = path.join(testBaseDir, 'subdir');
  const nodeModulesPath = path.join(testBaseDir, 'node_modules');

  beforeEach(() => {
    jest.resetAllMocks();

    mockFileOps = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      createDirectory: jest.fn(),
      readDir: jest.fn(),
      exists: jest.fn(),
      isDirectory: jest.fn(),
      normalizePath: jest.fn((p) => p),
      validatePath: jest.fn((_path: string) => true), // Correct signature
      copyDirectoryRecursive: jest.fn().mockResolvedValue(Result.ok(undefined)),
    };

    mockConfigService = {
      loadConfig: jest.fn(),
      saveConfig: jest.fn(),
      validateConfig: jest.fn(),
    };

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    service = new ProjectContextService(mockFileOps, mockConfigService, mockLogger);

    // Default mocks
    mockFileOps.normalizePath.mockImplementation((p) => p); // Pass through
    mockFileOps.validatePath.mockReturnValue(true);
  });

  describe('gatherContext', () => {
    it('should gather context from specified files and directories', async () => {
      // Mock directory structure and file reads
      mockFileOps.readDir
        .mockResolvedValueOnce(
          Result.ok([
            // Entries for testBaseDir
            createMockDirent('file1.ts', false),
            createMockDirent('subdir', true),
            createMockDirent('node_modules', true), // Should be skipped
            createMockDirent('.git', true), // Should be skipped
          ])
        )
        .mockResolvedValueOnce(
          Result.ok([
            // Entries for subdir
            createMockDirent('file2.js', false),
          ])
        );
      mockFileOps.readFile
        .mockResolvedValueOnce(Result.ok('Content of file1')) // For file1.ts
        .mockResolvedValueOnce(Result.ok('Content of file2')); // For file2.js

      const result = await service.gatherContext([testBaseDir]);

      expect(result.isOk()).toBe(true);
      expect(result.value).toContain('Content of file1');
      expect(result.value).toContain('Content of file2');
      expect(mockFileOps.readDir).toHaveBeenCalledWith(testBaseDir);
      expect(mockFileOps.readDir).toHaveBeenCalledWith(subDirPath);
      expect(mockFileOps.readDir).not.toHaveBeenCalledWith(nodeModulesPath); // Skipped dir
      expect(mockFileOps.readFile).toHaveBeenCalledWith(file1Path);
      expect(mockFileOps.readFile).toHaveBeenCalledWith(file2Path);
    });

    it('should handle being given a direct file path', async () => {
      mockFileOps.readDir.mockResolvedValue(Result.err(new Error('ENOTDIR'))); // Simulate failing as directory
      mockFileOps.readFile.mockResolvedValue(Result.ok('Direct file content'));

      const result = await service.gatherContext([file1Path]);

      expect(result.isOk()).toBe(true);
      expect(result.value).toBe('Direct file content');
      expect(mockFileOps.readDir).toHaveBeenCalledWith(file1Path);
      expect(mockFileOps.readFile).toHaveBeenCalledWith(file1Path);
    });

    it('should skip binary files', async () => {
      const binaryFilePath = path.join(testBaseDir, 'image.png');
      mockFileOps.readDir.mockResolvedValue(
        Result.ok([createMockDirent('file1.ts', false), createMockDirent('image.png', false)])
      );
      mockFileOps.readFile.mockResolvedValue(Result.ok('Content of file1')); // Only read file1

      const result = await service.gatherContext([testBaseDir]);

      expect(result.isOk()).toBe(true);
      expect(result.value).toBe('Content of file1');
      expect(mockFileOps.readFile).toHaveBeenCalledWith(file1Path);
      expect(mockFileOps.readFile).not.toHaveBeenCalledWith(binaryFilePath);
    });

    it('should return MemoryBankError if no valid content is found', async () => {
      mockFileOps.readDir.mockResolvedValue(Result.ok([])); // Empty directory

      const result = await service.gatherContext([testBaseDir]);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankError);
      const mbError = result.error as MemoryBankError;
      expect(mbError.message).toContain('No valid content found');
      expect(mbError.context?.paths).toEqual([testBaseDir]);
      expect(mbError.context?.operation).toBe('gatherContext');
    });

    it('should return MemoryBankError if processing a path fails irrecoverably', async () => {
      const processError = new Error('Cannot access path');
      mockFileOps.readDir.mockResolvedValue(Result.err(processError)); // Fail reading dir
      mockFileOps.readFile.mockResolvedValue(Result.err(processError)); // Also fail reading file

      const result = await service.gatherContext([testBaseDir]);

      // In the current implementation, gatherContext continues on path errors.
      // It only returns an error if *no* content is gathered *at all*.
      // Let's test that scenario.
      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankError);
      expect(result.error?.message).toContain('No valid content found');

      // Check that the internal error was logged via the helper
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to process path as directory or file: ${testBaseDir}`),
        expect.any(MemoryBankError)
      );
      const loggedError = mockLogger.error.mock.calls[0][1] as MemoryBankError;
      expect(loggedError.context?.operation).toBe('processPathFileRead');
      expect(loggedError.cause).toBe(processError);
    });

    it('should log warning and continue if reading a subdirectory fails', async () => {
      const subDirError = new Error('Subdir permission denied');

      // Use mockImplementation for more precise control
      mockFileOps.readDir.mockImplementation((path) => {
        if (path === testBaseDir) {
          return Promise.resolve(
            Result.ok([createMockDirent('file1.ts', false), createMockDirent('subdir', true)])
          );
        } else if (path === subDirPath) {
          return Promise.resolve(Result.err(subDirError));
        }
        return Promise.resolve(Result.ok([]));
      });

      mockFileOps.readFile.mockResolvedValue(Result.ok('Content of file1'));

      const result = await service.gatherContext([testBaseDir]);

      expect(result.isOk()).toBe(true); // Should still succeed as file1 was read
      expect(result.value).toBe('Content of file1');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          `Skipping directory ${subDirPath} due to error: ${subDirError.message}`
        )
      );
      expect(mockFileOps.readDir).toHaveBeenCalledWith(testBaseDir);
      expect(mockFileOps.readDir).toHaveBeenCalledWith(subDirPath);
      expect(mockFileOps.readFile).toHaveBeenCalledWith(file1Path);
    });

    it('should log warning and continue if reading a file within a directory fails', async () => {
      const fileReadError = new Error('File read permission denied');
      mockFileOps.readDir.mockResolvedValue(
        Result.ok([
          createMockDirent('file1.ts', false), // This one fails
          createMockDirent('file2.js', false), // This one succeeds
        ])
      );
      mockFileOps.readFile
        .mockResolvedValueOnce(Result.err(fileReadError)) // Fail reading file1
        .mockResolvedValueOnce(Result.ok('Content of file2')); // Succeed reading file2

      const result = await service.gatherContext([testBaseDir]);

      expect(result.isOk()).toBe(true); // Should still succeed as file2 was read
      expect(result.value).toBe('Content of file2');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining(`Skipping file ${file1Path} due to error: ${fileReadError.message}`)
      );
      expect(mockFileOps.readFile).toHaveBeenCalledWith(file1Path);
      expect(mockFileOps.readFile).toHaveBeenCalledWith(path.join(testBaseDir, 'file2.js'));
    });

    it('should return MemoryBankError if the top-level catch block is triggered', async () => {
      const unexpectedError = new Error('Top level boom');
      // Mock the internal processPath call to throw, simulating an error within the try block
      jest.spyOn(service as any, 'processPath').mockRejectedValue(unexpectedError);

      const result = await service.gatherContext([testBaseDir]);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankError);
      const mbError = result.error as MemoryBankError;
      expect(mbError.message).toContain('Error gathering context');
      expect(mbError.context?.operation).toBe('gatherContextCatch');
      expect(mbError.cause).toBe(unexpectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(mbError.message, mbError);
    });
  });
});
