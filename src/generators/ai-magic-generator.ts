import path from 'path';
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
import { IRulesPromptBuilder } from '@generators/rules/interfaces';
import { IContentProcessor } from '@memory-bank/interfaces';

@Injectable()
export class AiMagicGenerator extends BaseGenerator<ProjectConfig> {
  readonly name = 'ai-magic';
  // Define output path for roo
  private readonly rooOutputPath = path.join('.roo', 'roo-code', 'generated-roo.md');

  constructor(
    @Inject('IServiceContainer') protected container: IServiceContainer,
    @Inject('ILogger') private readonly logger: ILogger,
    @Inject('IFileOperations') private readonly fileOps: IFileOperations,
    @Inject('IProjectAnalyzer') private readonly projectAnalyzer: IProjectAnalyzer,
    @Inject('LLMAgent') private readonly llmAgent: LLMAgent,
    @Inject('MemoryBankService') private readonly memoryBankService: MemoryBankService,
    @Inject('IRulesPromptBuilder') private readonly rulesPromptBuilder: IRulesPromptBuilder,
    @Inject('IContentProcessor') private readonly contentProcessor: IContentProcessor
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
      !this.rulesPromptBuilder ||
      !this.contentProcessor
    ) {
      return Result.err(new Error(`${this.name} generator is missing required dependencies.`));
    }
    return Result.ok(undefined);
  }

  protected async executeGeneration(
    options: ProjectConfig, // options is ProjectConfig, includes CLI options
    contextPaths: string[]
  ): Promise<Result<string, Error>> {
    // Return type is string on success (message or path)
    try {
      this.logger.info('Starting AI Magic generation process...');

      // Access generatorType from options (assuming ProjectConfig will be updated to include it)
      const generatorType = (options as any).generatorType as string | undefined;
      if (!generatorType) {
        this.logger.error('The --generators flag is required when using --generate.');
        return Result.err(new Error('The --generators flag is required when using --generate.'));
      }

      // For "cursor" generator type, skip project analysis and return placeholder immediately.
      if (generatorType === 'cursor') {
        this.logger.info('Skipping project analysis for cursor generation placeholder.');
        return this.handleCursorGenerationPlaceholder([], options);
      }

      if (!contextPaths?.length) {
        return Result.err(new Error('No context path provided for analysis'));
      }

      // 1. Analyze Project (needed for both memory-bank and roo)
      const projectContextResult = await this.analyzeProject(contextPaths);
      if (projectContextResult.isErr()) {
        return Result.err(projectContextResult.error ?? new Error('Project analysis failed'));
      }
      const projectContext = projectContextResult.value;
      if (!projectContext) {
        return Result.err(new Error('Project context is undefined after analysis'));
      }

      switch (generatorType) {
        case 'memory-bank':
          return this.generateMemoryBankContent(projectContext, options);
        case 'roo':
          return this.generateRooContent(projectContext, options);
        case 'cursor':
          return this.handleCursorGenerationPlaceholder(projectContext, options); // Corrected method name
        default: {
          // Added curly braces for scope
          const errorMsg = `Unknown generator type: ${generatorType}`;
          this.logger.error(errorMsg);
          return Result.err(new Error(errorMsg));
        } // Added closing curly brace
      }
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
   * Generates memory bank content using the MemoryBankService.
   * @param projectContext The analyzed project context.
   * @param options The project configuration including CLI options.
   * @returns Result containing a success message or an error.
   */
  private async generateMemoryBankContent(
    projectContext: ProjectContext,
    _options: ProjectConfig // Renamed options to _options
  ): Promise<Result<string, Error>> {
    this.logger.info('Generating memory bank content...');
    const mbResult = await this.memoryBankService.generateMemoryBank(projectContext, _options); // Use _options
    if (mbResult.isErr()) {
      return Result.err(mbResult.error ?? new Error('Unknown memory bank generation error')); // Added nullish coalescing
    }
    const successMessage = `Memory Bank Service completed successfully. ${mbResult.value ?? ''}`;
    this.logger.info(successMessage);
    return Result.ok(successMessage);
  }

  /**
   * Orchestrates the generation of the roo file.
   * @param projectContext The analyzed project context.
   * @param options The project configuration including CLI options.
   * @returns Result containing the path to the generated file or an error.
   */
  private async generateRooContent(
    projectContext: ProjectContext,
    _options: ProjectConfig // Renamed options to _options
  ): Promise<Result<string, Error>> {
    this.logger.info('Generating roo (rules) content...');
    try {
      // 1. Build Prompts
      const promptResult = this.buildRooPrompts(projectContext);
      if (promptResult.isErr()) {
        return Result.err(promptResult.error ?? new Error('Unknown error building roo prompts')); // Added nullish coalescing
      }

      // Access value only after checking isOk()
      if (!promptResult.isOk()) {
        // This case should theoretically not be reached due to the isErr() check above,
        // but as a safeguard, return an error if value is unexpectedly not available.
        return Result.err(new Error('Failed to build roo prompts: Result value is not OK.'));
      }
      const { systemPrompt, userPrompt } = promptResult.value as {
        systemPrompt: string;
        userPrompt: string;
      };

      // 2. Get Completion from LLM
      const completionResult = await this.getRooCompletion(systemPrompt, userPrompt);
      if (completionResult.isErr()) {
        return Result.err(
          completionResult.error ?? new Error('Unknown error getting roo completion')
        ); // Added nullish coalescing
      }
      const rawContent = completionResult.value;

      // Check if rawContent is defined before processing
      if (rawContent === undefined || rawContent === null) {
        return Result.err(new Error('LLM returned undefined or null content for roo file.'));
      }

      // 3. Process Content
      const processedContentResult = this.processRooContent(rawContent);
      if (processedContentResult.isErr()) {
        // Log warning and return the error
        this.logger.warn(`Content processing failed: ${processedContentResult.error?.message}`);
        return Result.err(
          processedContentResult.error ?? new Error('Unknown error processing roo content')
        ); // Return the error
      }
      const finalContent = processedContentResult.value; // Use value directly as processRooContent now returns string on Ok

      if (!finalContent || finalContent.trim().length === 0) {
        return Result.err(new Error('Roo content became empty after processing.'));
      }

      // 4. Write File
      const writeResult = await this.writeRooFile(finalContent);
      if (writeResult.isErr()) {
        return Result.err(writeResult.error ?? new Error('Unknown error writing roo file')); // Added nullish coalescing
      }

      const successMessage = `Roo file generated successfully at ${writeResult.value!}`; // Added non-null assertion
      this.logger.info(successMessage);
      return Result.ok(writeResult.value!); // Return the path with non-null assertion
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown error during roo generation orchestration';
      const errorInstance = error instanceof Error ? error : new Error(message);
      this.logger.error(`Error in generateRooContent: ${message}`, errorInstance);
      return Result.err(errorInstance);
    }
  }

  /**
   * Builds the system and user prompts for roo generation.
   * @param projectContext The analyzed project context.
   * @returns Result containing the system and user prompts or an error.
   */
  private buildRooPrompts(
    projectContext: ProjectContext
  ): Result<{ systemPrompt: string; userPrompt: string }, Error> {
    try {
      const contextString = JSON.stringify(projectContext, null, 2);

      const systemPromptResult = this.rulesPromptBuilder.buildSystemPrompt('code');
      if (systemPromptResult.isErr()) {
        return Result.err(
          systemPromptResult.error ?? new Error('Unknown error building roo system prompt') // Added nullish coalescing
        );
      }

      const userPromptResult = this.rulesPromptBuilder.buildPrompt(
        'Generate project-specific roo based on the context.',
        contextString,
        ''
      );
      if (userPromptResult.isErr()) {
        return Result.err(
          userPromptResult.error ?? new Error('Unknown error building roo user prompt') // Added nullish coalescing
        );
      }

      const systemPrompt = systemPromptResult.value;
      const userPrompt = userPromptResult.value;

      if (!systemPrompt || !userPrompt) {
        return Result.err(new Error('System or user prompt became undefined unexpectedly.'));
      }

      return Result.ok({ systemPrompt, userPrompt });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error building roo prompts';
      const errorInstance = error instanceof Error ? error : new Error(message);
      this.logger.error(`Error in buildRooPrompts: ${message}`, errorInstance);
      return Result.err(errorInstance);
    }
  }

  /**
   * Gets completion content from the LLM for roo generation.
   * @param systemPrompt The system prompt.
   * @param userPrompt The user prompt.
   * @returns Result containing the raw content from the LLM or an error.
   */
  private async getRooCompletion(
    systemPrompt: string,
    userPrompt: string
  ): Promise<Result<string, Error>> {
    this.logger.debug('Requesting roo content from LLM...');
    const completionResult = await this.llmAgent.getCompletion(systemPrompt, userPrompt);
    if (completionResult.isErr()) {
      return Result.err(
        completionResult.error ?? new Error('Unknown error getting roo completion from LLM') // Added nullish coalescing
      );
    }
    const rawContent = completionResult.value;
    if (!rawContent || rawContent.trim().length === 0) {
      return Result.err(new Error('LLM returned empty content for roo file.'));
    }
    this.logger.debug('Received roo content from LLM.');
    return Result.ok(rawContent);
  }

  /**
   * Processes the raw content for roo generation (e.g., stripping markdown).
   * @param rawContent The raw content from the LLM.
   * @returns Result containing the processed content or an error.
   */
  private processRooContent(rawContent: string): Result<string, Error> {
    try {
      const strippedContentResult = this.contentProcessor.stripMarkdownCodeBlock(rawContent);
      if (strippedContentResult.isErr()) {
        // Log warning and return the error
        return Result.err(
          strippedContentResult.error ?? new Error('Unknown error stripping markdown') // Added nullish coalescing
        );
      }
      const strippedContent = strippedContentResult.value;
      if (
        strippedContent === undefined ||
        strippedContent === null ||
        strippedContent.trim().length === 0
      ) {
        return Result.err(new Error('Stripped roo content is empty or undefined.'));
      }
      return Result.ok(strippedContent); // Return string on Ok
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error processing roo content';
      const errorInstance = error instanceof Error ? error : new Error(message);
      this.logger.error(`Error in processRooContent: ${message}`, errorInstance);
      return Result.err(errorInstance);
    }
  }

  /**
   * Writes the final roo content to a file.
   * @param content The final content to write.
   * @returns Result containing the path to the written file or an error.
   */
  private async writeRooFile(content: string): Promise<Result<string, Error>> {
    try {
      this.logger.debug(`Writing generated roo to ${this.rooOutputPath}`);
      const writeResult = await this.fileOps.writeFile(this.rooOutputPath, content);
      if (writeResult.isErr()) {
        return Result.err(
          writeResult.error ?? new Error('Unknown error writing roo file') // Added nullish coalescing
        );
      }
      return Result.ok(this.rooOutputPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error writing roo file';
      const errorInstance = error instanceof Error ? error : new Error(message);
      this.logger.error(`Error in writeRooFile: ${message}`, errorInstance);
      return Result.err(errorInstance);
    }
  }

  private handleCursorGenerationPlaceholder(
    _projectContext: ProjectContext,
    _options: ProjectConfig // Renamed _config to _options for consistency
  ): Result<string, Error> {
    // Added context and config parameters, changed return type
    // Basic placeholder implementation
    const message = 'Cursor generation functionality will be implemented in a future task.';
    this.logger.info(message);
    return Result.ok(message); // Return a string message
  }
}
