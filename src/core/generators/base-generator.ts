/**
 * Base interfaces and classes for code generation functionality
 */
import { BaseService } from "../services/base-service";
import { Result } from "../result/result"; // Corrected import path

/**
 * Interface defining core generator functionality
 */
export interface IGenerator {
  /**
   * Unique name of the generator
   */
  readonly name: string;

  /**
   * Generates code based on implementation-specific logic
   * @returns Promise<Result<void, Error>> indicating generation success or failure
   */
  generate(): Promise<Result<void, Error>>;

  /**
   * Validates generator configuration and requirements
   * @returns Promise<Result<void, Error>> indicating validation success or failure
   */
  validate(): Promise<Result<void, Error>>;
}

/**
 * Base class for all code generators
 * Provides common functionality and enforces consistent interface
 */
export abstract class BaseGenerator extends BaseService implements IGenerator {
  /**
   * Unique name of the generator
   */
  abstract readonly name: string;

  /**
   * Template method for code generation process
   * Ensures validation before generation
   */
  async generate(): Promise<Result<void, Error>> {
    // Updated return type
    const initResult = this.initialize();
    // Use isErr() to check for failure
    if (initResult.isErr()) {
      // Use Result.err with an Error object and access message
      return Result.err(
        new Error(
          `Generator initialization failed: ${initResult.error?.message ?? "Unknown error"}`
        )
      );
    }

    const validationResult = await this.validate();
    // Use isErr() to check for failure
    if (validationResult.isErr()) {
      // Use Result.err with an Error object and access message
      return Result.err(
        new Error(
          `Generator validation failed: ${validationResult.error?.message ?? "Unknown error"}`
        )
      );
    }

    // Return the result from executeGeneration directly
    return this.executeGeneration();
  }

  /**
   * Validates generator-specific requirements
   * Must be implemented by derived classes
   */
  abstract validate(): Promise<Result<void, Error>>; // Updated return type

  /**
   * Executes the actual code generation
   * Must be implemented by derived classes
   */
  protected abstract executeGeneration(): Promise<Result<void, Error>>; // Updated return type

  /**
   * Helper method to format error messages
   * @param context Error context description
   * @param error Original error message
   */
  protected formatError(context: string, error: string): string {
    return `${context}: ${error}`;
  }
}
