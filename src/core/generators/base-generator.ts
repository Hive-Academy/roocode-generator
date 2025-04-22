/**
 * Base interfaces and classes for code generation functionality
 */
import { BaseService } from "../services/base-service";
import { Result } from "../result/result";

/**
 * Interface defining core generator functionality
 * @template T The type that defines what kind of file/content this generator produces
 */
export interface IGenerator<T> {
  /**
   * Unique name of the generator
   */
  readonly name: string;

  /**
   * Generates code based on implementation-specific logic
   * @param fileType The type of file/content to generate, specific to each generator
   * @param contextPaths Array of paths to gather context from
   * @returns Promise<Result<string, Error>> indicating generation success with content or failure
   */
  generate(fileType: T, contextPaths: string[]): Promise<Result<string, Error>>;

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

/**
 * Base class for all code generators
 * @template T The type that defines what kind of file/content this generator produces
 */
export abstract class BaseGenerator<T> extends BaseService implements IGenerator<T> {
  /**
   * Unique name of the generator
   */
  abstract readonly name: string;

  /**
   * Template method for code generation process
   * Ensures validation before generation
   * @param fileType The type of file/content to generate, specific to each generator
   * @param contextPaths Array of paths to gather context from
   */
  async generate(fileType: T, contextPaths: string[]): Promise<Result<string, Error>> {
    const initResult = this.initialize();
    if (initResult.isErr()) {
      return Result.err(
        new Error(
          `Generator initialization failed: ${initResult.error?.message ?? "Unknown error"}`
        )
      );
    }

    const validationResult = await this.validate();
    if (validationResult.isErr()) {
      return Result.err(
        new Error(
          `Generator validation failed: ${validationResult.error?.message ?? "Unknown error"}`
        )
      );
    }

    // Pass parameters to executeGeneration
    return this.executeGeneration(fileType, contextPaths);
  }

  /**
   * Validates generator-specific requirements
   * Must be implemented by derived classes
   */
  abstract validate(): Promise<Result<void, Error>>;

  /**
   * Executes the actual code generation
   * Must be implemented by derived classes
   * @param fileType The type of file/content to generate
   * @param contextPaths Array of paths to gather context from
   */
  protected abstract executeGeneration(
    fileType: T,
    contextPaths: string[]
  ): Promise<Result<string, Error>>;

  /**
   * Helper method to format error messages
   * @param context Error context description
   * @param error Original error message
   */
  protected formatError(context: string, error: string): string {
    return `${context}: ${error}`;
  }
}
