import type { ProjectConfig } from "../types/shared";

/**
 * Validates if the provided object conforms to the ProjectConfig interface.
 * Currently checks for the presence and type of 'baseDir'.
 * @param config - The object to validate.
 * @returns True if the object is a valid ProjectConfig, false otherwise.
 */
export function isValidProjectConfig(config: unknown): config is ProjectConfig {
  return (
    typeof config === "object" &&
    config !== null &&
    "baseDir" in config &&
    typeof (config as ProjectConfig).baseDir === "string"
    // TODO: Add checks for other mandatory ProjectConfig fields as they are defined.
  );
}

/**
 * Custom error class for generator-specific errors.
 * Allows identifying the source generator and providing a specific error code.
 */
export class GeneratorError extends Error {
  /**
   * Creates an instance of GeneratorError.
   * @param message - The error message.
   * @param generator - The name of the generator where the error occurred.
   * @param code - A specific error code for categorization.
   */
  constructor(
    message: string,
    public readonly generator: string,
    public readonly code: string
  ) {
    super(`[${generator}:${code}] ${message}`);
    this.name = "GeneratorError"; // Standard practice to set the error name
  }
}
