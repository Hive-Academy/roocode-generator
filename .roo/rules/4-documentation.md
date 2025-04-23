---
title: Documentation
version: 1.0.0
lastUpdated: 2025-04-23T12:00:07.840Z
sectionId: 4
applicableLanguages: [TypeScript, JavaScript]
relatedSections: []
---

Okay, here are comprehensive coding rules and standards for documentation, tailored specifically for the `roocode-generator` project based on the provided context.

```markdown
# Documentation Coding Rules and Standards - Roocode Generator

## 1. Introduction

Effective documentation is crucial for project maintainability, collaboration, and onboarding. These standards ensure consistency, clarity, and completeness in all project documentation, both within the code and in supporting files.

This document outlines the rules for:
*   **Code Comments:** Using TSDoc for TypeScript and JSDoc for JavaScript.
*   **README Files:** Project-level and potentially component-level overviews.
*   **Architecture Documentation:** High-level design descriptions.
*   **Configuration File Comments:** Explaining settings.

## 2. General Principles

*   **Write for the Reader:** Assume the reader is a developer familiar with the core technologies (TS, Node.js) but not necessarily with the specific implementation details of this project or Langchain intricacies.
*   **Be Clear and Concise:** Use simple language. Avoid ambiguity and unnecessary jargon. Get straight to the point.
*   **Be Accurate and Up-to-Date:** Documentation MUST reflect the current state of the code. Update documentation whenever related code changes. Stale documentation is worse than no documentation.
*   **Document the "Why", Not Just the "What":** Code often explains *what* it does. Comments should explain *why* a particular approach was taken, especially for complex logic, non-obvious decisions, or workarounds.
*   **Consistency is Key:** Adhere strictly to the formats and styles outlined below.
*   **English Language:** All documentation MUST be written in English.

## 3. Code Comments (TSDoc / JSDoc)

Given the primary use of TypeScript, **TSDoc** is the preferred standard. JSDoc should be used for any remaining JavaScript files, following similar principles.

**Tools:**
*   Use ESLint with appropriate plugins (like `eslint-plugin-jsdoc` configured for TSDoc mode where possible) to help enforce these standards.

### 3.1. When to Comment

*   **Public API Elements (MUST):** All exported classes, interfaces, types, functions, constants, and enums MUST have TSDoc comments. This includes:
    *   Module exports (`export class ...`, `export function ...`, etc.)
    *   Public members of classes (methods, properties).
*   **Complex Logic (MUST):** Any algorithm, calculation, or block of code that isn't immediately obvious MUST be explained with comments (either block comments before the section or inline comments). Focus on the *purpose* or *reasoning*.
*   **Non-Obvious Behavior (SHOULD):** If code has side effects, performance implications, or relies on external factors that aren't clear from the signature, document them.
*   **Configuration Interfaces/Types (MUST):** Interfaces defining configuration structures (e.g., in `src/core/config/interfaces.ts`, `llm.config.json` structure if typed) MUST be documented, explaining each property.
*   **Decorators (MUST):** The purpose and usage of custom decorators (e.g., within `src/core/di/decorators.ts`) MUST be documented. When using decorators like `@Injectable` or `@Inject`, ensure the class/property documentation clarifies the dependency injection aspect.
*   **Langchain Specifics (SHOULD):** When defining Langchain chains, prompts, agents, or complex interactions, add comments explaining the flow, the purpose of specific steps, or expected input/output formats, especially if not obvious from the code structure.
*   **Workarounds or Hacks (MUST):** If temporary workarounds or "hacky" solutions are implemented, they MUST be clearly marked with `// TODO:` or `// HACK:` comments explaining the issue and why the workaround is necessary.

### 3.2. Format and Style

