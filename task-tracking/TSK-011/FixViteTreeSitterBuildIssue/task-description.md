# Task Description: Fix Vite Build Configuration for Tree-sitter Native Modules

**Task ID:** TSK-011
**Priority:** High (Blocks TSK-008)

## 1. Task Overview

Resolve the runtime error "Invalid language object" occurring in the Vite-built application (`dist/`) when attempting to load Tree-sitter language grammars. This involves modifying the Vite build configuration (`vite.config.ts`) to correctly handle the native Node.js addon modules (`.node` files) associated with Tree-sitter grammars (e.g., `tree-sitter-javascript`, `tree-sitter-typescript`).

**Business Context:** The Tree-sitter integration (TSK-008) is blocked by this build issue. Fixing this is essential to enable language-agnostic code analysis, a key feature for improving the accuracy and relevance of generated memory bank documents across diverse projects.

## 2. Current Implementation Analysis

- **Build System:** The project uses Vite to build the Node.js CLI application. The configuration is likely in `vite.config.ts`.
- **Error:** A runtime error "Invalid language object" occurs in the built application (`dist/bin/roocode-generator.js`) when `src/core/analysis/tree-sitter-parser.service.ts` attempts to load Tree-sitter grammars.
- **Cause:** Vite needs specific configuration to correctly handle native Node.js modules (`.node` files). These files are likely not being copied to the correct location relative to the bundled code, or the runtime environment cannot find them.
- **Affected Service:** `src/core/analysis/tree-sitter-parser.service.ts` (specifically its grammar loading logic).
- **Dependencies:** `node-tree-sitter`, `tree-sitter-javascript`, `tree-sitter-typescript`.

## 3. Detailed Requirements

- **Modify Vite Configuration:** Update `vite.config.ts` to ensure Tree-sitter's native grammar modules (`.node` files) are correctly handled during the build process.
  - **Strategy 1 (Externalization):** Configure Vite to treat the grammar packages as external dependencies. Ensure the `.node` files are available in the expected `node_modules` location relative to the built output at runtime. This might involve adjusting `build.rollupOptions.external` or using plugins.
  - **Strategy 2 (Asset Handling):** Configure Vite to copy the `.node` files as assets to a predictable location within the `dist` directory and potentially adjust the loading path in `tree-sitter-parser.service.ts` (less desirable if possible to avoid code changes).
  - **Strategy 3 (Plugins):** Investigate and potentially use Vite plugins designed for handling native Node modules (e.g., `vite-plugin-native`, if applicable and maintained).
- **Ensure Runtime Loading:** Verify that the `TreeSitterParserService` can successfully find and load the required grammars (`javascript`, `typescript`) without errors in the built application.
- **Maintain Build Integrity:** Ensure the changes do not break other parts of the build process or introduce new runtime errors.
- **No Service Code Changes (Preferred):** Aim to resolve this purely through build configuration changes in `vite.config.ts` without modifying the Tree-sitter loading logic in `tree-sitter-parser.service.ts`, if possible.

## 4. Acceptance Criteria Checklist

- [ ] **AC1:** The Vite build process (`npm run build`) completes successfully without errors related to Tree-sitter or native modules.
  - _Verification:_ Run `npm run build`. Check for successful completion.
- [ ] **AC2:** The built application (`node dist/bin/roocode-generator.js`) runs without the "Invalid language object" runtime error when executing code paths that trigger Tree-sitter grammar loading (e.g., running the analyzer functionality implemented in TSK-008).
  - _Verification:_ Execute the built application with commands that use the `ProjectAnalyzer` (once TSK-008 is integrated). Observe runtime behavior.
- [ ] **AC3:** The `TreeSitterParserService` successfully loads and utilizes the JavaScript and TypeScript grammars within the context of the built application.
  - _Verification:_ Add temporary logging within the service or use a debugger on the built application to confirm successful grammar loading and parsing.
- [ ] **AC4:** The necessary Tree-sitter grammar `.node` files are correctly located relative to the built output (either in `node_modules` or within `dist` as configured) and are accessible at runtime.
  - _Verification:_ Inspect the `dist` directory and potentially `node_modules` after a successful build. Verify the presence and location of `.node` files.
- [ ] **AC5:** The changes are primarily contained within `vite.config.ts` and potentially `package.json` (build scripts), with minimal or no changes to `src/` code.
  - _Verification:_ Code review of the changes.
- [ ] **AC6:** Manual verification steps for TSK-008 (specifically running the analyzer on the built application) can now proceed without the "Invalid language object" error.
  - _Verification:_ Attempt the manual verification steps outlined in TSK-008's implementation plan (Subtask 5) using the newly built application.

## 5. Implementation Guidance

- **Investigate Vite Native Module Handling:** Research Vite's documentation and community resources regarding the best practices for handling native Node.js addons (`.node` files) in a Node.js target build.
- **Externalization:** Explore Vite's `build.rollupOptions.external` option and potentially `rollup-plugin-node-externals` (if not already used) to keep Tree-sitter packages external. Ensure `node_modules` are correctly handled post-build.
- **Asset Copying:** Look into Vite's `publicDir` or `build.assetsDir` options, or use plugins like `vite-plugin-static-copy` if direct copying of `.node` files into the `dist` folder is necessary.
- **Plugins:** Search for specific Vite plugins designed to facilitate the use of native modules.
- **Testing:** After applying configuration changes, perform a clean build (`npm run build`) and test the built application (`node dist/bin/roocode-generator.js ...`) thoroughly, focusing on the code paths that utilize the `ProjectAnalyzer` and `TreeSitterParserService`.

## 6. File and Component References

- **Primary Modification Target:** `vite.config.ts`
- **Related Files:** `package.json` (dependencies, build scripts), `src/core/analysis/tree-sitter-parser.service.ts` (for understanding loading context).
- **Build Output:** `dist/` directory.

## 7. Memory Bank References

- `memory-bank/TechnicalArchitecture.md`: Section 6 (Mentions potential Vite issues), Section 3 (Component context).
- `memory-bank/DeveloperGuide.md`: Section 5.2 (Build Process), Section 5.3 (Vite Compatibility Notes).
