#!/usr/bin/env node
import "dotenv/config";
import "reflect-metadata"; // Must be the first import for decorators
/**
 * @fileoverview Main CLI entry point for the roocode-generator application.
 * Sets up dependency injection, parses command-line arguments, and runs the application.
 * Implements top-level error handling and user-friendly CLI interface.
 */

import { ApplicationContainer } from "../src/core/application/application-container";
import { Container } from "../src/core/di/container";
import { registerServices, resolveDependency } from "../src/core/di/registrations";
import { Result } from "../src/core/result/result";

async function main(): Promise<void> {
  try {
    // Get container instance
    const container = Container.getInstance();

    // Register services
    registerServices();

    // Initialize the container AFTER registration
    container.initialize();

    // Resolve ApplicationContainer AFTER initialization
    const appContainer = resolveDependency<ApplicationContainer>(container, "ApplicationContainer");
    // const cliInterface = resolveDependency<ICliInterface>(container, "ICliInterface"); // No longer needed here

    // Run the main application workflow.
    // Argument parsing and command handling are now done inside appContainer.run()
    const result: Result<void, Error> = await appContainer.run();

    if (result.isErr()) {
      // Use logger if available, otherwise console.error
      // Note: Logger might not be fully configured at this top level yet.
      console.error("Application failed:", result.error?.message ?? "Unknown error occurred.");
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    // Top-level error handling for unexpected errors
    if (error instanceof Error) {
      console.error("Fatal error: ", error.message);
    } else {
      console.error("Fatal error: ", String(error));
    }
    process.exit(1);
  }
}

// Execute main function
main();
