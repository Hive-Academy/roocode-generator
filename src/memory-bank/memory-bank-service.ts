import { Injectable, Inject } from '../core/di/decorators';
import { Result } from '../core/result/result';
import { ProjectConfig } from '../../types/shared';

import { MemoryBankGenerationError } from '../core/errors/memory-bank-errors';
import { IMemoryBankOrchestrator } from './interfaces';
import { ILogger } from '../core/services/logger-service';
import { ProjectContext } from '@core/analysis/types';

/**
 * Service for generating memory bank files from project context
 */
@Injectable()
export class MemoryBankService {
  constructor(
    @Inject('IMemoryBankOrchestrator') private readonly orchestrator: IMemoryBankOrchestrator,
    @Inject('ILogger') private readonly logger: ILogger
  ) {}

  /**
   * Generates the memory bank files using the provided project context
   * @param projectContext Structured project context data
   * @param config Optional project configuration for generation settings
   * @returns Result with success message or error
   */
  public async generateMemoryBank(
    projectContext: ProjectContext,
    config?: ProjectConfig
  ): Promise<Result<string, Error>> {
    try {
      if (!config) {
        const error = new MemoryBankGenerationError(
          'ProjectConfig is required for memory bank generation',
          { operation: 'generateMemoryBank' }
        );
        this.logger.error(error.message, error);
        return Result.err(error);
      }

      this.logger.info('Starting memory bank generation from project context...');

      // Remove unused generationOptions

      const result = await this.orchestrator.orchestrateGeneration(projectContext, config); // Pass projectContext directly

      if (result.isErr()) {
        if (result.error) {
          this.logger.error(`Memory bank generation failed: ${result.error.message}`, result.error);
          return Result.err(result.error);
        } else {
          const unknownError = new Error('Unknown error during memory bank generation');
          this.logger.error(unknownError.message, unknownError);
          return Result.err(unknownError);
        }
      }

      this.logger.info('Memory bank generation completed successfully.');
      return Result.ok('Memory bank generated successfully.');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Unexpected error during memory bank generation', err);
      return Result.err(err);
    }
  }
}
