# Technical Architecture: roocode-generator

## 1. Introduction

This document outlines the technical architecture for roocode-generator. It details the system's structure, components, technologies, and design decisions. The primary purpose of the `roocode-generator` is to serve as a CLI tool to generate RooCode workflow configuration files for any tech stack. The architecture is designed to support this goal by providing modular components for project analysis, LLM interaction, template processing, and file generation.

## 2. Architectural Goals & Constraints

- **Goals**:
  - **Maintainability**: Achieved through a modular design and Dependency Injection (DI).
  - **Extensibility**: New generators and LLM providers can be added with minimal changes to the core.
  - **LLM Agnosticism**: Abstracting LLM interactions allows support for various providers.
  - **Configurability**: Allowing users to configure LLM settings and generation options.
  - **Robustness**: Handling errors gracefully, especially during file operations and LLM interactions.
- **Constraints**:
  - **Technology Choices**: Primarily built with TypeScript and Node.js, leveraging the npm ecosystem.
  - **Performance**: Analysis of very large codebases might be time-consuming, requiring optimization strategies like file prioritization and token limits.
  - **LLM API Costs/Limits**: Reliance on external LLM APIs introduces potential costs and rate limits.

## 3. System Overview (Logical View)

The system operates as a command-line interface tool. The core flow involves receiving user commands, analyzing the target project, interacting with an LLM (if required), processing templates, and generating output files.

- **Diagram**:
  graph TD
  A[CLI Interface] --> B(Application Container)
  B --> C(Generator Orchestrator)
  C --> D{Select Generator}
  D --> E[Project Analysis]
  E --> F[LLM Interaction]
  F --> G[Template Processing]
  G --> H[Content Generation]
  H --> I[File Operations]
  I --> J[Generated Files]
  E --> K[Project Context Data]
  F --> K
  G --> K
  H --> K
  B --> L[Configuration Services]
  L --> F
  L --> G
  L --> H
  C --> L
  D --> M[Specific Generators]
  M --> E
  M --> F
  M --> G
  M --> H
  M --> I
  M --> K
  M --> L
  Subgraph Core
  B
  C
  E
  F
  G
  H
  I
  K
  L
  End
  SubGraph Generators
  M
  End
- **Key Components**:
  - `ApplicationContainer`: The main entry point after CLI parsing, orchestrates the application flow and resolves dependencies.
  - `GeneratorOrchestrator`: Manages different generator types (e.g., Memory Bank, VSCode Rules) and executes the selected one.
  - `ProjectAnalyzer`: Collects and analyzes project data, including file structure, tech stack, and potentially AST information.
  - `LLMAgent`: Handles all interactions with external LLM providers, including prompt building, completion requests, and token management.
  - `MemoryBankService`: Orchestrates the generation of memory bank content based on project context and templates.
  - `RulesTemplateManager`: Manages loading, merging, and validating templates used for generating rules or memory bank content.
  - `FileOperations`: Provides an abstraction layer for file system interactions (reading, writing, directory creation).
  - `LoggerService`: Handles logging output to the console or files.
  - `CliInterface`: Parses command-line arguments and interacts with the user via prompts.

## 4. Technology Stack

- **Programming Language**: TypeScript
- **Runtime Environment**: Node.js (>=16)
- **Package Manager**: npm
- **Core Frameworks/Libraries**:
  - `commander`: For building the command-line interface.
  - `inquirer`: For interactive command-line prompts.
  - `langchain`: Provides a framework for interacting with various LLM providers.
  - `tree-sitter`: Used for parsing code into Abstract Syntax Trees (ASTs) for analysis.
  - `zod`: For data validation, particularly for LLM responses and configuration.
  - `reflect-metadata`: Used by the Dependency Injection container.
  - `jest`: The primary testing framework.
  - `eslint`: For code linting.
  - `prettier`: For code formatting.
  - `ora`: For displaying progress indicators in the CLI.
