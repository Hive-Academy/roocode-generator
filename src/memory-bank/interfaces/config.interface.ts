import { MemoryBankFileType, TemplateType } from '../memory-bank-enums';

export interface MemoryBankConfig {
  requiredFiles: MemoryBankFileType[];
  templateFiles: TemplateType[];
  baseDir: string;
  templateDir: string;
}