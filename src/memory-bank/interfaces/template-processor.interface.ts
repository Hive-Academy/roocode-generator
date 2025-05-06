import { Result } from '../../core/result/result';
import { MemoryBankFileType } from '../memory-bank-enums';

/**
 * Interface for MemoryBankTemplateProcessor
 * Responsible for loading and processing memory bank templates
 */
export interface IMemoryBankTemplateProcessor {
  /**
   * Loads and processes a template for a specific memory bank file type
   *
   * @param fileType - Type of memory bank file to process
   * @param context - Context data to apply to the template
   * @returns Result containing the processed template content or an error
   */
  loadAndProcessTemplate(
    fileType: MemoryBankFileType,
    context: Record<string, unknown>
  ): Promise<Result<string>>;
}
