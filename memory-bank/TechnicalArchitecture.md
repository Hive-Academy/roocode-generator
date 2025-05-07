# Technical Architecture: roocode-generator

## 1. Introduction

This document outlines the technical architecture for the **roocode-generator** project. It details the system's structure, components, technologies, and design decisions. The architecture is designed to support the primary goal of analyzing software projects and generating contextual documentation (Memory Bank) and configuration files (RooModes, VSCode Copilot Rules) by leveraging Large Language Models (LLMs). This enables developers to quickly bootstrap and maintain a rich, AI-assisted development environment.

## 2. Architectural Goals & Constraints

- **Goals**:
  - **Modularity**: Components are designed to be independent and interchangeable where possible.
  - **Extensibility**: The architecture should allow for easy addition of new generators, LLM providers, and analysis capabilities.
  - **Maintainability**: Clear separation of concerns, strong typing (TypeScript), and comprehensive linting/formatting rules facilitate ease of maintenance.
  - **LLM Agnosticism**: Abstracting LLM interactions to support multiple providers (OpenAI, Anthropic, Google GenAI, OpenRouter).
  - **Accuracy**: Provide high-quality, relevant generated content through detailed project analysis and effective prompting.
  - **Developer Experience**: A user-friendly CLI and robust error handling.
- **Constraints**:
  - **Technology Choices**: Primarily a Node.js and TypeScript ecosystem.
  - **Performance**: While not a real-time system, analysis and generation should be reasonably fast for typical project sizes. LLM API latency is an external factor.
  - **Security**: Secure handling of LLM API keys is paramount.
  - **Offline Capability**: Primarily an online tool due to LLM dependencies, though project analysis can be performed offline.

## 3. System Overview (Logical View)

The system operates as a CLI tool that orchestrates several key processes: project analysis, LLM interaction, and content generation.

- **Diagram**:
  graph TD
  A[CLI Interface (Commander/Inquirer)] --> B{ApplicationContainer};
  B -- Generate Command --> C[GeneratorOrchestrator];
  C -- Project Path --> D[ProjectAnalyzer];
  D -- Analyzes --> E[Target Project Files];
  D -- Produces --> F[ProjectContext Data];
  C -- ProjectContext --> G[Specific Generators (e.g., AiMagicGenerator, MemoryBankService)];
  G -- Uses --> F;
  G -- Interacts with --> H[LLMAgent];
  H -- Uses --> I[LLM Providers (OpenAI, Anthropic, etc.)];
  I -- API Calls --> J[External LLM Services];
  J -- Responses --> I;
  I -- Results --> H;
  H -- Generated Content --> G;
  G -- Writes --> K[Output Files (Memory Bank, RooModes, etc.)];
  L[ConfigurationService (LLMConfig, ProjectConfig)] --> B;
  L --> H;
  M[DependencyInjection Container] -. Manages .-> B;
  M -. Manages .-> C;
  M -. Manages .-> D;
  M -. Manages .-> G;
  M -. Manages .-> H;
  M -. Manages .-> L;
