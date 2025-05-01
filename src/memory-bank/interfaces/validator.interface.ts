import { Result } from '../../core/result/result';
import { MemoryBankFileType } from '../memory-bank-enums';

export interface IMemoryBankValidator {
  validateRequiredFiles(baseDir: string): Promise<Result<void>>;
  validateTemplateFiles(baseDir: string): Promise<Result<void>>;
  validateFileContent(content: string, type: MemoryBankFileType): Result<void>;
}
