---
title: Developer Guide
version: 1.1.0
lastUpdated: 2024-08-28T14:00:00Z # Placeholder - Update with actual date
type: core-documentation
category: development
---

# Developer Guide

This guide provides instructions for setting up the development environment, understanding the project structure, and following the development workflow for the **roocode-generator** project. It aims to enable team members to quickly understand and contribute to the project while maintaining consistency and quality.

## 1. Development Setup

### 1.1. Prerequisites

Before starting development, ensure you have the following installed:

- **Node.js**: Version 18.x or higher is recommended (check `engines` in `package.json`, currently `>=16`). Download from [nodejs.org](https://nodejs.org/).
- **npm**: Comes bundled with Node.js. This project uses npm (as indicated by `package-lock.json`).
- **Git**: For version control. Download from [git-scm.com](https://git-scm.com/).
- **API Keys**: You will need API keys for the desired LLM providers (e.g., Anthropic, Google Gemini, OpenAI) you intend to use or test with. These are required for core functionality involving LLM interactions.

### 1.2. Environment Setup

1.  **Clone the repository:**

    ```bash
    git clone <repository-url> # Replace with the actual repository URL from package.json or source control
    cd roocode-generator
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up environment variables:**

    - Create a `.env` file in the project root (`.`). You can copy `.env.example` if it exists.
    - Add the necessary API keys for the LLM services you intend to use:
      ```env
      # .env file content
      ANTHROPIC_API_KEY=your_anthropic_api_key
      GOOGLE_API_KEY=your_google_api_key # As seen in example config
      OPENAI_API_KEY=your_openai_api_key
      ```
    - **Note:** Never commit your `.env` file to version control. It's included in `.gitignore` by default. The application uses `dotenv/config` to load these variables at runtime.

4.  **Prepare Git Hooks:**
    Husky is used to manage Git hooks for linting and commit message validation. Ensure hooks are installed by running the `prepare` script:
    ```bash
    npm run prepare
    ```
    This command is typically run automatically after `npm install`.

### 1.3. Required Tools & Technologies

This project utilizes the following tools and technologies:

- **Code Editor**: Visual Studio Code (VS Code) is recommended.
  - **Recommended Extensions**: ESLint, Prettier - Code formatter, Jest Runner.
- **TypeScript**: (`typescript` dev dependency) Used for static typing across the project. Configuration in `tsconfig.json`.
- **Node.js**: (`engines` in `package.json`) JavaScript runtime environment.
- **npm**: Package manager used for dependency management.
- **ESLint**: (`eslint`, `@typescript-eslint/*`, `typescript-eslint` dev dependencies) For identifying and fixing code style issues and potential errors. Configuration in `eslint.config.mjs` (ESLint Flat Config).
- **Prettier**: (`prettier` dev dependency) For automatic code formatting. Configuration likely in `.prettierrc` or `package.json`.
- **Jest**: (`jest`, `ts-jest`, `@jest/globals` dev dependencies) Testing framework for unit and integration tests. Configuration in `jest.config.js`.
- **Husky**: (`husky` dev dependency) Manages Git hooks (pre-commit, commit-msg). Configuration likely in `.husky/`.
- **Commitlint**: (`@commitlint/cli`, `@commitlint/config-conventional` dev dependencies) Enforces conventional commit message format. Configuration in `commitlint.config.js`.
- **Semantic Release**: (`semantic-release`, `@semantic-release/*` dev dependencies) For automated version management and package publishing based on commit messages. Configuration likely in `package.json` or `.releaserc`.
- **Langchain**: (`langchain`, `@langchain/*` dependencies) Library for interacting with Large Language Models (LLMs). Used for core generation features.
- **Commander**: (`commander` dependency) Framework for building the command-line interface.
- **Inquirer**: (`inquirer` dependency) Used for interactive command-line prompts (e.g., in `config` command).
- **Chalk**: (`chalk` dependency) For styling terminal output.
- **Ora**: (`ora` dependency) For displaying spinners during long-running operations.
- **module-alias**: (`module-alias` dependency) Used for simplifying module path resolution (setup in `bin/roocode-generator.js` and `tsconfig.json` paths).
- **Reflect Metadata**: (`reflect-metadata` dependency) Crucial for decorator metadata used by the custom Dependency Injection system. Must be imported early (`bin/roocode-generator.js`).
- **dotenv**: (`dotenv` dependency) Loads environment variables from a `.env` file.

## 2. Project Structure

The project follows a structured approach, separating source code, build output, tests, and configuration.

```

roocode-generator/
├── bin/ # Compiled executable scripts (entry point: roocode-generator.js)
├── dist/ # Compiled JavaScript output from TypeScript (`outDir` in tsconfig.json)
├── src/ # Main TypeScript source code (`rootDir` in tsconfig.json)
│ ├── core/ # Core framework components (DI, errors, services, etc.)
│ │ ├── application/ # Application orchestration (ApplicationContainer, GeneratorOrchestrator)
│ │ ├── analysis/ # Project analysis logic (ProjectAnalyzer, ResponseParser, types.ts)
│ │ ├── cli/ # CLI interface implementation (CliInterface)
│ │ ├── config/ # Configuration loading/saving (LLMConfigService, ProjectConfigService)
│ │ ├── di/ # Dependency Injection (Container, decorators, modules, registrations)
│ │ ├── errors/ # Custom error classes (RooCodeError, FileOperationError, memory-bank-errors.ts, etc.)
│ │ ├── file-operations/ # File system abstractions (FileOperations, interfaces.ts)
│ │ ├── generators/ # Base generator classes/interfaces (BaseGenerator, IGenerator)
│ │ ├── llm/ # LLM interaction (LLMAgent, providers, provider-registry)
│ │ ├── result/ # Result type definition (Result class)
│ │ ├── services/ # Common services (LoggerService, BaseService)
│ │ ├── template-manager/ # Generic template management (TemplateManager, Template)
│ │ ├── templating/ # Rules-specific template processing (RulesTemplateManager, TemplateProcessor)
│ │ ├── types/ # Core shared type definitions (shared.ts, common.ts) - Used by many core parts
│ │ └── ui/ # UI elements (ProgressIndicator - Ora wrapper)
│ ├── generators/ # Specific generator implementations
│ │ ├── rules/ # Rules generator specific files (RulesGenerator, RulesFileManager, etc.)
│ │ ├── roomodes-generator.ts
│ │ ├── system-prompts-generator.ts
│ │ └── vscode-copilot-rules-generator.ts
│ ├── memory-bank/ # Memory Bank generator specific files (MemoryBankGenerator, orchestrator, services, etc.)
│ └── types/ # Top-level shared types (shared.ts - LLMConfig, ProjectConfig)
├── templates/ # Static template files used by generators
│ ├── guide/ # Fallback templates for memory bank
│ ├── memory-bank/
│ │ └── templates/ # Task management templates (e.g., task-description-template.md)
│ ├── rules/ # Mode-specific rule templates (e.g., architect/base.md)
│ └── system-prompts/ # System prompt templates for modes
├── tests/ # Unit and integration tests (`testMatch` in jest.config.js)
│ └── ... # Subdirectories mirroring src structure (planned co-location)
├── .env.example # Example environment variables file
├── .git/ # Git directory
├── .gitignore # Files/directories ignored by Git (should include dist/, node_modules/, .env, coverage/)
├── .husky/ # Husky Git hooks configuration
├── .roo/ # RooCode specific configuration/rules (generated output)
│ └── rules-code/ # Generated single Markdown rules file
│     └── rules.md # The main generated rules file
├── commitlint.config.js # Commitlint configuration (Conventional Commits)
├── eslint.config.mjs # ESLint configuration (Flat Config format)
├── jest.config.js # Jest test runner configuration
├── LICENSE # Project license file (MIT)
├── llm.config.json # LLM configuration file (managed by `config` command)
├── package-lock.json # Exact dependency versions (indicates npm usage)
├── package.json # Project metadata, dependencies, scripts
├── README.md # Project overview and basic usage
├── roocode-config.json # RooCode project configuration (used by generators)
├── SECURITY.md # Security policy (standard template)
├── tsconfig.json # TypeScript compiler configuration
└── memory-bank/ # Default output directory for generated Memory Bank documentation
├── DeveloperGuide.md # This file (generated)
├── ProjectOverview.md # Generated project overview
└── TechnicalArchitecture.md # Generated architecture document

```

Refer to [[TechnicalArchitecture#Core-Components]] for detailed component information about the **Modular CLI with LLM Integration** architecture.

### 2.1. Command Execution Flow

Understanding the basic flow of command execution is helpful for adding new commands or modifying existing ones:

1.  **Parsing (`CliInterface`):** The `src/core/cli/cli-interface.ts` uses `commander` to parse command-line arguments (`process.argv`) and options.
2.  **Routing (`ApplicationContainer`):** The `src/core/application/application-container.ts` retrieves the parsed command and uses its `executeCommand` method (typically a `switch` statement) to route to the appropriate handler method (e.g., `executeGenerateCommand`).
3.  **Orchestration (`GeneratorOrchestrator`):** For the `generate` command, the handler delegates to `src/core/application/generator-orchestrator.ts`, which identifies and runs the specific `IGenerator` implementations.

For a more detailed step-by-step breakdown and diagram, see the **System Design** section in [[TechnicalArchitecture#System-Design]].

## 3. Development Workflow

### 3.1. Process Overview

This project utilizes **Trunk-Based Development** with short-lived feature branches recommended for non-trivial changes.

1.  **Sync with `main`:** Always ensure your local `main` branch is up-to-date before starting work:
    ```bash
    git checkout main
    git pull origin main
    ```
2.  **Create a Feature Branch (Recommended for > trivial changes):** While direct commits to `main` might occur for very small fixes, larger features or complex bug fixes should be done on short-lived feature branches:
    ```bash
    # Choose a descriptive name based on Conventional Commit types
    git checkout -b feat/your-feature-name
    # or
    git checkout -b fix/your-bug-fix-name
    # or
    git checkout -b refactor/component-name
    ```
3.  **Develop:** Implement the feature or fix the bug. Follow the guidelines in Section 4. Write tests alongside your code (see Section 4.3).
4.  **Commit Changes:** Make small, logical commits using the **Conventional Commits** format (enforced by Commitlint via Husky hooks):
    ```bash
    git add .
    # Use 'npm run cz' (if commitizen is added) or 'git commit' and follow guidelines
    git commit -m "feat(cli): add new 'analyze' command"
    git commit -m "fix(parser): resolve issue with template parsing errors"
    git commit -m "refactor(core): improve DI container performance"
    git commit -m "docs: update developer guide for testing strategy"
    git commit -m "test(llm): add tests for OpenAI provider"
    # etc.
    ```
    Commit messages will be linted automatically on `git commit` via Husky hooks. Fix any errors reported by the hook.
5.  **Run Local Checks:** Before pushing, ensure code quality and that tests pass:
    ```bash
    npm run lint          # Check for linting errors
    npm run format        # Check formatting (or npm run format:write to fix)
    npm run type-check    # Check for TypeScript errors
    npm test              # Run unit/integration tests
    ```
    Fix any issues reported by these checks.
6.  **Push Changes:**
    - For direct commits (small fixes on `main` - use sparingly): `git push origin main`
    - For feature branches: `git push origin feat/your-feature-name`
7.  **Create Pull Request (if using feature branches):** Open a Pull Request (PR) from your feature branch to `main` (e.g., on GitHub/GitLab). Ensure CI checks (linting, testing, building) pass.
8.  **Code Review (Mandatory for PRs):** Have your code reviewed by at least one other team member. Address feedback by pushing additional commits to your feature branch.
9.  **Merge:** Once approved and CI passes, merge the PR into `main` (typically using a squash merge via the Git platform UI). Delete the feature branch after merging.
10. **Release:** `semantic-release` automatically handles versioning and publishing to npm based on commit messages on the `main` branch when run in the CI environment (e.g., GitHub Actions).
    213 |
    214 | ### 3.2. Task Management
    215 |
    216 | The project utilizes a structured approach for defining, planning, and tracking work, indicated by the templates found in `templates/memory-bank/templates/`:
    217 |
    218 | - **Requirements:** Use `task-description-template.md` to define new tasks or features.
    219 | - **Planning:** Outline implementation steps using `implementation-plan-template.md`.
    220 | - **Completion:** Document completed work with `completion-report-template.md`.
    221 | - **Workflow Acknowledgement:** Use `mode-acknowledgment-template.md` when starting work within a specific RooCode mode (Architect, Implement, Review).
    222 |
    223 | Maintain these documents within a designated tracking directory (e.g., `progress-tracker/`) as seen in the context examples.
    224 |
    225 | ## 4. Code Guidelines
    226 |
    227 | ### 4.1. Standards and Practices
    228 |
    229 | - **Language**: Use **TypeScript** (`^5.8.3` or compatible) for all new code. Adhere to modern JavaScript/TypeScript features enabled by the `es2020` target in `tsconfig.json`. Enable `strict` mode in `tsconfig.json`.
    230 | - **Style & Formatting**: Strictly adhere to the rules defined in `eslint.config.mjs` (ESLint) and Prettier configuration.
    231 | - Run `npm run lint` and `npm run format` regularly.
    232 | - Formatting is automatically checked/applied on pre-commit hooks via Husky/lint-staged.
    233 | - **Naming Conventions**: Follow standard TypeScript/JavaScript naming conventions:
    234 | - `camelCase` for variables, functions, and object properties.
    235 | - `PascalCase` for classes, types, interfaces (see note below), and enums.
    236 | - `UPPER_CASE` for constants.
    237 | - **Interface Naming:** Prefix interfaces defining contracts for services or major components with `I` (e.g., `ILogger`, `IFileOperations`, `IGenerator`). For simple data structures or types, `PascalCase` without the `I` prefix is acceptable (e.g., `ProjectConfig`, `RuleVersion`).
    238 | - **Modularity**: Design components to be modular, reusable, and have clear responsibilities (Single Responsibility Principle). Leverage established patterns observed in the codebase:
    239 | - **Dependency Injection**: Use the custom DI container (`src/core/di/`) with `@Injectable` and `@Inject` decorators. See section 4.2.
    240 | - **Generator Pattern**: Follow the `BaseGenerator` structure (`src/core/generators/base-generator.ts`) for creating new generators. Generators should implement the `IGenerator` interface.
    241 | - **Configuration-Driven**: Rely on `roocode-config.json` (via `ProjectConfigService`) and `llm.config.json` (via `LLMConfigService`) for behavior control.
    242 | - **LLM Abstraction**: Interact with LLMs via the `LLMAgent` and `ILLMProvider` interfaces defined in `src/core/llm/`.
    243 | - **Result Pattern**: Use the `Result` class (`src/core/result/result.ts`) for explicit error handling in functions that can fail predictably (e.g., file operations, API calls, parsing).
    244 | - **Error Handling**:
    245 | - Implement robust error handling using the `Result<T, E>` type (`src/core/result/result.ts`) for functions that can fail predictably. This makes error handling explicit and type-safe.
    246 | - Use custom error classes extending `RooCodeError` (e.g., `FileOperationError`, `GeneratorError`, `MemoryBankError` from `src/core/errors/`) as the error type `E` within the `Result` for specific error types where beneficial. This provides detailed context for failures.
    247 | - Use standard `try...catch` primarily for unexpected runtime errors at higher levels (like the main entry point or around external library calls that don't use the `Result` pattern).
    248 | - Provide meaningful error messages and context within error objects.
    249 | - Log errors using the `ILogger` service, often by passing the `error` object from a failed `Result`.
    250 | - **Logging**: Use the `ILogger` service (resolved via DI) for all application logging. Avoid `console.log` in application code (except potentially at the very top level entry point for fatal errors before the logger is available, or within the `LoggerService` implementation itself). Use different log levels (`debug`, `info`, `warn`, `error`) appropriately.
    251 | - **Memory Bank Errors**: Specific errors related to the Memory Bank generator functionality are defined in `src/core/errors/memory-bank-errors.ts`. These extend the base `MemoryBankError` (which extends `RooCodeError`) and provide more specific context:
    252 | - `MemoryBankGenerationError`: Errors during the overall generation process.
    253 | - `MemoryBankTemplateError`: Errors related to loading or processing memory bank templates.
    254 | - `MemoryBankFileError`: Errors during file operations (read/write) within the memory bank context.
    255 | - `MemoryBankValidationError`: Errors during validation steps specific to memory bank content or structure.
    256 | Use these specific errors where applicable to provide clearer diagnostics.
    257 | - **Commit Messages**: Strictly follow the [Conventional Commits specification](https://www.conventionalcommits.org/). This is enforced by Commitlint via Husky hooks (`commit-msg` hook). Example types: `feat`, `fix`, `refactor`, `perf`, `test`, `build`, `ci`, `docs`, `style`.
    258 |
    259 | ### 4.2. Modular DI Registration Pattern
    260 |
    261 | To enhance organization and maintainability, the project's custom Dependency Injection (DI) registration logic is modularized. Instead of a single large registration function, dependencies are registered in dedicated module files located under `src/core/di/modules/`.
    262 |
    263 | **Key Principles:**
    264 |
    265 | - **Separation of Concerns:** Each module file (e.g., `app-module.ts`, `core-module.ts`, `llm-module.ts`, `rules-module.ts`, `memory-bank-module.ts`) contains registration logic specific to its domain, typically using factory functions (`container.registerFactory`) or singleton registration (`container.registerSingleton`).
    266 | - **Centralized Loading:** The main registration entry point (`src/core/di/registrations.ts`) imports these modules and calls their respective registration functions (`registerCoreModule`, `registerLlmModule`, etc.) within the `registerServices` function. This builds the complete dependency graph for the container.
    267 | - **Scalability:** This pattern makes it easier to add or modify dependencies for specific features without altering a single, large registration file. New features should ideally have their own registration module.
    268 |
    269 | **Example Structure:**
    270 |
    271 | `272 | 
273 | src/
274 | └── core/
275 | └── di/
276 | ├── container.ts # Main Container class
277 | ├── decorators.ts # @Injectable, @Inject decorators
278 | ├── errors.ts # DI-specific errors
279 | ├── index.ts # Barrel file for DI exports
280 | ├── interfaces.ts # IServiceContainer interface
281 | ├── types.ts # Core DI types (ServiceLifetime, etc.)
282 | ├── modules/ # <-- DI Registration Modules
283 | │ ├── app-module.ts
284 | │ ├── core-module.ts
285 | │ ├── llm-module.ts
286 | │ ├── memory-bank-module.ts
287 | │ └── rules-module.ts
288 | └── registrations.ts # Central registration function (imports & calls modules)
289 | 
290 |`
    291 |
    292 | **Adding New Dependencies:**
    293 |
    294 | 1. Identify the appropriate module (e.g., `core`, `llm`, `rules`, `memory-bank`, or a new feature module).
    295 | 2. Add the service registration (using `registerSingleton` or `registerFactory` from `@core/di/index.ts` helpers or directly on the container) within that module's registration function (e.g., `registerCoreModule`).
    296 | 3. Ensure the module registration function is called within `src/core/di/registrations.ts`.
    297 | 4. Use `@Inject('YourServiceToken')` in the constructor of classes needing the dependency. Ensure the token used matches the registration token.
    298 |
    299 | ### 4.3. Quality and Testing
    300 |
    301 | - **Testing Approach**: The project uses **Jest** (`^29.7.0`) as the primary testing framework, configured with `ts-jest` (`^29.3.2`) for seamless TypeScript support (`jest.config.js`). Unit and integration tests are expected to be located in the `tests/` directory, following the naming convention `*.test.ts`. _(Note: While co-location of tests (`src/component/component.test.ts`) is a common practice, the current configuration specifies `tests/**/*.test.ts`. Follow the existing structure unless a migration is planned)._
    302 | - **Coverage Goals**: The project enforces a minimum global coverage threshold of **80%** for branches, functions, lines, and statements, as configured in `jest.config.js` (`coverageThreshold`). Strive to maintain or increase coverage with new contributions.
    303 | - **Memory Bank Testing Patterns**: The Memory Bank generator follows specific testing patterns:
    304 | - **Component Testing**: Each major component (`MemoryBankGenerator`, `MemoryBankOrchestrator`, `MemoryBankTemplateProcessor`, etc.) has dedicated unit tests.
    305 | - **Mock Dependencies**: Use Jest mocks (`jest.fn()`, `jest.mock()`) extensively for dependencies (LLM, File Operations, Logger, etc.) to isolate components during unit testing.
    306 | - **Error Handling Tests**: Verify that specific `MemoryBankError` types are thrown/returned correctly using `Result.err()` and that errors are logged appropriately.
    307 | - **Success Path Tests**: Ensure the happy path works as expected, returning `Result.ok()`.
    308 | - **Integration Testing**: Test interactions between components (e.g., Generator -> Orchestrator -> FileManager). May use real implementations for some services (like FileOperations if testing actual file output) while mocking others (like LLMAgent).
    309 | - **Validation**:
    310 | - **Static Analysis**: Run `npm run lint` to check for code style and potential errors based on `eslint.config.mjs`. Fix all reported issues.
    311 | - **Type Checking**: Run `npm run type-check` (uses `tsc --noEmit`) to ensure type safety based on `tsconfig.json`. Resolve all TypeScript errors.
    312 | - **Running Tests**:
    313 | - Run all tests once:
    314 | `bash
315 |     npm test
316 |     `
    317 | - Run tests in watch mode during development:
    320 | `bash
321 |     npm run test:watch
322 |     `
    323 | - Generate test coverage report:
    324 | `bash
325 |     npm run test:coverage
326 |     `
    327 | - **Testing Framework Setup**:
    328 | - Jest configuration is defined in `jest.config.js`.
    329 | - Key settings include: `preset: 'ts-jest'`, `testEnvironment: 'node'`, `testMatch`, `moduleNameMapper` (for resolving `@` aliases like `@core`), `coverageDirectory`, `coverageReporters`, `coverageThreshold`.
    330 | - `transformIgnorePatterns` might be needed for dependencies that require transformation (e.g., ESM modules like `chalk`, `ora`).
    331 | - **Test Maintenance Guidelines**:
    332 | - Write tests for all new features and bug fixes.
    333 | - Place test files in the `tests/` directory using the `*.test.ts` pattern.
    334 | - Use descriptive test names (`it(...)` or `test(...)`) and group related tests with `describe` blocks.
    335 | - Mock external dependencies (LLM APIs, file system for unit tests) using Jest's mocking capabilities.
    336 | - **Mocking Interfaces:** When mocking dependencies injected via interfaces (e.g., `IFileOperations`), ensure your mock object implements _all_ methods defined in the interface, even if not directly used by the test subject. This prevents TypeScript errors and ensures the mock accurately reflects the interface contract. Keep mocks synchronized with interface changes.
    337 | - Follow existing code style and formatting guidelines within tests.
    338 | - Run tests locally (`npm test`) before committing changes.
    339 | - CI pipelines automatically enforce test execution and coverage thresholds on pull requests/merges to `main`.
    340 |
    341 | ## 5. Common Operations
    342 |
    343 | ### 5.1. Development Tasks
    344 |
    345 | Standard npm scripts are configured in `package.json` for common development tasks:
    346 |
    347 | - **Build the project:** Compiles TypeScript to JavaScript in `dist/` and copies templates.
    348 | `bash
349 |   npm run build
350 | ````
351 | 
352 | - **Run type checking:** Verifies TypeScript types without emitting JS files.
353 |   `bash
    354 | npm run type-check
    355 | `356 | - **Run tests:** Executes the test suite using Jest.
357 |  `bash
    358 | npm test
    359 | `360 | - **Run tests in watch mode:** Useful during development to automatically re-run tests on file changes.
361 |  `bash
    362 | npm run test:watch
    363 | ``364 | - **Generate test coverage report:** Runs tests and outputs coverage information to `coverage/`.
365 |  ``bash
    366 | npm run test:coverage
    367 | ``368 | - **Check for linting errors:** Runs ESLint based on `eslint.config.mjs`.
369 |  ``bash
    370 | npm run lint
    371 | `372 | - **Automatically fix linting errors:** Applies ESLint's automatic fixes where possible.
373 |  `bash
    374 | npm run lint:fix
    375 | `376 | - **Check code formatting:** Runs Prettier to check if files match the defined style.
377 |  `bash
    378 | npm run format
    379 | `380 | - **Automatically fix formatting:** Runs Prettier to reformat files according to the defined style.
381 |  `bash
    382 | npm run format:write
    383 | `384 | - **Run all style checks/fixes:** Combines formatting and lint fixing.
385 |  `bash
    386 | npm run style
    387 | ``388 | - **Run in development mode:** Builds the project and immediately runs a common generation command (`generate --generators vscode-copilot-rules memory-bank`). Useful for quick testing during development.
389 |  ``bash
    390 | npm run dev
    391 | ``392 | - **Run the CLI directly (after building):** Executes the main CLI entry point using `cross-env` to set `NODE_PATH` for alias resolution. Pass CLI arguments after `--`.
393 |  ``bash
    394 | npm run start -- [command] [options]
    395 | # Example: npm run start -- config --provider openai
    396 | # Example: npm run start -- generate --generators rules
    397 | `398 |   Alternatively, run the compiled script directly:
399 |  `bash
    400 | # Ensure NODE*PATH is set for module-alias to work
    401 | cross-env NODE_PATH=dist/src node dist/bin/roocode-generator.js [command] [options]
    402 | ``403 | 
404 | ### 5.2. Build and Deploy
405 | 
406 | - **Build Process**: Triggered by `npm run build`. Uses `tsc`(TypeScript Compiler) based on`tsconfig.json`to compile`src/\*\*/*.ts` files into JavaScript (`commonjs`modules) in the`dist/`directory. The`copyfiles -u 1 templates/**/\* dist/templates`script copies template assets from`templates/`to`dist/templates` so they are included in the build output.
    407 | - **Deployment**: Deployment and package publishing to the npm registry are automated using `semantic-release`. This process typically runs in a CI/CD pipeline (e.g., GitHub Actions) triggered by merges or pushes to the `main` branch.
    408 | - `semantic-release` analyzes commit messages (following Conventional Commits) since the last release.
    409 | - It determines the appropriate version bump (patch, minor, major) based on commit types (`fix:`, `feat:`, `BREAKING CHANGE:`).
    410 | - It generates changelog entries (using `@semantic-release/changelog`).
    411 | - It commits version bumps and changelog files (`@semantic-release/git`).
    412 | - It tags the release in Git.
    413 | - It publishes the package to the npm registry (`@semantic-release/npm`).
    414 | - It creates a GitHub release (`@semantic-release/github`).
    415 | - Manual publishing (`npm publish`) is generally discouraged; rely on the automated CI process.
    416 |
    417 | ## 6. Working with Rule Templates
    418 |
    419 | The Rules Template System (`src/core/templating/`) is central to generating mode-specific rules and documentation, particularly for the `RulesGenerator`.
    420 |
    421 | ### 6.1. Template Structure and Syntax
    422 |
    423 | - **Location**: Templates are Markdown files located in `templates/rules/[mode]/` (e.g., `templates/rules/architect/base.md`). Customizations can be placed in `templates/rules/[mode]/custom.md`.
    424 | - **Metadata**: Templates can include YAML front-matter for metadata (e.g., `Mode`, `Version`, `RequiredSections`), parsed by `RulesTemplateManager`.
    425 | - **Sections**: Templates are divided into logical sections using Markdown headings (`## Section Name`).
    426 | - **Contextual Rules Marker**: The special marker `{{CONTEXTUAL_RULES}}` is used within a template section. The `TemplateProcessor` replaces this marker with rules generated by the LLM based on the analyzed project context.
    427 |
    428 | **Example Template Structure (`templates/rules/architect/base.md`):**
    429 |
    430 |`markdown
    431 | ---
    432 | Mode: architect
    433 | Version: 1.0
    434 | RequiredSections: [Overview, Principles] # Example metadata
    435 | ---
    436 |
    437 | # Architect Mode Base Rules
    438 |
    439 | ## Overview
    440 |
    441 | Base rules for architectural planning...
    442 |
    443 | ## Principles
    444 |
    445 | - Principle A
    446 | - Principle B
    447 |
    448 | ## Contextual Guidelines
    449 |
    450 | This section will contain guidelines generated based on your project's specific context.
    451 |
    452 | {{CONTEXTUAL_RULES}}
    453 |
    454 | ## Best Practices
    455 |
    456 | Additional best practices...
    457 | `458 |
    459 | ### 6.2. Developer Usage
    460 |
    461 | Interaction with the template system primarily involves the `IRulesTemplateManager` and `TemplateProcessor` components, resolved via Dependency Injection.
    462 |
    463 | 1. **Loading Base Templates:** Use `IRulesTemplateManager.loadBaseTemplate(mode)` to get the base template content for a specific mode.
    464 | 2. **Loading Customizations:** Use `IRulesTemplateManager.loadCustomizations(mode)` to get customization content (returns empty string if none).
    465 | 3. **Merging Templates:** Use `IRulesTemplateManager.mergeTemplates(baseContent, customContent)` to combine base and custom sections. Custom sections typically override base sections with the same name.
    466 | 4. **Processing with Contextual Rules:** Use `TemplateProcessor.processTemplate(mode, projectContext)` which orchestrates loading, merging, LLM interaction (via `LLMAgent`) to generate rules for the `{{CONTEXTUAL_RULES}}` marker based on `projectContext`, and insertion into the final template string.
    467 |
    468 | (See `src/core/templating/rules-template-manager.ts` and `src/core/templating/template-processor.ts` for implementation details).
    469 |
    470 | ### 6.3. Error Handling
    471 |
    472 | - The template system uses the `Result<T, E>` pattern extensively (`src/core/result/result.ts`).
    473 | - Operations like `loadBaseTemplate`, `loadCustomizations`, `mergeTemplates`, `processTemplate` return `Result` objects.
    474 | - **Always** check the result using `isOk()` or `isErr()` before accessing `.value` or `.error`.
    475 | - Handle potential errors gracefully, typically by logging the error using `ILogger` and potentially providing user feedback via `ICliInterface` or `ProgressIndicator`.
    476 |
    477 | **Example Error Handling Pattern:**
    478 |
    479 |``typescript
    480 | const loadResult = await templateManager.loadBaseTemplate('architect');
    481 | if (loadResult.isErr()) {
    482 | const logger = container.resolve<ILogger>('ILogger').value!; // Resolve logger via DI
    483 | logger.error(`Failed to load base template: ${loadResult.error.message}`, loadResult.error);
    484 | // Propagate error or handle appropriately
    485 | return Result.err(new Error(`Template loading failed: ${loadResult.error.message}`));
    486 | }
    487 | const baseContent = loadResult.value;
    488 | // Proceed with baseContent...
    489 | ``490 |
    491 | ### 6.4. Best Practices
    492 |
    493 | - **Template Management:** Store templates and customizations in version control (`templates/`). Use clear names for files and sections. Use front-matter for metadata.
    494 | - **Customization:** Create separate `custom.md` files. Document customization rationale. Test merged templates.
    495 | - **Integration:** Resolve `IRulesTemplateManager` and `TemplateProcessor` via DI. Implement consistent `Result`-based error handling. Log template operations for debugging. Use `validateTemplate` where appropriate.
    496 |
    497 | ## 7. LLM-Based Rules Generator Implementation
    498 |
    499 | The `RulesGenerator` (`src/generators/rules/rules-generator.ts`) leverages LLMs to create context-aware coding standards.
    500 |
    501 | ### 7.1. Core Components
    502 |
    503 | - **`IProjectAnalyzer` (`src/core/analysis/project-analyzer.ts`):** Analyzes project tech stack, structure, dependencies using `FileOperations` and `LLMAgent`.
    504 | - **`IRulesTemplateManager` (`src/core/templating/rules-template-manager.ts`):** Loads base rule templates and customizations.
    505 | - **`TemplateProcessor` (`src/core/templating/template-processor.ts`):** Orchestrates template merging, LLM interaction (via `LLMAgent`) for contextual rule generation (`{{CONTEXTUAL_RULES}}`), and insertion.
    506 | - **`LLMAgent` (`src/core/llm/llm-agent.ts`):** Handles communication with the configured LLM provider (via `LLMProviderRegistry`).
    507 | - **`IRulesFileManager` (`src/generators/rules/rules-file-manager.ts`):** Saves generated rules to `.roo/rules/[mode]/[version].json`, manages version history in `.roo/rules-versions.json`, and handles backups.
    508 | - **`IRulesContentProcessor` (`src/generators/rules/rules-content-processor.ts`):** Post-processes LLM output (e.g., strips markdown fences).
    509 | - **`IRulesPromptBuilder` (`src/generators/rules/rules-prompt-builder.ts`):** Constructs prompts for the LLM based on context and templates.
    510 |
    511 | ### 7.2. Usage Example (Simplified Flow in `RulesGenerator.generate`)
    512 |
    513 |``typescript
    514 | // Simplified conceptual flow within RulesGenerator.generate()
    515 |
    516 | // 1. Analyze Project Context (using IProjectAnalyzer)
    517 | const contextResult = await this.projectAnalyzer.analyzeProject(contextPaths);
    518 | if (contextResult.isErr()) return contextResult;
    519 | const projectContext = contextResult.value!;
    520 |
    521 | // 2. Process Template (using TemplateProcessor)
    522 | // - Loads base/custom templates (via IRulesTemplateManager)
    523 | // - Merges templates
    524 | // - Generates contextual rules via LLMAgent based on projectContext
    525 | // - Inserts rules into {{CONTEXTUAL_RULES}} placeholder
    526 | const processedTemplateResult = await this.templateProcessor.processTemplate(mode, projectContext);
    527 | if (processedTemplateResult.isErr()) return processedTemplateResult;
    528 | const finalContent = processedTemplateResult.value!;
    529 |
    530 | // 3. Post-Process Content (using IRulesContentProcessor)
    531 | const processedRulesResult = this.contentProcessor.processContent(finalContent, { mode });
    532 | if (processedRulesResult.isErr()) return processedRulesResult;
    533 | const readyContent = processedRulesResult.value!;
    534 |
    535 | // 4. Save Rules (using IRulesFileManager)
    536 | // - Handles versioning and history automatically
    537 | const generatedRules: GeneratedRules = {
    538 | /_ ... _/
    539 | };
    540 | const saveResult = await this.fileManager.saveRules(generatedRules);
    541 | if (saveResult.isErr()) return saveResult;
    542 |
    543 | return Result.ok(saveResult.value!); // Return path or success message
    544 | ```
    545 |
    546 | ### 7.3. Error Handling Patterns
    547 |
    548 | - **`Result` Type:** All core operations (`analyzeProject`, `processTemplate`, `getCompletion`, `saveRules`, `loadRules`, etc.) return a `Result<T, Error>`. Always check `isOk()`/`isErr()`.
    549 | - **Logging:** Use the injected `ILogger`to log errors with context (mode, file path, operation name) and the underlying error object.
    550 | - **Propagation:** Return`Result.err(error)`to propagate errors up the call stack. Handle errors at appropriate levels (e.g., in`ApplicationContainer`or command handlers).
    551 | - **Fallback:** The`RulesGenerator` \_may\* include fallback logic to use static templates if LLM generation fails (check implementation).
    552 |
    553 | ### 7.4. Best Practices
    554 |
    555 | 1. **Project Analysis:** Provide accurate `contextPaths`. Handle analysis errors gracefully.
    556 | 2. **Template Processing:** Ensure templates exist and are valid. Handle merge issues.
    557 | 3. **File Management:** Rely on `RulesFileManager` for robust versioning and backups.
    558 | 4. **Error Recovery:** Log detailed context. Provide user feedback via `ICliInterface` / `ProgressIndicator`.
    559 | 5. **LLM Interaction:** Secure API keys (`.env`). Validate LLM responses. Handle API errors/rate limits.
    560 |
    561 | ### 7.5. Common Issues & Troubleshooting
    562 |
    563 | 1. **LLM API Errors:** Check API key validity (`.env`, `llm.config.json`), network, provider status, model name, token limits, temperature settings. Use `roocode config` to verify/update.
    564 | 2. **Template Parsing/Merging Errors:** Verify template syntax (Markdown headings, front-matter, `{{CONTEXTUAL_RULES}}`). Check file paths used by `RulesTemplateManager`.
    565 | 3. **File System Errors:** Ensure write permissions for the `.roo` directory. Check paths used by `RulesFileManager`.
    566 | 4. **Context Analysis Failures:** Verify `IProjectAnalyzer` can access project files. Check permissions. Ensure LLM used for analysis (if any) is configured.
    567 | 5. **Content Processing Errors:** Ensure LLM output matches expected format for `IRulesContentProcessor`.
    568 |
    569 | ### 7.6. Performance & Security
    570 |
    571 | - **Performance:** Caching is implemented for templates (`TemplateManager`) and LLM provider instances (`LLMProviderRegistry`). Consider caching analysis results (`IProjectAnalyzer`) if needed. Be mindful of resource usage with large files/responses.
    572 | - **Security:** Protect API keys (`.env`, `.gitignore`). Be cautious about sending sensitive code to external LLMs. Validate file paths to prevent traversal issues (`FileOperations`). Run with appropriate permissions.
    573 |
    574 | ### 7.7. Content Aggregation Pattern
    575 |
    576 | This pattern describes how the `RulesGenerator` combines static template content with dynamically generated LLM content into a single, structured Markdown file.
    577 |
    578 | - **Source Combination:** The `TemplateProcessor` loads base and custom templates (Markdown files with sections defined by headings).
    579 | - **LLM Insertion:** The `{{CONTEXTUAL_RULES}}` marker in the template is replaced by content generated by the LLM based on project context.
    580 | - **Single Output:** The final output is a single Markdown string containing all combined content, including generated headings from the original templates and the inserted LLM output.
    581 | - **File Manager:** The `IRulesFileManager` is responsible for saving this single Markdown string to the designated output file (`.roo/rules-code/rules.md`).
    582 |
    583 | ### 7.8. Content Processing Pattern
    584 |
    585 | This pattern highlights the use of a dedicated component for cleaning and formatting the raw output received from the LLM before it is saved or further processed.
    586 |
    587 | - **Purpose:** The `IRulesContentProcessor` is used to perform post-processing on the LLM's response. This is necessary because LLMs may include unwanted formatting (like markdown code fences) or need specific cleaning based on the expected output format.
    588 | - **Implementation:** The `RulesContentProcessor` implements the `IRulesContentProcessor` interface and contains the logic for these cleaning/formatting steps.
    589 | - **Integration:** The `RulesGenerator` calls the `IRulesContentProcessor.processContent()` method after receiving the processed template content from the `TemplateProcessor` and before saving the final output via the `IRulesFileManager`.
    590 | - **Benefits:** Decouples the cleaning logic from the generator and file management, making it easier to modify or add new processing steps.
    591 |
    592 | ## 8. Troubleshooting
    593 |
    594 | ### 8.1. Common Issues
    595 |
    596 | - **Dependency Installation Errors (`npm install`):**
    597 | - Ensure Node.js (>=18.x recommended) and npm versions are compatible.
    598 | - Try removing `node_modules` and `package-lock.json` and reinstalling: `rm -rf node_modules && rm package-lock.json && npm install`.
    599 | - Check network connectivity and npm registry status.
    600 | - **Build Failures (`npm run build`):**
    601 | - Check console output for specific TypeScript errors (`tsc`). Address type errors, missing imports, or configuration issues in `tsconfig.json`.
    602 | - Ensure `copyfiles` command is correctly copying assets (like `templates/`) to `dist/`.
    603 | - **Linting/Formatting Errors (`npm run lint`/`npm run format`):**
    604 | - Run `npm run lint:fix` or `npm run format:write` to automatically fix issues.
    605 | - Consult `eslint.config.mjs` and Prettier config for rule details.
    606 | - Ensure editor extensions (ESLint, Prettier) are enabled and configured.
    607 | - **Git Hook Failures (pre-commit, commit-msg):**
    608 | - Ensure Husky is set up (`npm run prepare`).
    609 | - Check the specific hook script that failed (usually linting or commit message format errors). Fix the underlying code or commit message according to Conventional Commits.
    610 | - **LLM API Key Issues:**
    611 | - Verify `.env` file exists in the project root and contains the correct API keys (e.g., `OPENAI_API_KEY`).
    612 | - Ensure `dotenv/config` is imported early in `bin/roocode-generator.js`.
    613 | - Check the specific LLM provider's documentation for key validity and usage limits.
    614 | - Verify `llm.config.json` has the correct provider/model selected. Use `roocode config` command to check/update interactively or via flags.
    615 | - **Module Resolution Errors (`Cannot find module '@core/...'`):**
    616 | - Ensure the project is built (`npm run build`) and the `dist` directory exists and contains compiled JS files.
    617 | - Verify `module-alias` setup in `bin/roocode-generator.js` correctly points to `../dist/src`.
    618 | - Confirm the `start` script in `package.json` uses `cross-env NODE_PATH=dist/src` or a similar mechanism to set the module resolution path for Node.js.
    619 | - Check `tsconfig.json` `paths` and `baseUrl` are correctly configured for editor intellisense and potentially `ts-jest` mapping.
    620 |
    621 | ### 8.2. Support Resources
    622 |
    623 | - **Check Logs**: Look for detailed error messages and stack traces in the console output. Increase log level if necessary (check `LoggerService` or configuration).
    624 | - **Project Issues**: Search existing issues or open a new one in the project's issue tracker (e.g., GitHub Issues). Provide detailed steps to reproduce, error messages, environment info (Node version, OS), and relevant configuration.
    625 | - **Team Channel**: Contact the development team via the designated communication channel (e.g., Slack, Teams).
    626 | - **Langchain Documentation**: Refer to the [Langchain JS/TS documentation](https://js.langchain.com/) for issues related to LLM interactions, specific providers (`@langchain/*`), or core concepts.
    627 | - **Dependency Documentation**: Consult the documentation for other key dependencies like Commander, Inquirer, Jest, ESLint, TypeScript, etc.
    628 |
    629 | ## 9. Environment Management
    630 |
    631 | ### 9.1. Infrastructure
    632 |
    633 | - The project runs primarily as a **local CLI tool** on the developer's or user's machine.
    634 | - **CI/CD**: Uses GitHub Actions (implied by `@semantic-release/github`) for automated linting, testing, building, and releasing (via `semantic-release`). See workflow files (e.g., `.github/workflows/`).
    635 | - **Distribution**: Published as an npm package to the npm registry.
    636 |
    637 | See [[TechnicalArchitecture#Infrastructure]] for more details.
    638 |
    639 | ### 9.2. Environments
    640 |
    641 | - **Development (Local):** Your local machine. Uses `.env` file for API keys. Run via `npm run dev` or `npm start`. Build output goes to `dist/`. Tests run against local code.
    642 | - **CI (Continuous Integration):** Environment like GitHub Actions. Runs checks (`lint`, `test`, `build`). Uses secrets management (e.g., GitHub Secrets) for `NPM_TOKEN` for publishing and potentially API keys if needed during CI tests or release steps.
    643 | - **Production (npm Registry / User's Machine):\*\* The published package installed via `npm install -g roocode-generator` or used via `npx`. Users run it in their own environments, manage their own `.env` files, and use `roocode config` to manage their LLM settings (`llm.config.json`).
    644 |
    645 | Environment-specific configurations (like different API endpoints if applicable, feature flags) are primarily managed through environment variables (`dotenv`) and the user-managed `llm.config.json`.
    646 |
    647 |
    648 |
