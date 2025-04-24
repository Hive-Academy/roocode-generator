---
title: Programming Language Best Practices
version: 1.0.0
lastUpdated: 2025-04-24T16:06:38.700Z
sectionId: 5
applicableLanguages: [TypeScript, JavaScript]
relatedSections: []
---

## Programming Language Best Practices

### TypeScript Language Features

*   **Enable Strict Type Checking:** Utilize `tsconfig.json` strict options (`strict`, `noImplicitAny`, `strictNullChecks`, etc.) for maximum type safety.
*   **Prefer `const` over `let`:** Use `const` by default for immutability. Use `let` only when reassignment is necessary. Avoid `var`.
*   **Explicit Types:** Define types for variables, function parameters, and return values. Avoid `any` unless absolutely necessary and document its use.
    ```typescript
    // Good
    function greet(name: string): string {
      return `Hello, ${name}`;
    }

    // Avoid
    function process(data: any): any { /* ... */ }
    ```
*   **Use Interfaces for Public APIs:** Define shapes of objects, especially for public contracts (e.g., service interfaces, DTOs).
    ```typescript
    interface User {
      id: number;
      name: string;
    }
    ```
*   **Use Types for Unions, Intersections, Mapped Types:** Prefer `type` aliases for more complex type definitions.
    ```typescript
    type Status = 'pending' | 'processing' | 'completed';
    type UserWithStatus = User & { status: Status };
    ```
*   **Prefer String Enums:** Use string enums for better debugging and readability over numeric enums.
    ```typescript
    enum LogLevel {
      Info = 'INFO',
      Warn = 'WARN',
      Error = 'ERROR',
    }
    ```
*   **Use `readonly` for Immutability:** Mark properties as `readonly` where appropriate, especially in interfaces and classes.
    ```typescript
    interface Config {
      readonly apiKey: string;
      readonly timeout: number;
    }
    ```
*   **Leverage Utility Types:** Use built-in utility types like `Partial`, `Required`, `Readonly`, `Pick`, `Omit` to create new types from existing ones efficiently.
*   **Use ES Modules:** Employ `import` and `export` syntax for module management. Avoid `require`.
    ```typescript
    // Good
    import { LoggerService } from '../services/logger-service';
    export class MyService { /* ... */ }

    // Avoid
    // const LoggerService = require('../services/logger-service');
    // module.exports = MyService;
    ```

### Asynchronous Programming

*   **Prefer `async`/`await`:** Use `async`/`await` for cleaner asynchronous code over raw Promises or callbacks.
    ```typescript
    // Good
    async function fetchData(url: string): Promise<Data> {
      try {
        const response = await fetch(url);
        return await response.json();
      } catch (error) {
        // Handle error
        throw error;
      }
    }

    // Avoid (unless necessary)
    function fetchDataPromise(url: string): Promise<Data> {
      return fetch(url)
        .then(response => response.json())
        .catch(error => { /* Handle error */ throw error; });
    }
    ```
*   **Handle Promise Rejections:** Always handle potential errors in Promises, either with `try`/`catch` in `async` functions or `.catch()` on Promises.
*   **Avoid Mixing Async Styles:** Stick to `async`/`await` consistently within a function or module.

### Error Handling

*   **Use Custom Error Classes:** Extend the base `Error` class for specific error types to allow for granular error handling.
    ```typescript
    class FileNotFoundError extends Error {
      constructor(filePath: string) {
        super(`File not found: ${filePath}`);
        this.name = 'FileNotFoundError';
      }
    }
    ```
*   **Fail Fast:** Validate inputs and conditions early in functions to prevent errors later in the execution flow.
*   **Provide Context in Errors:** Include relevant information in error messages to aid debugging.
*   **Use `Result` Type for Predictable Errors:** Utilize the custom `Result<T, E>` type (seen in `core/result`) for operations that can predictably fail, distinguishing between success and error states without throwing exceptions for expected failures.
    ```typescript
    // Example usage (conceptual)
    async function readFile(path: string): Promise<Result<string, FileNotFoundError>> {
      try {
        const content = await fs.promises.readFile(path, 'utf-8');
        return Result.ok(content);
      } catch (err) {
        return Result.err(new FileNotFoundError(path));
      }
    }
    ```

### Code Structure and Readability

*   **Consistent Naming Conventions:**
    *   `PascalCase` for classes, interfaces, types, enums.
    *   `camelCase` for variables, functions, methods, properties.
    *   `UPPER_SNAKE_CASE` for constants (true constants, not just `const` variables).
    *   Prefix interfaces with `I` *only if* it's a widely adopted convention within the *specific* team/project context (otherwise, prefer no prefix).
*   **Keep Functions/Methods Small:** Aim for functions that do one thing well (Single Responsibility Principle). Refactor large functions.
*   **Use Meaningful Names:** Choose descriptive names for variables, functions, classes, etc. Avoid abbreviations unless widely understood.
*   **Write Purposeful Comments:** Explain *why* something is done, not *what* it does (the code should explain the 'what'). Document complex logic or non-obvious decisions.
*   **Organize Imports:** Group imports (e.g., standard libraries, third-party, internal modules). Use linters to enforce consistent ordering.

### Dependency Injection

*   **Use Decorators for Injection:** Leverage `@injectable()` and `@inject()` decorators (as seen in `core/di`) for class registration and dependency resolution.
    ```typescript
    import { injectable, inject } from '../core/di';
    import { LoggerService } from '../core/services/logger-service';
    import { SERVICE_IDENTIFIER } from '../core/di/constants'; // Assuming identifiers

    @injectable()
    export class MyService {
      constructor(
        @inject(SERVICE_IDENTIFIER.LoggerService) private logger: LoggerService
      ) {}

      doSomething() {
        this.logger.info('Doing something...');
      }
    }
    ```
*   **Define Interfaces for Services:** Inject dependencies based on interfaces (`interfaces.ts` files) rather than concrete classes to promote loose coupling.
*   **Register Dependencies Centrally:** Manage dependency registrations in dedicated files (e.g., `registrations.ts`) for clarity.

### Tooling Enforcement

*   **Use Linters and Formatters:** Enforce code style and catch potential errors using ESLint and Prettier. Integrate with pre-commit hooks (Husky) and CI pipelines.
*   **Adhere to `tsconfig.json`:** Ensure code compiles without errors according to the project's TypeScript configuration.