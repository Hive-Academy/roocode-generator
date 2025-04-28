## Code Style and Formatting

## Code Style and Formatting

### 1. Tooling Enforcement

*   **Mandatory:** All code MUST adhere to the rules defined in the project's `.eslintrc.js` and `.prettierrc.js` configurations.
*   **Automation:** Utilize configured linters (ESLint) and formatters (Prettier) via IDE integrations and pre-commit hooks (Husky).
*   **No Manual Overrides:** Do not use `eslint-disable` or `prettier-ignore` comments without explicit justification and team agreement documented in the code or commit message.

### 2. Formatting (Handled by Prettier)

*   **Consistency:** Rely entirely on Prettier for consistent formatting (indentation, spacing, line breaks, etc.). Run `npm run format` or use IDE auto-formatting.
*   **Indentation:** Use 2 spaces for indentation (enforced by Prettier).
*   **Line Length:** Maximum line length is 120 characters (enforced by Prettier).
*   **Quotes:** Use single quotes (`'`) for strings unless double quotes (`"`) are required (e.g., JSON, JSX attributes) (enforced by Prettier/ESLint).
*   **Semicolons:** Always use semicolons at the end of statements (enforced by Prettier).
*   **Trailing Commas:** Use trailing commas wherever possible in multi-line collections (objects, arrays, imports, etc.) (enforced by Prettier).

### 3. Language Constructs & Style

*   **Variable Declaration:**
    *   Prefer `const` by default.
    *   Use `let` only when reassignment is necessary.
    *   Avoid `var`.
*   **Arrow Functions:**
    *   Prefer arrow functions (`=>`) over traditional `function` expressions, especially for callbacks and preserving `this` context.
    *   Use implicit return for single-expression functions when readable.
    ```typescript
    // Good
    const add = (a: number, b: number): number => a + b;
    const greet = (name: string): void => {
      console.log(`Hello, ${name}`);
    };

    // Avoid (unless specific 'this' binding is needed)
    function multiply(a: number, b: number): number {
      return a * b;
    }
    ```
*   **Control Structures:**
    *   Always use braces (`{}`) for `if`, `for`, `while`, `do...while` blocks, even for single lines.
    ```typescript
    // Good
    if (condition) {
      doSomething();
    }

    // Bad
    if (condition) doSomething();
    ```
*   **Equality:** Use strict equality (`===` and `!==`) instead of loose equality (`==` and `!=`).
*   **Object/Array Literals:** Use literal syntax (`{}`, `[]`) instead of constructors (`new Object()`, `new Array()`).

### 4. TypeScript Specifics

*   **Type Annotations:**
    *   Provide explicit types for function parameters, return values, and variable declarations where type inference is not obvious or desired for clarity.
    *   Use `unknown` instead of `any` when the type is genuinely unknown. Avoid `any` where possible.
*   **Interfaces vs. Types:**
    *   Prefer `interface` for defining the shape of objects or classes that can be implemented or extended.
    *   Prefer `type` for defining unions, intersections, primitives, tuples, or more complex types.
*   **Access Modifiers:** Use `public`, `private`, and `protected` explicitly for class members (methods, properties). Default is `public`.
*   **Readonly:** Use `readonly` modifier for properties that should not be reassigned after initialization.
    ```typescript
    interface Config {
      readonly apiKey: string;
      timeout: number;
    }
    ```
*   **Decorators:** Place decorators immediately above the declaration they modify.
    ```typescript
    @Injectable()
    class MyService {
      constructor(@Inject(TYPES.Logger) private logger: ILogger) {}

      @LogExecutionTime()
      public async fetchData(): Promise<Result<Data>> {
        // ...
      }
    }
    ```

### 5. Imports and Exports

*   **ES Modules:** Use ES module syntax (`import`/`export`) exclusively. Do not use `require`/`module.exports`.
*   **Path Aliases:** Utilize configured path aliases (e.g., `@/core`, `@/generators`) for internal imports. Avoid relative paths (`../..`) where aliases apply.
*   **Grouping & Ordering:** Group imports logically (e.g., Node built-ins, external libs, internal aliases, relative paths). Sort imports alphabetically within groups (enforced by ESLint plugin).
    ```typescript
    import fs from 'fs-extra'; // Node built-in (example)
    import { injectable, inject } from 'inversify'; // External libs
    import { Result } from '@/core/result'; // Internal alias
    import { ILogger } from '@/core/services/logger-service'; // Internal alias
    import { HelperUtil } from './utils'; // Relative path
    ```
