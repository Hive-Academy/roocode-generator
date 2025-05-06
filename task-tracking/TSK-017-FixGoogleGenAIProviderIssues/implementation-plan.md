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
6.  **Logging:** Implement comprehensive debug logging for each step of the local context assembly process to aid in verification and troubleshooting. Enhanced INFO level logging for final ProjectContext added.

## 3. Acceptance Criteria Mapping

The primary success of this revised task hinges on the local, accurate generation of `ProjectContext`.

- **NEW AC1:** `ProjectAnalyzer.analyzeProject` successfully generates a complete `ProjectContext` object without making an LLM call for `techStack`, `structure`, or `dependencies` inference. (Clarified: LLM use by `AstAnalysisService` for `codeInsights` is acceptable under this AC).
- **NEW AC2:** The generated `ProjectContext.structure.sourceDir` and `ProjectContext.structure.testDir` are correctly formatted as single strings.
- **NEW AC3:** The generated `ProjectContext.structure` includes a `directoryTree` field accurately representing the nested project file and directory structure (only including analyzable files as defined by `shouldAnalyzeFile`, and excluding `SKIP_DIRECTORIES`).
- **NEW AC4:** The generated `ProjectContext.codeInsights` is correctly and completely populated with AST analysis results from `AstAnalysisService`.
- **NEW AC5:** The generated `ProjectContext.dependencies.internalDependencies` are accurately derived from `codeInsights[filePath].imports`, with paths resolved relative to the project root.
- **NEW AC6:** The generated `ProjectContext` object strictly adheres to its type definition in `src/core/analysis/types.ts` (including any new fields like `directoryTree`).
- **NEW AC7:** The `memory-bank generate` command (or a similar test harness for `ProjectAnalyzer`) successfully consumes the locally generated `ProjectContext` without schema validation errors related to `structure.sourceDir`, `structure.testDir`, or other locally derived fields.
- **NEW AC8 (Verification):** Debug logs clearly show the step-by-step assembly of the `ProjectContext` and the final assembled object before it's returned.
- **Existing ACs (TSK-017 - Provider Stability):** The Google GenAI provider stability fixes (related to original AC3, AC6, AC8 for token counting, limit retrieval, usage) and the API key logging security fix are to remain functional and are not regressed by these changes.

## 4. Implementation Subtasks

### Subtask 1: Update Type Definitions for `ProjectContext`

- **Status:** Completed (Commit: `c0d51ab594ca21991bf29f0348b702b6fe48e99a`)
- **Files to Modify:** `src/core/analysis/types.ts`

### Subtask 2: Implement Local Derivation for `ProjectContext.techStack`

- **Status:** Completed (Commit: `d2280eb`)
- **Files to Modify:** `src/core/analysis/project-analyzer.ts`, `src/core/analysis/tech-stack-helpers.ts` (Created), `src/core/analysis/tech-stack-analyzer.ts` (Created), `src/core/di/modules/analysis-module.ts` (Modified)

### Subtask 3: Implement Local Derivation for `ProjectContext.structure` (Core Fields & `directoryTree`)

- **Status:** Completed (Commit: `8e32b45`)
- **Files to Modify:** `src/core/analysis/project-analyzer.ts` (Modified), `src/core/analysis/structure-helpers.ts` (Created)

### Subtask 4: Implement Local Derivation for `ProjectContext.dependencies.internalDependencies`

- **Status:** Completed (Commit: `1593e52`)
- **Files to Modify:** `src/core/analysis/project-analyzer.ts` (Modified), `src/core/analysis/dependency-helpers.ts` (Created).

### Subtask 5: Refactor `ProjectAnalyzer.analyzeProject` Core Logic

- **Status:** Completed (Commit: `f205317`)
- **Description:**
  1.  Removed the LLM call previously used for `techStack`, `structure`, `dependencies`.
  2.  Removed `buildSystemPrompt()` and related LLM overhead logic.
  3.  Integrated `localTechStackResult`, `localProjectStructure`, `localInternalDependencies`.
  4.  Populated external dependencies from `packageJsonData`.
  5.  Implemented `codeInsightsMap` key transformation (relative to absolute) before calling `deriveInternalDependencies`.
  6.  Ensured `codeInsightsMap` (with relative keys) and `packageJsonData` are in `finalContext`.
  7.  Enhanced debug logging for local assembly.
- **Files to Modify:** `src/core/analysis/project-analyzer.ts`
- **Testing Requirements:** Manual verification during Subtask 6. (Automated unit/integration tests deferred).
- **Related Acceptance Criteria:** NEW AC1, NEW AC6, NEW AC8.
- **Estimated effort:** 45-60 minutes
- **Required Delegation Components:** N/A (Senior Developer direct implementation)

### Subtask 6: Verification and End-to-End Testing

