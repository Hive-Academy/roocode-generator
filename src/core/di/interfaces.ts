import { Result } from "../result/result";
import { DIError } from "./errors";
import { Constructor, Factory, ServiceLifetime, ServiceToken } from "./types";

/**
 * Interface for dependency injection container
 */
export interface IServiceContainer {
  /**
   * Initializes the container
   */
  initialize(): void;

  /**
   * Registers a service with the container
   * @param token The token to register the service under
   * @param implementation The service implementation class
   * @param lifetime The service lifetime (defaults to Transient)
   */
  register<T>(
    token: ServiceToken,
    implementation: Constructor<T>,
    lifetime?: ServiceLifetime
  ): Result<void, DIError>;

  /**
   * Registers a singleton service
   * @param token The token to register the service under
   * @param implementation The service implementation class
   */
  registerSingleton<T>(token: ServiceToken, implementation: Constructor<T>): Result<void, DIError>;

  /**
   * Registers a factory function for creating service instances
   * @param token The token to register the factory under
   * @param factory The factory function
   * @param lifetime The service lifetime (defaults to Transient)
   */
  registerFactory<T>(
    token: ServiceToken,
    factory: Factory<T>,
    lifetime?: ServiceLifetime
  ): Result<void, DIError>;

  /**
   * Resolves a service instance from the container
   * @param token The token to resolve
   */
  resolve<T>(token: ServiceToken): Result<T, DIError>;

  /**
   * Clears all service registrations
   */
  clear(): void;
}
