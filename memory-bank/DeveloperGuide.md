Okay, Roo Architect is ready to generate the Developer Guide.

```markdown
---
title: Developer Guide
version: 1.1.0
lastUpdated: 2024-07-27T10:00:00Z
type: core-documentation
category: development
---

# Developer Guide

This guide provides instructions for setting up the development environment, understanding the project structure, and following the development workflow for the **roocode-generator** project. It aims to enable team members to quickly understand and contribute to the project while maintaining consistency and quality.

## 1. Development Setup

### 1.1. Prerequisites

Before starting development, ensure you have the following installed:

-   **Node.js**: Version 18.x or higher is recommended (check `engines` in `package.json`). Download from [nodejs.org](https://nodejs.org/).
-   **npm** or **yarn**: Comes bundled with Node.js or install yarn via `npm install -g yarn`. This project uses npm by default.
-   **Git**: For version control. Download from [git-scm.com](https://git-scm.com/).
-   **API Keys**: You will need API keys for the desired LLM providers (Anthropic, Google Gemini, OpenAI) you intend to use or test with. These are required for core functionality.

### 1.2. Environment Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url> # Replace with the actual repository URL
    cd roocode-generator
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```
    *(Or `yarn install` if you prefer yarn)*

3.  **Set up environment variables:**
    -   Create a `.env` file in the project root (`.`). You can copy `.env.example` if it exists.
    -   Add the necessary API keys for the LLM services you intend to use:
        ```env
        # .env file content
        ANTHROPIC_API_KEY=your_anthropic_api_key
        GOOGLE_API_KEY=your_google_api_key
        OPENAI_API_KEY=your_openai_api_key
        ```
    -   **Note:** Never commit your `.env` file to version control. It's included in `.gitignore` by default.

4.  **Prepare Git Hooks:**
    Husky is used to manage Git hooks for linting and commit message validation. Ensure hooks are installed:
    ```bash
    npm run prepare
    ```

### 1.3. Required Tools & Technologies

-   **Code Editor**: Visual Studio Code (VS Code) is highly recommended.
    -   **Recommended Extensions**: ESLint, Prettier - Code formatter, Jest Runner.
-   **TypeScript**: (`typescript` dev dependency) Used for static typing across the project.
-   **ESLint**: (`eslint`, `@typescript-eslint/*` dev dependencies) For identifying and fixing code style issues and potential errors. Configuration in `eslint.config.mjs`.
-   **Prettier**: (`prettier` dev dependency) For automatic code formatting. Configuration likely in `.prettierrc` or `package.json`.
-   **Jest**: (`jest`, `ts-jest` dev dependencies) Testing framework for unit and integration tests. Configuration in `jest.config.js`.
-   **Husky**: (`husky` dev dependency) Manages Git hooks (pre-commit, commit-msg). Configuration likely in `.husky/` or `package.json`.
-   **Commitlint**: (`@commitlint/*` dev dependencies) Enforces conventional commit message format. Configuration in `commitlint.config.js`.
-   **Semantic Release**: (`semantic-release`, `@semantic-release/*` dev dependencies) For automated version management and package publishing based on commit messages. Configuration likely in `package.json` or `.releaserc`.
-   **Langchain**: (`langchain`, `@langchain/*` dependencies) Library for interacting with Large Language Models (LLMs).
-   **Commander**: (`commander` dependency) Framework for building the command-line interface.
-   **Inquirer**: (`inquirer` dependency) Used for interactive command-line prompts.
-   **Chalk**: (`chalk` dependency) For styling terminal output.
-   **Ora**: (`ora` dependency) For displaying spinners during long-running operations.
-   **module-alias**: (`module-alias` dependency) Used for simplifying module path resolution (see `bin/roocode-generator.js` and `tsconfig.json`).
-   **Reflect Metadata**: (`reflect-metadata` dependency) Used for decorator metadata, crucial for the Dependency Injection system.

## 2. Project Structure

The project aims for a feature-based or modular structure within the `src/` directory to organize code logically.

