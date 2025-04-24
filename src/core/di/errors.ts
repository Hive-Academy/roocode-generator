/**
 * Base class for dependency injection related errors
 */
export class DIError extends Error {
  constructor(
    message: string,
    public readonly code: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Error thrown when a dependency cannot be resolved
 */
export class DependencyResolutionError extends DIError {
  constructor(
    public readonly token: string,
    message: string,
    public readonly cause?: Error
  ) {
    super(`Failed to resolve dependency '${token}': ${message}`, 'DEPENDENCY_RESOLUTION_ERROR');

    if (cause) {
      this.cause = cause;
    }
  }
}

/**
 * Error thrown when a circular dependency is detected
 */
export class CircularDependencyError extends DIError {
  constructor(public readonly dependencyChain: string[]) {
    super(
      `Circular dependency detected: ${dependencyChain.join(' -> ')}`,
      'CIRCULAR_DEPENDENCY_ERROR'
    );
  }
}

/**
 * Error thrown when attempting to register a service with an invalid configuration
 */
export class ServiceRegistrationError extends DIError {
  constructor(
    public readonly token: string,
    message: string
  ) {
    super(`Failed to register service '${token}': ${message}`, 'SERVICE_REGISTRATION_ERROR');
  }
}

/**
 * Error thrown when attempting to use container features before initialization
 */
export class ContainerNotInitializedError extends DIError {
  constructor() {
    super('Container must be initialized before use', 'CONTAINER_NOT_INITIALIZED_ERROR');
  }
}
