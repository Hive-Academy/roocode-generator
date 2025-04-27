import { Result } from '../../core/result/result';
import { ProjectConfig } from '../../../types/shared';

/**
 * Options for memory bank generation
 */
export interface GenerationOptions {
  /**
   * Project context information
   */
  context?: string;
}

/**
 * Interface for MemoryBankOrchestrator
 * Responsible for coordinating the memory bank generation process
 */
export interface IMemoryBankOrchestrator {
  /**
   * Orchestrates the generation of memory bank files
   *
   * @param options - Generation options including project context
   * @param config - Project configuration
   * @returns Result indicating success or failure
   */
  orchestrateGeneration(
    options: GenerationOptions,
    config: ProjectConfig
  ): Promise<Result<void, Error>>;
}
