---
title: Dependency Management
version: 1.0.0
lastUpdated: 2025-04-24T16:06:12.388Z
sectionId: 4
applicableLanguages: [TypeScript, JavaScript]
relatedSections: []
---

## Dependency Management Rules

### 1. Package Manager & Lock File

*   **Use `npm` exclusively:** All dependency operations must use `npm`.
*   **Commit `package-lock.json`:** Always commit `package-lock.json` to ensure reproducible builds across environments.
*   **Avoid manual edits:** Do not manually edit `package.json` or `package-lock.json` for dependency changes. Use `npm` commands.
    ```bash
    # Correct: Add a dependency
    npm install <package-name>

    # Correct: Add a dev dependency
    npm install --save-dev <package-name>

    # Correct: Remove a dependency
    npm uninstall <package-name>
    ```

### 2. Dependency Types

*   **`dependencies`:** For packages required at runtime (e.g., `langchain`, `commander`, `reflect-metadata`).
*   **`devDependencies`:** For packages needed during development, testing, or build (e.g., `typescript`, `@types/*`, `eslint`, `jest`, `prettier`, `semantic-release`).
*   **`peerDependencies`:** Use only when creating reusable libraries that require the host project to provide specific dependency versions. Avoid in application code.

### 3. Versioning

*   **Use caret (`^`) ranges:** Prefer caret ranges (`^x.y.z`) for dependencies to allow non-breaking updates (minor and patch).
    ```json
    // package.json example
    "dependencies": {
      "commander": "^13.1.0",
      "langchain": "^0.3.21"
    }
    ```
*   **Pin critical dependencies:** Consider pinning exact versions (e.g., `1.2.3`) for highly critical dependencies if updates frequently cause issues, but prefer caret ranges otherwise.
*   **Regular updates:** Periodically review and update dependencies using `npm update` or tools like Dependabot. Address breaking changes proactively.

### 4. Adding & Reviewing Dependencies

*   **Minimize dependencies:** Only add dependencies that provide significant value and cannot be easily implemented internally.
*   **Evaluate packages:** Before adding a dependency, assess its maintenance status, popularity, license, security vulnerabilities, and bundle size impact.
*   **Review changes:** Dependency additions or major version bumps should be reviewed carefully in pull requests.

### 5. Type Definitions

*   **Install `@types`:** For JavaScript libraries used in TypeScript code, install the corresponding `@types/<package-name>` package as a `devDependency`.
    ```bash
    npm install --save-dev @types/node
    ```
*   **Check for bundled types:** Verify if a package already includes its own type definitions before adding a separate `@types` package.

### 6. Security

*   **Audit regularly:** Run `npm audit` frequently to identify and fix known vulnerabilities in dependencies.
    ```bash
    npm audit
    npm audit fix # Attempts to fix automatically
    ```
*   **Automate checks:** Integrate security auditing into the CI/CD pipeline (e.g., GitHub Actions workflow).

### 7. Internal Dependencies & DI

*   **Use path aliases:** Utilize `tsconfig.json` path aliases for cleaner internal imports instead of relative paths (`../../../`).
    ```json
    // tsconfig.json example
    {
      "compilerOptions": {
        "baseUrl": ".",
        "paths": {
          "@core/*": ["src/core/*"],
          "@generators/*": ["src/generators/*"],
          // ... other aliases
        }
      }
    }
    ```
*   **DI for coupling:** Leverage the existing Dependency Injection (DI) container (`src/core/di`) to manage internal module dependencies and promote loose coupling. Avoid direct instantiation where services are registered in the container.
*   **Avoid circular dependencies:** Structure code to prevent circular dependencies between internal modules. Use tools or linters if necessary to detect them.