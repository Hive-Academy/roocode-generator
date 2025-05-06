import { Container } from './container';

/**
 * Helper function to resolve dependencies from the container with error handling.
 */
export function resolveDependency<T>(container: Container, token: string): T {
  const result = container.resolve<T>(token);
  if (result.isErr()) {
    const err = result.error;
    // Log the error or handle it appropriately before throwing
    console.error(`DI Resolution Error for token '${token}':`, err); // Basic logging
    if (err instanceof Error) {
      throw err; // Re-throw the original error if it's an Error instance
    } else {
      // Wrap non-Error types in a new Error for consistent stack traces
      throw new Error(`DI Resolution Failed for token '${token}': ${String(err)}`);
    }
  }
  const value = result.value;
  if (value === undefined || value === null) {
    // Check for undefined or null specifically
    throw new Error(`Dependency '${token}' resolved to null or undefined. Check registration.`);
  }
  return value;
}

/**
 * Asserts that a value is defined (not undefined).
 * Throws an error if the value is undefined.
 */
export function assertIsDefined<T>(value: T | undefined, message: string): asserts value is T {
  if (value === undefined) {
    throw new Error(message);
  }
}
