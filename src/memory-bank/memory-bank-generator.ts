import { Injectable, Inject } from '../core/di/decorators';
import path from 'path';
import { IFileOperations } from '../core/file-operations/interfaces';
import {
  IMemoryBankValidator,
  IMemoryBankFileManager,
  IMemoryBankTemplateManager,
  IContentProcessor,
  MemoryBankFileType,
  IProjectContextService,
  IPromptBuilder,
} from './interfaces';
import { ILogger } from '../core/services/logger-service';
import { Result } from '../core/result/result';
import { BaseGenerator, IGenerator } from '../core/generators/base-generator';
import { IProjectConfigService } from '../core/config/interfaces';
import { IServiceContainer } from '../core/di/interfaces';
import { LLMAgent } from '../core/llm/llm-agent';
import { ProjectConfig } from '../../types/shared';
import { ITemplate } from '../core/template-manager/interfaces';
import {
  MemoryBankGenerationError,
  MemoryBankTemplateError,
  MemoryBankFileError,
} from '../core/errors/memory-bank-errors'; // Import new errors

@Injectable()
export class MemoryBankGenerator
  extends BaseGenerator<ProjectConfig>
  implements IGenerator<ProjectConfig>
{
  readonly name = 'memory-bank';

  constructor(
    @Inject('IServiceContainer') protected container: IServiceContainer,
    @Inject('IMemoryBankValidator') private readonly validator: IMemoryBankValidator,
    @Inject('IMemoryBankFileManager') private readonly fileManager: IMemoryBankFileManager,
    @Inject('IMemoryBankTemplateManager')
    private readonly templateManager: IMemoryBankTemplateManager,
    @Inject('IContentProcessor') private readonly contentProcessor: IContentProcessor,
    @Inject('ILogger') private readonly logger: ILogger,
    @Inject('IProjectConfigService') private readonly projectConfigService: IProjectConfigService,
    @Inject('IProjectContextService')
    private readonly projectContextService: IProjectContextService,
    @Inject('IPromptBuilder') private readonly promptBuilder: IPromptBuilder,
    @Inject('LLMAgent')
    private readonly llmAgent: LLMAgent
  ) {
    super(container);
  }

  // Helper for general generation errors
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

  // Helper for file errors originating within this generator (e.g., copy)
  private _wrapFileError(
    message: string,
    filePath: string,
    operation: string,
    caughtError: unknown,
    additionalContext?: Record<string, unknown>
  ): Result<never> {
    const cause = caughtError instanceof Error ? caughtError : new Error(String(caughtError));
    const error = new MemoryBankFileError(
      message,
      filePath,
      { ...additionalContext, operation },
      cause
    );
    this.logger.error(error.message, error);
    return Result.err(error);
  }

  protected validateDependencies(): Result<void, Error> {
    const missing: string[] = [];
    if (!this.validator) missing.push('IMemoryBankValidator');
    if (!this.fileManager) missing.push('IMemoryBankFileManager');
    if (!this.templateManager) missing.push('IMemoryBankTemplateManager');
    if (!this.contentProcessor) missing.push('IContentProcessor');
    if (!this.logger) missing.push('ILogger');
    if (!this.projectConfigService) missing.push('IProjectConfigService');
    if (!this.projectContextService) missing.push('IProjectContextService');
    if (!this.promptBuilder) missing.push('IPromptBuilder');
    if (!this.llmAgent) missing.push('LLMAgent');

    if (missing.length > 0) {
      // Use MemoryBankGenerationError for dependency issues
      return Result.err(
        new MemoryBankGenerationError('Required dependencies are not initialized', {
          operation: 'validateDependencies',
          missingDependencies: missing,
        })
      );
    }
    return Result.ok(undefined);
  }

  public async executeGeneration(config: ProjectConfig): Promise<Result<string, Error>> {
    try {
      // Validate dependencies first
      const depValidationResult = this.validateDependencies();
      if (depValidationResult.isErr()) {
        // Error is already MemoryBankGenerationError, return its error payload
        // wrapped in a new Result matching the expected signature.
        return Result.err(depValidationResult.error as Error);
      }

      // Gather project context
      this.logger.info('Gathering project context...');
      const contextResult = await this.projectContextService.gatherContext([config.baseDir]);
      if (contextResult.isErr()) {
        // Wrap context error as GenerationError
        return this._wrapGenerationError(
          'Failed to gather project context',
          'gatherContext',
          contextResult.error,
          { baseDir: config.baseDir }
        );
      }

      // Call the MemoryBankGenerator to generate all memory bank files
      const result = await this.generateMemoryBankSuite(
        {
          context: contextResult.value,
        },
        config
      );

      if (result.isErr()) {
        // Wrap suite generation error as GenerationError
        // Check if it's already a MemoryBankError to avoid double wrapping
        if (
          result.error instanceof MemoryBankGenerationError ||
          result.error instanceof MemoryBankTemplateError ||
          result.error instanceof MemoryBankFileError
        ) {
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
      // Wrap unexpected errors as GenerationError
      return this._wrapGenerationError(
        'Unexpected error during memory bank execution',
        'executeGenerationCatch',
        error
      );
    }
  }

  public async generateMemoryBankSuite(
    options: {
      context?: string;
    },
    config: ProjectConfig
  ): Promise<Result<void, Error>> {
    const projectContext = options.context || '';
    try {
      // Get file operations service
      const fileOpsResult = this.container.resolve<IFileOperations>('IFileOperations');
      if (fileOpsResult.isErr()) {
        // Wrap dependency resolution error as GenerationError
        return this._wrapGenerationError(
          'Failed to resolve IFileOperations',
          'resolveDependency',
          fileOpsResult.error,
          { dependency: 'IFileOperations' }
        );
      }
      const fileOps = fileOpsResult.value;
      if (!fileOps) {
        // Use GenerationError for undefined dependency
        return Result.err(
          new MemoryBankGenerationError('IFileOperations is undefined after resolution', {
            operation: 'resolveDependency',
            dependency: 'IFileOperations',
          })
        );
      }

      // Create the memory-bank directory and templates subdirectory
      const dirResult = await this.fileManager.createMemoryBankDirectory(
        config.baseDir || process.cwd()
      );
      if (dirResult.isErr()) {
        // Wrap file manager error as GenerationError (halting setup step)
        return this._wrapGenerationError(
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

      for (const fileType of fileTypesToGenerate) {
        // Generate content
        this.logger.debug(`Generating ${String(fileType)}...`);
        const templateResult = await this.templateManager.loadTemplate(fileType);
        if (templateResult.isErr()) {
          // Use MemoryBankTemplateError directly
          const error = new MemoryBankTemplateError(
            'Failed to load template',
            String(fileType),
            { operation: 'loadTemplate' },
            templateResult.error
          );
          this.logger.error(error.message, error);
          return Result.err(error);
        }

        // Process the template to get its content
        const template = templateResult.value as ITemplate;
        const processResult = template.process({});
        if (processResult.isErr()) {
          // Use MemoryBankTemplateError directly
          const error = new MemoryBankTemplateError(
            'Failed to process template content',
            String(fileType),
            { operation: 'processTemplateContent' },
            processResult.error
          );
          this.logger.error(error.message, error);
          return Result.err(error);
        }

        const templateContent = processResult.value || '';

        // Build file-type specific instructions
        const instructions = this.getFileTypeInstructions(fileType);

        // Build the prompt with enhanced context and instructions
        const promptResult = this.promptBuilder.buildPrompt(
          instructions,
          projectContext,
          templateContent
        );
        if (promptResult.isErr()) {
          // Wrap prompt building error as GenerationError
          return this._wrapGenerationError(
            'Failed to build prompt',
            'buildPrompt',
            promptResult.error,
            { fileType: String(fileType) }
          );
        }

        // Build system prompt with role-specific context
        const systemPromptResult = this.promptBuilder.buildPrompt(
          this.getSystemPrompt(fileType),
          projectContext,
          templateContent
        );
        if (systemPromptResult.isErr()) {
          // Wrap system prompt building error as GenerationError
          return this._wrapGenerationError(
            'Failed to build system prompt',
            'buildSystemPrompt',
            systemPromptResult.error,
            { fileType: String(fileType) }
          );
        }

        if (!systemPromptResult.value || !promptResult.value) {
          // Use GenerationError for undefined prompts
          return Result.err(
            new MemoryBankGenerationError('Generated prompts are undefined', {
              operation: 'checkPrompts',
              fileType: String(fileType),
            })
          );
        }

        const llmResponse = await this.llmAgent.getCompletion(
          systemPromptResult.value,
          promptResult.value
        );
        if (llmResponse.isErr()) {
          // Wrap LLM error as GenerationError
          return this._wrapGenerationError(
            'LLM invocation failed',
            'llmGetCompletion',
            llmResponse.error,
            { fileType: String(fileType) }
          );
        }

        if (!llmResponse.value) {
          // Use GenerationError for undefined LLM response
          return Result.err(
            new MemoryBankGenerationError('LLM response is undefined', {
              operation: 'checkLlmResponse',
              fileType: String(fileType),
            })
          );
        }

        // Process the template with enhanced metadata
        const processedContentResult = await this.contentProcessor.processTemplate(
          llmResponse.value,
          {
            fileType: String(fileType),
            projectName: config.name ?? 'Unknown Project',
            projectContext: projectContext,
            taskId: this.generateTaskId(),
            taskName: `Generate ${String(fileType)}`,
            implementationSummary: `Generated ${String(fileType)} based on project context`,
            currentDate: new Date().toISOString().split('T')[0],
          }
        );
        if (processedContentResult.isErr()) {
          // Wrap content processor error as GenerationError
          return this._wrapGenerationError(
            'Failed to process LLM response content',
            'processLlmResponse',
            processedContentResult.error,
            { fileType: String(fileType) }
          );
        }

        const contentResult = this.contentProcessor.stripMarkdownCodeBlock(
          processedContentResult.value as string
        );
        if (contentResult.isErr()) {
          // Wrap content processor error as GenerationError
          return this._wrapGenerationError(
            'Failed to strip markdown from processed content',
            'stripMarkdown',
            contentResult.error,
            { fileType: String(fileType) }
          );
        }
        if (!contentResult.value) {
          // Use GenerationError for undefined content after stripping
          return Result.err(
            new MemoryBankGenerationError(
              'Processed content is undefined after stripping markdown',
              {
                operation: 'checkStrippedContent',
                fileType: String(fileType),
              }
            )
          );
        }

        // Write the generated content
        const outputFilePath = path.join(memoryBankDir, `${String(fileType)}.md`);
        this.logger.debug(`Writing ${String(fileType)} to ${outputFilePath}`);
        const writeResult = await fileOps.writeFile(outputFilePath, contentResult.value);

        if (writeResult.isErr()) {
          // Use MemoryBankFileError, log, and continue loop
          const fileError = new MemoryBankFileError(
            `Failed to write ${String(fileType)}`,
            outputFilePath,
            { operation: 'writeFileLoop' },
            writeResult.error
          );
          this.logger.error(fileError.message, fileError);
          continue; // Skip to the next file type on write error
        }

        this.logger.info(`Generated ${String(fileType)} at ${outputFilePath}`);
      }

      // Copy templates directory
      this.logger.info('Copying template files...');
      const sourceTemplatesDir = path.join('templates', 'memory-bank', 'templates');
      const destTemplatesDir = path.join(memoryBankDir, 'templates');

      this.logger.debug(`Copying templates from ${sourceTemplatesDir} to ${destTemplatesDir}`);
      const copyResult = await this.copyDirectoryRecursive(
        fileOps,
        sourceTemplatesDir,
        destTemplatesDir
      );
      if (copyResult.isErr()) {
        // Use MemoryBankFileError, log, but allow completion
        const copyError = new MemoryBankFileError(
          `Failed to copy templates`,
          sourceTemplatesDir,
          { operation: 'copyTemplates', destination: destTemplatesDir },
          copyResult.error
        );
        this.logger.error(copyError.message, copyError);
        // Continue execution even if template copying fails
      } else {
        this.logger.info('Templates copied successfully');
      }

      this.logger.info('Memory bank generation completed');
      return Result.ok(undefined);
    } catch (error) {
      // Wrap unexpected errors as GenerationError
      return this._wrapGenerationError(
        'Unexpected error during memory bank suite generation',
        'generateMemoryBankSuiteCatch',
        error
      );
    }
  }

  async validate(): Promise<Result<void, Error>> {
    const result = this.validateDependencies();
    await Promise.resolve(); // Keep async nature if needed later
    // Return the result from validateDependencies (which is already MemoryBankGenerationError on failure)
    return result;
  }

  private getFileTypeInstructions(fileType: MemoryBankFileType): string {
    const baseInstructions = `Generate content for the ${String(fileType)} memory bank file based on the project context and template.`;

    switch (fileType) {
      case MemoryBankFileType.ProjectOverview:
        return `${baseInstructions} Focus on the project's purpose, goals, and high-level features. Include key stakeholders, timeline, and success criteria.`;

      case MemoryBankFileType.TechnicalArchitecture:
        return `${baseInstructions} Detail the system's components, their interactions, data flow, and key technical decisions. Include diagrams and rationale for architectural choices.`;

      case MemoryBankFileType.DeveloperGuide:
        return `${baseInstructions} Provide comprehensive setup instructions, coding standards, workflow processes, and best practices. Include troubleshooting guides and common pitfalls.`;

      default:
        return baseInstructions;
    }
  }

  private getSystemPrompt(fileType: MemoryBankFileType): string {
    const basePrompt =
      'You are Roo Architect, an experienced technical leader with expertise in software architecture and documentation.';

    switch (fileType) {
      case MemoryBankFileType.ProjectOverview:
        return `${basePrompt} Your task is to analyze project context and create a clear, comprehensive project overview that helps team members understand the project's scope and objectives.`;

      case MemoryBankFileType.TechnicalArchitecture:
        return `${basePrompt} Your task is to design and document a robust technical architecture that addresses the project's requirements and constraints while maintaining flexibility and scalability.`;

      case MemoryBankFileType.DeveloperGuide:
        return `${basePrompt} Your task is to create a detailed developer guide that enables team members to quickly understand and contribute to the project while maintaining consistency and quality.`;

      default:
        return basePrompt;
    }
  }

  private generateTaskId(): string {
    return `task-${Date.now().toString(36)}`;
  }

  /**
   * Recursively copies a directory from source to destination.
   * @param fileOps - File operations service
   * @param sourceDir - Source directory path
   * @param destDir - Destination directory path
   * @returns A Result indicating success or failure
   */
  private async copyDirectoryRecursive(
    fileOps: IFileOperations,
    sourceDir: string,
    destDir: string
  ): Promise<Result<void, Error>> {
    try {
      // Create destination directory if it doesn't exist
      const createDirResult = await fileOps.createDirectory(destDir);
      // Ignore EEXIST, wrap other errors as FileError
      if (createDirResult.isErr() && !createDirResult.error?.message.includes('EEXIST')) {
        return this._wrapFileError(
          `Failed to create directory`,
          destDir,
          'copyRecursiveCreateDir',
          createDirResult.error
        );
      }

      // Read source directory contents
      const readDirResult = await fileOps.readDir(sourceDir);
      if (readDirResult.isErr()) {
        // Wrap readDir error as FileError
        return this._wrapFileError(
          `Failed to read directory`,
          sourceDir,
          'copyRecursiveReadDir',
          readDirResult.error
        );
      }

      const entries = readDirResult.value;
      if (!entries) {
        // Use FileError for missing entries
        return Result.err(
          new MemoryBankFileError(`No entries found in directory`, sourceDir, {
            operation: 'copyRecursiveCheckEntries',
          })
        );
      }

      // Process each entry
      for (const entry of entries) {
        const sourcePath = path.join(sourceDir, entry.name);
        const destPath = path.join(destDir, entry.name);

        // Validate paths before operations
        if (!fileOps.validatePath(sourcePath)) {
          // Use FileError for invalid path
          return Result.err(
            new MemoryBankFileError(`Invalid source path`, sourcePath, {
              operation: 'copyRecursiveValidateSource',
            })
          );
        }

        if (!fileOps.validatePath(destPath)) {
          // Use FileError for invalid path
          return Result.err(
            new MemoryBankFileError(`Invalid destination path`, destPath, {
              operation: 'copyRecursiveValidateDest',
            })
          );
        }

        if (entry.isDirectory()) {
          // Recursively copy subdirectory
          const copyResult = await this.copyDirectoryRecursive(fileOps, sourcePath, destPath);
          if (copyResult.isErr()) {
            // Error is already wrapped FileError from deeper call, just return it
            return copyResult;
          }
        } else {
          // Copy file
          const readResult = await fileOps.readFile(sourcePath);
          if (readResult.isErr()) {
            // Wrap readFile error as FileError
            return this._wrapFileError(
              `Failed to read file`,
              sourcePath,
              'copyRecursiveReadFile',
              readResult.error
            );
          }

          const content = readResult.value;
          // Check for undefined or null explicitly
          if (content === undefined || content === null) {
            // Use FileError for empty/undefined content
            return Result.err(
              new MemoryBankFileError(`Empty or undefined content for file`, sourcePath, {
                operation: 'copyRecursiveCheckContent',
              })
            );
          }

          const writeResult = await fileOps.writeFile(destPath, content);
          if (writeResult.isErr()) {
            // Wrap writeFile error as FileError
            return this._wrapFileError(
              `Failed to write file`,
              destPath,
              'copyRecursiveWriteFile',
              writeResult.error
            );
          }
        }
      }

      return Result.ok(undefined);
    } catch (error) {
      // Wrap unexpected errors in copy as FileError
      return this._wrapFileError(
        `Unexpected error during directory copy`,
        sourceDir, // Use sourceDir as context path
        'copyRecursiveCatch',
        error,
        { destination: destDir }
      );
    }
  }
}