- **Status:** Partially Completed - Issues Found
- **Description:**
  1.  Thoroughly test `ProjectAnalyzer.analyzeProject` with diverse small to medium sample projects (e.g., a simple React app, a Node.js/Express backend, a utility library). Tested with `roocode-generator`.
  2.  Inspect the logged `ProjectContext` output for accuracy, completeness, and adherence to schema (NEW AC1-NEW AC6).
  3.  Run `npm start -- generate -- -g memory-bank` on these projects to ensure it consumes the new `ProjectContext` without the previous validation errors and proceeds further or completes (NEW AC7).
  4.  Ensure `npm run build` passes. (Build passes after fixes).
- **Files to Modify:** N/A (Test execution and observation). Fixes applied to `project-analyzer.ts`, `structure-helpers.ts`, DI modules, and test files to enable build and testing. Commits: `b4c8362`, `d3b4a33`, `f89b924`.
- **Implementation Details:** Focus on verifying the correctness of all locally derived fields.
- **Testing Requirements:** Document manual test cases and observations. (Junior Tester report received for `roocode-generator`).
- **Related Acceptance Criteria:** All NEW ACs, Existing ACs (regression).
- **Estimated effort:** 1.5 - 2 hours
- **Required Delegation Components:**
  - Junior Tester: Executed the `memory-bank generate` command on `roocode-generator`, collected logs, and verified `ProjectContext` structure and content against ACs.
- **Deviations and Findings:**
  - **Build Failures:** Initial test runs blocked by build failures in test files and DI module due to `ProjectAnalyzer` constructor changes. These were fixed (Commit: `b4c8362`).
  - **`tsconfig.json` Parsing:**
    - Initial attempts to use `parseRobustJson` in `ProjectAnalyzer` did not resolve warnings, suggesting stale code execution or issues in helper functions.
    - `structure-helpers.ts` was modified to accept pre-parsed `tsconfigContent` from `ProjectAnalyzer` for `findSourceDir` and `findTestDir`. `ProjectAnalyzer` updated to pass this. (Commit: `f89b924`).
    - **Current Status (Attempt 5):** Junior Tester reports `tsconfig.json` parsing warnings _still persist_ in the logs, despite `parseRobustJson` in `ProjectAnalyzer` appearing to succeed. This indicates the warnings likely originate from `safeReadJsonFile` still being called, possibly by the `StructureHelpers` if the pre-parsed content isn't correctly utilized or if the execution is still using stale code for `structure-helpers.ts`. This needs further investigation.
  - **Directory Exclusions (NEW AC3):** **FAIL.** Critical issue. `node_modules`, `dist`, `coverage`, `bin` are **NOT** excluded from `ProjectContext.structure.directoryTree` when testing `roocode-generator`. `.git` is correctly excluded. This significantly impacts context size and correctness.
  - **LLM Token Limits (Existing ACs - Stability):** **NEW ISSUE.** The `ProjectContext` for `roocode-generator` is too large for `gemini-2.5-flash-preview-04-17`, causing `MemoryBankContentGenerator` to fail. This blocks end-to-end generation for this project.
  - **`codeInsights` Generation (NEW AC4):** The previous "Malformed LLM JSON response" for `src/core/types/common.ts` was **NOT** observed in the latest test run (Attempt 5), with logs indicating successful analysis for that file. This is an improvement.
  - **`ProjectContext` Logging (NEW AC8):** Enhanced INFO level logging for `ProjectContext` was successfully implemented and captured by the Junior Tester.
  - **CLI Command:** Junior tester identified correct command for local testing: `$env:LOG_LEVEL="trace"; node ./bin/roocode-generator.js generate -g memory-bank`.

## 5. Testing Strategy (Revised)

- **Unit Tests & Integration Tests:** Deferred for Subtasks 2-5 as per user directive. To be added in a follow-up task.
- **Manual End-to-End Verification (Subtask 6):** This will be the primary method for verifying the functionality of Subtasks 2-5.
  - Run `ProjectAnalyzer.analyzeProject` (e.g., via `npm start -- generate -- -g memory-bank`) using diverse local test projects. (Tested with `roocode-generator`).
  - Inspect debug/trace logs for the step-by-step assembly and the final `ProjectContext`. (Done, `ProjectContext` captured).
  - Confirm the absence of `ProjectContext` schema validation errors. (Confirmed for `sourceDir`/`testDir` types).
  - Observe if the memory bank generation process can successfully utilize the new locally-generated context. (Blocked by token limits for `roocode-generator`).
- **Build Verification:** `npm run build` must pass after all changes. (Passes).

## 6. Implementation Sequence

1.  Subtask 1: Update Type Definitions (**Completed**)
2.  Subtask 2: Implement `techStack` Local Derivation (**Completed**)
3.  Subtask 3: Implement `structure` Local Derivation (Core Fields & `directoryTree`) (**Completed**)
4.  Subtask 4: Implement `internalDependencies` Local Derivation (**Completed**)
5.  Subtask 5: Refactor `ProjectAnalyzer.analyzeProject` Core Logic (**Completed**)
6.  Subtask 6: Verification and End-to-End Testing (**Partially Completed - Issues Found**)

This revised plan should lead to a more robust and reliable `ProjectContext` generation.
