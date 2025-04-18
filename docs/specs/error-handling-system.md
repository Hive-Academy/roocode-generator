# Error Handling System Technical Specification

## Overview

The error handling system provides a consistent, type-safe approach to error management across the RooCode Generator. It uses an enhanced Result type pattern (per ADR-0001) to make error cases explicit and ensures proper error propagation and handling throughout the application.

## Core Components

### 1. Result Type

```typescript
// Enhanced Result type with generic error type
export class Result<T, E = Error> {
  private constructor(
    private readonly value: T | null,
    private readonly error: E | null
  ) {}

  // Factory methods
  static ok<T>(value: T): Result<T, never> {
    return new Result(value, null);
  }

  static err<E>(error: E): Result<never, E> {
    return new Result(null, error);
  }

  // Transformation methods
  map<U>(fn: (value: T) => U): Result<U, E> {
    return this.isOk() ? Result.ok(fn(this.value!)) : Result.err(this.error!);
  }

  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return this.isOk() ? fn(this.value!) : Result.err(this.error!);
  }

  // Value access
  unwrapOr(defaultValue: T): T {
    return this.isOk() ? this.value! : defaultValue;
  }

  // State checks
  isOk(): boolean {
    return this.error === null;
  }
  isErr(): boolean {
    return this.error !== null;
  }
}
```

### 2. Error Hierarchy

```typescript
// Base error class with enhanced context
export class RooCodeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
  }

  // Enhanced error context handling
  withContext(additionalContext: Record<string, unknown>): RooCodeError {
    return new RooCodeError(
      this.message,
      this.code,
      { ...this.context, ...additionalContext },
      this.cause
    );
  }
}

// Specific error types with enhanced context
export class ValidationError extends RooCodeError {
  constructor(message: string, context?: Record<string, unknown>, cause?: Error) {
    super(message, "VALIDATION_ERROR", context, cause);
  }
}

export class GeneratorError extends RooCodeError {
  constructor(
    message: string,
    public readonly generatorName: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, "GENERATOR_ERROR", { ...context, generatorName }, cause);
  }
}
```

## Usage Patterns

### 1. Function Return Types

```typescript
// Interface definitions with explicit error types
export interface IFileSystem {
  readFile(path: string): Promise<Result<string, RooCodeError>>;
  writeFile(path: string, content: string): Promise<Result<void, RooCodeError>>;
  deleteFile(path: string): Promise<Result<void, RooCodeError>>;
}

// Implementation example with enhanced error handling
export class FileSystem implements IFileSystem {
  async readFile(path: string): Promise<Result<string, RooCodeError>> {
    try {
      const content = await fs.promises.readFile(path, "utf8");
      return Result.ok(content);
    } catch (error) {
      return Result.err(
        new RooCodeError(
          `Failed to read file: ${path}`,
          "FILE_READ_ERROR",
          { path },
          error instanceof Error ? error : undefined
        )
      );
    }
  }
}
```

### 2. Error Propagation

```typescript
export class ConfigService {
  constructor(
    @Inject("IFileSystem") private readonly fs: IFileSystem,
    @Inject("ILogger") private readonly logger: ILogger
  ) {}

  async loadConfig(path: string): Promise<Result<Config, RooCodeError>> {
    const contentResult = await this.fs.readFile(path);
    if (contentResult.isErr()) {
      return Result.err(
        new ConfigurationError("Failed to load configuration", { path }, contentResult.error)
      );
    }

    try {
      const config = JSON.parse(contentResult.unwrapOr(""));
      return Result.ok(config);
    } catch (error) {
      return Result.err(
        new ConfigurationError(
          "Invalid configuration format",
          { path, content: contentResult.unwrapOr("") },
          error instanceof Error ? error : undefined
        )
      );
    }
  }
}
```

### 3. Error Handling in Services

```typescript
@Injectable()
export class GeneratorService {
  async generate(config: ProjectConfig): Promise<Result<void, GeneratorError>> {
    const templateResult = await this.loadTemplate();
    if (templateResult.isErr()) {
      this.logger.error("Template loading failed", templateResult.error);
      return templateResult;
    }

    return await this.processTemplate(templateResult.unwrapOr(""), config).flatMap((content) =>
      this.writeOutput(content)
    );
  }
}
```

## Testing Support

```typescript
describe("Error Handling", () => {
  it("should handle successful operations", async () => {
    const result = await operation();
    expect(result.isOk()).toBe(true);
    expect(result.unwrapOr(null)).toBeDefined();
  });

  it("should handle errors with context", async () => {
    const result = await failingOperation();
    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(RooCodeError);
    expect(result.error.context).toBeDefined();
  });
});
```

## Error Recovery Patterns

### 1. Default Values

```typescript
const configResult = await loadConfig();
const config = configResult.unwrapOr(DEFAULT_CONFIG);
```

### 2. Error Transformation

```typescript
const result = await operation()
  .map((value) => processValue(value))
  .flatMap((value) => validateValue(value));
```

### 3. Fallback Strategies

```typescript
async function loadConfigWithFallback(): Promise<Result<Config, RooCodeError>> {
  return await loadConfig("config.json")
    .flatMap((config) => validateConfig(config))
    .map((config) => enrichConfig(config))
    .unwrapOr(DEFAULT_CONFIG);
}
```

## Implementation Guidelines

1. Always use Result<T, E> for operations that can fail
2. Prefer specific error types over generic Error
3. Include relevant context with all errors
4. Use flatMap for chaining operations that return Result
5. Provide meaningful default values with unwrapOr
6. Add comprehensive error handling tests

## Migration Guide

### 1. Update Return Types

```typescript
// Before
async function readConfig(): Promise<Config> {
  const content = await fs.readFile("config.json");
  return JSON.parse(content);
}

// After
async function readConfig(): Promise<Result<Config, RooCodeError>> {
  try {
    const content = await fs.readFile("config.json");
    return Result.ok(JSON.parse(content));
  } catch (error) {
    return Result.err(
      new ConfigurationError(
        "Failed to read config",
        { path: "config.json" },
        error instanceof Error ? error : undefined
      )
    );
  }
}
```

### 2. Update Error Handling

```typescript
// Before
try {
  const config = await readConfig();
  // Use config
} catch (error) {
  console.error("Error:", error);
}

// After
const result = await readConfig();
if (result.isErr()) {
  logger.error("Failed to read config", result.error);
  return result;
}
const config = result.unwrapOr(DEFAULT_CONFIG);
```

## Success Criteria

1. No usage of try/catch for control flow
2. All errors properly typed and contextualized
3. Consistent use of Result type across codebase
4. Comprehensive error handling test coverage
5. Clear error messages and context in logs
6. Proper error recovery strategies in place

## References

- ADR-0001: TypeScript OOP Refactoring
- TypeScript Strict Mode Documentation
- Error Handling Best Practices
