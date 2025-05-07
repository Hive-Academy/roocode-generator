# Project Overview: roocode-generator



## 1. Introduction



- **Purpose**: This project, `roocode-generator`, is a command-line interface (CLI) tool designed to generate RooCode workflow configuration files, system prompts, and other development artifacts, tailored for various technology stacks by analyzing project structures and leveraging Large Language Models (LLMs).
- **Core Functionality**:
    -   Provides a CLI (`roocode`) for users to initiate analysis and generation processes.
    -   Analyzes software projects to understand their structure, technology stack (including languages like TypeScript, JavaScript, HTML, JSON, Markdown), dependencies, and key components using tools like Tree-sitter for AST parsing.
    -   Generates various configuration files and documentation, including RooCode workflows, system prompts for LLMs, VSCode Copilot rules, and a "Memory Bank" of project-specific documents.
    -   Integrates with multiple LLM providers (e.g., OpenAI, Anthropic, Google GenAI, OpenRouter via Langchain) for intelligent content generation and analysis.

## 2. Goals



- Goal 1: To automate and simplify the creation of RooCode workflow configurations and related development artifacts for diverse software projects.
- Goal 2: To provide a flexible and extensible CLI tool capable of analyzing various technology stacks and project structures to produce relevant, context-aware outputs.
- Goal 3: To leverage the capabilities of Large Language Models (LLMs) for intelligent project understanding, content generation, and customization of generated artifacts.
- Goal 4: To enhance developer productivity by reducing manual effort in setting up project workflows and generating foundational documentation.

## 3. Scope



### 3.1. In Scope



-   Command-line interface (CLI) for user interaction, supporting various commands and options for generation and configuration.
-   Automated analysis of target software projects, including:
    -   Identification of programming languages (TypeScript, JavaScript, etc.), frameworks, and build tools.
    -   Parsing of project structure, including directory layout, source files, test files, and configuration files.
    -   Extraction of dependency information from `package.json` or similar.
    -   AST-based analysis of code files for deeper insights (e.g., function/class definitions, imports).
-   Generation of "RooCode" workflow configuration files.
-   Generation of system prompts tailored for different AI personas or tasks.
-   Generation of `.vscode/roo.copilot.rules` for VSCode Copilot integration.
-   Creation of a "Memory Bank" which includes:
    -   `ProjectOverview.md`
    -   `TechnicalArchitecture.md`
    -   `DeveloperGuide.md`
-   Integration with multiple LLM providers (OpenAI, Anthropic, Google GenAI, OpenRouter) for content generation.
-   Configuration management for LLM API keys, models, and other settings via `llm.config.json`.
-   Support for template-based generation, allowing customization of outputs.

### 3.2. Out of Scope



-   Deployment or execution of the generated RooCode workflows or other artifacts.
-   A graphical user interface (GUI); the tool is exclusively CLI-based.
-   Real-time code collaboration, editing, or IDE-like features.
-   Hosting, management, or fine-tuning of LLM models.
-   Direct execution of tests or build processes for the target project.

## 4. Target Users / Audience



-   **Software Developers & Engineering Teams**: Primary users who will leverage the tool to generate configurations and documentation for their projects, particularly those using or planning to use RooCode workflows.
-   **Technical Leads & Architects**: Individuals responsible for defining project structures, development practices, and tooling, who can use the generator to enforce standards and bootstrap project setups.
-   **DevOps Engineers / SREs**: Professionals involved in automating development pipelines and workflows, who might integrate this tool into their automation scripts.
-   **Technical Writers**: Individuals who can benefit from the automated generation of foundational project documentation (e.g., Memory Bank content).

## 5. Key Features / Modules (High-Level)



-   **Project Analysis Engine (`src/core/analysis`)**: This module is responsible for deeply inspecting the target software project. It identifies the technology stack, parses the file and directory structure, analyzes dependencies, and uses Abstract Syntax Tree (AST) parsing (via Tree-sitter) to understand code components like classes, functions, and imports.
-   **LLM Integration & Orchestration (`src/core/llm`, `src/core/application/generator-orchestrator.ts`)**: Manages all interactions with various supported Large Language Model providers. This includes handling API calls, managing prompts, parsing LLM responses, and orchestrating the sequence of generation tasks based on user commands and project analysis.
-   **Artifact Generators (`src/generators`)**: A collection of specialized generators for different types of outputs:
    -   `RoomodesGenerator`: Creates RooCode workflow configuration files.
    -   `SystemPromptsGenerator`: Generates various system prompts for LLMs.
    -   `VSCodeCopilotRulesGenerator`: Produces rules for VSCode Copilot integration.
    -   `AiMagicGenerator`: A more general-purpose generator leveraging LLMs for various content, potentially including the Memory Bank.
-   **Memory Bank Management (`src/memory-bank`)**: This module focuses on creating and populating the "Memory Bank" – a set of structured Markdown documents (Project Overview, Technical Architecture, Developer Guide) that provide comprehensive, AI-generated insights into the analyzed project.
-   **Command-Line Interface (`src/core/cli`)**: Built using `commander` and `inquirer`, this module provides the interactive entry point for users. It parses commands and options, guides users through configuration (if needed), and initiates the appropriate generation processes.
-   **Core Services & DI (`src/core/di`, `src/core/services`, `src/core/config`)**: Provides foundational services such as logging, file operations, template management, configuration loading (for both the generator tool and LLM providers), and a Dependency Injection (DI) container for managing application components and their dependencies.

## 6. Stakeholders / Contacts



-   Abdallah Khalil: Author (`abdallah@nghive.tech`)

## 7. Glossary (Optional)



-   **RooCode**: The target workflow system or methodology for which this tool primarily generates configuration files.
-   **LLM**: Large Language Model. AI models used by this tool for advanced analysis and content generation (e.g., GPT-4, Claude, Gemini).
-   **Memory Bank**: A structured collection of Markdown documents (Project Overview, Technical Architecture, Developer Guide) generated by this tool to provide comprehensive, AI-assisted documentation for a software project.
-   **AST**: Abstract Syntax Tree. A tree representation of the syntactic structure of source code, used by this tool (via Tree-sitter) for in-depth code analysis.
-   **Tree-sitter**: A parser generator tool and an incremental parsing library used to create ASTs for various programming languages.
-   **System Prompts**: Pre-defined instructions or context provided to an LLM to guide its behavior, tone, and output for specific tasks or personas.
-   **Roomodes**: Likely refers to specific operational modes, configurations, or types of workflows within the RooCode system.
-   **CLI**: Command-Line Interface. The text-based interface used to interact with this tool.
-   **DI**: Dependency Injection. A design pattern used in this project to manage object creation and dependencies.