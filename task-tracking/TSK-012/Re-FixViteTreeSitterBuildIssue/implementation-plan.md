# Implementation Plan: Re-Fix Vite Build Configuration for Tree-sitter Native Modules

**Task ID:** TSK-012
**Priority:** High (Blocks TSK-008)
**Supersedes:** Attempted fix in TSK-011

## 1. Overview

This plan addresses the persistent "Invalid language object" runtime error encountered when loading Tree-sitter grammars in the Vite-built application (`dist/`). Previous attempts involved incomplete post-build copying and eager loading, but failed because the underlying WASM grammar files were not correctly handled by the build process or located at runtime.

This plan focuses on ensuring:

1.  The `node-tree-sitter`, `tree-sitter-javascript`, and `tree-sitter-typescript` JavaScript modules are correctly externalized by Vite/Rollup.
2.  The `TreeSitterParserService` uses the correct `require`-based approach to load grammars during initialization.

**Files to Modify:**

- `package.json` (Remove `vite-plugin-static-copy` dev dependency)
- `vite.config.ts` (Remove static copy plugin configuration)
- `src/core/analysis/tree-sitter-parser.service.ts` (Update grammar loading logic to use `require`)
- `src/core/di/modules/core-module.ts` (Update DI registration)
- `src/core/analysis/tree-sitter.config.ts` (Update query node types - **BLOCKER**)
- **Files to Remove**:
  - `src/core/analysis/grammar-loader.service.ts`
  - `src/core/analysis/interfaces/grammar-loader.interface.ts`

## 2. Implementation Strategy

1.  **Verify/Ensure Externalization:** Explicitly add tree-sitter packages to `build.rollupOptions.external` in `vite.config.ts` to ensure they are not bundled.
2.  **Remove Static Copy Plugin:** Remove `vite-plugin-static-copy` dev dependency and its configuration from `vite.config.ts`.
3.  **Update Runtime Loading:** Modify `TreeSitterParserService`'s existing grammar loading logic (likely within an `initialize` method) to use `require('tree-sitter-language-name')`.
4.  **Refactor DI & Remove Files:** Remove the `GrammarLoaderService`, its interface, and update the DI container. Delete the corresponding files.
5.  **Update Queries:** Identify the correct node type names for the official `tree-sitter-typescript` grammar and update `TS_FUNCTION_QUERY` and `TS_CLASS_QUERY` in `src/core/analysis/tree-sitter.config.ts`. (**BLOCKER**)
6.  **Testing:** After each significant change, perform a clean build (`npm run clean && npm run build`) and run the built application (`node dist/roocode-generator.cjs analyze` or `node dist/roocode-generator.es.js analyze`) using commands that trigger the `TreeSitterParserService` to verify errors are resolved.

## 3. Acceptance Criteria Mapping

- **AC1 (Build Success):** Verified by `npm run build` after configuration changes. **(Partially Met - Build passes, but runtime query fails)**
- **AC2 (Runtime Error Gone):** Verified by running the built app with Tree-sitter dependent commands (e.g., `analyze`). **(Partially Met - Initial loading error gone, new query error present)**
- **AC3 (Grammar Loading):** Verified via logging/debugger the built app's `TreeSitterParserService` confirming grammar initialization via `require`. **(Met)**
- **AC4 (Robust Handling):** Verified by code review of the final working configuration (`package.json`, `vite.config.ts`, `tree-sitter-parser.service.ts`, `tree-sitter.config.ts`). **(Pending Query Fix)**
- **AC5 (Unblocks TSK-008):** Verified by attempting TSK-008's manual verification steps (Subtask 5) using the newly built application. **(Blocked by Query Error)**

## 4. Implementation Subtasks

### 1. Implement Post-build File Copy for Tree-sitter Assets (Aborted)

**Status**: Aborted

**Description**: Add the missing `postbuild` script to `package.json` using `cpy-cli`... (Details omitted as aborted)
**Outcome**: Aborted. Investigation revealed that copying prebuilt `.node` files is not a viable cross-platform solution. The modules rely on WASM files and runtime resolution. Proceeding to Subtask 2.

### 2. Configure Vite Externalization and Update Runtime Loading via Require

**Status**: Blocked

**Description**: Configure Vite to correctly externalize Tree-sitter JavaScript modules. Update the existing eager loading mechanism in `TreeSitterParserService` to load grammar modules using `require` during initialization. Remove the unnecessary `GrammarLoaderService` and related files/config. **Blocked pending correct node type names for TypeScript queries.**

**Files Modified/Removed**:

- `package.json`: Removed `vite-plugin-static-copy` dev dependency.
- `vite.config.ts`: Removed `viteStaticCopy` plugin configuration.
- `src/core/analysis/tree-sitter-parser.service.ts`: Updated grammar loading logic to use `require`. Removed `IGrammarLoaderService` dependency.
- `src/core/di/modules/core-module.ts`: Removed registration for `IGrammarLoaderService`.
- `src/core/analysis/grammar-loader.service.ts`: Removed.
- `src/core/analysis/interfaces/grammar-loader.interface.ts`: Removed.
- `tests/core/analysis/tree-sitter-parser.service.base.test.ts`: Updated mocks.
- `tests/core/analysis/tree-sitter-parser.service.extraction.test.ts`: Updated mocks.
- `tests/core/analysis/project-analyzer.test.ts`: Updated mocks (delegated).

**Files Requiring Update (Blocked)**:

- `src/core/analysis/tree-sitter.config.ts`: Needs correct node types for `TS_FUNCTION_QUERY` and `TS_CLASS_QUERY`.

**Implementation Steps Completed**:

