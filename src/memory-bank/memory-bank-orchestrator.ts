import path from 'path';
import { Injectable, Inject } from '../core/di/decorators';
import { Result } from '../core/result/result';
import { ILogger } from '../core/services/logger-service';
import { ProjectConfig } from '../../types/shared';
import { ProjectContext } from '@core/analysis/types'; // Import ProjectContext
import {
  IMemoryBankOrchestrator,
  IMemoryBankTemplateProcessor,
  IMemoryBankContentGenerator,
  IMemoryBankFileManager,
  MemoryBankFileType,
  // GenerationOptions, // Remove GenerationOptions import
} from './interfaces';
import { MemoryBankGenerationError } from '../core/errors/memory-bank-errors';

/**
 * Orchestrates the memory bank generation process
 * Coordinates template processing, content generation, and file operations
 */
@Injectable()
export class MemoryBankOrchestrator implements IMemoryBankOrchestrator {
  constructor(
    @Inject('IMemoryBankTemplateProcessor') private templateProcessor: IMemoryBankTemplateProcessor,
    @Inject('IMemoryBankContentGenerator') private contentGenerator: IMemoryBankContentGenerator,
    @Inject('IMemoryBankFileManager') private fileManager: IMemoryBankFileManager,
    @Inject('ILogger') private logger: ILogger
  ) {}

  // Define the fixed output directory path
  private readonly MEMORY_BANK_OUTPUT_DIR = './memory-bank';

  /**
   * Helper method to create and log generation errors
   */
  private _handleGenerationError(
    message: string,
    operation: string,
    cause?: Error,
    additionalContext?: Record<string, unknown>
  ): Result<never, Error> {
    const error = new MemoryBankGenerationError(
      message,
      { ...additionalContext, operation },
      cause
    );
    this.logger.error(error.message, error);
    return Result.err(error);
  }

  /**
   * Helper method for wrapping errors caught in catch blocks
   */
  private _wrapCaughtError(
    message: string,
    operation: string,
    caughtError: unknown,
    additionalContext?: Record<string, unknown>
  ): Result<never, Error> {
    const cause = caughtError instanceof Error ? caughtError : new Error(String(caughtError));
    return this._handleGenerationError(message, operation, cause, additionalContext);
  }

