import path from 'path';

import { BaseGenerator, IGenerator } from '../core/generators/base-generator';
import { Result } from '../core/result/result';
import { IFileOperations } from '../core/file-operations/interfaces';
import { Inject, Injectable } from '../core/di';
import { IServiceContainer } from '../core/di/interfaces';
import { IProjectConfigService } from '../core/config/interfaces';
import { ILogger } from '../core/services/logger-service';

/**
 * Generator responsible for creating the .roomodes file.
 * This file defines the custom modes available for the RooCode workflow.
 */
@Injectable()
export class RoomodesGenerator extends BaseGenerator<string> implements IGenerator<string> {
  /**
   * Unique name of the generator.
   */
  readonly name = 'roomodes';

  // Declare private members to hold injected dependencies
  private readonly fileOps: IFileOperations;
  private readonly logger: ILogger;
  private readonly configService: IProjectConfigService;

  /**
   * Creates an instance of RoomodesGenerator.
   * @param container - The dependency injection container.
   * @param fileOperations - Injected file operations service.
   * @param logger - Injected logger service.
   * @param projectConfigService - Injected project config service.
   */
  constructor(
    @Inject('IServiceContainer') container: IServiceContainer,
    @Inject('IFileOperations') fileOperations: IFileOperations,
    @Inject('ILogger') logger: ILogger,
    @Inject('IProjectConfigService') projectConfigService: IProjectConfigService
  ) {
    super(container);
    // Assign injected dependencies to class members
    this.fileOps = fileOperations;
    this.logger = logger;
    this.configService = projectConfigService;
  }

  /**
   * Validates that required dependencies were injected.
   * Satisfies the abstract requirement from BaseService.
   */
  protected validateDependencies(): Result<void, Error> {
    if (!this.logger || !this.fileOps || !this.configService) {
      return Result.err(new Error('One or more dependencies were not injected correctly.'));
    }
    // Add more specific checks if needed (e.g., check methods exist)
    this.logger.debug('RoomodesGenerator dependencies validated.');
    return Result.ok(undefined);
  }

  /**
   * Validates the requirements for the Roomodes generator.
   * Currently, no specific validation is needed beyond project config loading.
   * @returns A promise resolving to a Result indicating success or failure.
   */
  // Removed async
  validate(): Promise<Result<void, Error>> {
    // Validation now happens in BaseGenerator.generate() -> initialize() -> validateDependencies()
    this.logger.debug('RoomodesGenerator validation step reached.');
    // Specific validation for *this* generator could go here if needed.
    return Promise.resolve(Result.ok(undefined)); // Return resolved promise
  }

  /**
   * Executes the generation of the .roomodes file.
   * Writes a static JSON configuration defining the standard RooCode modes.
   * @returns A promise resolving to a Result indicating success or failure.
   */
  protected async executeGeneration(): Promise<Result<string, Error>> {
    this.logger.info('Generating .roomodes file...');

    // .roomodes file should always be in the project root (workspace directory)
    const outputDir = '.';
    const outputPath = path.join(outputDir, '.roomodes');

    const roomodesContent = this.getRoomodesContent();

    try {
      const writeResult = await this.fileOps.writeFile(outputPath, roomodesContent);
      if (writeResult.isErr()) {
        // Check isErr() before accessing error
        // Ensure error is an Error object before accessing message
        const writeError = writeResult.error; // Extract error first
        const errorMsg = writeError instanceof Error ? writeError.message : String(writeError);
        this.logger.error(
          `Failed to write .roomodes file to ${outputPath}`,
          writeError instanceof Error ? writeError : undefined // Use extracted error
        );
        return Result.err(new Error(`Failed to write .roomodes file: ${errorMsg}`));
      }
      this.logger.info(`.roomodes file successfully generated at ${outputPath}`);
      return Result.ok('.roomodes file generated successfully.');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('An unexpected error occurred during .roomodes generation', err);
      return Result.err(err);
    }
  }

  /**
   * Gets the static content for the .roomodes file.
   * @returns A JSON string representing the .roomodes content.
   */
  private getRoomodesContent(): string {
    const content = {
      customModes: [
        {
          slug: 'boomerang',
          name: 'Boomerang (Technical Lead)',
          groups: ['read', 'browser', 'command', 'mcp'],
          roleDefinition:
            'You are Roo Technical Lead, a strategic workflow orchestrator with advanced expertise in systems thinking, project management, and cross-functional coordination',
          customInstructions:
            "Your unique strength is your comprehensive understanding of each specialized mode's capabilities, limitations, and ideal use cases. This allows you to create efficient, effective workflows by delegating tasks to the most appropriate specialist for each component of a complex problem. You function as both strategist and coordinator, ensuring all pieces work together seamlessly toward the shared goal.",
        },
        {
          slug: 'architect',
          name: 'Software Architect',
          groups: [
            'read',
            [
              'edit',
              {
                fileRegex: '.(md|txt|json|ya?ml)$',
                description: 'Documentation and config files',
              },
            ],
            'browser',
            'command',
            'mcp',
          ],
          roleDefinition:
            'You are Roo Architect , an experienced technical leader who is inquisitive and an excellent planner with deep expertise in software architecture, systems design, and technology strategy.',
          customInstructions:
            "Your goal is to gather information and get context to create a detailed, thoughtful plan for accomplishing the user's task. You think holistically about technical problems, considering not just immediate implementation but long-term maintenance, scalability, and integration with existing systems. The user will review and approve your plan before switching to implementation mode..",
        },
        {
          slug: 'code',
          name: 'Senior Developer',
          groups: ['read', 'edit', 'browser', 'command', 'mcp'],
          roleDefinition:
            'You are Roo Senior Developer, a highly skilled software engineer with expertise spanning multiple programming languages, frameworks, paradigms, and technical domains',
          customInstructions:
            "As a highly skilled and experienced software engineer, you will consistently write clean, type-safe, and maintainable code that strictly adheres to SOLID principles, best practices, and the current project's coding standards. You will prioritize testability and security in all code changes, balancing technical precision with practical flexibility and making pragmatic trade-offs when necessary based on constraints and requirements. Every code change will be meticulously reviewed to ensure full compliance with these guidelines.",
        },
        {
          slug: 'code-review',
          name: 'Code Reviewer',
          groups: [
            'read',
            [
              'edit',
              {
                fileRegex: '.(md|txt|json|ya?ml)$',
                description: 'Documentation and config files',
              },
            ],
            'browser',
            'command',
            'mcp',
          ],
          roleDefinition:
            'You are Roo Code Reviewer, an expert code reviewer with extensive experience evaluating software across diverse languages, frameworks, and paradigms.',
          customInstructions:
            'Your approach to code review is collaborative and improvement-focused, not merely critical. You understand that code review is a learning opportunity for both the author and reviewer. You strive to provide feedback that is specific, actionable, and educational, always explaining the rationale behind your suggestions and prioritizing issues based on their impact.',
        },
      ],
    };
    return JSON.stringify(content, null, 2); // Pretty print JSON
  }
}
