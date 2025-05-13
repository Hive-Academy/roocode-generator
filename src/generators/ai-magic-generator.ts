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
import { RooFileOpsHelper } from './roo-file-ops-helper';

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
    @Inject('IContentProcessor') private readonly contentProcessor: IContentProcessor,
    @Inject('RooFileOpsHelper') private readonly rooFileOpsHelper: RooFileOpsHelper
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
      !this.contentProcessor ||
      !this.rooFileOpsHelper
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
        completionResult.error ?? new Error('Unknown error getting roo completion from LLM')
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
        return Result.err(
          strippedContentResult.error ?? new Error('Unknown error stripping markdown')
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
      return Result.ok(strippedContent);
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
   * @param outputPath The path to write the file to.
   * @param content The final content to write.
   * @returns Result containing the path to the written file or an error.
   */
  private async writeRooFile(outputPath: string, content: string): Promise<Result<string, Error>> {
    try {
      this.logger.debug(`Writing generated roo to ${outputPath}`);
      const writeResult = await this.fileOps.writeFile(outputPath, content);
      if (writeResult.isErr()) {
        return Result.err(writeResult.error ?? new Error('Unknown error writing roo file'));
      }
      return Result.ok(outputPath);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error writing roo file';
      const errorInstance = error instanceof Error ? error : new Error(message);
      this.logger.error(`Error in writeRooFile: ${message}`, errorInstance);
      return Result.err(errorInstance);
    }
  }

  private async generateRooContent(
    projectContext: ProjectContext,
    _options: ProjectConfig
  ): Promise<Result<string, Error>> {
    this.logger.info('Generating roo content...');
    try {
      // 1. List and filter mode template files
      const modeFilesResult = await this.rooFileOpsHelper.listAndFilterModeFiles(
        'templates/system-prompts'
      );
      if (modeFilesResult.isErr()) {
        return Result.err(modeFilesResult.error ?? new Error('Failed to list mode files'));
      }

      const modeFiles = modeFilesResult.value;
      if (!modeFiles || modeFiles.length === 0) {
        this.logger.warn('No mode template files found in templates/system-prompts');
        return Result.err(new Error('No mode template files found'));
      }

      this.logger.info(`Found ${modeFiles.length} mode template files`);

      // 2. Read roo-rules.md content once
      const rulesResult = await this.rooFileOpsHelper.readRooRulesFile(
        'templates/system-prompts/roo-rules.md'
      );
      if (rulesResult.isErr()) {
        return Result.err(rulesResult.error ?? new Error('Failed to read roo rules file'));
      }

      const rulesContent = rulesResult.value;
      if (!rulesContent) {
        return Result.err(new Error('Roo rules content is empty'));
      }

      // 3. Process each mode template
      let successfulModes = 0;
      const generatedFiles: string[] = [];

      for (const modeFile of modeFiles) {
        // Extract mode name from filename
        const modeName = modeFile.name.replace('system-prompt-', '').replace('.md', '');
        this.logger.info(`Processing mode: ${modeName}`);

        // Read mode template content
        const templateResult = await this.rooFileOpsHelper.readModeTemplateFile(
          `templates/system-prompts/${modeFile.name}`
        );
        if (templateResult.isErr()) {
          const errorMessage = templateResult.error?.message ?? 'Unknown error';
          this.logger.warn(
            `Failed to read template for mode ${modeName}, skipping: ${errorMessage}`
          );
          continue;
        }

        const templateContent = templateResult.value;
        if (!templateContent) {
          this.logger.warn(`Empty template content for mode ${modeName}, skipping`);
          continue;
        }

        // Build prompts for this mode
        const promptResult = this.buildModeRooPrompt(projectContext, rulesContent, templateContent);
        if (promptResult.isErr()) {
          const errorMessage = promptResult.error?.message ?? 'Unknown error';
          this.logger.warn(
            `Failed to build prompts for mode ${modeName}, skipping: ${errorMessage}`
          );
          continue;
        }

        // Safely access value after error check
        const prompts = promptResult.value;
        if (!prompts) {
          this.logger.warn(`Unexpected undefined prompts for mode ${modeName}, skipping`);
          continue;
        }

        const { systemPrompt, userPrompt } = prompts;

        // 2. Get Completion from LLM
        const completionResult = await this.getRooCompletion(systemPrompt, userPrompt);
        if (completionResult.isErr()) {
          const errorMessage = completionResult.error?.message ?? 'Unknown error';
          this.logger.warn(
            `Failed to get LLM completion for mode ${modeName}, skipping: ${errorMessage}`
          );
          continue; // Continue with next mode file
        }

        const rawContent = completionResult.value;

        // Check if rawContent is defined before processing
        if (rawContent === undefined || rawContent === null || rawContent.trim().length === 0) {
          this.logger.warn(
            `LLM returned empty or null content for mode ${modeName}. Skipping file generation.`
          );
          continue; // Continue with next mode file
        }

        // 3. Process Content
        const processedResult = this.processRooContent(rawContent);
        if (processedResult.isErr()) {
          const errorMessage = processedResult.error?.message ?? 'Unknown error';
          this.logger.warn(
            `Failed to process content for mode ${modeName}, skipping: ${errorMessage}`
          );
          continue; // Continue with next mode file
        }

        const processedLLMRules = processedResult.value;

        // TODO: Implement logic to ensure >= 100 rules (Subtask 5)
        // For now, assume processedLLMRules contains the rules.

        // 4. Concatenate and Write File
        const outputPath = path.join('.roo', `system-prompt-${modeName}`); // Define outputPath here
        const finalContent = `${rulesContent}\n\n${templateContent}\n\n${processedLLMRules}`;

        const writeResult = await this.writeRooFile(outputPath, finalContent); // Modify writeRooFile or create new method
        if (writeResult.isErr()) {
          this.logger.error(
            `Failed to write roo file for mode ${modeName} at ${outputPath}`,
            writeResult.error
          );
          continue; // Continue with next mode file
        }

        this.logger.info(
          `Successfully generated roo file for mode ${modeName} at ${writeResult.value!}`
        );
        generatedFiles.push(writeResult.value!); // Add generated file path to list
        successfulModes++; // Increment successfulModes
      }

      // Update the success message to list generated files
      if (successfulModes > 0) {
        return Result.ok(
          `Successfully generated roo content for ${successfulModes} mode(s):\n${generatedFiles.join('\n')}`
        );
      } else {
        return Result.ok('No roo files were generated as no modes were processed successfully.');
      }
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
   * Builds mode-specific system and user prompts for roo generation.
   * @param projectContext The analyzed project context
   * @param rooRulesContent The content of the roo rules file
   * @param modeTemplateContent The content of the mode-specific template
   * @returns Result containing the system and user prompts or an error
   */
  private buildModeRooPrompt(
    projectContext: ProjectContext,
    rooRulesContent: string,
    modeTemplateContent: string
  ): Result<{ systemPrompt: string; userPrompt: string }, Error> {
    try {
      // Convert project context to string for prompt inclusion
      const contextString = JSON.stringify(projectContext, null, 2);

      // Build system prompt using the existing builder
      const systemPromptResult = this.rulesPromptBuilder.buildSystemPrompt('code');
      if (systemPromptResult.isErr()) {
        return Result.err(
          systemPromptResult.error ??
            new Error('Unknown error building mode-specific system prompt')
        );
      }

      // Build user prompt with specific instructions for mode-based rules
      const instructions = `
Generate at least 100 distinct, context-aware rules that are specific to this mode.
Use the following mode-specific template content as additional context:

${modeTemplateContent}

Also consider these base roo rules as reference for rule structure and format:

${rooRulesContent}`;

      const userPromptResult = this.rulesPromptBuilder.buildPrompt(
        instructions,
        contextString,
        modeTemplateContent
      );

      if (userPromptResult.isErr()) {
        return Result.err(
          userPromptResult.error ?? new Error('Unknown error building mode-specific user prompt')
        );
      }

      const systemPrompt = systemPromptResult.value;
      const userPrompt = userPromptResult.value;

      if (!systemPrompt || !userPrompt) {
        return Result.err(new Error('System or user prompt became undefined unexpectedly.'));
      }

      return Result.ok({ systemPrompt, userPrompt });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error building mode-specific prompts';
      const errorInstance = error instanceof Error ? error : new Error(message);
      this.logger.error(`Error in buildModeRooPrompt: ${message}`, errorInstance);
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
