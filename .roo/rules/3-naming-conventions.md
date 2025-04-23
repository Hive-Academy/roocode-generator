---
title: Naming Conventions
version: 1.0.0
lastUpdated: 2025-04-23T18:19:21.290Z
sectionId: 3
applicableLanguages: [TypeScript, JavaScript]
relatedSections: []
---

# Naming Conventions

## General Casing

- **`camelCase`**: Variables, parameters, functions, methods, object properties.
  ```typescript
  const itemCount = 5;
  function processUserData(userProfile: UserProfile) {}
  class DataHandler {
    processItem(itemData: any) {}
  }
  ```
- **`PascalCase`**: Classes, interfaces, type aliases, enums, decorators.
  ```typescript
  class ProjectAnalyzer {}
  interface ILoggerService {} // Or LoggerService if I-prefix is not used team-wide
  type ProjectConfig = { /* ... */ };
  enum LogLevel { Info, Warn, Error }
  @Injectable()
  ```
- **`SCREAMING_SNAKE_CASE`**: Global constants, enum members (optional, PascalCase preferred for members).
  ```typescript
  const MAX_RETRIES = 3;
  enum Status {
    PENDING,
    COMPLETED,
  } // PascalCase preferred
  enum Status {
    PENDING,
    COMPLETED,
  } // SCREAMING_SNAKE_CASE acceptable
  ```
- **`kebab-case`**: File names, configuration keys (e.g., in JSON/YAML), CLI commands/options.

  ```
  // File name
  project-analyzer.ts

  // package.json script
  "lint:fix": "eslint --fix"

  // Commander.js command
  program.command('generate-rules');
  ```

## File Naming

- Use `kebab-case`.
- Be descriptive and reflect the primary export's purpose.
- Use suffixes for common types:
  - `.service.ts` (e.g., `logger-service.ts`)
  - `.controller.ts` / `.handler.ts` (e.g., `memory-bank-command-handler.ts`)
  - `.generator.ts` (e.g., `rules-generator.ts`)
  - `.manager.ts` (e.g., `template-manager.ts`)
  - `.processor.ts` (e.g., `rules-content-processor.ts`)
  - `.builder.ts` (e.g., `rules-prompt-builder.ts`)
  - `.analyzer.ts` (e.g., `project-analyzer.ts`)
  - `.parser.ts` (e.g., `response-parser.ts`)
  - `.validator.ts` (e.g., `memory-bank-validator.ts`)
  - `.registry.ts` (e.g., `provider-registry.ts`)
  - `.config.ts` (e.g., `llm-config.service.ts`)
  - `.interface.ts` or `interfaces.ts` (for multiple interfaces)
  - `.type.ts` or `types.ts` (for multiple types)
  - `.enum.ts` (if dedicated file)
  - `.decorator.ts` or `decorators.ts` (for custom decorators)
  - `.constants.ts`
  - `.utils.ts`
  - `.spec.ts` or `.test.ts` (for tests, colocated or in `testDir`)
- Use `index.ts` for barrel exports within a directory.

## Variables and Constants

- Use `camelCase` for mutable variables (`let`) and non-constant values (`const`).
- Use `SCREAMING_SNAKE_CASE` for true constants (unchanging, globally significant values).
  ```typescript
  const defaultOutputPath = "./output"; // Configurable/derived, use camelCase
  const PI = 3.14159; // True constant
  ```
- Avoid single-letter names except for simple loop counters (`i`, `j`, `k`).
- Boolean variables should sound like questions (e.g., `isActive`, `hasData`).

## Functions and Methods

- Use `camelCase`.
- Names should be verbs or verb phrases describing the action (e.g., `getUserData`, `calculateTotal`).
- Prefix with `is`, `has`, `should` for functions returning booleans (e.g., `isValidInput`).
- Private/protected methods (conceptual or using `#` / `private` / `protected`) may optionally use a leading underscore `_` if not using `#`. Prefer TS access modifiers or `#`.

  ```typescript
  class DataProcessor {
    // Preferred
    private processInternal(): void {}
    #processInternal(): void {}

    // Acceptable if consistent
    protected _initialize(): void {}
  }
  ```

## Classes

- Use `PascalCase`.
- Names should be nouns or noun phrases representing the object (e.g., `ProjectAnalyzer`, `LLMAgent`).
- Follow file naming suffixes where applicable (e.g., `LoggerService` class in `logger-service.ts`).

## Interfaces and Type Aliases

- Use `PascalCase`.
- Avoid `I` prefix for interfaces (e.g., prefer `LoggerService` over `ILoggerService`). If `I` prefix is used, apply consistently.
- Use `Type` or `Props` suffix for type aliases if needed for clarity, especially for component properties or complex structures.
  ```typescript
  interface ProjectConfig {
    /* ... */
  }
  type GeneratorOptions = {
    /* ... */
  };
  type UserProfileProps = {
    /* ... */
  }; // Example for component props
  ```

## Enums

- Use `PascalCase` for enum names.
- Use `PascalCase` (preferred) or `SCREAMING_SNAKE_CASE` for enum members. Be consistent.
  ```typescript
  // Preferred
  enum TaskStatus {
    Pending,
    InProgress,
    Completed,
  }
  // Acceptable
  enum TaskStatus {
    PENDING,
    IN_PROGRESS,
    COMPLETED,
  }
  ```

## Decorators

- Use `PascalCase` for custom decorator names.
  ```typescript
  // di/decorators.ts
  export function Injectable(): ClassDecorator {
    /* ... */
  }
  export function Inject(token: symbol): ParameterDecorator {
    /* ... */
  }
  ```
