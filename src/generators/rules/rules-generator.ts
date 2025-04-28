import { Inject, Injectable } from '../../core/di';
import { IServiceContainer } from '../../core/di/interfaces';
import { BaseGenerator } from '../../core/generators/base-generator';
import { Result } from '../../core/result/result';
import { ILogger } from '../../core/services/logger-service';
import {
  DependencyGraph,
  IProjectAnalyzer,
  ProjectContext,
  ProjectStructure,
  TechStackAnalysis,
} from '../../core/analysis/types';
import { IFileOperations } from '../../core/file-operations/interfaces';
import { LLMAgent } from '../../core/llm/llm-agent';
import path from 'path';
import { ProjectConfig } from '../../../types/shared';
import { IRulesContentProcessor, IRulesFileManager } from './interfaces'; // Import the interfaces

/**
 * @description Generates project-specific coding standards based on tech stack analysis
 */
@Injectable()
export class RulesGenerator extends BaseGenerator<ProjectConfig> {
  readonly name = 'rules';

  constructor(
    @Inject('IServiceContainer') protected container: IServiceContainer,
    @Inject('ILogger') private readonly logger: ILogger,
    @Inject('IFileOperations') private readonly fileOps: IFileOperations, // Keep for createDirectory if needed elsewhere, or remove if truly unused. Let's keep for now.
    @Inject('IProjectAnalyzer') private readonly projectAnalyzer: IProjectAnalyzer,
    @Inject('LLMAgent') private readonly llmAgent: LLMAgent,
    @Inject('IRulesContentProcessor') private readonly contentProcessor: IRulesContentProcessor,
    @Inject('IRulesFileManager') private readonly rulesFileManager: IRulesFileManager // Inject the new file manager
  ) {
    super(container);
    this.logger.debug(`${this.name} initialized`);
  }

  async validate(): Promise<Result<void, Error>> {
    this.logger.debug(`Validating ${this.name} generator...`);
    const dependencyCheck = await Promise.resolve(this.validateDependencies());
    if (dependencyCheck.isErr()) {
      return dependencyCheck;
    }
    return Result.ok(undefined);
  }

  protected validateDependencies(): Result<void, Error> {
    // Update validation to include the new dependency
    // Update validation to include the new dependency
    if (
      !this.fileOps || // Keep check if fileOps is still used
      !this.logger ||
      !this.projectAnalyzer ||
      !this.llmAgent ||
      !this.contentProcessor ||
      !this.rulesFileManager // Add check for the new dependency
    ) {
      return Result.err(new Error(`${this.name} generator is missing required dependencies.`));
    }
    return Result.ok(undefined);
  }

  protected async executeGeneration(
    _config: ProjectConfig,
    contextPaths: string[]
  ): Promise<Result<string, Error>> {
    // Return path on success
    try {
      this.logger.info('Generating project coding standards...');

      if (!contextPaths?.length) {
        return Result.err(new Error('No context path provided for analysis'));
      }

      // Analyze project based on context paths
      const projectContextResult = await this.analyzeProject(contextPaths);
      if (projectContextResult.isErr()) {
        // If analyzeProject failed, map its error to the correct return type, providing a fallback
        return Result.err(
          projectContextResult.error ?? new Error('Unknown error during project analysis')
        );
      }
      // If Ok, value should be ProjectContext, but let's add a check for robustness
      const projectContext = projectContextResult.value;
      if (!projectContext) {
        // This case should logically not happen if isErr() was false, but satisfies TS
        return Result.err(
          new Error('Project context is undefined after successful analysis result.')
        );
      }

      // Generate aggregated rules content
      const aggregatedContentResult = await this.generateRulesContent(projectContext);
      if (aggregatedContentResult.isErr()) {
        // If generateRulesContent failed, return its error Result directly
        return aggregatedContentResult;
      }
      // If Ok, value should be string, but let's add a check
      const aggregatedMarkdownContent = aggregatedContentResult.value;
      if (aggregatedMarkdownContent === undefined || aggregatedMarkdownContent === null) {
        // This case should logically not happen, but satisfies TS
        return Result.err(
          new Error('Aggregated content is undefined after successful generation result.')
        );
      }

      // Define the single output path relative to the project root
      const outputPath = path.join('.roo', 'rules-code', 'rules.md');

      // Save the aggregated content using RulesFileManager
      const saveResult = await this.rulesFileManager.saveRules(
        outputPath,
        aggregatedMarkdownContent
      );

      if (saveResult.isErr()) {
        // If saveRules failed, log the specific error and return the Err result
        const errorMessage = saveResult.error?.message ?? 'Unknown error saving rules file';
        this.logger.error(`Failed to save aggregated rules file: ${errorMessage}`);
        return saveResult; // Return the original Err result
      }

      this.logger.info(`Successfully generated rules file: ${outputPath}`);
      // Return the path of the generated file on success
      return Result.ok(outputPath);
    } catch (error: any) {
      // Ensure an Error object is logged and returned
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Rules generation process failed', err);
      return Result.err(new Error(`Rules generation failed: ${err.message}`));
    }
  }

