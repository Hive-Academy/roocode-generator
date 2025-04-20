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
  private generatorsMap: Map<string, IGenerator>;

  /**
   * Constructs a GeneratorOrchestrator.
   * @param generators Array of registered generators (provided by factory, not injected directly here).
   * @param projectConfigService Service to access project configuration.
   * @param logger Logger service for logging.
   */
  constructor(
    // Note: 'generators' is provided by the factory in registrations.ts, not via @Inject
    private readonly generators: IGenerator[],
    @Inject("IProjectConfigService") private readonly projectConfigService: IProjectConfigService,
    @Inject("ILogger") private readonly logger: ILogger
  ) {
    // Map generators by their unique name or identifier for quick lookup
    this.generatorsMap = new Map<string, IGenerator>();
    for (const generator of generators) {
      // Use the typed 'name' property from IGenerator interface
      const name = generator.name;
      if (typeof name === "string") {
        this.generatorsMap.set(name, generator);
      } else {
        this.logger.warn("Warning: Generator missing 'name' property, skipping registration.");
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
        const errorMsg = `Generator not found: ${genName}`;
        this.logger.error(errorMsg);
        return Result.err(new Error(errorMsg));
      }

      this.logger.info(`Executing generator: ${genName}`);

      try {
        const result = await generator.generate();
        // Use isErr() to check for failure
        if (result.isErr()) {
          // Access the error message safely using the 'error' getter
          const errorMsg = result.error?.message ?? `Unknown error in generator ${genName}`;
          this.logger.error(`Generator ${genName} failed: ${errorMsg}`);
          // Return the original error Result
          return result;
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
  async execute(selectedGenerators?: string[]): Promise<void> {
    const generatorsToRun =
      selectedGenerators && selectedGenerators.length > 0
        ? selectedGenerators
        : this.generators.map((g) => g.name);

    if (generatorsToRun.length === 0) {
      this.logger.warn("No generators selected or registered to execute.");
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

    const result = await this.executeGenerators(config, generatorsToRun); // Use generatorsToRun here
    if (result.isErr()) {
      this.logger.error(`Execution failed: ${result.error?.message}`, result.error);
      throw result.error ?? new Error("Execution failed");
    }
  }
}
