# Developer Guide: roocode-generator



## 1. Introduction



Welcome, developer! This guide provides instructions for setting up the development environment, running the project, understanding the codebase, and contributing effectively to roocode-generator.

- **Prerequisites**: Please read the [Project Overview](ProjectOverview.md) and [Technical Architecture](TechnicalArchitecture.md) documents first.

## 2. Getting Started: Setup & Installation



### 2.1. Prerequisites

- **Node.js**: >=16 (as specified in `package.json` under `engines.node`)
- **Package Manager**: npm (as specified in `techStack.packageManager`)
- **Git**: Standard Git installation.
- **Project Build Tools**: The project uses TypeScript Compiler (`tsc`) and `Vite` for building, which are managed as project dependencies.

### 2.2. Cloning the Repository

git clone https://github.com/yourusername/roocode-generator.git
cd roocode-generator

### 2.3. Installing Dependencies



```bash
npm install
```


The project uses `tree-sitter` and specific grammar packages (`tree-sitter-javascript`, `tree-sitter-typescript`). These are typically handled by npm during installation.

### 2.4. Environment Configuration



- Create a `.env` file in the root directory (`.`). (This file is ignored by Git as per `.gitignore`).
- Add necessary API keys or configuration. The project uses `dotenv` to load these variables. Key environment variables for LLM providers include:
  

  ```dotenv
  # Example for LLM Providers:
  ANTHROPIC_API_KEY=your_anthropic_api_key
  GOOGLE_API_KEY=your_google_api_key
  OPENAI_API_KEY=your_openai_api_key
  OPEN_ROUTER_API_KEY=your_open_router_api_key
  # Add other necessary variables as required by the application
  ```
  Refer to `llm.config.json` for LLM provider and model configuration, which might work in conjunction with API keys from environment variables.

### 2.5. Initial Build



```bash
npm run build
```
This command compiles the TypeScript code and bundles the application into the `dist` directory.

### 2.6. Verifying Installation



```bash
# Run the CLI's help command
node bin/roocode-generator.js --help

# Run tests to ensure all components are working correctly
npm test
```

## 3. Project Structure Overview



- `src`: Core source code of the application (TypeScript files).
- `tests`: Automated tests (using Jest). Contains unit and potentially integration tests.
- `docs`: Project documentation, presentations, and reports.
- `templates`: Contains templates used for code generation, including system prompts and memory bank document templates.
- `memory-bank`: Stores generated Memory Bank documents like `ProjectOverview.md`, `TechnicalArchitecture.md`, and `DeveloperGuide.md`.
- `bin`: Executable scripts, including the main CLI entry point `roocode-generator.js`.
- `configFiles`: Various configuration files like `tsconfig.json`, `eslint.config.mjs`, `vite.config.ts`, `jest.config.js`, `llm.config.json` are located in the root directory (`.`).
- `.`: Project root directory.

## 4. Development Workflow

### 4.1. Common Scripts



- `npm run start`: Executes `node bin/roocode-generator.js`. Runs the main CLI application.
- `npm run build`: Executes `npm run clean && vite build`. Cleans the `dist` directory and then builds the project using Vite and the TypeScript Compiler.
- `npm run test`: Executes `jest`. Runs the automated test suite using Jest.
- `npm run test:watch`: Executes `jest --watch`. Runs tests in watch mode.
- `npm run lint`: Executes `eslint . --ext .ts,.js,.mjs --cache`. Lints the codebase using ESLint.
- `npm run lint:fix`: Executes `eslint . --ext .ts,.js,.mjs --cache --fix`. Lints and automatically fixes issues.
- `npm run format`: Executes `prettier --check "src/**/*.{ts,js,mjs,json,md}"`. Checks code formatting using Prettier.
- `npm run format:write`: Executes `prettier --write "src/**/*.{ts,js,mjs,json,md}"`. Formats code using Prettier.
- `npm run style`: Executes `npm run format:write && npm run lint:fix`. A convenience script to format and lint the code.
- `npm run dev`: Executes `vite`. Starts the Vite development server. (Primarily for projects with a web frontend, its utility for this CLI might be specific to certain development tasks).
- `npm run clean`: Executes `rimraf dist`. Removes the `dist` directory.

### 4.2. Branching Strategy



The project generally follows a Gitflow-like branching model:
- **Main branches**:
    - `main`: Represents the latest stable release.
    - `develop`: Integration branch for new features and ongoing development.
- **Feature branches**: `feature/your-feature-name` (branched from `develop`).
- **Bugfix branches**: `fix/your-bug-fix` (branched from `develop` for regular fixes, or `main` for hotfixes if necessary).
- **Release branches**: `release/version-number` (branched from `develop` when preparing for a new release).

### 4.3. Making Changes