  /**
   * Orchestrates the generation of memory bank files
   *
   * @param projectContext - Structured project context data
   * @param config - Project configuration (used for project name/desc, template settings)
   * @returns Result indicating success or failure
   */
  async orchestrateGeneration(
    projectContext: ProjectContext, // Update signature to use ProjectContext
    config: ProjectConfig // Keep config for other settings like templates
  ): Promise<Result<void, Error>> {
    // Serialize the structured context into a string for the content generator
    const stringContext = JSON.stringify(projectContext, null, 2);
    const errors: { fileType: string; error: Error; phase: string }[] = [];

    try {
      // Remove check for configurable output directory

      // Create the memory-bank directory structure using the fixed path relative to project root
      this.logger.info('Creating memory bank directory structure...');
      // Pass the project root ('.') as the base directory for file manager
      const dirResult = await this.fileManager.createMemoryBankDirectory('.');

      if (dirResult.isErr()) {
        // Update error context if needed, baseDir might not be relevant anymore
        return this._handleGenerationError(
          'Failed to create memory-bank directory structure',
          'createMemoryBankDirectory',
          dirResult.error,
          { targetDir: this.MEMORY_BANK_OUTPUT_DIR } // Use fixed path in context
        );
      }

      // Generate each memory bank file type
      this.logger.info('Generating memory bank files...');
      const fileTypesToGenerate = Object.values(MemoryBankFileType);
      // Remove the second check for outputDir

      let successCount = 0;

      for (const fileType of fileTypesToGenerate) {
        this.logger.debug(`Generating ${String(fileType)}...`);

        // Step 1: Load and process template
        const templateResult = await this.templateProcessor.loadAndProcessTemplate(fileType, {
          projectName: config.name,
          projectDescription: config.description || 'Project description not available',
        });

        if (templateResult.isErr()) {
          const errorMsg = `Failed to process template for ${String(fileType)}`;
          this.logger.error(errorMsg, templateResult.error);
          errors.push({
            fileType: String(fileType),
            error: templateResult.error || new Error('Unknown template processing error'),
            phase: 'template-processing',
          });
          // Continue to next file type on error
          continue;
        }

        // Step 2: Generate content using LLM
        if (!templateResult.value) {
          const errorMsg = `Template content for ${String(fileType)} is undefined`;
          this.logger.error(errorMsg);
          errors.push({
            fileType: String(fileType),
            error: new Error(errorMsg),
            phase: 'template-validation',
          });
          continue;
        }

        const contentResult = await this.contentGenerator.generateContent(
          fileType,
          stringContext, // Pass the serialized string context
          templateResult.value
        );

        if (contentResult.isErr()) {
          const errorMsg = `Failed to generate content for ${String(fileType)}`;
          this.logger.error(errorMsg, contentResult.error);
          errors.push({
            fileType: String(fileType),
            error: contentResult.error || new Error('Unknown content generation error'),
            phase: 'content-generation',
          });
          // Continue to next file type on error
          continue;
        }

        // Step 3: Write the generated content to file
        if (!contentResult.value) {
          const errorMsg = `Generated content for ${String(fileType)} is undefined`;
          this.logger.error(errorMsg);
          errors.push({
            fileType: String(fileType),
            error: new Error(errorMsg),
            phase: 'content-validation',
          });
          continue;
        }

        // Use the fixed output directory path
        const outputFilePath = path.join(this.MEMORY_BANK_OUTPUT_DIR, `${String(fileType)}.md`);
        this.logger.debug(`Writing ${String(fileType)} to ${outputFilePath}`);

        const writeResult = await this.fileManager.writeMemoryBankFile(
          outputFilePath,
          contentResult.value
        );

        if (writeResult.isErr()) {
          const errorMsg = `Failed to write ${String(fileType)} to file`;
          this.logger.error(errorMsg, writeResult.error);
          errors.push({
            fileType: String(fileType),
            error: writeResult.error || new Error('Unknown file writing error'),
            phase: 'file-writing',
          });
          // Continue to next file type on error
          continue;
        }

        successCount++;
        this.logger.info(`Generated ${String(fileType)} at ${outputFilePath}`);
      } // End of for loop

      // Copy templates directory if enabled
      if (config.memoryBank?.useTemplates) {
        // Added check
        this.logger.info('Copying template files...');
        // Use configured templatesDir, fallback to default
        const sourceTemplatesDir =
          config.memoryBank?.templatesDir || path.join('templates', 'memory-bank', 'templates');
        // Use the fixed output directory path for the destination
        const destTemplatesDir = path.join(this.MEMORY_BANK_OUTPUT_DIR, 'templates');

        this.logger.debug(`Copying templates from ${sourceTemplatesDir} to ${destTemplatesDir}`);
        const copyResult = await this.fileManager.copyDirectoryRecursive(
          sourceTemplatesDir,
          destTemplatesDir
        );

        if (copyResult.isErr()) {
          // Create the specific error first to ensure correct type for the errors array
          const copyError = new MemoryBankGenerationError(
            'Failed to copy templates directory',
            {
              operation: 'copyDirectoryRecursive',
              source: sourceTemplatesDir,
              destination: destTemplatesDir,
            },
            copyResult.error // Pass the original cause
          );
          // Log the error using the logger directly
          this.logger.error(copyError.message, copyError);
          // Add the structured error to the list
          errors.push({
            fileType: 'templates',
            error: copyError, // Use the created error instance
            phase: 'template-copying',
          });
          // The process continues even if template copying fails.
        } else {
          this.logger.info(
            `Templates copied successfully from ${sourceTemplatesDir} to ${destTemplatesDir}`
          );
        }
      } else {
        // Added else block
        this.logger.info('Template copying skipped as useTemplates is false.');
      } // End of if (config.memoryBank?.useTemplates)

      // Report generation summary
      if (errors.length > 0) {
        const errorSummary = errors
          .map((e) => `${e.fileType} (${e.phase}): ${e.error.message}`)
          .join('\n- ');

        // Log errors but continue if at least one file was successfully generated
        if (successCount === 0) {
          return this._handleGenerationError(
            `Memory bank generation failed with ${errors.length} errors:\n- ${errorSummary}`,
            'orchestrateGeneration',
            undefined,
            {
              errors: errors.map((e) => ({ fileType: e.fileType, phase: e.phase })),
              successCount,
              totalCount: fileTypesToGenerate.length,
            }
          );
        } else {
          // Log warning but return success if some files were generated
          this.logger.warn(
            `Memory bank generation completed with ${errors.length} errors, but ${successCount} files were successfully generated:\n- ${errorSummary}`
          );
        }
      }

      this.logger.info('Memory bank generation completed successfully');
      return Result.ok(undefined);
    } catch (error) {
      return this._wrapCaughtError(
        'Unexpected error during memory bank generation',
        'orchestrateGeneration',
        error
      );
    }
  }
}
