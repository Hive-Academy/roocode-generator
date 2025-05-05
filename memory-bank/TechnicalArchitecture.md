# Technical Architecture

## Overview

This document describes the technical architecture of the `roocode-generator` project. The project is a command-line interface (CLI) tool designed to analyze a codebase and generate various outputs, primarily focused on leveraging Large Language Models (LLMs) for tasks like generating documentation, code rules, or other forms of project context.

The architecture is built around a core set of services responsible for file operations, logging, configuration management, dependency injection, and interaction with LLMs. It utilizes a plugin-like structure for different generation tasks, allowing for extensibility. The system analyzes project files, potentially using AST parsing, collects relevant content, and then uses an LLM to generate the desired output based on provided templates and prompts.

Key aspects of the architecture include:

*   **Modularity and Extensibility:** The use of dependency injection and a generator orchestrator allows for easy addition of new generation tasks.
*   **Configurability:** LLM provider and project-specific configurations are managed, allowing users to customize the tool's behavior.
*   **Robust Error Handling:** A custom error hierarchy is implemented to provide clear and contextual error reporting.
*   **LLM Abstraction:** An LLM agent and provider registry abstract away the specifics of different LLM APIs, enabling support for multiple providers.
*   **Code Analysis Capabilities:** Integration with Tree-sitter allows for parsing code into Abstract Syntax Trees (ASTs) for deeper analysis.

## Components

The system is composed of the following key components:

*   **CLI Interface (`CliInterface`):** Handles command-line arguments parsing, user interaction (prompts), and output to the console. Uses `commander` and `inquirer`.
*   **Application Container (`ApplicationContainer`):** The main entry point for the application logic after CLI arguments are parsed. Orchestrates the execution of commands (e.g., `generate`, `config`).
*   **Generator Orchestrator (`GeneratorOrchestrator`):** Manages the available generators and executes the selected ones based on user commands and configuration.
*   **Generators (e.g., `AiMagicGenerator`, `RoomodesGenerator`):** Implement specific generation logic. They interact with other services to gather context, build prompts, call the LLM, and save output.
*   **Dependency Injection Container (`Container`):** Manages the lifecycle and dependencies of services and components using a custom DI implementation with decorators (`@Injectable`, `@Inject`).
*   **Configuration Services (`LLMConfigService`, `ProjectConfigService`):** Load, validate, and save application-wide LLM configuration and project-specific configuration.
*   **File Operations Service (`FileOperations`):** Provides a standardized interface for file system interactions (read, write, directory operations), with built-in error handling.
*   **Logger Service (`LoggerService`):** Handles logging of information, warnings, errors, and debug messages. Uses `chalk` for colored output.
*   **Progress Indicator (`ProgressIndicator`):** Provides visual feedback for long-running operations using `ora`.
*   **LLM Agent (`LLMAgent`):** Acts as an interface between the application and the selected LLM provider. Handles prompt construction, API calls, token counting, and context window management.
*   **LLM Provider Registry (`LLMProviderRegistry`):** Manages different LLM provider implementations (OpenAI, Anthropic, Google GenAI, OpenRouter) and provides the appropriate provider based on configuration.
*   **LLM Providers (`OpenAIProvider`, `AnthropicProvider`, etc.):** Implement the specific API calls and logic for interacting with different LLM services.
*   **Project Analyzer (`ProjectAnalyzer`):** Analyzes the project codebase to gather relevant information for generation. This includes file collection, content collection, and AST analysis.
*   **AST Analysis Service (`AstAnalysisService`):** Uses Tree-sitter to parse code into ASTs and potentially simplifies or analyzes the AST structure.
*   **Tree-Sitter Parser Service (`TreeSitterParserService`):** Manages Tree-sitter parsers for different languages.
*   **File Collector (`ProjectFileCollector`):** Recursively collects files within a project directory based on configurable rules.
*   **File Content Collector (`FileContentCollector`):** Reads the content of collected files, potentially respecting token limits.
*   **File Prioritizer (`FilePrioritizer`):** Prioritizes files for analysis based on rules (e.g., depth in directory structure).
*   **Token Counter (`LLMTokenCounter`):** Estimates the number of tokens in a given text using the selected LLM provider's method.
*   **Response Parser (`ResponseParser`):** Parses and validates the JSON response from the LLM, potentially repairing malformed JSON. Uses `zod` for schema validation.
*   **JSON Schema Helper (`JsonSchemaHelper`):** Provides JSON schemas for validating LLM responses and other data structures.
*   **Template Manager (`TemplateManager`):** Loads and manages templates used for generating output.
*   **Templating Services (`RulesTemplateManager`, `TemplateProcessor`):** Handle the loading, merging, and processing of specific types of templates (e.g., for generating rules).
*   **Memory Bank Services (e.g., `MemoryBankService`, `MemoryBankOrchestrator`):** A set of services specifically for generating and managing a "memory bank" of project information, potentially used for improving LLM context.

