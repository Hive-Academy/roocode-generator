---
title: Naming Conventions
version: 1.0.0
lastUpdated: 2025-04-24T16:05:56.460Z
sectionId: 3
applicableLanguages: [TypeScript, JavaScript]
relatedSections: []
---

## Naming Conventions

### General

*   Use descriptive and unambiguous names.
*   Favor readability over brevity. Avoid unclear abbreviations.
*   Maintain consistency across the codebase.

### Casing

*   **`camelCase`**: Variables, parameters, functions, methods.
*   **`PascalCase`**: Classes, interfaces, type aliases, enums, decorators.
*   **`UPPER_CASE`**: Constants (global or module-level immutable values), enum members.
*   **`kebab-case`**: File names, directory names, configuration file keys (where applicable, e.g., JSON keys).

### Files and Directories

*   Use `kebab-case` for all `.ts`, `.js`, and directory names within `src`.
    ```
    src/core/services/logger-service.ts
    src/generators/rules/rules-prompt-builder.ts
    src/memory-bank/
    ```
*   Test files should use the `.test.ts` or `.spec.ts` suffix (e.g., `logger-service.spec.ts`).
*   Configuration files (`.json`, `.js` at root) should follow their standard naming or use `kebab-case` (e.g., `roocode-config.json`, `jest.config.js`).

### TypeScript Specific

*   **Classes:**
    *   Use `PascalCase`.
    *   Use nouns or noun phrases.
    *   Append meaningful suffixes for roles (e.g., `Service`, `Handler`, `Generator`, `Manager`, `Provider`, `Processor`, `Builder`, `Validator`, `Analyzer`).
    ```typescript
    class ProjectAnalyzer { /* ... */ }
    class LlmConfigService { /* ... */ }
    class MemoryBankCommandHandler { /* ... */ }
    ```
*   **Interfaces:**
    *   Use `PascalCase`.
    *   Prefix with `I`.
    ```typescript
    interface IFileOperations {
      readFile(path: string): Promise<Result<string>>;
    }

    interface IGeneratorContext { /* ... */ }
    ```
*   **Type Aliases:**
    *   Use `PascalCase`.
    ```typescript
    type ProjectConfig = { /* ... */ };
    type AnalysisResult = Result<string[]>;
    ```
*   **Enums:**
    *   Use `PascalCase` for the enum name.
    *   Use `UPPER_CASE` for enum members.
    ```typescript
    enum LogLevel {
      INFO,
      WARN,
      ERROR,
    }

    enum GenerationStatus {
      PENDING,
      SUCCESS,
      FAILURE,
    }
    ```
*   **Functions & Methods:**
    *   Use `camelCase`.
    *   Names should clearly state their purpose, often starting with a verb.
    ```typescript
    function parseAnalysisResponse(response: string): AnalysisResult { /* ... */ }
    async function loadProjectConfiguration(): Promise<ProjectConfig> { /* ... */ }

    class LlmAgent {
      async generateResponse(prompt: string): Promise<Result<string>> { /* ... */ }
    }
    ```
*   **Variables & Parameters:**
    *   Use `camelCase`.
    *   Boolean variables should imply truthiness (e.g., `isValid`, `hasChanges`).
    ```typescript
    const maxTokens = 1024;
    let currentFilePath: string | null = null;
    function processFile(filePath: string, overwriteIfExists: boolean): void { /* ... */ }
    ```
*   **Constants:**
    *   Use `UPPER_CASE` with underscores. Define at the top level or export.
    ```typescript
    const DEFAULT_MODEL = 'gpt-4';
    export const MAX_RETRIES = 3;
    ```
*   **Private Members:**
    *   Use the `private` keyword. Do not use underscore (`_`) prefix for private members.
    ```typescript
    class TemplateManager implements ITemplateManager {
      private templates: Map<string, string> = new Map();

      private loadTemplate(name: string): Result<string> { /* ... */ }
    }
    ```
*   **Decorators:**
    *   Use `PascalCase`.
    ```typescript
    @Injectable()
    class MyService {
      constructor(@Inject('ILoggerService') private logger: ILoggerService) {}
    }