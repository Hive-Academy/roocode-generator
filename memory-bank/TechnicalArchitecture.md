Okay, Roo Architect is ready. Here is the Technical Architecture document based on the provided context.

```markdown
---
title: Technical Architecture
version: 1.1.0
lastUpdated: 2024-08-15 # Replace with current date
type: core-documentation
category: architecture
---

# Technical Architecture

## 1. Overview

`roocode-generator` is a command-line interface (CLI) tool built with Node.js and TypeScript. Its primary purpose is to generate RooCode workflow configuration files and associated documentation (`memory-bank` files) tailored to different project contexts and technology stacks. The architecture emphasizes modularity, extensibility, and leverages Large Language Models (LLMs) via Langchain for intelligent content generation.

This document outlines the system's design, core components, technology stack, data flow, and key technical decisions. It serves as a guide for understanding the internal structure and development principles of the `roocode-generator`.

See [[ProjectOverview]] for high-level project goals and features.

## 2. System Design

The application follows a **Modular CLI Architecture with LLM Integration**. It operates as follows:

1.  **Initialization:** The CLI entry point (`bin/roocode-generator.js`) sets up module aliasing, environment variables (`dotenv`), and Reflect Metadata for decorators. It then initializes a custom Dependency Injection (DI) container (`@core/di`).
2.  **DI Registration:** Services are registered in a modular fashion (`@core/di/modules/*`) within the container.
3.  **Application Bootstrap:** The main `ApplicationContainer` is resolved from the DI container.
4.  **Command Parsing:** The `ApplicationContainer` uses a dedicated `CliInterface` (built with `commander` and `inquirer`) to parse command-line arguments (`generate`, `config`) and options.
5.  **Configuration Loading:** Relevant configuration services (`ProjectConfigService`, `LLMConfigService`) load project-specific (`roocode-config.json`) and LLM (`llm.config.json`) settings.
6.  **Command Execution:** The `ApplicationContainer` routes the parsed command to the appropriate handler:
    *   `config`: Manages LLM settings, potentially interactively.
    *   `generate`: Orchestrates the execution of selected generator modules via the `GeneratorOrchestrator`.
7.  **Generator Orchestration:** The `GeneratorOrchestrator` resolves the requested `IGenerator` instances (e.g., `MemoryBankGenerator`, `RulesGenerator`, `SystemPromptsGenerator`).
8.  **Generation Process (varies by generator):**
    *   **Context Gathering:** Generators like `MemoryBankGenerator` or `RulesGenerator` may use the `ProjectAnalyzer` (which uses `LLMAgent`) to analyze the project context (tech stack, structure, dependencies).
    *   **Template Processing:** Generators may load and process templates (`TemplateManager`, `RulesTemplateManager`, `TemplateProcessor`). This might involve merging base templates with customizations and inserting LLM-generated content (e.g., contextual rules).
    *   **LLM Interaction:** The `LLMAgent` interacts with the configured LLM provider (via `LLMProviderRegistry` and `langchain`) to generate content based on prompts constructed from project context and templates.
    *   **File Operations:** Generators use the `FileOperations` service to write the generated files to the filesystem, potentially managing versions (`RulesFileManager`).
9.  **User Feedback:** Throughout the process, `ProgressIndicator` (`ora`) and `LoggerService` (`chalk`) provide feedback to the user via the terminal.
10. **Completion/Error Handling:** The application exits with appropriate status codes based on the `Result` of the main workflow. Top-level error handling catches unexpected issues.

### 2.1. Architecture Diagram

```mermaid
graph TD
    subgraph User Interaction
        A[User] -- Runs CLI --> B(CLI Entry Point);
    end

    subgraph Core Application
        B -- Initializes --> C(DI Container);
        C -- Registers --> D(Services / Modules);
        B -- Resolves & Runs --> E(ApplicationContainer);
        E -- Uses --> F(CliInterface);
        F -- Parses Args --> E;
        E -- Uses --> G(GeneratorOrchestrator);
        E -- Uses --> H(Config Services);
        E -- Uses --> I(LoggerService);
        E -- Uses --> J(ProgressIndicator);
    end

    subgraph Generators [Generator Execution Flow]
        G -- Executes --> K{Specific Generator (IGenerator)};
        K -- Uses --> H;
        K -- Uses --> L(ProjectAnalyzer);
        K -- Uses --> M(TemplateProcessor);
        K -- Uses --> N(FileManager);
        L -- Uses --> O(LLMAgent);
        M -- Uses --> O;
        M -- Uses --> P(RulesTemplateManager);
        O -- Uses --> Q(LLMProviderRegistry);
        Q -- Uses --> H;
        Q -- Creates --> R[LLM Providers (Langchain)];
        R -- Calls --> S[External LLM APIs];
        N -- Uses --> T(FileOperations);
        P -- Uses --> T;
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

_Diagram showing the initialization, command handling, and generator execution flow, including DI, LLM interaction, and file operations._

### 2.2. Core Components

*   **`@core/di` (Dependency Injection):** Custom DI container (`Container`) managing service registration (`registerServices`, modular modules) and resolution (`resolveDependency`). Uses `reflect-metadata` and decorators (`@Injectable`, `@Inject`).
*   **`@core/application` (Application Core):**
    *   `ApplicationContainer`: Orchestrates the main application lifecycle, command routing, and top-level workflow.
    *   `GeneratorOrchestrator`: Manages the registration and execution of different generator modules (`IGenerator`).
    *   `IProjectManager` (Stub): Placeholder for project-level state management (currently minimal).
    *   `interfaces.ts`: Defines core application service contracts.
*   **`@core/cli` (Command Line Interface):**
    *   `CliInterface`: Handles argument parsing (`commander`), interactive prompts (`inquirer`), and basic console output.
*   **`@core/config` (Configuration Management):**
    *   `LLMConfigService`: Manages loading, saving, validation, and interactive editing of LLM settings (`llm.config.json`).
    *   `ProjectConfigService`: Manages loading and validation of project settings (`roocode-config.json`).
*   **`@core/llm` (LLM Interaction):**
    *   `LLMAgent`: Central point for interacting with LLMs, orchestrating analysis or completion tasks.
    *   `LLMProviderRegistry`: Dynamically loads and caches the configured LLM provider based on `llm.config.json`.
    *   `LLMProvider` (Implementations: `OpenAILLMProvider`, etc.): Adapters for specific LLM services using `langchain` clients (`@langchain/*`).
*   **`@core/generators` (Base Generator Logic):**
    *   `BaseGenerator`: Abstract class providing common structure and lifecycle (`initialize`, `validate`, `generate`) for all generators.
    *   `IGenerator`: Interface defining the contract for generator modules.
*   **`@generators` (Specific Generators):** Modules implementing `IGenerator` for specific tasks:
    *   `MemoryBankGenerator`: Generates core documentation (`ProjectOverview.md`, etc.). Includes sub-components like `IMemoryBankFileManager`, `IProjectContextService`, `IPromptBuilder`.
    *   `RulesGenerator`: Generates coding standard rules. Includes sub-components like `IRulesFileManager`, `IRulesContentProcessor`, `IRulesPromptBuilder`.
    *   `SystemPromptsGenerator`, `RoomodesGenerator`, `VSCodeCopilotRulesGenerator`: Simpler generators creating specific configuration files.
*   **`@core/analysis` (Project Analysis):**
    *   `ProjectAnalyzer`: Uses `LLMAgent` and `FileOperations` to analyze project structure, tech stack, and dependencies.
    *   `ResponseParser`: Parses JSON responses from the LLM.
    *   `types.ts`: Defines interfaces for analysis results (`ProjectContext`, `TechStackAnalysis`, etc.).
*   **`@core/templating` (Template System):**
    *   `RulesTemplateManager`: Loads, merges, and validates Markdown-based rule templates and customizations.
    *   `TemplateProcessor`: Integrates LLM-generated contextual rules (`{{CONTEXTUAL_RULES}}`) into merged templates.
*   **`@core/template-manager` (Generic Template Engine):**
    *   `TemplateManager`, `Template`: Basic engine for loading and processing simple placeholder-based templates.
*   **`@core/file-operations` (Filesystem Interaction):**
    *   `FileOperations`: Provides abstracted, error-handled file system operations (read, write, check existence, etc.) using Node.js `fs.promises`.
    *   `errors.ts`: Defines specific file operation error types.
*   **`@core/result` (Error Handling):**
    *   `Result`: A type-safe class implementing the Result pattern for explicit success/failure handling across the application.
*   **`@core/errors` (Core Errors):** Defines base `RooCodeError` and specific error types (`ValidationError`, `ConfigurationError`, etc.) for consistent error handling.
*   **`@core/services` (Utility Services):**
    *   `LoggerService`: Basic console logging implementation (`ILogger`).
    *   `BaseService`: Base class for services, potentially handling common initialization or dependency validation (though usage seems limited currently).
*   **`@core/ui` (User Interface Elements):**
    *   `ProgressIndicator`: Wrapper around `ora` for displaying spinners during long operations.
*   **`@types` (Shared Types):** Contains core shared interfaces like `ProjectConfig`, `LLMConfig`, `AnalysisResult`.

## 3. Technology Stack

### 3.1. Primary Stack {#Stack}

*   **Runtime Environment**: Node.js (>=16 specified in `package.json`)
*   **Language**: TypeScript (v5.8.3 specified)
*   **Package Manager**: npm (implied by `package-lock.json`)
*   **Module System**: CommonJS (specified in `tsconfig.json`, used by `require` in entry point)

### 3.2. Key Libraries & Frameworks

*   **CLI Framework**: `commander` (for argument parsing), `inquirer` (for interactive prompts)
*   **LLM Interaction**: `langchain`, `@langchain/openai`, `@langchain/google-genai`, `@langchain/anthropic`
*   **DI Container**: Custom implementation (`@core/di`) using `reflect-metadata`
*   **Environment Variables**: `dotenv`
*   **Module Aliasing**: `module-alias`
*   **Utility**: `chalk` (terminal styling), `ora` (spinners), `date-fns` (date formatting)
*   **Testing**: `jest`, `ts-jest`, `@jest/globals`
*   **Code Quality**: `eslint`, `@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`, `prettier`
*   **Build**: `typescript` (tsc), `copyfiles`

### 3.3. Infrastructure

*   **Execution Environment**: User's Local Machine (as a CLI tool)
*   **Distribution**: npm Registry
*   **CI/CD**: GitHub Actions (implied by use of `@semantic-release/github`), `semantic-release` for automated versioning and publishing.
*   **Version Control**: Git

## 4. Integration and Data Flow

### 4.1. External Services

*   **LLM APIs**: Interacts with external APIs (OpenAI, Google GenAI, Anthropic) via HTTPS, managed by `langchain` and configured through `llm.config.json` or environment variables. Requires API keys.

### 4.2. Internal Integration

*   **Dependency Injection:** Core components are loosely coupled and managed by the custom DI container. Services are registered centrally (`registerServices`) and resolved using tokens (strings). Factories are commonly used for instantiation, allowing dependency resolution within the factory function.
*   **Result Pattern:** The `Result` class is used extensively for robust error handling, making success/failure explicit rather than relying solely on exceptions.
*   **Modular Generators:** The `GeneratorOrchestrator` dynamically loads and executes generators based on CLI input or configuration, promoting extensibility.

### 4.3. Data Flow (Generate Command Example)

1.  **User Input:** `roocode generate memory-bank`
2.  **CLI Parsing (`CliInterface`):** Command `generate`, options `{ generators: ['memory-bank'] }` identified.
3.  **Application Routing (`ApplicationContainer`):** Routes to `executeGenerateCommand`.
4.  **Orchestration (`GeneratorOrchestrator`):**
    *   Resolves `MemoryBankGenerator` based on the 'memory-bank' identifier.
    *   Loads `ProjectConfig` using `ProjectConfigService`.
5.  **Memory Bank Generation (`MemoryBankGenerator`):**
    *   Calls `IProjectContextService.gatherContext` to read project files (using `FileOperations`).
    *   Calls `IMemoryBankTemplateManager.loadTemplate` for each file type (e.g., `ProjectOverview`).
    *   Calls `IPromptBuilder.buildPrompt` using context and template.
    *   Calls `LLMAgent.getCompletion` with prompts.
    *   `LLMAgent` resolves the configured `ILLMProvider` via `LLMProviderRegistry`.
    *   `ILLMProvider` uses `langchain` client to call the external LLM API.
    *   LLM response is returned.
    *   Calls `IContentProcessor.processTemplate` to potentially format the LLM response.
    *   Calls `IMemoryBankFileManager.writeMemoryBankFile` (which uses `FileOperations`) to save the generated `.md` file.
    *   Copies template files using `copyDirectoryRecursive` (via `FileOperations`).
6.  **Feedback (`ProgressIndicator`, `LoggerService`):** Updates displayed in the terminal.
7.  **Completion (`ApplicationContainer`):** Receives `Result.ok`, exits with code 0.

## 5. Key Technical Decisions

*   **Custom DI Container:** Provides control over dependency management without external libraries, leveraging `reflect-metadata`. Modular registration (`modules/*.ts`) improves organization.
*   **Modular Generator Architecture:** Using `IGenerator` interface and `GeneratorOrchestrator` allows easy addition of new generators.
*   **LLM Abstraction (`langchain` & Custom Registry):** `langchain` simplifies interaction with different LLMs. The `LLMProviderRegistry` adds a layer to dynamically select and instantiate the configured provider, decoupling the core logic from specific LLM client implementations.
*   **Result Pattern for Error Handling:** Enforces explicit error handling throughout the codebase, improving robustness compared to relying solely on try/catch.
*   **TypeScript:** Enables static typing, improving code quality, maintainability, and refactoring safety. Strict mode is enabled in `tsconfig.json`.
*   **Feature-Based Folder Structure (with Core Separation):** Organizes code by feature (`generators`, `memory-bank`) alongside a central `core` directory, aiming for logical grouping.
*   **Automated Release (`semantic-release`):** Standardizes versioning and publishing based on conventional commits.
*   **Code Quality Tooling (`eslint`, `prettier`, `commitlint`, `husky`):** Enforces consistent code style and commit message standards automatically.
*   **Module Aliasing (`module-alias`, `tsconfig.json` paths):** Simplifies internal imports using `@core`, `@generators`, etc., mapping to the compiled `dist` directory at runtime.

## 6. Development Guidelines

Refer to [[DeveloperGuide]] for detailed setup, workflow, and coding standards. Key points include:

*   **Standards:** TypeScript, ESLint (`@typescript-eslint`), Prettier, Conventional Commits.
*   **Workflow:** Trunk-Based Development with short-lived feature branches recommended for larger changes. Automated checks via Husky hooks.
*   **Modularity:** Emphasized through DI and the generator pattern.
*   **Error Handling:** Use the `Result` type consistently. Define specific error types extending `RooCodeError` or `FileOperationError`.
*   **Testing:** Jest with `ts-jest`. Coverage goal of 80%. Tests located alongside source files (planned move from `tests/`).

## 7. Security Considerations

*   **API Key Management:** LLM API keys are sensitive. They are loaded via `dotenv` from a `.env` file (which is gitignored) and managed by `LLMConfigService`. Users must secure their `.env` file or configure keys securely in CI environments.
*   **Dependency Security:** Relies on standard practices like `npm audit` and keeping dependencies updated.
*   **File System Access:** The `FileOperations` service interacts with the local filesystem. While primarily a developer tool, path validation (`validatePath`) is implemented, but careful usage is still necessary to avoid unintended file writes, especially based on user input or configuration.
*   **Command Execution (`execute_command` tool - if used via MCP):** Potential security risk if commands can be injected or manipulated. Usage should be carefully controlled and validated. (Note: `execute_command` is not directly part of the core generator logic but mentioned in system prompts).
*   **LLM Interaction:** Prompts constructed from project files could potentially send sensitive source code snippets to external LLM APIs if not carefully managed. The `ProjectContextService` currently excludes common sensitive directories (`.git`, `node_modules`).

## 8. Testing Strategy Overview

*   **Framework:** Jest with `ts-jest` for TypeScript support.
*   **Location:** Tests are planned to be colocated with source files (`*.test.ts`). Currently, some may reside in a top-level `tests/` directory.
*   **Coverage:** Target of 80% global coverage (branches, functions, lines, statements) enforced via `jest.config.js`.
*   **Types:** Unit tests for individual components/functions, Integration tests for component interactions (e.g., DI resolution, command routing).
*   **CI:** Tests are run as part of the CI pipeline (implied by `semantic-release` setup).
*   **Current Status:** Some tests are noted as skipped or failing in the context (`cli-interface.ts`, `rules-template-manager.ts`, `container.ts`), indicating areas needing improvement.

Refer to [[DeveloperGuide#Quality-and-Testing]] for detailed testing practices.
```