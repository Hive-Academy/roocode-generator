# Developer Guide: roocode-generator

## 1. Introduction

Welcome, developer! This guide provides instructions for setting up the development environment, running the project, understanding the codebase, and contributing effectively to roocode-generator.

- **Purpose**: `roocode-generator` is a CLI tool designed to generate RooCode workflow configuration files tailored to any given tech stack.
- **Target Audience**: This guide is intended for developers who want to contribute to the `roocode-generator` project.
- **Prerequisites**: Please read the [Project Overview](ProjectOverview.md) and [Technical Architecture](TechnicalArchitecture.md) documents first.

## 2. Getting Started: Setup & Installation

### 2.1. Prerequisites

- **Node.js**: Requires Node.js version `>=16`.
- **Package Manager**: Uses `npm`. Ensure you have a recent version installed (e.g., npm 9.x or later).
- **Git**: Standard Git installation.
- **(Optional) Specific Tools**:
  - TypeScript Compiler (`tsc`)
  - Vite
  - Jest
  - ESLint
  - Prettier
  - Tree-sitter grammars (handled during dependency installation)

### 2.2. Cloning the Repository

git clone https://github.com/yourusername/roocode-generator.git # Assuming this is the repository URL
cd roocode-generator

### 2.3. Installing Dependencies

Use npm to install project dependencies:

```bash
npm install
```

This command will install both production and development dependencies, including tools like Husky for Git hooks and Tree-sitter grammars.

### 2.4. Environment Configuration

The project uses `dotenv` for environment variable management.

- Create a `.env` file in the root directory (`.`). (This file is typically ignored by Git).
- Add necessary API keys or configuration, particularly for LLM providers:

```dotenv
# Example:
# OPENAI_API_KEY=your_openai_key
# ANTHROPIC_API_KEY=your_anthropic_key
# GOOGLE_API_KEY=your_google_key
# OPENROUTER_API_KEY=your_openrouter_key

# Optional: Specify default LLM provider and model
# DEFAULT_LLM_PROVIDER=openai
# DEFAULT_LLM_MODEL=gpt-4o
```

Refer to the LLM configuration section in the Technical Architecture for more details on required variables for different providers.

### 2.5. Initial Build

The project is written in TypeScript and requires compilation.

```bash
npm run build
```

This command uses `vite build` to compile the TypeScript code into JavaScript, outputting to the `dist` directory.

### 2.6. Verifying Installation

You can verify the installation by running the help command or the test suite.

```bash
# Example: Run help command
node bin/roocode-generator.js --help

# Example: Run tests
npm test
```

## 3. Project Structure Overview

The project follows a modular structure, primarily organized within the `src` directory.

- `src/core`: Contains the core logic, including DI, file operations, error handling, LLM integration, project analysis, configuration management, and UI components.
- `src/generators`: Contains the implementations for different types of workflow generators (e.g., `roomodes-generator`, `system-prompts-generator`).
- `src/memory-bank`: Contains logic related to generating and managing the project's "memory bank" or contextual documentation.
- `src/types`: Contains TypeScript type definitions.
- `bin`: Contains the main executable script (`roocode-generator.js`).
- `dist`: Output directory for compiled JavaScript code.
- `tests`: Automated tests using Jest.
- `.`: Project root, containing configuration files like `package.json`, `tsconfig.json`, `vite.config.ts`, linting/formatting configs, etc.

Refer to the Technical Architecture document for a more detailed breakdown of modules and their interactions.

## 4. Development Workflow

### 4.1. Common Scripts

The `package.json` file defines several useful scripts for development tasks:

- `npm start`: Runs the compiled CLI tool directly using Node.
- `npm run build`: Compiles the TypeScript source code using Vite.
- `npm run type-check`: Runs the TypeScript compiler to check for type errors without emitting files.
- `npm test`: Runs the test suite using Jest.
- `npm test:watch`: Runs tests in watch mode.
- `npm test:coverage`: Runs tests and generates a coverage report.
- `npm run lint`: Runs ESLint to check for code style and potential errors.
- `npm run lint:fix`: Runs ESLint and automatically fixes issues where possible.
- `npm run format`: Checks code formatting using Prettier.
- `npm run format:write`: Formats code using Prettier.
- `npm run style`: Runs both formatting and linting with auto-fix.
- `npm prepare`: Sets up Husky Git hooks (runs automatically after `npm install`).
- `npm run dev`: Starts a development server/process (currently configured via Vite, though primarily a CLI tool).
- `npm run clean`: Removes the `dist` directory.

### 4.2. Branching Strategy

The project uses a feature branching strategy:

