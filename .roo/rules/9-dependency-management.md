---
title: Dependency Management
version: 1.0.0
lastUpdated: 2025-04-23T12:06:22.544Z
sectionId: 9
applicableLanguages: [TypeScript, JavaScript]
relatedSections: []
---

Okay, here are comprehensive coding rules and standards for the "dependency-management" section, tailored to your project context (TypeScript/JavaScript, Langchain, Commander.js, Inquirer.js, Reflect-metadata, npm).

---

# Dependency Management Rules and Standards

## 1. Introduction

Effective dependency management is crucial for project stability, security, maintainability, and collaboration. These rules ensure consistency in how external libraries and internal modules are handled within the `roocode-generator` project. We use `npm` as the package manager.

## 2. General Principles

*   **Minimize Dependencies:** Only add dependencies when absolutely necessary and the functionality isn't easily achievable or already available within the project or Node.js core modules.
*   **Prefer Well-Maintained Libraries:** Choose libraries that are actively maintained, have good community support, sufficient test coverage, and regular updates. Check GitHub activity, open issues, and download statistics.
*   **Understand Implications:** Be aware of a dependency's transitive dependencies, potential performance impact, and licensing implications before adding it.
*   **Consistency:** Follow these rules consistently across the project.

## 3. Adding New Dependencies

*   **Justification:** Before adding a new dependency, clearly justify its need. Consider if existing dependencies or custom code could fulfill the requirement. Discuss potential additions with the team if the dependency adds significant complexity or is critical.
*   **Evaluation:**
    *   **Functionality:** Does it meet the specific technical requirement?
    *   **Maintenance:** Is the library actively maintained? Check the date of the last commit/release.
    *   **Popularity/Usage:** Widely used libraries often have better support and are less likely to be abandoned (check npm downloads, GitHub stars).
    *   **Issues:** Review open and closed issues on the repository for potential bugs or problems.
    *   **TypeScript Support:** Prefer libraries with built-in TypeScript types or actively maintained `@types` packages.
    *   **License:** Ensure the license is compatible with the project's license and usage (see Section 9).
    *   **Security:** Check for known vulnerabilities (e.g., using `npm audit` on a test branch or checking Snyk/GitHub Advisories).
*   **Installation:**
    *   Use `npm install <package-name> --save-prod` (or `npm i -S <package-name>`) for runtime dependencies.
    *   Use `npm install <package-name> --save-dev` (or `npm i -D <package-name>`) for development/build dependencies.
    *   If TypeScript types are not bundled, install the corresponding `@types` package: `npm install @types/<package-name> --save-dev`.
*   **Documentation:** If a dependency introduces new patterns or requires specific setup, document its usage briefly in relevant code comments or project documentation.

## 4. Dependency Types (`dependencies` vs. `devDependencies`)

*   **`dependencies`:**
    *   **Purpose:** Libraries required for the application to run in production.
    *   **Examples (from your project):** `langchain`, `@langchain/openai`, `commander`, `inquirer`, `reflect-metadata`, `chalk`, `ora`, `dotenv`.
    *   **Rule:** Only include packages essential for the runtime execution of `bin/roocode-generator.js`.
*   **`devDependencies`:**
    *   **Purpose:** Libraries needed only during development, testing, building, or for tooling.
    *   **Examples (from your project):** `typescript`, `ts-jest`, `jest`, `eslint`, `prettier`, `@types/*`, `husky`, `commitlint`, `semantic-release`, `copyfiles`.
    *   **Rule:** Include build tools, testing frameworks, linters, formatters, type definitions, and utility scripts used only in the development lifecycle.
*   **`peerDependencies`:**
    *   **Purpose:** Dependencies expected to be provided by the consuming project/environment. (Less common for an application like this, more for libraries).
    *   **Rule:** Avoid unless absolutely necessary and clearly documented. If used, specify version ranges carefully. Currently, this project does not list any peer dependencies.
*   **`optionalDependencies`:**
    *   **Purpose:** Dependencies that are not critical for the main functionality but provide optional features. Installation failures are ignored.
    *   **Rule:** Avoid using `optionalDependencies` unless there's a very strong, well-documented reason. Prefer explicit checks and user instructions if functionality depends on an optional external tool or library.

## 5. Version Management

