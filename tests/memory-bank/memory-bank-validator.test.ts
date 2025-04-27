/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/unbound-method */
import path from 'path';
import { MemoryBankValidator } from '../../src/memory-bank/memory-bank-validator';
import { IFileOperations } from '../../src/core/file-operations/interfaces';
import { ILogger } from '../../src/core/services/logger-service';
import { Result } from '../../src/core/result/result';
import { MemoryBankFileType, TemplateType } from '../../src/memory-bank/interfaces';
import { MemoryBankValidationError } from '../../src/core/errors/memory-bank-errors';

describe('MemoryBankValidator', () => {
  let validator: MemoryBankValidator;
  let mockFileOps: jest.Mocked<IFileOperations>;
  let mockLogger: jest.Mocked<ILogger>;

  const testBaseDir = '/test/project';
  const memoryBankDir = path.join(testBaseDir, 'memory-bank');
  const templateDir = path.join(testBaseDir, 'templates', 'memory-bank', 'templates');

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

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    validator = new MemoryBankValidator(mockFileOps, mockLogger);

    // Default happy path mock
    mockFileOps.readFile.mockResolvedValue(Result.ok('file content'));
  });

  describe('validateRequiredFiles', () => {
    it('should return Ok if all required files exist', async () => {
      const result = await validator.validateRequiredFiles(testBaseDir);

      expect(result.isOk()).toBe(true);
      // Check if readFile was called for each expected file type
      for (const type of Object.values(MemoryBankFileType)) {
        expect(mockFileOps.readFile).toHaveBeenCalledWith(
          path.join(memoryBankDir, `${String(type)}.md`)
        );
      }
      for (const type of Object.values(TemplateType)) {
        expect(mockFileOps.readFile).toHaveBeenCalledWith(
          path.join(templateDir, `${type}-template.md`)
        );
      }
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should return MemoryBankValidationError if a memory bank file is missing', async () => {
      // Mock readFile to fail for one specific file, ensuring Promise<Result> return type
      mockFileOps.readFile.mockImplementation((filePath): Promise<Result<string, Error>> => {
        if (filePath === path.join(memoryBankDir, `${MemoryBankFileType.ProjectOverview}.md`)) {
          return Promise.resolve(Result.err(new Error('ENOENT')));
        }
        return Promise.resolve(Result.ok('content'));
      });

      const result = await validator.validateRequiredFiles(testBaseDir);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankValidationError);
      const validationError = result.error as MemoryBankValidationError;
      expect(validationError.message).toContain('Missing required memory bank or template files');
      expect(validationError.context?.missingFiles).toBeDefined();
      expect(validationError.context?.missingFiles).toContain(
        `Missing required memory bank file: ${MemoryBankFileType.ProjectOverview}.md`
      );
      // Logger is not called directly in this error path in the validator
    });

    it('should return MemoryBankValidationError if a template file is missing', async () => {
      // Mock readFile to fail for one specific template file, ensuring Promise<Result> return type
      mockFileOps.readFile.mockImplementation((filePath): Promise<Result<string, Error>> => {
        if (filePath === path.join(templateDir, `${TemplateType.TaskDescription}-template.md`)) {
          return Promise.resolve(Result.err(new Error('ENOENT')));
        }
        return Promise.resolve(Result.ok('content'));
      });

      const result = await validator.validateRequiredFiles(testBaseDir);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankValidationError);
      const validationError = result.error as MemoryBankValidationError;
      expect(validationError.message).toContain('Missing required memory bank or template files');
      expect(validationError.context?.missingFiles).toBeDefined();
      expect(validationError.context?.missingFiles).toContain(
        `Missing required template file: ${TemplateType.TaskDescription}-template.md`
      );
    });

    it('should return MemoryBankValidationError if multiple files are missing', async () => {
      mockFileOps.readFile.mockResolvedValue(Result.err(new Error('ENOENT'))); // Fail all reads

      const result = await validator.validateRequiredFiles(testBaseDir);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankValidationError);
      const validationError = result.error as MemoryBankValidationError;
      expect(validationError.message).toContain('Missing required memory bank or template files');
      expect((validationError.context?.missingFiles as string[])?.length).toBeGreaterThan(1);
    });

    it('should return MemoryBankValidationError if an unexpected error occurs', async () => {
      const unexpectedError = new Error('Unexpected boom');
      mockFileOps.readFile.mockRejectedValue(unexpectedError); // Throw from deeper layer

      const result = await validator.validateRequiredFiles(testBaseDir);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankValidationError);
      const validationError = result.error as MemoryBankValidationError;
      expect(validationError.message).toContain('Error validating memory bank files');
      expect(validationError.context?.operation).toBe('validateRequiredFiles');
      expect(validationError.cause).toBe(unexpectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(validationError.message, validationError);
    });
  });

  // validateTemplateFiles currently does nothing, so no error tests needed yet.

  describe('validateFileContent', () => {
    it('should return Ok for non-empty content', () => {
      const result = validator.validateFileContent(
        'Valid content',
        MemoryBankFileType.ProjectOverview
      );
      expect(result.isOk()).toBe(true);
    });

    it('should return MemoryBankValidationError for empty content', () => {
      const result = validator.validateFileContent('', MemoryBankFileType.DeveloperGuide);
      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankValidationError);
      const validationError = result.error as MemoryBankValidationError;
      expect(validationError.message).toContain(
        'Content for DeveloperGuide is empty or whitespace'
      );
      expect(validationError.context?.fileType).toBe(MemoryBankFileType.DeveloperGuide);
      expect(validationError.context?.operation).toBe('validateFileContent');
    });

    it('should return MemoryBankValidationError for whitespace-only content', () => {
      const result = validator.validateFileContent(
        '   \n\t ',
        MemoryBankFileType.TechnicalArchitecture
      );
      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankValidationError);
      const validationError = result.error as MemoryBankValidationError;
      expect(validationError.message).toContain(
        'Content for TechnicalArchitecture is empty or whitespace'
      );
      expect(validationError.context?.fileType).toBe(MemoryBankFileType.TechnicalArchitecture);
      expect(validationError.context?.operation).toBe('validateFileContent');
    });

    it('should return MemoryBankValidationError for null content', () => {
      const result = validator.validateFileContent(null as any, MemoryBankFileType.ProjectOverview);
      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankValidationError);
    });

    it('should return MemoryBankValidationError for undefined content', () => {
      const result = validator.validateFileContent(
        undefined as any,
        MemoryBankFileType.ProjectOverview
      );
      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankValidationError);
    });
  });
});
