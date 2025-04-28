import { Inject, Injectable } from '@/core/di';
import { IServiceContainer } from '@/core/di/interfaces';
import { BaseGenerator } from '@/core/generators/base-generator';
import { Result } from '@/core/result/result';
import { ILogger } from '@/core/services/logger-service';
import { IProjectAnalyzer, ProjectContext } from '@/core/analysis/types'; // Removed unused specific types
import { IFileOperations } from '@/core/file-operations/interfaces';
import { LLMAgent } from '@/core/llm/llm-agent';
// Removed unused path import
import { ProjectConfig } from '../../types/shared';
import { MemoryBankService } from '@/memory-bank/memory-bank-service'; // Added MemoryBankService import

@Injectable()
export class AiMagicGenerator extends BaseGenerator<ProjectConfig> {
  readonly name = 'ai-magic';

  constructor(
    @Inject('IServiceContainer') protected container: IServiceContainer,
    @Inject('ILogger') private readonly logger: ILogger,
    @Inject('IFileOperations') private readonly fileOps: IFileOperations,
    @Inject('IProjectAnalyzer') private readonly projectAnalyzer: IProjectAnalyzer,
    @Inject('LLMAgent') private readonly llmAgent: LLMAgent,
    @Inject('MemoryBankService') private readonly memoryBankService: MemoryBankService // Added MemoryBankService injection
  ) {
    super(container);
    this.logger.debug(`${this.name} generator initialized`);
  }

  async validate(): Promise<Result<void, Error>> {
    this.logger.debug(`Validating ${this.name} generator...`);
    const dependencyCheck = await Promise.resolve(this.validateDependencies());
    return dependencyCheck;
  }

  protected validateDependencies(): Result<void, Error> {
    if (
      !this.fileOps ||
      !this.logger ||
      !this.projectAnalyzer ||
      !this.llmAgent ||
      !this.memoryBankService // Added MemoryBankService check
    ) {
      return Result.err(new Error(`${this.name} generator is missing required dependencies.`));
    }
    return Result.ok(undefined);
  }

  protected async executeGeneration(
    _config: ProjectConfig,
    contextPaths: string[]
  ): Promise<Result<string, Error>> {
    try {
      this.logger.info('Starting AI Magic generation process...');

      if (!contextPaths?.length) {
        return Result.err(new Error('No context path provided for analysis'));
      }

      const projectContextResult = await this.analyzeProject(contextPaths);
      if (projectContextResult.isErr()) {
        return Result.err(projectContextResult.error ?? new Error('Project analysis failed'));
      }

      if (!projectContextResult.value) {
        return Result.err(new Error('Project context is undefined'));
      }
      // Call Memory Bank Service
      this.logger.info('Calling Memory Bank Service to generate files...');
      const memoryBankResult = await this.memoryBankService.generateMemoryBank(
        projectContextResult.value
      );

      if (memoryBankResult.isErr()) {
        this.logger.error(
          'Memory Bank Service failed',
          memoryBankResult.error ?? new Error('Unknown error from MemoryBankService')
        );
        return Result.err(
          memoryBankResult.error ?? new Error('Memory Bank Service generation failed')
        );
      }

      this.logger.info(
        `Memory Bank Service completed successfully. Output path: ${memoryBankResult.value}`
      );
      // Assuming MemoryBankService returns the path or a confirmation message in its Ok value
      return Result.ok(memoryBankResult.value ?? 'Memory bank generation completed.');
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown error during AI Magic generation';
      this.logger.error('AI Magic generation failed', new Error(message));
      return Result.err(new Error(`AI Magic generation failed: ${message}`));
    }
  }

  private async analyzeProject(paths: string[]): Promise<Result<ProjectContext, Error>> {
    this.logger.debug(`Calling ProjectAnalyzer.analyzeProject for paths: ${paths.join(', ')}`);
    // Directly call the consolidated analyzeProject method
    const analysisResult = await this.projectAnalyzer.analyzeProject(paths);

    if (analysisResult.isErr()) {
      this.logger.error('Project analysis failed within AiMagicGenerator', analysisResult.error);
      return Result.err(analysisResult.error ?? new Error('Unknown project analysis error'));
    }

    if (!analysisResult.value) {
      const error = new Error('Project analysis returned undefined context');
      this.logger.error(error.message);
      return Result.err(error);
    }

    this.logger.debug('Project analysis successful.');
    return Result.ok(analysisResult.value); // Return the complete ProjectContext
  }

  // Removed generateRulesContent and related private methods as this logic
  // is now handled by MemoryBankService.
}
