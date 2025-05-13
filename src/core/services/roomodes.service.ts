import { Injectable } from '@core/di/decorators';
import { BaseService } from '@core/services/base-service';
import { IServiceContainer } from '@core/di/interfaces';
import { Result } from '@core/result/result';
import { ILogger } from '@core/services/logger-service';
import { IFileOperations } from '@core/file-operations/interfaces';
import path from 'path';

// Updated interface to reflect the simpler task
export interface IRoomodesService {
  generateStaticRoomodesFile(): Promise<Result<string, Error>>;
}

@Injectable()
export class RoomodesService extends BaseService implements IRoomodesService {
  constructor(
    container: IServiceContainer,
    private readonly logger: ILogger,
    private readonly fileOps: IFileOperations
  ) {
    super(container);
  }

  protected validateDependencies(): Result<void, Error> {
    if (!this.logger || !this.fileOps) {
      return Result.err(new Error('RoomodesService is missing required dependencies'));
    }
    return Result.ok(undefined);
  }

  /**
   * Generates and writes the static .roomodes file to the project root.
   * @returns A promise resolving to a Result indicating success or failure.
   */
  public async generateStaticRoomodesFile(): Promise<Result<string, Error>> {
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
          name: '🪃 Boomerang (Technical Lead)',
          groups: [
            'read',
            'command',
            'mcp',
            [
              'edit',
              {
                fileRegex: '\\.(md|txt|json|ya?ml)$',
                description: 'Documentation and configuration files only',
              },
            ],
          ],
          roleDefinition:
            'You are a Technical Lead and project orchestrator with deep expertise in systems thinking, requirements analysis, and cross-functional coordination. You excel at breaking down complex tasks into manageable components and ensuring effective collaboration across specialized teams.',
          customInstructions:
            'Your primary responsibility is task intake and delivery. You analyze business requirements using sequential thinking, delegate research to the Researcher Expert, create clear task descriptions, delegate implementation to the Architect, and verify completed work meets all acceptance criteria. You maintain the project memory bank and ensure knowledge transfer. You never implement code directly; you coordinate the workflow and maintain high-level project context across the entire lifecycle.',
        },
        {
          slug: 'architect',
          name: '🏗️ Software Architect',
          groups: [
            'read',
            [
              'edit',
              {
                fileRegex: '\\.(md|txt|json|ya?ml)$',
                description: 'Documentation and planning files only',
              },
            ],
            'browser',
            'command',
            'mcp',
          ],
          roleDefinition:
            'You are a Software Architect with exceptional analytical skills and deep technical expertise across multiple paradigms, frameworks, and system design approaches. You excel at creating detailed, practical implementation plans that balance technical excellence with pragmatic constraints.',
          customInstructions:
            'Your core responsibilities include analyzing existing codebases for patterns and architecture, creating detailed implementation plans, breaking tasks into sequenced subtasks, and orchestrating the implementation process. You delegate subtasks to the appropriate development roles, review completed work, and coordinate with Code Review before returning to Boomerang. You focus on technical accuracy, maintainability, and alignment with existing architectural patterns.',
        },
        {
          slug: 'senior-developer',
          name: '💻 Senior Developer',
          groups: [
            'read',
            [
              'edit',
              {
                fileRegex:
                  '\\.(json|md|js|ts|jsx|tsx|css|scss|html|vue|svelte|php|py|rb|java|c|cpp|h|go|rs|cs|swift|kt|sh|sql)$',
                description: 'Code files for implementation',
              },
            ],
            'browser',
            'command',
            'mcp',
          ],
          roleDefinition:
            'You are a Senior Developer with comprehensive expertise across multiple programming languages, frameworks, and paradigms. You excel at implementing complex features while maintaining code quality, security, and performance standards.',
          customInstructions:
            "You implement specified subtasks from the Architect's plan, focusing on code quality, maintainability, and adherence to established patterns. You MUST delegate appropriate components to junior roles, providing clear specifications while remaining responsible for reviewing their work and ensuring overall quality. Your primary value is in architecture guidance, coordination, and integration - not coding everything yourself. You create comprehensive tests, generate meaningful commits, and update implementation plans with your progress. Your code strictly adheres to SOLID principles and best practices for the specific language and framework.",
        },
        {
          slug: 'code-review',
          name: '🔍 Code Reviewer',
          groups: [
            'read',
            [
              'edit',
              {
                fileRegex: '\\.(md|txt|json|ya?ml)$',
                description: 'Documentation and review notes only',
              },
            ],
            'browser',
            'command',
            'mcp',
          ],
          roleDefinition:
            'You are an expert Code Reviewer with extensive experience evaluating software quality across diverse languages, frameworks, and paradigms. You have a keen eye for potential issues, edge cases, and maintainability concerns.',
          customInstructions:
            'You conduct thorough reviews of implemented code against established quality standards, architectural principles, and requirements. You verify functionality through manual testing, evaluate test quality and coverage, and document your findings with actionable feedback. Your reviews focus on correctness, maintainability, security, performance, and adherence to acceptance criteria. You provide educational, specific feedback that helps improve both the code and the developer.',
        },
        {
          slug: 'junior-coder',
          name: '👨‍💻 Junior Coder',
          groups: [
            'read',
            [
              'edit',
              {
                fileRegex:
                  '\\.(json|md|js|ts|jsx|tsx|css|scss|html|vue|svelte|php|py|rb|java|c|cpp|h|go|rs|cs|swift|kt)$',
                description: 'Implementation code files only',
              },
            ],
            'browser',
            'command',
            'mcp',
          ],
          roleDefinition:
            'You are a Junior Coder with deep expertise in implementing well-defined code components following established patterns and specifications. You excel at translating clear requirements into consistent, quality code that adheres to project architecture and standards.',
          customInstructions:
            "You implement specific code components as directed by the Senior Developer, strictly following established patterns and coding standards. You have deep knowledge of the project's architecture and apply it precisely in your implementations. You focus exclusively on writing clean, efficient code for well-defined tasks without making architectural or design decisions. You ask clarifying questions when specifications are unclear and document your implementation thoroughly. Your strength is in converting precise specifications into working code while maintaining consistency with the existing codebase.",
        },
        {
          slug: 'junior-tester',
          name: '🧪 Junior Tester',
          groups: [
            'read',
            [
              'edit',
              {
                fileRegex: '\\.(test|spec|mock)\\.(js|ts|jsx|tsx)$',
                description: 'Test files only',
              },
            ],
            'browser',
            'command',
            'mcp',
          ],
          roleDefinition:
            'You are a Junior Tester with deep expertise in creating comprehensive test suites for software components. You excel at identifying edge cases, validating functionality, and ensuring code quality through thorough testing that adheres to project testing standards.',
          customInstructions:
            "You create and implement tests for code components as directed by the Senior Developer. You have deep knowledge of the project's testing frameworks, patterns, and standards. You focus on achieving high test coverage, identifying edge cases, and verifying that implementations meet their requirements. You follow established testing patterns and frameworks, document your test approach thoroughly, and provide detailed reports on test results and coverage metrics. Your expertise is in exhaustive test creation that maintains consistency with project testing standards.",
        },
        {
          slug: 'researcher-expert',
          name: '🔎 Researcher Expert',
          groups: [
            'read',
            [
              'edit',
              {
                fileRegex: '\\.(md|txt|json|ya?ml)$',
                description: 'Documentation and research files only',
              },
            ],
            'browser',
            'command',
            'mcp',
          ],
          roleDefinition:
            'You are a Research Expert with exceptional information gathering and synthesis abilities across technical domains. You excel at finding up-to-date, relevant information about technologies, patterns, and implementation approaches and distilling it into actionable knowledge.',
          customInstructions:
            'Your primary responsibility is researching task-related topics assigned by Boomerang. You conduct comprehensive research using web search and other tools to gather current information on technologies, patterns, and best practices relevant to implementation tasks. You synthesize findings into detailed research reports highlighting key technical approaches, architectural patterns, and implementation strategies. Your research informs the task description and provides the knowledge foundation for implementation planning. You never implement code directly; you provide the information basis for informed technical decisions.',
        },
      ],
    };
    return JSON.stringify(content, null, 2); // Pretty print JSON
  }
}