```
roocode-generator/
├── bin/                      # Executable scripts (JS after build)
├── dist/                     # Compiled JavaScript output from TypeScript
├── src/                      # Main TypeScript source code
│   ├── core/                 # Core framework components (DI, errors, services, etc.)
│   │   ├── application/      # Application orchestration (ApplicationContainer)
│   │   ├── analysis/         # Project analysis logic (ProjectAnalyzer)
│   │   ├── cli/              # CLI interface implementation (CliInterface)
│   │   ├── config/           # Configuration loading/saving (LLMConfigService, ProjectConfigService)
│   │   ├── di/               # Dependency Injection (Container, decorators, modules, registrations)
│   │   ├── errors/           # Custom error classes (RooCodeError, FileOperationError, etc.)
│   │   ├── file-operations/  # File system abstractions (IFileOperations)
│   │   ├── generators/       # Base generator classes/interfaces
│   │   ├── llm/              # LLM interaction (LLMAgent, providers, registry)
│   │   ├── result/           # Result type definition
│   │   ├── services/         # Common services (LoggerService, BaseService)
│   │   ├── template-manager/ # General template management
│   │   ├── templating/       # Rules-specific template processing
│   │   ├── types/            # Core shared type definitions (shared.ts, common.ts)
│   │   └── ui/               # UI elements (ProgressIndicator)
│   ├── generators/           # Specific generator implementations (Rules, SystemPrompts, etc.)
│   │   ├── rules/            # Rules generator specific files
│   │   └── ...               # Other generator files
│   ├── memory-bank/          # Memory Bank generator specific files
│   │   └── ...
│   └── types/                # Top-level shared types (Consider merging into src/core/types)
├── templates/                # Static template files used by generators
│   ├── guide/
│   ├── memory-bank/
│   │   └── templates/        # Task management templates
│   ├── rules/
│   └── system-prompts/
├── tests/                    # Unit and integration tests (Consider co-location)
├── .env.example              # Example environment variables file
├── .git/                     # Git directory
├── .gitignore                # Files/directories ignored by Git
├── .husky/                   # Husky Git hooks configuration
├── .roo/                     # RooCode specific configuration/rules (generated)
│   ├── rules/
│   ├── rules-backup/
│   └── rules-versions.json
├── commitlint.config.js      # Commitlint configuration
├── eslint.config.mjs         # ESLint configuration (new flat config format)
├── jest.config.js            # Jest test runner configuration
├── LICENSE                   # Project license file (MIT)
├── llm.config.json           # LLM configuration file (generated/managed by `config` command)
├── package-lock.json         # Exact dependency versions
├── package.json              # Project metadata, dependencies, scripts
├── README.md                 # Project overview
├── roocode-config.json       # RooCode project configuration (used by generators)
├── SECURITY.md               # Security policy
├── tsconfig.json             # TypeScript compiler configuration
└── memory-bank/              # Generated Memory Bank documentation
    ├── DeveloperGuide.md     # This file (should be generated here)
    ├── ProjectOverview.md    # Generated project overview
    └── TechnicalArchitecture.md # Generated architecture document
```

