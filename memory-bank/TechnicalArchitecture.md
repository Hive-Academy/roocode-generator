---
title: Technical Architecture
version: 1.0.0
lastUpdated: 2023-10-27 # Replace with current date
type: core-documentation
category: architecture
---

# Technical Architecture

## Overview

`roocode-generator` implements a **Modular CLI with LLM Integration** architecture. This document outlines the key technical components and design decisions for this CLI tool, which generates RooCode workflow configuration files for various tech stacks.

See [[ProjectOverview]] for high-level project information.

## System Design

The system is designed as a command-line application that takes user input, potentially interacts with Large Language Models (LLMs) via Langchain, processes templates, and generates configuration files.

### Architecture Diagram

mermaid
graph TD
A[User] -- Runs CLI command --> B(CLI Interface);
B -- Parses args/prompts --> C{Command Handler};
C -- Loads config/templates --> D[Filesystem];
C -- Needs AI generation --> E{LLM Interaction Module};
E -- Uses Langchain --> F[LLM APIs (OpenAI, Anthropic, Google)];
F -- Returns generated content --> E;
E -- Returns content to Handler --> C;
C -- Processes templates & data --> G{Template Engine};
G -- Generates file content --> H{File Generator};
H -- Writes files --> D;
C -- Displays output/status --> I[Terminal Output (chalk, ora)];
B -- Uses --> I;
_Diagram illustrating the flow from user command to file generation, including optional LLM interaction._

### Core Components

- **CLI Interface (`inquirer`, command parsing logic):** Handles user input, command parsing, and orchestrates the overall workflow.
- **Command Handlers:** Specific logic for different generation commands (e.g., `generate`, `init`). Organised based on the Feature-based folder structure.
- **Configuration Loader:** Reads project-specific configuration or defaults.
- **Template Engine:** Processes template files, replacing custom placeholders with generated or configured values.
- **LLM Interaction Module (`langchain`, `@langchain/*` providers):** Abstract layer to interact with various LLM providers (OpenAI, Anthropic, Google GenAI) for intelligent content generation or suggestions.
- **File Generator:** Takes processed template content and writes it to the appropriate files in the target directory structure.
- **Utility Modules (`chalk`, `ora`):** Provide enhanced terminal output, including colored text and spinners for progress indication.

## Technology Stack

### Primary Stack {#Stack}

- **Frontend**: N/A (Command Line Interface)
- **Backend**: Node.js (Runtime Environment)
- **Database**: N/A (State managed through configuration files and user input)

### Infrastructure

- **Cloud/Hosting**: Runs on the User's Local Machine. Distributed via npm.
- **CI/CD Pipeline**: GitHub Actions (or similar) utilizing `semantic-release` for automated versioning and publishing, and `commitlint` for commit message standards.
- **Monitoring**: N/A

### Development Tools

- **Testing**: None (Currently specified as "None").
- **Code Quality**:
  - `eslint`: Linting JavaScript/TypeScript code.
  - `prettier`: Code formatting.
  - `typescript`: Static typing.
  - `@commitlint/cli`: Enforcing conventional commit messages.
  - `husky`: Git hooks management (e.g., for pre-commit checks).
- **Build Tools**:
  - `typescript` (tsc): Compiling TypeScript to JavaScript.
  - `copyfiles`: Utility for copying non-TS files during build.

## Integration and Data Flow

### External Services

- **LLM APIs:** Interacts with external Large Language Model APIs (e.g., OpenAI, Anthropic, Google Gemini) via the Langchain library for specific generation tasks. Requires API keys.

### Integration Points

- **User Terminal:** Primary interface for input and output.
- **Local Filesystem:** Reads template files, configuration files, and writes generated output files.
- **LLM APIs:** Sends prompts and receives generated text data via HTTPS requests managed by Langchain.

### Data Flow

1.  **User Input:** The user executes a command via the terminal (e.g., `roocode generate <stack>`).
2.  **Parsing:** The CLI framework parses the command, arguments, and options. Interactive prompts (`inquirer`) may gather further details.
3.  **Configuration Loading:** Relevant configuration files (project-specific or defaults) are loaded.
4.  **LLM Interaction (Optional):** If the command requires AI assistance, the LLM Interaction Module constructs prompts using user input and configuration, sends them to the selected LLM via Langchain, and receives the response.
5.  **Template Processing:** The Template Engine combines loaded configurations, user inputs, and potential LLM outputs with predefined template files.
6.  **File Generation:** The File Generator module takes the processed content and writes it to the target files and directories based on the chosen stack and Feature-based structure.
7.  **Feedback:** Status updates, progress indicators (`ora`), and results are displayed to the user in the terminal (`chalk`).

## Key Technical Decisions

### Architecture Choices

- **Modular CLI:** Designed for easy extension with new commands, tech stacks, or LLM providers.
- **LLM Abstraction (Langchain):** Using Langchain provides flexibility to switch between or support multiple LLM providers without major code changes.
- **Configuration-Driven:** Generation logic relies heavily on configuration files and templates, making it adaptable to different tech stacks.
- **TypeScript:** Chosen for improved code maintainability, type safety, and developer experience in a growing codebase.

### Design Patterns

- **Generator Pattern:** The core purpose of the tool is to generate code/configuration.
- **Configuration-Driven Development:** Behavior is significantly controlled by external configuration and templates.
- **Template Engine (Custom Placeholders):** Uses a system (likely custom string replacement or a minimal library) to inject dynamic data into static templates.
- **LLM Abstraction:** Isolates LLM interaction logic behind a consistent interface.
- **Command Pattern:** CLI commands map to specific handler functions/modules.

### Security Considerations

- **API Key Management:** Sensitive LLM API keys must be handled securely. Users should be instructed to use environment variables or secure configuration methods, not hardcoding keys.
- **Dependency Security:** Regularly audit dependencies (`npm audit`) for known vulnerabilities.
- **Input Sanitization:** While primarily a developer tool, basic checks on input path manipulation could prevent accidental file overwrites outside the intended scope. (Low severity for typical use).

## Development Guidelines

Detailed setup and practices in [[DeveloperGuide]].

### Standards

- **Coding Style:** Enforced by ESLint and Prettier. Configuration files are included in the repository.
- **Commit Messages:** Conventional Commits enforced by `@commitlint/cli` via Husky hooks.
- **Typing:** Strict TypeScript usage is encouraged.

### Best Practices

- **Trunk-Based Development:** All development happens on the main branch with short-lived feature branches if necessary. Releases are tagged automatically.
- **Modularity:** Keep components focused and decoupled. New tech stacks or features should ideally be added as separate modules.
- **Error Handling:** Provide clear error messages to the user.
- **User Feedback:** Utilize `chalk` and `ora` appropriately to inform the user about the tool's progress and status.

### Dependencies

#### Runtime Dependencies

- `@langchain/anthropic`: Langchain integration for Anthropic models.
- `@langchain/core`: Core Langchain abstractions and utilities.
- `@langchain/google-genai`: Langchain integration for Google GenAI models.
- `@langchain/openai`: Langchain integration for OpenAI models.
- `langchain`: Main Langchain library orchestrating LLM interactions.
- `chalk`: Terminal string styling.
- `inquirer`: Interactive command-line user interfaces.
- `ora`: Elegant terminal spinners.

#### Development Dependencies

- `typescript`: Language compiler and type checker.
- `eslint`: Code linter.
- `prettier`: Code formatter.
- `semantic-release`: Automated version management and package publishing.
- `husky`: Git hooks manager.
- `@commitlint/cli`: Linter for commit messages.
- `copyfiles`: Utility to copy files during the build process.