- Main branches: `main` (for releases) and `develop` (for ongoing development).
- Feature branches: Create branches prefixed with `feature/` (e.g., `feature/add-new-generator`) for new features, branched from `develop`.
- Bugfix branches: Create branches prefixed with `fix/` (e.g., `fix/cli-parsing-error`) for bug fixes, branched from `develop` (or `main` for hotfixes).

All development work should happen on feature or bugfix branches.

### 4.3. Making Changes

1.  Ensure you are on the `develop` branch and it's up to date (`git pull origin develop`).
2.  Create a new feature or fix branch: `git checkout -b feature/your-feature-name`.
3.  Implement your changes in the source files (`src/`).
4.  Ensure code compiles/builds by running `npm run build`.
5.  Write or update tests in the `tests/` directory to cover your changes.
6.  Run linters and formatters: `npm run style`.
7.  Ensure all tests pass: `npm test`.
8.  Commit changes using conventional commit messages (see Coding Standards).
9.  Push your branch: `git push origin feature/your-feature-name`.
10. Create a Pull Request (PR) targeting the `develop` branch.

### 4.4. Pull Request (PR) Process

- PRs should target the `develop` branch for new features and standard bug fixes. Hotfixes may target `main`.
- Provide a clear title and description of the changes.
- Link to any relevant issues or tasks.
- PRs require review and approval from at least one other contributor.
- All automated CI checks (linting, testing, build) must pass before merging.

### 4.5. Debugging

- Use `console.log` or the `LoggerService` (`src/core/services/logger-service.ts`) for basic logging.
- Utilize the Node.js debugger. You can often set breakpoints directly in your IDE (like VS Code) and run the main script (`bin/roocode-generator.js`) with debugging enabled. Check the `.vscode/launch.json` file if it exists for pre-configured launch profiles.

## 5. Coding Standards & Conventions

- **Language**: TypeScript and JavaScript.
- **Style Guide**: Enforced by ESLint and Prettier.
- **Linting**: ESLint (`eslint.config.mjs`). Run `npm run lint` or `npm run lint:fix`.
- **Formatting**: Prettier (`.prettierrc`, configured in `package.json`). Run `npm run format` or `npm run format:write`.
- **Naming Conventions**: Follow standard TypeScript/JavaScript conventions (camelCase for variables/functions, PascalCase for classes/types).
- **Commit Messages**: Follow Conventional Commits specification, enforced by Commitlint (`commitlint.config.js`) and Husky. Use prefixes like `feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`, etc.
- **Team Agreement**: Adhere to the standards enforced by linters, formatters, and commitlint.

## 6. Testing

- **Framework**: Jest (`jest.config.js`).
- **Location**: Tests are located in the `tests/` directory. Test files typically follow the naming convention `*.test.ts`.
- **Running Tests**:
  - All tests: `npm test`
  - Watch mode: `npm test:watch`
  - Specific file: `npm test -- tests/path/to/your.test.ts`
- **Types of Tests**: Primarily focuses on Unit Tests and potentially some Integration Tests for core modules.
- **Writing Tests**: Write tests in the `tests/` directory using the Jest framework. Mock dependencies as needed using Jest's mocking capabilities (see `tests/__mocks__`).

## 7. Build & Deployment

- **Build Process**: The build process is handled by `npm run build`, which uses Vite and the TypeScript Compiler (`tsc`). The output is placed in the `dist/` directory.
- **Deployment**: As a CLI tool, `roocode-generator` is typically distributed via npm. Deployment involves publishing a new version to the npm registry using `npm publish`. The `package.json` `bin` field (`"roocode": "./bin/roocode-generator.js"`) makes the tool executable when installed globally or used via `npx`.

## 8. Key Libraries & Concepts