- **Key Components**:

  - `ProjectAnalyzer (src/core/analysis/project-analyzer.ts)`: Responsible for deeply analyzing the target software project. This includes identifying the tech stack, project structure, dependencies, and performing Abstract Syntax Tree (AST) analysis on source files using Tree-sitter. It produces a comprehensive `ProjectContext` object.
  - `LLMAgent (src/core/llm/llm-agent.ts)`: Manages all interactions with Large Language Models. It abstracts the specifics of different LLM providers, handles prompt construction, API calls, and response parsing. It supports multiple providers like OpenAI, Anthropic, Google GenAI, and OpenRouter.
    - **Structured Output Handling**: For requests requiring structured JSON output (e.g., `codeInsights` from `AstAnalysisService`), the `LLMAgent` now orchestrates calls to a standardized `getStructuredCompletion` method implemented by each LLM provider. This method typically utilizes Langchain's `withStructuredOutput` (or an equivalent mechanism) along with Zod schemas to ensure that the LLM's response is parsed, validated against the expected schema, and returned as a typed object. This pattern includes pre-call validation (e.g., token limits), retry logic for transient API errors, and consistent error mapping. This significantly improves the reliability and type safety of consuming structured data from LLMs.
  - `GeneratorOrchestrator (src/core/application/generator-orchestrator.ts)`: Coordinates the execution of various generator modules based on user commands and project configuration. It ensures that generators receive the necessary `ProjectContext` and other inputs.
  - `MemoryBankService (src/memory-bank/memory-bank-service.ts)`: Orchestrates the generation of Memory Bank documents (e.g., Project Overview, Technical Architecture, Developer Guide). It utilizes templates and the `ProjectContext` to prompt LLMs via the `LLMAgent`.
  - `AiMagicGenerator (src/generators/ai-magic-generator.ts)`: A versatile generator that can produce various types of content, including RooModes and potentially other AI-driven outputs, leveraging the `ProjectContext` and `LLMAgent`.
  - `CommandLineInterface (src/core/cli/cli-interface.ts)`: Provides the user interface for the tool using `commander` for argument parsing and `inquirer` for interactive prompts. It translates user input into actions for the `ApplicationContainer`.
  - `DependencyInjectionContainer (src/core/di/container.ts)`: A custom DI container using `reflect-metadata` to manage the lifecycle and dependencies of various services and components throughout the application, promoting loose coupling and testability.
  - `ConfigurationService (src/core/config/*)`: Manages loading, validation, and saving of project-specific (`roocode.config.json`) and LLM configurations (`llm.config.json`).

## 4. Technology Stack

- **Programming Language**: TypeScript (`^5.8.3`)
- **Runtime Environment**: Node.js (`>=16`)
- **Package Manager**: npm
- **Core Frameworks/Libraries**:

  - `tree-sitter (^0.21.1)`: For robust and efficient Abstract Syntax Tree (AST) parsing of various programming languages, enabling detailed code analysis.
  - `langchain (^0.3.21)` (with `@langchain/openai`, `@langchain/anthropic`, `@langchain/google-genai`): A framework for developing applications powered by LLMs, providing abstractions for interacting with multiple LLM providers.
  - `commander (^13.1.0)`: For building the command-line interface, handling argument parsing and command definitions.
  - `inquirer (^12.5.2)`: For creating interactive command-line user prompts.
  - `zod (3.24.4)`: For schema declaration and validation, ensuring data integrity, especially for LLM responses and configurations.
  - `reflect-metadata (^0.2.2)`: Used in conjunction with the custom Dependency Injection (DI) system to manage class metadata for dependency resolution.
  - `jest (^29.7.0)`: A testing framework for unit and integration tests.
  - `eslint (^9.24.0)` & `prettier (^3.5.3)`: For code linting and formatting, ensuring code quality and consistency.

- **Build Tools**:

  - `TypeScript Compiler (tsc)`: For compiling TypeScript code to JavaScript and performing type checking.
  - `Vite (^6.3.3)`: Used as the build tool for bundling the application.

- **LLM Providers**:
  - OpenAI (via `@langchain/openai`)
  - Anthropic (via `@langchain/anthropic`)
  - Google GenAI (via `@langchain/google-genai`)
  - OpenRouter (via custom provider `src/core/llm/providers/open-router-provider.ts` using `@langchain/openai` client)

## 5. Data Design & Management

- **`ProjectContext` Structure & Generation**:
  - The `ProjectContext` (defined in `src/core/analysis/types.ts` and `src/memory-bank/interfaces/project-context.interface.ts`) is a central data structure. It encapsulates all analyzed information about the target project, including its tech stack, directory structure, dependencies, configuration files, main entry points, and detailed code insights (AST summaries, identified classes/functions) for relevant files.
  - This data is primarily generated by the `ProjectAnalyzer` service. It uses `FileOperations` to read the project's file system, `TechStackAnalyzerService` to determine technologies, `TreeSitterParserService` for AST generation, and `AstAnalysisService` (potentially with LLM assistance) to extract insights from ASTs.
- **`ProjectContext` Consumption**:
  - The `ProjectContext` is consumed by various generator modules (e.g., `AiMagicGenerator`, `MemoryBankService` and its underlying `MemoryBankContentGenerator`).
  - The `LLMAgent` uses parts of the `ProjectContext` to construct highly contextualized prompts for LLMs, tailoring requests for specific generation tasks.
  - Generators use this data to understand the project's nuances, enabling them to produce more relevant and accurate documentation or code.
