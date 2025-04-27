import { Result } from '../../core/result/result';
import { MemoryBankFileType } from '../interfaces';

/**
 * Interface for generating memory bank content using LLM
 */
export interface IMemoryBankContentGenerator {
  /**
   * Generates content for a memory bank file using LLM
   * @param fileType - Type of memory bank file to generate
   * @param context - Project context information
   * @param template - Template content to use for generation
   * @returns A Result containing the generated content or an error
   */
  generateContent(
    fileType: MemoryBankFileType,
    context: string,
    template: string
  ): Promise<Result<string, Error>>;
}
