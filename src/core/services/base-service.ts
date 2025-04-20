/**
 * Base service class providing common functionality for all services
 * Includes dependency injection and validation support
 */
import { IServiceContainer } from "../di/interfaces";
import { Result } from "../result/result"; // Updated import path
import { isObject, getErrorMessage } from "../types/common"; // Added getErrorMessage
import { ServiceToken } from "../di/types";

export abstract class BaseService {
  /**
   * Creates a new instance of BaseService
   * @param container Dependency injection container for service resolution
   */
  constructor(protected readonly container: IServiceContainer) {}

  /**
   * Validates that all required dependencies are available
   * Must be implemented by derived classes to ensure proper initialization
   * @returns Result indicating validation success or failure
   */
  // Updated return type to use the standardized Result with Error
  protected abstract validateDependencies(): Result<void, Error>;

  /**
   * Ensures service is properly initialized with all dependencies
   * @returns Result indicating initialization success or failure
   */
  // Updated return type and logic to use the standardized Result with Error
  protected initialize(): Result<void, Error> {
    const validationResult = this.validateDependencies();
    // Use isErr() and Result.err()
    if (validationResult.isErr()) {
      const errorMsg = validationResult.error?.message ?? "Unknown validation error";
      return Result.err(new Error(`Service initialization failed: ${errorMsg}`));
    }
    // Use Result.ok()
    return Result.ok(undefined);
  }

  /**
   * Safely resolves a dependency from the container with type checking
   * @param token Token identifying the dependency
   * @returns Result containing the resolved dependency or error
   */
  // Updated return type and logic to use the standardized Result with Error
  protected resolveDependency<T extends object>(token: ServiceToken): Result<T, Error> {
    try {
      // Assuming container.resolve now returns Result<T, DIError> or throws
      const resolveResult = this.container.resolve<T>(token);

      if (resolveResult.isErr()) {
        // Propagate the error from the container, ensuring it's a valid Error
        const errorToPass =
          resolveResult.error instanceof Error
            ? resolveResult.error
            : new Error(`Unknown resolution error for token: ${String(token)}`);
        return Result.err(errorToPass);
      }

      const service = resolveResult.value;

      // Validate resolved service matches expected type
      if (!isObject(service)) {
        return Result.err(new Error(`Invalid dependency type for token: ${String(token)}`));
      }

      // Use Result.ok()
      return Result.ok(service as T);
    } catch (error) {
      // Catch potential throws from container.resolve if it doesn't return Result
      return Result.err(
        new Error(`Failed to resolve dependency: ${String(token)}: ${getErrorMessage(error)}`)
      );
    }
  }
}