*   **Named Exports:** Prefer named exports over default exports for better explicitness and refactoring ease. Use default exports only for single, primary exports per file (e.g., a main class or function).

### 6. Comments

*   **Purpose:** Write comments to explain *why* code exists, not *what* it does (unless the code is complex).
*   **Style:** Use `//` for single-line and multi-line comments. Use JSDoc (`/** ... */`) for documenting functions, classes, interfaces, and types intended for external use or complex internal logic.
*   **TODOs:** Use `// TODO:` or `// FIXME:` prefixes for actionable comments, ideally linking to an issue tracker.

### 7. Whitespace

*   **Vertical Spacing:** Use single blank lines to separate logical blocks of code (e.g., between methods, imports, related statements). Avoid multiple consecutive blank lines. (Partially enforced by Prettier/ESLint).
*   **Around Operators:** Use spaces around operators (`=`, `+`, `-`, `*`, `/`, `===`, etc.). (Enforced by Prettier).

## Project Structure

### Project Structure Rules

#### 1. Root Directory Layout
*   Source code MUST reside within the `src` directory.
*   Tests MUST reside within the `tests` directory.
*   Executable scripts (CLI entry points) MUST reside within the `bin` directory.
*   All project-level configuration files MUST be located in the root directory.
    *   Example Configs: `package.json`, `tsconfig.json`, `jest.config.js`, `.eslintrc.js`, `llm.config.json`, `roocode-config.json`.

#### 2. Source Code Organization (`src`)
*   Organize `src` by high-level features/domains: `core`, `generators`, `memory-bank`, `types`.
*   Organize `src/core` by technical concern or sub-domain (e.g., `analysis`, `di`, `llm`, `file-operations`).
*   Group related files (classes, interfaces, types, constants) for a specific feature within its designated directory.
    *   Example: All files related to LLM configuration belong in `src/core/config/`.
*   Avoid overly nested directory structures (generally max 3-4 levels deep within `src`).

#### 3. Module Structure
*   Each directory represents a module or sub-module.
*   Files within a module directory SHOULD only relate to that module's specific responsibility.
*   Module-specific interfaces MUST be defined in an `interfaces.ts` file within the module directory.
*   Module-specific types SHOULD be defined in a `types.ts` file within the module directory or a dedicated `types` sub-directory if numerous.
*   Use `index.ts` (barrel files) *only* for exporting the public API of a well-defined module (e.g., `src/core/di/index.ts`). Avoid using them solely for re-exporting everything within a directory.

#### 4. File Naming Conventions
*   Use `kebab-case` for directory names and non-class file names.
    *   Examples: `file-operations`, `project-analyzer.ts`, `types.ts`, `interfaces.ts`.
*   Use `PascalCase` for files containing primarily a class definition, matching the class name.
    *   Example: `ProjectAnalyzer.ts` (if it primarily defines `class ProjectAnalyzer`). *Note: Current structure uses kebab-case; stick to kebab-case for consistency unless refactoring.*
    *   **Rule:** Use `kebab-case` for all `.ts` files. (e.g., `project-analyzer.ts`, `llm-config.service.ts`).
*   Test files MUST mirror the path of the tested file within the `tests` directory and use the `.test.ts` suffix.
    *   Example: `src/core/analysis/project-analyzer.ts` -> `tests/core/analysis/project-analyzer.test.ts`.

#### 5. Specific Directory Rules
*   **`src/core/di`**: Contains all Dependency Injection setup (container, decorators, modules, registrations). DI modules MUST reside in `src/core/di/modules/`.
*   **`src/types`**: Contains globally shared types and interfaces used across multiple high-level modules.
*   **`src/generators`**: Contains specific generator implementations (e.g., `rules-generator.ts`). Sub-modules like `src/generators/rules` group related generator logic.
*   **`src/memory-bank`**: Contains all logic related to the "memory bank" feature. Use `interfaces.ts` or the `interfaces` sub-directory for its contracts.

#### 6. Entry Points (`bin`)
*   The `bin` directory contains the primary executable scripts.
*   TypeScript source files (`.ts`) are preferred, compiled to JavaScript (`.js`) for execution.

## Naming Conventions

### Naming Conventions

#### General

*   Use descriptive, unambiguous names.
*   Avoid abbreviations unless widely accepted (e.g., `id`, `db`, `url`, `http`).
*   Favor readability over brevity.

#### Casing

*   **`camelCase`**: Variables, parameters, functions, methods, properties, decorator functions.
    ```typescript
    const itemCount = 5;
    function getUserProfile(userId: string): UserProfile { /* ... */ }
    class DataService { processData(data: any[]): void { /* ... */ } }
    @injectable()
    ```
