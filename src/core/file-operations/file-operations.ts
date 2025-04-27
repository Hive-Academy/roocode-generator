import { Dirent, promises as fsPromises } from 'fs';
import * as pathModule from 'path';
import { Injectable, Inject } from '../di/decorators';
import { IFileOperations } from './interfaces';
import {
  FileOperationError,
  FileNotFoundError,
  DirectoryCreationError,
  InvalidPathError,
  FileReadError,
  FileWriteError,
} from './errors';
import { Result } from '../result/result';
import { ILogger } from '../services/logger-service';

/**
 * FileOperations service implementation.
 * Provides type-safe, error-handled file system operations.
 */
@Injectable()
export class FileOperations implements IFileOperations {
  private logger: ILogger;

  constructor(@Inject('ILogger') logger: ILogger) {
    this.logger = logger;
  }

  /**
   * Reads the content of a file at the given path.
   * @param path - The file path to read from.
   * @returns A Result containing the file content as string on success, or an error on failure.
   */
  async readFile(path: string): Promise<Result<string, FileOperationError>> {
    try {
      const normalizedPath = this.normalizePath(path);
      if (!this.validatePath(normalizedPath)) {
        this.logger.error(`Invalid path provided to readFile: ${path}`);
        return Result.err(new InvalidPathError(path));
      }
      const data = await fsPromises.readFile(normalizedPath, { encoding: 'utf-8' });
      return Result.ok(data);
    } catch (error: unknown) {
      const errObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Error reading file at path: ${path}`, errObj);
      if ((errObj as any).code === 'ENOENT') {
        return Result.err(new FileNotFoundError(path, errObj));
      }
      return Result.err(new FileReadError(path, errObj));
    }
  }

  /**
   * Writes content to a file at the given path.
   * Creates the file if it does not exist, overwrites if it does.
   * @param path - The file path to write to.
   * @param content - The content to write.
   * @returns A Result indicating success or failure.
   */
  async writeFile(path: string, content: string): Promise<Result<void, FileOperationError>> {
    try {
      const normalizedPath = this.normalizePath(path);
      if (!this.validatePath(normalizedPath)) {
        this.logger.error(`Invalid path provided to writeFile: ${path}`);
        return Result.err(new InvalidPathError(path));
      }
      await fsPromises.writeFile(normalizedPath, content, { encoding: 'utf-8' });
      return Result.ok(undefined);
    } catch (error: unknown) {
      const errObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Error writing file at path: ${path}`, errObj);
      return Result.err(new FileWriteError(path, errObj));
    }
  }

  /**
   * Creates a directory at the given path, recursively if needed.
   * @param path - The directory path to create.
   * @returns A Result indicating success or failure.
   */
  async createDirectory(path: string): Promise<Result<void, FileOperationError>> {
    try {
      const normalizedPath = this.normalizePath(path);
      if (!this.validatePath(normalizedPath)) {
        this.logger.error(`Invalid path provided to createDirectory: ${path}`);
        return Result.err(new InvalidPathError(path));
      }

      await fsPromises.mkdir(normalizedPath, { recursive: true });
      return Result.ok(undefined);
    } catch (error: unknown) {
      const errObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Error creating directory at path: ${path}`, errObj);
      return Result.err(new DirectoryCreationError(path, errObj));
    }
  }

  /**
   * Validates if the given path is a valid file system path.
   * @param path - The path to validate.
   * @returns True if valid, false otherwise.
   */
  validatePath(path: string): boolean {
    try {
      if (!path || typeof path !== 'string') {
        return false;
      }
      if (path.includes('\0')) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Normalizes the given path to a standard format.
   * @param path - The path to normalize.
   * @returns The normalized path string.
   */
  normalizePath(path: string): string {
    return pathModule.normalize(path);
  }

  /**
   * Reads the contents of a directory.
   * @param path - The directory path to read.
   * @returns A Result containing an array of Dirent objects on success, or an error on failure.
   */
  async readDir(path: string): Promise<Result<Dirent[], Error>> {
    try {
      const normalizedPath = this.normalizePath(path);
      if (!this.validatePath(normalizedPath)) {
        this.logger.error(`Invalid path provided to readDir: ${path}`);
        return Result.err(new InvalidPathError(path));
      }
      const dirents = await fsPromises.readdir(normalizedPath, { withFileTypes: true });
      return Result.ok(dirents);
    } catch (error: unknown) {
      const errObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Error reading directory at path: ${path}`, errObj);
      return Result.err(new FileOperationError(path, errObj));
    }
  }

  /**
   * Checks if a file or directory exists at the given path.
   * @param path - The file or directory path to check.
   * @returns A Result containing a boolean indicating existence on success, or an error on failure.
   */
  async exists(path: string): Promise<Result<boolean, FileOperationError>> {
    try {
      const normalizedPath = this.normalizePath(path);
      if (!this.validatePath(normalizedPath)) {
        this.logger.error(`Invalid path provided to exists: ${path}`);
        return Result.err(new InvalidPathError(path));
      }
      await fsPromises.access(normalizedPath);
      return Result.ok(true);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File or directory does not exist
        return Result.ok(false);
      }
      // Other errors (e.g., permissions) should be reported
      const errObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Error checking existence of path: ${path}`, errObj);
      return Result.err(new FileOperationError(path, errObj));
    }
  }

  /**
   * Checks if the given path is a directory.
   * @param path - The path to check.
   * @returns A Result containing a boolean indicating if the path is a directory, or an error on failure.
   */
  async isDirectory(path: string): Promise<Result<boolean, FileOperationError>> {
    try {
      const normalizedPath = this.normalizePath(path);
      if (!this.validatePath(normalizedPath)) {
        this.logger.error(`Invalid path provided to isDirectory: ${path}`);
        return Result.err(new InvalidPathError(path));
      }
      const stats = await fsPromises.stat(normalizedPath);
      return Result.ok(stats.isDirectory());
    } catch (error: unknown) {
      const errObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Error checking if path is directory: ${path}`, errObj);
      if ((errObj as any).code === 'ENOENT') {
        return Result.err(new FileNotFoundError(path, errObj));
      }
      return Result.err(new FileOperationError(path, errObj));
    }
  }

  /**
   * Recursively copies a directory from source to destination.
   * @param sourceDir - Source directory path
   * @param destDir - Destination directory path
   * @returns A Result indicating success or failure
   */
  async copyDirectoryRecursive(
    sourceDir: string,
    destDir: string
  ): Promise<Result<void, FileOperationError>> {
    try {
      // Create destination directory if it doesn't exist
      const createDirResult = await this.createDirectory(destDir);
      // Ignore EEXIST, handle other errors
      if (createDirResult.isErr() && !createDirResult.error?.message.includes('EEXIST')) {
        this.logger.error(`Failed to create directory: ${destDir}`, createDirResult.error);
        return Result.err(new DirectoryCreationError(destDir, createDirResult.error));
      }

      // Read source directory contents
      const readDirResult = await this.readDir(sourceDir);
      if (readDirResult.isErr()) {
        this.logger.error(`Failed to read directory: ${sourceDir}`, readDirResult.error);
        return Result.err(new FileOperationError(sourceDir, readDirResult.error));
      }

      const entries = readDirResult.value;
      if (!entries) {
        return Result.err(
          new FileOperationError(sourceDir, new Error('No entries found in directory'))
        );
      }

      // Process each entry
      for (const entry of entries) {
        const sourcePath = pathModule.join(sourceDir, entry.name);
        const destPath = pathModule.join(destDir, entry.name);

        // Validate paths before operations
        if (!this.validatePath(sourcePath)) {
          return Result.err(new InvalidPathError(sourcePath));
        }

        if (!this.validatePath(destPath)) {
          return Result.err(new InvalidPathError(destPath));
        }

        if (entry.isDirectory()) {
          // Recursively copy subdirectory
          const copyResult = await this.copyDirectoryRecursive(sourcePath, destPath);
          if (copyResult.isErr()) {
            return copyResult;
          }
        } else {
          // Copy file
          const readResult = await this.readFile(sourcePath);
          if (readResult.isErr()) {
            this.logger.error(`Failed to read file: ${sourcePath}`, readResult.error);
            return Result.err(new FileReadError(sourcePath, readResult.error));
          }

          const content = readResult.value;
          if (content === undefined || content === null) {
            return Result.err(
              new FileOperationError(sourcePath, new Error('Empty or undefined content for file'))
            );
          }

          const writeResult = await this.writeFile(destPath, content);
          if (writeResult.isErr()) {
            this.logger.error(`Failed to write file: ${destPath}`, writeResult.error);
            return Result.err(new FileWriteError(destPath, writeResult.error));
          }
        }
      }

      return Result.ok(undefined);
    } catch (error) {
      const errObj = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Unexpected error during directory copy from ${sourceDir} to ${destDir}`,
        errObj
      );
      return Result.err(new FileOperationError(sourceDir, errObj));
    }
  }
}