- **Build Tools**:
  - `TypeScript Compiler (tsc)`: Compiles TypeScript code to JavaScript.
  - `Vite`: Used for bundling the application.
- **LLM Providers**: Integrated via Langchain, including support for OpenAI, Google GenAI, and Anthropic (with potential for OpenRouter via OpenAI compatibility).

## 5. Data Design & Management

- **`ProjectContext` Structure & Generation**: The `ProjectContext` (defined in `src/core/analysis/types.ts`) is a central data structure encapsulating analyzed information about the target project. Following TSK-020, this structure has been significantly minimized to optimize payloads for LLMs and reduce data redundancy. It now primarily consists of:
  - `projectRootPath: string`: The absolute path to the project root.
  - `techStack: TechStackAnalysis`: Details about the project's technology stack.
  - `packageJson: PackageJsonMinimal`: A minimal representation of the project's `package.json`, serving as the SSoT for external dependencies.
  - `codeInsights: { [filePath: string]: CodeInsights }`: A map where keys are file paths (relative to `projectRootPath`) and values are `CodeInsights` objects (defined in `src/core/analysis/ast-analysis.interfaces.ts`) containing summaries of file content (functions, classes, imports).
- Explicit structures like `directoryTree` and `internalDependencyGraph` have been removed from `ProjectContext`. Project structural information (like file lists, specific file roles e.g., config files, entry points) and internal dependencies are now primarily derived/inferred from the keys and content of `codeInsights` (e.g., `ImportInfo` where `isExternal` is false), often with the assistance of helper utilities (e.g., in `src/core/analysis/project-context.utils.ts`) or by the LLM itself during content generation.
- This context is generated by the `ProjectAnalyzer` service, which focuses on populating these core pieces of information.
- **`ProjectContext` Consumption**: The minimized `ProjectContext` data is passed to various components, including `LLMAgent` (for prompt building), `MemoryBankContentGenerator`, and `RulesPromptBuilder`. These consumers now rely on the lean context and helper utilities or LLM inference to obtain detailed structural or dependency views as needed. The primary goal of this change was to make LLM interactions more efficient.
  - For the revamped Roo generator, prompt building involves combining the core `roo-rules.md` content, the specific mode's system prompt template (`system-prompt-[mode].md`), and the `projectContext` to instruct the LLM to generate context-aware and mode-relevant rules.
- **Data Persistence**:
  - Configuration: User and project-specific configurations (`.roocode.json`, `.roocode-llm.json`) are loaded and saved to the filesystem using `ProjectConfigService` and `LLMConfigService`, leveraging `FileOperations`.
  - Generated Output: The primary output, such as memory bank files (`.roocode/memory-bank/`) and VSCode rules files (`.vscode/copilot/`), are written to the filesystem using `MemoryBankFileManager` and `RulesFileManager`, also relying on `FileOperations`.

## 6. Code Structure (Development View)

- `src/`: Core source code.
  - `core/`: Contains the foundational framework components.
    - `analysis/`: Project analysis, file collection, AST parsing, tech stack detection.
    - `application/`: Application entry point and orchestration.
    - `cli/`: Command-line interface parsing and interaction.
    - `config/`: Configuration loading, saving, and management.
    - `di/`: Dependency Injection container and related utilities.
    - `errors/`: Custom error classes.
    - `file-operations/`: Abstraction for file system operations.
    - `generators/`: Base generator class and interfaces.
    - `llm/`: LLM agent, provider interfaces, and specific provider implementations.
    - `result/`: Implementation of a Result type for functional error handling.
    - `services/`: Base service class and common services like logging.
    - `template-manager/`: Core template loading and processing logic.
    - `templating/`: Specific template processing logic (e.g., for rules).
    - `types/`: Shared core type definitions.
    - `ui/`: User interface components (e.g., progress indicator).
    - `utils/`: Common utility functions.
  - `generators/`: Implementations of specific content generators (e.g., `ai-magic-generator`, `roomodes-generator`, `system-prompts-generator`, `vscode-copilot-rules-generator`).
  - `memory-bank/`: Logic specific to generating and managing memory bank content.
  - `types/`: Shared type definitions across the project.
