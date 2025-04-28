import { Inject, Injectable } from '@/core/di';
import { IServiceContainer } from '@/core/di/interfaces';
import { BaseGenerator } from '@/core/generators/base-generator';
import { Result } from '@/core/result/result';
import { ILogger } from '@/core/services/logger-service';
import {
  DependencyGraph,
  IProjectAnalyzer,
  ProjectContext,
  ProjectStructure,
  TechStackAnalysis,
} from '@/core/analysis/types';
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
    try {
      const [techStack, structure, dependencies] = await Promise.all([
        this.projectAnalyzer.analyzeTechStack(paths),
        this.projectAnalyzer.analyzeProjectStructure(paths),
        this.projectAnalyzer.analyzeDependencies(paths),
      ]);

      return Result.ok({
        techStack: techStack.value as TechStackAnalysis,
        structure: structure.value as ProjectStructure,
        dependencies: dependencies.value as DependencyGraph,
      });
    } catch (error: any) {
      return Result.err(new Error(`Project analysis failed: ${error.message}`));
    }
  }

  // Removed generateRulesContent and related private methods as this logic
  // is now handled by MemoryBankService.
}
