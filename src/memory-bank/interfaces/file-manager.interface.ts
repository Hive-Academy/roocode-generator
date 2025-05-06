import { Result } from '../../core/result/result';

export interface IMemoryBankFileManager {
  createMemoryBankDirectory(baseDir: string): Promise<Result<void>>;
  writeMemoryBankFile(path: string, content: string): Promise<Result<void>>;
  readMemoryBankFile(path: string): Promise<Result<string>>;
  copyDirectoryRecursive(sourceDir: string, destDir: string): Promise<Result<void, Error>>;
}
