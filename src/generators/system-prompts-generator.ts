import { BaseGenerator, IGenerator } from "../core/generators/base-generator";
import { IFileOperations } from "../core/file-operations/interfaces";
import { IProjectConfigService } from "../core/config/interfaces";
import { IServiceContainer } from "../core/di/interfaces";
import { Result } from "../core/result/result";
import { Inject, Injectable } from "../core/di";
import { ITemplateManager } from "../core/template-manager/interfaces";
import { ILogger } from "../core/services/logger-service";
import { GeneratorError } from "../core/errors";
import path from "path";
import { ProjectConfig } from "../../types/shared";

/**
 * @description Generator for creating system prompt files for different RooCode modes.
 * System prompts provide the initial instructions and context for the LLM in each mode.
 * @implements {IGenerator}
 */
@Injectable()
export class SystemPromptsGenerator extends BaseGenerator implements IGenerator {
  /**
   * @description The unique name identifier for this generator.
   */
  public readonly name = "system-prompts";

  // Dependencies injected via constructor
  protected templateManager: ITemplateManager;
  protected fileOperations: IFileOperations;
  protected logger: ILogger;
  protected projectConfigService: IProjectConfigService;

  /**
   * @description Creates an instance of SystemPromptsGenerator.
   * @param {ITemplateManager} templateManager
   * @param {IFileOperations} fileOperations
   * @param {ILogger} logger
   * @param {IProjectConfigService} projectConfigService
   * @param {IServiceContainer} container - The DI container instance.
   */
  constructor(
    @Inject("ITemplateManager") templateManager: ITemplateManager,
    @Inject("IFileOperations") fileOperations: IFileOperations,
    @Inject("ILogger") logger: ILogger,
    @Inject("IProjectConfigService") projectConfigService: IProjectConfigService,
    @Inject("IServiceContainer") container: IServiceContainer
  ) {
    super(container);
    this.templateManager = templateManager;
    this.fileOperations = fileOperations;
    this.logger = logger;
    this.projectConfigService = projectConfigService;
  }

  /**
   * @description Validates that all required dependencies are available.
   * @returns {Result<void, Error>} Result indicating validation success or failure.
   */
  protected validateDependencies(): Result<void, Error> {
    if (
      !this.logger ||
      !this.templateManager ||
      !this.fileOperations ||
      !this.projectConfigService
    ) {
      const error = new Error(
        `Dependency validation failed for ${this.name}: One or more services are missing.`
      );
      console.error(error.message);
      return Result.err(error);
    }
    this.logger.debug(`${this.name}: Dependency validation successful.`);
    return Result.ok(undefined);
  }

  /**
   * @description Executes the generation process for system prompt files.
   * @returns {Promise<Result<void, Error>>} A result indicating success or failure.
   */
  protected async executeGeneration(): Promise<Result<void, Error>> {
    const configResult = await this.projectConfigService.loadConfig();
    if (configResult.isErr()) {
      const error = new GeneratorError(
        "Failed to load project configuration for generation.",
        this.name,
        undefined,
        configResult.error
      );
      this.logger.error(error.message, error);
      return Result.err(error);
    }
    const config: ProjectConfig = configResult.value as ProjectConfig;

    this.logger.info(`Starting system prompts generation...`);

    const modes = [
      { slug: "architect", template: "system-prompt-architect.md" },
      { slug: "boomerang", template: "system-prompt-boomerang.md" },
      { slug: "code", template: "system-prompt-code.md" },
      { slug: "code-review", template: "system-prompt-code-review.md" },
    ];

    const outputBaseDir = path.resolve(config.rootDir);

    // const ensureDirResult = await this.fileOperations.createDirectory(outputBaseDir);
    // if (ensureDirResult.isErr()) {
    //   const error = new GeneratorError(
    //     `Failed to create output directory: ${outputBaseDir}`,
    //     this.name,
    //     { directory: outputBaseDir },
    //     ensureDirResult.error
    //   );
    //   this.logger.error(error.message, error);
    //   return Result.err(error);
    // }

    for (const mode of modes) {
      this.logger.debug(`Generating system prompt for mode: ${mode.slug}`);

      const templatePath = `system-prompts/${mode.template}`;

      // Directly process the template using its path and context
      const processResult = await this.templateManager.processTemplate(templatePath, { config });
      if (processResult.isErr()) {
        const error = new GeneratorError(
          `Failed to process template: ${templatePath}`,
          this.name,
          { template: templatePath },
          processResult.error
        );
        this.logger.error(error.message, error);
        return Result.err(error);
      }

      // Explicitly check if the processed content is valid before writing
      const processedContent = processResult.value;
      if (typeof processedContent !== "string") {
        const error = new GeneratorError(
          `Template processing returned invalid content (not a string) for: ${templatePath}`,
          this.name,
          { template: templatePath, receivedType: typeof processedContent }
        );
        this.logger.error(error.message, error);
        return Result.err(error);
      }

      const outputFileName = `system-prompt-${mode.slug}`;
      const outputPath = path.resolve(outputBaseDir, outputFileName);
      const writeResult = await this.fileOperations.writeFile(outputPath, processedContent); // Now guaranteed to be a string
      if (writeResult.isErr()) {
        const error = new GeneratorError(
          `Failed to write system prompt file: ${outputPath}`,
          this.name,
          { path: outputPath },
          writeResult.error
        );
        this.logger.error(error.message, error);
        return Result.err(error);
      }

      this.logger.debug(`Successfully wrote system prompt: ${outputPath}`);
    }

    this.logger.info(`System prompts generation completed successfully.`);
    return Result.ok(undefined);
  }

  /**
   * @description Validates the necessary conditions for the generator to run.
   * @returns {Promise<Result<void, Error>>} A result indicating validation success or failure.
   */
  public override async validate(): Promise<Result<void, Error>> {
    this.logger.debug(`Validating SystemPromptsGenerator prerequisites...`);

    const configResult = await this.projectConfigService.loadConfig();
    if (configResult.isErr()) {
      const error = new GeneratorError(
        "Failed to load project configuration for validation.",
        this.name,
        undefined,
        configResult.error
      );
      this.logger.error(error.message, error);
      return Result.err(error);
    }
    const config: ProjectConfig = configResult.value as ProjectConfig;

    const rootDirCheck = await this.fileOperations.createDirectory(config.rootDir);
    if (rootDirCheck.isErr()) {
      const error = new GeneratorError(
        `Project root directory check failed: ${config.rootDir}`,
        this.name,
        { directory: config.rootDir },
        rootDirCheck.error
      );
      this.logger.error(error.message, error);
      return Result.err(error);
    }

    this.logger.debug(`Validation successful for SystemPromptsGenerator.`);
    return Result.ok(undefined);
  }
}