- **commander**: Used for building the command-line interface.
- **inquirer**: Used for interactive prompts in the CLI.
- **langchain**: Provides integration with various LLM providers (OpenAI, Anthropic, Google GenAI, OpenRouter).
- **zod**: Used for schema validation, particularly for LLM responses and configuration.
- **ora**: Provides elegant terminal spinners for indicating progress.
- **chalk**: Used for styling terminal output.
- **tree-sitter**: Used for parsing code into Abstract Syntax Trees (ASTs) for analysis.
- **jsonrepair**: Used for robust parsing and repairing of potentially malformed JSON from LLM responses.
- **dotenv**: Loads environment variables from a `.env` file.
- **Dependency Injection (DI)**: The project uses a custom DI container (`src/core/di`) to manage service dependencies and improve testability.
- **Result Type**: A custom `Result` type (`src/core/result`) is used throughout the codebase for explicit error handling, distinguishing between successful outcomes and failures.
- **Project Analysis & `ProjectContext`**: Modules in `src/core/analysis` are responsible for collecting project files, analyzing tech stack, parsing ASTs, and preparing context for LLMs.
  - The central data structure produced is `ProjectContext` (defined in `src/core/analysis/types.ts`). Following TSK-020, this structure has been significantly minimized to optimize LLM payloads and reduce data redundancy.
  - **Minimal Structure**: It now primarily consists of `projectRootPath`, `techStack` (detailing technologies), `packageJson` (a minimal representation of `package.json` for external dependencies), and `codeInsights` (a map of file paths to their AST-derived summaries including functions, classes, and imports).
  - **Removed Components**: Explicit structures like `directoryTree` and `internalDependencyGraph` have been removed from `ProjectContext`.
  - **Derived Information**: Information previously available directly (e.g., lists of config files, entry points, full internal dependency graphs) is now derived on-demand from the minimal `ProjectContext` using helper utilities located in `src/core/analysis/project-context.utils.ts`. Key utilities include:
    - `getConfigFiles(projectContext)`: Derives configuration file paths.
    - `getEntryPointFiles(projectContext)`: Derives main entry point file paths.
    - `getInternalDependenciesForFile(projectContext, filePath)`: Derives internal dependencies for a specific file from `codeInsights`.
    - `getDependencyVersion(projectContext, packageName)`: Retrieves version for an external dependency from `packageJson`.
    - `getFilesByPattern(projectContext, patterns)`: Gets files matching glob patterns from `codeInsights` keys.
  - This approach relies more on `codeInsights` as the SSoT for file-level information and on utility functions or LLM inference for higher-level structural understanding.
- **Dedicated File Operation Helpers**: For complex file interactions within specific generators (like the Roo generator), dedicated helper classes (e.g., `RooFileOpsHelper` in `src/generators/roo-file-ops-helper.ts`) are used to encapsulate file system logic. This improves modularity and separation of concerns within the generator classes.
- **Generators**: Modules in `src/generators` implement the logic for creating specific types of workflow configuration files.
- **Memory Bank**: Modules in `src/memory-bank` handle the generation of contextual documentation or "memory" about the project for use by LLMs.

## 9. Troubleshooting

- **Build failures (`npm run build`)**:
  - **Solution**: Check TypeScript errors (`npm run type-check`) and ESLint errors (`npm run lint`). Ensure all dependencies are installed (`npm install`).
- **Test failures (`npm test`)**:
  - **Solution**: Examine the test output for specific error messages. Use `npm test:watch` to re-run tests automatically as you fix code. Debug failing tests individually.
- **CLI command not found (`roocode`)**:
  - **Solution**: Ensure you have built the project (`npm run build`) and linked the executable if running locally (`npm link` in the project root) or installed it globally (`npm install -g .`). If using `npx`, ensure you are in the project root or specify the path.
- **LLM API Errors**:
  - **Solution**: Verify your `.env` file is correctly configured with the necessary API keys for the selected provider. Check the LLM provider's documentation and your API key status. Enable verbose logging (`--verbose` flag if available, or adjust logger config) to see detailed API request/response information.
- **File System Errors**:
  - **Solution**: Ensure the user running the command has appropriate read/write permissions for the project directory and target output directories. Check for invalid or non-existent paths in your configuration or command arguments.
- **Build Issues Due to Deferred Test Updates (Post TSK-020)**:
  - **Context**: Task TSK-020 (Optimize ProjectContext Structure) significantly refactored core data structures. To enable manual CLI testing of these changes, automated tests (unit and integration) were temporarily excluded from the TypeScript build process via modifications to `tsconfig.json`.
  - **Issue**: If you encounter build failures after pulling recent changes related to TSK-020, or if tests are not running as expected, it might be related to this temporary state.
  - **CRITICAL Follow-up**: A dedicated follow-up task is **required** to:
    1.  Revert the temporary `tsconfig.json` modifications that exclude test files.
    2.  Update all existing unit and integration tests to be compatible with the new minimal `ProjectContext` structure and its associated utility functions.
    3.  Add new tests to cover the refactored logic and ensure adequate test coverage.
  - **Current Status**: Until this follow-up task is completed, full automated testing is not operational for components affected by `ProjectContext` changes.

## 10. Contribution Guidelines

- Follow the Development Workflow outlined above (Section 4).
- Ensure code is well-documented using TSDoc/JSDoc comments for functions, classes, and interfaces.
- Write appropriate tests (Section 6) for new or modified logic.
- For significant changes or new features, it's recommended to open an issue first to discuss the approach.
- Adhere to the established coding standards (Section 5).

## 11. Resources & Contacts

- **Repository**: https://github.com/yourusername/roocode-generator.git
- **Issue Tracker**: https://github.com/yourusername/roocode-generator/issues
- **Key Contacts**:
  - Abdallah Khalil (abdallah@nghive.tech) - Project Author
