import path from 'path';
import { Injectable, Inject } from '../core/di/decorators';
import { IMemoryBankFileManager } from './interfaces';
import { IFileOperations } from '../core/file-operations/interfaces';
import { ILogger } from '../core/services/logger-service';
import { Result } from '../core/result/result';
import { MemoryBankFileError } from '../core/errors/memory-bank-errors';

@Injectable()
export class MemoryBankFileManager implements IMemoryBankFileManager {
  constructor(
    @Inject('IFileOperations') private readonly fileOps: IFileOperations,
    @Inject('ILogger') private readonly logger: ILogger
  ) {}

  // Helper method to create, log, and return a MemoryBankFileError Result
  private _handleFileError(
    message: string,
    filePath: string,
    operation: string,
    cause?: Error | null // Accept Error, null, or undefined
  ): Result<never> {
    const error = new MemoryBankFileError(
      message,
      filePath,
      { operation },
      cause ?? undefined // Ensure cause passed is Error | undefined
    );
    this.logger.error(error.message, error);
    return Result.err(error);
  }

  // Helper method for wrapping errors caught in catch blocks
  private _wrapCaughtError(
    message: string,
    filePathOrContext: string, // Can be baseDir or filePath depending on context
    operation: string,
    caughtError: unknown
  ): Result<never> {
    const cause = caughtError instanceof Error ? caughtError : new Error(String(caughtError));
    // Use the other helper to avoid duplication
    return this._handleFileError(message, filePathOrContext, operation, cause);
  }

  async createMemoryBankDirectory(baseDir: string): Promise<Result<void>> {
    try {
      // Create memory-bank directory
      const memoryBankDir = path.join(baseDir, 'memory-bank');
      this.logger.debug(`Creating memory bank directory: ${memoryBankDir}`);

      const dirResult = await this.fileOps.createDirectory(memoryBankDir);
      if (dirResult.isErr()) {
        // If directory already exists, that's fine
        if (dirResult.error?.message.includes('EEXIST')) {
          this.logger.debug(`Memory bank directory already exists: ${memoryBankDir}`);
        } else {
          return this._handleFileError(
            'Failed to create memory bank directory',
            memoryBankDir,
            'createDirectory',
            dirResult.error
          );
        }
      } else {
        this.logger.debug(`Created memory bank directory: ${memoryBankDir}`);
      }

      // Create templates subdirectory
      const templatesDir = path.join(memoryBankDir, 'templates');
      this.logger.debug(`Creating templates directory: ${templatesDir}`);

      const templatesDirResult = await this.fileOps.createDirectory(templatesDir);
      if (templatesDirResult.isErr()) {
        // If directory already exists, that's fine
        if (templatesDirResult.error?.message.includes('EEXIST')) {
          this.logger.debug(`Templates directory already exists: ${templatesDir}`);
        } else {
          return this._handleFileError(
            'Failed to create templates directory',
            templatesDir,
            'createDirectory',
            templatesDirResult.error
          );
        }
      } else {
        this.logger.debug(`Created templates directory: ${templatesDir}`);
      }

      return Result.ok(undefined);
    } catch (error) {
      return this._wrapCaughtError(
        'Error creating memory bank directory structure',
        baseDir,
        'createStructure',
        error
      );
    }
  }

  async writeMemoryBankFile(filePath: string, content: string): Promise<Result<void>> {
    try {
      // Ensure the directory exists before writing the file
      const dirPath = path.dirname(filePath);
      const dirResult = await this.fileOps.createDirectory(dirPath);
      if (dirResult.isErr() && !dirResult.error?.message.includes('EEXIST')) {
        return this._handleFileError(
          'Failed to create directory for file',
          dirPath,
          'createDirectory',
          dirResult.error
        );
      }

      this.logger.debug(`Writing memory bank file: ${filePath}`);
      const result = await this.fileOps.writeFile(filePath, content);
      if (result.isErr()) {
        return this._handleFileError(
          'Failed to write memory bank file',
          filePath,
          'writeFile',
          result.error
        );
      }
      this.logger.debug(`Successfully wrote memory bank file: ${filePath}`);
      return Result.ok(undefined);
    } catch (error) {
      return this._wrapCaughtError(
        'Error writing memory bank file',
        filePath,
        'writeFileCatch', // Differentiate catch block origin if needed
        error
      );
    }
  }

  async readMemoryBankFile(filePath: string): Promise<Result<string>> {
    try {
      this.logger.debug(`Reading memory bank file: ${filePath}`);
      const result = await this.fileOps.readFile(filePath);
      if (result.isErr()) {
        if (result.error?.message.includes('ENOENT')) {
          this.logger.debug(`Memory bank file does not exist: ${filePath}`);
        } else {
          // Log non-ENOENT errors before returning
          this.logger.error(
            `Failed to read memory bank file (non-ENOENT): ${filePath}`,
            result.error ?? new Error('Unknown error')
          );
        }
        // Always return a structured error, including for ENOENT
        const message = result.error?.message.includes('ENOENT')
          ? 'Memory bank file not found'
          : 'Failed to read memory bank file';
        return this._handleFileError(message, filePath, 'readFile', result.error);
      }
      if (result.value === undefined) {
        // Use helper for undefined content error
        return this._handleFileError(
          'File content is undefined',
          filePath,
          'readFile'
          // No original cause here, it's a logic error
        );
      }
      this.logger.debug(`Successfully read memory bank file: ${filePath}`);
      return Result.ok(result.value);
    } catch (error) {
      return this._wrapCaughtError(
        'Error reading memory bank file',
        filePath,
        'readFileCatch', // Differentiate catch block origin if needed
        error
      );
    }
  }

  /**
   * Recursively copies a directory from source to destination.
   * @param sourceDir - Source directory path
   * @param destDir - Destination directory path
   * @returns A Result indicating success or failure
   */
  async copyDirectoryRecursive(sourceDir: string, destDir: string): Promise<Result<void, Error>> {
    try {
      this.logger.debug(`Copying directory recursively from ${sourceDir} to ${destDir}`);

      // Use the core FileOperations service to perform the actual copy
      const result = await this.fileOps.copyDirectoryRecursive(sourceDir, destDir);

      if (result.isErr()) {
        return this._handleFileError(
          `Failed to copy directory ${sourceDir} to ${destDir}`,
          sourceDir,
          'copyDirectoryRecursive',
          result.error
        );
      }

      this.logger.debug(`Successfully copied directory from ${sourceDir} to ${destDir}`);
      return Result.ok(undefined);
    } catch (error) {
      return this._wrapCaughtError(
        `Unexpected error during directory copy`,
        sourceDir,
        'copyDirectoryRecursiveCatch',
        error
      );
    }
  }
}
