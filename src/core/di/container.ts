/**
 * Interface for dependency injection container
 * Provides service registration and resolution capabilities
 */
export interface IServiceContainer {
  register<T>(token: symbol, implementation: new (...args: any[]) => T): void;
  resolve<T>(token: symbol): T;
}

/**
 * Implementation of dependency injection container
 * Manages service registration and resolution with type safety
 */
export class ServiceContainer implements IServiceContainer {
  private services = new Map<symbol, new (...args: any[]) => any>();

  /**
   * Register a service implementation for a given token
   * @param token Symbol identifying the service
   * @param implementation Constructor for the service implementation
   */
  register<T>(token: symbol, implementation: new (...args: any[]) => T): void {
    this.services.set(token, implementation);
  }

  /**
   * Resolve a service implementation for a given token
   * @param token Symbol identifying the service
   * @returns Instance of the requested service
   * @throws Error if service is not registered
   */
  resolve<T>(token: symbol): T {
    const Implementation = this.services.get(token);
    if (!Implementation) {
      throw new Error(`Service not registered for token: ${token.toString()}`);
    }
    return new Implementation();
  }
}
