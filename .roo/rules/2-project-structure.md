---
title: Project Structure
version: 1.0.0
lastUpdated: 2025-04-24T16:05:25.706Z
sectionId: 2
applicableLanguages: [TypeScript, JavaScript]
relatedSections: []
---

### Project Structure Rules

#### 1. Root Directory Layout
*   **Configuration:** Place project-level configuration files (`tsconfig.json`, `package.json`, `.eslintrc.js`, `jest.config.js`, `llm.config.json`, etc.) directly in the project root.
*   **Source Code:** Locate all TypeScript/JavaScript source code within the `src` directory.
*   **Compiled Output:** Store compiled JavaScript output in a dedicated `dist` directory at the root. Add `dist/` to `.gitignore`.
*   **Executable Scripts:** Place CLI entry point source files (`.ts`) in the `bin` directory. Compiled versions reside in `dist/bin`.
*   **Non-Code Assets:** Store non-code assets (e.g., `.md` templates, guides, data files) in dedicated top-level directories (e.g., `templates`, `memory-bank`). Do not place these within `src`.

#### 2. Source Directory (`src`) Organization
*   **Core Modules:** Group shared, foundational code (DI, core services, shared types, error handling, utilities) under `src/core/`.
    ```
    src/
      core/
        di/         # Dependency Injection setup
        config/     # Application configuration services
        errors/     # Custom error classes
        types/      # Shared interfaces/types
        services/   # Core reusable services (logging, etc.)
        ...
    ```
*   **Feature Modules:** Organize distinct features or domains into separate directories directly under `src`.
    ```
    src/
      commands/         # CLI command handlers
      generators/       # Code generation logic
      memory-bank/      # Memory bank feature logic
      ...
    ```
*   **Sub-Modules:** Nest directories within feature modules for further organization if needed (e.g., `src/generators/rules`).
*   **Type Definitions:**
    *   Define module-specific interfaces and types within the module's directory, either in dedicated `interfaces.ts`/`types.ts` files or alongside the code that uses them.
    *   Place globally shared types and interfaces in `src/core/types/`. Avoid redundant top-level `types/` or `src/types/` directories.
*   **Dependency Injection:** Centralize DI container setup and service registrations (e.g., `src/core/di/container.ts`, `src/core/di/registrations.ts`).

#### 3. Testing
*   **Colocation:** Place test files (`*.spec.ts` or `*.test.ts`) adjacent to the source file they are testing within the `src` directory.
    ```
    src/
      core/
        services/
          logger-service.ts
          logger-service.spec.ts # Test for logger-service.ts
    ```

#### 4. Naming Conventions
*   **Files & Directories:** Use `kebab-case` (e.g., `project-analyzer.ts`, `file-operations/`).
*   **Index Files:** Use `index.ts` files primarily for exporting the public API of a module directory. Avoid using them solely for internal aggregation if not necessary for external consumers.