1.  Ensure your `develop` branch is up-to-date: `git checkout develop && git pull origin develop`.
2.  Create a feature/fix branch from `develop`: `git checkout -b feature/your-descriptive-name` or `fix/your-descriptive-name`.
3.  Implement your changes.
4.  Ensure the code compiles/builds: `npm run build`.
5.  Write or update tests for your changes in the `tests` directory.
6.  Run linters and formatters: `npm run style` (or `npm run format:write` and `npm run lint:fix` separately).
7.  Ensure all tests pass: `npm test`.
8.  Commit your changes following project conventions (see Section 5: Coding Standards & Conventions, especially commit messages).
9.  Push your branch to the remote repository: `git push origin feature/your-descriptive-name`.
10. Create a Pull Request (PR) against the `develop` branch.

### 4.4. Pull Request (PR) Process



- **Target Branch**: Typically `develop`.
- **Title/Description**: Provide a clear, concise title and a detailed description of the changes, including the "why" and "what".
- **Link to Task/Issue**: If applicable, link the PR to the relevant task or issue in the project's issue tracker.
- **Code Review**: PRs require at least one approval from a team member.
- **CI Checks**: Automated checks (linting, testing, build via `npm run lint`, `npm test`, `npm run build`) must pass. These are usually configured in the CI/CD pipeline (e.g., GitHub Actions).

### 4.5. Debugging



- **Console Logging**: Use `console.log`, `console.debug`, `console.error` strategically. The `LoggerService` (`src/core/services/logger-service.ts`) provides more structured logging.
- **Node.js Debugger**: Utilize the built-in Node.js debugger. You can run scripts with the `--inspect` or `--inspect-brk` flag:
  ```bash
  node --inspect-brk bin/roocode-generator.js [command] [options]
  ```
  Then connect using Chrome DevTools (via `chrome://inspect`) or your IDE's debugger (e.g., VS Code).
- **IDE Debugger**: Configure your IDE (like VS Code) to debug Node.js applications. You might need to create a `launch.json` configuration if one isn't provided.
- **Unit Tests**: Write focused unit tests to isolate and debug specific functions or modules.

## 5. Coding Standards & Conventions



- **Language**: Primarily TypeScript. JavaScript, JSON, Markdown, and HTML are also used.
- **Style Guide**: Adhere to standard TypeScript best practices. ESLint and Prettier enforce specific styles.
- **Linting**:
    - Tools: `ESLint`, `Prettier`.
    - Configuration: `eslint.config.mjs`, `.prettierrc`.
    - Run: `npm run lint` (check) or `npm run lint:fix` (fix).
- **Formatting**:
    - Tool: `Prettier`.
    - Configuration: `.prettierrc`, also integrated into ESLint setup.
    - Run: `npm run format` (check) or `npm run format:write` (fix).
- **Naming Conventions**:
    - `camelCase` for variables, functions, and method names.
    - `PascalCase` for class names, interface names, type aliases, and enums.
    - File names: `kebab-case.ts` or `PascalCase.ts` (check project consistency, `kebab-case` is common for services/modules).
- **Commit Messages**: Follow the Conventional Commits specification. This is enforced by `commitlint` (configured in `commitlint.config.js`). Example: `feat: add user authentication module`.
- **Team Agreement**: (No specific team agreement document found in context. Adhere to general best practices and conventions established in the codebase.)

## 6. Testing



- **Framework**: `Jest` (configured in `jest.config.js`).
- **Location**: Tests are located in the `tests` directory. Mock implementations are found in `tests/__mocks__`.
- **File Naming Convention**: Test files typically follow `*.test.ts` or `*.spec.ts` (e.g., `my-module.test.ts`).
- **Running Tests**:
  - All tests: `npm test`
  - Watch mode (reruns tests on file changes): `npm run test:watch`
  - Coverage report: `npm run test:coverage`
  - Specific file: `npm test -- tests/core/analysis/project-analyzer.test.ts` (replace with actual path)
  - Specific test suite or test name: Use Jest's `-t` flag: `npm test -- -t "My test suite name"`
- **Types of Tests**:
  - **Unit Tests**: Focus on testing individual modules, classes, or functions in isolation. Mocks are heavily used (see `tests/__mocks__`).
  - (Potentially) **Integration Tests**: Testing interactions between different parts of the system.
- **Writing Tests**:
  - Use Jest's BDD-style syntax (`describe`, `it`, `expect`).
  - Aim for clear, descriptive test names.
  - Ensure tests are independent and can run in any order.
  - Mock dependencies where necessary to isolate the unit under test.

## 7. Build & Deployment



- **Build Process**:
  - Command: `npm run build`
  - Tools: Uses `Vite` and the `TypeScript Compiler (tsc)`.
  - Configuration: `vite.config.ts` (for Vite), `tsconfig.json` (for TypeScript).
  - Output: The build process outputs JavaScript files, type definitions, and other assets to the `dist` directory. This directory is included in the `package.json` `files` array for publishing.
- **Deployment**:
  - This project is a CLI tool/library intended to be published to npm.
  - Releases and publishing are automated using `semantic-release`. Configuration for `semantic-release` can be found in `.releaserc.json` and related `devDependencies` in `package.json`.
  - Merges to the `main` branch (or other configured release branches) typically trigger the `semantic-release` process, which analyzes commits, determines the next version, generates a changelog, tags the release, and publishes the package to npm.

