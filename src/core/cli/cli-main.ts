import 'dotenv/config';
import 'reflect-metadata'; // Must be the first import for decorators
/**
 * @fileoverview Main CLI entry point for the roocode-generator application bundle.
 * Sets up dependency injection, parses command-line arguments via ApplicationContainer,
 * and runs the application. Implements top-level error handling.
 * This file serves as the entry point for the Vite build.
 */

import { resolveDependency } from '@core/di/utils';
import { ApplicationContainer } from '@core/application/application-container';
import { Container } from '@core/di/container';
import { registerServices } from '@core/di/registrations';
import { Result } from '@core/result/result';
import { ITreeSitterParserService } from '@core/analysis/interfaces'; // Import the interface
import { ILogger } from '@core/services/logger-service'; // Import ILogger
// Note: The #!/usr/bin/env node shebang is removed as this file is not directly executed by Node.
// It's the entry point for the bundle, which is then executed by bin/roocode-generator.js.

async function main(): Promise<void> {
  try {
    // Get container instance
    const container = Container.getInstance();

    // Register services
    registerServices();

    // Initialize the container AFTER registration
    container.initialize();

    // --- Initialize TreeSitterParserService ---
    // Resolve necessary services first
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    const treeSitterService = resolveDependency<ITreeSitterParserService>(
      container,
      'ITreeSitterParserService'
    );

    logger.info('Initializing TreeSitterParserService...');
    const initResult = treeSitterService.initialize();
    if (initResult.isErr()) {
      // Log the error message only, as the error object might cause issues with some logger transports
      logger.error(
        `Fatal: TreeSitterParserService initialization failed: ${initResult.error?.message ?? 'Unknown error'}. Exiting.`
      );
      process.exit(1); // Exit if critical service fails to initialize
    }
    logger.info('TreeSitterParserService initialized successfully.');
    // --- End TreeSitterParserService Initialization ---

    // Resolve ApplicationContainer AFTER container and critical services initialization
    const appContainer = resolveDependency<ApplicationContainer>(container, 'ApplicationContainer');

    // Run the main application workflow.
    // Argument parsing and command handling are done inside appContainer.run()
    const result: Result<void, Error> = await appContainer.run();

    if (result.isErr()) {
      // Use logger if available, otherwise console.error
      // Note: Logger might not be fully configured at this top level yet.
      console.error('Application failed:', result.error?.message ?? 'Unknown error occurred.');
      process.exit(1);
    } else {
      // Explicitly exit with 0 on success, although Node.js typically does this by default
      // when the event loop is empty. This ensures consistent exit behavior.
      process.exit(0);
    }
  } catch (error) {
    // Top-level error handling for unexpected errors during initialization or execution
    if (error instanceof Error) {
      console.error('Fatal error:', error.message);
      // Optionally log the stack trace for debugging in development environments
      // console.error(error.stack);
    } else {
      console.error('Fatal error:', String(error));
    }
    process.exit(1);
  }
}

// Execute main function
void main();