*   **`PascalCase`**: Classes, interfaces, type aliases, enums, enum members.
    ```typescript
    class ProjectAnalyzer { /* ... */ }
    interface FileOperationResult { /* ... */ }
    type ConfigOption = string | number;
    enum LogLevel { Info, Warn, Error }
    ```
*   **`UPPER_SNAKE_CASE`**: Global or static constants representing immutable values.
    ```typescript
    const MAX_CONNECTIONS = 10;
    class Settings { static readonly DEFAULT_TIMEOUT = 5000; }
    ```
*   **`kebab-case`**: File names, directory names, configuration keys (in JSON/YAML).
    ```
    src/core/file-operations/file-operations.ts
    src/memory-bank/
    llm.config.json -> { "max-retries": 3 }
    ```

#### Files and Directories

*   **Files**: Use `kebab-case`. Include the primary export's role if applicable.
    *   `project-analyzer.ts`
    *   `llm-config.service.ts`
    *   `base-generator.ts`
    *   `content-generator.interface.ts`
    *   `memory-bank-errors.ts`
    *   `index.ts` (for barrel exports within a directory)
*   **Test Files**: Use `[filename].spec.ts`.
    *   `project-analyzer.spec.ts`
*   **Directories**: Use `kebab-case`.
    *   `src/core/file-operations/`
    *   `src/generators/rules/`

#### Variables and Properties

*   Use `camelCase`.
    ```typescript
    let isActive: boolean;
    const configService = container.resolve(ConfigService);
    class User { userName: string; }
    ```
*   Boolean variables should imply truthiness (e.g., `isEnabled`, `hasChanges`).

#### Functions and Methods

*   Use `camelCase`. Start with a verb or verb phrase.
    ```typescript
    function calculateTotal(items: Item[]): number { /* ... */ }
    async function fetchData(url: string): Promise<Data> { /* ... */ }
    class FileService { readFile(path: string): Result<string> { /* ... */ } }
    ```

#### Classes

*   Use `PascalCase`. Names should be nouns or noun phrases.
    ```typescript
    class ApplicationContainer { /* ... */ }
    class LoggerService { /* ... */ }
    class BaseGenerator { /* ... */ } // Use Base suffix for abstract/base classes
    ```

#### Interfaces and Type Aliases

*   Use `PascalCase`.
*   Do **not** use an `I` prefix for interfaces.
    ```typescript
    interface ProjectConfig { rootDir: string; } // Good
    // interface IProjectConfig { /* ... */ } // Bad
    type Result<T, E = Error> = Success<T> | Failure<E>;
    type FilePath = string;
    ```
*   Group related types/interfaces in `types.ts` or `interfaces.ts` files within a module, or use `[feature].types.ts`.

#### Enums

*   Use `PascalCase` for enum names.
*   Use `PascalCase` for enum members.
    ```typescript
    enum FileStatus { Pending, Processing, Completed, Failed }
    const status = FileStatus.Processing;
    ```

#### Constants

*   Use `UPPER_SNAKE_CASE` for truly immutable, widely used constants.
    ```typescript
    const DEFAULT_ENCODING = 'utf-8';
    export const API_VERSION = 'v1';
    ```
*   Use `readonly camelCase` for class instance constants if appropriate.
    ```typescript
    class Config { readonly maxRetries: number = 3; }
    ```

#### Decorators

*   Use `camelCase` for decorator functions.
    ```typescript
    @injectable()
    class MyService { /* ... */ }

    @logExecutionTime
    async myMethod() { /* ... */ }
    ```

#### Private/Protected Members

*   Use `private` and `protected` keywords.
*   Do **not** use underscore (`_`) prefixes for private/protected members.
    ```typescript
    class DataProcessor {
      private apiKey: string; // Good
      // private _apiKey: string; // Bad

      protected processChunk(chunk: Buffer): void { /* ... */ } // Good
      // protected _processChunk(chunk: Buffer): void { /* ... */ } // Bad
    }
    ```

#### Acronyms

*   Treat acronyms as words in `camelCase` and `PascalCase`.
    *   `PascalCase`: `LlmAgent`, `HttpServer`, `JsonParser` (Not `LLMAgent`, `HTTPServer`, `JSONParser`)
    *   `camelCase`: `llmAgent`, `httpServer`, `jsonParser` (Not `lMMAgent`, `hTTPServer`, `jSONParser`)

## Dependency Management

## Dependency Management Rules

