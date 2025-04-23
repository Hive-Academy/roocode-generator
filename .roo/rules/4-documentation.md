---
title: Documentation
version: 1.0.0
lastUpdated: 2025-04-23T18:19:45.856Z
sectionId: 4
applicableLanguages: [TypeScript, JavaScript]
relatedSections: []
---

## Documentation Rules

### General

*   Use TSDoc (`/** ... */`) for all documentation comments.
*   Write documentation in English.
*   Start comments with a concise summary of the element's purpose.
*   Use active voice (e.g., "Gets the user" instead of "User is gotten").
*   Document all exported members (classes, functions, variables, types, interfaces).
*   Keep comments aligned with the code. Update docs when code changes.

### TSDoc Syntax & Tags

*   Use standard TSDoc tags (`@param`, `@returns`, `@throws`, `@template`, `@see`, `@deprecated`, `@remarks`, `@default`, `@example`).
*   Place the main description before any tags.
*   Use `@param {type} name - Description.` for function/method parameters.
*   Use `@returns {type} Description.` for return values.
    *   Clearly document the `Success` and `Error` types for `Result<S, E>` return values.
    ```typescript
    /**
     * Fetches project configuration.
     * @returns {Promise<Result<ProjectConfig, ConfigurationError>>} The project config or an error.
     */
    ```
*   Use `@throws {ErrorType} Description.` only for synchronous errors not handled by `Result`.
*   Use `@example` for non-trivial usage patterns.
*   Use `@remarks` for supplementary details, caveats, or implementation notes.
*   Use `@see` to link to related items.

### Files / Modules

*   Include a file-level comment (`/** @fileoverview ... */`) at the top of significant files explaining their overall purpose and responsibility.
    ```typescript
    /**
     * @fileoverview Defines the main dependency injection container setup.
     */
    import 'reflect-metadata';
    // ... rest of file
    ```

### Classes, Interfaces, and Type Aliases

*   Document the purpose and responsibility of each class, interface, and complex type alias.
*   Use `@template T` to document generic type parameters.
    ```typescript
    /**
     * Represents a generic operation result.
     * @template S The type of the success value.
     * @template E The type of the error value.
     */
    export type Result<S, E> = Success<S, E> | Failure<S, E>;

    /**
     * Manages interactions with Large Language Models (LLMs).
     * Responsible for selecting providers and executing prompts.
     * @injectable // Indicate it's part of the DI system
     */
    export class LLMAgent { /* ... */ }
    ```

### Methods and Functions

*   Document the purpose of every public method and function.
*   Document every parameter using `@param`.
*   Document the return value using `@returns`, including Promises and `Result` types.
*   Document complex algorithms or non-obvious logic within the description or using `@remarks`.

### Properties and Constants

*   Document the purpose of public properties and constants.
*   Use `@default` to specify the default value if applicable.
    ```typescript
    /**
     * Maximum number of retries for LLM calls.
     * @default 3
     */
    const MAX_LLM_RETRIES = 3;
    ```

### Framework/Library Specifics

*   **DI (`reflect-metadata`, Custom DI):**
    *   Document the role of `@injectable` classes.
    *   Briefly explain the purpose of `@inject` dependencies if not obvious from the type/name.
*   **Commander.js:**
    *   Use clear descriptions in `.command()`, `.description()`, `.option()`, and `.argument()`. These often serve as user-facing documentation.
    ```typescript
    program
      .command('generate <type>')
      .description('Generate code snippets or configurations.')
      .option('-o, --output <path>', 'Specify output directory');
    ```
*   **Langchain:**
    *   Document the purpose of specific Chains or Agents.
    *   Document the expected input schema and output format for Chains/Agents.
    *   Document the intent and variables of Prompt Templates.

### README.md

*   Maintain a `README.md` with:
    *   Project overview and purpose.
    *   Installation instructions.
    *   Configuration steps.
    *   Basic usage examples (CLI commands).
    *   Contribution guidelines (link if separate).
    *   License information.