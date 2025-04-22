import { Injectable, Inject } from "../di/decorators"; // Use custom DI decorators
import { IGeneratorOrchestrator } from "./interfaces";
import { Result } from "../result/result";
import { IGenerator } from "../generators/base-generator";
import { IProjectConfigService } from "../config/interfaces";
import { ILogger } from "../services/logger-service";
import { ProjectConfig } from "../../../types/shared";

/**
 * GeneratorOrchestrator coordinates execution of registered generators based on project configuration and user selection.
 */
@Injectable() // Add Injectable decorator
export class GeneratorOrchestrator implements IGeneratorOrchestrator {
  private generatorsMap: Map<string, IGenerator<unknown>>;

  /**
   * Constructs a GeneratorOrchestrator.
   * @param generators Array of registered generators (provided by factory, not injected directly here).
   * @param projectConfigService Service to access project configuration.
   * @param logger Logger service for logging.
   */
  constructor(
    // Note: 'generators' is provided by the factory in registrations.ts, not via @Inject
    generators: Array<IGenerator<unknown>>,
    @Inject("IProjectConfigService") private readonly projectConfigService: IProjectConfigService,
    @Inject("ILogger") private readonly logger: ILogger
  ) {
    // Map generators by their unique name or identifier for quick lookup
    this.generatorsMap = new Map<string, IGenerator<unknown>>();

    // Standard generator identifiers
    const generatorIdentifiers = {
      "memory-bank": "MemoryBank",
      rules: "rules",
      "system-prompts": "system-prompts",
      roomodes: "roomodes",
      "vscode-copilot-rules": "vscode-copilot-rules",
    };

    for (const generator of generators) {
      const name = generator.name;
      if (typeof name === "string") {
        const cliId = Object.entries(generatorIdentifiers).find(
          ([_, className]) => className === name
        )?.[0];

        if (cliId) {
          this.generatorsMap.set(cliId, generator);
          this.generatorsMap.set(name, generator);
          this.logger.debug(`Registered generator ${name} with CLI identifier ${cliId}`);
        } else {
          this.generatorsMap.set(name, generator);
          this.logger.warn(`Generator ${name} has no CLI identifier mapping`);
        }
      } else {
        this.logger.warn(`Warning: Generator missing 'name' property, skipping registration`);
      }
    }
  }

  /**
   * Initialize the orchestrator if needed.
   */
  async initialize(): Promise<void> {
    // No initialization logic currently
    return Promise.resolve();
  }

  /**
   * Execute the selected generators in sequence.
   * @param config The project configuration.
   * @param selectedGenerators Array of generator names to execute.
   * @returns Result<void, Error> indicating success or failure.
   */
  async executeGenerators(
    config: ProjectConfig,
    selectedGenerators: string[]
  ): Promise<Result<void, Error>> {
    this.logger.info(`Starting generator orchestration for: ${selectedGenerators.join(", ")}`);

    for (const genName of selectedGenerators) {
      const generator = this.generatorsMap.get(genName);
      if (!generator) {
        const availableGenerators = Array.from(this.generatorsMap.keys())
          .filter((g) => !g.includes("Generator"))
          .join(", ");
        const errorMsg = `Generator not found: ${genName}. Available generators: ${availableGenerators}`;
        this.logger.error(errorMsg);
        return Result.err(new Error(errorMsg));
      }

      this.logger.info(`Executing generator: ${genName}`);

      try {
        const result = await generator.generate(config, []);
        if (result.isErr()) {
          const errorMsg = result.error?.message ?? `Unknown error in generator ${genName}`;
          this.logger.error(`Generator ${genName} failed: ${errorMsg}`);
          return Result.err(new Error(errorMsg));
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Exception during generator ${genName} execution: ${errMsg}`);
        return Result.err(new Error(errMsg));
      }
    }

    this.logger.info("All selected generators executed successfully.");
    return Result.ok(undefined);
  }

  /**
   * Execute method from IGeneratorOrchestrator interface.
   * Executes generators. If selectedGenerators is provided, only those are run.
   * Otherwise, all registered generators are run.
   * @param selectedGenerators Optional array of generator names to execute.
   */
  /**
   * Validates and filters the list of selected generators.
   * @param selectedGenerators Array of generator names to validate.
   * @returns Array of valid generator names.
   */
  private validateGenerators(selectedGenerators: string[]): string[] {
    const validGenerators = selectedGenerators.filter((name) => {
      const isValid = this.generatorsMap.has(name);
      if (!isValid) {
        this.logger.warn(`Invalid generator name: ${name}`);
      }
      return isValid;
    });
    return validGenerators;
  }

  async execute(selectedGenerators?: string[]): Promise<void> {
    // Get available generator identifiers
    const availableGenerators = Array.from(this.generatorsMap.keys()).filter(
      (name) => !name.includes("Generator")
    ); // Filter out class names

    // If no generators specified, run all unique generators
    const generatorsToRun =
      selectedGenerators && selectedGenerators.length > 0
        ? this.validateGenerators(selectedGenerators)
        : availableGenerators;

    if (generatorsToRun.length === 0) {
      this.logger.warn(
        "No valid generators selected. Available generators: " +
          availableGenerators.filter((g) => !g.includes("Generator")).join(", ")
      );
      return;
    }

    this.logger.info(`Executing generators: ${generatorsToRun.join(", ")}`);

    const configResult = await this.projectConfigService.loadConfig();
    if (configResult.isErr()) {
      this.logger.error(
        `Failed to load project config: ${configResult.error?.message}`,
        configResult.error
      );
      throw configResult.error ?? new Error("Failed to load project config");
    }
    const config = configResult.value;
    if (!config) {
      const err = new Error("Project config is undefined");
      this.logger.error(err.message, err);
      throw err;
    }

    // Ensure generatorsToRun contains only valid generator names
    const validGenerators = this.validateGenerators(generatorsToRun);
    const result = await this.executeGenerators(config, validGenerators);
    if (result.isErr()) {
      this.logger.error(`Execution failed: ${result.error?.message}`, result.error);
      throw result.error ?? new Error("Execution failed");
    }
  }
}
