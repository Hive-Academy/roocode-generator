---
title: Code Review
version: 1.0.0
lastUpdated: 2025-04-23T12:07:21.516Z
sectionId: 10
applicableLanguages: [TypeScript, JavaScript]
relatedSections: []
---

Okay, here are comprehensive code review rules and standards tailored for the `roocode-generator` project, considering its tech stack, structure, and dependencies.

```markdown
# Roocode Generator: Code Review Guidelines

## 1. General Principles

*   **Goal:** Improve code quality, ensure correctness, promote knowledge sharing, maintain consistency, and identify potential issues early.
*   **Scope:** Reviews should cover functionality, readability, maintainability, performance (where relevant), security (where relevant), testing, and adherence to project standards.
*   **Constructive Tone:** Feedback should be objective, specific, actionable, and respectful. Focus on the code, not the author. Phrase suggestions constructively (e.g., "Consider doing X because..." instead of "Why didn't you do X?").
*   **Timeliness:** Aim to review Pull Requests (PRs) within 1-2 business days. If you cannot review promptly, notify the author. Authors should keep PRs reasonably small and focused to facilitate faster reviews.
*   **Automation First:** Linters (ESLint), formatters (Prettier), and type checkers (TypeScript) are enforced via Husky hooks and CI (`.github/workflows/nodejs.yml`). Reviews should focus on aspects *beyond* automated checks (logic, design, architecture, edge cases). **Ensure CI checks pass before requesting a review.**

## 2. Author Responsibilities

*   **Self-Review:** Before submitting a PR, review your own code thoroughly. Check for obvious errors, debug code, commented-out code, and adherence to standards.
*   **Clear PR Description:**
    *   Provide a concise title summarizing the change (following Conventional Commit format is encouraged even for PR titles).
    *   Describe *what* the change does and *why* it's needed. Link to relevant issues if applicable.
    *   Explain *how* the change was implemented, especially for complex logic.
    *   Include steps for testing or specific areas the reviewer should focus on.
    *   Add screenshots or GIFs for UI changes (relevant for CLI interactions via Inquirer.js).
*   **Keep PRs Focused:** Each PR should address a single concern (feature, bug fix, refactor). Avoid mixing unrelated changes.
*   **Respond to Feedback:** Address comments promptly and respectfully. Either implement the suggestion or provide a clear explanation if you disagree. Use GitHub's "Resolve conversation" feature once addressed.
*   **Update Documentation:** Ensure relevant code comments, READMEs, or other documentation are updated as part of the PR.

## 3. Reviewer Responsibilities

*   **Understand the Context:** Read the PR description and linked issues to understand the purpose and scope of the changes.
*   **Verify Functionality:** Does the code achieve the stated goal? Test the changes locally if necessary, especially for complex logic or CLI interactions. Consider edge cases and potential failure modes.
*   **Focus on High-Level Aspects First:** Prioritize architecture, design, correctness, and potential bugs before nitpicking minor style issues (which linters should catch).
*   **Provide Specific Feedback:** Clearly explain *what* the issue is, *why* it's an issue, and suggest *how* it could be improved. Reference specific lines of code.
*   **Check for Adherence to Standards:** Ensure the code follows the guidelines outlined below.
*   **Approve or Request Changes:** Clearly state whether the PR is approved or if changes are required. Avoid vague comments like "Looks good" if you haven't thoroughly reviewed.

## 4. Key Areas to Check (Checklist)

### 4.1. Functionality & Correctness

*   **Requirements:** Does the code meet the requirements outlined in the issue or PR description?
*   **Logic:** Is the logic sound? Are there any potential bugs or race conditions?
*   **Edge Cases:** Are edge cases handled gracefully (e.g., empty inputs, file not found, invalid configuration, unexpected LLM responses)?
*   **Error Handling:**
    *   Are errors handled appropriately? Is the custom `Result<T, E>` type (`src/core/result/result.ts`) used correctly for operations that can fail?
    *   Are specific error types used where defined (e.g., in `src/core/file-operations/errors.ts`, `src/core/template-manager/errors.ts`)? Avoid generic `throw new Error('...')`.
    *   Are errors logged effectively using `LoggerService`?
    *   Does the application provide meaningful feedback to the user on failure?

    ```typescript
    // Good: Using Result type for fallible operations
    import { Result, Ok, Err } from '@/core/result/result';
    import { FileNotFoundError } from '@/core/file-operations/errors';

    async function readFile(filePath: string): Promise<Result<string, FileNotFoundError>> {
      try {
        const content = await fs.promises.readFile(filePath, 'utf-8');
        return Ok(content);
      } catch (error) {
        if (error.code === 'ENOENT') {
          return Err(new FileNotFoundError(filePath));
        }
        // Consider logging unexpected errors or returning a generic error Result
        this.logger.error(`Unexpected error reading file ${filePath}:`, error);
        return Err(new Error(`Failed to read file: ${error.message}`)); // Or a more specific error type
      }
    }

    // Bad: Throwing generic errors without context or using Result
    async function readFileBad(filePath: string): Promise<string> {
        try {
            return await fs.promises.readFile(filePath, 'utf-8');
        } catch (error) {
            throw new Error('File read failed'); // Lacks detail, doesn't use Result
        }
    }
    ```

### 4.2. TypeScript & JavaScript Best Practices

*   **Type Safety:**
    *   Avoid `any` where possible. Use specific types, `unknown`, or generics.
    *   Use interfaces (`interface`) or type aliases (`type`) effectively for defining shapes. Prefer interfaces for objects/classes that might be extended.
    *   Leverage TypeScript's strict checks (`tsconfig.json`).
    *   Use `readonly` for properties/arrays that should not be modified.
*   **ES Modules:** Use `import`/`export` syntax consistently.
*   **Async/Await:** Use `async`/`await` for asynchronous operations. Ensure promises are handled correctly (awaited or returned). Avoid mixing `.then()`/`.catch()` with `async/await` unless necessary.
*   **Immutability:** Prefer immutable data structures where practical, especially when dealing with state or configuration.
*   **Modern Features:** Use modern JavaScript features appropriately (e.g., optional chaining `?.`, nullish coalescing `??`, template literals).

### 4.3. Readability & Maintainability

*   **Naming:** Use clear, descriptive names for variables, functions, classes, interfaces, and files. Follow conventions (e.g., `camelCase` for variables/functions, `PascalCase` for classes/interfaces/types/enums).
*   **Simplicity (KISS):** Is the code unnecessarily complex? Can it be simplified?
*   **Don't Repeat Yourself (DRY):** Is there duplicated code that could be extracted into reusable functions or classes?
*   **Comments:** Add comments to explain *why* something is done, not *what* it does (the code should explain the *what*). Explain complex logic, assumptions, or workarounds. Use TSDoc for public APIs.
*   **Code Structure:** Are functions/methods reasonably short and focused on a single task? Is the code within files well-organized?
*   **Magic Strings/Numbers:** Avoid hardcoding strings or numbers directly in the logic. Use named constants or enums.

    ```typescript
    // Good: Using constants
    const MAX_RETRIES = 3;
    const DEFAULT_MODEL = 'gpt-4';

    // Bad: Magic values
    if (retryCount < 3) { /* ... */ }
    const model = 'gpt-4';
    ```

### 4.4. Architecture & Design

*   **Project Structure Adherence:** Is the new code placed in the correct module according to the defined `componentStructure`? (e.g., CLI logic in `core/cli`, LLM interactions in `core/llm`, file operations in `core/file-operations`).
*   **Modularity & Cohesion:** Are modules loosely coupled and highly cohesive? Does a module have a single, well-defined responsibility?
*   **Dependency Injection (DI - `core/di`):**
    *   Are services correctly marked with `@injectable()`?
    *   Are dependencies injected via the constructor using `@inject(TYPE)`?
    *   Are interfaces (`src/core/.../interfaces.ts`) used for dependencies rather than concrete classes where appropriate (Dependency Inversion Principle)?
    *   Are services registered correctly in `src/core/di/registrations.ts`?
    *   Is `Reflect-metadata` imported (`import 'reflect-metadata';`) at the application entry point (`bin/roocode-generator.ts`)?
    *   Avoid creating instances manually (`new MyService(...)`) if the service is managed by the DI container.

    ```typescript
    // Good: Using DI with interfaces
    import { injectable, inject } from '@/core/di';
    import { ILoggerService, LoggerServiceType } from '@/core/services/interfaces';
    import { IFileOperations, FileOperationsType } from '@/core/file-operations/interfaces';

    @injectable()
    class ProjectConfigService {
      constructor(
        @inject(LoggerServiceType) private readonly logger: ILoggerService,
        @inject(FileOperationsType) private readonly fileOps: IFileOperations
      ) {}
      // ...
    }

    // Bad: Manual instantiation or depending on concrete classes directly
    import { LoggerService } from '@/core/services/logger-service'; // Depends on concrete class

    @injectable()
    class BadConfigService {
      private logger: LoggerService; // No interface
      constructor() {
        this.logger = new LoggerService(); // Manual instantiation, breaks DI
      }
      // ...
    }
    ```
*   **Internal Dependencies:** Does the change introduce unwanted dependencies between modules? Check against the intended flow (e.g., `generators` should likely depend on `core` modules, not the other way around). Avoid circular dependencies.

### 4.5. Framework-Specific Usage

*   **Langchain (`langchain`, `@langchain/*`):**
    *   Are prompts clear, well-structured, and effective for the target LLM?
    *   Is the correct LLM provider (`LLMProvider` in `core/llm`) and model selected and configured (`LLMConfigService`)?
    *   Is the LLM response parsing (`ResponseParser` in `core/analysis`) robust? Does it handle potential variations or errors in the LLM output?
    *   Are Langchain abstractions (Chains, Agents, Tools, Retrievers, Output Parsers) used appropriately and effectively?
    *   Is error handling specific to LLM interactions implemented (e.g., retries, handling rate limits)?
*   **Commander.js (`commander`):**
    *   Are commands, options, and arguments defined clearly in `bin/roocode-generator.ts` or command handlers (`src/commands/*`)?
    *   Are help messages informative?
    *   Is input validation performed correctly?
*   **Inquirer.js (`inquirer`):**
    *   Are user prompts clear and unambiguous (`CLInterface` in `core/cli`)?
    *   Are the appropriate question types used (list, input, confirm, etc.)?
    *   Is user input validated?
*   **Reflect-metadata:** Primarily used by the DI system. Ensure decorators (`@injectable`, `@inject`) are used correctly. Be mindful of potential runtime issues if metadata isn't emitted correctly (check `tsconfig.json` `emitDecoratorMetadata` and `experimentalDecorators` are `true`).

### 4.6. Testing (`jest`, `ts-jest`)

*   **Coverage:** Are new features or bug fixes covered by tests (unit or integration)? While 100% coverage isn't always practical, critical paths and complex logic *must* be tested.
*   **Test Quality:**
    *   Are tests clear and easy to understand?
    *   Do tests cover both success paths and failure paths/edge cases?
    *   Are tests independent and repeatable?
    *   Are mocks/stubs used effectively (e.g., mocking file system access, LLM calls)?
*   **Assertions:** Are assertions specific and meaningful? Avoid overly broad assertions.

### 4.7. Performance

*   **Efficiency:** Is the code reasonably efficient? Avoid unnecessary loops, redundant computations, or inefficient algorithms, especially in performance-sensitive areas (e.g., file processing, frequent LLM calls).
*   **Resource Usage:** Is the code mindful of resource usage (memory, file handles)? (Less critical for a CLI tool unless processing very large projects/files).
*   **Async Operations:** Are asynchronous operations performed concurrently when appropriate (e.g., using `Promise.all`)?

### 4.8. Security

*   **Input Sanitization:** Is external input (e.g., file paths, user input) sanitized or validated to prevent potential issues? (Less critical for a local dev tool, but good practice).
*   **Secrets Management:** Ensure API keys or other secrets (e.g., from `llm.config.json` loaded via `dotenv`) are not hardcoded or logged. Use environment variables or secure configuration methods.

### 4.9. Documentation & Comments

*   **Code Comments:** Are complex sections of code explained? Is the *intent* behind the code clear?
*   **TSDoc:** Are public functions, classes, and interfaces documented using TSDoc syntax?
*   **README/Other Docs:** If the change affects usage, configuration, or architecture, are relevant documentation files updated?

### 4.10. Configuration Management (`core/config`)

*   **Loading:** Is configuration (`roocode-config.json`, `llm.config.json`) loaded correctly and safely (`ProjectConfigService`, `LLMConfigService`)?
*   **Defaults:** Are sensible defaults provided?
*   **Validation:** Is configuration validated upon loading?

### 4.11. Dependency Management (`package.json`)

*   **Necessity:** Are new dependencies actually necessary? Could the functionality be achieved with existing dependencies?
*   **Type Definitions:** Are `@types/*` packages added for JavaScript dependencies?
*   **Versioning:** Are dependency versions appropriate? (`package-lock.json` should be updated).

## 5. Tone and Communication

*   **Be Kind:** Assume competence and positive intent from the author.
*   **Ask Questions:** If something is unclear, ask for clarification rather than making assumptions.
*   **Offer Alternatives:** When suggesting changes, explain the benefits of the alternative approach.
*   **Use Standard Phrases (Optional but helpful):**
    *   `Nit:` (Nitpick): For minor stylistic issues not caught by linters.
    *   `Suggestion:` For optional improvements.
    *   `Question:` For clarification.
    *   `Issue:` For potential bugs or design flaws that need addressing.
*   **Acknowledge Good Work:** Don't only focus on issues. Acknowledge well-written code or clever solutions.

By following these guidelines, we can ensure the `roocode-generator` project remains robust, maintainable, and high-quality.
```