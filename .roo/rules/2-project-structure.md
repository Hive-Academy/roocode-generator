---
title: Project Structure
version: 1.0.0
lastUpdated: 2025-04-23T11:57:36.730Z
sectionId: 2
applicableLanguages: [TypeScript, JavaScript]
relatedSections: []
---

Okay, here are comprehensive coding rules and standards specifically for the **Project Structure** of your `roocode-generator` project, based on the provided context.

```markdown
# Project Structure Coding Rules and Standards - roocode-generator

## 1. General Principles

1.1. **Consistency:** Adhere strictly to the established project structure. Consistency makes the codebase easier to navigate, understand, and maintain.
1.2. **Modularity:** Structure the project into logical modules based on features or technical concerns (e.g., `core`, `generators`, `memory-bank`). This promotes separation of concerns, testability, and reusability.
1.3. **Clarity:** Directory and file names should clearly indicate their purpose and scope.
1.4. **Scalability:** The structure should accommodate future growth without requiring major refactoring. New features or core functionalities should fit logically within the existing hierarchy or justify the creation of new top-level modules.
1.5. **Discoverability:** It should be intuitive for developers (including new team members) to find the code related to a specific feature or functionality.

## 2. Root Directory Structure

2.1. **Root Files:** Configuration files (like `package.json`, `tsconfig.json`, `jest.config.js`, `.eslintrc.js`, `commitlint.config.js`, `.releaserc.json`, `llm.config.json`, `roocode-config.json`) reside in the project root directory (`D:\projects\roocode-generator` or `./` relative path).
2.2. **Configuration Directories:** Tool-specific configuration or workflow files are grouped in dedicated hidden directories:
    *   `.github/workflows`: GitHub Actions CI/CD workflows.
    *   `.vscode`: VS Code specific settings (launch configurations, workspace settings).
2.3. **Source Code Directory:** All primary application source code MUST reside within the `src` directory.
2.4. **Binary/Executable Directory:** CLI entry point scripts MUST reside within the `bin` directory.
2.5. **Build Output Directory:** Compiled JavaScript code, type declaration files (`.d.ts`), and source maps MUST be output to a `dist` directory in the root. This directory MUST be excluded from version control (via `.gitignore`).
    *   *Example (`tsconfig.json`):* `"outDir": "./dist"`
    *   *Example (`package.json`):* `"main": "dist/bin/roocode-generator.js"`, `"types": "dist/bin/roocode-generator.d.ts"`, `"files": ["dist"]`
2.6. **Node Modules:** The `node_modules` directory is managed by `npm` and MUST be excluded from version control.

## 3. Source Directory (`src`) Structure

3.1. **Primary Location:** The `src` directory contains all TypeScript source code and co-located test files.
3.2. **Top-Level Modules:** The `src` directory is organized into top-level modules representing major functional areas or layers:
    *   `commands`: Contains handlers for CLI commands defined using Commander.js.
    *   `core`: Contains foundational, cross-cutting concerns and shared logic (DI, config, errors, file operations, LLM interactions, etc.).
    *   `generators`: Contains specific code generator implementations.
    *   `memory-bank`: Contains logic related to the "memory bank" feature.
    *   `types`: Contains globally shared TypeScript type definitions or interfaces not specific to a single module.
3.3. **Core Module (`src/core`) Structure:**
    *   The `core` directory is further subdivided by technical concern (e.g., `analysis`, `application`, `cli`, `config`, `di`, `errors`, `file-operations`, `llm`, `services`, `template-manager`, `ui`).
    *   New core functionalities should be placed within the appropriate existing subdirectory. If no suitable subdirectory exists, create a new one with a clear, descriptive name reflecting its concern. Avoid adding files directly into `src/core`.
3.4. **Feature/Domain Modules (`src/generators`, `src/memory-bank`, etc.):**
    *   These directories group all code related to a specific application feature or domain.
    *   They should be self-contained as much as possible, relying on `core` modules for shared functionality.
    *   Complex features can be further subdivided within their respective directories (e.g., `src/generators/rules`).
3.5. **Module Internal Structure:** Within each module directory (e.g., `src/core/analysis`, `src/memory-bank`), maintain a consistent structure:
    *   Place primary logic files (classes, functions) directly within the module directory.
    *   Group related interfaces/types in `interfaces.ts` or `types.ts`.
    *   Group custom error classes in `errors.ts`.
    *   Group constants in `constants.ts` (if applicable).
    *   Group utility functions specific to the module in `utils.ts` (if applicable).
    *   Use an `index.ts` file to define the module's public API (see Section 5).

## 4. File Naming Conventions

4.1. **Directory Names:** Use `kebab-case` (e.g., `file-operations`, `memory-bank`).
4.2. **File Names:** Use `kebab-case` for all TypeScript (`.ts`) and test (`.test.ts`/`.spec.ts`) files (e.g., `project-analyzer.ts`, `llm-config.service.ts`).
4.3. **TypeScript Files:** Use the `.ts` extension.
4.4. **Test Files:**
    *   Use the suffix `.test.ts` or `.spec.ts` (be consistent; assume `.test.ts` if not specified elsewhere).
    *   Test files MUST be co-located with the source file they are testing within the `src` directory.
    *   *Example:* `src/core/analysis/project-analyzer.ts` should have its tests in `src/core/analysis/project-analyzer.test.ts`.
4.5. **Component/Class Types:** Use descriptive names reflecting the component's role, often using suffixes:
    *   **Services:** `*.service.ts` (e.g., `logger.service.ts`, `project-config.service.ts`)
    *   **Commands:** `*.command-handler.ts` or `*.command.ts` (e.g., `memory-bank-command-handler.ts`)
    *   **Generators:** `*.generator.ts` (e.g., `rules.generator.ts`)
    *   **Interfaces/Types Files:** `interfaces.ts`, `types.ts` (preferred for grouping), or potentially `*.interface.ts`, `*.type.ts` if a single file becomes too large or contains distinct categories.
    *   **Error Files:** `errors.ts` (preferred for grouping module-specific errors).
    *   **DI Container/Registrations:** `container.ts`, `registrations.ts` (as seen in `src/core/di`).
4.6. **Entry Point:** The main CLI entry point source file is `bin/roocode-generator.ts`.

## 5. Index Files (`index.ts`) Usage

5.1. **Purpose:** Use `index.ts` files to define the public interface of a module (directory). They should re-export the symbols (classes, interfaces, types, functions, constants) intended for use by other modules.
5.2. **Location:** Place an `index.ts` file at the root of each logical module directory whose contents need to be accessed externally (e.g., `src/core/di/index.ts`, `src/core/errors/index.ts`).
5.3. **Exports:** Only export symbols that constitute the module's public API. Avoid exporting internal implementation details or helper functions/classes not meant for external consumption.
5.4. **Imports:** Use path aliases (configured in `tsconfig.json`) for cleaner imports between modules.
    *   *Example (`tsconfig.json`):*
        ```json
        {
          "compilerOptions": {
            "baseUrl": ".",
            "paths": {
              "@/*": ["src/*"]
            }
          }
        }
        ```
    *   *Example Usage:*
        ```typescript
        // Good: Using index.ts and path alias
        import { ProjectAnalyzer, AnalysisResult } from '@/core/analysis';
        import { BaseGenerator } from '@/core/generators';

        // Avoid: Direct file imports across modules (unless necessary for specific reasons)
        // import { ProjectAnalyzer } from '@/core/analysis/project-analyzer';
        ```

## 6. Test File Co-location

6.1. **Mandate:** As specified by `testDir: "src"`, all test files MUST reside within the `src` directory.
6.2. **Placement:** Each test file (`*.test.ts` or `*.spec.ts`) MUST be placed in the same directory as the source file it tests.
6.3. **Rationale:** This improves discoverability, makes it easier to test modules in isolation, and simplifies refactoring (moving a source file automatically moves its tests).
    *   *Example:*
        ```
        src/
        └── core/
            └── analysis/
                ├── project-analyzer.ts
                ├── project-analyzer.test.ts  <-- Test for project-analyzer.ts
                ├── response-parser.ts
                ├── response-parser.test.ts <-- Test for response-parser.ts
                └── types.ts
        ```

## 7. Entry Points (`bin` directory)

7.1. **Purpose:** The `bin` directory contains the executable scripts that serve as the entry points for the CLI application.
7.2. **Content:** These scripts should be minimal. Their primary responsibilities are:
    *   Parsing command-line arguments (using Commander.js).
    *   Setting up the Dependency Injection container (using `src/core/di`).
    *   Initializing and running the main application logic (likely orchestrating calls to `commands` or `core/application` modules).
    *   Handling top-level errors and process exit codes.
7.3. **Files:** Contains `roocode-generator.ts` (source) which compiles to `roocode-generator.js` (referenced in `package.json` `bin` field).

## 8. Assets and Templates

8.1. **Location:** Non-code assets, such as prompt templates or configuration schemas used by the application, should be stored in a dedicated location.
8.2. **Convention:** While not explicitly defined in the input structure, establish a clear convention:
    *   **Option A (Recommended):** A root-level `templates` directory, possibly subdivided by feature (e.g., `templates/rules/`, `templates/memory-bank/`).
    *   **Option B:** Co-locate templates within the module that uses them (e.g., `src/generators/rules/templates/`).
    *   Choose **one** convention and apply it consistently.
8.3. **Access:** Ensure build tooling (e.g., `copyfiles`) copies these assets to the `dist` directory if they need to be accessed at runtime by the compiled code. Update `package.json`'s `files` array accordingly.

## 9. Dependency Management

9.1. **`package.json`:** Use `package.json` to manage all external dependencies.
9.2. **Dependency Types:**
    *   `dependencies`: Runtime dependencies required for the application to function (e.g., `langchain`, `commander`, `inquirer`, `reflect-metadata`).
    *   `devDependencies`: Dependencies needed only for development and build processes (e.g., `typescript`, `@types/*`, `jest`, `eslint`, `prettier`, `husky`, `semantic-release`).
    *   `peerDependencies`: If creating a library intended to be used by other projects, declare dependencies expected to be provided by the consuming project. (Likely not applicable here, but good practice to be aware of).
9.3. **Installation:** Use `npm install <package> --save-dev` for development dependencies and `npm install <package>` for runtime dependencies.

## 10. Review and Evolution

10.1. **Periodic Review:** These structure rules should be reviewed periodically, especially when introducing significant new features or architectural changes.
10.2. **Adaptation:** Be open to adapting the structure if clear benefits in maintainability, scalability, or clarity can be demonstrated, but changes should be discussed and agreed upon by the team.
```