*   **Semantic Versioning (SemVer):** All dependencies SHOULD follow SemVer (`MAJOR.MINOR.PATCH`). Understand the meaning of version ranges:
    *   `^` (Caret): Allows updates that do not modify the left-most non-zero digit (e.g., `^1.2.3` allows `>=1.2.3 <2.0.0`). **This is the preferred range for most dependencies.**
    *   `~` (Tilde): Allows patch-level changes if a minor version is specified, or minor-level changes if not (e.g., `~1.2.3` allows `>=1.2.3 <1.3.0`). Use sparingly, perhaps for dependencies known to have breaking changes in minors.
    *   `Exact Version` (e.g., `1.2.3`): Pins the dependency to a specific version. Use for critical dependencies where even minor updates have caused issues, or when strict reproducibility is paramount beyond the lock file (e.g., during troubleshooting).
    *   `*` or `latest`: **Forbidden.** These lead to unpredictable builds.
*   **Rule:** Use caret (`^`) version ranges by default when adding dependencies via `npm install`. Npm handles this automatically. Review ranges periodically.
*   **TypeScript Types:** Ensure the `@types/*` package version corresponds appropriately to the library version it provides types for. Often, using `^` for both is acceptable, but check for compatibility notes if issues arise.

## 6. Lock File (`package-lock.json`)

*   **Purpose:** Records the exact versions of all dependencies (including transitive ones) installed, ensuring reproducible builds across different environments (developer machines, CI/CD).
*   **Rule 1:** `package-lock.json` **MUST** be committed to the Git repository.
*   **Rule 2:** Use `npm ci` (Clean Install) instead of `npm install` in automated environments (CI/CD workflows like `.github/workflows/nodejs.yml`). `npm ci` performs a clean install based *only* on `package-lock.json`, ensuring reproducibility and faster installs.
*   **Rule 3:** When resolving merge conflicts in `package-lock.json`, be cautious. It's often safer to:
    1.  Accept the incoming changes (or your changes).
    2.  Run `npm install` locally to regenerate the lock file based on the resolved `package.json`.
    3.  Test thoroughly (`npm test`, `npm run build`).
    4.  Commit the updated `package-lock.json`.

## 7. Updating Dependencies

*   **Frequency:** Update dependencies regularly (e.g., weekly, bi-weekly, or monthly) to incorporate bug fixes, performance improvements, and security patches.
*   **Process:**
    1.  Run `npm outdated` to list dependencies with available updates.
    2.  Create a dedicated branch for dependency updates (e.g., `feat/update-dependencies-YYYY-MM-DD`).
    3.  Update dependencies incrementally or all at once (depending on the number and type of updates). Use `npm update` or tools like `npm-check-updates` (`ncu -u`) to update `package.json` and then run `npm install`.
    4.  **Review Changes:** Pay close attention to MAJOR version updates, as they indicate breaking changes. Consult changelogs for these dependencies.
    5.  **Test Thoroughly:** Run the full test suite (`npm test`). Perform manual testing of key features, especially those related to updated dependencies (e.g., test Langchain flows after updating Langchain packages).
    6.  **Audit:** Run `npm audit` after updating.
    7.  Commit changes, including the updated `package-lock.json`.
    8.  Submit a Pull Request for review.

## 8. Security Auditing

*   **Regular Audits:** Run `npm audit` frequently during development and integrate it into the CI pipeline.
*   **Remediation:**
    *   Attempt automatic fixes with `npm audit fix`.
    *   If automatic fixes are not possible or introduce issues, manually investigate the vulnerability report. Update the affected dependency (or its parent) to a non-vulnerable version if available.
    *   Prioritize addressing `critical` and `high` severity vulnerabilities.
    *   Document any vulnerabilities that cannot be immediately fixed and create a plan for addressing them.

## 9. License Compliance

*   **Check Licenses:** Before adding a dependency, verify its license (and the licenses of its transitive dependencies if possible).
*   **Allowed Licenses:** Prefer permissive licenses like MIT, Apache 2.0, ISC, BSD.
*   **Restricted Licenses:** Be cautious with copyleft licenses (e.g., GPL, AGPL) as they might impose requirements on your project's source code distribution. Consult with legal counsel if unsure.
*   **Automation:** Consider adding a license-checking tool (e.g., `license-checker`, `nlf`) to the development workflow or CI pipeline to automate compliance checks.

