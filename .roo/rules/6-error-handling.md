---
title: Error Handling
version: 1.0.0
lastUpdated: 2025-04-23T18:20:39.509Z
sectionId: 6
applicableLanguages: [TypeScript, JavaScript]
relatedSections: []
---

## Error Handling Rules

### Custom Error Classes

*   **Define Specific Errors:** Create custom error classes inheriting from `Error` for distinct error conditions (e.g., `ConfigurationError`, `FileAccessError`, `LLMResponseError`, `DIResolutionError`).
    *   Utilize existing custom error files: `src/core/di/errors.ts`, `src/core/file-operations/errors.ts`, `src/core/template-manager/errors.ts`.
    *   Ensure custom errors include relevant context (e.g., file path, configuration key).
    ```typescript
    // Example: src/core/config/errors.ts
    export class InvalidConfigError extends Error {
      constructor(key: string, value: unknown, message: string) {
        super(`Invalid config for key "${key}": ${message}. Received: ${value}`);
        this.name = 'InvalidConfigError';
      }
    }
    ```
*   **Group by Domain:** Organize custom errors logically within their respective domains (e.g., `llm/errors.ts`, `config/errors.ts`).
*   **Use `instanceof`:** Check for specific error types using `instanceof` in `catch` blocks for tailored handling.

### Result Pattern for Expected Failures

*   **Use `Result<T, E>`:** Employ the `Result` type (`src/core/result/result.ts`) for functions that can fail predictably (e.g., file parsing, data validation, API calls that might return specific non-2xx codes).
    *   `Ok<T>` represents success with value `T`.
    *   `Err<E>` represents a known failure with error details `E` (often a custom error instance).
*   **Avoid Exceptions for Flow Control:** Do not use `throw` for expected, non-exceptional failure conditions that can be represented by `Err`.
*   **Propagate `Result`:** Functions calling methods that return `Result` should typically propagate the `Result` type upwards or handle the `Err` state explicitly.
    ```typescript
    // Example: Function signature
    async function parseConfigFile(filePath: string): Promise<Result<Config, FileAccessError | InvalidConfigError>> {
      // ... implementation returning Ok(config) or Err(error)
    }
    ```
*   **Handle `Result` Explicitly:** Check the state of a `Result` using `.isOk()` or `.isErr()` before accessing its value or error.

### Exception Handling for Unexpected Errors

*   **Use `try...catch` Sparingly:** Reserve `try...catch` for genuinely unexpected runtime errors (e.g., programming bugs, unrecoverable system issues) or at boundaries (e.g., main entry point, API handlers).
*   **Catch Specific Errors First:** In `try...catch` blocks, catch more specific custom errors before generic `Error`.
*   **Avoid Swallowing Errors:** Do not use empty `catch` blocks. At minimum, log the error.
*   **Rethrow When Appropriate:** If an error cannot be handled locally, rethrow it (potentially wrapped in a more specific error) or convert it to an `Err` result if transitioning to the `Result` pattern.

### Asynchronous Error Handling

*   **Await Promises:** Always use `await` within `async` functions when calling promise-returning functions (including those returning `Promise<Result<T, E>>`).
*   **Handle Promise Rejections:** Use `.catch()` on promises or `try...catch` with `await` to handle rejected promises. Ensure all promise chains have error handling.
*   **Use `Promise.allSettled`:** Prefer `Promise.allSettled` over `Promise.all` when multiple independent async operations can fail, allowing you to process partial successes and failures.

### Error Logging

*   **Log All Caught Errors:** Log errors caught in `catch` blocks or extracted from `Err` results using the `LoggerService`.
*   **Include Context:** Log relevant contextual information (e.g., operation being performed, input parameters) alongside the error message and stack trace.
*   **Use Appropriate Log Levels:** Log errors at `error` level. Use `warn` for handled `Err` states if they represent significant but non-fatal issues.

### CLI Error Presentation

*   **User-Friendly Messages:** Catch errors at the command handler level (`src/commands`) and present clear, user-friendly error messages using `chalk` and the `LoggerService`. Avoid exposing raw stack traces to the end-user unless in debug mode.
*   **Graceful Exit:** Use `process.exit(1)` after reporting a fatal error in the CLI entry point (`bin/roocode-generator.ts`) or command handlers.
*   **Leverage Commander/Inquirer:** Utilize built-in error handling features of `Commander.js` and `Inquirer.js` where applicable.

### Third-Party Error Handling

*   **Wrap External Errors:** Catch errors from external libraries (Langchain, filesystem APIs, etc.) and wrap them in appropriate custom domain errors. This prevents leaking implementation details and provides consistent error types.
    ```typescript
    try {
      await fs.promises.readFile(filePath);
    } catch (error) {
      // Wrap the Node FS error
      return Err(new FileAccessError(filePath, error instanceof Error ? error.message : String(error)));
    }
    ```
*   **Handle Known API Errors:** Specifically handle known error codes or types from Langchain or other APIs (e.g., rate limiting, authentication failure, model not found). Convert these into specific custom errors or `Err` results.