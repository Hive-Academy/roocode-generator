# Implementation Plan: Fix Vite Build Configuration for Tree-sitter Native Modules

**Task ID:** TSK-011
**Priority:** High (Blocks TSK-008)

## 1. Overview

This plan addresses the "Invalid language object" runtime error encountered when loading Tree-sitter grammars in the Vite-built application. The primary goal is to modify the Vite configuration (`vite.config.ts`) to correctly handle Tree-sitter's native `.node` modules, ensuring they are accessible at runtime without requiring changes to the `src/core/analysis/tree-sitter-parser.service.ts` if possible.

The core strategy is to leverage Vite's externalization capabilities (`rollup-plugin-node-externals` is already in use) and ensure the necessary `node_modules` containing the `.node` files are correctly located relative to the `dist` output directory after the build. A secondary approach involves using a Vite plugin to copy the `.node` files as assets if pure externalization proves insufficient without code changes.

**Files to Modify:**

- `vite.config.ts` (Primary)
- `package.json` (Potentially, for build script adjustments or adding post-build steps)

## 2. Implementation Strategy

1.  **Verify Externalization:** Confirm that `node-tree-sitter`, `tree-sitter-javascript`, and `tree-sitter-typescript` are indeed being treated as external by the current `rollup-plugin-node-externals` configuration.
2.  **Investigate Runtime Path:** Analyze why the built application (`dist/bin/roocode-generator.js`) cannot locate the `.node` files at runtime. This likely involves understanding how Node.js resolves native addons relative to a bundled file versus a standard `node_modules` structure.
3.  **Adjust Build Process (Preferred):**
    - Explore if tweaking `rollup-plugin-node-externals` options or Rollup output options in `vite.config.ts` can resolve the path issue.
    - If necessary, modify the `build` script in `package.json` to include a post-build step (e.g., using `cpy-cli` or a simple Node script) to copy the required `node_modules/tree-sitter-*` directories into `dist/node_modules` or alongside the main output file in `dist/bin`. This ensures the relative paths expected by the externalized Tree-sitter packages resolve correctly at runtime.
4.  **Asset Copying Plugin (Fallback):** If the above approach fails or requires undesirable code changes, investigate using `vite-plugin-static-copy` to copy the specific `.node` files (e.g., `node_modules/tree-sitter-*/bindings/node/*.node`) into a designated folder within `dist/` (e.g., `dist/native-addons/`). _Note: This might necessitate changes in `tree-sitter-parser.service.ts` to load grammars from this custom path, which should be a last resort._
5.  **Testing:** After each significant change, perform a clean build (`npm run build`) and run the built application (`node dist/bin/roocode-generator.js ...`) using commands that trigger the `TreeSitterParserService` (as defined by TSK-008 testing/verification steps) to confirm the error is resolved and grammars load correctly.

## 3. Acceptance Criteria Mapping

- **AC1 (Build Success):** Addressed by ensuring any Vite config changes or added plugins/scripts don't break the build. Verified by `npm run build`.
- **AC2 (Runtime Error Gone):** The core goal. Verified by running the built app with Tree-sitter dependent commands.
- **AC3 (Grammar Loading):** Direct outcome of fixing the path issue. Verified via logging/debugging the built app.
- **AC4 (`.node` File Location):** Addressed by either ensuring `node_modules` are correctly present relative to `dist` or by copying assets. Verified by inspecting the `dist` directory.
- **AC5 (Config Changes Only):** Prioritized by focusing on externalization and post-build scripts before considering asset copying that might require `src` changes. Verified by code review.
- **AC6 (Unblocks TSK-008):** The ultimate goal. Verified by attempting TSK-008's manual verification steps post-fix.

## 4. Implementation Subtasks

### 1. Configure Vite/Build for Tree-sitter `.node` Files

**Status**: In Progress

**Description**: Modify `vite.config.ts` and potentially `package.json` to ensure Tree-sitter's native `.node` files are correctly located and accessible by the built application in the `dist` directory at runtime. Prioritize externalization and post-build copying over plugins requiring source code changes.

**Files to Modify**:

- `vite.config.ts`: Adjust `build.rollupOptions`, potentially add plugins like `vite-plugin-static-copy` as a fallback.
- `package.json`: Modify `scripts.build` to include post-build steps if needed (e.g., using `cpy-cli` to copy `node_modules/tree-sitter-*` folders).

**Implementation Details**:

