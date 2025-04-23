---
title: Programming Language Best Practices
version: 1.0.0
lastUpdated: 2025-04-23T18:22:42.598Z
sectionId: 11
applicableLanguages: [TypeScript, JavaScript]
relatedSections: []
---

# Programming Language Best Practices (TypeScript/JavaScript)

## TypeScript Usage

- **Strict Typing:** Enable and adhere to `strict` mode in `tsconfig.json`.
- **Type Safety:** Avoid `any`. Prefer `unknown` with type guards or specific types.

  ```typescript
  // Avoid
  function process(data: any) {
    /* ... */
  }

  // Prefer
  function process(data: unknown) {
    if (typeof data === "string") {
      // ... handle string
    }
  }
  ```

- **Interfaces vs. Types:** Use `interface` for defining the shape of objects and public APIs. Use `type` for aliases, unions, intersections, and complex types.

  ```typescript
  interface UserProfile {
    userId: string;
    displayName: string;
  }

  type Result<T> = { success: true; value: T } | { success: false; error: Error };
  ```

- **Immutability:** Use `readonly` for properties and `ReadonlyArray<T>` or `readonly T[]` for arrays that should not be mutated.
  ```typescript
  interface Config {
    readonly apiKey: string;
    readonly features: readonly string[];
  }
  ```
- **Explicit Returns:** Always specify explicit return types for functions and methods.
- **Enums:** Use `enum` for fixed sets of related constants. Prefer string enums for better debuggability unless performance is critical.
  ```typescript
  enum LogLevel {
    Info = "INFO",
    Warning = "WARN",
    Error = "ERROR",
  }
  ```
- **Generics:** Utilize generics for creating reusable, type-safe functions and classes.
- **Decorators:** Use decorators (`@injectable`, `@inject`) purposefully for Dependency Injection via `reflect-metadata`. Keep decorators focused.

## Asynchronous Programming

- **`async`/`await`:** Consistently use `async`/`await` for handling Promises. Avoid mixing `.then()`/`.catch()` with `await` in the same function scope.
  ```typescript
  // Prefer
  async function fetchData(url: string): Promise<Result<string>> {
    try {
      const response = await fetch(url);
      if (!response.ok) return Result.failure(new Error(`HTTP error: ${response.status}`));
      const data = await response.text();
      return Result.success(data);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error("Fetch failed"));
    }
  }
  ```
- **Error Handling:** Always handle Promise rejections using `try...catch` blocks with `async`/`await`.
- **Concurrency:** Use `Promise.all()` for parallel independent tasks and `Promise.allSettled()` when results of all promises are needed, regardless of success or failure.

## Error Handling

- **Custom Errors:** Define specific error classes extending a base application error type. Avoid throwing generic `Error` or strings. Place these in designated error files (e.g., `src/core/errors/index.ts`, `src/core/file-operations/errors.ts`).
  ```typescript
  class FileOperationError extends Error {
    constructor(
      message: string,
      public readonly path?: string
    ) {
      super(message);
      this.name = "FileOperationError";
    }
  }
  ```
- **Result Type:** Use the project's `Result<T, E>` type (`src/core/result/result.ts`) for functions that can fail predictably, clearly separating success and error paths.
  ```typescript
  function readFile(path: string): Result<string, FileOperationError> {
    // ... implementation
  }
  ```

## Modularity and Design

- **Single Responsibility Principle (SRP):** Ensure classes and functions have one, well-defined responsibility.
- **Dependency Injection (DI):** Use constructor injection for dependencies. Annotate classes with `@injectable` and constructor parameters with `@inject`.

  ```typescript
  import { injectable, inject } from "tsyringe";

  @injectable()
  class MyService {
    constructor(@inject(LoggerService) private logger: ILoggerService) {}
    // ...
  }
  ```

- **Interfaces:** Define interfaces (`interfaces.ts`) for services and components to promote loose coupling and testability. Depend on abstractions (interfaces), not concrete implementations.
- **Organization:** Keep related logic together. Organize types/interfaces close to their usage or in dedicated `types.ts`/`interfaces.ts` files within component directories (e.g., `src/core/config/interfaces.ts`).

## Naming Conventions

- **`PascalCase`:** Classes, interfaces, types, enums.
- **`camelCase`:** Variables, functions, methods, parameters.
- **`UPPER_SNAKE_CASE`:** Constants, enum members (if not string enums).
- **File Names:** Use `kebab-case.ts` (e.g., `project-analyzer.ts`, `logger-service.ts`).

## Code Style & Formatting

- **Tooling:** Strictly follow the rules defined in ESLint (`eslint.config.js`) and Prettier (`.prettierrc`).
- **Automation:** Ensure linters and formatters run automatically before commits (via Husky).

## Comments & Documentation

- **JSDoc:** Use `/** ... */` for all exported/public classes, methods, functions, types, and interfaces. Document complex internal logic sparingly.
- **Clarity:** Write comments to explain the _why_, not the _what_. Avoid commenting obvious code.
