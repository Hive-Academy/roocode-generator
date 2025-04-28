# roocode-generator

A CLI tool to generate RooCode workflow configuration files for any tech stack. This tool aims to streamline the setup process for projects adopting the RooCode methodology by providing an interactive command-line experience, potentially enhanced with Large Language Model (LLM) capabilities for intelligent configuration suggestions.

## Project Overview

The primary purpose of the `roocode-generator` is to simplify and standardize the creation of RooCode workflow configuration files. Key goals include accelerating setup, ensuring consistency, improving developer experience, supporting flexibility across tech stacks, and leveraging LLMs for innovation.

Core features include interactive CLI prompts, generation of standardized configuration files, a modular architecture, LLM integration points via Langchain, and a template engine.

For more detailed information, refer to the [Project Overview](memory-bank/ProjectOverview.md).

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

- `rules`: (Details in other documentation)
- `system-prompts`: (Details in other documentation)
- `roomodes`: (Details in other documentation)
- `vscode-copilot-rules`: Generates VS Code Copilot rules and related configuration.

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

### `roocode generate memory-bank`

This command is the primary tool for generating the core memory bank documentation for your project. When executed, it automatically gathers context from your project's current files and child folders. This context is then passed to an LLM, which uses it to generate and populate the three standard memory bank documentation files: `ProjectOverview.md`, `TechnicalArchitecture.md`, and `DeveloperGuide.md`. The command also ensures that the standard memory bank template files are copied to the output directory, providing a complete set of documentation and templates for your project's memory bank.

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
