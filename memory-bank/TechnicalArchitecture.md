---
title: Technical Architecture
version: 1.0.1
lastUpdated: 2025-05-02
documentStatus: Final
author: Software Architect AI
---

# Technical Architecture: roocode-generator

## 1. Overview

`roocode-generator` is a command-line interface (CLI) tool built with Node.js and TypeScript. Its primary purpose is to generate RooCode workflow configuration files and associated documentation (`memory-bank` files) tailored to different project contexts and technology stacks. The architecture emphasizes modularity, extensibility, and leverages Large Language Models (LLMs) via Langchain for intelligent content generation.

The system operates as a local CLI application, parsing user commands, orchestrating various generator modules, interacting with the local filesystem, and potentially external LLM APIs to produce configuration and documentation files within the target project's directory structure (typically under a `.roo` folder).

This document outlines the system's design, core components, technology stack, data flow, and key technical decisions.

See [Project Overview](./ProjectOverview.md) for high-level project goals and features.

## 2. System Design

The application follows a **Modular CLI Architecture with LLM Integration**. The core flow is as follows:

1.  **Initialization:** The CLI entry point (`bin/roocode-generator.js`) launches the bundled application located at `dist/roocode-generator.js`. This bundled file's execution begins in `src/core/cli/cli-main.ts`, which sets up module aliasing (`module-alias`), environment variables (`dotenv`), and Reflect Metadata (`reflect-metadata`) for decorators. It then initializes a custom Dependency Injection (DI) container (`@core/di/container.ts`).
2.  **DI Registration:** Services are registered in a modular fashion using registration functions (e.g., `registerCoreModule`, `registerLlmModule`, etc. defined in `@core/di/modules/*`) invoked by a central `registerServices` function (`@core/di/registrations.ts`).
3.  **Application Bootstrap:** The main `ApplicationContainer` (`@core/application/application-container.ts`) is resolved from the DI container.
4.  **Command Parsing (`CliInterface`):** The `ApplicationContainer` resolves the `CliInterface` (`@core/cli/cli-interface.ts`). The `CliInterface` uses the `commander` library to define commands (`generate`, `config`, etc.) and parse `process.argv`. Action callbacks capture the parsed command name and options into the `CliInterface` instance's `parsedArgs`.
5.  **Configuration Loading:** Relevant configuration services (`ProjectConfigService`, `LLMConfigService`) load project-specific (`roocode-config.json`) and LLM (`llm.config.json`) settings, respectively.
6.  **Command Routing (`ApplicationContainer`):** The `ApplicationContainer` retrieves the parsed command and options from the `CliInterface`. Its `executeCommand` method acts as a router, using a `switch` statement on the command name to delegate to specific handler methods (e.g., `executeGenerateCommand`, `executeConfigCommand`).
7.  **Generate Command Execution (`ApplicationContainer` & `GeneratorOrchestrator`):** When `executeGenerateCommand` is called, it resolves the `GeneratorOrchestrator` (`@core/application/generator-orchestrator.ts`). The `generate` command now implicitly triggers the `AiMagicGenerator`. The `ApplicationContainer` passes the parsed options, including the `generatorType` value from the `--generators` flag, to the `GeneratorOrchestrator`, which in turn passes them to the `AiMagicGenerator`.
8.  **AiMagicGenerator Execution and Internal Routing:** The `AiMagicGenerator` (`@generators/ai-magic-generator.ts`) receives the `generatorType` (e.g., `memory-bank`, `roo`, `cursor`) from the options. It then routes the execution to the corresponding internal generation logic:
    - If `generatorType` is `memory-bank`: It calls the `MemoryBankService` (`@memory-bank/memory-bank-service.ts`) to generate documentation.
    - If `generatorType` is `roo`: It executes the logic for generating RooCode rules (using `ProjectAnalyzer`, `TemplateProcessor`, `LLMAgent`, etc.).
    - If `generatorType` is `cursor`: It executes a placeholder for future cursor-based generation.
    - **Project Analysis:** Regardless of the `generatorType`, `AiMagicGenerator` may use the `ProjectAnalyzer` (`@core/analysis/project-analyzer.ts`) to analyze the project context (tech stack, structure, dependencies) via `FileOperations` and potentially `LLMAgent`.
    - **File Operations:** The specific generation logic within `AiMagicGenerator` (or the services it calls, like `MemoryBankService`) uses the `FileOperations` service (`@core/file-operations/file-operations.ts`) to write the generated files.
