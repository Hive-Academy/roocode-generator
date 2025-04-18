/**
 * Base service class providing common functionality for all services
 * Includes dependency injection and validation support
 */
import { IServiceContainer } from "../di/container";
import { Result } from "../types/result";

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
  protected abstract validateDependencies(): Result<void>;

  /**
   * Ensures service is properly initialized with all dependencies
   * @returns Result indicating initialization success or failure
   */
  protected initialize(): Result<void> {
    const validationResult = this.validateDependencies();
    if (validationResult.isFailure()) {
      return Result.failure<void>("Service initialization failed: " + validationResult.error);
    }
    return Result.success<void>(undefined);
  }

  /**
   * Safely resolves a dependency from the container
   * @param token Symbol identifying the dependency
   * @returns Result containing the resolved dependency or error
   */
  protected resolveDependency<T>(token: symbol): Result<T> {
    try {
      const service = this.container.resolve<T>(token);
      return Result.success<T>(service);
    } catch (error) {
      return Result.failure<T>(`Failed to resolve dependency: ${token.toString()}`, error);
    }
  }
}
