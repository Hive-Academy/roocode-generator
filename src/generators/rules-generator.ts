import { IProjectConfigService } from "../core/config/interfaces";
import { Inject, Injectable } from "../core/di";
import { IServiceContainer } from "../core/di/interfaces";
import { BaseGenerator } from "../core/generators/base-generator";
import { Result } from "../core/result/result";
import { ILogger } from "../core/services/logger-service";
import {
  DependencyGraph,
  IProjectAnalyzer,
  ProjectContext,
  ProjectStructure,
  TechStackAnalysis,
} from "../core/analysis/types";
import { IFileOperations } from "../core/file-operations/interfaces";
import {
  GeneratedRules,
  IRulesFileManager,
  MultiModeRulesConfig,
  RulesConfig,
  RulesMetadata,
} from "./rules/interfaces";
import { LLMAgent } from "../core/llm/llm-agent";

type ModeConfig = Omit<MultiModeRulesConfig, "modes"> & { mode: string };

/**
 * @description Generates mode-specific rules based on project analysis and configuration
 */
@Injectable()
export class RulesGenerator extends BaseGenerator<RulesConfig> {
  readonly name = "rules";

  constructor(
    @Inject("IServiceContainer") protected container: IServiceContainer,
    @Inject("ILogger") private readonly logger: ILogger,
    @Inject("IProjectConfigService") private readonly projectConfigService: IProjectConfigService,
    @Inject("IFileOperations") private readonly fileOperations: IFileOperations,
    @Inject("IProjectAnalyzer") private readonly projectAnalyzer: IProjectAnalyzer,
    @Inject("IRulesFileManager") private readonly fileManager: IRulesFileManager,
    @Inject("LLMAgent") private readonly llmAgent: LLMAgent
  ) {
    super(container);
    this.logger.debug(`${this.name} initialized`);
  }

  public async generateRulesForModes(
    config: MultiModeRulesConfig
  ): Promise<Result<Map<string, GeneratedRules>, Error>> {
    this.logger.info("Starting multi-mode rules generation");

    try {
      const results = new Map<string, GeneratedRules>();
      const modes = config.modes || ["architect", "boomerang", "code", "code_review"];

      for (const mode of modes) {
        this.logger.debug(`Processing mode: ${mode}`);

        const modeConfig: ModeConfig = {
          ...config,
          mode,
        };

        const generationResult = await this.executeGeneration(modeConfig);
        if (generationResult.isErr()) {
          return Result.err(
            new Error(
              `Failed to generate rules for mode ${mode}: ${generationResult.error?.message}`
            )
          );
        }

        const generatedContent = generationResult.value as string;
        const projectAnalysis = await this.analyzeProject(config.contextPaths);
        if (projectAnalysis.isErr()) {
          return Result.err(
            new Error(
              `Failed to analyze project for mode ${mode}: ${projectAnalysis.error?.message}`
            )
          );
        }

        const generatedRules = this.createGeneratedRules(
          mode,
          generatedContent,
          modeConfig,
          projectAnalysis.value as ProjectContext
        );

        const saveResult = await this.fileManager.saveRules(generatedRules);
        if (saveResult.isErr()) {
          return Result.err(
            new Error(`Failed to save rules for mode ${mode}: ${saveResult.error?.message}`)
          );
        }

        results.set(mode, generatedRules);
        this.logger.debug(`Successfully generated and saved rules for mode: ${mode}`);
      }

      this.logger.info(`Successfully generated rules for all ${modes.length} modes`);
      return Result.ok(results);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("Unexpected error during multi-mode generation:", err);
      return Result.err(new Error(`Multi-mode generation failed: ${err.message}`));
    }
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
    if (
      !this.fileOperations ||
      !this.logger ||
      !this.projectAnalyzer ||
      !this.fileManager ||
      !this.projectConfigService ||
      !this.llmAgent
    ) {
      return Result.err(new Error(`${this.name} generator is missing required dependencies.`));
    }
    return Result.ok(undefined);
  }