Refer to [[TechnicalArchitecture#Core-Components]] for detailed component information about the **Modular CLI with LLM Integration** architecture.

## 3. Development Workflow

### 3.1. Process Overview

This project utilizes **Trunk-Based Development**.

1.  **Sync with `main`:** Always ensure your local `main` branch is up-to-date before starting work:
    ```bash
    git checkout main
    git pull origin main
    ```
2.  **Create a Feature Branch (Recommended for > trivial changes):** While direct commits to `main` might occur for very small fixes, larger features or complex bug fixes should be done on short-lived feature branches:
    ```bash
    git checkout -b feature/your-feature-name
    # or
    git checkout -b fix/your-bug-fix-name
    ```
3.  **Develop:** Implement the feature or fix the bug. Follow the guidelines below. Write tests alongside your code.
4.  **Commit Changes:** Make small, logical commits using the **Conventional Commits** format (enforced by Commitlint via Husky hooks):
    ```bash
    git add .
    # Use 'npm run cz' or 'git commit' and follow prompts/guidelines
    git commit -m "feat: add support for YAML generation"
    git commit -m "fix(parser): resolve issue with template parsing"
    git commit -m "refactor(core): improve DI registration logic"
    git commit -m "docs: update developer guide for testing"
    git commit -m "test(cli): add tests for config command"
    # etc.
    ```
    Commit messages will be linted automatically on `git commit`. Fix any errors reported by the hook.
5.  **Run Local Checks:** Before pushing, ensure code quality:
    ```bash
    npm run lint # Check for linting errors
    npm run format # Check formatting
    npm run type-check # Check for TypeScript errors
    npm test # Run unit/integration tests
    ```
6.  **Push Changes:**
    -   For direct commits (small fixes): `git push origin main`
    -   For feature branches: `git push origin feature/your-feature-name`
7.  **Create Pull Request (if using feature branches):** Open a Pull Request (PR) from your feature branch to `main` (e.g., on GitHub). Ensure CI checks (linting, testing, building) pass.
8.  **Code Review (Mandatory for PRs):** Have your code reviewed by at least one other team member. Address feedback by pushing additional commits to your feature branch.
9.  **Merge:** Once approved and CI passes, merge the PR into `main` (typically using a squash merge via the Git platform UI). Delete the feature branch after merging.
10. **Release:** `semantic-release` automatically handles versioning and publishing to npm based on commit messages on the `main` branch when run in the CI environment (e.g., GitHub Actions).

### 3.2. Task Management

-   **Requirements:** Use the [[memory-bank/templates/task-description-template.md]] to define new tasks or features.
-   **Planning:** Outline implementation steps using the [[memory-bank/templates/implementation-plan-template.md]].
-   **Completion:** Document completed work with the [[memory-bank/templates/completion-report-template.md]].

## 4. Code Guidelines

### 4.1. Standards and Practices

-   **Language**: Use **TypeScript** (`^5.8.3` or compatible) for all new code. Adhere to modern JavaScript/TypeScript features enabled by the `es2020` target in `tsconfig.json`.
-   **Style & Formatting**: Strictly adhere to the rules defined in `eslint.config.mjs` (ESLint) and Prettier configuration.
    -   Run `npm run lint` and `npm run format` regularly.
    -   Formatting is automatically checked/applied on pre-commit hooks via Husky.
-   **Naming Conventions**: Follow standard TypeScript/JavaScript naming conventions:
    -   `camelCase` for variables, functions, and object properties.
    -   `PascalCase` for classes, types, interfaces, and enums.
    -   `UPPER_CASE` for constants.
    -   Prefix interfaces with `I` (e.g., `ILogger`, `IFileOperations`).
-   **Modularity**: Design components to be modular, reusable, and have clear responsibilities. Leverage established patterns:
    -   **Dependency Injection**: Use the custom DI container (`src/core/di/`) with `@Injectable` and `@Inject` decorators. See section 4.3.
    -   **Generator Pattern**: Follow the `BaseGenerator` structure for creating new generators.
    -   **Configuration-Driven**: Rely on `roocode-config.json` and `llm.config.json` for behavior control.
    -   **LLM Abstraction**: Interact with LLMs via the `LLMAgent` and `ILLMProvider` interfaces.
    -   **Result Pattern**: Use the `Result` class (`src/core/result/result.ts`) for explicit error handling in functions that can fail.
-   **Error Handling**:
    -   Implement robust error handling using the `Result<T, E>` type for expected failures (e.g., file not found, invalid input).
    -   Use custom error classes (e.g., `FileOperationError`, `GeneratorError` from `src/core/errors/`) for specific error types where beneficial.
    -   Use standard `try...catch` for unexpected runtime errors.
    -   Provide meaningful error messages and context. Log errors using the `ILogger` service.
-   **Logging**: Use the `ILogger` service (resolved via DI) for all logging. Avoid `console.log` in application code (except potentially at the very top level entry point for fatal errors before logger is available). Use different log levels (`debug`, `info`, `warn`, `error`) appropriately.
-   **Commit Messages**: Strictly follow the [Conventional Commits specification](https://www.conventionalcommits.org/). This is enforced by Commitlint via Husky hooks. Example types: `feat`, `fix`, `refactor`, `perf`, `test`, `build`, `ci`, `docs`, `style`.

### 4.2. Modular DI Registration Pattern

To enhance organization and maintainability, the project's custom Dependency Injection (DI) registration logic is modularized. Instead of a single large registration function, dependencies are registered in dedicated module files located under `src/core/di/modules/`.

**Key Principles:**

-   **Separation of Concerns:** Each module file (e.g., `app-module.ts`, `core-module.ts`, `llm-module.ts`, `rules-module.ts`, `memory-bank-module.ts`) contains registration logic specific to its domain, typically using factory functions (`container.registerFactory`).
-   **Centralized Loading:** The main registration entry point (`src/core/di/registrations.ts`) imports these modules and calls their respective registration functions (`registerCoreModule`, `registerLlmModule`, etc.) to build the complete dependency graph for the container.
-   **Scalability:** This pattern makes it easier to add or modify dependencies for specific features without altering a single, large registration file. New features should ideally have their own registration module.

**Example Structure:**

```
src/
└── core/
    └── di/
        ├── container.ts       # Main Container class
        ├── decorators.ts      # @Injectable, @Inject decorators
        ├── errors.ts          # DI-specific errors
        ├── index.ts           # Barrel file for DI exports
        ├── interfaces.ts      # IServiceContainer interface
        ├── types.ts           # Core DI types (ServiceLifetime, etc.)
        ├── modules/           # <-- DI Registration Modules
        │   ├── app-module.ts
        │   ├── core-module.ts
        │   ├── llm-module.ts
        │   ├── memory-bank-module.ts
        │   └── rules-module.ts
        └── registrations.ts   # Central registration function (imports & calls modules)
```

**Adding New Dependencies:**

1.  Identify the appropriate module (e.g., `core`, `llm`, `rules`, a new feature module).
2.  Add the service registration (using `registerSingleton` or `registerFactory`) within that module's registration function (e.g., `registerCoreModule`).
3.  Ensure the module registration function is called within `src/core/di/registrations.ts`.
4.  Use `@Inject('YourServiceToken')` in the constructor of classes needing the dependency.

### 4.3. Quality and Testing

-   **Testing Approach**: The project uses **Jest** (`^29.7.0`) as the primary testing framework, configured with `ts-jest` (`^29.3.2`) for seamless TypeScript support. Unit and integration tests are currently expected to be located in the `tests/` directory, following the naming convention `*.test.ts` (as per `jest.config.js`). *Note: There is a plan to colocate tests with source files in the future (`src/core/component.test.ts`), but follow the current structure for now.*
-   **Coverage Goals**: The project enforces a minimum global coverage threshold of **80%** for branches, functions, lines, and statements, as configured in `jest.config.js`. Strive to maintain or increase coverage with new contributions.
-   **Validation**:
    -   **Static Analysis**: Run `npm run lint` to check for code style and potential errors based on `eslint.config.mjs`. Fix all reported issues.
    -   **Type Checking**: Run `npm run type-check` (or rely on `tsc --noEmit` during the build) to ensure type safety based on `tsconfig.json`. Resolve all TypeScript errors.
-   **Running Tests**:
    -   Run all tests once:
        ```bash
        npm test
        ```
    -   Run tests in watch mode during development:
        ```bash
        npm run test:watch
        ```
    -   Generate coverage reports (output to `coverage/`):
        ```bash
        npm run test:coverage
        ```
-   **Testing Framework Setup**:
    -   Jest configuration is defined in `jest.config.js`.
    -   Key settings include: `preset: 'ts-jest'`, `testEnvironment: 'node'`, `testMatch: ['<rootDir>/tests/**/*.test.ts']`, coverage settings.
    -   `module-alias` is likely needed for tests to resolve path aliases; Jest config might need `moduleNameMapper` or setup files to handle this correctly if not already configured.
-   **Test Maintenance Guidelines**:
    -   Write tests for all new features and bug fixes.
    -   Place test files in the `tests/` directory using the `*.test.ts` pattern (until co-location is implemented).
    -   Use descriptive test names (`it(...)`) and group related tests with `describe` blocks.
    -   Mock external dependencies (LLM APIs, file system for unit tests) using Jest's mocking capabilities (`jest.mock`, `jest.fn`).
    -   Follow existing code style and formatting guidelines within tests.
    -   Run tests locally (`npm test`) before committing changes.
    -   CI pipelines automatically enforce test execution and coverage thresholds on pull requests/merges to `main`.

## 5. Common Operations

### 5.1. Development Tasks

Standard npm scripts are configured in `package.json`:

-   **Build the project:** Compiles TypeScript to JavaScript in `dist/` and copies templates.
    ```bash
    npm run build
    ```
-   **Run type checking:** Verifies TypeScript types without emitting JS files.
    ```bash
    npm run type-check
    ```
-   **Run tests:** Executes the test suite using Jest.
    ```bash
    npm test
    ```
-   **Run tests in watch mode:** Useful during development to automatically re-run tests on file changes.
    ```bash
    npm run test:watch
    ```
-   **Generate test coverage report:** Runs tests and outputs coverage information to `coverage/`.
    ```bash
    npm run test:coverage
    ```
-   **Check for linting errors:** Runs ESLint based on `eslint.config.mjs`.
    ```bash
    npm run lint
    ```
-   **Automatically fix linting errors:** Applies ESLint's automatic fixes where possible.
    ```bash
    npm run lint:fix
    ```
-   **Check code formatting:** Runs Prettier to check if files match the defined style.
    ```bash
    npm run format
    ```
-   **Automatically fix formatting:** Runs Prettier to reformat files according to the defined style.
    ```bash
    npm run format:write
    ```
-   **Run all style checks/fixes:** Combines formatting and lint fixing.
    ```bash
    npm run style
    ```
-   **Run in development mode:** Builds the project and immediately runs a common generation command (e.g., `generate --generators vscode-copilot-rules memory-bank`). Useful for quick testing during development.
    ```bash
    npm run dev
    ```
-   **Run the CLI directly (after building):** Executes the main CLI entry point. Use `cross-env` for setting `NODE_PATH` for alias resolution.
    ```bash
    npm run start -- [command] [options]
    # Example: npm run start -- config --provider openai
    # Or run the built JS directly:
    # cross-env NODE_PATH=dist/src node dist/bin/roocode-generator.js [command] [options]
    ```

### 5.2. Build and Deploy

-   **Build Process**: Triggered by `npm run build`. Uses `tsc` (TypeScript Compiler) based on `tsconfig.json` to compile `src/**/*.ts` files into JavaScript (`commonjs` modules) in the `dist/` directory. The `copyfiles` script is used to copy non-TypeScript assets (like files in `templates/`) to the `dist/` directory so they are included in the build output.
-   **Deployment**: Deployment and package publishing to npm are automated using `semantic-release`. This process typically runs in a CI/CD pipeline (e.g., GitHub Actions) triggered by merges or pushes to the `main` branch.
    -   `semantic-release` analyzes commit messages (following Conventional Commits) since the last release.
    -   It determines the appropriate version bump (patch, minor, major).
    -   It generates changelog entries.
    -   It tags the release in Git.
    -   It publishes the package to the npm registry.
    -   Manual publishing (`npm publish`) is generally discouraged.

## 6. Working with Rule Templates

The Rules Template System is a core part of how `roocode-generator` generates mode-specific rules and documentation. Understanding how to work with templates is crucial for extending or customizing the generator's behavior.

### 6.1. Template Structure and Syntax

Templates are Markdown files located in the `src/templates/rules/[mode]/` directory (e.g., `src/templates/rules/architect/base.md`). They can include metadata (extracted via front-matter parsing in `TemplateManager`) and define distinct sections using Markdown headings.

-   **Sections:** Templates are divided into sections using Markdown headings (`## Section Name`).
-   **Contextual Rules Marker:** The `{{CONTEXTUAL_RULES}}` marker is a special placeholder within a template section where the `TemplateProcessor` will insert rules generated by the LLM based on project context.

Example Template (`src/templates/rules/architect/base.md`):

```markdown
---
Mode: architect
Version: 1.0
RequiredSections: [Overview, Principles]
---

# Architect Mode Rules

## Overview

Base rules for architectural planning...

## Principles

- Principle A
- Principle B

## Contextual Guidelines

{{CONTEXTUAL_RULES}}

## Best Practices

Additional best practices...
```

### 6.2. Developer Usage

Interacting with the template system involves using the `IRulesTemplateManager` and `TemplateProcessor` components, resolved via Dependency Injection.

1.  **Loading Base Templates:**
    ```typescript
    // Assuming 'container' is the resolved DI Container instance
    import { IRulesTemplateManager } from '@core/templating/rules-template-manager'; // Adjust path if needed

    const templateManager = container.resolve<IRulesTemplateManager>('IRulesTemplateManager').value!;
    const baseTemplateResult = await templateManager.loadBaseTemplate('architect'); // Load template for 'architect' mode

    if (baseTemplateResult.isOk()) {
      const templateContent = baseTemplateResult.value;
      console.log('Loaded base template content:', templateContent);
      // Proceed to apply customizations or process
    } else {
      console.error('Failed to load base template:', baseTemplateResult.error);
      // Handle error
    }
    ```

2.  **Applying Customizations:**
    Customizations (e.g., `src/templates/rules/architect/custom.md`) allow overriding or adding sections.
    ```typescript
    const customResult = await templateManager.loadCustomizations('architect');

    if (customResult.isOk() && baseTemplateResult.isOk()) {
      // Note: mergeTemplates expects string content
      const mergedResult = templateManager.mergeTemplates(
        baseTemplateResult.value!,
        customResult.value!
      );
      if (mergedResult.isOk()) {
        const mergedTemplateContent = mergedResult.value;
        console.log('Merged template content:', mergedTemplateContent);
        // Use the merged template for processing
      } else {
        console.error('Failed to merge templates:', mergedResult.error);
        // Handle error
      }
    } else if (customResult.isErr()) {
      console.warn('No customizations found or failed to load:', customResult.error);
      // Can proceed with just the base template if appropriate
    }
    ```

3.  **Processing with Contextual Rules:**
    The `TemplateProcessor` integrates LLM-generated content.
    ```typescript
    import { TemplateProcessor } from '@core/templating/template-processor'; // Adjust path
    import { ProjectContext } from '@core/analysis/types'; // Adjust path

    // Assume mergedTemplateContent (string) is available
    // Assume projectContext (ProjectContext) is available
    const templateProcessor = container.resolve<TemplateProcessor>('TemplateProcessor').value!;

    // processTemplate expects mode and context, it handles loading/merging internally
    const processedResult = await templateProcessor.processTemplate('architect', projectContext);

    if (processedResult.isOk()) {
      const finalContent = processedResult.value;
      console.log('Final processed content:', finalContent);
      // This content is ready for file generation
    } else {
      console.error('Template processing failed:', processedResult.error);
      // Handle error
    }
    ```

### 6.3. Error Handling

The Rules Template System utilizes the `Result<T, E>` type (`src/core/result/result.ts`) for operations that might fail.

Always check the result of template operations using `isOk()` or `isErr()` and handle potential errors gracefully, often by logging the error (`ILogger`) and providing user feedback (`ICliInterface`, `ProgressIndicator`).

```typescript
// Example error handling pattern
const result = await someTemplateOperation();
if (result.isErr()) {
  const logger = container.resolve<ILogger>('ILogger').value!; // Resolve logger
  logger.error(`Operation failed: ${result.error.message}`, result.error);
  // Implement specific error recovery or propagate the error
  // Maybe display user-friendly message via ICliInterface
} else {
  const data = result.value;
  // Process successful result
}
```

### 6.4. Best Practices

-   **Template Management:**
    -   Store templates and customizations in version control (`src/templates/`).
    -   Use clear, descriptive names for template files (e.g., `base.md`, `custom.md`) and sections (`## Section Name`).
    -   Use front-matter for metadata (Mode, Version, RequiredSections).
-   **Customization:**
    -   Create separate customization files (`custom.md`) within the mode directory.
    -   Document the rationale behind customizations.
    -   Test merged templates to ensure desired output.
-   **Integration:**
    -   Resolve `IRulesTemplateManager` and `TemplateProcessor` via DI.
    -   Implement consistent error handling using the `Result` type and `ILogger`.
    -   Log template operations (loading, merging, processing) for debugging.
    -   Utilize `validateTemplate` where appropriate.

## 7. LLM-Based Rules Generator Implementation

The Rules Generator (`src/generators/rules/rules-generator.ts`) integrates LLM capabilities to generate contextually relevant rules based on project analysis.

### 7.1. Core Components

-   **`IProjectAnalyzer` (`src/core/analysis/project-analyzer.ts`):** Analyzes the project's tech stack, structure, and dependencies using file operations and potentially LLM assistance.
-   **`IRulesTemplateManager` (`src/core/templating/rules-template-manager.ts`):** Loads base templates and customizations for specific modes.
-   **`TemplateProcessor` (`src/core/templating/template-processor.ts`):** Orchestrates the process: merges templates, uses `LLMAgent` with project context to generate contextual rules, and inserts them into the template (`{{CONTEXTUAL_RULES}}`).
-   **`LLMAgent` (`src/core/llm/llm-agent.ts`):** Interacts with the configured LLM provider via `ILLMProviderRegistry` to get text completions based on prompts.
-   **`IRulesFileManager` (`src/generators/rules/rules-file-manager.ts`):** Saves the final generated rules content to the appropriate file structure (`.roo/rules/[mode]/[version].json`) and manages version history (`.roo/rules-versions.json`).
-   **`IRulesContentProcessor` (`src/generators/rules/rules-content-processor.ts`):** Post-processes the LLM-generated content (e.g., strips markdown fences).
-   **`IRulesPromptBuilder` (`src/generators/rules/rules-prompt-builder.ts`):** Constructs the prompts sent to the LLM.

### 7.2. Usage Example (Simplified Flow in `RulesGenerator`)

```typescript
// Simplified conceptual flow within RulesGenerator.generate()

// 1. Analyze Project Context
const contextResult = await this.projectAnalyzer.analyzeProject(contextPaths);
if (contextResult.isErr()) return contextResult; // Propagate error
const projectContext = contextResult.value!;

// 2. Process Template (Loads, Merges, Generates Contextual Rules via LLM)
const processedTemplateResult = await this.templateProcessor.processTemplate(mode, projectContext);
if (processedTemplateResult.isErr()) return processedTemplateResult; // Propagate error
const finalContent = processedTemplateResult.value!;

// 3. Post-Process Content (e.g., strip markdown)
const processedRulesResult = this.contentProcessor.processContent(finalContent, { mode });
if (processedRulesResult.isErr()) return processedRulesResult; // Propagate error
const readyContent = processedRulesResult.value!;

// 4. Save Rules (Handles versioning)
const generatedRules: GeneratedRules = {
  mode: mode,
  content: readyContent,
  metadata: { mode /* ... other metadata */ },
  contextualInfo: { /* ... context used */ }
};
const saveResult = await this.fileManager.saveRules(generatedRules);
if (saveResult.isErr()) return saveResult; // Propagate error

return Result.ok(saveResult.value!); // Return path or success message
```

### 7.3. Error Handling Patterns

-   **`Result` Type:** All core operations (`analyzeProject`, `processTemplate`, `getCompletion`, `saveRules`, `loadRules`, etc.) return a `Result<T, Error>`. Always check `isOk()` or `isErr()` before accessing `value` or `error`.
-   **Logging:** Use the injected `ILogger` to log errors with context (mode, file path, operation name) and the underlying error object.
-   **Propagation:** Return `Result.err(error)` to propagate errors up the call stack.
-   **Fallback:** The `RulesGenerator` includes fallback logic to use static templates if LLM generation fails.

### 7.4. Best Practices

1.  **Project Analysis:** Provide accurate `contextPaths`. Handle analysis errors gracefully.
2.  **Template Processing:** Ensure base templates and customizations exist and are valid. Handle merge conflicts logically.
3.  **File Management:** Implement robust versioning and backup logic (handled by `RulesFileManager`). Validate saved files.
4.  **Error Recovery:** Log detailed context for failures. Provide clear feedback to the user via `ICliInterface` and `ProgressIndicator`.
5.  **LLM Interaction:** Secure API keys using `.env`. Validate LLM responses (e.g., check for valid JSON if expected). Handle rate limits or API errors from the provider.

### 7.5. Common Issues & Troubleshooting

1.  **LLM API Errors:** Check API key validity (`.env`), network connection, and provider status. Ensure the configured model (`llm.config.json`) is valid for the provider. Check `maxTokens` and `temperature` settings.
2.  **Template Parsing/Merging Errors:** Verify template syntax (Markdown headings, front-matter, `{{CONTEXTUAL_RULES}}` marker). Check file paths in `RulesTemplateManager`.
3.  **File System Errors:** Ensure correct permissions for the `.roo` directory. Check paths used in `RulesFileManager`.
4.  **Context Analysis Failures:** Verify `IProjectAnalyzer` can access and parse project files. Check file permissions and project structure. Ensure the LLM used for analysis (if any) is configured correctly.
5.  **Content Processing Errors:** Ensure LLM output matches expected format for `IRulesContentProcessor` (e.g., markdown code blocks).

### 7.6. Performance & Security

-   **Performance:**
    -   Caching: Template content (`TemplateManager`) and LLM provider instances (`LLMProviderRegistry`) are cached. Consider caching analysis results (`IProjectAnalyzer`) if analysis is slow and inputs don't change frequently.
    -   Resource Management: Ensure file handles are closed (handled by Node.js `fs.promises`). Be mindful of memory usage when reading large files or processing large LLM responses.
-   **Security:**
    -   File Access: Validate paths to prevent directory traversal issues (basic checks in `FileOperations`). Run the tool with appropriate user permissions.
    -   LLM Integration: Protect API keys (`.env`, `.gitignore`). Be cautious about sending sensitive project code to external LLMs; consider sanitization or using local models if necessary. Validate LLM responses for potentially malicious content (though less likely for rule generation).

## 8. Troubleshooting

### 8.1. Common Issues

-   **Dependency Installation Errors:**
    -   Ensure Node.js (>=18.x) and npm/yarn versions match requirements.
    -   Try removing `node_modules` and `package-lock.json` (or `yarn.lock`) and reinstalling: `rm -rf node_modules && rm package-lock.json && npm install` (or `yarn install`).
    -   Check for network connectivity issues or npm registry status.
-   **Build Failures (`npm run build`):**
    -   Check console output for specific TypeScript errors (`tsc`). Address type errors, missing imports, or configuration issues in `tsconfig.json`.
    -   Ensure `copyfiles` command is correctly configured if assets are missing.
-   **Linting/Formatting Errors (`npm run lint`/`npm run format`):**
    -   Run `npm run lint:fix` or `npm run format:write` to automatically fix issues where possible.
    -   Consult `eslint.config.mjs` and Prettier config for specific rule violations.
    -   Ensure editor extensions (ESLint, Prettier) are enabled and configured.
-   **Git Hook Failures (pre-commit, commit-msg):**
    -   Ensure Husky is set up correctly (`npm run prepare`).
    -   Check the specific hook script that failed (usually linting or commit message format errors). Fix the underlying code or commit message.
-   **LLM API Key Issues:**
    -   Verify `.env` file exists in the project root and contains the correct API keys (e.g., `OPENAI_API_KEY`).
    -   Ensure `dotenv/config` is imported early in the entry point (`bin/roocode-generator.js`).
    -   Check the specific LLM provider's documentation for API key validity and usage limits.
    -   Verify the `llm.config.json` file (if used) has the correct provider selected. Use `roocode config` to check/update.
-   **Module Resolution Errors (`Cannot find module '@core/...'`):**
    -   Ensure the project is built (`npm run build`) and the `dist` directory exists.
    -   Verify `module-alias` setup in `bin/roocode-generator.js` correctly points to `../dist/src`.
    -   Ensure the `start` script in `package.json` uses `cross-env NODE_PATH=dist/src` or similar mechanism to set the path for Node.js module resolution.
    -   Check `tsconfig.json` `paths` and `baseUrl` are correctly configured.

### 8.2. Support Resources

-   **Check Logs**: Look for detailed error messages and stack traces in the console output. Increase log level if necessary (check `LoggerService`).
-   **Project Issues**: Search existing issues or open a new one in the project's issue tracker (e.g., GitHub Issues). Provide detailed steps to reproduce, error messages, and environment information.
-   **Team Channel**: Contact the development team via the designated communication channel (e.g., Slack, Teams).
-   **Langchain Documentation**: Refer to the [Langchain JS/TS documentation](https://js.langchain.com/) for issues related to LLM interactions, specific providers (`@langchain/*`), or core concepts.
-   **Dependency Documentation**: Consult the documentation for other key dependencies like Commander, Inquirer, Jest, etc.

## 9. Environment Management

### 9.1. Infrastructure

-   The project runs primarily as a **local CLI tool**.
-   **CI/CD**: Likely uses GitHub Actions (or similar) for automated linting, testing, building, and releasing (via `semantic-release`). See workflow files (e.g., `.github/workflows/`).
-   **Distribution**: Published as an npm package to the npm registry.

See [[TechnicalArchitecture#Infrastructure]] for more details.

### 9.2. Environments

-   **Development (Local):** Your local machine. Uses `.env` file for API keys. Run via `npm run dev` or `npm start`. Build output goes to `dist/`.
-   **CI (Continuous Integration):** Environment like GitHub Actions. Runs checks (`lint`, `test`, `build`). Uses secrets management (e.g., GitHub Secrets) for `NPM_TOKEN` and potentially API keys during automated release process.
-   **Production (npm Registry / User's Machine):** The published package installed via `npm install -g roocode-generator` or used via `npx`. Users run it in their own environments, potentially needing their own `.env` or configured LLM settings.

Environment-specific configurations (like different API endpoints, feature flags if added later) should ideally be managed through environment variables (`dotenv`) or potentially different configuration files loaded based on `NODE_ENV`. Currently, LLM config is primarily managed via `llm.config.json` and `.env`.
```