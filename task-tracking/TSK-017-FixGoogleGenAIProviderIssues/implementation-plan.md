# Implementation Plan: TSK-017 (Revised V2) - Refactor `ProjectAnalyzer` for Local `ProjectContext` Generation (Testing Deferred)

**Task ID:** TSK-017
**Feature Name:** FixGoogleGenAIProviderIssues (Scope Revised: Refactor ProjectAnalyzer for Local ProjectContext Generation)
**Date:** May 6, 2025
**Architect:** Software Architect
**Status:** In Progress

**Note on Testing:** Per user directive, explicit unit and integration testing for subtasks 2-5 will be deferred to prioritize core functionality. Subtask 6 (Verification and End-to-End Testing) will serve as the primary means of functional validation for these changes initially. Automated tests should be added in a follow-up task.

## 1. Overview

This task revises the scope of TSK-017 to address critical feedback regarding the generation of `ProjectContext` within `ProjectAnalyzer`. The primary goal is to refactor `ProjectAnalyzer.analyzeProject` to construct the `ProjectContext` object _entirely_ from local data sources: file system scanning, configuration file parsing (e.g., `package.json`, `tsconfig.json`), and AST analysis (via `AstAnalysisService`).

This change eliminates the current LLM call previously used for inferring `techStack`, `structure`, and `dependencies`. The aim is to significantly improve the reliability, accuracy, and determinism of `ProjectContext` generation, ensuring it serves as a robust and factual foundation for downstream processes, such as memory bank generation.

The security fix for API key logging (Commit `6954b79`) implemented in a previous iteration of TSK-017 remains in place and is considered complete.

## 2. Implementation Strategy

The strategy involves a significant refactoring of `ProjectAnalyzer` to build the `ProjectContext` locally:

1.  **Type Definition Update:** Modify `ProjectStructure` in `src/core/analysis/types.ts` to include a new field for a nested directory tree (e.g., `directoryTree`).
2.  **Local `techStack` Derivation:** Implement logic to determine:
    - `languages`: From file extensions of analyzed files.
    - `frameworks`, `buildTools`, `testingFrameworks`, `linters`: Inferred from `package.json` dependencies and devDependencies.
    - `packageManager`: Detected from lock files (`package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`) or `package.json` scripts.
3.  **Local `structure` Derivation:**
    - `rootDir`: Already available (input to `analyzeProject`).
    - `sourceDir`, `testDir`: Determined by heuristics (common folder names like "src", "source", "lib", "app", "tests", "test", "spec") and/or by parsing `tsconfig.json` (`compilerOptions.rootDir`, `compilerOptions.baseUrl`, `include` patterns). These will be strings.
    - `configFiles`: Identified by scanning `rootDir` for a predefined list of common configuration file names.
    - `mainEntryPoints`: Inferred from `package.json` (`main`, `module`, `exports`, `bin` fields) and/or `tsconfig.json`.
    - `componentStructure`: Will be initialized as an empty object `{}`. Downstream LLMs will use `codeInsights` for deeper component understanding.
    - `directoryTree`: A new field in `ProjectStructure` will be populated by a local recursive scan of `rootDir`, representing the nested structure of directories and analyzable files.
4.  **Local `dependencies` Derivation:**
    - `dependencies`, `devDependencies`, `peerDependencies`: Directly parsed from `package.json`.
    - `internalDependencies`: Derived from `codeInsights[filePath].imports`. This involves resolving import paths to be relative to `rootDir` and categorizing them.
5.  **`ProjectAnalyzer` Refactoring:**
    - Remove the LLM call (`llmAgent.getCompletion` for context analysis) and its associated prompt generation logic (`buildSystemPrompt`).
    - Integrate the new local derivation methods to assemble the complete `ProjectContext`.
    - Ensure `codeInsights` (from `AstAnalysisService`) and `packageJson` data (already parsed) are correctly included.
6.  **Logging:** Implement comprehensive debug logging for each step of the local context assembly process to aid in verification and troubleshooting.

## 3. Acceptance Criteria Mapping

The primary success of this revised task hinges on the local, accurate generation of `ProjectContext`.