### 1. Package Manager & Lock File

*   **Use `npm` exclusively** for all package management operations.
*   **Always commit `package-lock.json`** to version control. This ensures reproducible builds.
*   Use `npm ci` in CI/CD environments for faster, reliable installs based on `package-lock.json`.

### 2. Dependency Declaration (`package.json`)

*   **`dependencies`**: List packages required for the application to run in production (e.g., `langchain`, `commander`, `reflect-metadata`).
*   **`devDependencies`**: List packages needed only for development, testing, or build processes (e.g., `typescript`, `eslint`, `jest`, `@types/*`).
*   **Avoid `peerDependencies`** unless creating a reusable library intended for others to consume.
*   **Do not list `@types/*` packages in `dependencies`**. They belong in `devDependencies`.

### 3. Versioning

*   **Use Semantic Versioning (SemVer)** ranges.
*   **Prefer caret (`^`) ranges** for `dependencies` to allow non-breaking updates (e.g., `"langchain": "^0.3.0"`).
*   **Use caret (`^`) or tilde (`~`) ranges** for `devDependencies`. Pinned versions are acceptable if specific tooling versions are required.
    ```json
    // package.json example
    "dependencies": {
      "commander": "^13.1.0",
      "reflect-metadata": "^0.2.2"
    },
    "devDependencies": {
      "typescript": "^5.8.3",
      "@types/node": "^22.14.1",
      "jest": "~29.7.0" // Example of tilde range
    }
    ```

### 4. Adding & Removing Dependencies

*   **Evaluate necessity**: Before adding a dependency, check if functionality exists in Node.js core, the framework, or existing dependencies.
*   **Check maintenance**: Prefer actively maintained libraries with good community support.
*   **Add explicitly**: Use `npm install <package>` (for `dependencies`) or `npm install --save-dev <package>` (for `devDependencies`).
*   **Remove unused**: Regularly review and remove dependencies that are no longer used. Use `npm uninstall <package>`.

### 5. Security & Updates

*   **Run `npm audit` regularly** to identify known vulnerabilities.
*   **Address high/critical vulnerabilities promptly**.
*   **Update dependencies periodically**: Use `npm outdated` to check for updates and `npm update` cautiously. Test thoroughly after updates.

### 6. Internal Project Dependencies

*   **Use TypeScript path aliases** defined in `tsconfig.json` for cleaner internal imports.
    ```json
    // tsconfig.json "paths" example
    "paths": {
      "@/*": ["src/*"],
      "@core/*": ["src/core/*"],
      "@generators/*": ["src/generators/*"],
      "@memory-bank/*": ["src/memory-bank/*"]
    }
    ```
*   **Configure `module-alias`** in `package.json` to resolve paths in compiled JavaScript.
    ```json
    // package.json _moduleAliases example
    "_moduleAliases": {
      "@": "dist/src",
      "@core": "dist/src/core",
      "@generators": "dist/src/generators",
      "@memory-bank": "dist/src/memory-bank"
    }
    ```
*   **Import using defined aliases**:
    ```typescript
    // Good: Use path alias
    import { LoggerService } from '@core/services/logger-service';

    // Bad: Avoid relative paths for cross-module imports
    // import { LoggerService } from '../../core/services/logger-service';
    ```
*   **Avoid circular dependencies** between internal modules/components. Structure code to maintain a clear dependency flow.

### 7. Type Definitions (`@types/*`)

*   **Install `@types/*` packages** for any JavaScript dependency used within the TypeScript codebase.
*   **Always place `@types/*` packages in `devDependencies`**.
*   Attempt to match the `@types/*` version with the corresponding library version when possible.

## Programming Language Best Practices

### TypeScript Best Practices

*   **Strict Typing:** Enable `strict` mode in `tsconfig.json`. Avoid `any` unless absolutely necessary and clearly justified.
*   **Type Inference:** Leverage type inference for simple types, but explicitly type function signatures, complex objects, and public API boundaries.
*   **Interfaces vs. Types:**
    *   Use `interface` for defining object shapes and for classes to implement (`implements`).
    *   Use `type` for unions, intersections, primitive aliases, mapped types, and conditional types.
    ```typescript
    // Good: Interface for object shape/contract
    interface UserProfile {
      userId: string;
      displayName: string;
    }
    // Good: Type for union or complex type
    type RequestStatus = 'pending' | 'success' | 'error';
    type UserWithStatus = UserProfile & { status: RequestStatus };
    ```
