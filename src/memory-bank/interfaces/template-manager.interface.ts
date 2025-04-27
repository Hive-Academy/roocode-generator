import { ITemplateManager } from '../../core/template-manager/interfaces';

/**
 * Interface for MemoryBankTemplateManager
 * Extends the core ITemplateManager interface to maintain compatibility
 * while allowing for memory bank specific implementations.
 */
export interface IMemoryBankTemplateManager extends ITemplateManager {
  /**
   * Gets the template path for a memory bank template.
   * This is implemented in the MemoryBankTemplateManager class.
   *
   * @param name - Template name
   * @returns The full file path to the template
   */
  getTemplatePath(name: string): string;
}
