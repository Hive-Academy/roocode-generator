/**
 * Interfaces for top-level application services.
 * These define contracts for core components used by ApplicationContainer.
 */

import { Result } from '../result/result';
import { ProjectConfig } from '../../../types/shared';

export interface IGeneratorOrchestrator {
  /**
   * Initialize the generator orchestrator.
   */
  initialize(): Promise<void>;

  /**
   * Executes a specific command with provided options.
   * @param command The command name to execute (e.g., 'generate').
   * @param options Options for the command.
   * @returns Result<void, Error> indicating success or failure.
   */
  execute(command: string, options: Record<string, any>): Promise<Result<void, Error>>;

  /**
   * Execute the selected generators in sequence.
   * This method is for executing a list of generators directly, potentially for non-command-based flows.
   * @param config The project configuration.
   * @param selectedGenerators Array of generator names to execute.
   * @returns Result<void, Error> indicating success or failure.
   */
  executeGenerators(
    config: ProjectConfig,
    selectedGenerators: string[]
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
