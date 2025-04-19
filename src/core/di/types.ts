/**
 * Defines the lifetime of a service in the container.
 */
export enum ServiceLifetime {
  /**
   * A new instance is created for each resolution
   */
  Transient,

  /**
   * A single instance is shared for all resolutions
   */
  Singleton,
}

/**
 * Valid token types for service identification
 */
export type ServiceToken = string | symbol;

/**
 * Describes a service registration in the container.
 */
export interface ServiceDescriptor<T> {
  /**
   * The token used to identify the service
   */
  token: ServiceToken;

  /**
   * The concrete implementation class
   */
  implementation: Constructor<T>;

  /**
   * The lifetime of the service
   */
  lifetime: ServiceLifetime;

  /**
   * Optional factory function to create the service
   */
  factory?: Factory<T>;
}

/**
 * Type for a constructor function that creates an instance of T
 */
export type Constructor<T> = new (...args: unknown[]) => T;

/**
 * Type for a factory function that creates an instance of T
 */
export type Factory<T> = () => T;
