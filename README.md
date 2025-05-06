# roocode-generator

A CLI tool to generate RooCode workflow configuration files for any tech stack. This tool aims to streamline the setup process for projects adopting the RooCode methodology by providing an interactive command-line experience, potentially enhanced with Large Language Model (LLM) capabilities for intelligent configuration suggestions.

## Project Overview

`roocode-generator` is a Node.js command-line interface (CLI) tool built with TypeScript, designed to streamline and standardize the creation of configuration files and documentation for projects adopting the RooCode methodology. It leverages an interactive CLI, a modular generator architecture, and integrates with Large Language Models (LLMs) via Langchain to provide intelligent, context-aware generation capabilities.

Key goals include:

- Accelerating setup by automating file generation.
- Ensuring consistency in configurations and documentation.
- Improving developer experience with an intuitive CLI.
- Supporting flexibility across different technology stacks.
- Leveraging LLMs for context-aware generation (rules, documentation).

Core features include:

- Interactive CLI (`generate`, `config` commands).
- Modular generator architecture (`AiMagicGenerator`, `MemoryBankService`, etc.).
- LLM integration via Langchain (OpenAI, Google GenAI, Anthropic).
- Project context analysis.
- Template system for generation.
- Configuration management (`roocode-config.json`, `llm.config.json`).

For more detailed information, refer to the [Project Overview](./memory-bank/ProjectOverview.md).

## How it Works

The application follows a Modular CLI Architecture with LLM Integration. Here's the core flow when a command like `roocode generate --generators memory-bank` is run:

1.  **Initialization:** The CLI entry point (`bin/roocode-generator.js`) starts the application, sets up module aliasing, environment variables, and the Dependency Injection (DI) container.
2.  **DI Registration:** Services are registered in modules (`@core/di/modules/*`).
3.  **Application Bootstrap:** The main `ApplicationContainer` (`@core/application/application-container.ts`) is resolved.
4.  **Command Parsing (`CliInterface`):** Uses `commander` to parse arguments (e.g., `generate`, `--generators memory-bank`).
5.  **Configuration Loading:** `ProjectConfigService` and `LLMConfigService` load settings.
6.  **Command Routing (`ApplicationContainer`):** Routes the `generate` command to `executeGenerateCommand`.
7.  **Generator Orchestration (`GeneratorOrchestrator`):** Resolves the primary `AiMagicGenerator` (`@generators/ai-magic-generator.ts`) and passes the `generatorType` (`memory-bank` in this example).
8.  **`AiMagicGenerator` Execution:**
    - Analyzes project context using `ProjectAnalyzer`.
    - Routes internally based on `generatorType`:
      - If `memory-bank`: Calls `MemoryBankService` (`@memory-bank/memory-bank-service.ts`) to generate documentation.
      - If `roo`: Executes logic to generate RooCode rules.
      - If `cursor`: Executes placeholder logic.
    - Uses `LLMAgent` for LLM interactions and `FileOperations` to write files.
9.  **User Feedback:** `ProgressIndicator` (`ora`) and `LoggerService` (`chalk`) provide updates.
10. **Completion/Error Handling:** Uses a `Result` type for explicit success/failure.

For a more detailed diagram and component breakdown, see the [Technical Architecture](./memory-bank/TechnicalArchitecture.md).

## Setup

To set up the `roocode-generator` project for local development, follow these steps:

### Prerequisites

- **Node.js**: Version 18.x or higher recommended (check `engines` in `package.json`, currently `>=16`).
- **npm**: Comes bundled with Node.js.
- **Git**: For version control.
- **API Keys**: Required for LLM providers (Anthropic, Google Gemini, OpenAI) if using LLM features.

### Local Setup Steps

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/Hive-Academy/roocode-generator.git
    cd roocode-generator
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up environment variables:**

    - Create a `.env` file in the project root.
    - Add your LLM API keys:
      ```env
      # .env file
      ANTHROPIC_API_KEY=your_anthropic_api_key
      GOOGLE_API_KEY=your_google_api_key
      OPENAI_API_KEY=your_openai_api_key
      ```
    - **Note:** `.env` is gitignored. Do not commit it.

