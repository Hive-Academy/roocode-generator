# Developer Guide

This document serves as a comprehensive guide for developers working on the RooCode Generator project. It covers setup, development workflow, best practices, testing, and deployment.

## Setup

To set up the development environment, follow these steps:

1.  **Clone the repository:**bash
    git clone <repository_url>
    cd roocode-generator

    ```

    ```

2.  **Install dependencies:**
    The project uses `npm` as the package manager.

    ```bash
    npm install
    ```

3.  **Environment Variables:**
    The project utilizes environment variables, primarily for configuring LLM providers. Create a `.env` file in the project root based on the `.env.example` file (if available). Configure the necessary API keys and other settings for your chosen LLM provider.

4.  **Build the project:**

    ```bash
    npm run build
    ```

    This compiles the TypeScript code to JavaScript using `tsc` and performs other build steps defined in `package.json` using `vite` and `rimraf`.

5.  **Tree-sitter Grammars:**
    The project uses Tree-sitter for parsing code. Ensure the necessary grammars are available. The build process _should_ handle this, but if you encounter issues, you may need to manually install or build the grammars based on the project's Tree-sitter configuration (`src/core/analysis/tree-sitter.config.ts`).

## Development Workflow

Follow these steps for a typical development workflow:

1.  **Branching:**
    Use a feature branch workflow. Create a new branch from `main` (or `develop`, depending on the project's main development branch) for each new feature or bug fix. Branch names should be descriptive (e.g., `feat/new-generator`, `fix/cli-bug`).

2.  **Coding:**
    Write code following the project's coding standards and best practices (see section below). Utilize the existing dependency injection (DI) pattern for managing dependencies.

3.  **Committing:**
    Write clear and concise commit messages following the Conventional Commits specification. The project uses `commitlint` to enforce this. Commit messages should describe the purpose of the changes.

4.  **Linting and Formatting:**
    Before committing or pushing, ensure your code is linted and formatted correctly.

    ```bash
    npm run lint
    npm run format
    ```

    These commands use `eslint` and `prettier`. Husky hooks are configured to automatically run linting and formatting checks before commits.

5.  **Testing:**
    Write and run tests for your changes (see Testing section).

    ```bash
    npm test
    ```

6.  **Building:**
    Build the project to ensure everything compiles correctly.

    ```bash
    npm run build
    ```

7.  **Creating Pull Requests:**
    Once your changes are complete and tested, create a pull request to the main development branch. Provide a detailed description of your changes and link to any relevant issues.

8.  **Code Review:**
    Participate in code reviews and address any feedback received on your pull requests.

## Best Practices

Adhering to these best practices helps maintain code quality and consistency:

- **Dependency Injection (DI):** The project heavily uses a custom DI container (`src/core/di`). Use `@Injectable()` to mark classes that can be injected and `@Inject()` to inject dependencies. This promotes loose coupling and testability.
- **Result Type:** Use the `Result` type (`src/core/result/result.ts`) for functions that can either succeed with a value or fail with an error. This provides a clear and functional way to handle potential failures.
- **Error Handling:** Use the custom error classes defined in `src/core/errors` and `src/core/errors/memory-bank-errors.ts` for specific error types. Provide context in errors to aid debugging.
- **Logging:** Use the `LoggerService` (`src/core/services/logger-service.ts`) for all logging. Avoid using `console.log` directly.
- **File Operations:** Use the `FileOperations` service (`src/core/file-operations/file-operations.ts`) for all file system interactions. This centralizes file operations and allows for easier testing and error handling.
- **LLM Interactions:** Interact with LLMs via the `LLMAgent` (`src/core/llm/llm-agent.ts`). This service abstracts the underlying LLM provider and provides consistent methods for getting completions, counting tokens, etc.
- **Configuration:** Load and save configuration using the `LLMConfigService` (`src/core/config/llm-config.service.ts`) and `ProjectConfigService` (`src/core/config/project-config.service.ts`).
- **Templating:** Use the `TemplateManager` (`src/core/template-manager/template-manager.ts`) and related services (`RulesTemplateManager`, `TemplateProcessor`) for loading and processing templates.
- **Project Analysis:** Use the `ProjectAnalyzer` (`src/core/analysis/project-analyzer.ts`) and related services (like `TreeSitterParserService`, `FileContentCollector`) for analyzing project structure and content.
- **Avoid Direct Imports to `dist`:** Do not directly import files from the `dist` directory in your source code. Imports should point to the source files in `src`. The build process handles the compilation and output to `dist`.
- **Code Structure:** Follow the existing directory structure and organization. Keep related files together within their respective modules (e.g., `analysis`, `config`, `llm`, `memory-bank`).

### Project Structure

The project is organized into several key directories:

- `bin`: Contains the main executable script (`roocode-generator.js`).
- `src`: Contains the core source code.
  - `core`: Contains the core logic and services of the application.
    - `analysis`: Services for analyzing project code and structure (e.g., AST parsing, file collection).
    - `application`: Application-level logic and orchestration.
    - `cli`: Command Line Interface handling.
    - `config`: Configuration loading and management.
    - `di`: Dependency Injection container and related utilities.
    - `errors`: Custom error classes.
    - `file-operations`: Abstraction over file system operations.
    - `generators`: Base generator class and interfaces.
    - `llm`: Logic for interacting with Large Language Models, including providers and agent.
    - `result`: Implementation of the `Result` type for functional error handling.
    - `services`: Base service class and core services like logging.
    - `template-manager`: Logic for managing and processing templates.
    - `templating`: Specific templating logic (e.g., for rules).
    - `types`: Common utility types.
    - `ui`: User interface components (e.g., progress indicator).
  - `generators`: Specific generator implementations (e.g., `ai-magic-generator`, `roomodes-generator`).
  - `memory-bank`: Logic related to the "memory bank" feature, which involves generating project context.
  - `types`: Shared type definitions.
- `tests`: Contains project tests.
  - `__mocks__`: Mock implementations for testing.
- `templates`: Contains templates used by generators.
- `config`: Configuration files (e.g., ESLint, Prettier).

### Important APIs

Key interfaces and classes you will frequently interact with:

- `IResult<T, E>` (`src/core/result/result.ts`): Represents a result that is either a success (`T`) or a failure (`E`).
- `ILoggerService` (`src/core/services/logger-service.ts`): Interface for logging.
- `IFileOperations` (`src/core/file-operations/interfaces.ts`): Interface for file system operations.
- `ILLMAgent` (`src/core/llm/interfaces.ts`): Interface for interacting with the LLM.
- `IProjectAnalyzer` (`src/core/analysis/interfaces.ts`): Interface for analyzing project structure and content.
- `IMemoryBankService` (`src/memory-bank/interfaces.ts`): Interface for the Memory Bank feature.
- `IGenerator` (`src/core/generators/base-generator.ts`): Base interface for all generators.
- `IContainer` (`src/core/di/interfaces.ts`): Interface for the Dependency Injection container (though direct interaction is often abstracted by `@Inject`).

## Testing

The project uses `jest` for testing. Tests are located in the `tests` directory.

- **Running Tests:**
  ```bash
  npm test
  ```
- **Writing Tests:**
  Write unit and integration tests for new features and bug fixes. Aim for good test coverage. Use mock services and data where appropriate to isolate units of code. Mocks are typically placed in the `tests/__mocks__` directory.

- **Shared Mocks:** To improve test maintainability and consistency, utilize shared mock implementations for common services. These mocks are typically located in the `tests/__mocks__` directory (e.g., `tests/__mocks__/logger.mock.ts`). This pattern helps ensure that services like `ILogger` are mocked consistently across different test suites.

## Deployment

The project is a command-line tool distributed via npm.

- **Building for Production:**
  The `npm run build` command prepares the project for distribution.
- **Publishing to npm:**
  The project uses `semantic-release` for automated versioning and publishing to npm based on commit messages. Ensure your commits follow the Conventional Commits specification for `semantic-release` to correctly determine the next version and generate changelogs.
- **Manual Publishing (if needed):**
  If manual publishing is required, you can use `npm publish`. However, this should generally be avoided in favor of `semantic-release`.
