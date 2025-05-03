# Implementation Plan: Re-Fix Vite Build Configuration for Tree-sitter Native Modules

**Task ID:** TSK-012
**Priority:** High (Blocks TSK-008)
**Supersedes:** Attempted fix in TSK-011

## 1. Overview

This plan addresses the persistent "Invalid language object" runtime error encountered when loading Tree-sitter grammars in the Vite-built application (`dist/`). The previous fix attempt (TSK-011) was found to be incompletely implemented (the intended `postbuild` script was missing from `package.json`).

This plan will first correctly implement the `postbuild` file copying strategy intended in TSK-011. If this proves insufficient, as suspected due to potential path resolution issues in bundled code, the plan outlines subsequent steps involving dedicated Vite plugins for native modules or deeper Rollup configuration adjustments, aligned with the investigation guidance in the task description.

**Files to Modify:**

- `package.json` (Primary for Subtask 1, potentially for dependencies in Subtask 2)
- `vite.config.ts` (Primary for Subtask 2)

## 2. Implementation Strategy

1.  **Implement Post-build Copy (TSK-011 Intent):** Add `cpy-cli` (already installed) and the necessary `postbuild` script to `package.json` to copy Tree-sitter's `.node` files and `binding.gyp` into the `dist` directory structure. Test this thoroughly.
2.  **Investigate & Implement Robust Fix (If Necessary):** If the post-build copy fails, proceed with deeper investigation:
    - **Debugging:** Use `node --inspect-brk dist/bin/roocode-generator.js ...` to pinpoint the failure within `node-tree-sitter`'s loading mechanism in the built application.
    - **Vite Native Plugin:** Install and configure `vite-plugin-native` (or a similar plugin) in `vite.config.ts` to handle the `.node` files directly during the build. This is the preferred alternative.
    - **Rollup Configuration:** Explore adjustments to `build.rollupOptions` in `vite.config.ts`, such as fine-tuning `external` or `output.paths`. Consider `preserveModules: true` as a last resort due to its impact on output structure.
3.  **Testing:** After each subtask/attempt, perform a clean build (`npm run build`) and run the built application (`node dist/bin/roocode-generator.js ...`) using commands that trigger the `TreeSitterParserService` to verify the error is resolved and grammars load correctly.

## 3. Acceptance Criteria Mapping

- **AC1 (Build Success):** Verified by `npm run build` after each subtask.
- **AC2 (Runtime Error Gone):** Verified by running the built app with Tree-sitter dependent commands (e.g., `analyze`).
- **AC3 (Grammar Loading):** Verified via logging/debugging the built app's `TreeSitterParserService`.
- **AC4 (Robust Handling):** Verified by code review of the final working configuration (`package.json` and/or `vite.config.ts`) and inspection of the `dist` directory.
- **AC5 (Unblocks TSK-008):** Verified by attempting TSK-008's manual verification steps (Subtask 5) using the newly built application.

## 4. Implementation Subtasks

### 1. Implement Post-build File Copy for Tree-sitter Assets

**Status**: Aborted

**Description**: Add the missing `postbuild` script to `package.json` using `cpy-cli` (already installed as a dev dependency) to copy the required Tree-sitter `.node` files and `binding.gyp` into the `dist/bin/` directory, mirroring the structure expected by the externalized modules. This implements the strategy intended in TSK-011.

**Files to Modify**:

- `package.json`: Add `postbuild` script and modify `build` script to call it.

**Implementation Details**:

```json
// In package.json scripts section:
"scripts": {
  // ... other scripts
  "build": "vite build && npm run postbuild", // Modify build script
  "postbuild": "cpy node_modules/node-tree-sitter/binding.gyp dist/bin/ && cpy node_modules/tree-sitter-*/bindings/node/*.node dist/bin/ --parents --cwd=node_modules", // Add postbuild script
  // Ensure other scripts remain unchanged
},
```

_Note: The `cpy` command structure ensures `binding.gyp` goes to `dist/bin/` and the `.node` files go into `dist/bin/tree-sitter-_/bindings/node/`. Adjust paths if runtime debugging reveals a different expected location.\*

**Testing Requirements**:

- Run `npm run build`. Ensure it completes successfully (AC1).
- Inspect `dist/bin/` directory. Verify `binding.gyp` is present.
- Inspect `dist/bin/tree-sitter-javascript/bindings/node/` and `dist/bin/tree-sitter-typescript/bindings/node/`. Verify the respective `.node` files are present (AC4 - partial).
- Run the built application: `node dist/bin/roocode-generator.js analyze` (or equivalent command triggering `ProjectAnalyzer`).
- Verify if the "Invalid language object" error is resolved (AC2). Use logging/debugging if needed (AC3).

**Related Acceptance Criteria**:

- AC1, AC2, AC3, AC4 (partially)

**Estimated effort**: 15-30 minutes

**Delegation Notes**: Suitable for Senior Developer. Requires careful path handling in the `cpy` command.
**Outcome**: Aborted. Investigation revealed that copying prebuilt `.node` files is not a viable cross-platform solution. The modules rely on runtime resolution within their installed `node_modules` structure. Proceeding to Subtask 2 to verify correct externalization.