## Data Flow

1.  **Command Execution:** The CLI (`CliInterface`) parses command-line arguments and passes them to the `ApplicationContainer`.
2.  **Application Initialization:** The `ApplicationContainer` uses the DI container to resolve necessary services, including configuration services and the generator orchestrator.
3.  **Configuration Loading:** Configuration services load application-wide and project-specific settings (including LLM provider details and API keys) from files.
4.  **Generator Selection and Validation:** The `GeneratorOrchestrator` identifies the requested generator(s) and validates their dependencies and configuration.
5.  **Project Analysis (for generation commands):** If a generation command is executed, the `ProjectAnalyzer` is invoked.
    *   The `ProjectFileCollector` scans the project directory to identify relevant files.
    *   The `FilePrioritizer` orders the collected files.
    *   The `FileContentCollector` reads the content of prioritized files, respecting token limits.
    *   The `TreeSitterParserService` and `AstAnalysisService` can optionally parse file content into ASTs for detailed analysis.
    *   The collected file content and/or AST data are used to build a project context representation.
6.  **Prompt Building:** A generator or a dedicated prompt builder service (`RulesPromptBuilder`, `PromptBuilder`) constructs the system and user prompts for the LLM, incorporating the project context and template information.
7.  **LLM Interaction:** The `LLMAgent` sends the prompts to the selected LLM provider via the `LLMProviderRegistry`.
    *   The LLM provider interacts with the external LLM API.
    *   The `LLMTokenCounter` can be used to estimate token usage.
8.  **Response Parsing and Validation:** The `ResponseParser` receives the LLM's response, cleans it, and validates it against a defined schema using `zod`.
9.  **Content Processing:** A content processor (`RulesContentProcessor`, `ContentProcessor`) processes the validated LLM response, potentially extracting code blocks or applying further transformations.
10. **Output Generation and Saving:** The generator uses the processed content and the `FileOperations` service to generate and save the final output files in the appropriate location.
11. **Error Handling and Reporting:** Throughout the process, custom error types are used to provide contextual error information. The `LoggerService` is used to report errors to the user.

## Technologies

*   **Languages:** JavaScript, TypeScript
*   **Frameworks:** Langchain (for interacting with LLMs)
*   **Build Tools:** vite, tsc, rimraf
*   **Testing Frameworks:** jest
*   **Linters/Formatters:** eslint, prettier
*   **Package Manager:** npm
*   **CLI Argument Parsing:** commander
*   **User Prompts:** inquirer
*   **File System Operations:** fs, path, fs-extra
*   **Dependency Injection:** Custom implementation with decorators and `reflect-metadata`.
*   **Structured Logging:** chalk
*   **Progress Indicators:** ora
*   **JSON Schema Validation:** zod
*   **Code Parsing:** tree-sitter, tree-sitter-javascript, tree-sitter-typescript
*   **LLM Providers:** `@langchain/anthropic`, `@langchain/google-genai`, `@langchain/openai` (and potentially custom OpenRouter implementation)

## Decisions

1.  **Dependency Injection:** A custom DI container was implemented to manage service dependencies and promote modularity. This allows for easier testing and swapping of implementations.
2.  **Result Type for Operations:** The `Result` type is used extensively for operations that can either succeed with a value or fail with an error. This provides a clear and functional way to handle potential failures without relying solely on exceptions.
3.  **Custom Error Hierarchy:** A custom hierarchy of error classes (`RooCodeError`, `FileSystemError`, `LLMProviderError`, etc.) was designed to provide specific context for different types of errors, making debugging easier.
4.  **Abstraction of LLM Providers:** The `LLMAgent` and `LLMProviderRegistry` abstract the specifics of different LLM APIs. This makes it easier to add support for new LLM providers in the future.
5.  **Tree-sitter for Code Analysis:** Tree-sitter was chosen for AST parsing due to its performance and support for multiple languages, enabling deeper analysis of codebase structure beyond simple text processing.
6.  **Zod for Schema Validation:** Zod is used for validating LLM responses and configuration data. This ensures that the system operates on expected data structures and provides clear error messages when validation fails.
7.  **Configuration Management:** Separate services for LLM and project configuration allow for clear separation of concerns and different configuration scopes.
8.  **Generator-based Architecture:** Implementing different generation tasks as distinct "Generators" managed by an orchestrator promotes extensibility and allows users to select specific generation functionalities.
9.  **Separation of Concerns in Memory Bank:** The memory bank functionality is broken down into several services (orchestrator, content generator, file manager, etc.) to improve maintainability and testability.
10. **CLI Frameworks:** `commander` was chosen for robust command-line argument parsing, and `inquirer` for interactive user prompts, providing a standard CLI experience.