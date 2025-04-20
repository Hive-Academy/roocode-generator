# Template Management System Design

## 1. Overview

The Template Management System (TMS) is responsible for loading, validating, processing, and caching templates in the RooCode Generator. It must be type-safe, follow SOLID principles, use dependency injection, and handle errors explicitly with the Result type pattern as per ADR-0001.

---

## 2. Class Diagram

```mermaid
classDiagram
    class TemplateManager {
        - templateCache: Map<string, Template>
        - fs: IFileSystem
        - validator: IValidator
        - logger: ILogger
        + loadTemplate(name: string): Promise<Result<Template, TemplateError>>
        + validateTemplate(template: Template): Result<boolean, TemplateError>
        + processTemplate(template: Template, data: Record<string, unknown>): Result<string, TemplateError>
        + cacheTemplate(template: Template): void
        - validateVariables(variables: TemplateVariable[]): Result<boolean, TemplateError>
        - validateTemplateData(template: Template, data: Record<string, unknown>): Result<boolean, TemplateError>
        - processWithHandlebars(content: string, data: Record<string, unknown>): Result<string, TemplateError>
    }

    class Template {
        + content: string
        + metadata: TemplateMetadata
        + path: string
        + constructor(content: string, metadata: TemplateMetadata, path: string)
        + static fromFile(content: string, path: string): Result<Template, TemplateError>
    }

    class TemplateError {
        + message: string
        + templatePath: string
        + cause: Error | null
        + context: Record<string, unknown>
        + constructor(message: string, templatePath: string, cause?: Error | null, context?: Record<string, unknown>)
    }

    class TemplateMetadata {
        + name: string
        + version: string
        + description: string
        + variables: TemplateVariable[]
        + validationRules?: ValidationRule[]
    }

    class TemplateVariable {
        + name: string
        + type: "string" | "number" | "boolean" | "array"
        + description: string
        + required: boolean
        + defaultValue?: unknown
        + validation?: ValidationRule[]
    }

    class ValidationRule {
        + type: "required" | "enum" | "regex" | "custom"
        + value?: unknown
        + message: string
    }

    TemplateManager ..> IFileSystem : Injected
    TemplateManager ..> IValidator : Injected
    TemplateManager ..> ILogger : Injected
    TemplateManager --> Template : manages
    Template --> TemplateMetadata : has
    TemplateMetadata --> TemplateVariable : has
    TemplateVariable --> ValidationRule : has
    TemplateManager --> TemplateError : uses
```

---

## 3. Sequence Diagrams

### 3.1 Template Loading Process

```mermaid
sequenceDiagram
    participant Client
    participant TemplateManager
    participant Cache
    participant FileSystem
    participant Validator

    Client->>TemplateManager: loadTemplate(name)
    TemplateManager->>Cache: check templateCache.get(name)
    alt Template in cache
        Cache-->>TemplateManager: Template
        TemplateManager-->>Client: Result.ok(Template)
    else Template not in cache
        TemplateManager->>FileSystem: readFile(templatePath)
        FileSystem-->>TemplateManager: Result<string, Error>
        TemplateManager->>Template: fromFile(content, path)
        Template-->>TemplateManager: Result<Template, TemplateError>
        TemplateManager->>Validator: validateTemplate(template)
        Validator-->>TemplateManager: Result<boolean, TemplateError>
        TemplateManager->>Cache: cacheTemplate(template)
        TemplateManager-->>Client: Result.ok(Template)
    end
```

### 3.2 Template Validation Flow

```mermaid
sequenceDiagram
    participant TemplateManager
    participant Validator

    TemplateManager->>Validator: validateObject(template.metadata, TemplateMetadataSchema)
    Validator-->>TemplateManager: Result
    TemplateManager->>Validator: validateVariables(template.metadata.variables)
    Validator-->>TemplateManager: Result
    TemplateManager->>Validator: validateTemplateSyntax(template.content)
    Validator-->>TemplateManager: Result
    TemplateManager-->>Client: Result<boolean, TemplateError>
```

### 3.3 Template Processing with Variable Substitution