### 2. (Conditional) Implement Robust Native Module Handling with Vite Plugin

**Status**: In Progress (Paused)

**Description**: Verify that `node-tree-sitter`, `tree-sitter-javascript`, and `tree-sitter-typescript` are correctly externalized by the build process (likely via `rollup-plugin-node-externals` already configured in `vite.config.ts`). Ensure Vite/Rollup does not attempt to bundle these modules, allowing runtime `require()` calls to resolve them within the installed `node_modules` directory. If externalization is missing or incorrect, adjust the Vite configuration. The use of `vite-plugin-native` is now considered a secondary option if simple externalization proves insufficient after testing.

**Files to Modify**:

- `vite.config.ts`: Verify configuration, potentially adjust `external` options.
- `package.json`: No changes expected unless dependencies need adjustment (unlikely for this step).

**Implementation Details**:

- Examine `vite.config.ts`.
- Locate the `rollup-plugin-node-externals` configuration or the `build.rollupOptions.external` array.
- Confirm that `node-tree-sitter`, `tree-sitter-javascript`, and `tree-sitter-typescript` are included or covered by the externals configuration.
- If not present, add them to the `build.rollupOptions.external` array. Example:

```typescript
// In vite.config.ts
export default defineConfig({
  // ... other config
  build: {
    // ... other build config
    rollupOptions: {
      external: [
        // ... other existing externals
        'node-tree-sitter',
        'tree-sitter-javascript',
        'tree-sitter-typescript',
        // Ensure regex patterns from nodeExternals don't accidentally exclude these
      ],
      // ... rest of rollupOptions
    },
  },
});
```

_Note: Ensure that the configuration correctly prevents these modules from being bundled._

**Testing Requirements**:

- Run `npm run build`. Ensure it completes successfully (AC1).
- Inspect the generated `dist/roocode-generator.js` (or `.mjs`) file. Search for `require("node-tree-sitter")`, `require("tree-sitter-javascript")`, etc. These `require` statements _should_ be present if externalization worked correctly. The code for these modules should _not_ be bundled into the output file.
- Run the built application: `node dist/bin/roocode-generator.js analyze`.
- Verify the "Invalid language object" error is resolved (AC2). Use logging/debugging (AC3).

**Related Acceptance Criteria**:

- AC1, AC2, AC3, AC4

**Estimated effort**: 30-60 minutes (includes potential debugging and plugin configuration adjustments)

**Delegation Notes**: Suitable for Senior Developer. Requires understanding of Vite/Rollup build configuration and module externalization.
**Progress**:

- Verified `nodeExternals` plugin is configured to externalize dependencies.
- Explicitly added tree-sitter packages to `external` array as a precaution.
- Refactored `TreeSitterParserService` to use static `require` for grammars and pre-load them during an `initialize` phase called from `cli-main.ts`.
- Added `rimraf` and a `clean` script to ensure fresh builds.
- **Issue:** Build output (`dist/roocode-generator.js`) still does not contain the expected `require()` statements for tree-sitter modules, indicating externalization is failing despite configuration.
- Attempted using `vite-plugin-native` but encountered configuration issues and reverted.
  **Next Steps (Upon Resumption):** Re-evaluate Vite/Rollup configuration for potential conflicts or alternative externalization methods. Consider if `ssr.external` or `optimizeDeps.exclude` might be interfering, or if a different plugin/approach is needed. Test runtime behavior if externalization can be confirmed.

## 5. Implementation Sequence

1.  **Subtask 1: Implement Post-build File Copy** - Attempt the simpler fix first.
2.  **Test Subtask 1 Thoroughly:** Verify if the runtime error is resolved.
3.  **(Conditional) Subtask 2: Implement Robust Native Module Handling** - Only proceed if Subtask 1 fails.
4.  **Test Subtask 2 Thoroughly:** Verify if the runtime error is resolved.

## 6. Testing Strategy

- **Build Verification:** Run `npm run build` after every configuration change.
- **Runtime Verification:** Execute the built application (`node dist/bin/roocode-generator.js analyze`) after each successful build.
- **Debugging (If Needed):** Use `node --inspect-brk dist/bin/roocode-generator.js analyze` to step through `TreeSitterParserService` and `node-tree-sitter` loading logic in the _built_ application to understand failures. Add temporary logging as needed.
- **Manual Verification (Final):** Once a working solution is found (either Subtask 1 or 2), perform the manual verification steps outlined in TSK-008 (Subtask 5) using the _built_ application to explicitly satisfy AC5.

## 7. Verification Checklist

- [ ] Plan is concise and focuses on practical implementation details.
- [ ] Code style and architecture patterns have been analyzed (N/A for config, maintain style).
- [ ] All files to be modified are identified (`package.json`, `vite.config.ts`).
- [ ] Subtasks are clearly defined with specific changes/approaches.
- [ ] Implementation sequence is logical (attempt simpler fix first).
- [ ] Testing requirements are specific, including debugging guidance.
- [ ] Progress tracking section is included for each subtask.
- [ ] Acceptance criteria is clearly mapped to subtasks.
- [ ] The plan does NOT duplicate business logic analysis from Task Description.
- [ ] Guidance on potential Junior role delegation is included (N/A for this task).
