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
import { IRulesContentProcessor } from './interfaces'; // Import the interface

interface RuleMetadata {
  title: string;
  version: string;
  lastUpdated: string;
  sectionId: string;
  applicableLanguages: string[];
  relatedSections: string[];
}

interface RuleFile {
  filename: string;
  content: string;
  metadata: RuleMetadata;
}

/**
 * @description Generates project-specific coding standards based on tech stack analysis
 */
@Injectable()
export class RulesGenerator extends BaseGenerator<ProjectConfig> {
  readonly name = 'rules';
  private readonly rulesDir = '.roo/rules';

  constructor(
    @Inject('IServiceContainer') protected container: IServiceContainer,
    @Inject('ILogger') private readonly logger: ILogger,
    @Inject('IFileOperations') private readonly fileOps: IFileOperations,
    @Inject('IProjectAnalyzer') private readonly projectAnalyzer: IProjectAnalyzer,
    @Inject('LLMAgent') private readonly llmAgent: LLMAgent,
    @Inject('IRulesContentProcessor') private readonly contentProcessor: IRulesContentProcessor
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
    if (
      !this.fileOps ||
      !this.logger ||
      !this.projectAnalyzer ||
      !this.llmAgent ||
      !this.contentProcessor
    ) {
      return Result.err(new Error(`${this.name} generator is missing required dependencies.`));
    }
    return Result.ok(undefined);
  }

  protected async executeGeneration(
    _config: ProjectConfig,
    contextPaths: string[]
  ): Promise<Result<string, Error>> {
    try {
      this.logger.info('Generating project coding standards...');

      if (!contextPaths?.length) {
        return Result.err(new Error('No context path provided'));
      }

      const contextPath = contextPaths[0];
      const projectContext = await this.analyzeProject([contextPath]);
      if (projectContext.isErr()) {
        return Result.err(projectContext.error as Error);
      }

      // Generate rules content for each section
      const rulesContent = await this.generateRulesContent(projectContext.value as ProjectContext);

      // Create rules directory
      const rulesDir = path.join(contextPath, this.rulesDir);
      await this.fileOps.createDirectory(rulesDir);

      // Write each rule file
      for (const ruleFile of rulesContent) {
        const filePath = path.join(rulesDir, ruleFile.filename);
        // Format content *before* saving (includes frontmatter)
        const fileContent = this.formatRuleContent(ruleFile.metadata, ruleFile.content);

        const saveResult = await this.fileOps.writeFile(filePath, fileContent);
        if (saveResult.isErr()) {
          return Result.err(
            new Error(`Failed to save rule file ${ruleFile.filename}: ${saveResult.error?.message}`)
          );
        }
      }

      // Return summary of generated files
      const summary = this.generateSummary(rulesContent);
      return Result.ok(summary);
    } catch (error: any) {
      return Result.err(new Error(`Rules generation failed: ${error.message}`));
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

  private formatRuleContent(metadata: RuleMetadata, content: string): string {
    const yamlFrontMatter = [
      '---',
      `title: ${metadata.title}`,
      `version: ${metadata.version}`,
      `lastUpdated: ${metadata.lastUpdated}`,
      `sectionId: ${metadata.sectionId}`,
      `applicableLanguages: [${metadata.applicableLanguages.join(', ')}]`,
      `relatedSections: [${metadata.relatedSections.join(', ')}]`,
      '---',
      '',
      content, // Content is already processed before this step
    ].join('\n');

    return yamlFrontMatter;
  }

  private generateSummary(ruleFiles: RuleFile[]): string {
    return [
      '# Generated Rules Summary',
      '',
      'The following rule files have been generated:',
      '',
      ...ruleFiles.map((rule) => `- ${rule.filename}: ${rule.metadata.title}`),
      '',
      `Total files generated: ${ruleFiles.length}`,
    ].join('\n');
  }

  private async generateRulesContent(context: ProjectContext): Promise<RuleFile[]> {
    const ruleFiles: RuleFile[] = [];
    const languages = context.techStack.languages;

    // Define rule sections
    const sections = [
      { id: '1', name: 'code-style-and-formatting' },
      { id: '2', name: 'project-structure' },
      { id: '3', name: 'naming-conventions' },
      { id: '4', name: 'dependency-management' },
      { id: '5', name: 'programming-language-best-practices' },
    ];

    // Generate content for each section using LLM
    for (const section of sections) {
      const filename = `${section.id}-${section.name}.md`;
      const sectionPrompt = this.generateSectionPrompt(section.name, context);

      try {
        const llmResult = await this.llmAgent.getCompletion(sectionPrompt, JSON.stringify(context));

        if (llmResult.isErr() || !llmResult.value?.trim()) {
          this.logger.warn(`LLM generation failed for ${filename}, using template`);
          const content = this.generateTemplateForSection(section.name, context);
          ruleFiles.push(this.createRuleFile(filename, content, section, languages));
          continue;
        }

        // Process the content to strip markdown formatting and optimize for token usage
        let processedContent = llmResult.value;

        // Remove any introduction prefixes like "Okay, here are comprehensive coding rules..."
        processedContent = this.trimIntroduction(processedContent);

        // Use the content processor to strip markdown code block formatting
        const strippedResult = this.contentProcessor.stripMarkdownCodeBlock(processedContent);
        if (strippedResult.isErr()) {
          this.logger.warn(
            `Failed to strip markdown from ${filename}: ${strippedResult.error?.message}`
          );
          // Continue with the content as is if stripping fails
        } else {
          processedContent = strippedResult.value as string;
        }

        // Limit content size to approximately 250 lines
        processedContent = this.limitContentSize(processedContent);

        ruleFiles.push(this.createRuleFile(filename, processedContent, section, languages));
      } catch (error: unknown) {
        const err = error instanceof Error ? error : new Error(String(error));
        this.logger.error(`Error generating content for ${filename}`, err);
        const content = this.generateTemplateForSection(section.name, context);
        ruleFiles.push(this.createRuleFile(filename, content, section, languages));
      }
    }

    return ruleFiles;
  }

  private createRuleFile(
    filename: string,
    content: string,
    section: { id: string; name: string },
    languages: string[]
  ): RuleFile {
    const title = section.name
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return {
      filename,
      content,
      metadata: {
        title,
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        sectionId: section.id,
        applicableLanguages: languages,
        relatedSections: [], // To be populated based on relationships
      },
    };
  }

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
