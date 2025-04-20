/**
 * @fileoverview Generator for VSCode Copilot rules configuration.
 */

import path from "path";

import { BaseGenerator, IGenerator } from "../core/generators/base-generator";
import { IFileOperations } from "../core/file-operations/interfaces";
import { ILogger } from "../core/services/logger-service";
import { IProjectConfigService } from "../core/config/interfaces";
import { Result } from "../core/result/result";
import { Container } from "../core/di/container"; // Import Container
import { Inject, Injectable } from "../core/di";

/**
 * Generates VSCode settings to configure Copilot behavior (e.g., enabling/disabling for specific languages).
 */
@Injectable()
export class VSCodeCopilotRulesGenerator extends BaseGenerator implements IGenerator {
  /**
   * Unique name of the generator.
   */
  readonly name = "vscode-copilot-rules";

  private readonly projectConfigService: IProjectConfigService;
  private readonly fileOperations: IFileOperations;
  private readonly logger: ILogger; // Declare logger property

  /**
   * Constructs a new instance of VSCodeCopilotRulesGenerator.
   * @param serviceContainer - The DI container instance.
   * @param fileOperations - Service for file system operations.
   * @param logger - Service for logging.
   * @param projectConfigService - Service for accessing project configuration.
   */
  constructor(
    @Inject("Container") serviceContainer: Container, // Inject Container
    @Inject("IFileOperations") fileOperations: IFileOperations,

    @Inject("ILogger") logger: ILogger,
    @Inject("IProjectConfigService") projectConfigService: IProjectConfigService
  ) {
    // Pass container to BaseService constructor.
    super(serviceContainer); // Corrected super call
    this.fileOperations = fileOperations;
    this.projectConfigService = projectConfigService;
    this.logger = logger; // Assign injected logger to the local property
    this.logger.debug(`VSCodeCopilotRulesGenerator initialized`);
  }

  /**
   * Validates that essential dependencies are resolved.
   * @returns Result indicating success or failure.
   */
  protected validateDependencies(): Result<void, Error> {
    // Validate logger dependency
    if (!this.logger) {
      return Result.err(new Error("Logger dependency not resolved."));
    }
    if (!this.fileOperations) {
      return Result.err(new Error("FileOperations dependency not resolved."));
    }
    if (!this.projectConfigService) {
      return Result.err(new Error("ProjectConfigService dependency not resolved."));
    }
    return Result.ok(undefined);
  }

  /**
   * Validates generator requirements. Currently checks if project config can be loaded.
   * @returns Promise<Result<void, Error>> indicating validation success or failure.
   */
  async validate(): Promise<Result<void, Error>> {
    this.logger.debug("Validating VSCodeCopilotRulesGenerator...");
    const configResult = await this.projectConfigService.loadConfig();
    if (configResult.isErr()) {
      // Added check for error existence before accessing message
      const errorMessage = configResult.error?.message ?? "Unknown error";
      return Result.err(new Error(`Failed to load project config: ${errorMessage}`));
    }
    this.logger.debug("VSCodeCopilotRulesGenerator validation successful.");
    return Result.ok(undefined);
  }

  /**
   * Executes the VSCode Copilot rules generation.
   * Creates or updates `.vscode/settings.json` with Copilot rules.
   * @returns Promise<Result<void, Error>> indicating generation success or failure.
   */
  protected async executeGeneration(): Promise<Result<void, Error>> {
    this.logger.info("Executing VSCode Copilot Rules generation...");

    const configResult = await this.projectConfigService.loadConfig();
    // Validation ensures config loads, but double-check for safety
    if (configResult.isErr()) {
      // Added check for error existence before accessing message
      const errorMessage = configResult.error?.message ?? "Unknown error";
      return Result.err(
        new Error(`Failed to load project config during execution: ${errorMessage}`)
      );
    }
    // Access value safely after isErr check
    const projectConfig = configResult.value;

    // Define the Copilot rules structure (simple example)
    const copilotRules = {
      "github.copilot.enable": {
        "*": true, // Enable globally by default
        plaintext: false,
        markdown: false,
        scminput: false,
        // Add more language-specific overrides as needed based on project type or config
      },
    };

    // Ensure projectConfig and rootDir are defined before using path.join
    if (!projectConfig?.rootDir) {
      return Result.err(
        new Error("Project root directory (rootDir) is not defined in the configuration.")
      );
    }
    // Use baseDir (project root) instead of rootDir (.roo output) for .vscode folder
    const settingsDir = path.join(projectConfig.baseDir ?? ".", ".vscode");
    const settingsPath = path.join(settingsDir, "settings.json");
    this.logger.debug(`Target settings file path: ${settingsPath}`);

    let currentSettings: Record<string, unknown> = {};

    // Check if settings file exists
    const readFileResult = await this.fileOperations.readFile(settingsPath);

    if (readFileResult.isOk()) {
      this.logger.debug("Existing settings.json found. Merging rules.");
      try {
        // Ensure value exists before parsing
        if (readFileResult.value !== undefined) {
          currentSettings = JSON.parse(readFileResult.value);
          if (typeof currentSettings !== "object" || currentSettings === null) {
            this.logger.warn("Existing settings.json is not a valid JSON object. Overwriting.");
            currentSettings = {};
          }
        } else {
          this.logger.warn("readFile returned Ok but value is undefined. Overwriting settings.");
          currentSettings = {};
        }
      } catch (error) {
        this.logger.warn(
          `Failed to parse existing settings.json: ${error instanceof Error ? error.message : String(error)}. Overwriting.`
        );
        currentSettings = {}; // Reset if parsing fails
      }
    } else {
      // Check if the error is specifically 'file not found'
      // ENOENT is common across platforms for file not found
      if (readFileResult.error?.message.includes("ENOENT")) {
        this.logger.debug("settings.json not found. Creating new file.");
        // Ensure .vscode directory exists
        const createDirResult = await this.fileOperations.createDirectory(settingsDir);
        if (createDirResult.isErr()) {
          // Added check for error existence before accessing message
          const errorMessage = createDirResult.error?.message ?? "Unknown error";
          return Result.err(new Error(`Failed to create .vscode directory: ${errorMessage}`));
        }
      } else {
        // Different error reading the file, return it
        // Added check for error existence before accessing message
        const errorMessage = readFileResult.error?.message ?? "Unknown error";
        return Result.err(new Error(`Failed to read settings.json: ${errorMessage}`));
      }
    }

    // Merge Copilot rules into existing settings
    // Simple merge: Overwrites existing 'github.copilot.enable' key
    const newSettings = {
      ...currentSettings,
      ...copilotRules, // Add or overwrite Copilot rules
    };

    // Write the updated settings back to the file
    try {
      const settingsContent = JSON.stringify(newSettings, null, 2); // Pretty print JSON
      const writeFileResult = await this.fileOperations.writeFile(settingsPath, settingsContent);

      if (writeFileResult.isErr()) {
        // Added check for error existence before accessing message
        const errorMessage = writeFileResult.error?.message ?? "Unknown error";
        return Result.err(new Error(`Failed to write settings.json: ${errorMessage}`));
      }

      this.logger.info(`Successfully generated/updated VSCode Copilot rules in ${settingsPath}`);
      return Result.ok(undefined);
    } catch (error) {
      // Catch potential JSON.stringify errors (unlikely with this structure)
      return Result.err(
        new Error(
          `Failed to stringify settings JSON: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }
  }
}
