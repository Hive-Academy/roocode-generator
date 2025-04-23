---
title: Naming Conventions
version: 1.0.0
lastUpdated: 2025-04-23T11:58:50.517Z
sectionId: 3
applicableLanguages: [TypeScript, JavaScript]
relatedSections: []
---

Okay, here are comprehensive coding rules and standards for naming conventions tailored to the `roocode-generator` project, considering its tech stack (TypeScript, Langchain, Commander.js, Inquirer.js, Reflect-metadata) and structure.

```markdown
# Naming Conventions

## 1. General Principles

1.  **Clarity and Intent:** Names should clearly reveal the purpose and intent of the variable, function, class, or file. Prioritize readability over brevity.
2.  **Consistency:** Apply these conventions uniformly across the entire codebase. Consistency is crucial for maintainability.
3.  **Avoid Ambiguity:** Choose names that are unambiguous and distinct. Avoid overly generic names like `data`, `value`, `item`, `handle`, `manage` unless the context is extremely clear.
4.  **Use English:** All names (variables, functions, classes, files, etc.) must be in English.
5.  **Standard Casing:** Adhere strictly to the specified casing conventions (PascalCase, camelCase, kebab-case, SCREAMING_SNAKE_CASE) for different types of identifiers.

## 2. File Naming

1.  **Case:** Use `kebab-case` for all file and directory names within the `src` directory.
    *   *Why:* Consistent with npm package conventions and common practice in the JavaScript/TypeScript ecosystem. Improves readability in file listings.
    *   *Example:* `project-analyzer.ts`, `llm-config.service.ts`, `memory-bank` (directory)

2.  **Content Reflection:** File names should accurately reflect their primary export or purpose.
    *   *Example:* A file exporting the `ProjectAnalyzer` class should be named `project-analyzer.ts`.

3.  **Type Suffixes:** Use descriptive suffixes for specific file types to indicate their role or pattern.
    *   `.service.ts`: For service classes (e.g., `logger-service.ts`, `project-config.service.ts`).
    *   `.generator.ts`: For generator classes (e.g., `rules-generator.ts`, `base-generator.ts`).
    *   `.command.ts` / `.handler.ts`: For Commander.js command handlers (e.g., `memory-bank-command-handler.ts`).
    *   `.interface.ts` / `.interfaces.ts`: For files primarily exporting interfaces (e.g., `interfaces.ts` within a module).
    *   `.type.ts` / `.types.ts`: For files primarily exporting type aliases or common types (e.g., `types.ts` within a module, `common.ts`).
    *   `.enum.ts`: For files primarily exporting enums.
    *   `.config.ts`: For configuration-related modules or classes (e.g., `llm-provider-configs.ts`).
    *   `.error.ts` / `.errors.ts`: For custom error classes (e.g., `errors.ts` within a module).
    *   `.decorator.ts` / `.decorators.ts`: For decorator definitions (e.g., `decorators.ts`).
    *   `.registry.ts`: For registry patterns (e.g., `provider-registry.ts`).
    *   `.builder.ts`: For builder patterns (e.g., `rules-prompt-builder.ts`).
    *   `.parser.ts`: For parsing logic (e.g., `response-parser.ts`).
    *   `.analyzer.ts`: For analysis logic (e.g., `project-analyzer.ts`).
    *   `.validator.ts`: For validation logic (e.g., `memory-bank-validator.ts`).
    *   `.manager.ts`: For managing resources or processes (e.g., `template-manager.ts`).
    *   `.processor.ts`: For data processing logic (e.g., `rules-content-processor.ts`).

4.  **Test Files:** Name test files using the name of the file under test, followed by `.spec.ts` or `.test.ts`. Prefer `.spec.ts`.
    *   *Example:* `project-analyzer.spec.ts` (for testing `project-analyzer.ts`).

5.  **Index Files:** Use `index.ts` for barrel files that re-export modules from a directory, simplifying imports.
    *   *Example:* `src/core/di/index.ts`

6.  **Configuration Files:** Use the standard naming conventions for configuration files (e.g., `tsconfig.json`, `jest.config.js`, `.eslintrc.js`, `llm.config.json`). Maintain consistency (`kebab-case` or `camelCase` as per tool standards).

## 3. Variable and Property Naming

1.  **Case:** Use `camelCase` for local variables, function parameters, and object/class properties.
    *   *Example:* `projectName`, `llmApiKey`, `maxTokens`, `analysisResult`.

2.  **Descriptive Names:** Choose names that clearly describe the variable's content or purpose.
    *   *Good:* `projectConfiguration`, `analysisReport`, `userInput`.
    *   *Bad:* `projConf`, `anRep`, `input`, `data`, `val`.

3.  **Boolean Variables:** Prefix boolean variables with `is`, `has`, `can`, `should`, `enable`, `use`.
    *   *Example:* `isConfigLoaded`, `hasErrors`, `canGenerate`, `shouldOverwrite`, `enableVerboseLogging`, `useMemoryBank`.

4.  **Avoid Single Letters:** Avoid single-letter variable names except for trivial loop counters (`i`, `j`, `k`) where the scope is very small and obvious.

5.  **Private/Protected Members (TypeScript):**
    *   Use the `private` and `protected` keywords in TypeScript.
    *   Do **not** use underscore (`_`) prefix for private/protected members enforced by TypeScript's access modifiers.
    *   *Example:*
        ```typescript
        class ProjectAnalyzer {
          private readonly fileOps: IFileOperations; // Correct
          // private _fileOps: IFileOperations; // Avoid

          constructor(fileOps: IFileOperations) {
            this.fileOps = fileOps;
          }
        }
        ```

## 4. Constant Naming

1.  **Case:** Use `SCREAMING_SNAKE_CASE` for constants (variables intended never to be reassigned, typically defined at the top level or as `static readonly` class members).
    *   *Why:* Clearly distinguishes constants from mutable variables.
    *   *Example:*
        ```typescript
        const DEFAULT_MODEL_NAME = 'gpt-4';
        const MAX_RETRIES = 3;

        class ConfigService {
          static readonly DEFAULT_CONFIG_FILENAME = 'roocode-config.json';
        }
        ```

2.  **Readonly Properties:** Use `readonly` keyword in TypeScript for properties that should not be reassigned after initialization (often in constructors). Name them using `camelCase`.
    *   *Example:*
        ```typescript
        class LlmAgent {
          readonly provider: LlmProvider;
          readonly maxTokens: number = 4096;

          constructor(provider: LlmProvider) {
            this.provider = provider;
          }
        }
        ```

## 5. Function and Method Naming

1.  **Case:** Use `camelCase`.
    *   *Example:* `analyzeProject`, `generateRulesFile`, `promptUserForConfig`.

2.  **Verb Prefix:** Start function names with a verb or verb phrase describing the action performed or the value returned.
    *   *Actions:* `loadConfiguration`, `saveMemoryBank`, `registerProvider`, `parseLlmResponse`.
    *   *Retrievals:* `getProjectName`, `fetchTemplateContent`, `createPrompt`.
    *   *Checks (Boolean):* `isValidConfig`, `hasPendingChanges`, `canConnectToApi`. (See Boolean Variables section).

3.  **Async Functions:** Do not use `async` or `promise` suffixes. The `async` keyword or the return type (`Promise<T>`) sufficiently indicates asynchronicity.
    *   *Good:* `async function loadProjectData(): Promise<ProjectData> { ... }`
    *   *Bad:* `async function loadProjectDataAsync(): Promise<ProjectData> { ... }`

## 6. Class Naming

1.  **Case:** Use `PascalCase`.
    *   *Example:* `ProjectAnalyzer`, `LlmConfigService`, `RulesGenerator`, `MemoryBankCommandHandler`, `ApplicationContainer`, `CliInterface`.

2.  **Nouns/Noun Phrases:** Class names should typically be nouns or noun phrases representing the object or concept.

3.  **Pattern Suffixes:** Use standard suffixes to indicate common design patterns or roles, consistent with file naming suffixes.
    *   `Service`: `LlmConfigService`, `LoggerService`
    *   `Generator`: `RulesGenerator`, `SystemPromptsGenerator`
    *   `Handler`: `MemoryBankCommandHandler`
    *   `Controller` (if applicable for web frameworks, less likely here)
    *   `Provider`: `OpenAIProvider`, `AnthropicProvider` (if implementing specific providers)
    *   `Manager`: `TemplateManager`, `RulesFileManager`
    *   `Factory` (if using factory pattern)
    *   `Builder`: `RulesPromptBuilder`
    *   `Registry`: `ProviderRegistry`
    *   `Validator`: `MemoryBankValidator`
    *   `Analyzer`: `ProjectAnalyzer`
    *   `Parser`: `ResponseParser`
    *   `Processor`: `RulesContentProcessor`
    *   `Container`: `ApplicationContainer` (for DI)
    *   `Error`: `ConfigurationError`, `ApiError` (for custom errors)

## 7. Interface and Type Alias Naming

1.  **Case:** Use `PascalCase`.
    *   *Example:* `ProjectConfiguration`, `LlmProviderOptions`, `GeneratorResult`, `FileOperationResult`.

2.  **Avoid `I` Prefix:** Do **not** prefix interface names with `I`. Modern TypeScript convention favors clean names without Hungarian notation prefixes.
    *   *Good:* `interface LoggerService { ... }`
    *   *Bad:* `interface ILoggerService { ... }`

3.  **Descriptive Nouns:** Use descriptive nouns or noun phrases.
    *   *Example:* `AnalysisOptions`, `TemplateData`, `CommandDefinition`.

4.  **Suffixes (Use Sparingly):** Only use suffixes like `Options`, `Config`, `Params`, `Args`, `Result`, `Data`, `State` if they significantly improve clarity about the type's purpose.
    *   *Example:* `LlmRequestOptions`, `GenerationResult`, `ProjectState`.

5.  **Type Aliases:** Follow the same `PascalCase` convention as interfaces. Use type aliases for simpler types, function signatures, or union/intersection types where an interface isn't necessary or suitable.
    *   *Example:* `type UserId = string;`, `type LogLevel = 'debug' | 'info' | 'warn' | 'error';`, `type GeneratorFunction = (options: GenerationOptions) => Promise<GeneratorResult>;`

## 8. Enum Naming

1.  **Case (Enum Name):** Use `PascalCase` for the enum type name.
    *   *Example:* `enum LogLevel { ... }`, `enum OutputFormat { ... }`.

2.  **Case (Enum Members):** Use `PascalCase` for enum members.
    *   *Why:* Treats enum members like constant values within a specific type scope, consistent with `PascalCase` for type-related constructs.
    *   *Example:*
        ```typescript
        enum TaskStatus {
          Pending,
          InProgress,
          Completed,
          Failed
        }

        let status: TaskStatus = TaskStatus.InProgress;
        ```
    *   *(Alternative - Less Recommended):* `SCREAMING_SNAKE_CASE` is sometimes used but `PascalCase` is more common in modern TS. Stick to `PascalCase` for consistency within this project.

## 9. Decorator Naming (Reflect-metadata / DI)

1.  **Case (Decorator Factory):** Use `PascalCase` for decorator factories (functions that return a decorator, often used for configuration like `@Injectable()`).
    *   *Example:* `@Injectable()`, `@Singleton()`. (Assuming these are defined in `src/core/di/decorators.ts`).

2.  **Case (Simple Decorator):** Use `camelCase` for simple decorators applied directly (less common for DI, maybe for logging or other aspects).
    *   *Example:* `@logMethodCall`.

3.  **Parameter Decorators:** Follow the convention of the DI library or framework. Often `camelCase` if simple, or `PascalCase` if a factory. For injection, `@Inject('token')` or similar pattern is common.
    *   *Example (assuming `@Inject` is defined):*
        ```typescript
        import { Injectable, Inject } from '../core/di'; // Assuming definition location
        import { LoggerService } from '../core/services/logger-service';
        import { TYPES } from '../core/di/types'; // Assuming token definitions

        @Injectable()
        class MyService {
          constructor(@Inject(TYPES.LoggerService) private logger: LoggerService) {}
        }
        ```

## 10. DI Tokens / Identifiers

1.  **Case:** Use `PascalCase` when using classes as tokens or when defining Symbol/string tokens within a structure (like an object or namespace).
    *   *Why:* Aligns with class naming and provides a clear structure for related tokens.
    *   *Example (using an object map):*
        ```typescript
        // src/core/di/types.ts
        export const TYPES = {
          // Services
          LoggerService: Symbol.for('LoggerService'),
          ProjectConfigService: Symbol.for('ProjectConfigService'),
          LlmConfigService: Symbol.for('LlmConfigService'),
          FileOperations: Symbol.for('FileOperations'),
          // LLM
          LlmAgent: Symbol.for('LlmAgent'),
          ProviderRegistry: Symbol.for('ProviderRegistry'),
          // ... other tokens
        };
        ```
    *   *Example (using classes directly - less common if interfaces are preferred for contracts):*
        ```typescript
        // If using classes directly as tokens
        container.bind<LoggerService>(LoggerService).toSelf();
        ```

## 11. Langchain Specific Naming

1.  **Chains:** Name chains descriptively, often ending with `Chain`. Use `camelCase` for variables, `PascalCase` if defined as classes.
    *   *Example:* `codeAnalysisChain`, `ruleRefinementChain`.

2.  **Prompts:** Name prompt templates descriptively, often ending with `Prompt` or `PromptTemplate`. Use `camelCase` for variables.
    *   *Example:* `ruleGenerationPrompt`, `memoryBankUpdatePromptTemplate`.

3.  **Agents:** Name agents descriptively, often ending with `Agent`. Use `camelCase` for instances, `PascalCase` for classes.
    *   *Example:* `projectContextAgent`, `codeQueryAgent`.

4.  **Tools:** Name tools based on their function, often ending with `Tool`. Use `camelCase` for instances, `PascalCase` for classes.
    *   *Example:* `fileSystemReaderTool`, `projectStructureAnalysisTool`.

## 12. Commander.js / Inquirer.js Specific Naming

1.  **Commands (CLI):** Use `kebab-case` for command names defined via Commander.js.
    *   *Example:* `program.command('generate-rules')`, `program.command('update-memory-bank')`.

2.  **Options (CLI):** Use `kebab-case` for command-line option flags.
    *   *Example:* `--output-dir`, `--model-name`, `--verbose`.

3.  **Options (Code Variable):** Use `camelCase` for the corresponding variables parsed by Commander.js.
    *   *Example:* `options.outputDir`, `options.modelName`, `options.verbose`.

4.  **Inquirer Questions (`name` property):** Use `camelCase` for the `name` property in Inquirer.js question objects. This key is used to access the answer.
    *   *Example:* `{ type: 'input', name: 'projectName', message: 'Enter project name:' }`.

## 13. Abbreviations and Acronyms

1.  **General Rule:** Treat common acronyms (e.g., `ID`, `URL`, `API`, `LLM`, `UI`, `CLI`, `JSON`, `HTML`) as whole words in `camelCase` and `PascalCase` names, capitalizing only the first letter unless it's the start of the name or follows the `SCREAMING_SNAKE_CASE` rule.
    *   *Example (`camelCase`):* `userId`, `apiUrl`, `llmProvider`, `parseJson`, `cliOptions`.
    *   *Example (`PascalCase`):* `UserId`, `ApiUrl`, `LlmProvider`, `ParseJson`, `CliOptions`.
2.  **Consistency is Key:** If the team prefers to fully capitalize certain acronyms (e.g., `LLMProvider`, `APIClient`), document this exception and apply it consistently. *Recommendation for this project: Use the general rule (treat as words) for better flow, e.g., `LlmProvider`, `CliInterface`.*
3.  **SCREAMING_SNAKE_CASE:** Fully capitalize acronyms in `SCREAMING_SNAKE_CASE`.
    *   *Example:* `DEFAULT_API_URL`, `MAX_LLM_RETRIES`.

## 14. Test Naming

1.  **Test Suites (`describe`):** Use the name of the class, function, or module being tested. Add context if needed (e.g., "when condition X").
    *   *Example:* `describe('ProjectAnalyzer', () => { ... });`, `describe('parseLlmResponse', () => { ... });`.

2.  **Test Cases (`it` or `test`):** Use a descriptive sentence stating the expected behavior or outcome, often starting with "should".
    *   *Example:* `it('should return the correct project configuration when config file exists', () => { ... });`, `it('should throw ConfigurationError if config file is missing', () => { ... });`, `it('should correctly identify TypeScript files', () => { ... });`.

---

By adhering to these naming conventions, the `roocode-generator` project will benefit from increased readability, maintainability, and consistency, making it easier for developers to understand and contribute to the codebase. Remember to configure ESLint (`@typescript-eslint/naming-convention`) to enforce these rules automatically where possible.
```