/**
 * Interfaces for top-level application services.
 * These define contracts for core components used by ApplicationContainer.
 */

import { Result } from "../result/result";
import { ProjectConfig } from "../../../types/shared";

export interface IGeneratorOrchestrator {
  /**
   * Initialize the generator orchestrator.
   */
  initialize(): Promise<void>;

  /**
   * Executes generators. If selectedGenerators is provided, only those are run.
   * Otherwise, all registered generators are run.
   * @param selectedGenerators Optional array of generator names to execute.
   * @param options Additional options for generation (e.g., modes)
   */
  execute(selectedGenerators?: string[], options?: { modes?: string[] }): Promise<void>;

  /**
   * Execute the selected generators in sequence.
   * @param config The project configuration.
   * @param selectedGenerators Array of generator names to execute.
   * @param options Additional options for generation (e.g., modes)
   * @returns Result<void, Error> indicating success or failure.
   */
  executeGenerators(
    config: ProjectConfig,
    selectedGenerators: string[],
    options?: { modes?: string[] }
  ): Promise<Result<void, Error>>;
}

export interface IProjectManager {
  /**
   * Load or initialize the project configuration.
   */
  loadProjectConfig(): Promise<void>;

  /**
   * Save project state or configuration.
   */
  saveProjectConfig(): Promise<void>;
}

export interface ICliInterface {
  /**
   * Parse CLI arguments and options.
   */
  parseArgs(): Promise<void>;

  /**
   * Get the parsed CLI arguments.
   * Should be called after parseArgs().
   */
  getParsedArgs(): { command: string | null; options: Record<string, any> };

  /**
   * Display output or messages to the CLI.
   * @param message The message to display.
   */
  output(message: string): void;

  /**
   * Prompt the user for input.
   * @param options The prompt options.
   * @returns Promise resolving to the user's response.
   */
  prompt<T extends Record<string, any>>(options: {
    type: string;
    name: string;
    message: string;
    default?: any;
  }): Promise<T>;
}