*   **Use `/** ... */` for TSDoc/JSDoc blocks.** Use `//` for single-line or inline comments.
*   **Start with a Summary:** The first line should be a concise summary of the element's purpose.
*   **Use Markdown:** TSDoc/JSDoc blocks support Markdown for richer formatting (e.g., code fences ` ``` `, lists `*`, bold `** **`).
*   **Punctuation:** End sentences with proper punctuation.
*   **Active Voice:** Prefer active voice (e.g., "Calculates the result" instead of "The result is calculated").

### 3.3. TSDoc Tags (Use as applicable)

*   **Summary Line:** Always start with a brief summary sentence.
*   `@param {<type>} <name> - <description>`: Describe function/method parameters. Use TypeScript types directly where possible (TSDoc often infers this, but explicit description is good).
*   `@returns {<type>} - <description>`: Describe the return value. For Promises, describe the resolved value. For `Result` objects (from `src/core/result`), describe the success value type and potential error types/scenarios.
*   `@throws {<ErrorType>} - <description>`: Describe errors that the function/method might explicitly throw (or reject a Promise with).
*   `@example`: Provide clear, runnable (or illustrative) code examples. Use Markdown code fences.
*   `@deprecated <description>`: Mark deprecated elements, explaining why and what to use instead.
*   `@see <reference>`: Link to related functions, classes, external documentation, or URLs.
*   `@remarks`: Provide more detailed explanations, context, or implementation notes beyond the initial summary. Useful for complex logic or design decisions.
*   `@class`: Provides a description for a class. Often combined with `@Injectable` for DI.
*   `@interface`: Provides a description for an interface.
*   `@typeParam {<Name>} - <description>`: Describe generic type parameters.
*   `@module`: Describe the purpose of a file/module if it's not obvious from its name and exports.
*   `@decorator`: Describe custom decorators.
*   `@Injectable()` (from `reflect-metadata` via DI framework): While not a TSDoc tag, ensure the class comment explains its role as a service/component managed by DI.
*   `@Inject(<token>)` (from `reflect-metadata` via DI framework): Ensure the property comment explains the injected dependency.

### 3.4. Examples

**Class Example (`src/core/llm/llm-agent.ts`):**

```typescript
import { injectable, inject } from 'tsyringe'; // Assuming tsyringe or similar for DI
import { ILlmProvider } from './interfaces';
import { Result } from '../result/result';
import { LoggerService } from '../services/logger-service';
import { LLM_PROVIDER_TOKEN } from '../di/types'; // Assuming a token definition

/**
 * Represents an agent responsible for interacting with a Language Model (LLM).
 *
 * @remarks
 * This class abstracts the specifics of the LLM communication protocol.
 * It uses the configured {@link ILlmProvider} to send prompts and receive responses.
 * It handles basic error management and logging for LLM interactions.
 * This class is managed by the Dependency Injection container.
 *
 * @example
 * ```typescript
 * const agent = container.resolve(LlmAgent);
 * const prompt = "Generate coding rules for...";
 * const result = await agent.generate(prompt);
 * if (result.isSuccess) {
 *   console.log(result.value);
 * } else {
 *   console.error(result.error);
 * }
 * ```
 * @Injectable() // Indicate this class is DI managed
 */
@injectable()
export class LlmAgent {
    /**
     * @param llmProvider - The provider implementation for the specific LLM service (e.g., OpenAI, Anthropic). Injected via DI.
     * @param logger - Service for logging information and errors. Injected via DI.
     */
    constructor(
        @inject(LLM_PROVIDER_TOKEN) private readonly llmProvider: ILlmProvider, // Explain injected dependency
        @inject(LoggerService) private readonly logger: LoggerService
    ) {}

    /**
     * Sends a prompt to the configured LLM provider and returns the generated response.
     *
     * @param prompt - The text prompt to send to the LLM.
     * @param options - Optional parameters for the generation (e.g., temperature, max tokens).
     * @returns A {@link Result} object containing the generated text on success, or an Error on failure.
     * @throws Will not throw directly, but the Result object will contain an Error on failure.
     */
    async generate(prompt: string, options?: Record<string, unknown>): Promise<Result<string, Error>> {
        this.logger.log(`Sending prompt to LLM: "${prompt.substring(0, 50)}..."`);
        try {
            const response = await this.llmProvider.generate(prompt, options);
            // Complex logic here might warrant inline comments
            this.logger.log(`Received LLM response.`);
            return Result.success(response);
        } catch (error) {
            this.logger.error('LLM generation failed:', error);
            // Wrap the error for consistent error handling
            return Result.failure(new Error(`LLM Agent Error: ${error instanceof Error ? error.message : String(error)}`));
        }
    }

    // Other methods...
}
```

**Function Example (`src/core/analysis/response-parser.ts`):**

```typescript
import { Result } from '../result/result';

/**
 * Parses a raw LLM response string to extract structured data (e.g., code blocks).
 *
 * @remarks
 * This function attempts to identify Markdown code fences (```) and extract
 * the content within them. It might need adjustments based on the specific
 * expected output format from the LLM prompts.
 *
 * @param rawResponse - The raw string response received from the LLM.
 * @returns A {@link Result} containing an array of extracted code blocks on success,
 *          or an Error if parsing fails or no relevant content is found.
 *
 * @example
 * ```typescript
 * const response = "Some text\n```typescript\nconst x = 10;\nconsole.log(x);\n```\nMore text.";
 * const parseResult = parseLlmCodeResponse(response);
 * if (parseResult.isSuccess) {
 *   console.log(parseResult.value); // Output: ["const x = 10;\nconsole.log(x);"]
 * }
 * ```
 */
export function parseLlmCodeResponse(rawResponse: string): Result<string[], Error> {
    if (!rawResponse) {
        return Result.failure(new Error('Raw response is empty.'));
    }

    // Regular expression to find code blocks (adjust language specifier if needed)
    const codeBlockRegex = /```(?:\w+)?\s*([\s\S]*?)```/g;
    const matches = [...rawResponse.matchAll(codeBlockRegex)];

    if (matches.length === 0) {
        // It might be valid to have no code blocks, depending on the use case.
        // Consider if this should be a success with an empty array or a failure.
        // Let's assume success with empty array for now.
        return Result.success([]);
    }

    try {
        const codeBlocks = matches.map(match => match[1].trim()); // Extract the content (group 1)
        return Result.success(codeBlocks);
    } catch (error) {
        // This catch might be redundant if map/trim don't throw, but good practice.
        return Result.failure(new Error(`Failed to extract code blocks: ${error instanceof Error ? error.message : String(error)}`));
    }
}
```

**Interface/Type Example (`src/core/config/interfaces.ts`):**

```typescript
import { Result } from '../result/result';

/**
 * Defines the structure for project-specific configuration used by roocode-generator.
 * Loaded primarily from `roocode-config.json`.
 */
export interface IProjectConfig {
    /**
     * The root directory of the target project being analyzed or generated for.
     * @example "D:\\my-other-project"
     */
    rootDir: string;

    /**
     * The main source code directory within the target project.
     * @default "src"
     */
    sourceDir?: string;

    /**
     * Glob patterns for files/directories to explicitly include in analysis.
     * If undefined, reasonable defaults may be used (e.g., sourceDir).
     * @example ["src/**/*.ts", "!src/**/*.spec.ts"]
     */
    include?: string[];

    /**
     * Glob patterns for files/directories to exclude from analysis.
     * Always excludes node_modules and common build output dirs by default.
     * @example ["**/*.d.ts", "dist/**"]
     */
    exclude?: string[];

    /**
     * Specifies the target language(s) for code generation or analysis.
     * Affects which templates or prompts might be used.
     * @default ["typescript"]
     */
    targetLanguages?: ('typescript' | 'javascript')[];

    // Add other relevant project config options here...
}

/**
 * Interface for services responsible for loading and providing project configuration.
 */
export interface IProjectConfigService {
    /**
     * Loads and returns the project configuration.
     * @returns A {@link Result} containing the {@link IProjectConfig} on success, or an Error on failure (e.g., file not found, invalid JSON).
     */
    getConfig(): Promise<Result<IProjectConfig, Error>>;
}
```

**Commander.js Command (`src/commands/memory-bank-command-handler.ts`):**

```typescript
// Within the setup method where commander is configured:
program
  .command('memory-bank <action>')
  /**
   * Manages the project's memory bank. (This description is used by Commander's help)
   * Actions: 'generate', 'validate'
   * The memory bank stores contextual information about the project structure and code.
   */
  .description('Manage the project memory bank (generate, validate)')
  .option('-o, --output <path>', 'Specify the output file path for the generated memory bank.')
  .option('-f, --force', 'Force regeneration even if the output file exists.')
  /**
   * Executes the specified memory bank action. (This comment is for developers)
   * @param action - The sub-command action ('generate' or 'validate').
   * @param options - Parsed command-line options provided by Commander.js.
   */
  .action(async (action: string, options: { output?: string; force?: boolean }) => {
    // Resolve the handler from DI container
    const handler = container.resolve(MemoryBankCommandHandler);
    await handler.handle(action, options);
  });

// Class documentation for the handler itself
/**
 * Handles the CLI commands related to the Memory Bank feature.
 * Orchestrates generation or validation based on user input.
 * @Injectable()
 */
@injectable()
export class MemoryBankCommandHandler {
    // ... constructor and handle method ...
    /**
     * Executes the requested memory bank action (generate or validate).
     * @param action - The action to perform ('generate' or 'validate').
     * @param options - Command line options.
     * @returns A Promise resolving to a Result indicating success or failure.
     */
    async handle(action: string, options: { output?: string; force?: boolean }): Promise<Result<void, Error>> {
        // ... implementation ...
    }
}
```

## 4. README Files

### 4.1. Root README (`README.md`)

The main `README.md` in the project root (`D:\projects\roocode-generator`) MUST contain:

*   **Project Title and Badge(s):** (e.g., Build Status, NPM Version, License).
*   **Description:** A brief overview of what `roocode-generator` does.
*   **Features:** Bulleted list of key capabilities.
*   **Installation:** How to install the tool (e.g., `npm install -g roocode-generator` or clone and build).
*   **Usage:**
    *   Basic command-line examples.
    *   Explanation of main commands (e.g., `roocode-generator generate rules`, `roocode-generator memory-bank generate`).
    *   Brief description of key options. Refer users to `--help` for details.
*   **Configuration:**
    *   Explanation of `roocode-config.json` and `llm.config.json`.
    *   Description of key configuration options.
*   **Architecture Overview (Brief):** A short section describing the main components (CLI, Core Services, Generators, LLM Interface, Memory Bank) and how they interact. Link to more detailed architecture docs if they exist.
*   **Development Setup:** Instructions for developers wanting to contribute (clone, install deps, build, test).
*   **Running Tests:** How to execute the test suite (`npm test`).
*   **Contribution Guidelines:** Link to `CONTRIBUTING.md` if it exists, or outline basic contribution steps (fork, branch, commit conventions (mention Commitlint), PR).
*   **License:** Project license information.

### 4.2. Component READMEs (Optional but Recommended)

For complex modules like `src/core/di` or `src/memory-bank`, consider adding a `README.md` inside that directory explaining:

*   The purpose and responsibility of the module.
*   Key concepts or classes within the module.
*   How to use the module (if applicable as a semi-independent unit).
*   Any specific configuration or setup related to the module.

## 5. Architecture / Design Documentation

*   **Location:** Consider a dedicated `docs` directory in the project root.
*   **Format:** Use Markdown (`.md`).
*   **Purpose:** To provide a higher-level understanding of the system's design, beyond what's captured in code comments or the root README.
*   **Content Suggestions:**
    *   **System Overview Diagram:** A visual representation of major components and data flow (e.g., using Mermaid diagrams within Markdown).
    *   **Core Concepts:** Explain key abstractions like `Result`, `BaseGenerator`, DI strategy (`tsyringe` or custom), `LLMAgent` interaction flow.
    *   **Generator Workflow:** Describe the steps involved when a generator (e.g., `RulesGenerator`) runs.
    *   **Memory Bank:** Detail the purpose, structure, generation process, and usage of the memory bank.
    *   **Langchain Integration:** Explain how Langchain is used (specific chains, agents, prompt strategies).
    *   **Configuration Loading:** Describe how `roocode-config.json` and `llm.config.json` are loaded and utilized.
    *   **Error Handling Strategy:** Explain the use of the `Result` type and general error propagation.
    *   **Design Decisions:** Document significant architectural choices and their rationale (e.g., why a specific DI container was chosen, why a particular LLM abstraction was used).

## 6. Configuration File Documentation

*   **JSON Files (`*.json`):** JSON doesn't natively support comments. Document the structure and purpose of configuration files (`roocode-config.json`, `llm.config.json`, `.releaserc.json`, `tsconfig.json`, `jest.config.js` if JSON) in:
    *   The main `README.md`.
    *   Separate Markdown files in a `docs` directory.
    *   Associated TypeScript interfaces (e.g., `IProjectConfig`, `ILlmConfig`) using TSDoc (preferred).
*   **JavaScript Files (`*.config.js`):** Use standard JSDoc/block comments (`/** ... */` or `//`) to explain non-obvious settings within JS configuration files (e.g., `commitlint.config.js`, `jest.config.js` if JS).

**Example (Conceptual - Documenting `llm.config.json` via an interface):**

```typescript
// src/core/config/interfaces.ts

/**
 * Defines the structure for LLM provider configuration.
 * Loaded primarily from `llm.config.json`.
 */
export interface ILlmConfig {
    /**
     * The primary LLM provider to use for generation tasks.
     * Must match one of the keys in the 'providers' object.
     * @example "openai"
     */
    defaultProvider: string;

    /**
     * Configuration details for each supported LLM provider.
     */
    providers: {
        /**
         * Configuration for the OpenAI provider.
         * Required if 'openai' is used as the default or selected provider.
         */
        openai?: {
            /**
             * The API key for accessing the OpenAI API.
             * It's STRONGLY recommended to use environment variables instead of hardcoding.
             * @example process.env.OPENAI_API_KEY
             * @see https://platform.openai.com/docs/quickstart/account-setup
             */
            apiKey: string;

            /**
             * The specific OpenAI model to use for generation.
             * @default "gpt-4o"
             * @example "gpt-4-turbo"
             */
            model?: string;

            /**
             * Controls randomness: lower values make output more focused and deterministic.
             * @default 0.7
             */
            temperature?: number;
        };

        /**
         * Configuration for the Anthropic provider.
         * Required if 'anthropic' is used.
         */
        anthropic?: {
            apiKey: string; // Document similarly to OpenAI
            model?: string; // Document similarly to OpenAI
            // Add other Anthropic-specific options here
        };

        // Add other providers like google-genai if supported
    };
}
```

## 7. Commit Messages

*   Follow the **Conventional Commits** specification (enforced by `commitlint.config.js` and `husky`).
*   Commit messages act as a changelog and historical documentation. Write clear and concise messages explaining the *what* and *why* of the change.
*   Reference related issue numbers if applicable (e.g., `fix: correct parsing of fenced code blocks (#123)`).

## 8. Documentation Maintenance

*   **Part of Definition of Done:** Documentation updates MUST be included as part of the work for any feature or bug fix. Code changes are not complete until corresponding documentation is updated.
*   **Code Reviews:** Documentation changes (or lack thereof) SHOULD be part of the code review process. Reviewers should check for clarity, accuracy, and adherence to these standards.
*   **Regular Audits (Optional):** Periodically review documentation (especially READMEs and architecture docs) to ensure they haven't become stale.

By adhering to these standards, we can ensure the `roocode-generator` project remains well-documented, easier to understand, maintain, and contribute to.
```