## 10. Internal Module Dependencies

*   **Goal:** Maintain a clear and manageable internal dependency graph, promoting modularity and avoiding circular dependencies. The `internalDependencies` analysis provided is a good starting point.
*   **Architecture Enforcement:**
    *   **Direction:** Define clear dependency flow rules. For example:
        *   `commands/*`, `generators/*`, `memory-bank/*` (Feature Modules) can depend on `core/*`.
        *   `core/*` modules should generally NOT depend on specific Feature Modules. Dependencies should flow inwards towards `core`.
        *   Avoid dependencies *between* distinct Feature Modules where possible; interactions should ideally be orchestrated via `core/application` or events.
    *   **Avoid Circular Dependencies:** Circular dependencies between modules (e.g., `module A -> module B -> module A`) are forbidden as they complicate the codebase and can lead to runtime errors.
*   **Tooling:**
    *   Use ESLint plugins like `eslint-plugin-import` with rules like `no-cycle` to detect circular dependencies.
    *   Configure `no-restricted-imports` in ESLint to enforce architectural boundaries (e.g., prevent `core/config` from importing from `generators/*`).
    *   Consider using tools like `dependency-cruiser` for advanced architectural rule definition and validation, integrating it into the CI pipeline.
    *   ```json
        // Example .dependency-cruiser.js configuration snippet (illustrative)
        module.exports = {
          forbidden: [
            {
              name: 'no-core-to-features',
              severity: 'error',
              comment: 'Core modules should not depend on specific feature modules (generators, commands, memory-bank).',
              from: { path: '^src/core/' },
              to: { path: ['^src/generators', '^src/commands', '^src/memory-bank'] }
            },
            {
              name: 'no-circulars',
              severity: 'error',
              comment: 'Circular dependencies are forbidden.',
              from: {},
              to: { circular: true }
            }
          ],
          // ... other options
        };
        ```
*   **Path Aliases:** Utilize TypeScript path aliases in `tsconfig.json` for cleaner imports between internal modules (e.g., `@core/*`, `@generators/*`) instead of relative paths (`../../core/...`). Ensure these are configured correctly for both `tsc` and Jest.
    ```json
    // tsconfig.json example snippet
    {
      "compilerOptions": {
        "baseUrl": ".",
        "paths": {
          "@core/*": ["src/core/*"],
          "@generators/*": ["src/generators/*"],
          "@commands/*": ["src/commands/*"],
          "@memory-bank/*": ["src/memory-bank/*"],
          "@/*": ["src/*"]
        }
        // ... other options
      }
    }
    ```

## 11. Removing Dependencies

*   **Identify Unused:** Regularly check for unused dependencies. Tools like `depcheck` can help identify packages listed in `package.json` but not imported in the code.
    ```bash
    npx depcheck
    ```
*   **Removal Process:**
    1.  Verify the dependency is truly unused or its functionality has been replaced.
    2.  Uninstall using `npm uninstall <package-name> [--save-prod | --save-dev]`.
    3.  Remove associated `@types/*` package if applicable: `npm uninstall @types/<package-name> --save-dev`.
    4.  Remove any related configuration or code.
    5.  Run tests (`npm test`) and build (`npm run build`) to ensure nothing broke.
    6.  Commit the changes.

## 12. Framework-Specific Considerations

*   **Langchain:**
    *   Langchain is modular (`@langchain/core`, `@langchain/openai`, `@langchain/anthropic`, etc.). When updating, try to update related Langchain packages together to maintain compatibility, checking their respective changelogs.
    *   Be mindful that the core Langchain concepts and APIs can evolve rapidly. Pinning versions (`~` or exact) might be considered if stability is paramount over newest features during critical development phases.
*   **Reflect-metadata:**
    *   This is typically required for frameworks using decorators for dependency injection (as seen in `src/core/di`).
    *   **Rule:** `import "reflect-metadata";` **MUST** be executed *once* at the very beginning of the application's entry point (`bin/roocode-generator.ts` seems likely) before any decorators are evaluated. It should be listed in `dependencies`.

---

By adhering to these rules, the `roocode-generator` project can maintain a healthy, secure, and manageable dependency ecosystem. Remember to integrate checks for these rules (linting, auditing, dependency analysis) into the CI/CD pipeline (`.github/workflows/nodejs.yml`) for automated enforcement.