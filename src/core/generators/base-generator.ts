/**
 * Base interfaces and classes for code generation functionality
 */
import { BaseService } from "../services/base-service";
import { Result } from "../types/result";

/**
 * Interface defining core generator functionality
 */
export interface IGenerator {
  /**
   * Generates code based on implementation-specific logic
   * @returns Promise<Result<void>> indicating generation success or failure
   */
  generate(): Promise<Result<void>>;

  /**
   * Validates generator configuration and requirements
   * @returns Promise<Result<void>> indicating validation success or failure
   */
  validate(): Promise<Result<void>>;
}

/**
 * Base class for all code generators
 * Provides common functionality and enforces consistent interface
 */
export abstract class BaseGenerator extends BaseService implements IGenerator {
  /**
   * Template method for code generation process
   * Ensures validation before generation
   */
  async generate(): Promise<Result<void>> {
    const initResult = this.initialize();
    if (initResult.isFailure()) {
      return Result.failure<void>("Generator initialization failed: " + initResult.error);
    }

    const validationResult = await this.validate();
    if (validationResult.isFailure()) {
      return Result.failure<void>("Generator validation failed: " + validationResult.error);
    }

    return this.executeGeneration();
  }

  /**
   * Validates generator-specific requirements
   * Must be implemented by derived classes
   */
  abstract validate(): Promise<Result<void>>;

  /**
   * Executes the actual code generation
   * Must be implemented by derived classes
   */
  protected abstract executeGeneration(): Promise<Result<void>>;

  /**
   * Helper method to format error messages
   * @param context Error context description
   * @param error Original error message
   */
  protected formatError(context: string, error: string): string {
    return `${context}: ${error}`;
  }
}