```mermaid
sequenceDiagram
    participant Client
    participant TemplateManager
    participant Validator
    participant HandlebarsEngine

    Client->>TemplateManager: processTemplate(template, data)
    TemplateManager->>Validator: validateTemplateData(template, data)
    Validator-->>TemplateManager: Result
    TemplateManager->>HandlebarsEngine: processWithHandlebars(template.content, data)
    HandlebarsEngine-->>TemplateManager: Result<string, TemplateError>
    TemplateManager-->>Client: Result<string, TemplateError>
```

### 3.4 Error Handling Scenario (Template Loading Failure)

```mermaid
sequenceDiagram
    participant Client
    participant TemplateManager
    participant FileSystem

    Client->>TemplateManager: loadTemplate(name)
    TemplateManager->>FileSystem: readFile(templatePath)
    FileSystem-->>TemplateManager: Result.err(Error)
    TemplateManager-->>Client: Result.err(TemplateError)
```

---

## 4. Interface Definitions

```typescript
// Template-related data structures
export interface TemplateMetadata {
  name: string;
  version: string;
  description: string;
  variables: TemplateVariable[];
  validationRules?: ValidationRule[];
}

export interface TemplateVariable {
  name: string;
  type: "string" | "number" | "boolean" | "array";
  description: string;
  required: boolean;
  defaultValue?: unknown;
  validation?: ValidationRule[];
}

export interface ValidationRule {
  type: "required" | "enum" | "regex" | "custom";
  value?: unknown;
  message: string;
}

// Template Manager Interface
export interface ITemplateManager {
  loadTemplate(name: string): Promise<Result<Template, TemplateError>>;
  validateTemplate(template: Template): Result<boolean, TemplateError>;
  processTemplate(template: Template, data: Record<string, unknown>): Result<string, TemplateError>;
  cacheTemplate(template: Template): void;
}

// TemplateError class
export class TemplateError extends Error {
  constructor(
    message: string,
    public readonly templatePath: string,
    public readonly cause: Error | null = null,
    public readonly context: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "TemplateError";
  }
}
```

---

## 5. Error Handling Strategy

- **Error Types**: Use a dedicated `TemplateError` class extending `Error` to encapsulate error message, template path, underlying cause, and contextual data.

- **Error Propagation**: All operations that can fail return a `Result<T, TemplateError>` type, enforcing explicit handling of success and failure cases.

- **Recovery Strategies**:
  - Cache hits avoid file system access, improving performance and reducing error surface.
  - Validation failures return detailed errors with context for diagnostics.
  - Processing errors wrap underlying template engine errors with context.
  - Clients can inspect `TemplateError` details to decide on retries, fallbacks, or user notifications.

---

## 6. Design Decisions and Rationale

- **Use of Result Type**: Ensures explicit error handling and avoids exceptions leaking unexpectedly, improving robustness and testability (per ADR-0001, docs/architecture/decisions/0001-typescript-oop-refactor.md:1-40).

- **Dependency Injection**: Injecting `IFileSystem`, `IValidator`, and `ILogger` promotes loose coupling and testability (docs/specs/template-management-system.md:70-140).

- **Template Caching**: Improves performance by avoiding repeated file reads and parsing (docs/specs/template-management-system.md:75-90).

- **Validation Layers**: Multi-step validation ensures template metadata, variables, and syntax correctness before processing (docs/specs/template-management-system.md:108-140).

- **Error Context**: Including context in errors aids debugging and operational monitoring (docs/specs/template-management-system.md:170-180).

---

## 7. Implementation Phases

1. Define interfaces and data structures.
2. Implement `Template` class with static `fromFile` method.
3. Implement `TemplateManager` with caching, loading, validation, and processing.
4. Implement `TemplateError` class.
5. Write unit tests for each component, focusing on error cases.
6. Integrate with DI container and logger.
7. Document usage and error handling guidelines.

---

## 8. References

- Template Management System Spec: `docs/specs/template-management-system.md:1-180`
- ADR-0001 TypeScript OOP Refactor: `docs/architecture/decisions/0001-typescript-oop-refactor.md:1-40`
- Error Handling System Spec: `docs/specs/error-handling-system.md:1-40`
- Result Type Implementation: `src/core/result/result.ts`
- DI Container Implementation: `src/core/di/container.ts`