*   **Readonly:** Use `readonly` for properties that should not be modified after initialization, promoting immutability.
    ```typescript
    interface AppConfig {
      readonly rootDir: string;
      readonly maxRetries: number;
    }
    ```
*   **Enums:** Prefer string enums or string literal union types over numeric enums for better debuggability.
    ```typescript
    // Good: String enum
    enum GeneratorType { Rules = 'RULES', MemoryBank = 'MEMORY_BANK' }
    // Good: Union type
    type LogLevel = 'debug' | 'info' | 'warn' | 'error';
    ```
*   **Classes:** Use classes for services, entities with behavior, and components managed by the DI container. Use access modifiers (`public`, `private`, `protected`) explicitly.
*   **Decorators:** Utilize decorators (`@Injectable`, `@Inject`, etc.) consistently for Dependency Injection as defined in `src/core/di`. Ensure `experimentalDecorators` and `emitDecoratorMetadata` are enabled in `tsconfig.json`.

### JavaScript Best Practices (Apply where TS isn't used)

*   **Modern Syntax:** Use ES6+ features (`let`, `const`, arrow functions, template literals, destructuring). Avoid `var`.
*   **Modules:** Use ES Modules (`import`/`export`) exclusively.

### Asynchronous Programming (Node.js & Langchain)

*   **`async/await`:** Strongly prefer `async/await` for all asynchronous operations.
*   **Error Handling:** Always handle Promise rejections using `try...catch` within `async` functions or `.catch()` on Promises. Avoid unhandled rejections.
*   **Concurrency:** Use `Promise.all` for parallel independent tasks. Use `Promise.allSettled` if all results (fulfilled or rejected) are needed. Be mindful of potential rate limits or resource contention.
*   **Langchain Chains/Agents:** Ensure proper handling of asynchronous steps within Langchain sequences. Use streaming responses where appropriate for better UX in CLI tools.

### Modularity and Structure

*   **Single Responsibility Principle (SRP):** Ensure classes, functions, and modules have one primary responsibility. (e.g., `FileOperations` handles file I/O, `LLMAgent` handles LLM interaction).
*   **Path Aliases:** Use configured path aliases (`@core`, `@generators`, `@/types`) for internal imports. Avoid relative paths (`../..`).
*   **Exports:** Use named exports. Use `index.ts` files primarily to define the public interface of a module/directory (e.g., `src/core/di/index.ts`).
*   **Dependency Injection (DI):**
    *   Use constructor injection via `@Injectable` and `@Inject` for dependencies.
    *   Define clear interfaces (`src/core/.../interfaces.ts`) for services and inject interfaces, not concrete classes where possible (Dependency Inversion).
    *   Register dependencies in dedicated modules (`src/core/di/modules`).

### Error Handling

*   **Custom Errors:** Define and use specific error classes extending `Error` (e.g., `ConfigurationError`, `LLMError`, `MemoryBankError`).
*   **Result Pattern:** Consistently use the `Result<T, E>` type (`src/core/result/result.ts`) for operations that can fail predictably. Return `Result.ok(value)` on success and `Result.err(error)` on failure. Avoid throwing exceptions for expected error conditions.
    ```typescript
    import { Result } from '@core/result/result';

    async function readFile(path: string): Promise<Result<string, FileReadError>> {
      try {
        const content = await fs.readFile(path, 'utf-8');
        return Result.ok(content);
      } catch (e) {
        return Result.err(new FileReadError(`Failed to read ${path}: ${e.message}`));
      }
    }
    ```

### Naming Conventions

*   **`camelCase`:** Variables, parameters, functions, methods.
*   **`PascalCase`:** Classes, interfaces, types, enums.
*   **`UPPER_SNAKE_CASE`:** Constants, string enum members.
*   **`kebab-case`:** File names (e.g., `project-analyzer.ts`), configuration keys in JSON/YAML.
*   **Interfaces:** Use `PascalCase` without an `I` prefix (e.g., `ProjectConfigService`, not `IProjectConfigService`).

### Code Style & Readability

*   **Linter/Formatter:** Strictly adhere to ESLint and Prettier rules configured in the project. Run formatters/linters before committing.
*   **Comments:** Use TSDoc comments (`/** ... */`) for exported functions, classes, interfaces, and types. Use `//` for internal implementation comments only when necessary to explain *why*, not *what*.
*   **Function Size:** Keep functions small and focused on a single task.
*   **Constants:** Define constants for magic strings and numbers at the top of the file or in a dedicated constants file.
*   **Avoid Nesting:** Limit deep nesting of control structures (`if`, `for`, `try/catch`). Refactor using helper functions or early returns.