import { Result } from '@core/result/result';
import { ProjectConfig } from '../../../types/shared'; // Corrected relative path
import { ProjectContext } from '@core/analysis/types'; // Import the structured context type

// Remove GenerationOptions as it's no longer needed for this interface

/**
 * Interface for MemoryBankOrchestrator
 * Responsible for coordinating the memory bank generation process
 */
export interface IMemoryBankOrchestrator {
  /**
   * Orchestrates the generation of memory bank files
   *
   * @param projectContext - Structured project context data
   * @param config - Project configuration
   * @returns Result indicating success or failure
   */
  orchestrateGeneration(
    projectContext: ProjectContext,
    config: ProjectConfig
  ): Promise<Result<void, Error>>;
}
