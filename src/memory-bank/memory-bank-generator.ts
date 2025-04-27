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

  protected validateDependencies(): Result<void, Error> {
    if (
      !this.validator ||
      !this.fileManager ||
      !this.templateManager ||
      !this.contentProcessor ||
      !this.logger ||
      !this.projectConfigService ||
      !this.projectContextService ||
      !this.promptBuilder ||
      !this.llmAgent
    ) {
      return Result.err(new Error('Required dependencies are not initialized'));
    }
    return Result.ok(undefined);
  }

  public async executeGeneration(config: ProjectConfig): Promise<Result<string, Error>> {
    try {
      // Gather project context
      console.log('Gathering project context...', config);
      const contextResult = await this.projectContextService.gatherContext([config.baseDir]);
      if (contextResult.isErr()) {
        return Result.err(
          new Error(
            `Failed to gather project context: ${contextResult.error?.message ?? 'Unknown error'}`
          )
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
        return Result.err(
          new Error(`Memory bank generation failed: ${result.error?.message ?? 'Unknown error'}`)
        );
      }

      return Result.ok('Memory bank generated successfully.');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Error in memory bank generation', err);
      return Result.err(err);
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
        return Result.err(new Error('Failed to resolve IFileOperations'));
      }
      const fileOps = fileOpsResult.value;
      if (!fileOps) {
        return Result.err(new Error('IFileOperations is undefined after resolution'));
      }

      // Create the memory-bank directory and templates subdirectory
      const dirResult = await this.fileManager.createMemoryBankDirectory(
        config.baseDir || process.cwd()
      );
      if (dirResult.isErr()) {
        return Result.err(
          new Error(
            `Failed to create memory-bank directory structure: ${dirResult.error?.message ?? 'Unknown error'}`
          )
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
          return Result.err(templateResult.error ?? new Error('Template content is undefined'));
        }

        const templateValue = templateResult.value || '';

        // Build file-type specific instructions
        const instructions = this.getFileTypeInstructions(fileType);

        // Build the prompt with enhanced context and instructions
        const promptResult = this.promptBuilder.buildPrompt(
          instructions,
          projectContext,
          templateValue
        );
        if (promptResult.isErr()) {
          return Result.err(promptResult.error ?? new Error('Failed to build prompt'));
        }

        // Build system prompt with role-specific context
        const systemPromptResult = this.promptBuilder.buildPrompt(
          this.getSystemPrompt(fileType),
          projectContext,
          templateValue
        );
        if (systemPromptResult.isErr()) {
          return Result.err(systemPromptResult.error ?? new Error('Failed to build system prompt'));
        }

        if (!systemPromptResult.value || !promptResult.value) {
          return Result.err(new Error('Generated prompts are undefined'));
        }

        const llmResponse = await this.llmAgent.getCompletion(
          systemPromptResult.value,
          promptResult.value
        );
        if (llmResponse.isErr()) {
          return Result.err(llmResponse.error ?? new Error('LLM invocation failed'));
        }

        if (!llmResponse.value) {
          return Result.err(new Error('LLM response is undefined'));
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
          return Result.err(processedContentResult.error ?? new Error('Failed to process content'));
        }

        const content = this.contentProcessor.stripMarkdownCodeBlock(
          processedContentResult.value as string
        );
        if (!content) {
          return Result.err(new Error('Processed content is undefined'));
        }

        // Write the generated content
        const outputFilePath = path.join(memoryBankDir, `${String(fileType)}.md`);
        this.logger.debug(`Writing ${String(fileType)} to ${outputFilePath}`);
        const writeResult = await fileOps.writeFile(outputFilePath, content.value as string);

        if (writeResult.isErr()) {
          this.logger.error(
            `Failed to write ${String(fileType)}: ${writeResult.error?.message ?? 'Unknown error'}`
          );
          continue;
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
        this.logger.error(
          `Failed to copy templates: ${copyResult.error?.message ?? 'Unknown error'}`
        );
        // Continue execution even if template copying fails
      } else {
        this.logger.info('Templates copied successfully');
      }

      this.logger.info('Memory bank generation completed');
      return Result.ok(undefined);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Error in memory bank generation', err);
      return Result.err(err);
    }
  }

  async validate(): Promise<Result<void, Error>> {
    await Promise.resolve(this.validateDependencies());
    return Result.ok(undefined);
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
      if (createDirResult.isErr()) {
        return Result.err(
          new Error(
            `Failed to create directory ${destDir}: ${createDirResult.error?.message ?? 'Unknown error'}`
          )
        );
      }

      // Read source directory contents
      const readDirResult = await fileOps.readDir(sourceDir);
      if (readDirResult.isErr()) {
        return Result.err(
          new Error(
            `Failed to read directory ${sourceDir}: ${readDirResult.error?.message ?? 'Unknown error'}`
          )
        );
      }

      const entries = readDirResult.value;
      if (!entries) {
        return Result.err(new Error(`No entries found in directory ${sourceDir}`));
      }

      // Process each entry
      for (const entry of entries) {
        const sourcePath = path.join(sourceDir, entry.name);
        const destPath = path.join(destDir, entry.name);

        // Validate paths before operations
        if (!fileOps.validatePath(sourcePath)) {
          return Result.err(new Error(`Invalid source path: ${sourcePath}`));
        }

        if (!fileOps.validatePath(destPath)) {
          return Result.err(new Error(`Invalid destination path: ${destPath}`));
        }

        if (entry.isDirectory()) {
          // Recursively copy subdirectory
          const copyResult = await this.copyDirectoryRecursive(fileOps, sourcePath, destPath);
          if (copyResult.isErr()) {
            return copyResult;
          }
        } else {
          // Copy file
          const readResult = await fileOps.readFile(sourcePath);
          if (readResult.isErr()) {
            return Result.err(
              new Error(
                `Failed to read file ${sourcePath}: ${readResult.error?.message ?? 'Unknown error'}`
              )
            );
          }

          const content = readResult.value;
          if (!content) {
            return Result.err(new Error(`Empty content for file ${sourcePath}`));
          }

          const writeResult = await fileOps.writeFile(destPath, content);
          if (writeResult.isErr()) {
            return Result.err(
              new Error(
                `Failed to write file ${destPath}: ${writeResult.error?.message ?? 'Unknown error'}`
              )
            );
          }
        }
      }

      return Result.ok(undefined);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Error in memory bank generation', err);
      return Result.err(err);
    }
  }
}
