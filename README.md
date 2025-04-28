# roocode-generator

A CLI tool to generate RooCode workflow configuration files for any tech stack. This tool aims to streamline the setup process for projects adopting the RooCode methodology by providing an interactive command-line experience, potentially enhanced with Large Language Model (LLM) capabilities for intelligent configuration suggestions.

## Project Overview

The primary purpose of the `roocode-generator` is to simplify and standardize the creation of RooCode workflow configuration files. Key goals include accelerating setup, ensuring consistency, improving developer experience, supporting flexibility across tech stacks, and leveraging LLMs for innovation.

Core features include interactive CLI prompts, generation of standardized configuration files, a modular architecture, LLM integration points via Langchain, and a template engine.

For more detailed information, refer to the [Project Overview](memory-bank/ProjectOverview.md).

## How it Works

This section details how the command-line interface interacts with the core application logic.

1.  **CLI Parsing (`src/core/cli/cli-interface.ts`)**:

    - The `CliInterface` class uses the `commander` library to define the available commands (`generate`, `config`) and their options.
    - When the CLI is executed, `commander` parses the command-line arguments (`process.argv`).
    - Action callbacks associated with each command capture the parsed command name and options, storing them in the `parsedArgs` property of the `CliInterface` instance.

2.  **Application Execution and Command Routing (`src/core/application/application-container.ts`)**:

    - The `ApplicationContainer` serves as the main entry point for the application's runtime logic.
    - During its `run` sequence, it retrieves the parsed command and options from the `CliInterface` instance.
    - The `executeCommand` method within `ApplicationContainer` acts as a router, using a `switch` statement based on the parsed command name.
    - This routing directs execution to specific methods responsible for handling each command, such as `executeGenerateCommand` or `executeConfigCommand`.

3.  **Generator Execution (`src/core/application/generator-orchestrator.ts`)**:
    - The `GeneratorOrchestrator` is responsible for managing and executing the various code generators available in the application.
    - When the `generate` command is routed to the `executeGenerateCommand` method in `ApplicationContainer`, this method delegates the task of running the selected generators to the `GeneratorOrchestrator`.
    - The `GeneratorOrchestrator` identifies the requested generators and executes their respective generation logic.

In summary:

- `cli-interface.ts` handles input parsing.
- `application-container.ts` orchestrates the overall application flow and routes commands.
- `generator-orchestrator.ts` executes the code generation tasks when triggered by the `generate` command via the `application-container.ts`.

## Building the Project

To build and run the `roocode-generator` project locally, follow these steps:

### Prerequisites

- **Node.js**: Ensure you have a compatible version installed (refer to `memory-bank/DeveloperGuide.md` for recommended version).
- **npm** or **yarn**: A package manager.
- **Git**: For cloning the repository.
- **API Keys**: You may need API keys for LLM providers (Anthropic, Google Gemini, OpenAI) if you plan to use or test features requiring LLM interaction.

### Setup

1.  **Clone the repository:**

    ```bash
    git clone <repository-url> # Replace <repository-url> with the actual URL
    cd roocode-generator
    ```

2.  **Install dependencies:**
    Using npm:

    ```bash
    npm install
    ```

3.  **Install globally:**

    ```bash
    npm install -g .
    ```

4.  **Verify installation:**

    Run the following script to verify the global command is installed and accessible:

    ```bash
    ./bin/verify-installation.sh
    ```

    Alternatively, you can check the command directly:

    ```bash
    which roocode
    roocode --version
    ```

    Using yarn:

## Running Tests

To ensure code quality and verify functionality, the project includes a suite of unit and integration tests managed with Jest.

### Running Tests Locally

- Run all tests once:

```bash
npm test
# or
yarn test
```

- Run tests in watch mode (useful during development):

```bash
npm run test:watch
# or
yarn test:watch
```

- Generate test coverage reports:

```bash
npm run test:coverage
# or
yarn test:coverage
```

Coverage reports are output to the `coverage/` directory and include detailed metrics on branches, functions, lines, and statements.

### Additional Resources

