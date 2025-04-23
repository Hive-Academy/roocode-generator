---
title: Project Structure
version: 1.0.0
lastUpdated: 2025-04-23T18:18:58.170Z
sectionId: 2
applicableLanguages: [TypeScript, JavaScript]
relatedSections: []
---

### 1. Root Directory Structure

*   Maintain essential configuration files directly in the root directory (`package.json`, `tsconfig.json`, `jest.config.js`, `commitlint.config.js`, `.releaserc.json`, `llm.config.json`, `roocode-config.json`).
*   Place tool-specific configuration in standard hidden directories (`.github/`, `.vscode/`).
*   Use `src/` for all TypeScript/JavaScript source code and tests.
*   Use `bin/` exclusively for executable entry point scripts.

```
/
├── .github/
├── .vscode/
├── bin/
│   └── roocode-generator.ts
├── src/
├── .releaserc.json
├── commitlint.config.js
├── jest.config.js
├── llm.config.json
├── package.json
├── roocode-config.json
└── tsconfig.json
```

### 2. Source Directory (`src/`) Structure

*   Organize `src/` by high-level concerns/features: `commands`, `core`, `generators`, `memory-bank`.
*   Place shared, cross-cutting concerns within `core/`.
*   Group domain-specific logic within feature directories (`generators/`, `memory-bank/`).
*   Place CLI command handlers in `commands/`.

```
src/
├── commands/
├── core/
├── generators/
├── memory-bank/
└── types/
```

### 3. Core Module (`src/core/`) Structure

*   Subdivide `core/` by technical responsibility (e.g., `analysis`, `application`, `cli`, `config`, `di`, `errors`, `file-operations`, `llm`, `services`, `template-manager`, `templating`, `types`, `ui`).
*   Centralize Dependency Injection configuration within `core/di/`.
*   Place fundamental application types and interfaces in relevant `core/` subdirectories (e.g., `core/config/interfaces.ts`, `core/llm/interfaces.ts`).
*   Use `core/types/` for common, low-level types used across multiple core modules (e.g., `common.ts`).

```
src/core/
├── analysis/
├── application/
├── cli/
├── config/
├── di/
├── errors/
├── file-operations/
├── generators/
├── llm/
├── result/
├── services/
├── template-manager/
├── templating/
├── types/
└── ui/
```

### 4. Feature Module Structure (e.g., `generators/`, `memory-bank/`)

*   Group all files related to a specific feature within its dedicated directory.
*   Use subdirectories for complex features if needed (e.g., `generators/rules/`).
*   Define feature-specific interfaces within the module (e.g., `memory-bank/interfaces.ts`, `generators/rules/interfaces.ts`).

```
src/generators/
├── rules/
│   ├── interfaces.ts
│   ├── rules-content-processor.ts
│   ├── rules-file-manager.ts
│   ├── rules-generator.ts
│   └── rules-prompt-builder.ts
├── roomodes-generator.ts
├── system-prompts-generator.ts
└── vscode-copilot-rules-generator.ts
```

### 5. File Naming Conventions

*   Use `kebab-case` for all directory and file names (e.g., `project-analyzer.ts`, `file-operations/`).
*   Use descriptive names indicating the file's primary responsibility.
*   Apply consistent suffixes for common patterns:
    *   Services: `*.service.ts` (e.g., `logger-service.ts`)
    *   Interfaces: `interfaces.ts` (preferred for module interfaces) or `*.interface.ts`
    *   Types: `types.ts` or `*.types.ts` or `*.type.ts`
    *   Generators: `*.generator.ts`
    *   Command Handlers: `*.command-handler.ts`
    *   Errors: `errors.ts` or `*.error.ts`
    *   Tests: `*.spec.ts`

### 6. Test File Co-location

*   Place test files (`*.spec.ts`) directly alongside the source files they are testing within the `src/` directory.

```
src/core/services/
├── logger-service.ts
└── logger-service.spec.ts
```

### 7. Barrel Files (`index.ts`)

*   Use `index.ts` files sparingly, primarily within modules that need to provide a consolidated public API (e.g., `core/di/index.ts`, `core/errors/index.ts`).
*   Avoid `index.ts` files solely for re-exporting single files or creating deep import chains. Prefer direct imports where clarity is not compromised.

### 8. Type Definitions

*   Place types directly related to a specific class or module within that module's directory (e.g., `core/analysis/types.ts`).
*   Define interfaces specific to a module in `interfaces.ts` within that module directory.
*   Use `core/types/` for common, low-level types shared across `core` modules.
*   Use the root `src/types/` directory *only* if types are truly global and not tied to `core` or any specific feature module. Re-evaluate if these types can be moved closer to their usage.