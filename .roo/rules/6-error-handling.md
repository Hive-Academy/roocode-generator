---
title: Error Handling
version: 1.0.0
lastUpdated: 2025-04-23T12:02:50.793Z
sectionId: 6
applicableLanguages: [TypeScript, JavaScript]
relatedSections: []
---

Okay, here are comprehensive coding rules and standards for error handling tailored to your TypeScript project using Langchain, Commander.js, Inquirer.js, and Reflect-metadata.

```markdown
# Error Handling Coding Rules and Standards

## 1. General Principles

1.1. **Fail Fast & Explicitly:** Errors should be detected and reported as early as possible. Avoid suppressing errors or letting them propagate silently.
1.2. **Clarity and Context:** Error messages must be clear, concise, and provide sufficient context to understand the problem (what failed, why, and relevant parameters/state). Distinguish between user-facing messages and internal logging messages.
1.3. **Consistency:** Adhere to these standards uniformly across the codebase for predictable error management.
1.4. **No Swallowed Errors:** Never ignore caught errors without logging or proper handling. Empty `catch` blocks are strictly forbidden unless explicitly justified with a comment explaining why the error is safely ignorable (rare).
1.5. **Avoid `any` for Errors:** When catching errors, use `unknown` and perform type checks (`instanceof`) or use specific types if possible within the catch block. Do not type caught errors as `any`.

```typescript
// Bad
try {
  // ... operation that might fail
} catch (e: any) { // Avoid 'any'
  console.error(e.message); // Might crash if e is not an Error object
}

// Good
try {
  // ... operation that might fail
} catch (error: unknown) {
  if (error instanceof Error) {
    logger.error(`Operation failed: ${error.message}`, { stack: error.stack });
    // Handle specific custom errors
    if (error instanceof ConfigError) {
      // ... handle config error
    }
  } else {
    // Handle non-Error exceptions (e.g., strings, numbers thrown)
    logger.error('An unexpected non-Error value was thrown:', { error });
  }
  // Re-throw, return a Result, or exit gracefully
}
```

## 2. Error Types and Custom Errors

2.1. **Use Custom Error Classes:** Define custom error classes inheriting from the built-in `Error` class for different categories of errors specific to the application's domain. Place these in relevant `errors.ts` files within modules (e.g., `src/core/file-operations/errors.ts`, `src/core/llm/errors.ts`) or in the central `src/core/errors/index.ts` for core errors.

2.2. **Base Application Error:** Consider defining a base `AppError` class that all other custom errors extend. This allows catching all application-specific errors easily.

```typescript
// src/core/errors/base-error.ts
export class AppError extends Error {
  public readonly timestamp: Date;
  public readonly context?: Record<string, unknown>;
  public readonly cause?: unknown; // Standard Error property

  constructor(message: string, options?: ErrorOptions & { context?: Record<string, unknown> }) {
    super(message, options);
    this.name = this.constructor.name; // Ensure correct error name
    this.timestamp = new Date();
    this.context = options?.context;
    // The 'cause' is automatically handled by the Error constructor if provided in options
    Error.captureStackTrace(this, this.constructor); // Maintain stack trace integrity
  }
}

// src/core/config/errors.ts
import { AppError } from '../errors/base-error';

export class ConfigError extends AppError {
  constructor(message: string, options?: ErrorOptions & { context?: Record<string, unknown> }) {
    super(message, options);
  }
}

export class LlmConfigError extends ConfigError {
  constructor(message: string, provider?: string, options?: ErrorOptions & { context?: Record<string, unknown> }) {
    super(message, { ...options, context: { ...(options?.context ?? {}), provider } });
  }
}

// src/core/llm/errors.ts
import { AppError } from '../errors/base-error';

export class LLMError extends AppError {
  constructor(message: string, options?: ErrorOptions & { context?: Record<string, unknown> }) {
    super(message, options);
  }
}

export class LLMApiError extends LLMError {
    constructor(message: string, provider: string, statusCode?: number, options?: ErrorOptions & { context?: Record<string, unknown> }) {
        super(message, { ...options, context: { ...(options?.context ?? {}), provider, statusCode } });
    }
}

