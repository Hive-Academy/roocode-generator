/**
 * Interface for File Operations Service.
 * Provides methods for file system interactions with type safety and error handling.
 */

import { Result } from "../result/result";
import { Dirent } from "fs";

export interface IFileOperations {
  /**
   * Reads the content of a file at the given path.
   * @param path - The file path to read from.
   * @returns A Result containing the file content as string on success, or an error on failure.
   */
  readFile(path: string): Promise<Result<string, Error>>;

  /**
   * Writes content to a file at the given path.
   * Creates the file if it does not exist, overwrites if it does.
   * @param path - The file path to write to.
   * @param content - The content to write.
   * @returns A Result indicating success or failure.
   */
  writeFile(path: string, content: string): Promise<Result<void, Error>>;

  /**
   * Creates a directory at the given path, recursively if needed.
   * @param path - The directory path to create.
   * @returns A Result indicating success or failure.
   */
  createDirectory(path: string): Promise<Result<void, Error>>;

  /**
   * Validates if the given path is a valid file system path.
   * @param path - The path to validate.
   * @returns True if valid, false otherwise.
   */
  validatePath(path: string): boolean;

  /**
   * Normalizes the given path to a standard format.
   * @param path - The path to normalize.
   * @returns The normalized path string.
   */
  normalizePath(path: string): string;

  /**
   * Reads the contents of a directory.
   * @param path - The directory path to read.
   * @returns A Result containing an array of Dirent objects on success, or an error on failure.
   */
  readDir(path: string): Promise<Result<Dirent[], Error>>;
}

// Assuming Dirent type is available globally or imported elsewhere if needed
// import { Dirent } from 'fs'; // Example import if Dirent is not global