- `tests/`: Automated tests for various modules.
- `templates/`: Template files used by the generators.
- `bin/`: Executable scripts, including the main CLI entry point.
- `task-tracking/`: Project management and task documentation.

## 7. Key Architectural Decisions (ADRs)

- **Dependency Injection (DI)**: A custom DI container (`src/core/di`) is used to manage dependencies between services and components. This promotes loose coupling, testability, and maintainability.
- **Modular Design**: The codebase is divided into distinct modules (`core`, `generators`, `memory-bank`) with clear responsibilities, enhancing organization and allowing for independent development and testing.
- **LLM Provider Abstraction**: An interface-based approach (`src/core/llm/interfaces.ts`) is used for LLM providers, allowing the `LLMAgent` to interact with different models and services without being tied to a specific vendor implementation.
- **Tree-sitter for Code Analysis**: Utilizing Tree-sitter enables robust and language-agnostic parsing of source code into structured ASTs, providing rich context for LLM analysis.
- **Result Type for Error Handling**: The `Result` type (`src/core/result/result.ts`) is employed for explicit error handling in operations that might fail, improving code clarity and reliability compared to traditional exception handling in many cases.
- **Zod for Validation**: Zod is used extensively for validating data structures, particularly for configuration and LLM outputs, ensuring data integrity.

## 8. Interface Design / Integration Points

- **LLM APIs**: The system integrates with external LLM providers (OpenAI, Google GenAI, Anthropic, OpenRouter) via the `langchain` library and custom provider implementations (`src/core/llm/providers`). Interaction involves sending prompts and receiving text or structured JSON completions.
- **Filesystem**: Extensive interaction with the local filesystem is managed through the `FileOperations` service, including reading source files, reading/writing configuration, and writing generated output files.
- **Internal Component APIs**: Key interfaces (`src/core/*/interfaces.ts`) define the contracts between core modules and services, enabling DI and promoting modularity. Examples include `IProjectAnalyzer`, `ILLMAgent`, `IFileOperations`, `ILoggerService`, `IMemoryBankService`, `IRulesTemplateManager`.
- **(Future) Version Control**: While not directly integrated currently, the generated files (e.g., `.roocode/`, `.vscode/copilot/`) are intended to be checked into version control, serving as a passive integration point.

## 9. Security Considerations

- **API Keys**: LLM API keys are handled via configuration files and environment variables (`.env`), processed by `LLMConfigService`. Users are instructed to manage these securely and avoid committing sensitive keys directly into source control.
- **Input Sanitization**: While the primary input is source code for analysis, LLM outputs are parsed and validated using Zod (`ResponseParser`, `JsonSchemaHelper`) to mitigate risks associated with malformed or unexpected responses.
- **Dependency Security**: Standard practices like using `npm audit` are available to check for known vulnerabilities in third-party packages listed in `package.json`. The `husky` setup suggests pre-commit checks which could include security hooks.

## 10. Deployment Strategy (Physical View)

- **Packaging**: The application is packaged as an npm package, defined by the `package.json` file. Build tools like `tsc` and `Vite` are used to compile and bundle the source code into the `dist` directory.
- **Execution**: The application is designed to be executed as a Node.js command-line interface tool. The `bin/roocode-generator.js` file serves as the main executable entry point, as specified in `package.json`. Users install it globally or locally via npm/yarn and run commands like `roocode generate`.
- **CI/CD**: The project includes development dependencies like `husky` for managing Git hooks (e.g., pre-commit, pre-push), which can enforce code quality standards (linting, formatting, testing) before changes are committed or pushed. While not explicitly defined in the provided context, this structure supports integration into CI/CD pipelines (e.g., GitHub Actions, GitLab CI) for automated testing, linting, and potentially publishing.