## 8. Key Libraries & Concepts



- **`@langchain/*` (e.g., `@langchain/openai`, `@langchain/anthropic`, `@langchain/google-genai`, `@langchain/core`)**: Core libraries for interacting with Large Language Models (LLMs). Used for generating content, analyzing code, etc.
- **`commander`**: A library for building command-line interfaces. Used to define commands, options, and parse arguments for `roocode-generator`.
- **`inquirer`**: Provides interactive command-line user interfaces (prompts, lists, confirmations).
- **`zod`**: A TypeScript-first schema declaration and validation library. Used for validating configurations and LLM responses.
- **`tree-sitter`**: A parser generator tool and an incremental parsing library. Used for parsing source code into Abstract Syntax Trees (ASTs) for detailed code analysis (`src/core/analysis/tree-sitter-parser.service.ts`).
- **`ora`**: Provides elegant terminal spinners for long-running CLI tasks.
- **`chalk`**: Used for styling terminal string output with colors and formatting.
- **`reflect-metadata`**: Used by the custom Dependency Injection (DI) system to manage metadata for injectable classes and their dependencies.
- **Dependency Injection (DI)**: The project uses a custom DI container (`src/core/di`) to manage dependencies between services and components, promoting loose coupling and testability.
- **LLM Abstraction Layer**: Located in `src/core/llm`, this layer provides a consistent interface (`ILLMProvider`, `LLMAgent`) for interacting with different LLM providers (OpenAI, Anthropic, Google GenAI, OpenRouter), abstracting away provider-specific details.
- **Project Analysis Core**: The `src/core/analysis` module is responsible for understanding the target project's structure, tech stack, dependencies, and performing AST-based code analysis. Key components include `ProjectAnalyzer`, `AstAnalysisService`, and `TreeSitterParserService`.
- **Memory Bank**: A central concept (`src/memory-bank`) for generating, storing, and managing comprehensive contextual documents about a software project (e.g., `ProjectOverview.md`, `TechnicalArchitecture.md`).
- **Generators**: Modular components (`src/generators`, `src/core/generators`) responsible for creating specific types of files or configurations based on project context and templates.

## 9. Troubleshooting



- **Issue**: Build failures related to Vite or TypeScript (`npm run build` fails).
  - **Solution**:
    - Check `vite.config.ts` and `tsconfig.json` for misconfigurations.
    - Ensure all dependencies are correctly installed (`npm install`).
    - Clean the `dist` directory (`npm run clean`) and try building again.
    - Look for specific TypeScript errors in the console output.
    - `Tree-sitter` related build issues have occurred historically (see TSK-011, TSK-012); ensure native build tools are available if grammars need local compilation, though pre-built binaries are usually preferred.
- **Issue**: Test failures (`npm test` fails).
  - **Solution**:
    - Run tests for the specific failing file/suite to isolate the issue.
    - Use `console.log` or the debugger within tests.
    - Check mocks in `tests/__mocks__` to ensure they behave as expected.
    - Verify test setup and teardown logic.
- **Issue**: LLM provider errors (e.g., API key issues, model not found, rate limits).
  - **Solution**:
    - Ensure correct API keys are set in your `.env` file and are loaded.
    - Verify the LLM provider and model names in `llm.config.json` are correct and supported.
    - Check the LLM provider's status page for outages.
    - Be mindful of rate limits; wait and retry if necessary.
- **Issue**: Dependency conflicts or installation problems.
  - **Solution**:
    - Remove `node_modules` and `package-lock.json`, then run `npm install` again.
    - Check for peer dependency warnings during installation and address them.
    - Ensure your npm and Node.js versions are compatible with the project requirements.
- **Issue**: File system errors (e.g., permission denied when writing files).
  - **Solution**:
    - Check that the application has write permissions for the target directories.
    - Ensure paths are correctly resolved, especially when dealing with relative paths.

## 10. Contribution Guidelines



- Follow the Development Workflow outlined in Section 4.
- Ensure your code adheres to the Coding Standards & Conventions (Section 5).
- Write clear, well-documented code. Use TSDoc comments for public APIs (classes, methods, functions, types).
- Write comprehensive tests for any new features or bug fixes (Section 6). Aim for good test coverage.
- For significant changes, new features, or architectural modifications, it's recommended to discuss the approach first by creating an issue or discussing with the team.
- Ensure your commits follow the Conventional Commits format.
- Keep Pull Requests focused on a single feature or bug fix.
- Update any relevant documentation in the `docs` directory if your changes affect user guides, architecture, etc.

## 11. Resources & Contacts



- **Repository**: `https://github.com/yourusername/roocode-generator.git`
- **Issue Tracker**: `https://github.com/yourusername/roocode-generator.git/issues`
- **Key Contacts**:
  - Author: Abdallah Khalil `<abdallah@nghive.tech>`
  - (If applicable, list other key team members or points of contact for specific areas of the codebase.)