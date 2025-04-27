import 'reflect-metadata';
import { Result } from '../result/result';
import { ServiceLifetime, ServiceDescriptor, Constructor, Factory, ServiceToken } from './types';
import {
  DIError,
  DependencyResolutionError,
  CircularDependencyError,
  ServiceRegistrationError,
  ContainerNotInitializedError,
} from './errors';
import { getErrorMessage } from '../types/common';
import { isInjectable, getInjectionTokens } from './decorators';
import { IServiceContainer } from './interfaces';

/**
 * A dependency injection container that manages service registration and resolution.
 */
export class Container implements IServiceContainer {
  private static instance: Container;
  private readonly services: Map<ServiceToken, ServiceDescriptor<unknown>>;
  private readonly singletons: Map<ServiceToken, unknown>;
  private readonly resolutionStack: ServiceToken[];
  private initialized: boolean;

  private constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.resolutionStack = [];
    this.initialized = false;
  }

  /**
   * Gets the singleton instance of the container
   */
  public static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  /**
   * Initializes the container. Must be called before using the container.
   */
  public initialize(): void {
    this.initialized = true;
  }

  /**
   * Registers a service with the container
   * @param token The token to register the service under
   * @param implementation The service implementation class
   * @param lifetime The service lifetime (defaults to Transient)
   */
  public register<T>(
    token: ServiceToken,
    implementation: Constructor<T>,
    lifetime = ServiceLifetime.Transient
  ): Result<void, DIError> {
    try {
      // Removed validateInitialization() check from register
      this.validateRegistration(token, implementation);

      if (!isInjectable(implementation)) {
        throw new ServiceRegistrationError(
          String(token),
          'Service class must be decorated with @Injectable()'
        );
      }

      this.services.set(token, {
        token,
        implementation,
        lifetime,
      });

      return Result.ok(undefined);
    } catch (error) {
      return Result.err(
        error instanceof DIError
          ? error
          : new ServiceRegistrationError(String(token), getErrorMessage(error))
      );
    }
  }

  /**
   * Registers a singleton service with the container
   * @param token The token to register the service under
   * @param implementation The service implementation class
   */
  public registerSingleton<T>(
    token: ServiceToken,
    implementation: Constructor<T>
  ): Result<void, DIError> {
    return this.register(token, implementation, ServiceLifetime.Singleton);
  }

  /**
   * Registers a factory function for creating service instances
   * @param token The token to register the factory under
   * @param factory The factory function
   * @param lifetime The service lifetime (defaults to Transient)
   */
  public registerFactory<T>(
    token: ServiceToken,
    factory: Factory<T>,
    lifetime = ServiceLifetime.Transient
  ): Result<void, DIError> {
    try {
      // Removed validateInitialization() check from registerFactory
      this.validateToken(token);

      this.services.set(token, {
        token,
        implementation: Object,
        lifetime,
        factory,
      });

      return Result.ok(undefined);
    } catch (error) {
      return Result.err(
        error instanceof DIError
          ? error
          : new ServiceRegistrationError(String(token), getErrorMessage(error))
      );
    }
  }

  /**
   * Resolves a service instance from the container
   * @param token The token to resolve
   */
  public resolve<T>(token: ServiceToken): Result<T, DIError> {
    try {
      this.validateInitialization();
      this.validateToken(token);
      this.checkCircularDependency(token);

      const descriptor = this.services.get(token);
      if (!descriptor) {
        throw new DependencyResolutionError(String(token), 'Service not registered');
      }

      this.resolutionStack.push(token);

      try {
        const instance = this.resolveInstance(descriptor);
        return Result.ok(instance as T);
      } finally {
        this.resolutionStack.pop();
      }
    } catch (error) {
      return Result.err(
        error instanceof DIError
          ? error
          : new DependencyResolutionError( // Wrap non-DI errors
              String(token),
              // Include original error message directly
              `Resolution failed. Original error: ${getErrorMessage(error)}`,
              error instanceof Error ? error : new Error(String(error)) // Still pass cause, even if test struggles
            )
      );
    }
  }

  /**
   * Clears all service registrations from the container
   */
  public clear(): void {
    this.services.clear();
    this.singletons.clear();
    this.resolutionStack.length = 0;
  }

  private resolveInstance<T>(descriptor: ServiceDescriptor<T>): T {
    if (descriptor.lifetime === ServiceLifetime.Singleton) {
      const existing = this.singletons.get(descriptor.token);
      if (existing) {
        return existing as T;
      }
    }

    if (descriptor.factory) {
      const instance = descriptor.factory();
      if (descriptor.lifetime === ServiceLifetime.Singleton) {
        this.singletons.set(descriptor.token, instance);
      }
      return instance;
    }

    const instance = this.createInstance(descriptor.implementation);
    if (descriptor.lifetime === ServiceLifetime.Singleton) {
      this.singletons.set(descriptor.token, instance);
    }
    return instance;
  }

  private createInstance<T>(implementation: Constructor<T>): T {
    const tokens = getInjectionTokens(implementation);
    const params = tokens.map((token) => {
      const result = this.resolve(token);
      if (result.isErr()) {
        const error = result.error;
        if (error instanceof Error) {
          throw error;
        }
        throw new DependencyResolutionError(String(token), 'Failed to resolve dependency');
      }
      return result.value;
    });

    try {
      return new implementation(...params);
    } catch (error) {
      throw new DependencyResolutionError(
        implementation.name,
        // Include original error message directly
        `Failed to instantiate service '${implementation.name}'. Original error: ${getErrorMessage(error)}`,
        error instanceof Error ? error : new Error(String(error)) // Still pass cause
      );
    }
  }

  private validateInitialization(): void {
    if (!this.initialized) {
      throw new ContainerNotInitializedError();
    }
  }

  private validateToken(token: ServiceToken): void {
    if (!token || (typeof token !== 'string' && typeof token !== 'symbol')) {
      throw new ServiceRegistrationError(String(token), 'Invalid token');
    }
  }

  private validateRegistration(token: ServiceToken, implementation: Constructor<unknown>): void {
    this.validateToken(token);
    if (!implementation || typeof implementation !== 'function') {
      throw new ServiceRegistrationError(String(token), 'Invalid implementation');
    }
  }

  private checkCircularDependency(token: ServiceToken): void {
    if (this.resolutionStack.includes(token)) {
      throw new CircularDependencyError(this.resolutionStack.map(String).concat(String(token)));
    }
  }
}
