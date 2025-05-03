# Task Description: Re-Fix Vite Build Configuration for Tree-sitter Native Modules

**Task ID:** TSK-012
**Priority:** High (Blocks TSK-008)
**Supersedes:** Attempted fix in TSK-011

## 1. Task Overview

Re-investigate and implement a robust solution to resolve the persistent runtime error "Invalid language object" occurring in the Vite-built application (`dist/`) when loading Tree-sitter language grammars. The previous fix attempt (TSK-011, using `cpy-cli` post-build) was insufficient. This task requires a deeper dive into Vite's build process and native module handling to ensure Tree-sitter's `.node` files are correctly packaged, located, and loaded at runtime.

**Business Context:** This is critical to unblock the Tree-sitter integration (TSK-008), which is essential for enhancing the project analysis capabilities and improving the quality of generated memory bank documents across diverse projects.

## 2. Problem Analysis

- **Error:** Runtime error "Invalid language object" persists in the production build (`node dist/bin/roocode-generator.js ...`) when `TreeSitterParserService` loads grammars.
- **Previous Attempt (TSK-011):** Copying `.node` files and `binding.gyp` into `dist/bin/node_modules/...` using a `postbuild` script did not resolve the issue. This suggests the problem might be related to how Node.js resolves paths within the bundled application context, or how Vite modifies the environment/paths.
- **Root Cause:** The interaction between Vite's bundling/externalization mechanism for a Node.js target and the way `node-tree-sitter` (or Node.js itself) locates native addon files at runtime is not correctly configured.

## 3. Detailed Requirements

- **Investigate Root Cause:** Thoroughly diagnose why the TSK-011 fix failed. Use debugging tools on the built application to trace the path resolution and loading mechanism for the `.node` files. Check environment variables or paths that might be altered by Vite. Examine how `node-tree-sitter` itself attempts to locate the `binding.gyp` or `.node` files.
- **Implement Robust Fix:** Modify the Vite build configuration (`vite.config.ts`) and potentially related build scripts (`package.json`) to ensure Tree-sitter grammars load correctly at runtime. Consider alternative strategies:
  - **Vite Plugins:** Re-evaluate or find specific Vite plugins designed for native Node module bundling (e.g., `vite-plugin-native`, `vite-plugin-externals`, or others). Configure them correctly.
  - **Rollup Configuration:** Dive deeper into Vite's underlying Rollup configuration (`build.rollupOptions`) to fine-tune how external modules and assets are handled. Pay attention to `output.paths` or similar options if relevant.
  - **Alternative Externalization:** Explore different ways to mark Tree-sitter packages as external and ensure Node.js can resolve them correctly post-build. This might involve ensuring the entire `node_modules` structure for these packages is preserved or accessible relative to the output.
  - **Runtime Path Adjustments (If Necessary):** As a last resort, investigate if runtime path adjustments (e.g., manipulating `require.resolve.paths` or using environment variables) are needed, but prioritize build-time configuration fixes.
- **Ensure Runtime Loading:** Verify that the `TreeSitterParserService` can successfully find and load the required grammars (`javascript`, `typescript`) without errors in the built application.
- **Maintain Build Integrity:** Ensure the changes do not break other parts of the build process or introduce new runtime errors.

## 4. Acceptance Criteria Checklist

- [ ] **AC1:** The Vite build process (`npm run build`) completes successfully without errors.
  - _Verification:_ Run `npm run build`. Check for successful completion.
- [ ] **AC2:** The built application (`node dist/bin/roocode-generator.js ...`) runs **without** the "Invalid language object" runtime error when executing code paths that trigger Tree-sitter grammar loading.
  - _Verification:_ Execute the built application with commands that use the `ProjectAnalyzer` (e.g., `node dist/bin/roocode-generator.js analyze` or similar). Observe runtime behavior for the specific error.
- [ ] **AC3:** The `TreeSitterParserService` successfully loads and utilizes the JavaScript and TypeScript grammars within the context of the **built application**.
  - _Verification:_ Add temporary logging or use a debugger on the built application to confirm successful grammar loading (`Language.load`) and subsequent parsing calls.
- [ ] **AC4:** The implemented solution robustly handles the location and loading of Tree-sitter's native `.node` files at runtime in the context of the Vite build output.
  - _Verification:_ Code review of the configuration changes (`vite.config.ts`, `package.json`) and potentially inspection of the `dist` directory structure. Explain the chosen mechanism.
- [ ] **AC5:** Manual verification steps for TSK-008 (specifically running the analyzer on the built application) can now proceed **without** the "Invalid language object" error.
  - _Verification:_ Attempt the manual verification steps outlined in TSK-008's implementation plan (Subtask 5) using the newly built application. Confirm the error is gone and the analyzer produces output.

## 5. Implementation Guidance

- **Debugging:** Use Node.js debugging tools (`node --inspect-brk dist/bin/roocode-generator.js ...`) on the _built_ application to step through the grammar loading process in `TreeSitterParserService` and understand where the path resolution fails.
- **Vite Documentation:** Consult Vite's official documentation regarding SSR externalization, library mode for Node.js targets, and handling assets/native modules.
- **`node-tree-sitter` Internals:** Briefly examine the `node-tree-sitter` source code (or its documentation) to understand how it locates the `binding.gyp` or `.node` files. This might provide clues for the build configuration.
- **Community Issues:** Search GitHub issues for Vite, Rollup, and `node-tree-sitter` related to native addon loading problems in bundled Node.js applications.
- **Iterative Testing:** Test frequently after making configuration changes by running `npm run build` and then executing the built application.

## 6. File and Component References

- **Primary Modification Target:** `vite.config.ts`
- **Related Files:** `package.json` (dependencies, build scripts), `src/core/analysis/tree-sitter-parser.service.ts` (runtime context).
- **Build Output:** `dist/` directory.

## 7. Memory Bank References

- `memory-bank/TechnicalArchitecture.md`: Section 6 (Vite issues), Section 3 (Component context).
- `memory-bank/DeveloperGuide.md`: Section 5.2 (Build Process), Section 5.3 (Vite Compatibility Notes).