  protected async analyzeProject(paths: string[]): Promise<Result<ProjectContext, Error>> {
    this.logger.info(`Analyzing project context for paths: ${paths.join(", ")}`);
    try {
      const [techStackResult, structureResult, dependenciesResult] = await Promise.all([
        this.projectAnalyzer.analyzeTechStack(paths),
        this.projectAnalyzer.analyzeProjectStructure(paths),
        this.projectAnalyzer.analyzeDependencies(paths),
      ]);

      if (techStackResult.isErr()) {
        return Result.err(
          new Error(`Tech stack analysis failed: ${techStackResult.error?.message}`)
        );
      }
      if (structureResult.isErr()) {
        return Result.err(
          new Error(`Project structure analysis failed: ${structureResult.error?.message}`)
        );
      }
      if (dependenciesResult.isErr()) {
        return Result.err(
          new Error(`Dependency analysis failed: ${dependenciesResult.error?.message}`)
        );
      }

      const projectContext: ProjectContext = {
        techStack: techStackResult.value as TechStackAnalysis,
        structure: structureResult.value as ProjectStructure,
        dependencies: dependenciesResult.value as DependencyGraph,
      };

      return Result.ok(projectContext);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return Result.err(new Error(`Project analysis failed: ${err.message}`));
    }
  }

  protected async executeGeneration(
    config: ModeConfig,
    _contextPaths?: string[]
  ): Promise<Result<string, Error>> {
    this.logger.info(`Generating rules for mode: ${config.mode}`);

    const configValidation = this.validateConfig(config);
    if (configValidation.isErr()) {
      return Result.err(new Error(configValidation.error?.message || "Invalid configuration"));
    }

    const projectContextResult = await this.analyzeProject(config.contextPaths);
    if (projectContextResult.isErr()) {
      return Result.err(
        new Error(projectContextResult.error?.message || "Project analysis failed")
      );
    }

    const projectContext = projectContextResult.value as ProjectContext;

    // Generate rules using LLM
    const systemPrompt = `You are a software development workflow expert. Generate comprehensive rules for the ${config.mode} mode.
    Consider the following project context:
    - Tech Stack: ${projectContext.techStack.languages.join(", ")}
    - Frameworks: ${projectContext.techStack.frameworks.join(", ")}
    - Project Structure: ${JSON.stringify(projectContext.structure, null, 2)}
    - Dependencies: ${JSON.stringify(projectContext.dependencies, null, 2)}

    Generate detailed rules that cover:
    1. Role responsibilities and expectations
    2. Technical requirements and standards
    3. Workflow position and interactions with other modes
    4. Integration guidelines and handoff procedures
    5. Error handling and troubleshooting procedures
    6. Best practices specific to the tech stack
    7. Code quality standards and review criteria
    8. Documentation requirements
    9. Testing requirements and coverage expectations
    10. Security considerations and practices

    Format the output in markdown with clear sections and examples.
    Include specific guidelines based on the project's tech stack and architecture.`;

    const userPrompt = JSON.stringify(
      {
        mode: config.mode,
        analysisDepth: config.options?.analysisDepth || "detailed",
        includeExamples: config.options?.includeExamples || true,
        context: {
          techStack: projectContext.techStack,
          structure: projectContext.structure,
          dependencies: projectContext.dependencies,
        },
      },
      null,
      2
    );

    try {
      const llmResult = await this.llmAgent.getCompletion(systemPrompt, userPrompt);
      if (llmResult.isErr()) {
        this.logger.warn(
          `LLM generation failed: ${llmResult.error?.message}, falling back to template-based generation`
        );
        return Result.ok(this.generateRulesContent(config.mode, projectContext));
      }

      if (!llmResult.value?.trim()) {
        this.logger.warn("LLM returned empty response, falling back to template-based generation");
        return Result.ok(this.generateRulesContent(config.mode, projectContext));
      }

      // Add header and metadata
      const header = this.generateModeHeader(config.mode);
      const content = `${header}\n\n${llmResult.value}`;

      return Result.ok(content);
    } catch (error) {
      this.logger.error(
        `Error during LLM generation: ${error instanceof Error ? error.message : String(error)}`
      );
      return Result.ok(this.generateRulesContent(config.mode, projectContext));
    }
  }

  private generateRulesContent(mode: string, context: ProjectContext): string {
    const sections = [];

    sections.push(this.generateModeHeader(mode));
    sections.push(this.generateRoleOverview(mode));
    sections.push(this.generateWorkflowPosition(mode));
    sections.push(this.generateTechnicalRequirements(context));
    sections.push(this.generateResponsibilities(mode));
    sections.push(this.generateIntegrationGuidelines(mode, context));
    sections.push(this.generateErrorHandling());

    return sections.join("\n\n");
  }

  private generateModeHeader(mode: string): string {
    return `# ${this.getModeTitle(mode)} Guide\n\nVersion: 1.0.0\nLast Updated: ${new Date().toISOString()}`;
  }

