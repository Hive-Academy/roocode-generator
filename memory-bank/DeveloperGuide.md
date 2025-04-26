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

### Modular DI Registration Pattern

To enhance organization and maintainability, the project's custom Dependency Injection (DI) registration logic has been modularized. Instead of a single large registration function (previously in `src/core/di/registrations.ts`), dependencies are now registered in dedicated module files located under `src/core/di/modules/`. Each module typically corresponds to a major feature area or core functionality (e.g., `app-module.ts`, `core-module.ts`, `llm-module.ts`).

**Key Principles:**

- **Separation of Concerns:** Each module file (`*.ts` under `src/core/di/modules/`) contains registration logic (often using the project's factory pattern) specific to its domain.
- **Centralized Loading:** The main registration entry point (e.g., `src/core/di/registrations.ts`) imports these modules and calls their respective registration functions to build the complete dependency graph for the container.
- **Scalability:** This pattern makes it easier to add or modify dependencies for specific features without altering a single, large registration file.

**Example Structure:**

```
src/
  core/
    di/
      container.ts       # Main container setup/access
      registrations.ts   # Central registration logic, imports & calls modules
      modules/
        app-module.ts    # Registers application-specific services via factory pattern
        core-module.ts   # Registers core framework services via factory pattern
        feature-x-module.ts # Registers services for Feature X via factory pattern
```

### Modular DI Registration Pattern

To enhance organization and maintainability, the project's custom Dependency Injection (DI) registration logic has been modularized. Instead of a single large registration function (previously in `src/core/di/registrations.ts`), dependencies are now registered in dedicated module files located under `src/core/di/modules/`. Each module typically corresponds to a major feature area or core functionality (e.g., `app-module.ts`, `core-module.ts`, `llm-module.ts`).

**Key Principles:**

- **Separation of Concerns:** Each module file (`*.ts` under `src/core/di/modules/`) contains registration logic (often using the project's factory pattern) specific to its domain.
- **Centralized Loading:** The main registration entry point (e.g., `src/core/di/registrations.ts`) imports these modules and calls their respective registration functions to build the complete dependency graph for the container.
- **Scalability:** This pattern makes it easier to add or modify dependencies for specific features without altering a single, large registration file.

**Example Structure:**

```
src/
  core/
    di/
      container.ts       # Main container setup/access
      registrations.ts   # Central registration logic, imports & calls modules
      modules/
        app-module.ts    # Registers application-specific services via factory pattern
        core-module.ts   # Registers core framework services via factory pattern
        feature-x-module.ts # Registers services for Feature X via factory pattern
```

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

## Working with Rule Templates

The Rules Template System is a core part of how `roocode-generator` generates mode-specific rules and documentation. Understanding how to work with templates is crucial for extending or customizing the generator's behavior.

### Template Structure and Syntax

Templates are Markdown files located in the `src/templates/` directory. They can include metadata and define distinct sections.

- **Sections:** Templates are divided into sections using Markdown headings (e.g., `## Section Name`).
- **Contextual Rules Marker:** The `{{CONTEXTUAL_RULES}}` marker is a special placeholder where the `TemplateProcessor` will insert rules generated by the LLM based on the project context. This marker can appear anywhere within a template section.

Example Template Structure:

```markdown
# Base Template Title

## Introduction

This is the introductory content.

## Core Principles

- Principle 1
- Principle 2

{{CONTEXTUAL_RULES}}

## Conclusion

Concluding remarks.
```

### Developer Usage

Interacting with the template system typically involves using the `IRulesTemplateManager` and `TemplateProcessor` components, usually resolved via Dependency Injection.

1.  **Loading Base Templates:**

    ```typescript
    import { container } from './inversify.config'; // Adjust path as needed
    import { IRulesTemplateManager } from './core/template/IRulesTemplateManager'; // Adjust path

    const templateManager = container.resolve<IRulesTemplateManager>('IRulesTemplateManager');
    const baseTemplateResult = await templateManager.loadBaseTemplate('architect'); // Load template for 'architect' mode

    if (baseTemplateResult.isOk()) {
      const template = baseTemplateResult.value;
      console.log('Loaded base template:', template);
      // Proceed to apply customizations or process
    } else {
      console.error('Failed to load base template:', baseTemplateResult.error);
      // Handle error
    }
    ```

2.  **Applying Customizations:**

    Customizations allow overriding or adding sections to base templates.

    ```typescript
    const customResult = await templateManager.loadCustomizations('architect');

    if (customResult.isOk() && baseTemplateResult.isOk()) {
      const mergedResult = templateManager.mergeTemplates(
        baseTemplateResult.value,
        customResult.value
      );
      if (mergedResult.isOk()) {
        const mergedTemplate = mergedResult.value;
        console.log('Merged template:', mergedTemplate);
        // Use the merged template for processing
      } else {
        console.error('Failed to merge templates:', mergedResult.error);
        // Handle error
      }
    } else if (customResult.isErr()) {
      console.warn('No customizations found or failed to load:', customResult.error);
      // Can proceed with just the base template if appropriate
    }
    ```

3.  **Processing with Contextual Rules:**

    The `TemplateProcessor` integrates LLM-generated content (contextual rules) into the template.

    ```typescript
    import { TemplateProcessor } from './core/template/TemplateProcessor'; // Adjust path
    // Assume mergedTemplate is available from the previous step
    // Assume projectContext is an object containing relevant project information

    const templateProcessor = container.resolve<TemplateProcessor>('TemplateProcessor');

    const processedResult = await templateProcessor.processTemplate({
      mode: 'architect', // The mode the template is for
      baseTemplate: mergedTemplate, // The template content (base or merged)
      projectContext: projectContext, // Contextual data for LLM
    });

    if (processedResult.isOk()) {
      const finalContent = processedResult.value;
      console.log('Final processed content:', finalContent);
      // This content is ready for file generation
    } else {
      console.error('Template processing failed:', processedResult.error);
      // Handle error
    }
    ```

### Error Handling

The Rules Template System utilizes a `Result` type (`Result<T, E>`) for operations that might fail. This type indicates whether an operation was successful (`isOk()`) and contains a value (`value?: T`) or failed (`isErr()`) and contains an error (`error?: E`).

Always check the result of template operations using `isOk()` or `isErr()` and handle potential errors gracefully, often by logging the error and providing user feedback.

```typescript
// Example error handling pattern
const result = await someTemplateOperation();
if (result.isErr()) {
  console.error(`Operation failed: ${result.error.message}`);
  // Implement specific error recovery or propagate the error
} else {
  const data = result.value;
  // Process successful result
}
```

### Best Practices

- **Template Management:**
  - Store templates and customizations in version control (`src/templates/`).
  - Document the purpose and structure of each template and customization file.
  - Use clear and descriptive names for template sections.
  - Include metadata (like version and required sections) within templates if a metadata parsing mechanism is implemented.
- **Customization:**
  - Create separate customization files for each mode (`architect`, `code`, etc.).
  - Use section priorities (if supported by the implementation) to control how customizations merge with base templates.
  - Clearly document the rationale behind specific customizations.
  - Test merged templates to ensure they produce the desired output.
- **Integration:**
  - Resolve template system components via Dependency Injection.
  - Implement consistent error handling using the `Result` type.
  - Log template operations (loading, merging, processing) for debugging and monitoring.
  - Validate templates (if validation logic exists) before attempting to process them.

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

## LLM-Based Rules Generator Implementation

The Rules Generator has been enhanced with LLM integration to generate contextually relevant rules. This section covers the implementation details and usage patterns.

### Core Components

#### Project Analyzer Usage

```typescript
import { IProjectAnalyzer } from './generators/rules/interfaces';

// Get analyzer from DI container
const analyzer = container.resolve<IProjectAnalyzer>('IProjectAnalyzer');

// Analyze project context
const techStackResult = await analyzer.analyzeTechStack(paths);
const structureResult = await analyzer.analyzeProjectStructure(paths);
const dependenciesResult = await analyzer.analyzeDependencies(paths);

if (techStackResult.isOk() && structureResult.isOk() && dependenciesResult.isOk()) {
  const context = {
    techStack: techStackResult.value,
    structure: structureResult.value,
    dependencies: dependenciesResult.value,
  };
  // Use context for rules generation
}
```

#### Template Manager Integration

```typescript
import { IRulesTemplateManager } from './generators/rules/interfaces';

// Get template manager from DI container
const templateManager = container.resolve<IRulesTemplateManager>('IRulesTemplateManager');

// Load and process templates
const baseTemplate = await templateManager.loadBaseTemplate(mode);
const customizations = await templateManager.loadCustomizations(mode);

if (baseTemplate.isOk() && customizations.isOk()) {
  const mergedTemplate = await templateManager.mergeTemplates(
    baseTemplate.value,
    customizations.value
  );
  // Process merged template
}
```

#### File Management

```typescript
import { IRulesFileManager } from './generators/rules/interfaces';

// Get file manager from DI container
const fileManager = container.resolve<IRulesFileManager>('IRulesFileManager');

// Save generated rules
const saveResult = await fileManager.saveRules({
  mode: 'architect',
  content: generatedContent,
  metadata: {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    // ... other metadata
  },
});

// Load specific version
const loadResult = await fileManager.loadRules('architect', 'v1.0.0');

// List available versions
const versions = await fileManager.listRuleVersions('architect');
```

### Error Handling Patterns

#### Using Result Type

```typescript
// Handle operation results
const result = await operation();
if (result.isErr()) {
  logger.error(`Operation failed: ${result.error.message}`);
  // Implement recovery strategy or propagate error
  return Result.err(result.error);
}

// Process successful result
const data = result.value;
// Continue with operation
```

#### Comprehensive Logging

```typescript
// Operation logging
logger.debug('Starting rules generation', { mode, context });
logger.info('Templates loaded successfully', { mode });
logger.error('Generation failed', { error, mode, context });
```

### Best Practices

1. **Project Analysis**

   - Always provide complete path lists
   - Handle missing files gracefully
   - Cache analysis results when possible
   - Validate analysis output

2. **Template Processing**

   - Validate templates before processing
   - Handle missing sections gracefully
   - Preserve template structure
   - Document customizations

3. **File Management**

   - Implement proper versioning
   - Create backups before updates
   - Validate file content
   - Handle concurrent access

4. **Error Recovery**
   - Implement fallback strategies
   - Preserve existing files
   - Log detailed error context
   - Provide clear user feedback

### Common Issues

1. **Template Processing**

   - Issue: Missing required sections
   - Solution: Validate template structure before processing
   - Prevention: Document required sections

2. **File Operations**

   - Issue: Concurrent access conflicts
   - Solution: Implement proper file locking
   - Prevention: Use atomic operations

3. **Context Analysis**
   - Issue: Incomplete project analysis
   - Solution: Validate analysis results
   - Prevention: Document required project structure

### Performance Considerations

1. **Caching**

   - Cache template parsing results
   - Store analysis results
   - Cache version history
   - Implement cache invalidation

2. **Resource Management**
   - Clean up temporary files
   - Release system resources
   - Monitor memory usage
   - Handle large projects

### Security Guidelines

1. **File Access**

   - Validate file paths
   - Check permissions
   - Sanitize input
   - Handle sensitive data

2. **LLM Integration**
   - Secure API keys
   - Validate responses
   - Handle rate limits
   - Monitor usage
