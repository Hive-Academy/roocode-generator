Okay, here is the comprehensive Developer Guide for the `roocode-generator` project, based on the provided context and following the requested template structure.

---

````markdown
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
````

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
│ ├── rules/ # Generated rules files per mode/version
│ ├── rules-backup/ # Backups of rules files
│ └── rules-versions.json # Version history tracking for rules
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

````

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

### 3.2. Task Management

The project utilizes a structured approach for defining, planning, and tracking work, indicated by the templates found in `templates/memory-bank/templates/`:

- **Requirements:** Use `task-description-template.md` to define new tasks or features.
- **Planning:** Outline implementation steps using `implementation-plan-template.md`.
- **Completion:** Document completed work with `completion-report-template.md`.
- **Workflow Acknowledgement:** Use `mode-acknowledgment-template.md` when starting work within a specific RooCode mode (Architect, Implement, Review).

Maintain these documents within a designated tracking directory (e.g., `progress-tracker/`) as seen in the context examples.

## 4. Code Guidelines

### 4.1. Standards and Practices

- **Language**: Use **TypeScript** (`^5.8.3` or compatible) for all new code. Adhere to modern JavaScript/TypeScript features enabled by the `es2020` target in `tsconfig.json`. Enable `strict` mode in `tsconfig.json`.
- **Style & Formatting**: Strictly adhere to the rules defined in `eslint.config.mjs` (ESLint) and Prettier configuration.
  - Run `npm run lint` and `npm run format` regularly.
  - Formatting is automatically checked/applied on pre-commit hooks via Husky/lint-staged.
- **Naming Conventions**: Follow standard TypeScript/JavaScript naming conventions:
  - `camelCase` for variables, functions, and object properties.
  - `PascalCase` for classes, types, interfaces (see note below), and enums.
  - `UPPER_CASE` for constants.
  - **Interface Naming:** Prefix interfaces defining contracts for services or major components with `I` (e.g., `ILogger`, `IFileOperations`, `IGenerator`). For simple data structures or types, `PascalCase` without the `I` prefix is acceptable (e.g., `ProjectConfig`, `RuleVersion`).
- **Modularity**: Design components to be modular, reusable, and have clear responsibilities (Single Responsibility Principle). Leverage established patterns observed in the codebase:
  - **Dependency Injection**: Use the custom DI container (`src/core/di/`) with `@Injectable` and `@Inject` decorators. See section 4.2.
  - **Generator Pattern**: Follow the `BaseGenerator` structure (`src/core/generators/base-generator.ts`) for creating new generators. Generators should implement the `IGenerator` interface.
  - **Configuration-Driven**: Rely on `roocode-config.json` (via `ProjectConfigService`) and `llm.config.json` (via `LLMConfigService`) for behavior control.
  - **LLM Abstraction**: Interact with LLMs via the `LLMAgent` and `ILLMProvider` interfaces defined in `src/core/llm/`.
  - **Result Pattern**: Use the `Result` class (`src/core/result/result.ts`) for explicit error handling in functions that can fail predictably (e.g., file operations, API calls, parsing).
