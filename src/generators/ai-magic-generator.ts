import path from 'path'; // Added path import
import { Inject, Injectable } from '@core/di/decorators';
import { IServiceContainer } from '@core/di/interfaces';
import { BaseGenerator } from '@core/generators/base-generator';
import { Result } from '@core/result/result';
import { ILogger } from '@core/services/logger-service';
import { IProjectAnalyzer, ProjectContext } from '@core/analysis/types';
import { IFileOperations } from '@core/file-operations/interfaces';
import { LLMAgent } from '@core/llm/llm-agent';
import { ProjectConfig } from '../../types/shared';
import { MemoryBankService } from '@memory-bank/memory-bank-service';
import { IRulesPromptBuilder } from '@generators/rules/interfaces'; // Added RulesPromptBuilder interface import
import { IContentProcessor } from '@memory-bank/interfaces'; // Import IContentProcessor

@Injectable()
export class AiMagicGenerator extends BaseGenerator<ProjectConfig> {
  readonly name = 'ai-magic';
  // Define output path for rules
  private readonly rulesOutputPath = path.join('.roo', 'rules-code', 'generated-rules.md');

  constructor(
    @Inject('IServiceContainer') protected container: IServiceContainer,
    @Inject('ILogger') private readonly logger: ILogger,
    @Inject('IFileOperations') private readonly fileOps: IFileOperations,
    @Inject('IProjectAnalyzer') private readonly projectAnalyzer: IProjectAnalyzer,
    @Inject('LLMAgent') private readonly llmAgent: LLMAgent,
    @Inject('MemoryBankService') private readonly memoryBankService: MemoryBankService,
    @Inject('IRulesPromptBuilder') private readonly rulesPromptBuilder: IRulesPromptBuilder, // Added RulesPromptBuilder injection
    @Inject('IContentProcessor') private readonly contentProcessor: IContentProcessor // Added ContentProcessor injection
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
      !this.memoryBankService ||
      !this.rulesPromptBuilder || // Added RulesPromptBuilder check
      !this.contentProcessor // Added ContentProcessor check
    ) {
      return Result.err(new Error(`${this.name} generator is missing required dependencies.`));
    }
    return Result.ok(undefined);
  }

  protected async executeGeneration(
    config: ProjectConfig, // Use config
    contextPaths: string[]
  ): Promise<Result<string, Error>> {
    try {
      this.logger.info('Starting AI Magic generation process...');

      if (!contextPaths?.length) {
        return Result.err(new Error('No context path provided for analysis'));
      }

      // 1. Analyze Project
      const projectContextResult = await this.analyzeProject(contextPaths);
      if (projectContextResult.isErr()) {
        return Result.err(projectContextResult.error ?? new Error('Project analysis failed'));
      }
      const projectContext = projectContextResult.value;
      if (!projectContext) {
        return Result.err(new Error('Project context is undefined after analysis'));
      }

      // 2. Generate Memory Bank Files (concurrently with rules)
      this.logger.info('Starting Memory Bank Service generation...');
      const memoryBankPromise = this.memoryBankService.generateMemoryBank(projectContext, config); // Pass config

      // 3. Generate Rules File (concurrently with memory bank)
      this.logger.info('Starting Rules file generation...');
      const rulesFilePromise = this.generateRulesFile(projectContext);

      // Wait for both processes to complete
      const [memoryBankResult, rulesFileResult] = await Promise.all([
        memoryBankPromise,
        rulesFilePromise,
      ]);

      // Handle results and potential errors
      let finalMessage = '';
      const errors: string[] = [];

      if (memoryBankResult.isErr()) {
        const errMsg = `Memory Bank Service failed: ${memoryBankResult.error?.message ?? 'Unknown error'}`;
        this.logger.error(errMsg, memoryBankResult.error);
        errors.push(errMsg);
      } else {
        finalMessage += `Memory Bank generated successfully. ${memoryBankResult.value ?? ''}\n`;
        this.logger.info(
          `Memory Bank Service completed successfully. ${memoryBankResult.value ?? ''}`
        );
      }

      if (rulesFileResult.isErr()) {
        const errMsg = `Rules file generation failed: ${rulesFileResult.error?.message ?? 'Unknown error'}`;
        this.logger.error(errMsg, rulesFileResult.error);
        errors.push(errMsg);
      } else {
        finalMessage += `Rules file generated successfully at ${rulesFileResult.value}.\n`;
        this.logger.info(`Rules file generated successfully at ${rulesFileResult.value}`);
      }

      if (errors.length > 0) {
        return Result.err(
          new Error(`AI Magic generation completed with errors:\n- ${errors.join('\n- ')}`)
        );
      }

      return Result.ok(finalMessage.trim());
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown error during AI Magic generation';
      this.logger.error('AI Magic generation failed', new Error(message));
      return Result.err(new Error(`AI Magic generation failed: ${message}`));
    }
  }

  private async analyzeProject(paths: string[]): Promise<Result<ProjectContext, Error>> {
    this.logger.debug(`Calling ProjectAnalyzer.analyzeProject for paths: ${paths.join(', ')}`);
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
    return Result.ok(analysisResult.value);
  }

  /**
   * Generates the rules file using the RulesPromptBuilder and LLMAgent.
   * @param projectContext The analyzed project context.
   * @returns Result containing the path to the generated file or an error.
   */
  private async generateRulesFile(projectContext: ProjectContext): Promise<Result<string, Error>> {
    try {
      // Stringify context for the prompt builder
      const contextString = JSON.stringify(projectContext, null, 2);

      // Build System Prompt
      const systemPromptResult = this.rulesPromptBuilder.buildSystemPrompt('code'); // Assuming 'code' mode
      if (systemPromptResult.isErr()) {
        return Result.err(
          // Fix 1: Nullish coalescing for error message
          new Error(
            `Failed to build rules system prompt: ${systemPromptResult.error?.message ?? 'Unknown error'}`
          )
        );
      }

      // Build User Prompt
      const userPromptResult = this.rulesPromptBuilder.buildPrompt(
        'Generate project-specific rules based on the context.', // Basic instruction
        contextString,
        '' // No template needed here
      );
      if (userPromptResult.isErr()) {
        return Result.err(
          // Fix 1: Nullish coalescing for error message
          new Error(
            `Failed to build rules user prompt: ${userPromptResult.error?.message ?? 'Unknown error'}`
          )
        );
      }

      // Fix 2: Ensure both prompts are valid strings before proceeding
      const systemPrompt = systemPromptResult.value;
      const userPrompt = userPromptResult.value;

      if (!systemPrompt || !userPrompt) {
        // This case should technically not be hit due to prior checks, but belts and suspenders
        return Result.err(new Error('System or user prompt became undefined unexpectedly.'));
      }

      this.logger.debug('Requesting rules content from LLM...');
      const completionResult = await this.llmAgent.getCompletion(
        systemPrompt, // Now guaranteed to be string
        userPrompt // Now guaranteed to be string
      );
      if (completionResult.isErr()) {
        // Fix 1: Nullish coalescing for error message
        return Result.err(
          new Error(
            `LLM failed to generate rules content: ${completionResult.error?.message ?? 'Unknown error'}`
          )
        );
      }
      const rawContent = completionResult.value;
      if (!rawContent || rawContent.trim().length === 0) {
        return Result.err(new Error('LLM returned empty content for rules file.'));
      }
      this.logger.debug('Received rules content from LLM.');

      // Strip potential markdown code blocks (LLMs sometimes wrap output)
      const strippedContentResult = this.contentProcessor.stripMarkdownCodeBlock(rawContent);
      if (strippedContentResult.isErr()) {
        this.logger.warn(
          // Fix 1: Nullish coalescing for error message
          `Failed to strip markdown from rules content, using raw content. Error: ${strippedContentResult.error?.message ?? 'Unknown stripping error'}`
        );
        // Proceed with raw content if stripping fails, but log a warning
      }
      const finalContent = strippedContentResult.isOk() ? strippedContentResult.value : rawContent;

      if (!finalContent || finalContent.trim().length === 0) {
        // Check again after potential stripping
        return Result.err(new Error('Rules content became empty after processing.'));
      }

      // Write content to file
      this.logger.debug(`Writing generated rules to ${this.rulesOutputPath}`);
      const writeResult = await this.fileOps.writeFile(this.rulesOutputPath, finalContent);
      if (writeResult.isErr()) {
        // Fix 1: Nullish coalescing for error message
        return Result.err(
          new Error(
            `Failed to write rules file: ${writeResult.error?.message ?? 'Unknown file writing error'}`
          )
        );
      }

      return Result.ok(this.rulesOutputPath);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error generating rules file';
      // Fix 3: Ensure caught error is an Error instance for logging
      const errorInstance = error instanceof Error ? error : new Error(message);
      this.logger.error(`Error in generateRulesFile: ${message}`, errorInstance);
      return Result.err(errorInstance); // Return the actual error instance
    }
  }
}