For comprehensive testing guidelines, coverage goals, and maintenance best practices, refer to the [Developer Guide - Quality and Testing](memory-bank/DeveloperGuide.md#quality-and-testing).
`bash
    yarn install
    `

3.  **Prepare Git Hooks:**
    ```bash
    npm run prepare
    # or
    yarn prepare
    ```

### Building

Compile the TypeScript code:

```bash
npm run build
# or
yarn build
```

This will compile the source files from `src/` into the `dist/` directory.

For more detailed developer setup and workflow information, see the [Developer Guide](memory-bank/DeveloperGuide.md).

## Commands

The `roocode-generator` provides several commands to manage configuration and execute generators.

### `roocode config`

This command allows you to configure the LLM provider settings for the generator. If no options are provided, it will launch an interactive configuration process.

**Usage:**

```bash
roocode config [options]
```

**Options:**

- `--provider <name>`: Set the LLM provider (e.g., `openai`, `google-genai`, `anthropic`).
- `--apiKey <key>`: Set the API key for the selected provider.
- `--model <name>`: Set the specific model name to use.

**Interactive Mode:**

If you run `roocode config` without any options, it will guide you through selecting a provider, entering your API key, and specifying a model name, similar to the functionality previously found in `old-code/bin/roocode-llm-config.ts`.

**Examples:**

Start the interactive configuration:

```bash
roocode config
```

Set configuration using command-line options:

```bash
roocode config --provider openai --apiKey sk-YOUR_KEY --model gpt-4o
```

### `roocode generate [generator-name...]`

This command executes one or more code and configuration generators. You can specify which generators to run by providing their names as arguments. If no generator names are provided, the command will attempt to run all registered generators (excluding those with specific subcommands like `generate memory-bank`).

**Usage:**

```bash
roocode generate [generator-name...]
```

**Available Generator Identifiers:**

- `ai-magic`: Performs project analysis, generates coding standard rules inspired by project context, and generates memory bank documentation (Project Overview, Technical Architecture, Developer Guide) using the Memory Bank Service.
- `rules`: Generates coding standard rules based on project context (legacy, functionality now part of `ai-magic`).
- `system-prompts`: (Details in other documentation)
- `roomodes`: (Details in other documentation)
- `vscode-copilot-rules`: Generates VS Code Copilot rules and related configuration.

Note: The `memory-bank` generator has been refactored into a service used by the `ai-magic` generator. Use `roocode generate ai-magic` to generate memory bank documents.
**Examples:**

Run all available generators:

```bash
roocode generate
```

Run only the `vscode-copilot-rules` generator:

```bash
roocode generate vscode-copilot-rules
```

Run the `rules` and `system-prompts` generators:

```bash
roocode generate rules system-prompts
```

Run the `ai-magic` generator (includes memory bank generation):

```bash
roocode generate ai-magic
```

### ~~`roocode generate memory-bank`~~ (Deprecated)

**Note:** This command is deprecated. The functionality for generating memory bank documentation (`ProjectOverview.md`, `TechnicalArchitecture.md`, `DeveloperGuide.md`) is now integrated into the `ai-magic` generator. Please use `roocode generate ai-magic` instead.

_(Original description kept for historical reference)_
~~This command was the primary tool for generating the core memory bank documentation for your project. When executed, it automatically gathered context from your project's current files and child folders. This context was then passed to an LLM, which used it to generate and populate the three standard memory bank documentation files: `ProjectOverview.md`, `TechnicalArchitecture.md`, and `DeveloperGuide.md`. The command also ensured that the standard memory bank template files were copied to the output directory, providing a complete set of documentation and templates for your project's memory bank.~~
**Usage:**

```bash
roocode generate memory-bank [options]
```

**Options:**

- `--context <paths>`: Comma-separated paths to files or directories to include as _additional_ context for the LLM. By default, the generator automatically includes context from the project's source files and folders. If not provided, the CLI will prompt to optionally add more context paths. (Referenced from `src/commands/generate-memory-bank.command.ts`)
- `--output <path>`: The output path for the generated files and the copied templates folder. If not provided, the files will be saved in the current working directory or a `memory-bank` subdirectory within it. (Referenced from `src/commands/generate-memory-bank.command.ts`)

**Examples:**

Generate all memory bank files using default project context:

```bash
roocode generate memory-bank
```

Generate all memory bank files, providing specific additional context files:

```bash
roocode generate memory-bank --context ./src/core,./src/commands
```

Generate all memory bank files and save them to a specific directory:

```bash
roocode generate memory-bank --output ./docs/memory-bank
```

For more technical details on the generator components, refer to the [Technical Architecture](memory-bank/TechnicalArchitecture.md).

### Release Process

1. Make sure your branch is up to date with `main`.
2. Run all tests and lint checks locally.
3. Merge your feature branch to `main` via PR.
4. Bump the version and tag:
   ```bash
   npm version patch   # or minor/major
   git push --follow-tags
   ```
5. CI will:
   - Run lint, format, and tests
   - Publish to npm (if NPM_TOKEN is set)
   - Create a GitHub Release with notes