1.  Removed `vite-plugin-static-copy` dependency and configuration.
2.  Verified `vite.config.ts` externalizes tree-sitter modules.
3.  Updated `TreeSitterParserService` to use `require` for grammars and removed `GrammarLoaderService` dependency.
4.  Updated DI Container (`core-module.ts`).
5.  Removed unused `grammar-loader.service.ts` and `grammar-loader.interface.ts`.

**Research Summary (Tree-sitter Usage):**

- **Loading:** `node-tree-sitter` requires explicit loading of language grammars via `require('tree-sitter-language-name')` and setting them on the parser instance using `parser.setLanguage(Language)`.
- **Grammars:**
  - `tree-sitter-typescript` provides _two_ distinct grammars: `.typescript` (for TS) and `.tsx` (for TSX/Flow).
  - `tree-sitter-javascript` is the dedicated grammar for standard JavaScript.
- **Recommendation:** Use `tree-sitter-javascript` for `.js` files and `tree-sitter-typescript.typescript` for `.ts` files. Do not rely on the TS grammar for JS parsing. This confirms the `require` approach is correct but highlights the need to use the appropriate grammar per file type.
  **Blocker Details**:

- Runtime execution fails with `Query error of type TSQueryErrorNodeType`.
- This occurs because the node type names used in `TS_FUNCTION_QUERY` and `TS_CLASS_QUERY` (in `tree-sitter.config.ts`) do not match the node types defined by the official `tree-sitter-typescript` grammar.
- Need to identify the correct node type names for TypeScript class methods, class declarations, class name identifiers, and export statements.

**Next Steps (Paused - Pending Architectural Review)**:

1.  **Architectural Review Needed:** Pause further debugging of `TSQueryErrorNodeType`. Escalate concerns regarding the long-term scalability and robustness of the current Tree-sitter query-based analysis approach, especially for diverse project structures (e.g., Nx workspaces, different frameworks/languages).
2.  Await guidance from the Architect on whether to continue fixing the current implementation or pivot to a different analysis strategy (e.g., more direct LLM analysis of file content).
3.  If proceeding with the current approach: Resume debugging the query syntax error in `src/core/analysis/tree-sitter.config.ts`.
4.  Run `npm run clean && npm run build`.
5.  Test runtime execution to verify query error is resolved (AC2, AC5).
6.  Create commit.

**Deviations**:

- The initial approach assumed manual loading of `.wasm` files using `Parser.Language.load` was necessary for `node-tree-sitter`.
- Research and documentation review revealed that `node-tree-sitter` expects grammars to be loaded via `require('tree-sitter-language-name')`.
- The `GrammarLoaderService` and its interface were removed as they became redundant.
- `TreeSitterParserService` was simplified to directly `require` the necessary grammar modules during its initialization.
- The `vite-plugin-static-copy` configuration was removed as `require` handles locating necessary files within `node_modules`.

**Testing Requirements**:

- Run `npm run clean && npm run build`. Ensure it completes successfully (AC1 - Currently Met).
- Inspect the generated `dist/roocode-generator.js`. Verify it contains `require('node-tree-sitter')`, `require('tree-sitter-javascript')`, etc. (Met).
- Run the built application: `node dist/roocode-generator.js analyze`.
- Check logs/debugger to confirm grammars are initialized correctly via `require` (AC3 - Met).
- Verify the query error is resolved after updating `tree-sitter.config.ts` (AC2, AC5 - Blocked).
- Perform TSK-008 manual verification steps (AC5 - Blocked).

**Related Acceptance Criteria**:

- AC1 (Partially Met), AC2 (Partially Met), AC3 (Met), AC4 (Blocked), AC5 (Blocked)

**Estimated effort**: 15-30 minutes (Once unblocked, for updating queries and testing)

**Delegation Notes**: Suitable for Senior Developer. Requires obtaining correct node types, updating queries, and verifying runtime behavior.

## 5. Implementation Sequence

1.  ~~Subtask 1: Implement Post-build File Copy~~ (Aborted)
2.  **Subtask 2: Configure Vite Externalization and Update Runtime Loading via Require** - Implement the revised strategy. (**Blocked**)
3.  **Test Subtask 2 Thoroughly:** Verify against all acceptance criteria once unblocked.

## 6. Testing Strategy

- **Build Verification:** Run `npm run clean && npm run build` after every configuration change.
- **Runtime Verification:** Execute the built application (`node dist/roocode-generator.cjs analyze` or `node dist/roocode-generator.es.js analyze`) after each successful build. Check logs carefully. Focus on query execution errors.
- **Debugging (If Needed):** Use `node --inspect-brk dist/roocode-generator.cjs analyze` to step through query execution in `TreeSitterParserService`.
- **Manual Verification (Final):** Once the query error is resolved, perform the manual verification steps outlined in TSK-008 (Subtask 5) using the _built_ application to explicitly satisfy AC5.

## 7. Verification Checklist

- [x] Plan is concise and focuses on practical implementation details.
- [x] Code style and architecture patterns have been analyzed (N/A for config, maintain style).
- [x] All files to be modified/removed are identified.
- [x] Subtasks are clearly defined with specific changes/approaches (Subtask 2 updated).
- [x] Implementation sequence is logical.
- [x] Testing requirements are specific, including debugging guidance.
- [x] Progress tracking section is included for each subtask (Subtask 2 updated to Blocked).
- [x] Acceptance criteria is clearly mapped to subtasks (Status updated).
- [x] The plan does NOT duplicate business logic analysis from Task Description.
- [x] Guidance on potential Junior role delegation is included (N/A for this task).