- **Data Persistence**:
  - **Configuration**: LLM provider settings and API keys are stored in `llm.config.json`. Project-specific settings for roocode-generator can be stored in `roocode.config.json`. These are managed by `LLMConfigService` and `ProjectConfigService` respectively.
  - **Memory Bank**: Generated Memory Bank documents (Project Overview, Technical Architecture, etc.) are stored as Markdown files in the `memory-bank/` directory within the target project (or a specified output directory).
  - **Generated Rules/Code**: RooModes and VSCode Copilot rules are saved as JSON or other relevant file formats in appropriate locations (e.g., `.vscode/` or a user-defined path).
  - **Task Tracking**: Task-related documents (descriptions, implementation plans, completion reports) are stored in the `task-tracking/` directory.

## 6. Code Structure (Development View)

The project follows a modular structure, primarily within the `src/` directory:

- `src/`: Core source code.
  - `core/`: Contains the foundational framework and shared utilities.
    - `analysis/`: Components for project analysis (AST parsing, tech stack identification, file collection, etc.).
    - `application/`: Orchestration logic, including the main application container and generator orchestrator.
    - `cli/`: Command-line interface handling.
    - `config/`: Configuration loading and management services.
    - `di/`: Custom Dependency Injection container and related utilities.
    - `errors/`: Custom error classes for the application.
    - `file-operations/`: Abstractions for file system interactions.
    - `generators/`: Base classes and interfaces for generator modules.
    - `llm/`: LLM interaction logic, including the `LLMAgent`, provider implementations, and interfaces.
    - `services/`: Shared services like logging.
    - `template-manager/`: Manages loading and processing of template files.
    - `ui/`: User interface elements like progress indicators.
    - `utils/`: General utility functions.
  - `generators/`: Specific code/document generator implementations (e.g., `AiMagicGenerator`, `RoomodesGenerator`).
    - `rules/`: Sub-module for handling RooMode rule generation specifics.
  - `memory-bank/`: Logic specific to generating and managing the Memory Bank documents.
    - `interfaces/`: Defines interfaces for the memory bank components.
  - `types/`: Shared TypeScript type definitions used across modules.
- `tests/`: Automated tests (unit and integration) using Jest.
  - `fixtures/`: Sample files and data used for testing.
  - `__mocks__/`: Mock implementations for dependencies.
- `templates/`: Template files (Markdown, JSON schemas) used by generators.
  - `memory-bank/`: Templates for Memory Bank documents.
  - `system-prompts/`: Base system prompts for different LLM personas/tasks.
- `bin/`: Executable scripts, including the main entry point `roocode-generator.js`.
- `task-tracking/`: Project management and documentation for development tasks.
- `docs/`: General project documentation and presentations.

## 7. Key Architectural Decisions (ADRs)

- **Decision 1**: Use of TypeScript for static typing.
  - **Rationale**: Enhances code quality, maintainability, and developer experience by catching errors early and improving code navigation and refactoring.
- **Decision 2**: Custom Dependency Injection (DI) framework (`src/core/di`).
  - **Rationale**: Promotes loose coupling between components, improves testability by allowing easy mocking of dependencies, and centralizes object creation and lifecycle management. `reflect-metadata` is used for metadata.
- **Decision 3**: Modular architecture with clear separation of concerns.
  - **Rationale**: Divides the system into logical units (analysis, LLM interaction, generation, CLI, configuration) making it easier to understand, develop, and extend.
- **Decision 4**: Abstraction layer for LLM providers (`src/core/llm/providers`).
  - **Rationale**: Allows the system to be LLM-agnostic, enabling support for multiple LLM backends (OpenAI, Anthropic, Google GenAI, OpenRouter) and facilitating easier switching or addition of new providers. Langchain is leveraged for this.
- **Decision 5**: AST-based code analysis using Tree-sitter.
  - **Rationale**: Provides a deep and accurate understanding of the project's source code structure, enabling more contextually relevant and precise generation tasks compared to regex or simple string matching.