- **Attempt 1 (Externalization + Post-build Copy):**

  - Verify `tree-sitter-*` are externalized.
  - Add a post-build script to `package.json`:
    ```json
    // Example using cpy-cli (install if needed: npm i -D cpy-cli)
    "scripts": {
      "build": "vite build && npm run postbuild",
      "postbuild": "cpy node_modules/tree-sitter-*/bindings/node/*.node dist/bindings/node --parents && cpy node_modules/node-tree-sitter/binding.gyp dist/node_modules/node-tree-sitter/" // Adjust paths as needed
      // Or copy entire folders: cpy node_modules/tree-sitter-javascript dist/node_modules/tree-sitter-javascript --parents && cpy node_modules/tree-sitter-typescript dist/node_modules/tree-sitter-typescript --parents && cpy node_modules/node-tree-sitter dist/node_modules/node-tree-sitter --parents
    }
    ```
  - Test if the built app finds the modules.

- **Attempt 2 (Vite Plugin - Fallback):**

  - Install `vite-plugin-static-copy`: `npm install -D vite-plugin-static-copy`
  - Configure in `vite.config.ts`:

    ```typescript
    import { viteStaticCopy } from 'vite-plugin-static-copy';

    export default defineConfig({
      plugins: [
        // ... other plugins
        viteStaticCopy({
          targets: [
            {
              src: 'node_modules/tree-sitter-javascript/bindings/node/tree-sitter-javascript.node',
              dest: 'native-addons', // Copies to dist/native-addons/
            },
            {
              src: 'node_modules/tree-sitter-typescript/bindings/node/tree-sitter-typescript.node',
              dest: 'native-addons',
            },
            // Potentially add node-tree-sitter/binding.gyp if needed?
          ],
        }),
      ],
      // ... rest of config
    });
    ```

  - **If this approach is used, it might require modifying `TreeSitterParserService` to look in `path.join(__dirname, '../native-addons')` which should be avoided if possible.**

**Testing Requirements**:

- Run `npm run build` after changes. Ensure it completes without errors (AC1).
- Inspect the `dist` directory to confirm `.node` files (and potentially `binding.gyp`) are in the expected location (e.g., `dist/node_modules/...` or `dist/native-addons/`) (AC4).
- Run the built application: `node dist/bin/roocode-generator.js [command-that-uses-analyzer]` (replace with actual command once TSK-008 provides it).
- Verify no "Invalid language object" error occurs (AC2).
- Add temporary logging in `TreeSitterParserService` (around the `Language.load` call) to confirm grammars load successfully in the built app (AC3).
- Confirm changes are primarily in config files (AC5).

**Related Acceptance Criteria**:

- AC1, AC2, AC3, AC4, AC5

**Estimated effort**: 30 minutes (depending on which approach works)

**Delegation Notes**: Suitable for Senior Developer. Requires understanding of Vite/Rollup build process, Node.js module resolution (especially native addons), and potentially shell scripting for post-build steps.

## 5. Implementation Sequence

1.  **Subtask 1: Configure Vite/Build for Tree-sitter `.node` Files** - This is the only subtask required to address the core configuration issue.

## 6. Testing Strategy

- **Build Verification:** Run `npm run build` after every configuration change.
- **Runtime Verification:** Execute the built application (`node dist/bin/roocode-generator.js ...`) using a command that invokes the `ProjectAnalyzer` (which uses `TreeSitterParserService`). This command sequence will be clearer once TSK-008 is further along or its testing steps are available. For now, assume a command like `analyze` exists.
- **Manual Verification (Post-Fix):** Once the fix is implemented, perform the manual verification steps outlined in TSK-008 (Subtask 5) using the _built_ application to explicitly satisfy AC6.
- **Debugging:** Use `console.log` statements within `TreeSitterParserService` (specifically around `Language.load`) in the source, rebuild, and run the `dist` version to trace the loading path and confirm success/failure points.

## 7. Verification Checklist

- [ ] Plan is concise and focuses on practical implementation details (Vite config, build scripts).
- [ ] Code style and architecture patterns have been analyzed (N/A for config changes, but maintain config style).
- [ ] All files to be modified are identified (`vite.config.ts`, `package.json`).
- [ ] Subtasks are clearly defined with specific changes/approaches.
- [ ] Implementation sequence is logical (single task).
- [ ] Testing requirements are specific.
- [ ] Progress tracking section is included for the subtask.
- [ ] Acceptance criteria is clearly mapped to the subtask.
- [ ] The plan does NOT duplicate business logic analysis from Task Description.
- [ ] Guidance on potential Junior role delegation is included (N/A for this task).
