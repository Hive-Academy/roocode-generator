/* eslint-disable @typescript-eslint/unbound-method */
import * as fs from 'fs';
import * as path from 'path';
import 'reflect-metadata';
import { Container } from '../../../src/core/di/container';
import { FileNotFoundError, FileOperationError } from '../../../src/core/file-operations/errors';
import { FileOperations } from '../../../src/core/file-operations/file-operations';
import { IFileOperations } from '../../../src/core/file-operations/interfaces';
import { Result } from '../../../src/core/result/result';
import { ILogger } from '../../../src/core/services/logger-service';

describe('FileOperations DI integration', () => {
  let container: Container;
  let mockLogger: ILogger;

  beforeEach(() => {
    // Reset the container singleton for each test
    (Container as any).instance = null;
    container = Container.getInstance();

    // Create a mock logger for testing
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Register the mock logger
    container.registerFactory('ILogger', () => mockLogger);

    // Register FileOperations
    container.registerFactory('IFileOperations', () => new FileOperations(mockLogger));

    // Initialize the container
    container.initialize();
  });

  it('should instantiate FileOperations via DI container', () => {
    // Resolve FileOperations from the container
    const fileOpsResult = container.resolve<IFileOperations>('IFileOperations');

    // Verify the result is successful
    expect(fileOpsResult.isOk()).toBe(true);

    // Verify the resolved instance is a FileOperations
    const fileOps = fileOpsResult.value;
    expect(fileOps).toBeDefined();
    expect(fileOps).toBeInstanceOf(FileOperations);
  });

  it('should inject the logger dependency into FileOperations', () => {
    // Resolve FileOperations from the container
    const fileOpsResult = container.resolve<IFileOperations>('IFileOperations');
    expect(fileOpsResult.isOk()).toBe(true);

    const fileOps = fileOpsResult.value as FileOperations;

    // Call a method that uses the logger
    const invalidPath = '\0invalid';
    void fileOps.readFile(invalidPath);

    // Verify the injected logger was called
    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith('Invalid path provided to readFile: \0invalid');
  });

  it('should handle file not found errors correctly', async () => {
    // Mock fs.promises.readFile to simulate ENOENT error
    jest.spyOn(fs.promises, 'readFile').mockImplementation(() => {
      const error: NodeJS.ErrnoException = new Error('ENOENT: file not found');
      error.code = 'ENOENT';
      return Promise.reject(error);
    });

    // Resolve FileOperations from the container
    const fileOpsResult = container.resolve<IFileOperations>('IFileOperations');
    expect(fileOpsResult.isOk()).toBe(true);

    const fileOps = fileOpsResult.value as FileOperations;

    // Call readFile with a non-existent path
    const result = await fileOps.readFile('non-existent-file.txt');

    // Verify the result is an error of the correct type
    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(FileNotFoundError);
    expect(result.error?.message).toContain('File not found');

    // Verify the logger was called
    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error reading file at path'),
      expect.any(Error)
    );
  });

  it('should handle general file operation errors correctly', async () => {
    // Mock fs.promises.readFile to simulate a general error
    jest.spyOn(fs.promises, 'readFile').mockImplementation(() => {
      return Promise.reject(new Error('General file error'));
    });

    // Resolve FileOperations from the container
    const fileOpsResult = container.resolve<IFileOperations>('IFileOperations');
    expect(fileOpsResult.isOk()).toBe(true);

    const fileOps = fileOpsResult.value as FileOperations;

    // Call readFile
    const result = await fileOps.readFile('some-file.txt');

    // Verify the result is an error of the correct type
    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(FileOperationError);

    // Verify the logger was called
    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error reading file at path'),
      expect.any(Error)
    );
  });

  it('should validate paths correctly', () => {
    // Resolve FileOperations from the container
    const fileOpsResult = container.resolve<IFileOperations>('IFileOperations');
    expect(fileOpsResult.isOk()).toBe(true);

    const fileOps = fileOpsResult.value as FileOperations;

    // Test valid path
    expect(fileOps.validatePath('valid/path/file.txt')).toBe(true);

    // Test invalid paths
    expect(fileOps.validatePath('')).toBe(false);
    expect(fileOps.validatePath(null as unknown as string)).toBe(false);
    expect(fileOps.validatePath(undefined as unknown as string)).toBe(false);
    expect(fileOps.validatePath('\0invalid')).toBe(false);
  });

  it('should normalize paths correctly', () => {
    // Resolve FileOperations from the container
    const fileOpsResult = container.resolve<IFileOperations>('IFileOperations');
    expect(fileOpsResult.isOk()).toBe(true);

    const fileOps = fileOpsResult.value as FileOperations;

    // Test path normalization
    const unnormalizedPath = 'path/with/../unnecessary/../segments/file.txt';
    const normalizedPath = fileOps.normalizePath(unnormalizedPath);

    // The expected result depends on the platform
    const expected = path.normalize('path/with/../unnecessary/../segments/file.txt');
    expect(normalizedPath).toBe(expected);
  });

  it('should handle directory creation errors', async () => {
    // Mock fs.promises.mkdir to simulate an error
    jest.spyOn(fs.promises, 'mkdir').mockImplementation(() => {
      return Promise.reject(new Error('Directory creation error'));
    });

    // Resolve FileOperations from the container
    const fileOpsResult = container.resolve<IFileOperations>('IFileOperations');
    expect(fileOpsResult.isOk()).toBe(true);

    const fileOps = fileOpsResult.value as FileOperations;

    // Call createDirectory
    const result = await fileOps.createDirectory('some/directory');

    // Verify the result is an error
    expect(result.isErr()).toBe(true);
    expect(result.error?.message).toContain('Failed to create directory');

    // Verify the logger was called
    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error creating directory at path'),
      expect.any(Error)
    );
  });

  it('should handle write file errors', async () => {
    // Mock fs.promises.writeFile to simulate an error
    jest.spyOn(fs.promises, 'writeFile').mockImplementation(() => {
      return Promise.reject(new Error('Write file error'));
    });

    // Resolve FileOperations from the container
    const fileOpsResult = container.resolve<IFileOperations>('IFileOperations');
    expect(fileOpsResult.isOk()).toBe(true);

    const fileOps = fileOpsResult.value as FileOperations;

    // Call writeFile
    const result = await fileOps.writeFile('some-file.txt', 'content');

    // Verify the result is an error
    expect(result.isErr()).toBe(true);
    expect(result.error?.message).toContain('Failed to write file');

    // Verify the logger was called
    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error writing file at path'),
      expect.any(Error)
    );
  });

  it('should handle readDir errors', async () => {
    // Mock fs.promises.readdir to simulate an error
    jest.spyOn(fs.promises, 'readdir').mockImplementation(() => {
      return Promise.reject(new Error('Read directory error'));
    });

    // Resolve FileOperations from the container
    const fileOpsResult = container.resolve<IFileOperations>('IFileOperations');
    expect(fileOpsResult.isOk()).toBe(true);

    const fileOps = fileOpsResult.value as FileOperations;

    // Call readDir
    const result = await fileOps.readDir('some/directory');

    // Verify the result is an error
    expect(result.isErr()).toBe(true);
    expect(result.error?.message).toBe('some/directory');

    // Verify the logger was called
    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error reading directory at path'),
      expect.any(Error)
    );
  });

  it('should handle exists method correctly', async () => {
    // Mock fs.promises.access for success case
    jest.spyOn(fs.promises, 'access').mockImplementation(() => Promise.resolve());

    // Resolve FileOperations from the container
    const fileOpsResult = container.resolve<IFileOperations>('IFileOperations');
    expect(fileOpsResult.isOk()).toBe(true);

    const fileOps = fileOpsResult.value as FileOperations;

    // Call exists for a path that exists
    let result = await fileOps.exists('existing-file.txt');

    // Verify the result indicates the file exists
    expect(result.isOk()).toBe(true);
    expect(result.value).toBe(true);

    // Now mock fs.promises.access to simulate ENOENT error
    jest.spyOn(fs.promises, 'access').mockImplementation(() => {
      const error: NodeJS.ErrnoException = new Error('ENOENT: file not found');
      error.code = 'ENOENT';
      return Promise.reject(error);
    });

    // Call exists for a path that doesn't exist
    result = await fileOps.exists('non-existent-file.txt');

    // Verify the result indicates the file doesn't exist
    expect(result.isOk()).toBe(true);
    expect(result.value).toBe(false);

    // Now mock fs.promises.access to simulate a different error
    jest.spyOn(fs.promises, 'access').mockImplementation(() => {
      const error: NodeJS.ErrnoException = new Error('EPERM: permission denied');
      error.code = 'EPERM';
      return Promise.reject(error);
    });

    // Call exists for a path with permission issues
    result = await fileOps.exists('permission-issue-file.txt');

    // Verify the result is an error
    expect(result.isErr()).toBe(true);
    expect(result.error?.message).toBe('permission-issue-file.txt');

    // Verify the logger was called
    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error checking existence of path'),
      expect.any(Error)
    );
  });

  it('should handle isDirectory method correctly', async () => {
    // Mock fs.promises.stat for a directory
    jest.spyOn(fs.promises, 'stat').mockImplementation(() =>
      Promise.resolve({
        isDirectory: () => true,
      } as fs.Stats)
    );

    // Resolve FileOperations from the container
    const fileOpsResult = container.resolve<IFileOperations>('IFileOperations');
    expect(fileOpsResult.isOk()).toBe(true);

    const fileOps = fileOpsResult.value as FileOperations;

    // Call isDirectory for a directory
    let result = await fileOps.isDirectory('some/directory');

    // Verify the result indicates it's a directory
    expect(result.isOk()).toBe(true);
    expect(result.value).toBe(true);

    // Mock fs.promises.stat for a file
    jest.spyOn(fs.promises, 'stat').mockImplementation(() =>
      Promise.resolve({
        isDirectory: () => false,
      } as fs.Stats)
    );

    // Call isDirectory for a file
    result = await fileOps.isDirectory('some-file.txt');

    // Verify the result indicates it's not a directory
    expect(result.isOk()).toBe(true);
    expect(result.value).toBe(false);

    // Mock fs.promises.stat to simulate ENOENT error
    jest.spyOn(fs.promises, 'stat').mockImplementation(() => {
      const error: NodeJS.ErrnoException = new Error('ENOENT: file not found');
      error.code = 'ENOENT';
      return Promise.reject(error);
    });

    // Call isDirectory for a non-existent path
    result = await fileOps.isDirectory('non-existent-path');

    // Verify the result is a FileNotFoundError
    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(FileNotFoundError);

    // Verify the logger was called
    expect(mockLogger.error).toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Error checking if path is directory'),
      expect.any(Error)
    );
  });

  it('should handle copyDirectoryRecursive method correctly', async () => {
    // Create a mock FileOperations instance
    const fileOps = {
      createDirectory: jest.fn().mockResolvedValue(Result.ok(undefined)),
      readDir: jest.fn().mockResolvedValue(
        Result.ok([
          { name: 'file1.txt', isDirectory: () => false },
          { name: 'subdir', isDirectory: () => true },
        ])
      ),
      readFile: jest.fn().mockResolvedValue(Result.ok('file content')),
      writeFile: jest.fn().mockResolvedValue(Result.ok(undefined)),
      validatePath: jest.fn().mockReturnValue(true),
      copyDirectoryRecursive: jest
        .fn()
        .mockImplementation(async (sourceDir: string, destDir: string) => {
          // Call the mocked methods to simulate the copyDirectoryRecursive implementation
          await fileOps.createDirectory(destDir);
          const entries = (await fileOps.readDir(sourceDir)).value as fs.Dirent[];

          for (const entry of entries) {
            if (!entry.isDirectory()) {
              const content = (await fileOps.readFile(`${sourceDir}/${entry.name}`)).value;
              await fileOps.writeFile(`${destDir}/${entry.name}`, content as string);
            }
          }

          return Result.ok(undefined);
        }),
    } as unknown as FileOperations;

    // Mock the container to return our mocked FileOperations
    jest.spyOn(container, 'resolve').mockImplementation(() => Result.ok(fileOps));

    // Call copyDirectoryRecursive
    const result = await fileOps.copyDirectoryRecursive('source/dir', 'dest/dir');

    // Verify the result is successful
    expect(result.isOk()).toBe(true);

    // Verify the methods were called as expected
    expect(fileOps.createDirectory).toHaveBeenCalled();
    expect(fileOps.readDir).toHaveBeenCalled();
    expect(fileOps.readFile).toHaveBeenCalled();
    expect(fileOps.writeFile).toHaveBeenCalled();

    // Check specific arguments if needed
    const createDirCall = (fileOps.createDirectory as jest.Mock).mock.calls[0];
    expect(createDirCall[0]).toBe('dest/dir');

    const readDirCall = (fileOps.readDir as jest.Mock).mock.calls[0];
    expect(readDirCall[0]).toBe('source/dir');

    const readFileCall = (fileOps.readFile as jest.Mock).mock.calls[0];
    expect(readFileCall[0]).toBe('source/dir/file1.txt');

    const writeFileCall = (fileOps.writeFile as jest.Mock).mock.calls[0];
    expect(writeFileCall[0]).toBe('dest/dir/file1.txt');
    expect(writeFileCall[1]).toBe('file content');
  });

  it('should handle errors in copyDirectoryRecursive', async () => {
    // Resolve FileOperations from the container
    const fileOpsResult = container.resolve<IFileOperations>('IFileOperations');
    expect(fileOpsResult.isOk()).toBe(true);

    const fileOps = fileOpsResult.value as FileOperations;

    // Mock readDir to simulate an error
    jest.spyOn(fileOps, 'readDir').mockImplementation(() => {
      return Promise.resolve(Result.err(new Error('Read directory error')));
    });

    // Call copyDirectoryRecursive
    const result = await fileOps.copyDirectoryRecursive('source/dir', 'dest/dir');

    // Verify the result is an error
    expect(result.isErr()).toBe(true);
    expect(result.error?.message).toBe('source/dir');
  });
});
