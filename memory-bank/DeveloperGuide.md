---
title: Developer Guide
version: 1.0.1
lastUpdated: 2025-05-02
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

    git clone https://github.com/Hive-Academy/roocode-generator.git
    cd roocode-generator

    ```

    ```

2.  **Install dependencies:**

        ```bash

    npm install

    ```

    ```

3.  **Set up environment variables:**

    - Create a `.env` file in the project root (`.`). You can copy `.env.example` if it exists.
    - Add the necessary API keys for the LLM services you intend to use:

      ```env

      ```

# .env file content

ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_API_KEY=your_google_api_key # As seen in example config
OPENAI_API_KEY=your_openai_api_key
```    - **Note:** Never commit your`.env`file to version control. It's included in`.gitignore`by default. The application uses`dotenv/config` to load these variables at runtime.

4.  **Prepare Git Hooks:**
    Husky is used to manage Git hooks for linting and commit message validation. Ensure hooks are installed by running the `prepare` script:
    `bash
npm run prepare
    `
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

The project follows a structured approach, separating source code, build output, tests, and configuration. Below is a high-level overview. For a detailed breakdown of components and their responsibilities, see the [Core Components section](./TechnicalArchitecture.md#core-components) in the Technical Architecture document.

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
│ │ ├── rules/ # Legacy Rules generator specific files (RulesGenerator, RulesFileManager, etc.)
│ │ ├── roomodes-generator.ts
│ │ ├── system-prompts-generator.ts
│ │ ├── vscode-copilot-rules-generator.ts
│ │ └── ai-magic-generator.ts # New combined generator
│ ├── memory-bank/ # Memory Bank *service* specific files (MemoryBankService, orchestrator, etc.)
│ └── types/ # Top-level shared types (shared.ts - LLMConfig, ProjectConfig)
├── templates/ # Static template files used by generators
│ ├── guide/ # Fallback templates for memory bank
│ ├── memory-bank/
│ │ └── templates/ # Task management templates (e.g., task-description-template.md)
│ ├── rules/ # Mode-specific rule templates (e.g., architect/base.md)
│ └── system-prompts/ # System prompt templates for modes
├── tests/ # Unit and integration tests (`testMatch` in jest.config.js)
│ └── ... # Subdirectories mirroring src structure (co-location was planned but abandoned)
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

### 2.1. Command Execution Flow

Understanding the basic flow of command execution is helpful for adding new commands or modifying existing ones:

1.  **Parsing (`CliInterface`):** The `src/core/cli/cli-interface.ts` uses `commander` to parse command-line arguments (`process.argv`) and options.
2.  **Routing (`ApplicationContainer`):** The `src/core/application/application-container.ts` retrieves the parsed command and uses its `executeCommand` method to route to the appropriate handler.
3.  **Orchestration (`GeneratorOrchestrator`):** For the `generate` command, the handler delegates to `src/core/application/generator-orchestrator.ts`. The `generate` command now implicitly triggers the `ai-magic` generator. The `--generators` flag is used to specify the _type_ of content to generate within `ai-magic`.

    - The `--generators` flag accepts a single value: `memory-bank`, `roo`, or `cursor`.
    - `memory-bank`: Generates documentation and other content for the Memory Bank.
    - `roo`: Generates RooCode rules based on project context.
    - `cursor`: Placeholder for future cursor-based generation functionality.

For a more detailed step-by-step breakdown and diagram, see the [System Design section](./TechnicalArchitecture.md#system-design) in the Technical Architecture document.

### 2.2. Project Analysis: Directory Exclusion

When analyzing the project structure (e.g., by `ProjectAnalyzer` via `StructureHelpers.generateDirectoryTree`), directory exclusion is handled by:

- Checking directory names against a predefined `SKIP_DIRECTORIES` set (defined in `src/core/analysis/constants.ts`).
- Skipping directories whose names start with a dot (`.`) (hidden directories).

This ensures common build artifacts, dependency folders, and version control directories are not included in the structural analysis output (`ProjectContext.structure.directoryTree`), leading to a more accurate and lean project context.

## 3. Development Workflow

### 3.1. Process Overview

This project utilizes **Trunk-Based Development** with short-lived feature branches recommended for non-trivial changes.

1.  **Sync with `main`:** Always ensure your local `main` branch is up-to-date before starting work:
    `bash
git checkout main
git pull origin main
    `
2.  **Create a Feature Branch (Recommended for > trivial changes):** While direct commits to `main` might occur for very small fixes, larger features or complex bug fixes should be done on short-lived feature branches:

    ```bash

    ```

# Choose a descriptive name based on Conventional Commit types

git checkout -b feat/your-feature-name

# or

git checkout -b fix/your-bug-fix-name

# or

git checkout -b refactor/component-name
`3.  **Develop:** Implement the feature or fix the bug. Follow the guidelines in Section 4. Write tests alongside your code (see Section 4.3).
4.  **Commit Changes:** Make small, logical commits using the **Conventional Commits** format (enforced by Commitlint via Husky hooks):
   `bash
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
    `bash
npm run lint          # Check for linting errors
npm run format        # Check formatting (or npm run format:write to fix)
npm run type-check    # Check for TypeScript errors
npm test              # Run unit/integration tests
    `
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

Maintain these documents within a designated tracking directory (e.g., `task-tracking/`) as seen in the context examples.

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
- **Handling Unexpected API Responses:** When interacting with external APIs, particularly LLM providers, be prepared for responses that may have a successful HTTP status (e.g., 200 OK) but contain an error structure within the response body or an otherwise unexpected format (e.g., missing expected fields like `choices`). Implement checks for these internal error indicators _before_ attempting to parse the expected successful response structure. Log the full, raw response data for any unexpected formats to aid in debugging.
- **Logging**: Use the `ILogger` service (resolved via DI) for all application logging. Avoid `console.log` in application code (except potentially at the very top level entry point for fatal errors before the logger is available, or within the `LoggerService` implementation itself). Use different log levels (`debug`, `info`, `warn`, `error`) appropriately.
- **Memory Bank Errors**: Specific errors related to the Memory Bank generator functionality are defined in `src/core/errors/memory-bank-errors.ts`. These extend the base `MemoryBankError` (which extends `RooCodeError`) and provide more specific context:
  - `MemoryBankGenerationError`: Errors during the overall generation process.
  - `MemoryBankTemplateError`: Errors related to loading or processing memory bank templates.
  - `MemoryBankFileError`: Errors during file operations (read/write) within the memory bank context.
  - `MemoryBankValidationError`: Errors during validation steps specific to memory bank content or structure.
    Use these specific errors where applicable to provide clearer diagnostics.

#### Retry Pattern for Transient LLM Errors

For operations interacting with external services, particularly LLM providers, transient errors can occur (e.g., network issues, temporary service unavailability, or malformed responses like a missing `choices` array). To handle these, a retry pattern with exponential backoff is implemented in `ProjectAnalyzer.analyzeProject`.

This pattern involves:

- Catching specific, identifiable transient errors (e.g., `LLMProviderError` with code `INVALID_RESPONSE_FORMAT`).
- Retrying the operation a predefined number of times.
- Waiting for an exponentially increasing duration between retries to avoid overwhelming the service.
- Logging retry attempts and eventual failure or success.

This approach improves the robustness of operations dependent on external services by automatically handling temporary issues.

- **Commit Messages**: Strictly follow the [Conventional Commits specification](https://www.conventionalcommits.org/). This is enforced by Commitlint via Husky hooks (`commit-msg` hook). Example types: `feat`, `fix`, `refactor`, `perf`, `test`, `build`, `ci`, `docs`, `style`.

### 4.2. Modular DI Registration Pattern

To enhance organization and maintainability, the project's custom Dependency Injection (DI) registration logic is modularized. Instead of a single large registration function, dependencies are registered in dedicated module files located under `src/core/di/modules/`.

**Key Principles:**

- **Separation of Concerns:** Each module file (e.g., `app-module.ts`, `core-module.ts`, `llm-module.ts`, `rules-module.ts`, `memory-bank-module.ts`) contains registration logic specific to its domain, typically using factory functions (`container.registerFactory`) or singleton registration (`container.registerSingleton`).
- **Centralized Loading:** The main registration entry point (`src/core/di/registrations.ts`) imports these modules and calls their respective registration functions (`registerCoreModule`, `registerLlmModule`, etc.) within the `registerServices` function. This builds the complete dependency graph for the container.
- **Scalability:** This pattern makes it easier to add or modify dependencies for specific features without altering a single, large registration file. New features should ideally have their own registration module.

**Example Structure:**

```
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
        │   ├── app-module.ts
        │   ├── core-module.ts
        │   ├── llm-module.ts
        │   ├── memory-bank-module.ts
        │   └── rules-module.ts
        └── registrations.ts # Central registration function (imports & calls modules)
```

**Adding New Dependencies:**

1. Identify the appropriate module (e.g.,`core`, `llm`, `rules`, `memory-bank`, or a new feature module).
2. Add the service registration (using `registerSingleton`or`registerFactory`from`@core/di/index.ts`helpers or directly on the container) within that module's registration function (e.g.,`registerCoreModule`).
3. Ensure the module registration function is called within `src/core/di/registrations.ts`.
4. Use `@Inject('YourServiceToken')` in the constructor of classes needing the dependency. Ensure the token used matches the registration token.

### 4.3. Quality and Testing

- **Testing Approach**: The project uses **Jest** (`^29.7.0`) as the primary testing framework, configured with `ts-jest` (`^29.3.2`) for seamless TypeScript support (`jest.config.js`). Unit and integration tests are expected to be located in the `tests/`directory, following the naming convention`*.test.ts`. _(Note: Co-location of tests (`src/component/component.test.ts`) was considered but abandoned. Tests are located in the top-level `tests/` directory, following the naming convention `*.test.ts` as specified in `jest.config.js`)._
- **Coverage Goals**: The project enforces a minimum global coverage threshold of **80%** for branches, functions, lines, and statements, as configured in `jest.config.js` (`coverageThreshold`). Strive to maintain or increase coverage with new contributions.
- **Memory Bank Service Testing Patterns**: The Memory Bank service (`src/memory-bank/`) follows specific testing patterns:
  - **Service/Component Testing**: Each major component (`MemoryBankService`, `MemoryBankOrchestrator`, `MemoryBankTemplateProcessor`, etc.) has dedicated unit tests.
  - **Mock Dependencies**: Use Jest mocks (`jest.fn()`, `jest.mock()`) extensively for dependencies (LLM, File Operations, Logger, etc.) to isolate service components during unit testing.
  - **Error Handling Tests**: Verify that specific `MemoryBankError`types are returned correctly via`Result.err()`and that errors are logged appropriately.
  - **Success Path Tests**: Ensure the happy path works as expected, returning`Result.ok()`.
  - **Integration Testing**: Test interactions between the `AiMagicGenerator`and the`MemoryBankService`, as well as internal service component interactions (e.g., Service -> Orchestrator -> FileManager). May use real implementations for some services (like FileOperations if testing actual file output) while mocking others (like LLMAgent).
- **Validation**:
  - **Static Analysis**: Run `npm run lint`to check for code style and potential errors based on`eslint.config.mjs`. Fix all reported issues.
  - **Type Checking**: Run `npm run type-check`(uses`tsc --noEmit`) to ensure type safety based on `tsconfig.json`. Resolve all TypeScript errors.
- **Running Tests**:
  - Run all tests once:
    `bash
npm test
    `
  - Run tests in watch mode during development:
    `bash
npm run test:watch
    `
  - Generate test coverage report:
    `bash
npm run test:coverage
    `

## 5. Common Operations

### 5.1. Useful Scripts

The `package.json` file defines several scripts for common development tasks:

- `npm run build`: Compiles TypeScript code to JavaScript in the `dist/` directory.
- `npm run start`: Executes the compiled CLI entry point (`dist/bin/roocode-generator.js`).
- `npm run dev`: Runs the CLI using `ts-node` for development without explicit compilation.
- `npm run lint`: Checks for linting errors using ESLint.
- `npm run lint:fix`: Automatically fixes fixable linting errors.
- `npm run format`: Checks code formatting using Prettier.
- `npm run format:write`: Automatically reformats code using Prettier.
- `npm run style:fix`: Combines `format:write` and `lint:fix`.
- `npm run type-check`: Performs TypeScript type checking without emitting files.
- `npm test`: Runs all Jest tests.
- `npm run test:watch`: Runs Jest tests in watch mode.
- `npm run test:coverage`: Runs Jest tests and generates a coverage report.
- `npm run prepare`: Installs Husky Git hooks (usually run automatically after `npm install`).
- `npm run release`: Runs `semantic-release` (typically used in CI, not locally).
- `npm run dev:run`: Builds the project and immediately runs a common generation command (`generate --generators vscode-copilot-rules memory-bank`). Useful for quick testing during development.
- `npm run cli -- <args>`: Executes the main CLI entry point using `cross-env`to set`NODE_PATH`for alias resolution. Pass CLI arguments after`--`.
  Alternatively, run the compiled script directly:
  ```bash
  node dist/bin/roocode-generator.js <args>
  ```

### 5.2. Build and Deploy

- **Build Process**: Triggered by `npm run build`. Uses `tsc`(TypeScript Compiler) based on`tsconfig.json`to compile`src/**/*.ts` files into JavaScript (`commonjs`modules) in the`dist/`directory. The`copyfiles -u 1 templates/**/* dist/templates`script copies template assets from`templates/`to`dist/templates` so they are included in the build output.
- **Deployment**: Deployment and package publishing to the npm registry are automated using `semantic-release`. This process typically runs in a CI/CD pipeline (e.g., GitHub Actions) triggered by merges or pushes to the `main` branch.
  - `semantic-release` analyzes commit messages (following Conventional Commits) since the last release.
  - It determines the appropriate version bump (patch, minor, major) based on commit types (`fix:`, `feat:`, `BREAKING CHANGE:`).
  - It generates changelog entries (using `@semantic-release/changelog`).
  - It commits version bumps and changelog files (`@semantic-release/git`).
  - It tags the release in Git.
  - It publishes the package to the npm registry (`@semantic-release/npm`).
  - It creates a GitHub release (`@semantic-release/github`).
  - Manual publishing (`npm publish`) is generally discouraged; rely on the automated CI process.

### 5.3. Handling Module Compatibility with Vite (If Applicable)

_Note: This project does not currently use Vite for its build process. This section is retained for informational purposes in case Vite is introduced later._

When building a Node.js CLI with Vite, you may encounter compatibility issues with certain dependencies that use different module formats (ES modules vs. CommonJS) or have specific requirements for their environment. This was observed with packages like `ora`, `inquirer`, and `langchain`.

To address these issues, adjustments may be needed in the `vite.config.ts` file:

- **`optimizeDeps.exclude`**: For packages that cause issues during Vite's dependency pre-bundling step, add them to the `optimizeDeps.exclude` array. This prevents Vite from trying to pre-bundle them, allowing them to be handled by Rollup during the build.
- **`rollupOptions.external`**: Ensure that Node.js built-ins and external dependencies that should _not_ be bundled into the final output are listed in `rollupOptions.external`. While `rollup-plugin-node-externals` helps, explicitly listing problematic packages here can sometimes resolve issues.
- **Import Statements**: In some cases, adjusting import statements in your source code (e.g., using dynamic `import()` or specific import paths provided by the package) might be necessary, although configuration adjustments are preferred.

Refer to the `vite.config.ts` file (if created) and the specific package documentation for detailed examples and troubleshooting.

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
  17 |

## Contextual Guidelines

This section will contain guidelines generated based on your project's specific context.

{{CONTEXTUAL_RULES}}

## Best Practices

Additional best practices...
```

### 6.2. Developer Usage

Interaction with the template system primarily involves the `IRulesTemplateManager`and`TemplateProcessor`components, resolved via Dependency Injection.

1.  **Loading Base Templates:** Use`IRulesTemplateManager.loadBaseTemplate(mode)`to get the base template content for a specific mode.
2.  **Loading Customizations:** Use`IRulesTemplateManager.loadCustomizations(mode)`to get customization content (returns empty string if none).
3.  **Merging Templates:** Use`IRulesTemplateManager.mergeTemplates(baseContent, customContent)`to combine base and custom sections. Custom sections typically override base sections with the same name.
4.  **Processing with Contextual Rules:** Use`TemplateProcessor.processTemplate(mode, projectContext)`which orchestrates loading, merging, LLM interaction (via`LLMAgent`) to generate rules for the `{{CONTEXTUAL_RULES}}`marker based on`projectContext`, and insertion into the final template string.

(See `src/core/templating/rules-template-manager.ts`and`src/core/templating/template-processor.ts`for implementation details).

### 6.3. Error Handling

- The template system uses the`Result<T, E>` pattern extensively (`src/core/result/result.ts`).
- Operations like `loadBaseTemplate`, `loadCustomizations`, `mergeTemplates`, `processTemplate`return`Result`objects.
- **Always** check the result using`isOk()`or`isErr()`before accessing`.value`or`.error`.
- Handle potential errors gracefully, typically by logging the error using `ILogger`and potentially providing user feedback via`ICliInterface`or`ProgressIndicator`.

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

## 7. Troubleshooting

### 7.1. Common Issues

- **Dependency Injection Errors**: If you encounter errors related to resolving dependencies, double-check:
  - The service is registered in `src/core/di/registrations.ts`(or the relevant module).
  - The token used in`@Inject('YourServiceToken')`exactly matches the registration token.
  - The class is decorated with`@Injectable()`.
  - `Reflect.metadata()` is imported at the application entry point (`bin/roocode-generator.ts`).
- **TypeScript Errors**: Ensure you run `npm run type-check`regularly. Common issues include:
  - Incorrect type annotations.
  - Missing properties on objects.
  - Incompatible types in function calls.
- **Linting/Formatting Errors**: Run`npm run lint:fix`and`npm run format:write`to automatically fix most issues. Refer to`eslint.config.mjs`and Prettier config for specific rules.
- **Test Failures**:
  - Check the test output for specific error messages.
  - Ensure mocks are correctly configured and provide expected return values.
  - Verify that the code under test handles edge cases and error conditions as expected.
- **LLM API Errors**:
  - Check your API key and ensure you have sufficient credits.
  - Verify the model name is correct and supported by the provider.
  - Review the provider's documentation for specific error codes or messages.
  - Implement retry logic for transient errors (see Section 4.1).
- **File Operation Errors**:
  - Check file paths for correctness.
  - Ensure necessary directories exist before writing files.
  - Verify file permissions.
- **Memory Bank Generation Issues**:
  - Ensure templates are correctly formatted Markdown with proper YAML front-matter and section headings.
  - Verify the`{{CONTEXTUAL_RULES}}`marker is present in the template.
  - Check the LLM output for any errors or unexpected content.
  - Review the project context being provided to the`TemplateProcessor`.
- **Vite Build Issues**: If encountering problems during the build process with Vite, particularly related to module compatibility, refer to Section 5.3 and the `vite.config.ts`file (if applicable).
- **Tree-sitter Query Runtime Errors**: Previously, complex Tree-sitter queries (e.g., for specific function/class extraction) caused `TSQueryErrorNodeType` runtime errors, particularly after Vite builds. The architectural decision was made to remove these complex queries (Task TSK-012) and rely on LLM analysis for detailed code understanding in the future. Basic Tree-sitter parsing remains, but intricate queries were found to be brittle and difficult to maintain across grammar/build tool updates. If similar query errors arise, consider simplifying or removing the query in favor of LLM-based analysis.

### 7.2. Debugging

- **Logging**: Use the`ILogger` service (`logger.debug`, `logger.info`, etc.) to output information during execution.
- **VS Code Debugger**: Configure VS Code's debugger (`launch.json`) to step through the code. Set breakpoints and inspect variables.
  - Example `launch.json` configuration for debugging the CLI:
    `json
{
  \"version\": \"0.2.0\",
  \"configurations\": [
    {
      \"type\": \"node\",
      \"request\": \"launch\",
      \"name\": \"Debug CLI\",
      \"runtimeArgs\": [\"-r\", \"ts-node/register\"],
      \"args\": [\"${workspaceFolder}/src/bin/roocode-generator.ts\", \"generate\", \"--generators\", \"memory-bank\"], // Add your CLI args here
      \"console\": \"integratedTerminal\",
      \"internalConsoleOptions\": \"neverOpen\",
      \"sourceMaps\": true,
      \"cwd\": \"${workspaceFolder}\"
    }
  ]
}
    `

## 8. Generic AST Extraction (Tree-sitter)

As part of the project analysis capabilities (TSK-008 Revised), the `ProjectAnalyzer` utilizes the `TreeSitterParserService` to generate a generic Abstract Syntax Tree (AST) representation for supported source files. This provides foundational structural data for downstream analysis (e.g., by LLMs) without relying on language-specific queries.

### 8.1. `GenericAstNode` Structure

The service traverses the AST generated by Tree-sitter and converts each relevant node into the following recursive JSON structure (`GenericAstNode` interface defined in `src/core/analysis/types.ts`):

```json
{
  "type": "string", // Node's syntactic type (e.g., 'identifier', 'function_declaration')
  "text": "string", // Raw source code text of the node
  "startPosition": { "row": number, "column": number }, // Start location
  "endPosition": { "row": number, "column": number }, // End location
  "isNamed": boolean, // True if it's a named grammar rule
  "fieldName": "string | null", // Semantic role within parent (e.g., 'name', 'body')
  "children": [ // Array of child GenericAstNode objects
    // ...
  ]
}
```

### 8.2. Process

1.  `ProjectAnalyzer` identifies supported source files.
2.  For each file, `TreeSitterParserService` loads the appropriate grammar and parses the content.
3.  A recursive function (`_convertNodeToGenericAst`) traverses the resulting `SyntaxNode` tree.
4.  Each node is converted into the `GenericAstNode` JSON format.
5.  The resulting root `GenericAstNode` for each file is stored in the `ProjectContext.astData` field, keyed by the relative file path.

This approach provides a language-agnostic (in structure, not type names) representation of the code's syntax for further processing.

## 8. Contributing

Contributions are welcome! Please follow the workflow outlined in Section 3. Ensure your code adheres to the guidelines in Section 4, includes appropriate tests, and passes all CI checks.

When adding new features or making significant changes:

- **Update Documentation**: If your changes affect the project structure, workflow, or usage, update the relevant documentation files (e.g., `README.md`, `DeveloperGuide.md`, `TechnicalArchitecture.md`).
- **Consider Templates**: If adding new modes or significantly altering existing ones, update the corresponding rule templates in `templates/rules/`. If adding new task types, consider adding templates to `templates/memory-bank/templates/`.",
- **Maintain Tests**: Ensure existing tests pass and add new tests to cover your changes. Maintain or improve test coverage.

## 9. Security

Refer to the `SECURITY.md` file for details on reporting security vulnerabilities.
Be mindful of API keys and sensitive information. Do not commit secrets to the repository.

## 10. Project Status

The project is currently under active development. See the project board or issue tracker for ongoing work and future plans.

## 11. License

This project is licensed under the MIT License. See the `LICENSE` file for details.

---

Generated by RooCode Generator
Version: 1.0.1
Timestamp: 2025-05-02T15:38:00Z // Example timestamp
