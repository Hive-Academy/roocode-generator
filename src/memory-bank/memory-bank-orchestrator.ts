import path from 'path';
import { Injectable, Inject } from '../core/di/decorators';
import { Result } from '../core/result/result';
import { ILogger } from '../core/services/logger-service';
import { ProjectConfig } from '../../types/shared';
import {
  IMemoryBankOrchestrator,
  IMemoryBankTemplateProcessor,
  IMemoryBankContentGenerator,
  IMemoryBankFileManager,
  MemoryBankFileType,
  GenerationOptions,
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
   * @param options - Generation options including project context
   * @param config - Project configuration
   * @returns Result indicating success or failure
   */
  async orchestrateGeneration(
    options: GenerationOptions,
    config: ProjectConfig
  ): Promise<Result<void, Error>> {
    const projectContext = options.context || '';
    const errors: { fileType: string; error: Error; phase: string }[] = [];

    try {
      // Create the memory-bank directory structure
      this.logger.info('Creating memory bank directory structure...');
      const dirResult = await this.fileManager.createMemoryBankDirectory(
        config.baseDir || process.cwd()
      );

      if (dirResult.isErr()) {
        return this._handleGenerationError(
          'Failed to create memory-bank directory structure',
          'createMemoryBankDirectory',
          dirResult.error,
          { baseDir: config.baseDir }
        );
      }

      // Generate each memory bank file type
      this.logger.info('Generating memory bank files...');
      const fileTypesToGenerate = Object.values(MemoryBankFileType);
      const memoryBankDir = path.join(config.baseDir || process.cwd(), 'memory-bank');
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
          projectContext,
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

        const outputFilePath = path.join(memoryBankDir, `${String(fileType)}.md`);
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
      }

      // Copy templates directory
      this.logger.info('Copying template files...');
      const sourceTemplatesDir = path.join('templates', 'memory-bank', 'templates');
      const destTemplatesDir = path.join(memoryBankDir, 'templates');

      this.logger.debug(`Copying templates from ${sourceTemplatesDir} to ${destTemplatesDir}`);
      const copyResult = await this.fileManager.copyDirectoryRecursive(
        sourceTemplatesDir,
        destTemplatesDir
      );

      if (copyResult.isErr()) {
        const errorMsg = 'Failed to copy templates';
        this.logger.error(errorMsg, copyResult.error);
        errors.push({
          fileType: 'templates',
          error: copyResult.error || new Error('Unknown template copying error'),
          phase: 'template-copying',
        });
      } else {
        this.logger.info('Templates copied successfully');
      }

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
