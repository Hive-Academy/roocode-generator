---
title: Dependency Management
version: 1.0.0
lastUpdated: 2025-04-23T18:21:50.186Z
sectionId: 9
applicableLanguages: [TypeScript, JavaScript]
relatedSections: []
---

## Dependency Management Rules

### 1. Package Manager

- **Tool:** Use `npm` exclusively for managing external dependencies.
- **Lock File:** Always commit `package-lock.json` to ensure reproducible builds. Do not manually edit this file.
- **Scripts:** Define common tasks (build, test, lint, start) within `package.json` scripts.

### 2. Dependency Declaration

- **`dependencies`:** Only include packages required for the application to run in production (e.g., `langchain`, `commander`, `inquirer`, `reflect-metadata`).
  - Use `npm install <package-name> --save-prod` or `npm install <package-name> -P`.
- **`devDependencies`:** Include packages needed only for development, testing, building, or tooling (e.g., `typescript`, `@types/*`, `jest`, `eslint`, `prettier`, `husky`).
  - Use `npm install <package-name> --save-dev` or `npm install <package-name> -D`.
- **`peerDependencies`:** Avoid unless creating a distributable library. Not applicable for this project structure.
- **Specificity:** Add dependencies only when necessary. Prefer native Node.js/TypeScript features if sufficient.

### 3. Versioning

- **Ranges:** Use caret (`^`) ranges for `dependencies` and `devDependencies` to allow compatible minor and patch updates.
  ```json
  "dependencies": {
    "commander": "^13.1.0"
  },
  "devDependencies": {
    "typescript": "^5.8.3"
  }
  ```
- **Updates:** Regularly update dependencies using `npm update`. Review major version updates carefully for breaking changes.
- **Consistency:** Ensure related packages (e.g., `@langchain/*`) use compatible versions.

### 4. Installation and Maintenance

- **Clean Installs:** Use `npm ci` in CI/CD pipelines and for clean local setups to install exact versions from `package-lock.json`.
- **Auditing:** Regularly run `npm audit` to identify and fix security vulnerabilities. Integrate this into CI checks if possible.
- **Pruning:** Periodically run `npm prune` or check for unused dependencies using tools like `depcheck` to remove packages no longer needed.

### 5. Framework Specific

- **`reflect-metadata`:** Ensure `import 'reflect-metadata';` is executed _once_ at the very beginning of the application's entry point (`bin/roocode-generator.ts`) before any decorators or DI container setup are used.
- **Langchain:** Keep `@langchain/*` packages and the core `langchain` package versions aligned according to Langchain documentation to avoid compatibility issues.

### 6. Internal Module Dependencies

- **Paths:** Use relative paths or TypeScript path aliases defined in `tsconfig.json` for importing internal modules.
- **Structure:** Avoid circular dependencies between high-level components (e.g., `core` should not directly import from `generators` or `commands`). Use interfaces and DI to decouple components.