4.  **Prepare Git Hooks:**
    Husky hooks (for linting, commit messages) are installed automatically via the `prepare` script after `npm install`. You can run it manually if needed:
    ```bash
    npm run prepare
    ```

Now you can run the CLI locally using `npm run dev -- <args>` or build it using `npm run build`.

For more detailed developer setup and workflow information, see the [Developer Guide](./memory-bank/DeveloperGuide.md).

## Running Tests

The project uses Jest for unit and integration testing.

- **Run all tests:**

  ```bash
  npm test
  ```

- **Run tests in watch mode:**

  ```bash
  npm run test:watch
  ```

- **Generate coverage report:**
  ```bash
  npm run test:coverage
  ```
  Coverage reports are generated in the `coverage/` directory. The project aims for >=80% coverage.

For comprehensive testing guidelines, refer to the [Developer Guide - Quality and Testing](./memory-bank/DeveloperGuide.md#quality-and-testing).

## Commands

The `roocode-generator` provides the following main commands:

### `roocode config`

Manages LLM provider settings (`llm.config.json`).

**Usage:**

```bash
roocode config [options]
```

**Options:**

- `--provider <name>`: Set provider (`openai`, `google-genai`, `anthropic`).
- `--apiKey <key>`: Set API key.
- `--model <name>`: Set model name.

**Interactive Mode:**
Running `roocode config` without options starts an interactive setup guide.

**Examples:**

```bash
# Interactive setup
roocode config

# Set via options
roocode config --provider openai --apiKey sk-YOUR_KEY --model gpt-4o
```

### `roocode generate`

Executes the primary `AiMagicGenerator` to generate content based on project analysis and LLM interaction. The type of content generated is controlled by the `--generators` flag.

**Usage:**

```bash
roocode generate --generators <type> [options]
```

**Required Flag:**

- `--generators <type>`: Specifies the type of content to generate. Must be one of:
  - `memory-bank`: Generates core documentation (`ProjectOverview.md`, `TechnicalArchitecture.md`, `DeveloperGuide.md`) using the `MemoryBankService`.
  - `roo`: Generates RooCode rules (`.roo/rules-code/rules.md`) based on project context.
  - `cursor`: (Placeholder for future functionality).

**Note:** Running `roocode generate` without the `--generators` flag is currently not the primary intended use case and might have undefined behavior. Always specify the type of generation needed.

**Examples:**

```bash
# Generate Memory Bank documentation
roocode generate --generators memory-bank

# Generate RooCode rules
roocode generate --generators roo
```

### Other Generators (Direct Invocation - Less Common)

While `ai-magic` (triggered via `roocode generate --generators <type>`) is the main entry point, other specific generators exist and might be invoked directly if needed, though this is less common:

- `roocode generate system-prompts`: Creates system prompt files.
- `roocode generate roomodes`: Generates the `.roomodes` file.
- `roocode generate vscode-copilot-rules`: Configures VS Code Copilot settings.

**Example:**

```bash
# Generate only the .roomodes file (less common)
roocode generate roomodes
```

### ~~`roocode generate memory-bank`~~ (Deprecated)

**Note:** The standalone `roocode generate memory-bank` command is deprecated. Use `roocode generate --generators memory-bank` instead. The old options (`--context`, `--output`) are no longer applicable in the new workflow.

For more technical details, refer to the [Technical Architecture](./memory-bank/TechnicalArchitecture.md).

## Release Process

This project uses **`semantic-release`** for automated version management and package publishing.

1.  **Commit Changes:** Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification for all commit messages on the `main` branch (enforced by `commitlint`).
    - `fix:` commits trigger patch releases.
    - `feat:` commits trigger minor releases.
    - Commits with `BREAKING CHANGE:` in the body trigger major releases.
2.  **CI Automation:** When changes are pushed or merged to `main`, the CI pipeline (e.g., GitHub Actions) automatically runs `semantic-release`.
3.  **`semantic-release` Steps:**
    - Analyzes commits since the last release.
    - Determines the next semantic version number.
    - Generates changelog entries.
    - Tags the release in Git.
    - Publishes the package to npm (requires `NPM_TOKEN` secret in CI).
    - Creates a GitHub release with the generated notes.

Manual version bumping (`npm version`) and publishing (`npm publish`) are **not** part of the standard workflow.