  private generateRoleOverview(mode: string): string {
    const overviews: Record<string, string> = {
      architect: "Responsible for system design, technical planning, and architectural decisions",
      boomerang: "Orchestrates task workflow, delegates subtasks, and ensures integration",
      code: "Implements solutions, writes tests, and maintains code quality",
      code_review: "Reviews code, ensures standards compliance, and validates implementations",
    };

    return `## Role Overview\n\n${overviews[mode] || "Role overview not specified"}`;
  }

  private generateWorkflowPosition(mode: string): string {
    return `## Workflow Position\n\n\`\`\`mermaid
graph TD
    A[Boomerang: Task Intake] --> B[Architect: Planning]
    B --> C[Code: Implementation]
    C --> D[Code Review: Quality Assurance]
    D --> E[Boomerang: Integration]

    style ${this.getWorkflowHighlight(mode)} fill:#92d050,stroke:#333,stroke-width:2px
\`\`\``;
  }

  private generateTechnicalRequirements(context: ProjectContext): string {
    const { techStack, structure } = context;

    return `## Technical Requirements

### Languages
${techStack.languages.map((lang) => `- ${lang}`).join("\n")}

### Frameworks
${techStack.frameworks.map((framework) => `- ${framework}`).join("\n")}

### Project Structure
- Source Directory: ${structure.sourceDir}
- Test Directory: ${structure.testDir}
- Configuration Files: ${structure.configFiles.join(", ")}`;
  }

  private generateResponsibilities(mode: string): string {
    const responsibilities: Record<string, string[]> = {
      architect: [
        "Design system architecture",
        "Make technical decisions",
        "Plan implementation approach",
        "Define interfaces and contracts",
      ],
      boomerang: ["Break down tasks", "Delegate subtasks", "Track progress", "Ensure integration"],
      code: ["Implement solutions", "Write tests", "Document code", "Follow best practices"],
      code_review: [
        "Review code quality",
        "Verify test coverage",
        "Validate implementations",
        "Ensure standards compliance",
      ],
    };

    return `## Responsibilities\n\n${responsibilities[mode]?.map((r) => `- ${r}`).join("\n") || ""}`;
  }

  private generateIntegrationGuidelines(mode: string, context: ProjectContext): string {
    return `## Integration Guidelines

### Project Context
- Technology Stack: ${context.techStack.languages.join(", ")}
- Package Manager: ${context.techStack.packageManager}
- Testing Framework: ${context.techStack.testingFrameworks.join(", ")}

### Integration Points
- Input: Files and requirements from previous mode
- Output: Deliverables for next mode
- Documentation: Required for all changes
- Testing: Required for all implementations`;
  }

  private generateErrorHandling(): string {
    return `## Error Handling

### Common Issues
- Missing dependencies
- Invalid configurations
- Integration conflicts
- Test failures

### Resolution Steps
1. Identify root cause
2. Document the issue
3. Implement fix
4. Verify solution
5. Update documentation`;
  }

  private getModeTitle(mode: string): string {
    const titles: Record<string, string> = {
      architect: "System Architect",
      boomerang: "Task Orchestrator",
      code: "Senior Developer",
      code_review: "Quality Assurance",
    };
    return titles[mode] || mode;
  }

  private getWorkflowHighlight(mode: string): string {
    const highlights: Record<string, string> = {
      architect: "B",
      boomerang: "A",
      code: "C",
      code_review: "D",
    };
    return highlights[mode] || "";
  }

  private createGeneratedRules(
    mode: string,
    content: string,
    config: ModeConfig,
    context: ProjectContext
  ): GeneratedRules {
    const metadata: RulesMetadata = {
      mode,
      format: config.options?.format ?? "markdown",
      options: config.options
        ? {
            analysisDepth: config.options.analysisDepth,
            includeExamples: config.options.includeExamples,
          }
        : undefined,
    };

    return {
      mode,
      content,
      metadata,
      contextualInfo: {
        techStack: context.techStack,
        projectStructure: context.structure,
        generationDate: new Date().toISOString(),
      },
    };
  }

  private validateConfig(config: ModeConfig): Result<void, Error> {
    if (!config) {
      return Result.err(new Error("Config object is missing"));
    }
    if (!config.mode) {
      return Result.err(new Error("Mode is required"));
    }
    if (!config.contextPaths?.length) {
      return Result.err(new Error("Context paths are required"));
    }
    if (config.options?.format && !["markdown", "json"].includes(config.options.format)) {
      return Result.err(new Error("Invalid format option"));
    }
    if (
      config.options?.analysisDepth &&
      !["basic", "detailed"].includes(config.options.analysisDepth)
    ) {
      return Result.err(new Error("Invalid analysis depth option"));
    }
    return Result.ok(undefined);
  }
}
