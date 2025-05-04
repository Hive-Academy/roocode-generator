import { Result } from '../result/result';

export interface FileMetadata {
  path: string;
  size: number;
  priority?: number;
}

export interface IFilePrioritizer {
  prioritizeFiles(files: FileMetadata[], rootDir: string): FileMetadata[];
}

export interface FileContentResult {
  content: string;
  metadata: FileMetadata[];
}

export interface IFileContentCollector {
  collectContent(
    filePaths: string[],
    rootDir: string,
    tokenLimit: number
  ): Promise<Result<FileContentResult, Error>>;
}

export interface IFileCollector {
  collectFiles(rootDir: string): Promise<Result<string[], Error>>;
}

export interface ITokenCounter {
  countTokens(content: string): Promise<Result<number, Error>>;
  getContextWindowSize(): Promise<Result<number, Error>>;
}

import { ParsedCodeInfo } from './types'; // Import the new type

/**
 * Defines the contract for parsing code using Tree-sitter.
 */
export interface ITreeSitterParserService {
  /**
   * Initializes the service by pre-loading necessary grammars.
   * Must be called before using the parse method.
   * @returns A Promise resolving to a Result indicating success or failure.
   */
  initialize(): Result<void, Error>;

  /**
   * Parses the given code content for a specific language.
   * Assumes initialize() has been successfully called.
   * @param content - The source code content as a string.
   * @param language - The language identifier (e.g., 'javascript', 'typescript').
   * @returns A Promise resolving to a Result containing the parsed code information or an Error.
   */
  parse(content: string, language: string): Result<ParsedCodeInfo, Error>;
}
