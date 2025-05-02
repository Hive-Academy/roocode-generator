# Developer Guide

## Setup

This section outlines the steps required to set up your development environment for working with this project.

### Prerequisites

Before you begin, ensure you have the following installed on your system:

*   **Node.js:** We recommend using the latest LTS version. You can download it from [https://nodejs.org/](https://nodejs.org/).
*   **npm:** npm is included with Node.js. Verify your installation by running `npm -v` in your terminal.

### Installation

1.  **Clone the repository:**
    git clone <repository_url>
    cd <repository_name>
    Replace `<repository_url>` with the actual URL of the project repository and `<repository_name>` with the name of the cloned directory.

2.  **Install dependencies:**
    ```bash
    npm install
    ```
    This command will install all the project's dependencies listed in `package.json`.

### Configuration

The project uses several configuration files located in the root directory:

*   `package.json`: Project metadata, scripts, and dependencies.
*   `.eslintrc.js`: ESLint configuration for code linting.
*   `tsconfig.json`: TypeScript compiler configuration.
*   `jest.config.js`: Jest configuration for testing.
*   `.prettierrc.json`: Prettier configuration for code formatting.
*   `.huskyrc.json`: Husky configuration for Git hooks.
*   `.commitlintrc.json`: Commitlint configuration for commit message linting.
*   `vite.config.ts`: Vite configuration for building.

You generally do not need to modify these files unless you have a specific reason to change the project's build, linting, or testing setup.

**Environment Variables:**

The project uses `dotenv` for managing environment variables. Create a `.env` file in the root directory to store sensitive information or configuration specific to your environment. Refer to any existing `.env.example` file for required variables.

## Development Workflow

This section describes the typical development workflow for contributing to this project.

### Branching Strategy

We follow a standard Git branching strategy, typically based on Git Flow or a similar model.

*   **`main`:** Represents the latest stable release.
*   **`develop`:** The main development branch where new features are integrated.
*   **Feature branches:** Created from `develop` for developing new features. Name them descriptively (e.g., `feat/add-user-authentication`).
*   **Bugfix branches:** Created from `main` or a release branch to fix bugs. Name them descriptively (e.g., `fix/resolve-login-issue`).

### Making Changes

1.  **Pull the latest changes:**
    ```bash
    git checkout develop
    git pull origin develop
    ```
2.  **Create a new branch:**
    ```bash
    git checkout -b <your-branch-name>
    ```
    Replace `<your-branch-name>` with a descriptive name for your feature or bugfix.
3.  **Implement your changes:** Write your code, ensuring it adheres to the project's coding standards.
4.  **Test your changes:** Run the project's tests to ensure your changes haven't introduced regressions. See the Testing section for details.
5.  **Commit your changes:**
    ```bash
    git add .
    git commit -m "feat: Add new feature"
    ```
    Follow the Conventional Commits specification for your commit messages. Husky and Commitlint are configured to enforce this.
6.  **Push your branch:**
    ```bash
    git push origin <your-branch-name>
    ```
7.  **Create a Pull Request (PR):** Open a PR from your branch to the `develop` branch. Provide a clear description of your changes.

### Building the Project

The project uses Vite for building.

*   **Development build:**
    ```bash
    npm run dev
    ```
    This will start a development server with hot module replacement.
*   **Production build:**
    ```bash
    npm run build
    ```
    This will generate optimized production-ready files in the `dist` directory.

### Linting and Formatting

We use ESLint and Prettier to maintain code quality and consistency.

*   **Linting:**
    ```bash
    npm run lint
    ```
    This command will check your code for potential errors and style violations.
*   **Formatting:**
    ```bash
    npm run format
    ```
    This command will automatically format your code according to the Prettier configuration.

It's recommended to configure your IDE to automatically run ESLint and Prettier on save.

## Best Practices

Adhering to these best practices will help maintain a consistent and high-quality codebase.

### Coding Standards

*   **TypeScript:** Write code in TypeScript to leverage static typing and improve code maintainability.
*   **ESLint and Prettier:** Always run the linters and formatters before committing your code.
*   **Meaningful Variable and Function Names:** Use descriptive names that clearly indicate the purpose of variables and functions.
*   **Keep Functions Small and Focused:** Each function should ideally perform a single, well-defined task.
*   **Avoid Global Variables:** Minimize the use of global variables to prevent unintended side effects.
*   **Write Clear and Concise Code:** Prioritize readability and simplicity.
*   **Add Comments Where Necessary:** Explain complex logic or non-obvious parts of the code.

### Project Structure

The project follows a standard structure:

*   `bin/`: Contains the main executable script (`roocode-generator.js`).
*   `src/`: Contains the source code of the project.
*   `__tests__/`: Contains the project's test files.
*   Configuration files are located in the root directory.

Organize your code within the `src/` directory logically based on features or modules.

### Important APIs

The project utilizes several external libraries, notably those from the LangChain ecosystem for interacting with language models. Familiarize yourself with the documentation of the following key dependencies:

*   `langchain`: The core LangChain library.
*   `@langchain/core`: Core components of LangChain.
*   `@langchain/openai`, `@langchain/anthropic`, `@langchain/google-genai`: Integrations with different language model providers.
*   `commander`: For building command-line interfaces.
*   `inquirer`: For interactive command-line prompts.
*   `chalk`: For styling terminal output.
*   `ora`: For displaying spinners in the terminal.
*   `dotenv`: For loading environment variables.

Understanding how these libraries are used within the codebase is crucial for development.

### Error Handling

Implement robust error handling to gracefully manage unexpected situations. Use `try...catch` blocks and provide informative error messages.

### Asynchronous Operations

Use `async/await` for handling asynchronous operations to improve code readability and maintainability.

## Testing

Testing is an essential part of the development process to ensure the project's reliability.

### Testing Framework

The project uses Jest as its testing framework.

### Running Tests

*   **Run all tests:**
    ```bash
    npm test
    ```
*   **Run tests with coverage report:**
    ```bash
    npm run test:coverage
    ```
    This will generate a coverage report in the `coverage` directory.

### Writing Tests

*   Write unit tests for individual functions and modules.
*   Write integration tests to verify the interaction between different parts of the system.
*   Place your test files in the `__tests__` directory, mirroring the structure of your source code in `src`.
*   Use descriptive names for your test files and test cases.
*   Aim for high test coverage, but prioritize testing critical functionality.

## Deployment

This section outlines the deployment process for the project.

### Build for Production

Before deploying, build the project for production:

```bash
npm run build
```
This will create the production-ready files in the `dist` directory.

### Deployment Steps

The specific deployment steps will depend on the target environment (e.g., npm package, standalone application).

**For publishing to npm:**

The project is configured to use Semantic Release for automated versioning and publishing to npm based on commit messages.

1.  Ensure your commit messages follow the Conventional Commits specification.
2.  Push your changes to the `main` branch (or the configured release branch).
3.  Semantic Release will automatically:
    *   Analyze commit messages to determine the next version.
    *   Generate release notes.
    *   Create a Git tag.
    *   Publish the new version to npm.
    *   Create a GitHub release.

**For standalone application deployment:**

If the project is intended to be run as a standalone application, you will need to deploy the contents of the `dist` directory to your target environment. This might involve:

*   Copying the files to a server.
*   Configuring a process manager (e.g., PM2, systemd) to run the main executable (`bin/roocode-generator.js`).
*   Ensuring necessary environment variables are set in the production environment.

Consult the documentation for your specific deployment environment for detailed instructions.

### Environment Variables in Production

Ensure that all necessary environment variables are configured in your production environment. Do not commit sensitive information directly into the codebase. Use environment variables or a secure configuration management system.