export class LLMResponseParseError extends LLMError {
    constructor(message: string, rawResponse?: string, options?: ErrorOptions & { context?: Record<string, unknown> }) {
        super(message, { ...options, context: { ...(options?.context ?? {}), rawResponsePreview: rawResponse?.substring(0, 100) } });
    }
}

// src/core/file-operations/errors.ts (Example already exists)
// src/core/template-manager/errors.ts (Example already exists)
// src/core/di/errors.ts (Example already exists)
```

2.3. **Include Context in Errors:** When throwing custom errors, include relevant context (e.g., file paths, configuration keys, API endpoints, operation type) either in the message or as properties on the error object (using the `context` property in the base `AppError` example).

2.4. **Use `cause` for Error Chaining:** When catching an error and throwing a new, more specific one, use the `cause` option to preserve the original error's stack trace and context.

```typescript
// In src/core/config/llm-config.service.ts
import { FileOperationError } from '../file-operations/errors';
import { LlmConfigError } from './errors';
import { IFileOperations } from '../file-operations/interfaces';
// ... other imports

@injectable()
export class LlmConfigService {
  @inject(TYPES.FileOperations) private fileOps: IFileOperations;
  @inject(TYPES.LoggerService) private logger: ILogger;

  async loadConfig(filePath: string): Promise<Result<LlmConfig, LlmConfigError>> {
    try {
      const contentResult = await this.fileOps.readFile(filePath);
      if (contentResult.isErr()) {
         // Option 1: Wrap and throw (if Result pattern isn't used here)
         // throw new LlmConfigError(`Failed to read LLM config file: ${filePath}`, { cause: contentResult.error });

         // Option 2: Propagate error within Result pattern
         return err(new LlmConfigError(`Failed to read LLM config file: ${filePath}`, { cause: contentResult.error }));
      }
      // ... parse content ...
      // If parsing fails:
      // return err(new LlmConfigError('Failed to parse LLM config', { context: { filePath } }));

      // return ok(parsedConfig);
    } catch (error: unknown) {
      // Catch unexpected errors during processing
      const configError = new LlmConfigError(`Unexpected error loading LLM config: ${filePath}`, { cause: error });
      this.logger.error(configError.message, { error: configError });
      return err(configError);
    }
  }
}
```

## 3. Error Handling Patterns

3.1. **`try...catch` for Synchronous and Asynchronous Code:** Use `try...catch` blocks to handle exceptions in both synchronous functions and within `async` functions when using `await`.

3.2. **Catch Specific Errors:** Whenever possible, catch specific custom error types rather than generic `Error` or `unknown`. If catching `unknown`, use `instanceof` checks to handle different error types appropriately.

```typescript
// In src/core/llm/llm-agent.ts
async generate(prompt: string): Promise<Result<string, LLMError>> {
  try {
    const response = await this.langchainProvider.invoke(prompt);
    // ... process response ...
    return ok(processedResponse);
  } catch (error: unknown) {
    if (error instanceof LangchainSpecificNetworkError) { // Assuming Langchain throws specific errors
      const apiError = new LLMApiError(`Network error during LLM generation for provider ${this.providerName}`, this.providerName, undefined, { cause: error });
      this.logger.warn(apiError.message, { error: apiError });
      return err(apiError);
    } else if (error instanceof LangchainSpecificParsingError) {
       const parseError = new LLMResponseParseError(`Failed to parse LLM response for provider ${this.providerName}`, error.rawResponse, { cause: error });
       this.logger.error(parseError.message, { error: parseError });
       return err(parseError);
    } else if (error instanceof AppError) {
        // Handle other known application errors
        this.logger.error(`AppError during LLM generation: ${error.message}`, { error });
        return err(error); // Propagate known AppError types
    } else {
       // Handle truly unexpected errors
       const unexpectedError = new LLMError(`Unexpected error during LLM generation for provider ${this.providerName}`, { cause: error });
       this.logger.error(unexpectedError.message, { error: unexpectedError });
       return err(unexpectedError);
    }
  }
}
```

3.3. **Result Pattern (`src/core/result/result.ts`):** Utilize the `Result<T, E extends Error>` type for functions where failure is an expected outcome (e.g., validation, file not found, configuration lookup, potentially recoverable API calls).
    *   **When to Use:** Use `Result` for operations that can predictably fail without it being an exceptional circumstance. This makes the possibility of failure explicit in the function signature.
    *   **When to Throw:** Throw exceptions for truly *exceptional* circumstances: programming errors (e.g., invalid state, DI resolution failure), unrecoverable system issues (e.g., out of memory), or critical failures where the application cannot reasonably continue the current operation.
    *   **Checking Results:** Always check the result using `isOk()` or `isErr()` before accessing the value or error. Use `unwrap()` or `expect()` methods *only* when an error is considered fatal for the current context or has already been checked.

```typescript
// Example using Result pattern in src/core/file-operations/file-operations.ts

