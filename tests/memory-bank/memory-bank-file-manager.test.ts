/* eslint-disable @typescript-eslint/unbound-method */
import path from 'path';
import { MemoryBankFileManager } from '../../src/memory-bank/memory-bank-file-manager';
import { IFileOperations } from '../../src/core/file-operations/interfaces';
import { ILogger } from '../../src/core/services/logger-service';
import { Result } from '../../src/core/result/result';
import { MemoryBankFileError } from '../../src/core/errors/memory-bank-errors';

describe('MemoryBankFileManager', () => {
  let fileManager: MemoryBankFileManager;
  let mockFileOps: jest.Mocked<IFileOperations>;
  let mockLogger: jest.Mocked<ILogger>;

  const testBaseDir = '/test/project';
  const memoryBankDir = path.join(testBaseDir, 'memory-bank');
  const templatesDir = path.join(memoryBankDir, 'templates');
  const testFilePath = path.join(memoryBankDir, 'test-file.md');
  const testDirPath = path.dirname(testFilePath);

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
    };

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    fileManager = new MemoryBankFileManager(mockFileOps, mockLogger);

    // Default happy path mocks
    mockFileOps.createDirectory.mockResolvedValue(Result.ok(undefined));
    mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));
    mockFileOps.readFile.mockResolvedValue(Result.ok('file content'));
  });

  describe('createMemoryBankDirectory', () => {
    it('should create memory-bank and templates directories successfully', async () => {
      const result = await fileManager.createMemoryBankDirectory(testBaseDir);

      expect(result.isOk()).toBe(true);
      expect(mockFileOps.createDirectory).toHaveBeenCalledWith(memoryBankDir);
      expect(mockFileOps.createDirectory).toHaveBeenCalledWith(templatesDir);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Creating memory bank directory: ${memoryBankDir}`
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Creating templates directory: ${templatesDir}`
      );
    });

    it('should handle EEXIST error when memory-bank directory already exists', async () => {
      const existError = new Error('EEXIST: file already exists');
      mockFileOps.createDirectory
        .mockResolvedValueOnce(Result.err(existError)) // Fail first create
        .mockResolvedValueOnce(Result.ok(undefined)); // Succeed second create

      const result = await fileManager.createMemoryBankDirectory(testBaseDir);

      expect(result.isOk()).toBe(true);
      expect(mockFileOps.createDirectory).toHaveBeenCalledWith(memoryBankDir);
      expect(mockFileOps.createDirectory).toHaveBeenCalledWith(templatesDir);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Memory bank directory already exists: ${memoryBankDir}`
      );
      expect(mockLogger.error).not.toHaveBeenCalled(); // No actual error logged
    });

    it('should handle EEXIST error when templates directory already exists', async () => {
      const existError = new Error('EEXIST: file already exists');
      mockFileOps.createDirectory
        .mockResolvedValueOnce(Result.ok(undefined)) // Succeed first create
        .mockResolvedValueOnce(Result.err(existError)); // Fail second create

      const result = await fileManager.createMemoryBankDirectory(testBaseDir);

      expect(result.isOk()).toBe(true);
      expect(mockFileOps.createDirectory).toHaveBeenCalledWith(memoryBankDir);
      expect(mockFileOps.createDirectory).toHaveBeenCalledWith(templatesDir);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Templates directory already exists: ${templatesDir}`
      );
      expect(mockLogger.error).not.toHaveBeenCalled(); // No actual error logged
    });

    it('should return MemoryBankFileError if creating memory-bank directory fails (non-EEXIST)', async () => {
      const createError = new Error('Permission denied');
      mockFileOps.createDirectory.mockResolvedValueOnce(Result.err(createError));

      const result = await fileManager.createMemoryBankDirectory(testBaseDir);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankFileError);
      const fileError = result.error as MemoryBankFileError;
      expect(fileError.message).toContain('Failed to create memory bank directory');
      expect(fileError.filePath).toBe(memoryBankDir);
      expect(fileError.context?.operation).toBe('createDirectory');
      expect(fileError.cause).toBe(createError);
      expect(mockLogger.error).toHaveBeenCalledWith(fileError.message, fileError);
    });

    it('should return MemoryBankFileError if creating templates directory fails (non-EEXIST)', async () => {
      const createError = new Error('Permission denied');
      mockFileOps.createDirectory
        .mockResolvedValueOnce(Result.ok(undefined)) // Succeed first create
        .mockResolvedValueOnce(Result.err(createError)); // Fail second create

      const result = await fileManager.createMemoryBankDirectory(testBaseDir);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankFileError);
      const fileError = result.error as MemoryBankFileError;
      expect(fileError.message).toContain('Failed to create templates directory');
      expect(fileError.filePath).toBe(templatesDir);
      expect(fileError.context?.operation).toBe('createDirectory');
      expect(fileError.cause).toBe(createError);
      expect(mockLogger.error).toHaveBeenCalledWith(fileError.message, fileError);
    });

    it('should return MemoryBankFileError if an unexpected error occurs', async () => {
      const unexpectedError = new Error('Unexpected boom');
      mockFileOps.createDirectory.mockRejectedValue(unexpectedError); // Throw from deeper layer

      const result = await fileManager.createMemoryBankDirectory(testBaseDir);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankFileError);
      const fileError = result.error as MemoryBankFileError;
      expect(fileError.message).toContain('Error creating memory bank directory structure');
      expect(fileError.filePath).toBe(testBaseDir); // Context path is baseDir here
      expect(fileError.context?.operation).toBe('createStructure');
      expect(fileError.cause).toBe(unexpectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(fileError.message, fileError);
    });
  });

  describe('writeMemoryBankFile', () => {
    const content = 'Test content';

    it('should create directory and write file successfully', async () => {
      const result = await fileManager.writeMemoryBankFile(testFilePath, content);

      expect(result.isOk()).toBe(true);
      expect(mockFileOps.createDirectory).toHaveBeenCalledWith(testDirPath);
      expect(mockFileOps.writeFile).toHaveBeenCalledWith(testFilePath, content);
      expect(mockLogger.debug).toHaveBeenCalledWith(`Writing memory bank file: ${testFilePath}`);
    });

    it('should return MemoryBankFileError if directory creation fails (non-EEXIST)', async () => {
      const dirError = new Error('Write permission denied');
      mockFileOps.createDirectory.mockResolvedValue(Result.err(dirError));

      const result = await fileManager.writeMemoryBankFile(testFilePath, content);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankFileError);
      const fileError = result.error as MemoryBankFileError;
      expect(fileError.message).toContain('Failed to create directory for file');
      expect(fileError.filePath).toBe(testDirPath);
      expect(fileError.context?.operation).toBe('createDirectory');
      expect(fileError.cause).toBe(dirError);
      expect(mockLogger.error).toHaveBeenCalledWith(fileError.message, fileError);
      expect(mockFileOps.writeFile).not.toHaveBeenCalled();
    });

    it('should return MemoryBankFileError if file writing fails', async () => {
      const writeError = new Error('Disk full');
      mockFileOps.writeFile.mockResolvedValue(Result.err(writeError));

      const result = await fileManager.writeMemoryBankFile(testFilePath, content);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankFileError);
      const fileError = result.error as MemoryBankFileError;
      expect(fileError.message).toContain('Failed to write memory bank file');
      expect(fileError.filePath).toBe(testFilePath);
      expect(fileError.context?.operation).toBe('writeFile');
      expect(fileError.cause).toBe(writeError);
      expect(mockLogger.error).toHaveBeenCalledWith(fileError.message, fileError);
    });

    it('should return MemoryBankFileError if an unexpected error occurs', async () => {
      const unexpectedError = new Error('Unexpected boom');
      mockFileOps.writeFile.mockRejectedValue(unexpectedError); // Throw from deeper layer

      const result = await fileManager.writeMemoryBankFile(testFilePath, content);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankFileError);
      const fileError = result.error as MemoryBankFileError;
      expect(fileError.message).toContain('Error writing memory bank file');
      expect(fileError.filePath).toBe(testFilePath);
      expect(fileError.context?.operation).toBe('writeFileCatch');
      expect(fileError.cause).toBe(unexpectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(fileError.message, fileError);
    });
  });

  describe('readMemoryBankFile', () => {
    it('should read file successfully', async () => {
      const result = await fileManager.readMemoryBankFile(testFilePath);

      expect(result.isOk()).toBe(true);
      expect(result.value).toBe('file content');
      expect(mockFileOps.readFile).toHaveBeenCalledWith(testFilePath);
      expect(mockLogger.debug).toHaveBeenCalledWith(`Reading memory bank file: ${testFilePath}`);
    });

    it('should return MemoryBankFileError if file reading fails (non-ENOENT)', async () => {
      const readError = new Error('Permission denied');
      mockFileOps.readFile.mockResolvedValue(Result.err(readError));

      const result = await fileManager.readMemoryBankFile(testFilePath);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankFileError);
      const fileError = result.error as MemoryBankFileError;
      expect(fileError.message).toContain('Failed to read memory bank file');
      expect(fileError.filePath).toBe(testFilePath);
      expect(fileError.context?.operation).toBe('readFile');
      expect(fileError.cause).toBe(readError);
      expect(mockLogger.error).toHaveBeenCalledWith(fileError.message, fileError);
    });

    it('should return MemoryBankFileError with specific message for ENOENT', async () => {
      const notFoundError = new Error('ENOENT: no such file or directory');
      mockFileOps.readFile.mockResolvedValue(Result.err(notFoundError));

      const result = await fileManager.readMemoryBankFile(testFilePath);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankFileError);
      const fileError = result.error as MemoryBankFileError;
      expect(fileError.message).toContain('Memory bank file not found');
      expect(fileError.filePath).toBe(testFilePath);
      expect(fileError.context?.operation).toBe('readFile');
      expect(fileError.cause).toBe(notFoundError);
      expect(mockLogger.error).not.toHaveBeenCalled(); // ENOENT is not logged as error by default
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Memory bank file does not exist: ${testFilePath}`
      );
    });

    it('should return MemoryBankFileError if file content is undefined', async () => {
      // Force undefined value in mock result
      mockFileOps.readFile.mockResolvedValue(Result.ok(undefined as any));

      const result = await fileManager.readMemoryBankFile(testFilePath);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankFileError);
      const fileError = result.error as MemoryBankFileError;
      expect(fileError.message).toContain('File content is undefined');
      expect(fileError.filePath).toBe(testFilePath);
      expect(fileError.context?.operation).toBe('readFile');
      expect(fileError.cause).toBeUndefined(); // No underlying cause
      expect(mockLogger.error).toHaveBeenCalledWith(fileError.message, fileError);
    });

    it('should return MemoryBankFileError if an unexpected error occurs', async () => {
      const unexpectedError = new Error('Unexpected boom');
      mockFileOps.readFile.mockRejectedValue(unexpectedError); // Throw from deeper layer

      const result = await fileManager.readMemoryBankFile(testFilePath);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankFileError);
      const fileError = result.error as MemoryBankFileError;
      expect(fileError.message).toContain('Error reading memory bank file');
      expect(fileError.filePath).toBe(testFilePath);
      expect(fileError.context?.operation).toBe('readFileCatch');
      expect(fileError.cause).toBe(unexpectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(fileError.message, fileError);
    });
  });
});