  protected async analyzeProject(paths: string[]): Promise<Result<ProjectContext, Error>> {
    try {
      const [techStackResult, structureResult, dependenciesResult] = await Promise.all([
        this.projectAnalyzer.analyzeTechStack(paths),
        this.projectAnalyzer.analyzeProjectStructure(paths),
        this.projectAnalyzer.analyzeDependencies(paths),
      ]);

      if (techStackResult.isErr()) {
        return Result.err(techStackResult.error as Error);
      }
      if (structureResult.isErr()) {
        return Result.err(structureResult.error as Error);
      }
      if (dependenciesResult.isErr()) {
        return Result.err(dependenciesResult.error as Error);
      }

      return Result.ok({
        techStack: techStackResult.value as TechStackAnalysis,
        structure: structureResult.value as ProjectStructure,
        dependencies: dependenciesResult.value as DependencyGraph,
      });
    } catch (error: any) {
      return Result.err(new Error(`Project analysis failed: ${error.message}`));
    }
  }

  // Removed formatRuleContent method
  // Removed generateSummary method

  /**
   * Generates aggregated Markdown content for all rule sections.
   * @param context The project context containing tech stack, structure, etc.
   * @returns A Result containing the aggregated Markdown string or an Error.
   */
  private async generateRulesContent(context: ProjectContext): Promise<Result<string, Error>> {
    let aggregatedContent = '';
    // const languages = context.techStack.languages.join(', ') || 'N/A'; // Removed unused variable

    // Define rule sections (consider making this configurable later)
    const sections = [
      { id: '1', name: 'code-style-and-formatting', title: 'Code Style and Formatting' },
      { id: '2', name: 'project-structure', title: 'Project Structure' },
      { id: '3', name: 'naming-conventions', title: 'Naming Conventions' },
      { id: '4', name: 'dependency-management', title: 'Dependency Management' },
      {
        id: '5',
        name: 'programming-language-best-practices',
        title: 'Programming Language Best Practices',
      },
      // Add more sections as needed, e.g., testing, security, documentation
    ];

    this.logger.info(`Generating rules content for ${sections.length} sections...`);

    for (const section of sections) {
      this.logger.debug(`Generating content for section: ${section.title}`);
      const sectionPrompt = this.generateSectionPrompt(section.name, context);
      let sectionContent = '';

      try {
        const llmResult = await this.llmAgent.getCompletion(sectionPrompt, JSON.stringify(context));

        if (llmResult.isOk() && llmResult.value?.trim()) {
          sectionContent = llmResult.value;
          this.logger.debug(`LLM generation successful for ${section.name}`);
        } else {
          // Handle LLM failure or empty response
          // Handle LLM failure or empty response
          let errorMessage = 'Empty response';
          if (llmResult.isErr()) {
            // Check if error exists before accessing message
            errorMessage = llmResult.error?.message ?? 'Unknown LLM error';
          }
          this.logger.warn(
            `LLM generation failed for ${section.name}, using template. Error: ${errorMessage}`
          );
          sectionContent = this.generateTemplateForSection(section.name, context);
        }

        // Process the content (trim intro, strip markdown block, limit size)
        // Ensure sectionContent is a string before processing
        let processedContent = this.trimIntroduction(sectionContent || '');
        // Use type assertion to assure TS that processedContent is a string here
        const strippedResult = this.contentProcessor.stripMarkdownCodeBlock(processedContent);
        if (strippedResult.isOk()) {
          // Value is guaranteed string here
          processedContent = strippedResult.value as string;
        } else {
          // Provide fallback for potentially undefined error message
          const stripErrorMessage = strippedResult.error?.message ?? 'Unknown stripping error';
          this.logger.warn(
            `Failed to strip markdown block from ${section.name}: ${stripErrorMessage}. Using original content.`
          );
        }
        processedContent = this.limitContentSize(processedContent);

        // Format section header
        const sectionHeader = `## ${section.title}\n\n`;
        aggregatedContent += sectionHeader + processedContent + '\n\n'; // Add two newlines for spacing
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.logger.error(`Error processing section ${section.name}`, err);
        // Optionally add a placeholder or skip the section on error
        aggregatedContent += `## ${section.title}\n\nError generating content for this section.\n\n`;
      }
    }

    this.logger.info('Finished generating aggregated rules content.');
    return Result.ok(aggregatedContent.trim()); // Trim trailing newlines
  }

  // Removed createRuleFile method

  private generateSectionPrompt(sectionName: string, context: ProjectContext): string {
    // Updated prompt for conciseness
    return `You are a software development expert. Generate concise, focused coding rules and standards for the "${sectionName}" section.
    
Consider the following project context:
- Tech Stack: ${context.techStack.languages.join(', ')}
- Frameworks: ${context.techStack.frameworks.join(', ')}
- Project Structure: ${JSON.stringify(context.structure, null, 2)}

Generate detailed but concise rules specific to ${sectionName.replace(/-/g, ' ')}.
Format the output in markdown with clear subsections.
Focus on must-have rules only, avoiding verbose explanations.
Use bullet points for clarity and brevity.
Include only essential, shorter code examples where needed.
Keep the total output under 250 lines, focusing on quality over quantity.
DO NOT include introductory text like "Here are comprehensive coding rules...".
DO NOT include trailing markdown closing backticks.`;
  }

