---
title: Developer Guide
version: 1.0.0
lastUpdated: 2023-10-27T11:16:24.457Z
type: core-documentation
category: development
---

# Developer Guide

This guide provides instructions for setting up the development environment, understanding the project structure, and following the development workflow for the **roocode-generator** project.

## Development Setup

### Prerequisites

Before starting development, ensure you have the following installed:

- **Node.js**: (Specify recommended version, e.g., >= 18.x) - Download from [nodejs.org](https://nodejs.org/)
- **npm** or **yarn**: Comes bundled with Node.js or install yarn via `npm install -g yarn`.
- **Git**: For version control. Download from [git-scm.com](https://git-scm.com/)
- **API Keys**: You will need API keys for the desired LLM providers (Anthropic, Google Gemini, OpenAI) you intend to use or test with.

### Environment Setup

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd roocode-generator

    ```

2.  **Install dependencies:**
    Using npm:

    ```bash
    npm install
    ```

    Using yarn:

    ```bash
    yarn install
    ```

3.  **Set up environment variables:**

    - Create a `.env` file in the project root (`.`).
    - Add the necessary API keys for the LLM services:
      ```env
      # Example .env file
      ANTHROPIC_API_KEY=your_anthropic_api_key
      GOOGLE_API_KEY=your_google_api_key
      OPENAI_API_KEY=your_openai_api_key
      ```
    - **Note:** Never commit your `.env` file to version control. It's included in `.gitignore` by default.

4.  **Prepare Git Hooks:**
    Husky is used to manage Git hooks for linting and commit message validation. Ensure hooks are installed:
    ```bash
    npm run prepare
    # or
    yarn prepare
    ```

### Required Tools

- **Code Editor**: Visual Studio Code (VS Code) is recommended, with extensions for ESLint, Prettier, and TypeScript.
- **TypeScript**: `typescript` (Dev dependency) - For static typing.
- **ESLint**: `eslint` (Dev dependency) - For identifying and fixing code style issues.
- **Prettier**: `prettier` (Dev dependency) - For automatic code formatting.
- **Husky**: `husky` (Dev dependency) - For managing Git hooks.
- **Commitlint**: `@commitlint/cli` (Dev dependency) - For enforcing conventional commit message format.
- **Semantic Release**: `semantic-release` (Dev dependency) - For automated version management and package publishing.

## Project Structure

The project follows a **Feature-based** folder structure to organize code logically:

roocode-generator/
├── src/ # Main source code directory
│ ├── cli/ # Core CLI entry points and command handling
│ ├── commands/ # Specific CLI command implementations (feature-based)
│ ├── core/ # Core logic, abstractions (e.g., LLM interaction, templating)
│ ├── generators/ # Logic specific to generating different types of files/configs
│ ├── templates/ # Template files used for generation
│ ├── types/ # Shared TypeScript type definitions
│ ├── utils/ # Utility functions
│ └── index.ts # Main application entry point
├── config/ # Configuration files (e.g., default settings)
├── tests/ # (Future) Test files (unit, integration)
├── .env.example # Example environment variables file
├── .eslintrc.js # ESLint configuration
├── .gitignore # Git ignore rules
├── .prettierrc.js # Prettier configuration
├── commitlint.config.js # Commitlint configuration
├── husky.config.js # Husky configuration (or in package.json)
├── package.json # Project metadata and dependencies
├── tsconfig.json # TypeScript compiler configuration
└── README.md # Project overview
└── DeveloperGuide.md # This file
└── TechnicalArchitecture.md # Detailed architecture document

Refer to [[TechnicalArchitecture#Core-Components]] for detailed component information about the **Modular CLI with LLM Integration** architecture.

## Development Workflow

### Process Overview

This project uses a **Trunk-based** development workflow.

1.  **Sync with Main:** Always ensure your local `main` branch is up-to-date before starting work:
    ```bash
    git checkout main
    git pull origin main
    ```
2.  **Create a Feature Branch (Optional but Recommended for larger changes):** While Trunk-based often involves direct commits to `main` for small changes, larger features or complex bug fixes should be done on short-lived feature branches:
    ```bash
    git checkout -b feature/your-feature-name
    # or
    git checkout -b fix/your-bug-fix
    ```
3.  **Develop:** Implement the feature or fix the bug. Write code following the guidelines below.
4.  **Commit Changes:** Make small, logical commits using the Conventional Commits format (enforced by Commitlint):
    ```bash
    git add .
    git commit -m "feat: add support for YAML generation"
    # or
    git commit -m "fix: resolve issue with template parsing"
    # etc.
    ```
    Commit messages will be linted automatically on `git commit` via Husky hooks.
5.  **Push Changes:**
    - For direct commits to `main`: `git push origin main`
    - For feature branches: `git push origin feature/your-feature-name`
6.  **Create Pull Request (if using feature branches):** Open a Pull Request (PR) from your feature branch to `main`. Ensure CI checks pass.
7.  **Code Review (if applicable):** Have your code reviewed by team members. Address feedback.
8.  **Merge:** Merge the PR into `main` (usually via squash merge). Delete the feature branch after merging.
9.  **Release:** `semantic-release` automatically handles versioning and publishing based on commit messages on the `main` branch when run in the CI environment.

### Task Management

- **Requirements:** Use the [[memory-bank/templates/task-description-template]] to define new tasks or features.
- **Planning:** Outline implementation steps using the [[memory-bank/templates/implementation-plan-template]].
- **Completion:** Document completed work with the [[memory-bank/templates/completion-report-template]].

## Code Guidelines

### Standards and Practices

- **Language**: Use TypeScript for all new code.
- **Style & Formatting**: Adhere to the rules defined in `.eslintrc.js` and `.prettierrc.js`. Run `npm run lint` and `npm run format` regularly. Formatting is automatically applied on pre-commit hooks.
- **Naming Conventions**: Follow standard TypeScript/JavaScript naming conventions (e.g., `camelCase` for variables/functions, `PascalCase` for classes/types/interfaces).
- **Modularity**: Design components to be modular and reusable. Leverage the **Generator Pattern**, **Configuration-Driven** design, and **LLM Abstraction** as outlined in the architecture.
- **Error Handling**: Implement robust error handling. Use meaningful error messages.
- **Logging**: Use a consistent logging strategy (consider `chalk` for styled console output).
- **Commit Messages**: Follow the [Conventional Commits specification](https://www.conventionalcommits.org/). This is enforced by Commitlint.

### Quality and Testing

- **Testing Approach**: Currently, the project has **None** specified for formal automated testing. Future plans include implementing unit and integration tests using a framework like Jest or Vitest. Manual testing of the CLI commands is required for now.
- **Coverage Goals**: **N/A** - Test coverage goals will be defined once a testing strategy is implemented.
- **Validation**:
  - **Static Analysis**: Use `npm run lint` to check for code style and potential errors.
  - **Type Checking**: Use `npm run typecheck` (or rely on `tsc` during the build) to ensure type safety.

## Common Operations

### Development Tasks

Standard npm scripts are configured in `package.json`:

- **Run in development mode (with hot-reloading if configured):**
  ```bash
  npm run dev
  # or
  yarn dev
  ```
- **Build the project:**
  ```bash
  npm run build
  # or
  yarn build
  ```
- **Lint code:**
  ```bash
  npm run lint
  # or
  yarn lint
  ```
- **Format code:**
  ```bash
  npm run format
  # or
  yarn format
  ```
- **Run type checking:**
  ```bash
  npm run typecheck
  # or
  yarn typecheck
  ```
- **(Future) Run tests:**
  ```bash
  npm test
  # or
  yarn test
  ```

### Build and Deploy

- **Build Process**: The build process compiles TypeScript code from `src/` to JavaScript in the `dist/` directory using the TypeScript compiler (`tsc`). Configuration is in `tsconfig.json`. Copying non-TS assets (like templates) is handled by `copyfiles`. This is triggered by `npm run build`.
- **Deployment**: Deployment and package publishing to npm are automated using `semantic-release`. This typically runs in a CI/CD pipeline (e.g., GitHub Actions) on pushes/merges to the `main` branch. It analyzes commit messages since the last release, determines the next version number, generates changelogs, tags the release, and publishes the package. Manual publishing is generally discouraged.

## Troubleshooting

### Common Issues

- **Dependency Installation Errors:**
  - Ensure you have the correct Node.js and npm/yarn versions.
  - Try removing `node_modules` and `package-lock.json` (or `yarn.lock`) and reinstalling: `rm -rf node_modules && rm package-lock.json && npm install` (or `yarn install`).
  - Check for network connectivity issues.
- **Build Failures (`npm run build`):**
  - Check the console output for specific TypeScript errors (`tsc`).
  - Ensure all types are correctly defined and imported.
- **Linting/Formatting Errors:**
  - Run `npm run lint -- --fix` or `npm run format` to automatically fix issues where possible.
  - Consult the ESLint/Prettier documentation or configuration files for specific rule violations.
- **Git Hook Failures:**
  - Ensure Husky is set up correctly (`npm run prepare`).
  - Check the specific hook script that failed (e.g., pre-commit, commit-msg). Often related to linting or commit message format errors.
- **LLM API Key Issues:**
  - Verify that the `.env` file exists in the project root and contains the correct API keys.
  - Ensure the environment variables are loaded correctly by the application (dotenv might be used).
  - Check the specific LLM provider's documentation for API key validity and usage limits.

### Support Resources

- **Check Logs**: Look for detailed error messages in the console output.
- **Project Issues**: Search existing issues or open a new one in the project's issue tracker (e.g., GitHub Issues).
- **Team Channel**: Contact the development team via the designated communication channel (e.g., Slack, Teams).
- **Langchain Documentation**: Refer to the documentation for `@langchain/*` packages for issues related to LLM interactions.

## Environment Management

### Infrastructure

The project primarily runs as a local CLI tool. Deployment infrastructure relates to the CI/CD pipeline (e.g., GitHub Actions) responsible for building, testing (future), and publishing the package to npm.

See [[TechnicalArchitecture#Infrastructure]] for detailed infrastructure setup related to CI/CD and package distribution.

### Environments

- **Development (Local):** Your local machine where you write and test code. Uses `.env` file for API keys. May use development-specific configurations.
- **CI (Continuous Integration):** Environment like GitHub Actions. Runs linters, builds, (future) tests. Uses secrets management for API keys during automated release process.
- **Production (npm Registry):** The published package available via `npm install roocode-generator`. Users install and run it in their own environments.

Environment-specific configurations (like API endpoints or specific feature flags) should be managed through environment variables or dedicated configuration files loaded based on the environment context (e.g., `NODE_ENV`).

```

```
