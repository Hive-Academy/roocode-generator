import { BaseGenerator } from "../core/generators/base-generator";
import { IFileOperations } from "../core/file-operations/interfaces";
import { IProjectConfigService } from "../core/config/interfaces";
import { Result } from "../core/result/result";
import { IServiceContainer } from "../core/di/interfaces";
import { Inject, Injectable } from "../core/di";
import { ITemplateManager } from "../core/template-manager/interfaces";
import { ILogger } from "../core/services/logger-service";
import { ProjectConfig } from "../../types/shared";
import path from "path";

/**
 * @description Generates the standard Roo mode rule files.
 */
@Injectable()
export class RulesGenerator extends BaseGenerator<string> {
  /**
   * @description The unique name identifier for this generator.
   */
  readonly name = "rules";

  /**
   * @description Creates an instance of RulesGenerator.
   * @param {ITemplateManager} templateManager - The template management service.
   * @param {IFileOperations} fileOperations - The file operations service.
   * @param {ILogger} logger - The logging service.
   * @param {IProjectConfigService} projectConfigService - The project configuration service.
   * @param {IServiceContainer} container - The dependency injection container.
   */
  constructor(
    @Inject("ITemplateManager") protected templateManager: ITemplateManager,
    @Inject("IFileOperations") protected fileOperations: IFileOperations,
    @Inject("ILogger") protected logger: ILogger,
    @Inject("IProjectConfigService") protected projectConfigService: IProjectConfigService,
    @Inject("IServiceContainer") protected container: IServiceContainer
  ) {
    super(container);
    this.logger.debug(`Initialized ${this.name} generator.`);
  }

  /**
   * @description Validates generator-specific requirements.
   * @returns {Promise<Result<void, Error>>} Validation result.
   */
  async validate(): Promise<Result<void, Error>> {
    this.logger.debug(`Validating ${this.name} generator...`);
    // TODO: Add specific validation if needed (e.g., check if templates exist)
    this.logger.debug(`${this.name} generator validation successful.`);
    // Using Promise.resolve directly as async isn't strictly needed here yet
    return Promise.resolve(Result.ok(undefined));
  }

  /**
   * @description Validates that all required dependencies are available.
   * @returns {Result<void, Error>} Validation result.
   */
  protected validateDependencies(): Result<void, Error> {
    if (
      !this.templateManager ||
      !this.fileOperations ||
      !this.logger ||
      !this.projectConfigService
    ) {
      return Result.err(new Error(`${this.name} generator is missing required dependencies.`));
    }
    return Result.ok(undefined);
  }

  /**
   * @description Executes the actual rule file generation.
   * @returns {Promise<Result<void, Error>>} A promise resolving to the result of the generation process.
   */
  protected async executeGeneration(): Promise<Result<string, Error>> {
    this.logger.info(`Executing ${this.name} generation...`);

    const configResult = await this.projectConfigService.loadConfig();
    if (configResult.isErr()) {
      const errorMessage =
        configResult.error instanceof Error ? configResult.error.message : "Unknown error";
      return Result.err(new Error(`Failed to load project config: ${errorMessage}`));
    }
    // Explicit type assertion might not be needed if loadConfig signature is correct, but added for safety
    const projectConfig: ProjectConfig = configResult.value as ProjectConfig;
    const projectRoot = projectConfig.baseDir ?? ".";
    const modes = ["architect", "boomerang", "code", "code-review"];
    const templateDir = "rules";
    const outputBaseDir = ".roo";

    this.logger.debug(`Project root identified as: ${projectRoot}`);
    this.logger.debug(`Generating rules for modes: ${modes.join(", ")}`);

    const generationResults: Result<void, Error>[] = [];

    for (const mode of modes) {
      const templateName = `${mode}-rules.md`; // Remove .hbs extension
      const templatePath = path.join(templateDir, templateName);
      const outputDir = path.join(projectRoot, outputBaseDir, `rules-${mode}`);
      const outputPath = path.join(outputDir, "rules.md");

      this.logger.debug(`Processing mode: ${mode}`);
      this.logger.debug(` - Template path: ${templatePath}`);
      this.logger.debug(` - Output path: ${outputPath}`);

      // Process template
      const processResult = await this.templateManager.processTemplate(templatePath, {});
      if (processResult.isErr()) {
        // Ensure error is an instance of Error before accessing message
        const baseErrorMessage =
          processResult.error instanceof Error
            ? processResult.error.message
            : "Unknown template processing error";
        const fullErrorMessage = `Failed to process template ${templatePath} for mode ${mode}: ${baseErrorMessage}`;
        const error = new Error(fullErrorMessage); // Use the guaranteed string
        this.logger.error(fullErrorMessage, processResult.error); // Pass the guaranteed string message
        generationResults.push(Result.err(error));
        continue; // Skip to next mode on process error
      }
      const content = processResult.value;

      // Create output directory
      const createDirResult = await this.fileOperations.createDirectory(outputDir);
      if (createDirResult.isErr()) {
        const baseErrorMessage =
          createDirResult.error instanceof Error
            ? createDirResult.error.message
            : "Unknown directory creation error";
        const fullErrorMessage = `Failed to create directory ${outputDir} for mode ${mode}: ${baseErrorMessage}`;
        const error = new Error(fullErrorMessage);
        this.logger.error(fullErrorMessage, createDirResult.error);
        generationResults.push(Result.err(error));
        continue;
      }

      // Write the rendered content to the file
      const writeResult = await this.fileOperations.writeFile(outputPath, content as string);
      if (writeResult.isErr()) {
        // Explicitly create error message string first
        const baseErrorMessage =
          writeResult.error instanceof Error
            ? writeResult.error.message
            : "Unknown file writing error";
        const fullErrorMessage = `Failed to write file ${outputPath} for mode ${mode}: ${baseErrorMessage}`;
        const error = new Error(fullErrorMessage);
        this.logger.error(fullErrorMessage, writeResult.error); // Pass guaranteed string message
        generationResults.push(Result.err(error));
      } else {
        this.logger.info(`Successfully generated rules file for mode: ${mode} at ${outputPath}`);
        generationResults.push(Result.ok(undefined));
      }
    }

    // Check if any generation step failed
    const firstErrorResult = generationResults.find((res) => res.isErr());
    if (firstErrorResult) {
      this.logger.error("Rules generation completed with errors.");
      // Ensure we return an actual Error object
      const finalError =
        firstErrorResult.error instanceof Error
          ? firstErrorResult.error
          : new Error("Unknown error during rules generation.");
      return Result.err(finalError);
    }

    this.logger.info("Rules generation completed successfully for all modes.");
    return Result.ok("");
  }
}