- **Decision 6**: Schema validation using Zod.
  - **Rationale**: Ensures the integrity of data, particularly for LLM configurations, LLM responses, and inter-component data structures, reducing runtime errors and improving robustness.
- **Decision 7**: Vite for building the application.
  - **Rationale**: Provides a fast and modern build process for the TypeScript project, configured to output a Node.js compatible bundle.

## 8. Interface Design / Integration Points

- **LLM APIs**:
  - Interactions with external LLM services (OpenAI, Anthropic, Google GenAI, OpenRouter) are managed by the `LLMAgent` and specific provider implementations in `src/core/llm/providers/`.
  - These interactions are primarily HTTP-based API calls, abstracted by the Langchain library.
- **Filesystem**:
  - Extensive interaction with the local filesystem for:
    - Reading target project source code, `package.json`, `tsconfig.json`, and other configuration files.
    - Reading template files from the `templates/` directory.
    - Writing generated Memory Bank documents, RooModes, VSCode settings, and other outputs.
    - Reading and writing application configuration files (`llm.config.json`, `roocode.config.json`).
  - `FileOperations` service (`src/core/file-operations/file-operations.ts`) provides a consistent interface for these operations.
- **Internal Component APIs**:
  - Components interact via well-defined TypeScript interfaces (e.g., `ILLMAgent`, `IProjectAnalyzer`, `IFileOperations`, `ILoggerService`).
  - The Dependency Injection container (`src/core/di/container.ts`) is responsible for resolving and injecting dependencies based on these interfaces, promoting loose coupling.
- **Command Line Interface (CLI)**:
  - `commander` library is used to define commands, options, and parse arguments.
  - `inquirer` library is used for interactive prompts to gather user input (e.g., for configuration).
  - The `CliInterface` (`src/core/cli/cli-interface.ts`) encapsulates this logic.
- **(Future) Version Control**: No direct integration currently, but generated files are intended to be committed to version control by the user.

## 9. Security Considerations

- **API Keys**:
  - LLM API keys are sensitive credentials. They are managed through the `llm.config.json` file or can be sourced from environment variables.
  - The `dotenv` package is used to load environment variables, allowing keys to be kept out of version control.
  - Users are responsible for securing their `llm.config.json` file if it contains API keys directly.
- **Input Sanitization**:
  - The tool reads and analyzes source code from user-specified projects. While the primary risk is to the LLM (prompt injection), care must be taken if any analyzed content is directly executed or unsafely embedded in outputs. Currently, the tool focuses on analysis and generation, not execution of arbitrary code.
  - JSON parsing of LLM responses includes robust error handling and repair mechanisms (`jsonrepair`) to handle potentially malformed JSON.
- **Dependency Security**:
  - The project relies on third-party npm packages. Regular audits (e.g., using `npm audit`) should be performed to identify and mitigate known vulnerabilities in dependencies.
  - Dependencies are kept up-to-date where feasible.
- **File System Access**:
  - The tool requires read access to the target project and write access to output directories (e.g., `memory-bank/`, `.vscode/`). Users should run the tool with appropriate permissions.

## 10. Deployment Strategy (Physical View)

- **Packaging**:
  - The application is packaged as an npm package, as defined in `package.json`.
  - The `vite build` script compiles TypeScript to JavaScript and bundles the application into the `dist/` directory.
  - The `files` array in `package.json` specifies which files are included in the published npm package (e.g., `dist`, `bin`, `templates`).
- **Execution**:
  - The tool is a Node.js command-line application.
  - The main entry point is `bin/roocode-generator.js`, which is made executable and linked via the `bin` field in `package.json` (e.g., `roocode` command).
  - It requires Node.js (version `>=16`) to be installed on the user's system.
- **CI/CD**:
  - The project uses Semantic Release (`semantic-release` devDependency) for automated versioning, changelog generation, and publishing to npm.
  - Configuration for Semantic Release is in `.releaserc.json`, which includes plugins for commit analysis, release notes, npm publishing, and GitHub integration (changelog, releases).
  - This setup typically integrates with a CI/CD pipeline (e.g., GitHub Actions) triggered on pushes to the main branch.