- **Error Handling**:
  - Implement robust error handling using the `Result<T, E>` type (`src/core/result/result.ts`) for functions that can fail predictably. This makes error handling explicit and type-safe.
  - Use custom error classes extending `RooCodeError` (e.g., `FileOperationError`, `GeneratorError`, `MemoryBankError` from `src/core/errors/`) as the error type `E` within the `Result` for specific error types where beneficial. This provides detailed context for failures.
  - Use standard `try...catch` primarily for unexpected runtime errors at higher levels (like the main entry point or around external library calls that don't use the `Result` pattern).
  - Provide meaningful error messages and context within error objects.
  - Log errors using the `ILogger` service, often by passing the `error` object from a failed `Result`.
- **Logging**: Use the `ILogger` service (resolved via DI) for all application logging. Avoid `console.log` in application code (except potentially at the very top level entry point for fatal errors before the logger is available, or within the `LoggerService` implementation itself). Use different log levels (`debug`, `info`, `warn`, `error`) appropriately.
- **Memory Bank Errors**: Specific errors related to the Memory Bank generator functionality are defined in `src/core/errors/memory-bank-errors.ts`. These extend the base `MemoryBankError` (which extends `RooCodeError`) and provide more specific context:
  - `MemoryBankGenerationError`: Errors during the overall generation process.
  - `MemoryBankTemplateError`: Errors related to loading or processing memory bank templates.
  - `MemoryBankFileError`: Errors during file operations (read/write) within the memory bank context.
  - `MemoryBankValidationError`: Errors during validation steps specific to memory bank content or structure.
    Use these specific errors where applicable to provide clearer diagnostics.
- **Commit Messages**: Strictly follow the [Conventional Commits specification](https://www.conventionalcommits.org/). This is enforced by Commitlint via Husky hooks (`commit-msg` hook). Example types: `feat`, `fix`, `refactor`, `perf`, `test`, `build`, `ci`, `docs`, `style`.

### 4.2. Modular DI Registration Pattern

To enhance organization and maintainability, the project's custom Dependency Injection (DI) registration logic is modularized. Instead of a single large registration function, dependencies are registered in dedicated module files located under `src/core/di/modules/`.

**Key Principles:**

- **Separation of Concerns:** Each module file (e.g., `app-module.ts`, `core-module.ts`, `llm-module.ts`, `rules-module.ts`, `memory-bank-module.ts`) contains registration logic specific to its domain, typically using factory functions (`container.registerFactory`) or singleton registration (`container.registerSingleton`).
- **Centralized Loading:** The main registration entry point (`src/core/di/registrations.ts`) imports these modules and calls their respective registration functions (`registerCoreModule`, `registerLlmModule`, etc.) within the `registerServices` function. This builds the complete dependency graph for the container.
- **Scalability:** This pattern makes it easier to add or modify dependencies for specific features without altering a single, large registration file. New features should ideally have their own registration module.

**Example Structure:**

````

src/
└── core/
└── di/
├── container.ts # Main Container class
├── decorators.ts # @Injectable, @Inject decorators
├── errors.ts # DI-specific errors
├── index.ts # Barrel file for DI exports
├── interfaces.ts # IServiceContainer interface
├── types.ts # Core DI types (ServiceLifetime, etc.)
├── modules/ # <-- DI Registration Modules
│ ├── app-module.ts
│ ├── core-module.ts
│ ├── llm-module.ts
│ ├── memory-bank-module.ts
│ └── rules-module.ts
└── registrations.ts # Central registration function (imports & calls modules)

````

**Adding New Dependencies:**

1.  Identify the appropriate module (e.g., `core`, `llm`, `rules`, `memory-bank`, or a new feature module).
2.  Add the service registration (using `registerSingleton` or `registerFactory` from `@core/di/index.ts` helpers or directly on the container) within that module's registration function (e.g., `registerCoreModule`).
3.  Ensure the module registration function is called within `src/core/di/registrations.ts`.
4.  Use `@Inject('YourServiceToken')` in the constructor of classes needing the dependency. Ensure the token used matches the registration token.

### 4.3. Quality and Testing

- **Testing Approach**: The project uses **Jest** (`^29.7.0`) as the primary testing framework, configured with `ts-jest` (`^29.3.2`) for seamless TypeScript support (`jest.config.js`). Unit and integration tests are expected to be located in the `tests/` directory, following the naming convention `*.test.ts`. _(Note: While co-location of tests (`src/component/component.test.ts`) is a common practice, the current configuration specifies `tests/**/*.test.ts`. Follow the existing structure unless a migration is planned)._
- **Coverage Goals**: The project enforces a minimum global coverage threshold of **80%** for branches, functions, lines, and statements, as configured in `jest.config.js` (`coverageThreshold`). Strive to maintain or increase coverage with new contributions.
- **Memory Bank Testing Patterns**: The Memory Bank generator follows specific testing patterns:
    - **Component Testing**: Each major component (`MemoryBankGenerator`, `MemoryBankOrchestrator`, `MemoryBankTemplateProcessor`, etc.) has dedicated unit tests.
    - **Mock Dependencies**: Use Jest mocks (`jest.fn()`, `jest.mock()`) extensively for dependencies (LLM, File Operations, Logger, etc.) to isolate components during unit testing.
    - **Error Handling Tests**: Verify that specific `MemoryBankError` types are thrown/returned correctly using `Result.err()` and that errors are logged appropriately.
    - **Success Path Tests**: Ensure the happy path works as expected, returning `Result.ok()`.
    - **Integration Testing**: Test interactions between components (e.g., Generator -> Orchestrator -> FileManager). May use real implementations for some services (like FileOperations if testing actual file output) while mocking others (like LLMAgent).
- **Validation**:
  - **Static Analysis**: Run `npm run lint` to check for code style and potential errors based on `eslint.config.mjs`. Fix all reported issues.
  - **Type Checking**: Run `npm run type-check` (uses `tsc --noEmit`) to ensure type safety based on `tsconfig.json`. Resolve all TypeScript errors.
- **Running Tests**:
  - Run all tests once:
    ```bash
    npm test
    ```
  - Run tests in watch mode during development:
    ```bash
    npm run test:watch
    ```
  - Generate coverage reports (output to `coverage/`):
    ```bash
    npm run test:coverage
    ```
- **Testing Framework Setup**:
  - Jest configuration is defined in `jest.config.js`.
  - Key settings include: `preset: 'ts-jest'`, `testEnvironment: 'node'`, `testMatch`, `moduleNameMapper` (for resolving `@` aliases like `@core`), `coverageDirectory`, `coverageReporters`, `coverageThreshold`.
  - `transformIgnorePatterns` might be needed for dependencies that require transformation (e.g., ESM modules like `chalk`, `ora`).
- **Test Maintenance Guidelines**:
  - Write tests for all new features and bug fixes.
  - Place test files in the `tests/` directory using the `*.test.ts` pattern.
  - Use descriptive test names (`it(...)` or `test(...)`) and group related tests with `describe` blocks.
  - Mock external dependencies (LLM APIs, file system for unit tests) using Jest's mocking capabilities.
  - **Mocking Interfaces:** When mocking dependencies injected via interfaces (e.g., `IFileOperations`), ensure your mock object implements *all* methods defined in the interface, even if not directly used by the test subject. This prevents TypeScript errors and ensures the mock accurately reflects the interface contract. Keep mocks synchronized with interface changes.
  - Follow existing code style and formatting guidelines within tests.
  - Run tests locally (`npm test`) before committing changes.
  - CI pipelines automatically enforce test execution and coverage thresholds on pull requests/merges to `main`.

## 5. Common Operations

### 5.1. Development Tasks

Standard npm scripts are configured in `package.json` for common development tasks:

- **Build the project:** Compiles TypeScript to JavaScript in `dist/` and copies templates.
  ```bash
  npm run build
````

- **Run type checking:** Verifies TypeScript types without emitting JS files.
  ```bash
  npm run type-check
  ```
- **Run tests:** Executes the test suite using Jest.
  ```bash
  npm test
  ```
- **Run tests in watch mode:** Useful during development to automatically re-run tests on file changes.
  ```bash
  npm run test:watch
  ```
- **Generate test coverage report:** Runs tests and outputs coverage information to `coverage/`.
  ```bash
  npm run test:coverage
  ```
- **Check for linting errors:** Runs ESLint based on `eslint.config.mjs`.
  ```bash
  npm run lint
  ```
- **Automatically fix linting errors:** Applies ESLint's automatic fixes where possible.
  ```bash
  npm run lint:fix
  ```
- **Check code formatting:** Runs Prettier to check if files match the defined style.
  ```bash
  npm run format
  ```
- **Automatically fix formatting:** Runs Prettier to reformat files according to the defined style.
  ```bash
  npm run format:write
  ```
- **Run all style checks/fixes:** Combines formatting and lint fixing.
  ```bash
  npm run style
  ```
- **Run in development mode:** Builds the project and immediately runs a common generation command (`generate --generators vscode-copilot-rules memory-bank`). Useful for quick testing during development.
  ```bash
  npm run dev
  ```
- **Run the CLI directly (after building):** Executes the main CLI entry point using `cross-env` to set `NODE_PATH` for alias resolution. Pass CLI arguments after `--`.
  ```bash
  npm run start -- [command] [options]
  # Example: npm run start -- config --provider openai
  # Example: npm run start -- generate --generators rules
  ```
  Alternatively, run the compiled script directly:
  ```bash
  # Ensure NODE_PATH is set for module-alias to work
  cross-env NODE_PATH=dist/src node dist/bin/roocode-generator.js [command] [options]
  ```

### 5.2. Build and Deploy

- **Build Process**: Triggered by `npm run build`. Uses `tsc` (TypeScript Compiler) based on `tsconfig.json` to compile `src/**/*.ts` files into JavaScript (`commonjs` modules) in the `dist/` directory. The `copyfiles -u 1 templates/**/* dist/templates` script copies template assets from `templates/` to `dist/templates` so they are included in the build output.
- **Deployment**: Deployment and package publishing to the npm registry are automated using `semantic-release`. This process typically runs in a CI/CD pipeline (e.g., GitHub Actions) triggered by merges or pushes to the `main` branch.
  - `semantic-release` analyzes commit messages (following Conventional Commits) since the last release.
  - It determines the appropriate version bump (patch, minor, major) based on commit types (`fix:`, `feat:`, `BREAKING CHANGE:`).
  - It generates changelog entries (using `@semantic-release/changelog`).
  - It commits version bumps and changelog files (`@semantic-release/git`).
  - It tags the release in Git.
  - It publishes the package to the npm registry (`@semantic-release/npm`).
  - It creates a GitHub release (`@semantic-release/github`).
  - Manual publishing (`npm publish`) is generally discouraged; rely on the automated CI process.

## 6. Working with Rule Templates

The Rules Template System (`src/core/templating/`) is central to generating mode-specific rules and documentation, particularly for the `RulesGenerator`.

### 6.1. Template Structure and Syntax

- **Location**: Templates are Markdown files located in `templates/rules/[mode]/` (e.g., `templates/rules/architect/base.md`). Customizations can be placed in `templates/rules/[mode]/custom.md`.
- **Metadata**: Templates can include YAML front-matter for metadata (e.g., `Mode`, `Version`, `RequiredSections`), parsed by `RulesTemplateManager`.
- **Sections**: Templates are divided into logical sections using Markdown headings (`## Section Name`).
- **Contextual Rules Marker**: The special marker `{{CONTEXTUAL_RULES}}` is used within a template section. The `TemplateProcessor` replaces this marker with rules generated by the LLM based on the analyzed project context.

**Example Template Structure (`templates/rules/architect/base.md`):**

```markdown
---
Mode: architect
Version: 1.0
RequiredSections: [Overview, Principles] # Example metadata
---

# Architect Mode Base Rules

## Overview

Base rules for architectural planning...

## Principles

- Principle A
- Principle B

## Contextual Guidelines

This section will contain guidelines generated based on your project's specific context.

{{CONTEXTUAL_RULES}}

## Best Practices

Additional best practices...
```

### 6.2. Developer Usage

Interaction with the template system primarily involves the `IRulesTemplateManager` and `TemplateProcessor` components, resolved via Dependency Injection.

1.  **Loading Base Templates:** Use `IRulesTemplateManager.loadBaseTemplate(mode)` to get the base template content for a specific mode.
2.  **Loading Customizations:** Use `IRulesTemplateManager.loadCustomizations(mode)` to get customization content (returns empty string if none).
3.  **Merging Templates:** Use `IRulesTemplateManager.mergeTemplates(baseContent, customContent)` to combine base and custom sections. Custom sections typically override base sections with the same name.
4.  **Processing with Contextual Rules:** Use `TemplateProcessor.processTemplate(mode, projectContext)` which orchestrates loading, merging, LLM interaction (via `LLMAgent`) to generate rules for the `{{CONTEXTUAL_RULES}}` marker based on `projectContext`, and insertion into the final template string.

(See `src/core/templating/rules-template-manager.ts` and `src/core/templating/template-processor.ts` for implementation details).

### 6.3. Error Handling

- The template system uses the `Result<T, E>` pattern extensively (`src/core/result/result.ts`).
- Operations like `loadBaseTemplate`, `loadCustomizations`, `mergeTemplates`, `processTemplate` return `Result` objects.
- **Always** check the result using `isOk()` or `isErr()` before accessing `.value` or `.error`.
- Handle potential errors gracefully, typically by logging the error using `ILogger` and potentially providing user feedback via `ICliInterface` or `ProgressIndicator`.

**Example Error Handling Pattern:**

```typescript
const loadResult = await templateManager.loadBaseTemplate('architect');
if (loadResult.isErr()) {
  const logger = container.resolve<ILogger>('ILogger').value!; // Resolve logger via DI
  logger.error(`Failed to load base template: ${loadResult.error.message}`, loadResult.error);
  // Propagate error or handle appropriately
  return Result.err(new Error(`Template loading failed: ${loadResult.error.message}`));
}
const baseContent = loadResult.value;
// Proceed with baseContent...
```

### 6.4. Best Practices

- **Template Management:** Store templates and customizations in version control (`templates/`). Use clear names for files and sections. Use front-matter for metadata.
- **Customization:** Create separate `custom.md` files. Document customization rationale. Test merged templates.
- **Integration:** Resolve `IRulesTemplateManager` and `TemplateProcessor` via DI. Implement consistent `Result`-based error handling. Log template operations for debugging. Use `validateTemplate` where appropriate.

## 7. LLM-Based Rules Generator Implementation

The `RulesGenerator` (`src/generators/rules/rules-generator.ts`) leverages LLMs to create context-aware coding standards.

### 7.1. Core Components

- **`IProjectAnalyzer` (`src/core/analysis/project-analyzer.ts`):** Analyzes project tech stack, structure, dependencies using `FileOperations` and `LLMAgent`.
- **`IRulesTemplateManager` (`src/core/templating/rules-template-manager.ts`):** Loads base rule templates and customizations.
- **`TemplateProcessor` (`src/core/templating/template-processor.ts`):** Orchestrates template merging, LLM interaction (via `LLMAgent`) for contextual rule generation (`{{CONTEXTUAL_RULES}}`), and insertion.
- **`LLMAgent` (`src/core/llm/llm-agent.ts`):** Handles communication with the configured LLM provider (via `LLMProviderRegistry`).
- **`IRulesFileManager` (`src/generators/rules/rules-file-manager.ts`):** Saves generated rules to `.roo/rules/[mode]/[version].json`, manages version history in `.roo/rules-versions.json`, and handles backups.
- **`IRulesContentProcessor` (`src/generators/rules/rules-content-processor.ts`):** Post-processes LLM output (e.g., strips markdown fences).
- **`IRulesPromptBuilder` (`src/generators/rules/rules-prompt-builder.ts`):** Constructs prompts for the LLM based on context and templates.

### 7.2. Usage Example (Simplified Flow in `RulesGenerator.generate`)

```typescript
// Simplified conceptual flow within RulesGenerator.generate()

// 1. Analyze Project Context (using IProjectAnalyzer)
const contextResult = await this.projectAnalyzer.analyzeProject(contextPaths);
if (contextResult.isErr()) return contextResult;
const projectContext = contextResult.value!;

// 2. Process Template (using TemplateProcessor)
//    - Loads base/custom templates (via IRulesTemplateManager)
//    - Merges templates
//    - Generates contextual rules via LLMAgent based on projectContext
//    - Inserts rules into {{CONTEXTUAL_RULES}} placeholder
const processedTemplateResult = await this.templateProcessor.processTemplate(mode, projectContext);
if (processedTemplateResult.isErr()) return processedTemplateResult;
const finalContent = processedTemplateResult.value!;

// 3. Post-Process Content (using IRulesContentProcessor)
const processedRulesResult = this.contentProcessor.processContent(finalContent, { mode });
if (processedRulesResult.isErr()) return processedRulesResult;
const readyContent = processedRulesResult.value!;

// 4. Save Rules (using IRulesFileManager)
//    - Handles versioning and history automatically
const generatedRules: GeneratedRules = {
  /* ... */
};
const saveResult = await this.fileManager.saveRules(generatedRules);
if (saveResult.isErr()) return saveResult;

return Result.ok(saveResult.value!); // Return path or success message
```

### 7.3. Error Handling Patterns

- **`Result` Type:** All core operations (`analyzeProject`, `processTemplate`, `getCompletion`, `saveRules`, `loadRules`, etc.) return a `Result<T, Error>`. Always check `isOk()`/`isErr()`.
- **Logging:** Use the injected `ILogger` to log errors with context (mode, file path, operation name) and the underlying error object.
- **Propagation:** Return `Result.err(error)` to propagate errors up the call stack. Handle errors at appropriate levels (e.g., in `ApplicationContainer` or command handlers).
- **Fallback:** The `RulesGenerator` _may_ include fallback logic to use static templates if LLM generation fails (check implementation).

### 7.4. Best Practices

1.  **Project Analysis:** Provide accurate `contextPaths`. Handle analysis errors gracefully.
2.  **Template Processing:** Ensure templates exist and are valid. Handle merge issues.
3.  **File Management:** Rely on `RulesFileManager` for robust versioning and backups.
4.  **Error Recovery:** Log detailed context. Provide user feedback via `ICliInterface` / `ProgressIndicator`.
5.  **LLM Interaction:** Secure API keys (`.env`). Validate LLM responses. Handle API errors/rate limits.

### 7.5. Common Issues & Troubleshooting

1.  **LLM API Errors:** Check API key validity (`.env`, `llm.config.json`), network, provider status, model name, token limits, temperature settings. Use `roocode config` to verify/update.
2.  **Template Parsing/Merging Errors:** Verify template syntax (Markdown headings, front-matter, `{{CONTEXTUAL_RULES}}`). Check file paths used by `RulesTemplateManager`.
3.  **File System Errors:** Ensure write permissions for the `.roo` directory. Check paths used by `RulesFileManager`.
4.  **Context Analysis Failures:** Verify `IProjectAnalyzer` can access project files. Check permissions. Ensure LLM used for analysis (if any) is configured.
5.  **Content Processing Errors:** Ensure LLM output matches expected format for `IRulesContentProcessor`.

### 7.6. Performance & Security

- **Performance:** Caching is implemented for templates (`TemplateManager`) and LLM provider instances (`LLMProviderRegistry`). Consider caching analysis results (`IProjectAnalyzer`) if needed. Be mindful of resource usage with large files/responses.
- **Security:** Protect API keys (`.env`, `.gitignore`). Be cautious about sending sensitive code to external LLMs. Validate file paths to prevent traversal issues (`FileOperations`). Run with appropriate permissions.

## 8. Troubleshooting

### 8.1. Common Issues

- **Dependency Installation Errors (`npm install`):**
  - Ensure Node.js (>=18.x recommended) and npm versions are compatible.
  - Try removing `node_modules` and `package-lock.json` and reinstalling: `rm -rf node_modules && rm package-lock.json && npm install`.
  - Check network connectivity and npm registry status.
- **Build Failures (`npm run build`):**
  - Check console output for specific TypeScript errors (`tsc`). Address type errors, missing imports, or configuration issues in `tsconfig.json`.
  - Ensure `copyfiles` command is correctly copying assets (like `templates/`) to `dist/`.
- **Linting/Formatting Errors (`npm run lint`/`npm run format`):**
  - Run `npm run lint:fix` or `npm run format:write` to automatically fix issues.
  - Consult `eslint.config.mjs` and Prettier config for rule details.
  - Ensure editor extensions (ESLint, Prettier) are enabled and configured.
- **Git Hook Failures (pre-commit, commit-msg):**
  - Ensure Husky is set up (`npm run prepare`).
  - Check the specific hook script that failed (usually linting or commit message format errors). Fix the underlying code or commit message according to Conventional Commits.
- **LLM API Key Issues:**
  - Verify `.env` file exists in the project root and contains the correct API keys (e.g., `OPENAI_API_KEY`).
  - Ensure `dotenv/config` is imported early in `bin/roocode-generator.js`.
  - Check the specific LLM provider's documentation for key validity and usage limits.
  - Verify `llm.config.json` has the correct provider/model selected. Use `roocode config` command to check/update interactively or via flags.
- **Module Resolution Errors (`Cannot find module '@core/...'`):**
  - Ensure the project is built (`npm run build`) and the `dist` directory exists and contains compiled JS files.
  - Verify `module-alias` setup in `bin/roocode-generator.js` correctly points to `../dist/src`.
  - Confirm the `start` script in `package.json` uses `cross-env NODE_PATH=dist/src` or a similar mechanism to set the module resolution path for Node.js.
  - Check `tsconfig.json` `paths` and `baseUrl` are correctly configured for editor intellisense and potentially `ts-jest` mapping.

### 8.2. Support Resources

- **Check Logs**: Look for detailed error messages and stack traces in the console output. Increase log level if necessary (check `LoggerService` or configuration).
- **Project Issues**: Search existing issues or open a new one in the project's issue tracker (e.g., GitHub Issues). Provide detailed steps to reproduce, error messages, environment info (Node version, OS), and relevant configuration.
- **Team Channel**: Contact the development team via the designated communication channel (e.g., Slack, Teams).
- **Langchain Documentation**: Refer to the [Langchain JS/TS documentation](https://js.langchain.com/) for issues related to LLM interactions, specific providers (`@langchain/*`), or core concepts.
- **Dependency Documentation**: Consult the documentation for other key dependencies like Commander, Inquirer, Jest, ESLint, TypeScript, etc.

## 9. Environment Management

### 9.1. Infrastructure

- The project runs primarily as a **local CLI tool** on the developer's or user's machine.
- **CI/CD**: Uses GitHub Actions (implied by `@semantic-release/github`) for automated linting, testing, building, and releasing (via `semantic-release`). See workflow files (e.g., `.github/workflows/`).
- **Distribution**: Published as an npm package to the npm registry.

See [[TechnicalArchitecture#Infrastructure]] for more details.

### 9.2. Environments

- **Development (Local):** Your local machine. Uses `.env` file for API keys. Run via `npm run dev` or `npm start`. Build output goes to `dist/`. Tests run against local code.
- **CI (Continuous Integration):** Environment like GitHub Actions. Runs checks (`lint`, `test`, `build`). Uses secrets management (e.g., GitHub Secrets) for `NPM_TOKEN` for publishing and potentially API keys if needed during CI tests or release steps.
- **Production (npm Registry / User's Machine):** The published package installed via `npm install -g roocode-generator` or used via `npx`. Users run it in their own environments, manage their own `.env` files, and use `roocode config` to manage their LLM settings (`llm.config.json`).

Environment-specific configurations (like different API endpoints if applicable, feature flags) are primarily managed through environment variables (`dotenv`) and the user-managed `llm.config.json`.

```

```
