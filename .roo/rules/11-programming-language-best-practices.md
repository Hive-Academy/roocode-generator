---
title: Programming Language Best Practices
version: 1.0.0
lastUpdated: 2025-04-23T12:08:41.234Z
sectionId: 11
applicableLanguages: [TypeScript, JavaScript]
relatedSections: []
---

# Programming Language Best Practices (TypeScript / JavaScript)

## 1. General Principles

These overarching principles guide our approach to writing clean, maintainable, and robust code.

1.  **Readability:** Code is read far more often than it is written. Prioritize clarity and simplicity. Use meaningful names, keep functions short, and structure code logically.
2.  **Maintainability:** Write code that is easy to understand, modify, and debug. This involves modularity, clear interfaces, and consistent patterns.
3.  **Consistency:** Adhere strictly to the established coding style, naming conventions, and architectural patterns defined in these standards and enforced by linters/formatters (ESLint, Prettier).
4.  **DRY (Don't Repeat Yourself):** Avoid duplicating code logic. Use functions, classes, modules, and generics to abstract common patterns.
5.  **KISS (Keep It Simple, Stupid):** Prefer simple solutions over complex ones unless the complexity is justified by significant benefits (e.g., performance, necessary abstraction).
6.  **SOLID Principles:** While primarily for OOP, the principles offer valuable guidance:
    - **Single Responsibility Principle (SRP):** Each class, module, or function should have one primary responsibility. (e.g., `FileOperations` handles file system interactions, `LlmAgent` handles LLM communication).
    - **Open/Closed Principle (OCP):** Software entities should be open for extension but closed for modification. (e.g., Use dependency injection and interfaces like `ILlmProvider` to allow adding new LLM providers without changing core agent logic).
    - **Liskov Substitution Principle (LSP):** Subtypes must be substitutable for their base types. (e.g., Any implementation of `IBaseGenerator` should work correctly when used by `GeneratorOrchestrator`).
    - **Interface Segregation Principle (ISP):** Clients should not be forced to depend on interfaces they do not use. Define granular interfaces (like in `core/config/interfaces.ts`, `core/llm/interfaces.ts`).
    - **Dependency Inversion Principle (DIP):** Depend on abstractions (interfaces), not concretions (classes). This is fundamental to our DI setup (`core/di`).

## 2. TypeScript Best Practices

Leverage TypeScript's static typing system to catch errors early and improve code clarity.

1.  **Enable Strict Mode:** Ensure `"strict": true` is enabled in `tsconfig.json`. This activates all strict type-checking options (`noImplicitAny`, `strictNullChecks`, etc.).
2.  **Avoid `any`:** Do not use `any` unless absolutely necessary (e.g., interfacing with untyped legacy JavaScript or complex external libraries). If used, provide a clear justification in comments. Prefer `unknown` for values where the type is genuinely unknown and perform type checking before use.
3.  **Use Explicit Types:** While type inference is powerful, be explicit with types for function signatures (parameters and return types), class members, and complex variable declarations. This improves readability and catches errors.

    ```typescript
    // Good: Explicit types
    import { Result } from "../core/result/result";
    import { ProjectConfig } from "../types";

    async function loadConfig(filePath: string): Promise<Result<ProjectConfig, Error>> {
      // ... implementation ...
    }

    class ProjectConfigService implements IProjectConfigService {
      private configPath: string = "roocode-config.json";
      // ...
    }
    ```

4.  **Interfaces vs. Types:**

    - Use `interface` for defining the shape of objects and for public API contracts (e.g., service interfaces like `IFileOperations`, `ILoggerService`). Interfaces are better for declaration merging and implementing/extending classes.
    - Use `type` for aliases, unions, intersections, mapped types, conditional types, and simple object shapes where extensibility isn't the primary concern.

    ```typescript
    // Good: Interface for service contract
    export interface ILoggerService {
      info(message: string, meta?: Record<string, unknown>): void;
      // ... other methods
    }

    // Good: Type for a specific union or complex shape
    export type LlmProviderType = "openai" | "anthropic" | "google-genai";
    export type GeneratorOutput = Result<string, Error>; // Using Result pattern
    ```

5.  **Use `readonly`:** Mark properties that should not be reassigned after initialization as `readonly`. Use `Readonly<T>` or `readonly T[]` for immutable collections where appropriate.

    ```typescript
    // Good: Readonly properties
    @Injectable()
    class LlmConfigService implements ILlmConfigService {
      private readonly configFilePath: string;

      constructor(@Inject(TYPES.FileOperations) private readonly fileOps: IFileOperations) {
        this.configFilePath = "llm.config.json";
      }
      // ...
    }
    ```

6.  **Prefer `unknown` over `any`:** When dealing with data of unknown structure (e.g., parsing external JSON, LLM responses before validation), use `unknown` and perform type checks or use type guards.

    ```typescript
    // Good: Using unknown for parsed data
    import { AnalysisResult } from "./types"; // Assuming AnalysisResult is a defined type/interface

    function parseLlmResponse(rawData: string): Result<AnalysisResult, Error> {
      try {
        const parsed: unknown = JSON.parse(rawData);
        // Add type validation logic here before casting to AnalysisResult
        if (isValidAnalysisResult(parsed)) {
          // isValidAnalysisResult is a type guard
          return Result.Ok(parsed as AnalysisResult);
        }
        return Result.Err(new Error("Invalid LLM response structure"));
      } catch (error) {
        return Result.Err(new Error(`Failed to parse LLM response: ${error.message}`));
      }
    }
    ```

7.  **Enums:** Use string enums for better debugging and readability, especially when the values might be logged or serialized. Numeric enums can be less clear. Consider using string literal unions (`type MyUnion = 'A' | 'B'`) for simpler, fixed sets of values.

    ```typescript
    // Good: String Enum
    export enum LogLevel {
      Debug = "DEBUG",
      Info = "INFO",
      Warn = "WARN",
      Error = "ERROR",
    }

    // Alternative: String Literal Union (good for simple cases)
    export type GeneratorType = "rules" | "memory-bank" | "system-prompts";
    ```

8.  **Modules and Imports:**
    - Use ES Modules (`import`/`export`) exclusively.
    - Avoid default exports. Named exports improve discoverability, refactoring, and are generally better for tree-shaking.
    - Use relative paths for imports within the same module/feature area (e.g., within `core/analysis`).
    - Use absolute paths or path aliases (if configured in `tsconfig.json`) for imports across different top-level modules (e.g., importing `core/services` from `generators`).
    - Be mindful of barrel files (`index.ts`). Use them to expose the public API of a module (e.g., `core/di/index.ts`), but avoid overly deep nesting or exporting everything, which can sometimes mask dependencies or hinder tree-shaking.

## 3. Asynchronous Programming (`async`/`await`)

Much of the project involves I/O (file system, LLM calls) and is inherently asynchronous.

1.  **Prefer `async`/`await`:** Use `async`/`await` over raw Promises (`.then`/`.catch`) for better readability and more synchronous-looking control flow.
2.  **Error Handling:** Always wrap `await` calls that can reject in `try...catch` blocks or use the `Result` pattern consistently. Do not let Promises reject silently.

    ```typescript
    // Good: Using try/catch with async/await
    import { LlmAgent } from "../core/llm/llm-agent";
    import { Result } from "../core/result/result";

    async function generateContent(
      prompt: string,
      agent: LlmAgent
    ): Promise<Result<string, Error>> {
      try {
        const response = await agent.generate(prompt);
        // Assuming agent.generate returns Result<string, Error> or throws on failure
        if (response.isErr()) {
          return response; // Propagate error Result
        }
        return Result.Ok(response.value);
      } catch (error) {
        // Handle unexpected errors during the await itself
        const err = error instanceof Error ? error : new Error("Unknown error during generation");
        this.logger.error(`LLM generation failed: ${err.message}`, { error: err });
        return Result.Err(err);
      }
    }
    ```

3.  **Concurrency:** Use `Promise.all` when multiple asynchronous operations can run concurrently and you need all to succeed. Use `Promise.allSettled` when you need to wait for all operations to complete, regardless of success or failure.

    ```typescript
    // Good: Running analysis steps concurrently
    async analyzeProject(): Promise<Result<ProjectAnalysis, Error[]>> {
      const [structureResult, dependenciesResult] = await Promise.allSettled([
        this.analyzeStructure(), // returns Promise<Result<StructureInfo, Error>>
        this.analyzeDependencies(), // returns Promise<Result<DependencyInfo, Error>>
      ]);

      const errors: Error[] = [];
      let structureInfo: StructureInfo | undefined;
      let dependencyInfo: DependencyInfo | undefined;

      if (structureResult.status === 'rejected') {
        errors.push(structureResult.reason);
      } else if (structureResult.value.isErr()) {
        errors.push(structureResult.value.error);
      } else {
        structureInfo = structureResult.value.value;
      }
      // ... similar handling for dependenciesResult

      if (errors.length > 0) {
        return Result.Err(errors);
      }
      if (!structureInfo || !dependencyInfo) {
         // This case should ideally be covered by the error checks above
         return Result.Err([new Error('Failed to retrieve essential analysis data.')]);
      }

      return Result.Ok({ structure: structureInfo, dependencies: dependencyInfo });
    }
    ```

4.  **Avoid `void` Promises:** Functions returning `Promise<void>` can hide unhandled rejections. If a function performs an async operation but doesn't logically return a value, ensure errors are handled internally or consider returning a `Promise<Result<void, Error>>`.

## 4. Error Handling and `Result` Pattern

Robust error handling is critical, especially when interacting with external systems (LLMs, file system).

1.  **Use the `Result` Pattern:** Employ the custom `Result<T, E>` type (from `core/result/result.ts`) for operations that can predictably fail (e.g., file I/O, parsing, LLM calls, configuration loading). This makes the success/failure outcome explicit in the function signature and avoids excessive `try...catch` blocks for expected failures.

    ```typescript
    // Good: Function signature clearly indicates possible failure
    import { Result } from "../core/result/result";
    import { IFileOperations } from "../core/file-operations/interfaces";

    class RulesFileManager {
      constructor(@Inject(TYPES.FileOperations) private fileOps: IFileOperations) {}

      async loadRules(filePath: string): Promise<Result<RuleSet, Error>> {
        const readResult = await this.fileOps.readFile(filePath);
        if (readResult.isErr()) {
          return Result.Err(new Error(`Failed to read rules file: ${readResult.error.message}`));
        }
        try {
          const rules = JSON.parse(readResult.value);
          // Add validation for 'rules' structure here
          return Result.Ok(rules as RuleSet);
        } catch (error) {
          return Result.Err(new Error(`Failed to parse rules JSON: ${error.message}`));
        }
      }
    }
    ```

2.  **Custom Error Types:** Define custom error classes (extending `Error`) for specific error conditions where needed (e.g., `ConfigurationError`, `LlmResponseError`, `TemplateError` as seen in `core/errors`, `core/file-operations/errors`, `core/template-manager/errors`). This allows for more granular error handling.
3.  **Handle Errors Appropriately:** Don't just log errors and continue if the application is in an invalid state. Propagate errors (using `Result.Err` or `throw` for exceptional cases) up the call stack until they can be handled appropriately (e.g., reported to the user via the CLI).
4.  **Validate Inputs:** Validate function arguments, configuration values, user inputs (from Inquirer.js), and data from external sources (file system, LLM responses) early to prevent errors later in the process.

## 5. Modularity and Dependency Injection (DI)

The project relies heavily on modularity and DI using `reflect-metadata` and the custom container (`core/di`).

1.  **Adhere to Module Structure:** Place files within the appropriate directory under `src/core`, `src/generators`, `src/commands`, etc. Follow the established patterns for interfaces (`interfaces.ts`), types (`types.ts`), errors (`errors.ts`), etc., within modules.
2.  **Dependency Injection:**
    - Use `@Injectable()` on classes intended for injection.
    - Use `@Inject(TYPE)` in constructors to inject dependencies.
    - Define unique symbols or string literals for injection types (`core/di/types.ts`).
    - Register services and their implementations in the DI container (`core/di/registrations.ts`).
    - **Depend on Abstractions:** Inject interfaces (`ILoggerService`, `IFileOperations`) rather than concrete classes (`LoggerService`, `FileOperations`) whenever possible to facilitate testing and flexibility (Dependency Inversion).
3.  **Clear Interfaces:** Define clear, concise interfaces for services and components (`core/application/interfaces.ts`, `core/llm/interfaces.ts`, etc.). These interfaces form the contracts between different parts of the application.

    ```typescript
    // core/llm/interfaces.ts
    export interface ILlmProvider {
      readonly providerType: LlmProviderType;
      generate(prompt: string, options?: LlmGenerationOptions): Promise<Result<string, Error>>;
    }

    // core/llm/llm-agent.ts
    import { TYPES } from "../di/types"; // Ensure TYPES contains ILlmProvider symbol
    import { ProviderRegistry } from "./provider-registry"; // Assuming registry provides the correct provider

    @Injectable()
    export class LlmAgent {
      private provider: ILlmProvider;

      constructor(
        @Inject(TYPES.ProviderRegistry) private providerRegistry: ProviderRegistry,
        @Inject(TYPES.ConfigService) private configService: IConfigService // Example
      ) {
        // Logic to select the provider based on config, using the registry
        const providerType = this.configService.getLlmProviderType(); // Fictional method
        const resolveResult = this.providerRegistry.resolveProvider(providerType);
        if (resolveResult.isErr()) {
          // Handle error - provider not found or misconfigured
          throw new Error(`Failed to initialize LLM provider: ${resolveResult.error.message}`);
        }
        this.provider = resolveResult.value;
      }

      async generate(prompt: string): Promise<Result<string, Error>> {
        // Delegate to the resolved provider
        return this.provider.generate(prompt);
      }
    }
    ```

## 6. Framework-Specific Guidelines

1.  **Langchain:**
    - Abstract Langchain specifics behind your own service interfaces (`ILlmProvider`, `ILlmAgent`, `IResponseParser`). This isolates Langchain dependencies and allows easier swapping or upgrading.
    - Keep prompt construction logic separate (e.g., in dedicated `PromptBuilder` classes like `src/generators/rules/rules-prompt-builder.ts`).
    - Handle potential errors from LLM API calls gracefully (rate limits, API key issues, network errors, malformed responses). Use the `Result` pattern.
    - Configure model parameters (temperature, max tokens) via the configuration service (`LlmConfigService`).
2.  **Commander.js:**
    - Define commands and options clearly in dedicated command handlers (e.g., `MemoryBankCommandHandler`).
    - Use descriptive names and help messages for commands and options.
    - Validate command arguments and options early.
    - Use `async` action handlers for commands that perform asynchronous operations.
    - Leverage Commander's built-in help generation.
3.  **Inquirer.js:**
    - Design clear, unambiguous prompts for user interaction.
    - Use appropriate prompt types (input, list, confirm, etc.).
    - Provide validation functions for user input where necessary.
    - Handle potential errors during the prompting process.

## 7. Naming Conventions

1.  **Variables & Functions:** `camelCase` (e.g., `projectConfig`, `analyzeDependencies`).
2.  **Classes, Interfaces, Types, Enums:** `PascalCase` (e.g., `ProjectAnalyzer`, `IFileOperations`, `GeneratorType`, `LogLevel`).
3.  **Interfaces:** Prefix interfaces with `I` (e.g., `ILoggerService`, `IConfigService`). This is a common convention that clearly distinguishes interfaces.
4.  **Constants:** `UPPER_SNAKE_CASE` for true constants (e.g., `DEFAULT_CONFIG_PATH = 'config.json'`). Use `readonly camelCase` for class-level or object-level constants.
5.  **File Names:** `kebab-case` (e.g., `project-analyzer.ts`, `llm-config.service.ts`). Use `.interface.ts` or `.types.ts` suffixes where appropriate if not using dedicated `interfaces.ts` or `types.ts` files per module.
6.  **Private Members:** Use the `private` keyword. Avoid using underscore prefixes (`_`) for private members in TypeScript.
7.  **Boolean Variables/Functions:** Prefix with `is`, `has`, `should`, `can` (e.g., `isValid`, `hasConfig`, `shouldGenerate`).
8.  **Functions/Methods:** Use verbs that describe the action (e.g., `loadConfig`, `generateRules`, `parseResponse`).

## 8. Comments and Documentation

1.  **JSDoc:** Use JSDoc comments (`/** ... */`) for all exported functions, classes, interfaces, types, and complex public methods. Describe the purpose, parameters (`@param`), return values (`@returns`), and any thrown errors (`@throws` - use sparingly, prefer `Result`).
2.  **Explain _Why_, Not _What_:** Comments should explain complex logic, assumptions, or the reasoning behind a particular implementation choice, not just restate the code.
3.  **Keep Comments Updated:** Ensure comments are maintained alongside code changes. Stale comments are misleading.
4.  **TODO/FIXME:** Use `// TODO:` for planned enhancements and `// FIXME:` for known issues that need addressing. Include context or a ticket reference if possible.

```typescript
/**
 * Analyzes the project structure to identify key directories and files.
 * @param rootDir The root directory of the project to analyze.
 * @returns A Result containing the StructureInfo on success, or an Error on failure.
 */
async analyzeStructure(rootDir: string): Promise<Result<StructureInfo, Error>> {
  // TODO: Implement analysis of different framework types (React, Angular, etc.)
  // ... implementation ...
}
```

```

## 9. Linting and Formatting

1.  **Mandatory Checks:** All code _must_ pass ESLint and Prettier checks before being committed. These checks are enforced via Husky pre-commit hooks.
2.  **Configuration:** Adhere to the rules defined in `.eslintrc.js` (or equivalent) and Prettier configuration files. Do not disable rules locally without strong justification and team agreement.

## 10. Testing

(While potentially a separate section, key points relevant to code quality belong here)

1.  **Unit Test Core Logic:** Write unit tests (using Jest/ts-jest) for services, utility functions, parsers, builders, and complex logic within components.
2.  **Mock Dependencies:** Use Jest's mocking capabilities (`jest.fn`, `jest.spyOn`) to isolate the unit under test. Mock file system operations, LLM calls, and other external dependencies. Leverage DI for easier mocking by injecting interfaces.
3.  **Test Edge Cases and Errors:** Ensure tests cover not only the "happy path" but also error conditions, invalid inputs, and edge cases. Test both `Ok` and `Err` states when using the `Result` pattern.
```