import { Result, ok, err } from '../result/result';
import { FileOperationError, FileNotFoundError, PermissionError } from './errors';
import * as fs from 'fs/promises';

@injectable()
export class FileOperations implements IFileOperations {
  async readFile(filePath: string): Promise<Result<string, FileOperationError>> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return ok(content);
    } catch (error: unknown) {
      if (error instanceof Error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return err(new FileNotFoundError(`File not found: ${filePath}`, { cause: error }));
        }
        if ((error as NodeJS.ErrnoException).code === 'EACCES') {
          return err(new PermissionError(`Permission denied for file: ${filePath}`, { cause: error }));
        }
        return err(new FileOperationError(`Failed to read file: ${filePath}`, { cause: error }));
      }
      return err(new FileOperationError(`An unexpected non-error was thrown while reading file: ${filePath}`, { cause: error }));
    }
  }

  // Consuming the Result
  async processConfigFile(configPath: string): Promise<void> {
      const configResult = await this.readFile(configPath);

      if (configResult.isErr()) {
          if (configResult.error instanceof FileNotFoundError) {
              this.logger.warn(`Configuration file not found at ${configPath}. Using defaults.`);
              // Use default config...
          } else {
              // Log and potentially re-throw or exit for other errors
              this.logger.error(`Failed to process config file: ${configResult.error.message}`, { error: configResult.error });
              throw configResult.error; // Or handle more gracefully depending on context
          }
          return;
      }

      const configContent = configResult.value;
      // ... process configContent ...
  }
}
```

## 4. Error Propagation

4.1. **Catch or Rethrow:** Functions should either handle an error completely (log it, return a default value, return a `Result.err`) or rethrow it (often wrapped in a more specific custom error using `cause`) for a higher layer to handle. Do not let errors implicitly bubble up without context.
4.2. **Boundary Handling:** Implement robust error handling at application boundaries:
    *   **CLI Commands (`src/commands/*`, `bin/roocode-generator.ts`):** Catch errors bubbling up from services/orchestrators. Log the detailed error and present a user-friendly message via the CLI (using `chalk` for formatting). Exit with appropriate status codes (e.g., non-zero for errors).
    *   **API Interactions (`src/core/llm/*`):** Catch errors from underlying libraries (e.g., Langchain SDKs) and wrap them in specific `LLMError` types.
    *   **File Operations (`src/core/file-operations/*`):** Catch `fs` errors and wrap them in `FileOperationError` types.
    *   **Configuration Loading (`src/core/config/*`):** Handle errors during loading/parsing and wrap them in `ConfigError`. Missing or invalid critical configuration might be a fatal error.
    *   **DI Container (`src/core/di/*`, `src/core/application/application-container.ts`):** Handle DI resolution errors. These usually indicate a setup or code issue and might be fatal.

```typescript
// Example in a Commander.js command handler (e.g., src/commands/memory-bank-command-handler.ts)
import { Command } from 'commander';
import { injectable, inject } from 'tsyringe';
import chalk from 'chalk';
import { TYPES } from '../core/di/types';
import { IMemoryBankGenerator } from '../memory-bank/interfaces';
import { ILogger } from '../core/services/interfaces';
import { AppError } from '../core/errors/base-error';

@injectable()
export class MemoryBankCommandHandler {
    @inject(TYPES.MemoryBankGenerator) private generator: IMemoryBankGenerator;
    @inject(TYPES.LoggerService) private logger: ILogger;

    public register(program: Command): void {
        program
            .command('memory-bank:generate')
            .description('Generate or update the memory bank')
            .action(async () => {
                try {
                    this.logger.info('Starting memory bank generation...');
                    const result = await this.generator.generate(); // Assume this returns Result<void, AppError>

                    if (result.isErr()) {
                        // Handle known errors gracefully
                        this.handleError(result.error);
                        process.exitCode = 1; // Indicate failure
                    } else {
                        console.log(chalk.green('Memory bank generation completed successfully.'));
                    }
                } catch (error: unknown) {
                    // Catch unexpected errors that might have been thrown instead of returned as Result
                    this.handleError(error);
                    process.exitCode = 1; // Indicate failure
                }
            });
    }

    private handleError(error: unknown): void {
        this.logger.error('Memory bank generation failed.', { error }); // Log detailed error

        if (error instanceof AppError) {
            // Provide more specific user feedback for known error types
            console.error(chalk.red(`Error: ${error.message}`));
            if (error.cause instanceof Error) {
                 console.error(chalk.gray(`  Reason: ${error.cause.message}`));
            }
            // Add specific handling based on error type if needed
            // if (error instanceof ConfigError) console.error(chalk.yellow('  Check your configuration files.'));
        } else if (error instanceof Error) {
            console.error(chalk.red(`An unexpected error occurred: ${error.message}`));
        } else {
            console.error(chalk.red('An unexpected non-error value was thrown. Check logs for details.'));
        }
    }
}
```

## 5. Logging and Reporting

5.1. **Use Centralized Logger:** Utilize the `LoggerService` (`src/core/services/logger-service.ts`) for all error logging.
5.2. **Log Sufficient Detail:** When logging an error, include the full error object (including `message`, `name`, `stack`, `cause`, and any custom properties like `context`).
5.3. **Appropriate Log Levels:** Log errors using `logger.error()`. Use `logger.warn()` for handled errors that indicate potential problems but don't stop the operation (e.g., falling back to defaults).
5.4. **User-Facing Messages:** Keep messages shown to the user (console output) clean, informative, and actionable. Avoid exposing stack traces or overly technical details unless explicitly requested (e.g., via a `--verbose` or `--debug` flag). Use `chalk` for better readability.

## 6. Framework-Specific Considerations

6.1. **Langchain:**
    *   Anticipate errors from API calls (network, rate limits, authentication, invalid requests).
    *   Anticipate errors from response parsing if the LLM output doesn't match the expected format.
    *   Wrap Langchain-specific errors in your custom `LLMError`, `LLMApiError`, or `LLMResponseParseError` types, capturing relevant context (provider, operation).
6.2. **Commander.js:**
    *   Use `.action(async (...) => ...)` for async command handlers and wrap the core logic in `try...catch`.
    *   Handle argument parsing errors (Commander often does this, but custom validation might throw).
    *   Use the boundary handling pattern described in 4.2 to report errors to the console.
6.3. **Inquirer.js:**
    *   Handle potential errors during the prompt interaction (e.g., user interruption `Ctrl+C`).
    *   Use the `validate` function in prompts to provide immediate feedback for invalid input, preventing progression until valid input is received. Return error messages from `validate`, not `true`.
6.4. **Reflect-metadata / DI (`tsyringe` likely):**
    *   Dependency resolution errors (`src/core/di/errors.ts`) often occur at application startup (`ApplicationContainer.configure`). Catch these early, log them, and provide a clear error message indicating a configuration or setup problem. These are typically fatal.

## 7. Testing

7.1. **Test Error Paths:** Write unit tests specifically for error conditions.
    *   Use `expect(...).toThrow(ExpectedErrorType)` for synchronous code or functions expected to throw.
    *   Use `expect(async () => { await functionUnderTest(); }).rejects.toThrow(ExpectedErrorType)` for async functions expected to throw.
    *   For functions returning `Result`, test the `isErr()` path and check the type and properties of the returned error: `expect(result.isErr()).toBe(true); expect(result.error).toBeInstanceOf(ExpectedErrorType);`.
7.2. **Mock Dependencies:** Mock dependencies (e.g., file system, LLM clients) to simulate failure scenarios (e.g., throw specific errors, return error Results) and verify that your code handles them correctly.
7.3. **Integration Tests:** Include integration tests that cover scenarios where errors propagate across multiple components (e.g., a command fails because the underlying LLM call fails).

By adhering to these rules, your project will have a robust, maintainable, and understandable error handling strategy. Remember to keep custom error types and handling logic organized within their respective modules.
```