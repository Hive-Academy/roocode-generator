import path from 'path';
import { z } from 'zod';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
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
import { IRoomodesService } from '@core/services/roomodes.service';

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
    @Inject('RooFileOpsHelper') private readonly rooFileOpsHelper: RooFileOpsHelper,
    @Inject('IRoomodesService') private readonly roomodesService: IRoomodesService
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
      !this.rooFileOpsHelper ||
      !this.roomodesService
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

      const projectContextResult = await this.analyzeProject(contextPaths);
      if (projectContextResult.isErr()) {
        return Result.err(projectContextResult.error ?? new Error('Project analysis failed'));
      }
      const projectContext = projectContextResult.value;
      if (!projectContext) {
        return Result.err(new Error('Project context is undefined after analysis'));
      }

      switch (generatorType) {
        case 'roo': {
          // First generate memory bank content using the shared ProjectContext
          const mbResult = await this.generateMemoryBankContent(projectContext, options);
          if (mbResult.isErr()) {
            // Halt the roo flow if memory bank generation fails
            return Result.err(
              mbResult.error ?? new Error('Unknown error during memory bank generation')
            );
          }

          // Then generate roomodes file
          const roomodesResult = await this.roomodesService.generateStaticRoomodesFile();
          if (roomodesResult.isErr()) {
            return Result.err(
              roomodesResult.error ?? new Error('Unknown error during roomodes generation')
            );
          }

          // Finally, generate roo system prompts using the shared ProjectContext
          return this.generateRooSystemPrompts(projectContext, options);
        }
        case 'cursor':
          // Keep cursor behavior unchanged
          return this.handleCursorGenerationPlaceholder(projectContext, options);
        default: {
          // Handle unknown generator types
          const errorMsg = `Unknown generator type: ${generatorType}`;
          this.logger.error(errorMsg);
          return Result.err(new Error(errorMsg));
        }
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
  private processRooContent(llmOutput: { rules: string[] } | undefined): Result<string, Error> {
    try {
      if (!llmOutput || !llmOutput.rules || !Array.isArray(llmOutput.rules)) {
        const errorMsg =
          'Invalid structured LLM output received in processRooContent. Expected { rules: string[] }.';
        this.logger.error(errorMsg, new Error(errorMsg + ' Payload: ' + JSON.stringify(llmOutput)));
        return Result.err(new Error(errorMsg));
      }

      const rules = llmOutput.rules;

      if (rules.length === 0) {
        this.logger.warn('LLM returned an empty list of rules.');
        // It's not an error to have zero rules if the LLM decided so,
        // the calling function handles the MIN_RULES check and warning.
        // We just return an empty string for the markdown list.
        return Result.ok('');
      }

      // Rule count check is now done in generateRooSystemPrompts after this function returns,
      // based on the length of the `rules` array before formatting.
      // This function's responsibility is to format the provided rules.

      // Convert rules array to a markdown list string
      const formattedRules = rules.map((rule: string) => `- ${rule.trim()}`).join('\n');

      // No need to check if formattedRules is empty because if rules array is not empty,
      // map will produce a non-empty string (even if rules are empty strings, they'll become "- ")
      // and join will work. An empty rules array is handled above.

      return Result.ok(formattedRules);
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

  private async generateRooSystemPrompts(
    projectContext: ProjectContext,
    _options: ProjectConfig
  ): Promise<Result<string, Error>> {
    this.logger.info('Generating mode-aware roo content...'); // More specific logging
    try {
      // 1. List and filter mode template files
      const modeFilesResult = await this.rooFileOpsHelper.listAndFilterModeFiles(
        'templates/system-prompts'
      );
      if (modeFilesResult.isErr()) {
        // Improved error message
        return Result.err(modeFilesResult.error ?? new Error('Failed to list mode template files'));
      }

      const modeFiles = modeFilesResult.value;
      if (!modeFiles || modeFiles.length === 0) {
        this.logger.warn(
          'No mode template files found in templates/system-prompts. No roo files will be generated.'
        ); // More informative warning
        return Result.ok('No mode template files found. No roo files generated.'); // Return OK with informative message
      }

      this.logger.info(`Found ${modeFiles.length} mode template file(s)`); // Updated logging

      // 2. Read roo-rules.md content once
      const rulesResult = await this.rooFileOpsHelper.readRooRulesFile(
        'templates/system-prompts/roo-rules.md'
      );
      if (rulesResult.isErr()) {
        // Improved error message
        return Result.err(
          rulesResult.error ??
            new Error('Failed to read roo rules file. Cannot proceed with roo generation.')
        );
      }

      const rulesContent = rulesResult.value;
      if (!rulesContent || rulesContent.trim().length === 0) {
        // Added trim() check
        // Improved error message
        return Result.err(
          new Error('Roo rules content is empty or undefined. Cannot proceed with roo generation.')
        );
      }

      // 3. Process each mode template
      let successfulModes = 0;
      const generatedFiles: string[] = [];

      for (const modeFile of modeFiles) {
        // Extract mode name from filename
        const modeName = modeFile.name.replace('system-prompt-', '').replace('.md', '');
        this.logger.info(`Processing mode: "${modeName}"`); // Added quotes for clarity
        this.logger.debug(`Reading template file: templates/system-prompts/${modeFile.name}`); // Added debug log

        // Read mode template content
        const templateResult = await this.rooFileOpsHelper.readModeTemplateFile(
          `templates/system-prompts/${modeFile.name}`
        );
        if (templateResult.isErr()) {
          const errorMessage = templateResult.error?.message ?? 'Unknown error';
          this.logger.warn(
            `Failed to read template for mode "${modeName}", skipping: ${errorMessage}` // Added quotes
          );
          continue;
        }

        const templateContent = templateResult.value;
        if (!templateContent || templateContent.trim().length === 0) {
          // Added trim() check
          this.logger.warn(`Empty template content for mode "${modeName}", skipping`); // Added quotes
          continue;
        }

        this.logger.debug(`Successfully read template for mode "${modeName}"`); // Added debug log

        // Build prompts for this mode
        this.logger.debug(`Building prompts for mode "${modeName}"`); // Added debug log
        // Combine rulesContent and templateContent to form the base for both LLM system prompt and final file
        const baseCombinedContent = rulesContent + '\n' + templateContent;

        this.logger.debug(
          `Building structured prompts for mode "${modeName}" using combined base content.`
        );
        // Call buildModeRooPrompt with only projectContext and modeName
        // rulesContent and templateContent are NOT sent to LLM for rule generation
        const structuredPromptResult = this.buildModeRooPrompt(projectContext, modeName);

        if (structuredPromptResult.isErr()) {
          const errorMessage = String(structuredPromptResult.error?.message ?? 'Unknown error');
          this.logger.warn(
            `Failed to build structured prompts for mode "${modeName}", skipping: ${errorMessage}`
          );
          continue;
        }

        const promptsForLLM = structuredPromptResult.value;
        if (!promptsForLLM) {
          this.logger.warn(
            `Unexpected undefined structured prompts value for mode "${modeName}", skipping.`
          );
          continue;
        }
        this.logger.debug(`Structured prompts built successfully for mode "${modeName}"`);

        // 2. Get Structured Completion from LLM
        this.logger.debug(`Requesting LLM structured completion for mode "${modeName}"`);

        const rulesSchema = z
          .object({
            rules: z.array(z.string()).min(1, 'Rules array cannot be empty.'),
          })
          .describe('An object containing a list of generated rules.');

        // Add token margin override for Roo rule generation to handle larger content
        const completionResult = await this.llmAgent.getStructuredCompletion(
          promptsForLLM,
          rulesSchema,
          {
            tokenMarginOverride: 2.0, // Double the available input tokens for Roo rules
          }
        );
        if (completionResult.isErr()) {
          const errorMessage = String(completionResult.error?.message ?? 'Unknown error');
          this.logger.warn(
            `Failed to get LLM completion for mode "${modeName}", skipping: ${errorMessage}`
          );
          continue; // Continue with next mode file
        }

        // completionResult.value will be of type { rules: string[] } | undefined if successful but schema failed or other issues
        if (completionResult.isErr()) {
          // This case should ideally be caught by the check at line 388,
          // but as a safeguard. Explicitly check error existence.
          if (completionResult.error) {
            this.logger.warn(
              `LLM structured completion failed for mode "${modeName}". Detail: ${completionResult.error.message}. Skipping file generation.`
            );
          } else {
            this.logger.warn(
              `LLM structured completion failed for mode "${modeName}" with an undefined error object. Skipping file generation.`
            );
          }
          continue;
        }

        // If we reach here, completionResult.isOk() is true, so completionResult.value should be defined.
        // Now check if the value itself or its 'rules' property is missing/empty.
        if (!completionResult.value || !completionResult.value.rules) {
          this.logger.warn(
            `LLM structured completion returned no 'rules' array or an empty/undefined value for mode "${modeName}". Skipping file generation.`
          );
          continue;
        }

        const llmGeneratedRulesObject = completionResult.value; // Type: { rules: string[] }, definitely defined here due to above check

        if (llmGeneratedRulesObject.rules.length === 0) {
          this.logger.warn(
            `LLM returned an empty rules array for mode "${modeName}". Skipping file generation.`
          );
          continue;
        }
        this.logger.debug(
          `Received ${llmGeneratedRulesObject.rules.length} rules from structured LLM content for mode "${modeName}"`
        );

        // 3. Process Content (now simpler)
        // Pass the llmGeneratedRulesObject which is { rules: string[] }
        this.logger.debug(`Processing structured LLM content for mode "${modeName}"`);
        const processedResult = this.processRooContent(llmGeneratedRulesObject);
        if (processedResult.isErr()) {
          const errorMessage = String(processedResult.error?.message ?? 'Unknown error');
          this.logger.warn(
            `Failed to process content for mode "${modeName}", skipping: ${errorMessage}`
          );
          continue; // Continue with next mode file
        }

        const processedLLMRules = processedResult.value;
        this.logger.debug(`Content processed successfully for mode "${modeName}"`); // Added debug log

        // Check if processedLLMRules is defined before proceeding (already present, good)
        if (
          processedLLMRules === undefined ||
          processedLLMRules === null ||
          processedLLMRules.trim().length === 0
        ) {
          // Added trim() check
          this.logger.warn(
            `Processed LLM rules content is empty, undefined, or null for mode "${modeName}". Skipping rule count verification and file generation.`
          );
          continue; // Continue with next mode file
        }

        // 4. Implement Rule Count Verification
        // This is a placeholder. The actual implementation will depend on the expected format
        // of the LLM-generated rules (e.g., line breaks, numbered list, markdown list).
        // A simple approach is to count lines if each rule is on a new line.
        // Rule count check is now based on the array from the LLM before formatting
        const ruleCount = llmGeneratedRulesObject.rules.length; // Use length of the array from LLM
        const MIN_RULES = 100;

        if (ruleCount < MIN_RULES) {
          this.logger.warn(
            `LLM generated only ${ruleCount} rules for mode "${modeName}". Minimum required is ${MIN_RULES}. Proceeding with available rules.`
          );
        } else {
          this.logger.info(`LLM generated ${ruleCount} rules for mode "${modeName}".`);
        }
        this.logger.debug(`Rule count verification complete for mode "${modeName}"`); // Added debug log

        // 5. Concatenate and Write File
        const outputPath = path.join('.roo', `system-prompt-${modeName}.md`); // Corrected outputPath with .md extension
        // Correctly assemble finalContent: baseCombinedContent + new rules
        const finalContent = baseCombinedContent + '\n\n' + processedLLMRules;
        this.logger.debug(`Writing final content to ${outputPath} for mode "${modeName}"`); // Added debug log

        const writeResult = await this.writeRooFile(outputPath, finalContent); // Modify writeRooFile or create new method
        if (writeResult.isErr()) {
          const errorForLog =
            writeResult.error instanceof Error
              ? writeResult.error
              : new Error(String(writeResult.error));
          this.logger.error(
            `Failed to write roo file for mode "${modeName}" at ${outputPath}`,
            errorForLog
          );
          continue; // Continue with next mode file
        }

        this.logger.info(
          `Successfully generated roo file for mode "${modeName}" at ${String(writeResult.value)}`
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
        // Changed return to Result.err as no files were successfully generated
        return Result.err(
          new Error('No roo files were generated as no modes were processed successfully.')
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown error during roo generation orchestration';
      const errorInstance = error instanceof Error ? error : new Error(message);
      this.logger.error(`Error in generateRooSystemPrompts: ${message}`, errorInstance);
      return Result.err(errorInstance);
    }
  }

  /**
   * Builds mode-specific system and user prompts for roo generation.
   * @param projectContext The analyzed project context
   * @param rooRulesContent The content of the roo rules file
   * @param modeTemplateContent The content of the mode-specific template
   * @param modeName The name of the current mode
   * @returns Result containing the system and user prompts or an error
   */
  private buildModeRooPrompt(
    projectContext: ProjectContext,
    modeName: string
  ): Result<BaseLanguageModelInput, Error> {
    try {
      this.logger.debug(
        'Building structured prompts for LLM rule generation for mode "' + modeName + '".'
      );

      // System prompt is now generic, not including roo-rules or mode-specific template.
      const systemPromptContent =
        'You are an AI assistant. Your task is to generate a list of specific, actionable rules relevant to a software development project and a particular operational mode. Ensure the rules are distinct and follow best practices.';

      const projectContextString = JSON.stringify(projectContext, null, 2);

      // User prompt instructing LLM to generate a JSON object with a "rules" array,
      // based on modeName and projectContext.
      const userPromptContent =
        'For the operational mode "' +
        modeName +
        '", and considering the following project context:\n' +
        '```json\n' +
        projectContextString +
        '\n```\n' +
        'Generate a list of AT LEAST 100 new, distinct, actionable rules. ' +
        "These rules should be tailored to the specified mode and project context. Incorporate principles like KISS (Keep It Simple, Stupid), SOLID, OOP (Object-Oriented Programming), and DRY (Don't Repeat Yourself). " +
        'Your response MUST be a JSON object containing a single key "rules", where the value is an array of strings (each string being a rule). ' +
        'Do not include any introductory text, concluding remarks, or any other content outside this JSON object. Each rule string should be a complete sentence or actionable statement.';

      this.logger.trace(
        'System prompt for LLM (rule generation) for mode "' +
          modeName +
          '": ' +
          systemPromptContent
      );
      this.logger.trace(
        'User prompt for LLM (rule generation) for mode "' +
          modeName +
          '" (first 200 chars of project context): ' +
          userPromptContent.substring(
            0,
            userPromptContent.indexOf(projectContextString) +
              projectContextString.substring(0, 200).length +
              10
          ) +
          '...'
      );

      this.logger.debug('--- LLM System Prompt for Rule Generation ---');
      this.logger.debug(systemPromptContent);
      this.logger.debug('--- End LLM System Prompt for Rule Generation ---');

      this.logger.debug('--- LLM User Prompt for Rule Generation (Full) ---');
      this.logger.debug(userPromptContent);
      this.logger.debug('--- End LLM User Prompt for Rule Generation (Full) ---');

      const messages: BaseLanguageModelInput = [
        new SystemMessage(systemPromptContent),
        new HumanMessage(userPromptContent),
      ];

      return Result.ok(messages);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown error building mode-specific prompts';
      const errorInstance = error instanceof Error ? error : new Error(message);
      this.logger.error(`Error in buildModeRooPrompt: ${message}`, errorInstance);
      return Result.err(errorInstance);
    }
  }

  // Reinstated handleCursorGenerationPlaceholder method
  private handleCursorGenerationPlaceholder(
    _projectContext: ProjectContext,
    _options: ProjectConfig
  ): Result<string, Error> {
    // Basic placeholder implementation
    const message = 'Cursor generation functionality will be implemented in a future task.';
    this.logger.info(message);
    return Result.ok(message);
  }
}
