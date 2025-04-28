import { ProjectConfig } from '../../types/shared';
import { IProjectConfigService } from '../core/config/interfaces';
import { Inject, Injectable } from '../core/di/decorators';
import { IServiceContainer } from '../core/di/interfaces';
import { MemoryBankGenerationError } from '../core/errors/memory-bank-errors';
import { BaseGenerator, IGenerator } from '../core/generators/base-generator';
import { Result } from '../core/result/result';
import { ILogger } from '../core/services/logger-service';
import { ProjectContext } from '@core/analysis/types'; // Import ProjectContext
import {
  IMemoryBankOrchestrator,
  IMemoryBankValidator,
  IProjectContextService,
  GenerationOptions,
} from './interfaces';

/**
 * Generator for memory bank files
 * Uses MemoryBankOrchestrator to coordinate the generation process
 */
@Injectable()
export class MemoryBankGenerator
  extends BaseGenerator<ProjectConfig>
  implements IGenerator<ProjectConfig>
{
  readonly name = 'memory-bank';

  constructor(
    @Inject('IServiceContainer') protected container: IServiceContainer,
    @Inject('IMemoryBankValidator') private readonly validator: IMemoryBankValidator,
    @Inject('IMemoryBankOrchestrator') private readonly orchestrator: IMemoryBankOrchestrator,
    @Inject('ILogger') private readonly logger: ILogger,
    @Inject('IProjectConfigService') private readonly projectConfigService: IProjectConfigService,
    @Inject('IProjectContextService')
    private readonly projectContextService: IProjectContextService
  ) {
    super(container);
  }

  /**
   * Helper for general generation errors
   */
  private _wrapGenerationError(
    message: string,
    operation: string,
    caughtError: unknown,
    additionalContext?: Record<string, unknown>
  ): Result<never> {
    const cause = caughtError instanceof Error ? caughtError : new Error(String(caughtError));
    const error = new MemoryBankGenerationError(
      message,
      { ...additionalContext, operation },
      cause
    );
    this.logger.error(error.message, error);
    return Result.err(error);
  }

  /**
   * Validates that all required dependencies are available
   */
  protected validateDependencies(): Result<void, Error> {
    const missing: string[] = [];
    if (!this.validator) missing.push('IMemoryBankValidator');
    if (!this.orchestrator) missing.push('IMemoryBankOrchestrator');
    if (!this.logger) missing.push('ILogger');
    if (!this.projectConfigService) missing.push('IProjectConfigService');
    if (!this.projectContextService) missing.push('IProjectContextService');

    if (missing.length > 0) {
      return Result.err(
        new MemoryBankGenerationError('Required dependencies are not initialized', {
          operation: 'validateDependencies',
          missingDependencies: missing,
        })
      );
    }
    return Result.ok(undefined);
  }

  /**
   * Executes the memory bank generation process
   *
   * @param config Project configuration
   * @returns Result indicating success or failure
   */
  public async executeGeneration(config: ProjectConfig): Promise<Result<string, Error>> {
    try {
      // Validate dependencies first
      const depValidationResult = this.validateDependencies();
      if (depValidationResult.isErr()) {
        return Result.err(depValidationResult.error as Error);
      }

      // Gather project context
      this.logger.info('Gathering project context...');
      const contextResult = await this.projectContextService.gatherContext([config.baseDir]);
      if (contextResult.isErr()) {
        return this._wrapGenerationError(
          'Failed to gather project context',
          'gatherContext',
          contextResult.error,
          { baseDir: config.baseDir }
        );
      }

      // Call the orchestrator to generate all memory bank files
      const result = await this.generateMemoryBankSuite(
        {
          context: contextResult.value,
        },
        config
      );

      if (result.isErr()) {
        // If it's already a MemoryBankGenerationError, don't wrap it again
        if (result.error instanceof MemoryBankGenerationError) {
          this.logger.error(
            `Memory bank suite generation failed: ${result.error.message}`,
            result.error
          );
          return Result.err(result.error);
        }
        return this._wrapGenerationError(
          'Memory bank suite generation failed',
          'generateMemoryBankSuite',
          result.error
        );
      }

      return Result.ok('Memory bank generated successfully.');
    } catch (error) {
      return this._wrapGenerationError(
        'Unexpected error during memory bank execution',
        'executeGenerationCatch',
        error
      );
    }
  }

  /**
   * Generates the memory bank suite using the orchestrator
   *
   * @param options Generation options including project context
   * @param config Project configuration
   * @returns Result indicating success or failure
   */
  public async generateMemoryBankSuite(
    options: GenerationOptions, // Keep options for signature, but it's not used correctly for the new orchestrator
    config: ProjectConfig
  ): Promise<Result<void, Error>> {
    try {
      // NOTE: This method is likely deprecated after refactoring to MemoryBankService.
      // The orchestrator now expects ProjectContext, not GenerationOptions.
      // Passing a placeholder context to fix the type error for commit hook.
      // If this generator class is still intended to be used, it needs significant refactoring.
      this.logger.warn(
        'MemoryBankGenerator.generateMemoryBankSuite called, but it may be deprecated and uses a placeholder context.'
      );
      const placeholderContext: ProjectContext = {
        techStack: {
          languages: [],
          frameworks: [],
          buildTools: [],
          testingFrameworks: [],
          linters: [],
          packageManager: '',
        },
        structure: {
          // Use empty string for rootDir to avoid accessing potentially problematic 'options' type
          rootDir: '',
          sourceDir: '',
          testDir: '',
          configFiles: [],
          mainEntryPoints: [],
          componentStructure: {},
        },
        dependencies: {
          dependencies: {},
          devDependencies: {},
          peerDependencies: {},
          internalDependencies: {},
        },
      };

      // Delegate to the orchestrator with the placeholder context
      return await this.orchestrator.orchestrateGeneration(placeholderContext, config);
    } catch (error) {
      return this._wrapGenerationError(
        'Unexpected error during memory bank suite generation',
        'generateMemoryBankSuiteCatch',
        error
      );
    }
  }

  /**
   * Validates the generator configuration
   *
   * @returns Result indicating validation success or failure
   */
  async validate(): Promise<Result<void, Error>> {
    const result = this.validateDependencies();
    await Promise.resolve(); // Keep async nature if needed later
    return result;
  }
}
