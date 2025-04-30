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
3.  **Orchestration (`GeneratorOrchestrator`):** For the `generate` command, the handler delegates to `src/core/application/generator-orchestrator.ts`. The `generate` command now implicitly triggers the `ai-magic` generator. The `--generators` flag is used to specify the _type_ of content to generate within `ai-magic`.

    - The `--generators` flag accepts a single value: `memory-bank`, `roo`, or `cursor`.
    - `memory-bank`: Generates documentation and other content for the Memory Bank.
    - `roo`: Generates RooCode rules based on project context.
    - `cursor`: Placeholder for future cursor-based generation functionality.

For a more detailed step-by-step breakdown and diagram, see the **System Design** section in [[TechnicalArchitecture#System-Design]].

### 3. Development Workflow

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
    250 | - **Handling Unexpected API Responses:** When interacting with external APIs, particularly LLM providers, be prepared for responses that may have a successful HTTP status (e.g., 200 OK) but contain an error structure within the response body or an otherwise unexpected format (e.g., missing expected fields like `choices`). Implement checks for these internal error indicators _before_ attempting to parse the expected successful response structure. Log the full, raw response data for any unexpected formats to aid in debugging.
    251 | - **Logging**: Use the `ILogger` service (resolved via DI) for all application logging. Avoid `console.log` in application code (except potentially at the very top level entry point for fatal errors before the logger is available, or within the `LoggerService` implementation itself). Use different log levels (`debug`, `info`, `warn`, `error`) appropriately.
    252 | - **Memory Bank Errors**: Specific errors related to the Memory Bank generator functionality are defined in `src/core/errors/memory-bank-errors.ts`. These extend the base `MemoryBankError` (which extends `RooCodeError`) and provide more specific context:
    253 | - `MemoryBankGenerationError`: Errors during the overall generation process.
    254 | - `MemoryBankTemplateError`: Errors related to loading or processing memory bank templates.
    255 | - `MemoryBankFileError`: Errors during file operations (read/write) within the memory bank context.
    256 | - `MemoryBankValidationError`: Errors during validation steps specific to memory bank content or structure.
    257 | Use these specific errors where applicable to provide clearer diagnostics.
    258 |
    259 | #### Retry Pattern for Transient LLM Errors
    260 |
    261 | For operations interacting with external services, particularly LLM providers, transient errors can occur (e.g., network issues, temporary service unavailability, or malformed responses like a missing `choices` array). To handle these, a retry pattern with exponential backoff is implemented in `ProjectAnalyzer.analyzeProject`.
    262 |
    263 | This pattern involves:
    264 |
    265 | - Catching specific, identifiable transient errors (e.g., `LLMProviderError` with code `INVALID_RESPONSE_FORMAT`).
    266 | - Retrying the operation a predefined number of times.
    267 | - Waiting for an exponentially increasing duration between retries to avoid overwhelming the service.
    268 | - Logging retry attempts and eventual failure or success.
    269 |
    270 | This approach improves the robustness of operations dependent on external services by automatically handling temporary issues.
    271 |
    272 | 257 | - **Commit Messages**: Strictly follow the [Conventional Commits specification](https://www.conventionalcommits.org/). This is enforced by Commitlint via Husky hooks (`commit-msg` hook). Example types: `feat`, `fix`, `refactor`, `perf`, `test`, `build`, `ci`, `docs`, `style`.
    273 | 258 |
    274 | 259 | ### 4.2. Modular DI Registration Pattern
    275 | 260 |
    276 | 261 | To enhance organization and maintainability, the project's custom Dependency Injection (DI) registration logic is modularized. Instead of a single large registration function, dependencies are registered in dedicated module files located under `src/core/di/modules/`.
    277 | 262 |
    278 | 263 | **Key Principles:**
    279 | 264 |
    280 | 265 | - **Separation of Concerns:** Each module file (e.g., `app-module.ts`, `core-module.ts`, `llm-module.ts`, `rules-module.ts`, `memory-bank-module.ts`) contains registration logic specific to its domain, typically using factory functions (`container.registerFactory`) or singleton registration (`container.registerSingleton`).
    281 | 266 | - **Centralized Loading:** The main registration entry point (`src/core/di/registrations.ts`) imports these modules and calls their respective registration functions (`registerCoreModule`, `registerLlmModule`, etc.) within the `registerServices` function. This builds the complete dependency graph for the container.
    282 | 267 | - **Scalability:** This pattern makes it easier to add or modify dependencies for specific features without altering a single, large registration file. New features should ideally have their own registration module.
    283 | 268 |
    284 | 269 | **Example Structure:**
    285 | 270 |
    286 | 271 | `272 |
287 |
288 | 273 | src/
289 | 274 | └── core/
290 | 275 | └── di/
291 | 276 | ├── container.ts # Main Container class
292 | 277 | ├── decorators.ts # @Injectable, @Inject decorators
293 | 278 | ├── errors.ts # DI-specific errors
294 | 279 | ├── index.ts # Barrel file for DI exports
295 | 280 | ├── interfaces.ts # IServiceContainer interface
296 | 281 | ├── types.ts # Core DI types (ServiceLifetime, etc.)
297 | 282 | ├── modules/ # <-- DI Registration Modules
298 | 283 | │ ├── app-module.ts
299 | 284 | │ ├── core-module.ts
300 | 285 | │ ├── llm-module.ts
301 | 286 | │ ├── memory-bank-module.ts
302 | 287 | │ └── rules-module.ts
303 | 288 | └── registrations.ts # Central registration function (imports & calls modules)
304 | 289 |
305 | 290 |` 291 |
    306 | 292 | **Adding New Dependencies:**
    307 | 293 |
    308 | 294 | 1. Identify the appropriate module (e.g.,`core`, `llm`, `rules`, `memory-bank`, or a new feature module).
    309 | 295 | 2. Add the service registration (using `registerSingleton`or`registerFactory`from`@core/di/index.ts`helpers or directly on the container) within that module's registration function (e.g.,`registerCoreModule`).
    310 | 296 | 3. Ensure the module registration function is called within `src/core/di/registrations.ts`.
    311 | 297 | 4. Use `@Inject('YourServiceToken')` in the constructor of classes needing the dependency. Ensure the token used matches the registration token.
    312 | 298 |
    313 | 299 | ### 4.3. Quality and Testing
    314 | 300 |
    315 | 301 | - **Testing Approach**: The project uses **Jest** (`^29.7.0`) as the primary testing framework, configured with `ts-jest` (`^29.3.2`) for seamless TypeScript support (`jest.config.js`). Unit and integration tests are expected to be located in the `tests/`directory, following the naming convention`_.test.ts`. _(Note: While co-location of tests (`src/component/component.test.ts`) is a common practice, the current configuration specifies `tests/\*\*/_.test.ts`. Follow the existing structure unless a migration is planned)._
316 |     302 | - **Coverage Goals**: The project enforces a minimum global coverage threshold of **80%** for branches, functions, lines, and statements, as configured in `jest.config.js` (`coverageThreshold`). Strive to maintain or increase coverage with new contributions.
317 |
318 | - **Memory Bank Service Testing Patterns**: The Memory Bank service (`src/memory-bank/`) follows specific testing patterns:
319 |   - **Service/Component Testing**: Each major component (`MemoryBankService`, `MemoryBankOrchestrator`, `MemoryBankTemplateProcessor`, etc.) has dedicated unit tests.
320 |   - **Mock Dependencies**: Use Jest mocks (`jest.fn()`, `jest.mock()`) extensively for dependencies (LLM, File Operations, Logger, etc.) to isolate service components during unit testing.
321 |   - **Error Handling Tests**: Verify that specific `MemoryBankError`types are returned correctly via`Result.err()`and that errors are logged appropriately.
322 |   - **Success Path Tests**: Ensure the happy path works as expected, returning`Result.ok()`.
323 |   - **Integration Testing**: Test interactions between the `AiMagicGenerator`and the`MemoryBankService`, as well as internal service component interactions (e.g., Service -> Orchestrator -> FileManager). May use real implementations for some services (like FileOperations if testing actual file output) while mocking others (like LLMAgent).
324 |     309 | - **Validation**:
325 |     310 | - **Static Analysis**: Run `npm run lint`to check for code style and potential errors based on`eslint.config.mjs`. Fix all reported issues.
326 |     311 | - **Type Checking**: Run `npm run type-check`(uses`tsc --noEmit`) to ensure type safety based on `tsconfig.json`. Resolve all TypeScript errors.
327 |     312 | - **Running Tests**:
328 |     313 | - Run all tests once:
329 |     314 | `bash
    330 | 315 | npm test
    331 | 316 | `332 |     317 | - Run tests in watch mode during development:
333 |     320 |`bash
    334 | 321 | npm run test:watch
    335 | 322 | `336 |     323 | - Generate test coverage report:
337 |     324 |`bash
    338 | 325 | npm run test:coverage
    339 | 326 | `340 |     327 | - **Check for linting errors:** Runs ESLint based on`eslint.config.mjs`.
341 |     328 | - **Automatically fix linting errors:** Applies ESLint's automatic fixes where possible.
342 |     329 | - **Check code formatting:** Runs Prettier to check if files match the defined style.
343 |     330 | - **Automatically fix formatting:** Runs Prettier to reformat files according to the defined style.
344 |     331 | - **Run all style checks/fixes:** Combines formatting and lint fixing.
345 |     332 | - **Run in development mode:** Builds the project and immediately runs a common generation command (`generate --generators vscode-copilot-rules memory-bank`). Useful for quick testing during development.
346 |     333 | - **Run the CLI directly (after building):** Executes the main CLI entry point using `cross-env`to set`NODE*PATH`for alias resolution. Pass CLI arguments after`--`.
347 |     334 |   Alternatively, run the compiled script directly:
348 |     335 |
349 |     336 | ### 5.2. Build and Deploy
350 |     337 |
351 |     338 | - **Build Process**: Triggered by `npm run build`. Uses `tsc`(TypeScript Compiler) based on`tsconfig.json`to compile`src/\*\*/\*.ts` files into JavaScript (`commonjs`modules) in the`dist/`directory. The`copyfiles -u 1 templates/**/\* dist/templates`script copies template assets from`templates/`to`dist/templates` so they are included in the build output.
    352 | 339 | - **Deployment**: Deployment and package publishing to the npm registry are automated using `semantic-release`. This process typically runs in a CI/CD pipeline (e.g., GitHub Actions) triggered by merges or pushes to the `main` branch.
    353 | 340 | - `semantic-release` analyzes commit messages (following Conventional Commits) since the last release.
    354 | 341 | - It determines the appropriate version bump (patch, minor, major) based on commit types (`fix:`, `feat:`, `BREAKING CHANGE:`).
    355 | 342 | - It generates changelog entries (using `@semantic-release/changelog`).
    356 | 343 | - It commits version bumps and changelog files (`@semantic-release/git`).
    357 | 344 | - It tags the release in Git.
    358 | 345 | - It publishes the package to the npm registry (`@semantic-release/npm`).
    359 | 346 | - It creates a GitHub release (`@semantic-release/github`).
    360 | 347 | - Manual publishing (`npm publish`) is generally discouraged; rely on the automated CI process.
    361 | 348 |
    362 | 349 | ## 6. Working with Rule Templates
    363 | 350 |
    364 | 351 | The Rules Template System (`src/core/templating/`) is central to generating mode-specific rules and documentation, particularly for the `RulesGenerator`.
    365 | 352 |
    366 | 353 | ### 6.1. Template Structure and Syntax
    367 | 354 |
    368 | 355 | - **Location**: Templates are Markdown files located in `templates/rules/[mode]/` (e.g., `templates/rules/architect/base.md`). Customizations can be placed in `templates/rules/[mode]/custom.md`.
    369 | 356 | - **Metadata**: Templates can include YAML front-matter for metadata (e.g., `Mode`, `Version`, `RequiredSections`), parsed by `RulesTemplateManager`.
    370 | 357 | - **Sections**: Templates are divided into logical sections using Markdown headings (`## Section Name`).
    371 | 358 | - **Contextual Rules Marker**: The special marker `{{CONTEXTUAL_RULES}}` is used within a template section. The `TemplateProcessor` replaces this marker with rules generated by the LLM based on the analyzed project context.
    372 | 359 |
    373 | 360 | **Example Template Structure (`templates/rules/architect/base.md`):\*\*
    374 | 361 |
    375 | 362 |`markdown
376 |     363 | ---
377 |     364 | Mode: architect
378 |     365 | Version: 1.0
379 |     366 | RequiredSections: [Overview, Principles] # Example metadata
380 |
381 | ### 5.2.1. Handling Module Compatibility with Vite
382 |
383 | When building a Node.js CLI with Vite, you may encounter compatibility issues with certain dependencies that use different module formats (ES modules vs. CommonJS) or have specific requirements for their environment. This was observed with packages like `ora`, `inquirer`, and `langchain`.
384 |
385 | To address these issues, adjustments may be needed in the `vite.config.ts` file:
386 |
387 | - **`optimizeDeps.exclude`**: For packages that cause issues during Vite's dependency pre-bundling step, add them to the `optimizeDeps.exclude` array. This prevents Vite from trying to pre-bundle them, allowing them to be handled by Rollup during the build.
388 | - **`rollupOptions.external`\*\*: Ensure that Node.js built-ins and external dependencies that should \_not* be bundled into the final output are listed in `rollupOptions.external`. While `rollup-plugin-node-externals` helps, explicitly listing problematic packages here can sometimes resolve issues.
    389 | - **Import Statements**: In some cases, adjusting import statements in your source code (e.g., using dynamic `import()` or specific import paths provided by the package) might be necessary, although configuration adjustments are preferred.
    390 |
    391 | Refer to the `vite.config.ts` file and the specific package documentation for detailed examples and troubleshooting.
    392 | 367 | ---
    393 | 368 |
    394 | 369 | # Architect Mode Base Rules
    395 | 370 |
    396 | 371 | ## Overview
    397 | 372 |
    398 | 373 | Base rules for architectural planning...
    399 | 374 |
    400 | 375 | ## Principles
    401 | 376 |
    402 | 377 | - Principle A
    403 | 378 | - Principle B
    404 | 379 |
    405 | 380 | ## Contextual Guidelines
    406 | 381 |
    407 | 382 | This section will contain guidelines generated based on your project's specific context.
    408 | 383 |
    409 | 384 | {{CONTEXTUAL_RULES}}
    410 | 385 |
    411 | 386 | ## Best Practices
    412 | 387 |
    413 | 388 | Additional best practices...
    414 | 389 | `390 |
415 |     391 | ### 6.2. Developer Usage
416 |     392 |
417 |     393 | Interaction with the template system primarily involves the `IRulesTemplateManager`and`TemplateProcessor`components, resolved via Dependency Injection.
418 |     394 |
419 |     395 | 1. **Loading Base Templates:** Use`IRulesTemplateManager.loadBaseTemplate(mode)`to get the base template content for a specific mode.
420 |     396 | 2. **Loading Customizations:** Use`IRulesTemplateManager.loadCustomizations(mode)`to get customization content (returns empty string if none).
421 |     397 | 3. **Merging Templates:** Use`IRulesTemplateManager.mergeTemplates(baseContent, customContent)`to combine base and custom sections. Custom sections typically override base sections with the same name.
422 |     398 | 4. **Processing with Contextual Rules:** Use`TemplateProcessor.processTemplate(mode, projectContext)`which orchestrates loading, merging, LLM interaction (via`LLMAgent`) to generate rules for the `{{CONTEXTUAL_RULES}}`marker based on`projectContext`, and insertion into the final template string.
423 |     399 |
424 |     400 | (See `src/core/templating/rules-template-manager.ts`and`src/core/templating/template-processor.ts`for implementation details).
425 |     401 |
426 |     402 | ### 6.3. Error Handling
427 |     403 |
428 |     404 | - The template system uses the`Result<T, E>` pattern extensively (`src/core/result/result.ts`).
429 |     405 | - Operations like `loadBaseTemplate`, `loadCustomizations`, `mergeTemplates`, `processTemplate`return`Result`objects.
430 |     406 | - **Always** check the result using`isOk()`or`isErr()`before accessing`.value`or`.error`.
431 |     407 | - Handle potential errors gracefully, typically by logging the error using `ILogger`and potentially providing user feedback via`ICliInterface`or`ProgressIndicator`.
432 |     408 |
433 |     409 | **Example Error Handling Pattern:**
434 |     410 |
435 |     411 |``typescript
436 |     412 | const loadResult = await templateManager.loadBaseTemplate('architect');
437 |     413 | if (loadResult.isErr()) {
438 |     414 | const logger = container.resolve<ILogger>('ILogger').value!; // Resolve logger via DI
439 |     415 | logger.error(`Failed to load base template: ${loadResult.error.message}`, loadResult.error);
440 |     416 | // Propagate error or handle appropriately
441 |     417 | return Result.err(new Error(`Template loading failed: ${loadResult.error.message}`));
442 |     418 | }
443 |     419 | const baseContent = loadResult.value;
444 |     420 | // Proceed with baseContent...
445 |     421 | ``422 |
446 |     423 | ## 7. Troubleshooting
447 |     424 |
448 |     425 | ### 7.1. Common Issues
449 |     426 |
450 |     427 | - **Dependency Injection Errors**: If you encounter errors related to resolving dependencies, double-check:
451 |     428 | - The service is registered in `src/core/di/registrations.ts`(or the relevant module).
452 |     429 | - The token used in`@Inject('YourServiceToken')`exactly matches the registration token.
453 |     430 | - The class is decorated with`@Injectable()`.
454 |     431 | - `Reflect.metadata()` is imported at the application entry point (`bin/roocode-generator.ts`).
455 |     432 | - **TypeScript Errors**: Ensure you run `npm run type-check`regularly. Common issues include:
456 |     433 | - Incorrect type annotations.
457 |     434 | - Missing properties on objects.
458 |     435 | - Incompatible types in function calls.
459 |     436 | - **Linting/Formatting Errors**: Run`npm run lint:fix`and`npm run format:write`to automatically fix most issues. Refer to`eslint.config.mjs`and Prettier config for specific rules.
460 |     437 | - **Test Failures**:
461 |     438 | - Check the test output for specific error messages.
462 |     439 | - Ensure mocks are correctly configured and provide expected return values.
463 |     440 | - Verify that the code under test handles edge cases and error conditions as expected.
464 |     441 | - **LLM API Errors**:
465 |     442 | - Check your API key and ensure you have sufficient credits.
466 |     443 | - Verify the model name is correct and supported by the provider.
467 |     444 | - Review the provider's documentation for specific error codes or messages.
468 |     445 | - Implement retry logic for transient errors (see Section 4.1).
469 |     446 | - **File Operation Errors**:
470 |     447 | - Check file paths for correctness.
471 |     448 | - Ensure necessary directories exist before writing files.
472 |     449 | - Verify file permissions.
473 |     450 | - **Memory Bank Generation Issues**:
474 |     451 | - Ensure templates are correctly formatted Markdown with proper YAML front-matter and section headings.
475 |     452 | - Verify the`{{CONTEXTUAL_RULES}}`marker is present in the template.
476 |     453 | - Check the LLM output for any errors or unexpected content.
477 |     454 | - Review the project context being provided to the`TemplateProcessor`.
478 |     455 | - **Vite Build Issues**: If encountering problems during the build process with Vite, particularly related to module compatibility, refer to Section 5.2.1 and the `vite.config.ts`file.
479 |     456 |
480 |     457 | ### 7.2. Debugging
481 |     458 |
482 |     459 | - **Logging**: Use the`ILogger` service (`logger.debug`, `logger.info`, etc.) to output information during execution.
483 |     460 | - **Debugger**: Use your IDE's debugger (e.g., VS Code's Node.js debugger) to step through code execution, inspect variables, and set breakpoints.
484 |     461 | - **Error Stacks**: Analyze error stack traces to pinpoint the source of errors.
485 |     462 | - **Raw API Responses**: Log raw API responses when troubleshooting external service integrations to understand the exact data being received.
486 |     463 |
487 |     464 | ## 8. Contributing
488 |     465 |
489 |     466 | Contributions are welcome! Please follow the development workflow outlined in Section 3 and the code guidelines in Section 4.
490 |     467 |
491 |     468 | 1. Fork the repository.
492 |     469 | 2. Create a feature branch (`git checkout -b feat/your-feature`).
493 |     470 | 3. Implement your changes and write tests.
494 |     471 | 4. Commit your changes using Conventional Commits (`git commit -m "feat: add new feature"`).
495 |     472 | 5. Push to your fork (`git push origin feat/your-feature`).
496 |     473 | 6. Create a Pull Request to the main repository's `main`branch.
497 |     474 | 7. Address any feedback during code review.
498 |     475 |
499 |     476 | ## 9. License
500 |     477 |
501 |     478 | This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
502 |     479 |
503 |     480 | ## 10. Security
504 |     481 |
505 |     482 | Please see the [SECURITY.md](SECURITY.md) file for details on how to report security vulnerabilities.
506 |     483 |
507 |     484 | ## 11. Changelog
508 |     485 |
509 |     486 | See the [CHANGELOG.md](CHANGELOG.md) file for a history of changes.
510 |     487 |
511 |     488 | ## 12. Project Status
512 |     489 |
513 |     490 | The project is currently under active development.
514 |     491 |
515 |     492 | ---
516 |     493 |
517 |     494 | **Document Version History:**
518 |     495 |
519 |     496 | - **Version 1.1.0 (2024-08-28):** Added sections on Modular DI Registration Pattern, Memory Bank Service Testing Patterns, and Handling Module Compatibility with Vite. Updated sections on Project Structure, Command Execution Flow, and Common Operations to reflect the new`ai-magic`generator and simplified`--generators`flag. Clarified interface naming conventions.
520 |     497 | - **Version 1.0.0 (2024-07-25):** Initial version covering basic setup, structure, workflow, and guidelines.
521 |     498 |
522 |     499 | ---
523 |     500 |
524 |     501 | **Memory Bank References:**
525 |     502 |
526 |     503 | The following information from memory bank files informed this document:
527 |     504 |
528 |     505 | 1. From ProjectOverview.md:
529 |     506 |    - Project goals and scope.
530 |     507 |    - Key features and their status.
531 |     508 |
532 |     509 | 2. From TechnicalArchitecture.md:
533 |     510 |    - Overall system architecture.
534 |     511 |    - Design patterns used (DI, Result).
535 |     512 |    - Component interactions (CLI, ApplicationContainer, Generators, LLM).
536 |     513 |
537 |     514 | 3. From DeveloperGuide.md:
538 |     515 |    - Existing development practices and standards.
539 |     516 |    - Existing documentation structure.
540 |     517 |
541 |     518 | ---
542 |     519 |
543 |     520 | **Generated Content:**
544 |     521 |
545 |     522 | This document was generated by the RooCode Generator's`ai-magic`generator using the`memory-bank` option.
    546 | 523 |
    547 | 524 | ---
    548 | 525 |
    549 | 526 | **Disclaimer:**
    550 | 527 |
    551 | 528 | This document is automatically generated based on the project's codebase and existing documentation. While efforts are made to ensure accuracy, it may not always be perfectly up-to-date or complete. Always refer to the source code and consult with team members for definitive information.
    552 | 529