- **NEW AC1:** `ProjectAnalyzer.analyzeProject` successfully generates a complete `ProjectContext` object without making an LLM call for `techStack`, `structure`, or `dependencies` inference.
- **NEW AC2:** The generated `ProjectContext.structure.sourceDir` and `ProjectContext.structure.testDir` are correctly formatted as single strings.
- **NEW AC3:** The generated `ProjectContext.structure` includes a `directoryTree` field accurately representing the nested project file and directory structure (only including analyzable files as defined by `shouldAnalyzeFile`).
- **NEW AC4:** The generated `ProjectContext.codeInsights` is correctly and completely populated with AST analysis results from `AstAnalysisService`.
- **NEW AC5:** The generated `ProjectContext.dependencies.internalDependencies` are accurately derived from `codeInsights[filePath].imports`, with paths resolved relative to the project root.
- **NEW AC6:** The generated `ProjectContext` object strictly adheres to its type definition in `src/core/analysis/types.ts` (including any new fields like `directoryTree`).
- **NEW AC7:** The `memory-bank generate` command (or a similar test harness for `ProjectAnalyzer`) successfully consumes the locally generated `ProjectContext` without schema validation errors related to `structure.sourceDir`, `structure.testDir`, or other locally derived fields.
- **NEW AC8 (Verification):** Debug logs clearly show the step-by-step assembly of the `ProjectContext` and the final assembled object before it's returned.
- **Existing ACs (TSK-017 - Provider Stability):** The Google GenAI provider stability fixes (related to original AC3, AC6, AC8 for token counting, limit retrieval, usage) and the API key logging security fix are to remain functional and are not regressed by these changes.

## 4. Implementation Subtasks

### Subtask 1: Update Type Definitions for `ProjectContext`

- **Status:** Completed (Commit: `c0d51ab594ca21991bf29f0348b702b6fe48e99a`)
- **Description:** Modify `ProjectStructure` within `src/core/analysis/types.ts` to include a new field for a nested directory tree. Define the `DirectoryNode` (or similar) type for this tree.

  ```typescript
  // In src/core/analysis/types.ts
  export interface DirectoryNode {
    name: string;
    path: string; // Relative path from rootDir
    type: 'directory' | 'file';
    children?: DirectoryNode[]; // Only for type 'directory'
  }

  export interface ProjectStructure {
    // ... existing fields
    directoryTree: DirectoryNode[]; // Root level nodes
  }
  ```

- **Files to Modify:**
  - `src/core/analysis/types.ts`
- **Implementation Details:** Ensure `DirectoryNode` can represent a recursive structure. Only analyzable files should be included in the tree.
- **Testing Requirements:** Type checking will verify. (Automated unit/integration tests deferred).
- **Related Acceptance Criteria:** NEW AC3, NEW AC6
- **Estimated effort:** 15 minutes
- **Required Delegation Components:** N/A (Direct implementation)

### Subtask 2: Implement Local Derivation for `ProjectContext.techStack`

