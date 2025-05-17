import path from 'path';
import { Injectable, Inject } from '../core/di/decorators';
import { Result } from '../core/result/result';
import { ILogger } from '../core/services/logger-service';
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
import { ProjectConfig } from '@types';

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
    projectContext: ProjectContext,
    config: ProjectConfig
  ): Promise<Result<void, Error>> {
    const resolvedOutputDir: string = config.memoryBank?.outputDir || './memory-bank';
    this.logger.debug(`Resolved memory bank output directory: ${resolvedOutputDir}`);

    const errors: { fileType: string; error: Error; phase: string }[] = [];
    const baseDir = config.baseDir ?? '.';
    try {
      // Create the memory-bank directory structure
      this.logger.info('Creating memory bank directory structure...');
      const dirResult = await this.fileManager.createMemoryBankDirectory(baseDir);

      if (dirResult.isErr()) {
        return this._handleGenerationError(
          'Failed to create memory-bank directory structure',
          'createMemoryBankDirectory',
          dirResult.error || new Error('Unknown directory creation error'),
          { targetDir: resolvedOutputDir }
        );
      }

      // Step 1: Generate LLM-based files
      this.logger.info('Generating LLM-based memory bank files...');
      const dynamicFileTypes = Object.values(MemoryBankFileType);
      let successCount = 0;

      for (const fileType of dynamicFileTypes) {
        const fileTypeStr = String(fileType);
        this.logger.debug(`Generating ${fileTypeStr}...`);

        // Process template and generate content using LLM
        const templateResult = await this.templateProcessor.loadAndProcessTemplate(fileType, {
          projectName: config.name || 'Unnamed Project',
          projectDescription: config.description || 'Project description not available',
        });

        if (templateResult.isErr()) {
          errors.push({
            fileType: fileTypeStr,
            error: templateResult.error || new Error('Unknown template processing error'),
            phase: 'template-processing',
          });
          continue;
        }

        if (!templateResult.value) {
          errors.push({
            fileType: fileTypeStr,
            error: new Error('Template result is undefined'),
            phase: 'template-processing',
          });
          continue;
        }

        const contentResult = await this.contentGenerator.generateContent(
          fileType,
          projectContext,
          templateResult.value
        );

        if (contentResult.isErr()) {
          errors.push({
            fileType: fileTypeStr,
            error: contentResult.error || new Error('Unknown content generation error'),
            phase: 'content-generation',
          });
          continue;
        }

        if (!contentResult.value) {
          errors.push({
            fileType: fileTypeStr,
            error: new Error('Generated content is undefined'),
            phase: 'content-generation',
          });
          continue;
        }

        // Write the generated content
        const outputFilePath = path.join(resolvedOutputDir, `${fileTypeStr}.md`);
        const writeResult = await this.fileManager.writeMemoryBankFile(
          outputFilePath,
          contentResult.value
        );

        if (writeResult.isErr()) {
          errors.push({
            fileType: fileTypeStr,
            error: writeResult.error || new Error('Unknown file writing error'),
            phase: 'file-writing',
          });
          continue;
        }

        successCount++;
        this.logger.info(`Generated ${fileTypeStr} at ${outputFilePath}`);
      }

      // Step 2: Copy static template files (always do this)
      this.logger.info('Copying static template files...');
      const sourceTemplatesDir = path.join('templates', 'memory-bank', 'templates');
      const destTemplatesDir = path.join(resolvedOutputDir, 'templates');

      this.logger.debug(`Copying templates from ${sourceTemplatesDir} to ${destTemplatesDir}`);
      const copyResult = await this.fileManager.copyDirectoryRecursive(
        sourceTemplatesDir,
        destTemplatesDir
      );

      if (copyResult.isErr()) {
        const copyError = new MemoryBankGenerationError(
          'Failed to copy static template files',
          {
            operation: 'copyDirectoryRecursive',
            source: sourceTemplatesDir,
            destination: destTemplatesDir,
          },
          copyResult.error || new Error('Unknown copy error')
        );
        this.logger.error(copyError.message, copyError);
        errors.push({
          fileType: 'static-templates',
          error: copyError,
          phase: 'template-copying',
        });
      } else {
        this.logger.info(
          `Static template files copied successfully from ${sourceTemplatesDir} to ${destTemplatesDir}`
        );
      }

      // Report generation summary
      if (errors.length > 0) {
        const errorSummary = errors
          .map((e) => `${e.fileType} (${e.phase}): ${e.error.message}`)
          .join('\n- ');

        if (successCount === 0) {
          return this._handleGenerationError(
            `Memory bank generation failed with ${errors.length} errors:\n- ${errorSummary}`,
            'orchestrateGeneration',
            new Error(errorSummary),
            {
              errors: errors.map((e) => ({ fileType: e.fileType, phase: e.phase })),
            }
          );
        }

        // Log warnings but continue if at least one file was generated
        this.logger.warn(
          `Memory bank generation completed with ${errors.length} errors:\n- ${errorSummary}`
        );
      }

      return Result.ok(undefined);
    } catch (error) {
      return this._wrapCaughtError(
        'Unexpected error during memory bank generation',
        'orchestrateGeneration',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }
}