9.  **User Feedback:** Throughout the process, `ProgressIndicator` (`ora`) and `LoggerService` (`chalk`) provide feedback to the user via the terminal.
10. **Completion/Error Handling:** The application uses a `Result` type (`@core/result/result.ts`) for explicit success/failure handling. The main `run` method manages the overall result, and top-level error handling catches unexpected issues, exiting with appropriate status codes.

### 2.1. Architecture Diagram

```mermaid
graph TD
    subgraph User Interaction
        A[User] -- Runs CLI --> B(CLI Entry Point `bin/roocode-generator.js`);
    end

    subgraph Core Application
        B -- Initializes --> C(DI Container `@core/di/container.ts`);
        C -- Registers --> D(Services / Modules `@core/di/modules/*`);
        B -- Resolves & Runs --> E(ApplicationContainer `@core/application/application-container.ts`);
        E -- Uses --> F(CliInterface `@core/cli/cli-interface.ts`);
        F -- Parses Args (`--generate`, `--generators <type>`) --> E;
        E -- Routes `generate` command --> G(GeneratorOrchestrator `@core/application/generator-orchestrator.ts`);
        E -- Passes `generatorType` value --> G;
        E -- Uses --> H(Config Services `@core/config/*`);
        E -- Uses --> I(LoggerService `@core/services/logger-service.ts`);
        E -- Uses --> J(ProgressIndicator `@core/ui/progress-indicator.ts`);
    end

    subgraph Generators [Generator Execution Flow]
        G -- Resolves & Executes --> K(AiMagicGenerator `@generators/ai-magic-generator.ts`);
        K -- Receives `generatorType` value --> K;
        K -- Routes based on `generatorType` --> L{Specific Generation Logic};
        L(Memory Bank) -- Uses --> MB_Service(MemoryBankService `@memory-bank/memory-bank-service.ts`);
        L(Roo / Rules) -- Uses --> Rules_Logic(Rules Generation Logic);
        L(Cursor) -- Executes --> Cursor_Placeholder(Cursor Placeholder Logic);
        K -- Uses --> P(ProjectAnalyzer `@core/analysis/project-analyzer.ts`);
        P, Rules_Logic, MB_Service -- Use --> O(LLMAgent `@core/llm/llm-agent.ts`);
        O -- Uses --> Q(LLMProviderRegistry `@core/llm/provider-registry.ts`);
        Q -- Uses --> H;
        Q -- Creates --> R[LLM Providers (Langchain) `@core/llm/llm-provider.ts`];
        R -- Calls --> S[External LLM APIs];
        Rules_Logic, MB_Service -- Use --> T(FileOperations `@core/file-operations/file-operations.ts`);
        T -- Interacts --> U[Filesystem];
    end

    subgraph Output
        E -- Displays --> V[Terminal Output];
        I -- Logs --> V;
        J -- Shows Progress --> V;
    end

    style Core Application fill:#f9f,stroke:#333,stroke-width:2px
    style Generators fill:#ccf,stroke:#333,stroke-width:2px
```

_Diagram showing the initialization, command handling, and generator execution flow, including DI, LLM interaction, and file operations. The `generate` command now implicitly routes to `AiMagicGenerator`, which handles internal routing based on the `--generators` flag._

## 3. Core Components

- **`@core/di` (Dependency Injection):** Custom lightweight DI container (`Container`) managing service registration (modular via `registerServices` and `modules/*`) and resolution (`resolveDependency`). Uses `reflect-metadata` and decorators (`@Injectable`, `@Inject`).
- **`@core/application` (Application Core):**
  - `ApplicationContainer`: Orchestrates the main application lifecycle, command routing (`generate`, `config`), and top-level workflow execution. Routes the `generate` command to the `GeneratorOrchestrator`.
  - `GeneratorOrchestrator`: Resolves and executes the primary `AiMagicGenerator`, passing parsed options including `generatorType`. Manages registration/execution of other generators if needed.
  - `IProjectManager` (Stub): Placeholder for potential future project-level state management.
  - `interfaces.ts`: Defines core application service contracts (`IGeneratorOrchestrator`, `IProjectManager`, `ICliInterface`).
- **`@core/cli` (Command Line Interface):**
  - `cli-main.ts`: The primary bootstrap file for the bundled CLI. It is the execution entry point after the `bin/roocode-generator.js` launcher script requires the bundled file. It is responsible for setting up the environment, initializing the DI container, and starting the CLI command parsing and execution flow. The Vite build is configured to use this file as the main entry point (`vite.config.ts:build.lib.entry`).
  - `CliInterface`: Handles command-line argument parsing (`commander`), including the `--generate` command and the associated `--generators <type>` flag. It performs manual validation of the `--generators` type value. It also handles interactive prompts (`inquirer`) and basic console output formatting (`chalk`).
- **`@core/config` (Configuration Management):**
  - `LLMConfigService`: Manages loading, saving, validation, and interactive editing of LLM settings (`llm.config.json`). Now depends on `IModelListerService` for interactive model selection.
  - `ProjectConfigService`: Manages loading and validation of project settings (`roocode-config.config.json`).
- **`@core/llm` (LLM Interaction):**
  - `LLMAgent`: Central point for interacting with LLMs, orchestrating analysis or completion tasks. Uses the `LLMProviderRegistry` to get the configured provider.
  - `LLMProviderRegistry`: Dynamically loads and caches the configured LLM provider (`openai`, `google-genai`, `anthropic`) based on `llm.config.json`. Uses registered provider factories.
  - `ModelListerService`: Provides a list of available LLM models, used by `LLMConfigService` for interactive configuration. Depends on `LLMProviderRegistry` to get the list of supported models.
  - `LLMProvider` (Implementations: `OpenAILLMProvider`, `GoogleGenAILLMProvider`, `AnthropicLLMProvider`): Adapters for specific LLM services using `langchain` clients (`@langchain/*`).
- **`@core/generators` (Base Generator Logic):**
  - `BaseGenerator`: Abstract class providing common structure (`name`, `generate`, `validate`, `executeGeneration`) and lifecycle (`initialize`, `validateDependencies`) for all generators. Inherits from `BaseService`.
  - `IGenerator`: Interface defining the contract for generator modules.
- **`@generators` (Specific Generators):** Modules implementing `IGenerator` for specific tasks:
  - `AiMagicGenerator`: The primary generator for LLM-driven content. It is implicitly triggered by the `generate` command. It receives the `generatorType` value from the `--generators` flag and routes execution to the appropriate internal logic for generating memory bank content, RooCode rules, or executing the cursor placeholder. It utilizes `ProjectAnalyzer`, `LLMAgent`, and other services for these tasks.
  - `RulesGenerator`: (Legacy) Generates coding standard rules based on project analysis and templates. Its core functionality is now integrated into `AiMagicGenerator`. Includes sub-components like `IRulesFileManager`, `IRulesContentProcessor`, `IRulesPromptBuilder`.
  - `IRulesFileManager`: Manages saving the generated single Markdown rules file to `.roo/rules-code/rules.md`.
  - `SystemPromptsGenerator`, `RoomodesGenerator`, `VSCodeCopilotRulesGenerator`: Simpler generators creating specific configuration files, often using the core `TemplateManager`.
- **`@memory-bank` (Memory Bank Service & Components):** Contains the logic refactored from the original `MemoryBankGenerator`.
  - `MemoryBankService`: A dedicated service invoked by `AiMagicGenerator` (when `generatorType` is `memory-bank`) to handle the generation of memory bank documentation (`ProjectOverview.md`, `DeveloperGuide.md`, `TechnicalArchitecture.md`). It orchestrates the process using the components below.
  - `MemoryBankOrchestrator`: Coordinates the generation steps within the service.
  - `IProjectContextService`: Gathers project context (used by `AiMagicGenerator` before calling the service).
  - `IMemoryBankTemplateManager`: Loads memory bank specific templates.
  - `IMemoryBankTemplateProcessor`: Processes templates with context.
  - `IPromptBuilder`: Constructs prompts for the LLM.
  - `IMemoryBankContentGenerator`: Generates content using `LLMAgent`.
  - `IMemoryBankFileManager`: Manages memory bank file I/O via `FileOperations`.
  - `IMemoryBankValidator`: Validates generated files.
  - `IContentProcessor`: Post-processes LLM output.
- **`@core/analysis` (Project Analysis):**
  - `ProjectAnalyzer`: Uses `FileOperations` to gather file information, `TreeSitterParserService` to generate generic Abstract Syntax Trees (ASTs) for supported source files, and potentially `LLMAgent` to analyze project structure, tech stack, and dependencies. The results, including the AST data, are compiled into the `ProjectContext`. The generation of the `ProjectContext.structure.directoryTree` component now explicitly excludes directories listed in `SKIP_DIRECTORIES` and hidden directories (names starting with a `.`) to ensure a more accurate and lean representation of the project structure.
  - `ResponseParser`: Parses JSON responses from the LLM during analysis (if LLM analysis is used).
  - `types.ts`: Defines interfaces for analysis results (`ProjectContext` including the `astData` field, `GenericAstNode`, `TechStackAnalysis`, etc.).
- **`@core/templating` (Template System - Rules Specific):**
  - `RulesTemplateManager`: Loads, merges, and validates Markdown-based rule templates (`base.md`, `custom.md`) and customizations for specific modes.
  - `TemplateProcessor`: Integrates LLM-generated contextual rules (`{{CONTEXTUAL_RULES}}`) into merged rule templates.
- **`@core/template-manager` (Generic Template Engine):**
  - `TemplateManager`, `Template`: Basic engine for loading and processing simple placeholder-based templates (e.g., system prompts). Handles basic metadata parsing.
- **`@core/file-operations` (Filesystem Interaction):**
  - `FileOperations`: Provides abstracted, error-handled file system operations (read, write, exists, readDir, createDirectory, copyDirectoryRecursive, etc.) using Node.js `fs.promises` and the `Result` pattern.
  - `errors.ts`: Defines specific file operation error types (`FileNotFoundError`, `DirectoryCreationError`, etc.).
- **`@core/result` (Error Handling):**
  - `Result`: A type-safe generic class implementing the Result pattern (`Ok` or `Err`) for explicit success/failure handling across the application.
- **`@core/errors` (Core Errors):** Defines base `RooCodeError` and specific semantic error types (`ValidationError`, `ConfigurationError`, `GeneratorError`, `TemplateError`, `MemoryBankError` hierarchy) for consistent error reporting with context.
- **`@core/services` (Utility Services):**
  - `LoggerService`: Basic console logging implementation (`ILogger`) using `console`.
  - `BaseService`: Base class for services, providing DI container access and dependency validation structure.
- **`@core/ui` (User Interface Elements):**
  - `ProgressIndicator`: Wrapper around `ora` for displaying spinners during long operations.
- **`@types` (Shared Types):** Contains core shared interfaces like `ProjectConfig`, `LLMConfig`, `AnalysisResult`.

## 4. Technology Stack

### 4.1. Primary Stack {#Stack}

- **Runtime Environment**: Node.js (>=16 specified in `package.json`)
- **Language**: TypeScript (v5.8.3 specified)
- **Package Manager**: npm (indicated by `package-lock.json`)
- **Module System**: CommonJS (specified in `tsconfig.json` `module`, used by `require` in entry point)

### 4.2. Key Libraries & Frameworks

- **CLI Framework**: `commander` (argument parsing), `inquirer` (interactive prompts)
- **LLM Interaction**: `langchain`, `@langchain/openai`, `@langchain/google-genai`, `@langchain/anthropic` (abstraction layer for LLM APIs)
- **DI Container**: Custom implementation (`@core/di`) using `reflect-metadata`
- **Environment Variables**: `dotenv`
- **Module Aliasing**: `module-alias`
- **Utility**: `chalk` (terminal styling), `ora` (spinners), `date-fns` (date formatting)
- **Testing**: `jest`, `ts-jest`, `@jest/globals`
- **Code Quality**: `eslint` (with `@typescript-eslint`), `prettier`, `@commitlint/cli`, `husky` (git hooks)
- **Build**: `typescript` (tsc), `copyfiles` (copying non-TS assets like templates)

### 4.3. Infrastructure

- **Execution Environment**: User's Local Machine (as a CLI tool)
- **Distribution**: npm Registry
- **CI/CD**: GitHub Actions (implied by use of `@semantic-release/github`), `semantic-release` for automated versioning and publishing based on conventional commits.
- **Version Control**: Git

## 5. Integration and Data Flow

### 5.1. External Services

- **LLM APIs**: Interacts securely (HTTPS) with external APIs (OpenAI, Google GenAI, Anthropic) via the `langchain` library. Communication is managed by specific `LLMProvider` implementations and configured through `llm.config.json` or environment variables (`dotenv`). Requires API keys.

### 5.2. Internal Integration

- **Dependency Injection:** Core components are loosely coupled. The custom DI container (`@core/di/container.ts`) manages service instantiation and injection. Services are registered centrally in modules (`@core/di/modules/*`) and resolved using string tokens. Factories (`registerFactory`) are commonly used, allowing dependencies to be resolved within the factory function.
- **Result Pattern:** The `Result<T, E>` class (`@core/result/result.ts`) is used extensively for robust, explicit error handling, promoting predictable control flow over exception-based handling for expected failures (e.g., file not found, API errors).
- **Modular Generators:** The `GeneratorOrchestrator` dynamically loads and executes `IGenerator` implementations based on CLI input, allowing for easy addition or removal of generators.

### 5.3. Data Flow (Example: `--generate --generators [type]`)

1.  **User Input:** `roocode-generator --generate --generators memory-bank` (or `roo`, `cursor`)
2.  **CLI Parsing (`CliInterface`):** Command `generate`, options `{ generators: ['memory-bank'] }` identified.
3.  **Application Routing (`ApplicationContainer`):** Routes to `executeGenerateCommand`.
4.  **Orchestration (`GeneratorOrchestrator`):**
    - Resolves `AiMagicGenerator` using its registered token ('ai-magic').
    - Loads `ProjectConfig` using `ProjectConfigService`.
5.  **AiMagicGenerator Execution:**
    - Calls `ProjectAnalyzer.analyzeProject` (using `FileOperations`, `TreeSitterParserService`, potentially `LLMAgent`) to get `ProjectContext` using `config.baseDir` as context path. This includes generating generic AST data for supported files and storing it in the `astData` field of the `ProjectContext`.
    - **Rules Generation:** Uses internal logic (e.g., `RulesPromptBuilder`, `TemplateProcessor`, `LLMAgent`) to generate rules content.
    - Calls `IRulesFileManager.saveRulesFile` (using `FileOperations`) to write `.roo/rules-code/rules.md`.
    - **Memory Bank Service Call:** Calls `MemoryBankService.generateMemoryBank(projectContext)`.
6.  **MemoryBankService Execution:**
    - `MemoryBankOrchestrator` iterates through `MemoryBankFileType`s.
    - For each file type:
      - Calls `IMemoryBankTemplateProcessor.loadAndProcessTemplate`.
      - Calls `IMemoryBankContentGenerator.generateContent` (uses `IPromptBuilder`, `LLMAgent`).
      - Calls `IMemoryBankFileManager.writeMemoryBankFile` (uses `FileOperations`) to save the generated `.md` file.
    - Calls `IMemoryBankFileManager.copyDirectoryRecursive` (uses `FileOperations`) to copy template files.
7.  **Feedback (`ProgressIndicator`, `LoggerService`):** Updates displayed in the terminal.
8.  **Completion (`ApplicationContainer`):** Receives `Result.ok` from the command execution, exits with code 0. If any step returns `Result.err`, the error is propagated up, logged, and the process exits with code 1.

## 6. Key Technical Decisions

- **Custom DI Container:** Provides fine-grained control over dependency lifecycle and resolution without heavy external libraries, leveraging `reflect-metadata` for decorator-based injection. Modular registration (`modules/*.ts`) enhances organization.
- **Modular Generator Architecture:** Using the `IGenerator` interface and `GeneratorOrchestrator` allows for easy extension by adding new generator classes and registering them in the DI container (typically within a dedicated module like `app-module.ts`).
- **LLM Abstraction (`langchain` & Custom Registry):** `langchain` simplifies interaction with diverse LLM APIs. The custom `LLMProviderRegistry` adds a dynamic selection layer based on configuration, decoupling core logic from specific LLM implementations.
- **Result Pattern for Error Handling:** Enforces explicit, type-safe handling of expected errors (e.g., file I/O, API calls, validation failures), improving code robustness and predictability compared to relying solely on try/catch blocks for all failure scenarios. Custom error types (`RooCodeError`, `MemoryBankError`, `FileOperationError`, etc.) provide semantic context.
- **Retry Mechanism for Transient Errors:** Implemented a retry pattern with exponential backoff, particularly in `ProjectAnalyzer`, to handle transient errors from external services like LLM APIs (e.g., `INVALID_RESPONSE_FORMAT`). This enhances system resilience and reliability when interacting with potentially unstable external dependencies.

- **TypeScript:** Enables static typing, improving code quality, maintainability, refactoring safety, and developer tooling support. Strict mode is enabled (`tsconfig.json`).
- **Feature-Based Folder Structure (with Core Separation):** Organizes code primarily by feature (`generators`, `memory-bank`) alongside a central `core` directory containing shared framework-level components, aiming for logical cohesion and separation of concerns.
- **Automated Release (`semantic-release`):** Standardizes versioning, changelog generation, and npm publishing based on Conventional Commits, reducing manual release effort and ensuring consistency.
- **Code Quality Tooling (`eslint`, `prettier`, `commitlint`, `husky`):** Enforces consistent code style, formatting, and commit message standards automatically via Git hooks, improving code quality and maintainability across the team.
- **Module Aliasing (`module-alias`, `tsconfig.json` paths):** Simplifies internal imports (e.g., `@core`, `@generators`) and maps them to the compiled `dist` directory at runtime, improving readability.
- **Handling Module Compatibility (ESM/CJS Interop with Vite):** Addressed runtime compatibility issues with certain dependencies (e.g., `ora`, `inquirer`, `langchain`) when bundled with Vite for a Node.js environment. This involved adjusting import statements in source files and configuring Vite's `optimizeDeps.exclude` and Rollup's `external` options to ensure correct handling of module formats during the build process.

## 7. Development Guidelines

Refer to [Developer Guide](./DeveloperGuide.md) for detailed setup, workflow, and coding standards. Key points include:

- **Standards:** TypeScript (strict mode), ESLint (`@typescript-eslint`), Prettier, Conventional Commits.
- **Workflow:** Trunk-Based Development with short-lived feature branches for significant changes. Automated checks via Husky hooks (lint, format, test). Pull Requests with code review are standard.
- **Modularity:** Emphasized through DI (using `@Injectable`, `@Inject`, modular registration), the Generator pattern (`BaseGenerator`, `IGenerator`), and service-based design.
- **Error Handling:** Consistent use of the `Result` type for predictable failures. Define specific error types extending `RooCodeError` or `FileOperationError` for semantic clarity. Use `try...catch` for unexpected runtime errors, primarily at higher application levels. Log errors using `ILogger`.
- **Testing:** Jest with `ts-jest`. Aim for high coverage (>=80%). Tests are currently in `/tests`; the plan for co-location has been abandoned. Mocks are used for isolating units (e.g., mocking `IFileOperations`, `LLMAgent`).

## 8. Security Considerations

- **API Key Management:** LLM API keys are sensitive. They are loaded via `dotenv` from a `.env` file (which must be gitignored) and managed by `LLMConfigService`. Users must secure their `.env` file. API keys should never be hardcoded or committed. CI/CD environments require secure secret management.
- **Dependency Security:** Standard practices like `npm audit` and keeping dependencies updated are necessary. `package-lock.json` ensures deterministic installs.
- **File System Access:** The `FileOperations` service interacts with the local filesystem. While primarily a developer tool, path validation (`validatePath`) provides basic protection. Generated files are typically written within the project directory (e.g., `.roo/`, `memory-bank/`), minimizing risk outside the project scope. Care should be taken if user input influences output paths.
- **LLM Interaction:** Prompts constructed from project files could potentially send sensitive source code snippets to external LLM APIs if not managed carefully (e.g., during project analysis). The `ProjectAnalyzer` currently excludes common sensitive directories (`.git`, `node_modules`, `dist`, `coverage`). Users should be aware of what context is being sent.

## 9. Testing Strategy Overview

- **Framework:** Jest with `ts-jest` for TypeScript support.
- **Location:** Tests currently reside in a top-level `tests/` directory, mirroring the `src/` structure (e.g., `tests/core/config/project-config.service.test.ts`). The plan to co-locate tests with source files has been abandoned.
- **Coverage:** Target of 80% global coverage (branches, functions, lines, statements) enforced via `jest.config.js`. Coverage reports generated via `npm run test:coverage`.
- **Types:**
  - **Unit Tests:** Focus on individual classes/functions, mocking dependencies (`IFileOperations`, `ILogger`, `LLMAgent`, etc.) using `jest.fn()` and `jest.mock()`. Examples provided for Memory Bank components show extensive unit testing.
  - **Integration Tests:** Test interactions between components, particularly DI resolution and service collaborations (e.g., `FileOperations.di.test.ts`).
- **CI:** Tests are run automatically as part of the CI/CD pipeline (implied by `semantic-release` setup and standard practice).
- **Status:** Context indicates some tests might have been skipped or failing during development/refactoring, highlighting the importance of maintaining the test suite.

Refer to [Developer Guide - Quality and Testing](./DeveloperGuide.md#quality-and-testing) for detailed testing practices and patterns.

---