- **Status:** Completed (Commit: `d2280eb`)
- **Description:** Implement logic within `ProjectAnalyzer` (or a new dedicated helper service/functions) to populate the `TechStackAnalysis` object.
  - `languages`: From file extensions of files processed by `AstAnalysisService` or `contentCollector`.
  - `frameworks`, `buildTools`, `testingFrameworks`, `linters`: Heuristics based on `dependencies` and `devDependencies` in `package.json`. (e.g., if 'react' is a dependency, 'React' is a framework). Maintain a mapping if necessary.
  - `packageManager`: Detect from `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, or infer from scripts in `package.json`.
- **Files to Modify:**
  - `src/core/analysis/project-analyzer.ts`
  - `src/core/analysis/tech-stack-helpers.ts` (Created)
  - `src/core/analysis/tech-stack-analyzer.ts` (Created)
  - `src/core/di/modules/analysis-module.ts` (Modified)
- **Implementation Details:** This will involve reading `package.json` (already partially done) and analyzing its contents. A new `TechStackAnalyzerService` encapsulates this logic.
- **Testing Requirements:** Manual verification during Subtask 6. (Automated unit/integration tests deferred).
- **Related Acceptance Criteria:** NEW AC1, NEW AC6
- **Estimated effort:** 30-45 minutes
- **Required Delegation Components:**
  - Junior Coder: Implemented helper functions in `tech-stack-helpers.ts`.

### Subtask 3: Implement Local Derivation for `ProjectContext.structure` (Core Fields & `directoryTree`)

- **Status:** Completed (Commit: `8e32b45`)
- **Description:**
  1.  Implement logic to determine `sourceDir` (string) and `testDir` (string). Strategies:
      - Check for common names (`src`, `source`, `app`, `lib`, `tests`, `test`, `spec`).
      - Parse `tsconfig.json` for `compilerOptions.rootDir`, `baseUrl`, `include`.
  2.  Implement scanning for `configFiles`: Iterate `rootDir` for a predefined list of common configuration file names (e.g., `tsconfig.json`, `.eslintrc.js`, `webpack.config.js`, `vite.config.ts`, `pyproject.toml`, `pom.xml`, etc.).
  3.  Implement logic for `mainEntryPoints`: Check `package.json` (`main`, `module`, `exports`, `bin`), `tsconfig.json`.
  4.  Implement `directoryTree` generation: Recursively scan `rootDir`. For each item, if it's a directory, recurse. If it's a file, check if it's analyzable (using existing `shouldAnalyzeFile` logic). Build a nested `DirectoryNode[]` structure. Paths should be relative to `rootDir`.
  5.  `componentStructure` will be initialized to `{}`.
- **Files to Modify:**
  - `src/core/analysis/project-analyzer.ts` (Modified)
  - `src/core/analysis/structure-helpers.ts` (Created)
- **Implementation Details:** The `directoryTree` should only include directories that contain analyzable files or other such directories, and the analyzable files themselves. Helper functions in `structure-helpers.ts` encapsulate the derivation logic.
- **Testing Requirements:** Manual verification during Subtask 6. (Automated unit/integration tests deferred).
- **Related Acceptance Criteria:** NEW AC1, NEW AC2, NEW AC3, NEW AC6
- **Estimated effort:** 1 - 1.5 hours
- **Required Delegation Components:**
  - Junior Coder: Implemented helper functions in `structure-helpers.ts`.

### Subtask 4: Implement Local Derivation for `ProjectContext.dependencies.internalDependencies`

- **Status:** Completed
- **Description:** Process the `codeInsightsMap` (which contains `imports` for each analyzed file). For each import string:
  1.  Determine if it's a relative path, absolute path, or a package/module name.
  2.  If relative/absolute, resolve it to a full path and then to a path relative to `rootDir`.
  3.  Store these resolved relative paths or package names in `ProjectContext.dependencies.internalDependencies: Record<string, string[]>`, where the key is the file path (relative to `rootDir`) and the value is an array of its imported module/file paths (also relative to `rootDir` or as package names).
- **Files to Modify:**
  - `src/core/analysis/project-analyzer.ts`
  - `src/core/analysis/dependency-helpers.ts` (Created)
- **Implementation Details:**
  - Logic for deriving `internalDependencies` was implemented in `src/core/analysis/dependency-helpers.ts` by the Junior Coder. This includes:
    - Iterating through `codeInsightsMap`.
    - Categorizing imports (relative, package).
    - Resolving relative import paths against the current file's directory and then making them relative to `rootDir`.
    - Basic `tsconfig.json` alias path resolution (using `baseUrl` and `paths`) was implemented as a stretch goal. The `deriveInternalDependencies` function accepts an optional `TsConfigPathsInfo` object.
    - Ensuring uniqueness of imported paths/packages per file using a `Set`.
  - The `deriveInternalDependencies` function was integrated into `ProjectAnalyzer.analyzeProject`.
  - `ProjectAnalyzer` now prepares an `absoluteCodeInsightsMap` (transforming relative keys from its internal `codeInsightsMap` to absolute keys) before passing to `deriveInternalDependencies`.
  - `ProjectAnalyzer` also prepares `TsConfigPathsInfo` (with an absolute `baseUrl`) if `tsconfig.json` data is available.
  - The result is used to populate `ProjectContext.dependencies.internalDependencies`.
  - Limitations: File extension/index resolution for imports (e.g., automatically finding `.ts` or `/index.js`) is basic and can be enhanced. Alias resolution does not perform file system checks for resolved paths.
- **Testing Requirements:** Manual verification during Subtask 6. (Automated unit/integration tests deferred).
- **Related Acceptance Criteria:**
  - NEW AC1: Partially addressed, as this subtask contributes to local context generation. Full verification in Subtask 5.
  - NEW AC5: ✅ Satisfied. `internalDependencies` are derived from `codeInsights` and paths are resolved relative to `rootDir`.
  - NEW AC6: ✅ Satisfied. The changes adhere to `ProjectContext` type definitions.
- **Estimated effort:** 45-60 minutes (Actual: ~1 hour including delegation and integration)
- **Required Delegation Components:**
  - Junior Coder: Implemented the core logic in `src/core/analysis/dependency-helpers.ts` (function `deriveInternalDependencies`), including relative path resolution and basic `tsconfig.json` alias handling. (Completed)
- **Deviations:**
  - The `deriveInternalDependencies` function was designed by the Junior Coder to expect `codeInsightsMap` with absolute file paths as keys. `ProjectAnalyzer` was updated to transform its `codeInsightsMap` (which uses relative paths) to meet this expectation before calling the helper.

### Subtask 5: Refactor `ProjectAnalyzer.analyzeProject` Core Logic

- **Status:** Not Started
- **Description:**
  1.  Remove the existing LLM call (`this.llmAgent.getCompletion(...)`) used for generating `techStack`, `structure`, and `dependencies`.
  2.  Remove the `buildSystemPrompt()` method and its usage for this purpose.
  3.  Remove the `ResponseParser.parseLlmResponse` call for the output of this LLM.
  4.  Integrate the new local derivation methods/logic from Subtasks 2, 3, and 4 to assemble these parts of the `ProjectContext`.
  5.  Ensure `codeInsights` (from `AstAnalysisService`) and `packageJson` data (already parsed) are correctly merged into the final `ProjectContext` object.
  6.  Add comprehensive debug logging showing the `ProjectContext` being assembled at various stages and the final object.
- **Files to Modify:**
  - `src/core/analysis/project-analyzer.ts`
- **Implementation Details:** The main `analyzeProject` method will now orchestrate calls to various local analysis functions and assemble their results.
- **Testing Requirements:** Manual verification during Subtask 6. (Automated unit/integration tests deferred).
- **Related Acceptance Criteria:** NEW AC1, NEW AC6, NEW AC8
- **Estimated effort:** 30-45 minutes
- **Required Delegation Components:** N/A (Senior Developer to integrate)

### Subtask 6: Verification and End-to-End Testing

- **Status:** Not Started
- **Description:**
  1.  Thoroughly test `ProjectAnalyzer.analyzeProject` with diverse small to medium sample projects (e.g., a simple React app, a Node.js/Express backend, a utility library).
  2.  Inspect the logged `ProjectContext` output for accuracy, completeness, and adherence to schema (NEW AC1-NEW AC6).
  3.  Run `npm start -- generate -- -g memory-bank` on these projects to ensure it consumes the new `ProjectContext` without the previous validation errors and proceeds further or completes (NEW AC7).
  4.  Ensure `npm run build` passes.
- **Files to Modify:** N/A (Test execution and observation).
- **Implementation Details:** Focus on verifying the correctness of all locally derived fields.
- **Testing Requirements:** Document manual test cases and observations.
- **Related Acceptance Criteria:** All NEW ACs, Existing ACs (regression).
- **Estimated effort:** 1.5 - 2 hours
- **Required Delegation Components:**
  - Junior Tester: Execute the `memory-bank generate` command on various test projects, collect logs, and verify the `ProjectContext` structure and content against the ACs.

## 5. Testing Strategy (Revised)

- **Unit Tests & Integration Tests:** Deferred for Subtasks 2-5 as per user directive. To be added in a follow-up task.
- **Manual End-to-End Verification (Subtask 6):** This will be the primary method for verifying the functionality of Subtasks 2-5.
  - Run `ProjectAnalyzer.analyzeProject` (e.g., via `npm start -- generate -- -g memory-bank`) using diverse local test projects.
  - Inspect debug logs for the step-by-step assembly and the final `ProjectContext`.
  - Confirm the absence of `ProjectContext` schema validation errors.
  - Observe if the memory bank generation process can successfully utilize the new locally-generated context.
- **Build Verification:** `npm run build` must pass after all changes.

## 6. Implementation Sequence

1.  Subtask 1: Update Type Definitions (**Completed**)
2.  Subtask 2: Implement `techStack` Local Derivation (**Completed**)
3.  Subtask 3: Implement `structure` Local Derivation (Core Fields & `directoryTree`) (**Completed**)
4.  Subtask 4: Implement `internalDependencies` Local Derivation
5.  Subtask 5: Refactor `ProjectAnalyzer.analyzeProject` Core Logic
6.  Subtask 6: Verification and End-to-End Testing

This revised plan should lead to a more robust and reliable `ProjectContext` generation.
