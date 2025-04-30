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
