import { Container } from './container';

// Import module registration functions
import { registerCoreModule } from './modules/core-module';
import { registerLlmModule } from './modules/llm-module';
import { registerRulesModule } from './modules/rules-module';
import { registerMemoryBankModule } from './modules/memory-bank-module';
import { registerAppModule } from './modules/app-module';

/**
 *  @description Registers services with the DI container by calling modular registration functions.
 *  This function should be called once at application startup to set up the DI container.
 * @returns {void}
 */
export function registerServices(): void {
  const container = Container.getInstance();

  // Call registration functions from each module
  registerCoreModule(container);
  registerLlmModule(container);
  registerRulesModule(container);
  registerMemoryBankModule(container);
  registerAppModule(container);

  // Optional: Add any remaining top-level or cross-cutting registrations here if needed
  // For example, if there were registrations not fitting into specific modules.
}

/**
 * Helper function to resolve dependencies from the container with error handling.
 * This remains here as it might be used by the modules or future registrations.
 * Consider moving it to a more general utility location if appropriate.
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
    // Include container state or token info for better debugging context if possible
    // Note: Container class might need a method like `hasToken(token)` or `getRegisteredTokens()` for better diagnostics.
    throw new Error(`Dependency '${token}' resolved to null or undefined. Check registration.`);
  }
  return value;
}