  /**
   * Trims common introductory text from LLM responses
   */
  private trimIntroduction(content: string): string {
    // Remove common intro patterns from LLM responses
    return content
      .replace(
        /^Okay,\s+(here|I'll)\s+(are|provide|present|create|generate)\s+comprehensive\s+coding\s+rules\s+and\s+standards.+?(?=#{1,3}\s+)/is,
        ''
      )
      .replace(
        /^Here\s+are\s+comprehensive\s+coding\s+rules\s+and\s+standards.+?(?=#{1,3}\s+)/is,
        ''
      )
      .replace(
        /^I'll\s+provide\s+comprehensive\s+coding\s+rules\s+and\s+standards.+?(?=#{1,3}\s+)/is,
        ''
      )
      .trim();
  }

  /**
   * Limits content to approximately 250 lines while preserving the most important parts
   */
  private limitContentSize(content: string): string {
    const lines = content.split('\n');
    if (lines.length <= 250) {
      return content;
    }

    this.logger.info(`Trimming content from ${lines.length} lines to ~250 lines`);

    // Strategy: Keep important sections but reduce examples and verbose explanations
    const result: string[] = [];
    let inCodeBlock = false;
    let codeBlockLines = 0;
    const MAX_CODE_BLOCK_LINES = 20; // Limit lines in code blocks

    for (let i = 0; i < Math.min(lines.length, 500); i++) {
      // Process at most 500 lines to avoid excessive processing
      const line = lines[i];

      // Always include headers (they're important)
      if (line.match(/^#{1,3}\s+/)) {
        result.push(line);
        continue;
      }

      // Handle code blocks
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;

        if (inCodeBlock) {
          // Starting a code block
          result.push(line);
          codeBlockLines = 0;
        } else {
          // Ending a code block
          result.push(line);
        }
        continue;
      }

      // Inside code blocks
      if (inCodeBlock) {
        if (codeBlockLines < MAX_CODE_BLOCK_LINES) {
          result.push(line);
          codeBlockLines++;
        } else if (codeBlockLines === MAX_CODE_BLOCK_LINES) {
          // Add a truncation notice
          result.push('// ... additional code omitted for brevity ...');
          codeBlockLines++; // Increment so we don't add this message again
        }
        continue;
      }

      // For non-code content, prioritize short lines and bullets
      if (line.trim().startsWith('-') || line.trim().startsWith('*') || line.trim().length < 80) {
        result.push(line);
      } else if (result.length < 240) {
        // Include some longer lines if we're well under the limit
        result.push(line);
      }

      // Stop if we've reached our target
      if (result.length >= 250) {
        break;
      }
    }

    return result.join('\n');
  }

  private generateTemplateForSection(sectionName: string, context: ProjectContext): string {
    // Fallback templates for each section using arrow functions to preserve 'this' context
    const templates: { [key: string]: (context: ProjectContext) => string } = {
      'code-style-and-formatting': () => this.generateCodingStandards(),
      testing: () => this.generateTestingStandards(),
      documentation: () => this.generateDocumentationStandards(),
      security: () => this.generateSecurityGuidelines(),
      // Add other section templates as needed...
    };

    const templateFn =
      templates[sectionName] ||
      (() => `# ${sectionName}\n\nStandard template content for ${sectionName}`);

    return templateFn(context);
  }

  private generateCodingStandards(): string {
    return `## Coding Standards

### Code Style
- Use consistent indentation
- Follow language-specific naming conventions
- Keep functions small and focused
- Use meaningful variable and function names
- Add comments for complex logic

### Code Organization
- Group related functionality
- Use appropriate design patterns
- Keep modules loosely coupled
- Follow SOLID principles
- Maintain clear separation of concerns`;
  }

  private generateTestingStandards(): string {
    return `## Testing Standards

### Test Requirements
- Write unit tests for all new code
- Maintain high test coverage
- Include integration tests
- Test edge cases and error conditions
- Use meaningful test descriptions

### Test Organization
- Mirror source code structure
- Group related tests
- Use appropriate test fixtures
- Mock external dependencies
- Follow arrange-act-assert pattern`;
  }

  private generateDocumentationStandards(): string {
    return `## Documentation Standards

### Code Documentation
- Document public APIs
- Include usage examples
- Explain complex algorithms
- Document configuration options
- Keep documentation up-to-date

### Project Documentation
- Maintain README files
- Document setup process
- Include troubleshooting guides
- Document architecture decisions
- Keep deployment guides current`;
  }

  private generateSecurityGuidelines(): string {
    return `## Security Guidelines

### Best Practices
- Validate all inputs
- Sanitize data outputs
- Use secure dependencies
- Follow security protocols
- Implement proper authentication
- Use secure communication
- Handle sensitive data appropriately
- Regular security updates
- Audit logging
- Error handling without information leakage`;
  }
}
