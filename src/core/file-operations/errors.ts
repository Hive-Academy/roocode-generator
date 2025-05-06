/**
 * File operation specific error types.
 * Extends the base Error class to provide more context.
 */

/**
 * Base class for file operation errors.
 */
export class FileOperationError extends Error {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'FileOperationError';
    if (cause) {
      this.stack += '\\nCaused by: ' + cause.stack;
    }
  }
}

/**
 * Error thrown when a file is not found.
 */
export class FileNotFoundError extends FileOperationError {
  constructor(path: string, cause?: Error) {
    super(`File not found: ${path}`, cause);
    this.name = 'FileNotFoundError';
  }
}

/**
 * Error thrown when a directory cannot be created.
 */
export class DirectoryCreationError extends FileOperationError {
  constructor(path: string, cause?: Error) {
    super(`Failed to create directory: ${path}`, cause);
    this.name = 'DirectoryCreationError';
  }
}

/**
 * Error thrown when a path is invalid.
 */
export class InvalidPathError extends FileOperationError {
  constructor(path: string) {
    super(`Invalid path: ${path}`);
    this.name = 'InvalidPathError';
  }
}

/**
 * Error thrown when a file cannot be read.
 */
export class FileReadError extends FileOperationError {
  constructor(path: string, cause?: Error) {
    super(`Failed to read file: ${path}`, cause);
    this.name = 'FileReadError';
  }
}

/**
 * Error thrown when a file cannot be written.
 */
export class FileWriteError extends FileOperationError {
  constructor(path: string, cause?: Error) {
    super(`Failed to write file: ${path}`, cause);
    this.name = 'FileWriteError';
  }
}
