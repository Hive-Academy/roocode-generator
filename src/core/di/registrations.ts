import { Container } from './container';

// Import module registration functions
import { registerCoreModule } from './modules/core-module';
import { registerLlmModule } from './modules/llm-module';
import { registerRulesModule } from './modules/rules-module';
import { registerMemoryBankModule } from './modules/memory-bank-module';
import { registerAppModule } from './modules/app-module';
import { registerAnalysisServices } from './modules/analysis-module'; // Added import

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
  registerAnalysisServices(container); // Added call

  // Optional: Add any remaining top-level or cross-cutting registrations here if needed
  // For example, if there were registrations not fitting into specific modules.
}

// resolveDependency function moved to src/core/di/utils.ts to break circular dependency
