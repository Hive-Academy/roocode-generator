# Implementation Plan: TSK-017 - Enhance JSON Parsing & Exclusions (Manual E2E Focus)

**Task ID:** TSK-017
**Feature Name:** Enhance JSON Parsing Robustness & Verify Exclusions (Manual E2E Testing Focus)
**Date:** May 7, 2025
**Architect:** Software Architect
**Status:** In Progress

## 1. Overview

This implementation plan addresses TSK-017, focusing on enhancing the robustness of JSON parsing mechanisms within the `AstAnalysisService` and `ProjectAnalyzer`, and verifying file/directory exclusions. **Based on user feedback, the `GoogleGenAIProvider` is considered stable. Unit and integration testing for new changes will be deferred in this iteration to prioritize core generator functionality via manual End-to-End (E2E) testing. The `ProjectContext` will be logged to a file for detailed inspection.**

The key technical objectives for this iteration are:

- **`AstAnalysisService` JSON Parsing**: Integrate the `parseRobustJson` utility to handle potentially malformed JSON responses from the LLM when generating `codeInsights`.
- **`ProjectAnalyzer` `tsconfig.json` Parsing**: Implement comment stripping for `tsconfig.json` content before it is parsed by `parseRobustJson`.
- **Exclusion Verification & E2E Testing**: Ensure file/directory exclusions are correctly applied and reflected in the final `ProjectContext`. Verify all changes through manual E2E testing, with `ProjectContext` logged to a file.

This revised plan prioritizes immediate business value by focusing on the parsing and context accuracy issues blocking downstream generator functionality, validated through comprehensive manual E2E checks.

## 2. Implementation Strategy

The implementation will proceed by addressing each component's requirements, with validation primarily through manual E2E testing:

1.  **`AstAnalysisService` (Robust JSON Parsing):**

    - Modify the `analyzeAst` method to use `parseRobustJson`.
    - Ensure error handling is consistent with the `Result` pattern.

2.  **`ProjectAnalyzer` (`tsconfig.json` Comment Stripping):**

    - Implement comment stripping for `tsconfig.json` content before parsing.

3.  **E2E Testing & Verification:**
    - Manually test `ProjectAnalyzer.analyzeProject` extensively.
    - Log the complete `ProjectContext` to a dedicated file for detailed manual inspection against acceptance criteria.
    - Verify file/directory exclusions and overall context integrity.
    - Confirm no regressions in core analysis or `GoogleGenAIProvider` stability through functional E2E scenarios.

## 3. Acceptance Criteria Mapping

| Subtask                                                                | Related Acceptance Criteria (from task-description.md) |
| :--------------------------------------------------------------------- | :----------------------------------------------------- |
| 1. Integrate `parseRobustJson` into `AstAnalysisService`               | AC5                                                    |
| 2. Implement `tsconfig.json` Comment Stripping in `ProjectAnalyzer`    | AC6                                                    |
| 3. Verify Changes via Manual E2E Testing & `ProjectContext` Inspection | AC1-AC4 (No Regression), AC7, AC8, AC9 (via E2E), AC10 |

_Note: AC1-AC4 for GoogleGenAIProvider and AC9 (Comprehensive Testing) will be primarily verified through manual E2E testing and ensuring no regressions._

## 4. Implementation Subtasks

### Subtask 1: Integrate `parseRobustJson` into `AstAnalysisService`

- **Status:** Completed (Commit: `bce5ddd`)
- **Description:** Modify `AstAnalysisService` to use `parseRobustJson` for parsing LLM responses when generating `codeInsights`.
- **Files to Modify:**
  - `src/core/analysis/ast-analysis.service.ts`
- **Implementation Details:**
  ```typescript
  // In AstAnalysisService, likely within analyzeAst or a helper:
  // const llmResponseString = result.value.completion;
  // try {
  //   const insights = parseRobustJson(llmResponseString, this.logger); // New way
  //   return Result.ok(processedInsights);
  // } catch (error) {
  //   this.logger.error('Failed to parse robust JSON for code insights', error, llmResponseString);
  //   return Result.err(new AstAnalysisError(`Failed to parse code insights from LLM: ${error.message}`));
  // }
  ```
  - Ensure `this.logger` is available and passed to `parseRobustJson`.
- **Actual Implementation Summary (from Senior Developer report):**
  - Delegated to Junior Coder: Modification of `AstAnalysisService` to replace `JSON.parse` with `parseRobustJson` and update error handling.
  - Junior Coder successfully imported `parseRobustJson`, replaced the parsing call in `analyzeAst`, passed `this.logger`, and updated the `catch` block to use `this.logger.error`, the new error code `LLM_ROBUST_JSON_PARSE_ERROR` in `RooCodeError`, and included `rawResponse` and `attempts` (if available on error object) in the error context.
  - AC5: Verified by Senior Developer. `parseRobustJson` is used with `this.logger`, and error handling is updated per requirements.
  - AC10: Verified by Senior Developer. Changes adhere to project coding standards and patterns.
- **Testing Requirements:** Verification will occur during Subtask 3 (Manual E2E Testing). The developer should manually test with sample malformed JSON during development.
- **Related Acceptance Criteria:** AC5, AC10
- **Estimated effort:** 30-45 minutes
- **Required Delegation Components:**
  - Junior Coder: Implemented the change in `AstAnalysisService`.
    - Component: Modify `AstAnalysisService` to replace `JSON.parse` with `parseRobustJson` and update error handling. (Completed)
  - Junior Tester: N/A for this subtask directly.
- **Delegation Success Criteria**:
  - Junior Coder correctly integrated `parseRobustJson` and updated error handling. Manual spot-check by Senior Developer confirmed basic functionality. (Achieved)

### Subtask 2: Implement `tsconfig.json` Comment Stripping in `ProjectAnalyzer`

- **Status:** Completed (Commit: `52025c6`)
- **Description:** Modify `ProjectAnalyzer` to strip comments from `tsconfig.json` content before parsing it with `parseRobustJson`.
- **Files to Modify:**
  - `src/core/analysis/project-analyzer.ts` (logic later moved to helpers)
- **Implementation Details:**
  - Logic for stripping comments was implemented and later moved to `ProjectAnalyzerHelpers`.
- **Actual Implementation Summary (from Senior Developer report):**
  - Delegated to Junior Coder: Implementation of `stripJsonComments` private method in `ProjectAnalyzer` and its integration into the `tsconfig.json` parsing flow.
  - Junior Coder successfully implemented `stripJsonComments` using a two-pass regex approach.
  - The method was integrated correctly before calling `parseRobustJson` for `tsconfig.json` content.
  - AC6: Verified by Senior Developer. `ProjectAnalyzer` now strips comments from `tsconfig.json` before parsing.
  - AC10: Verified by Senior Developer. Changes adhere to project coding standards and patterns.
- **Testing Requirements:** Verification will occur during Subtask 3 (Manual E2E Testing).
- **Related Acceptance Criteria:** AC6, AC10
- **Estimated effort:** 45-60 minutes (including regex refinement)
- **Required Delegation Components:**
  - Junior Coder: Implemented the comment stripping function and integrated it. (Completed)
  - Junior Tester: N/A for this subtask directly.
- **Delegation Success Criteria**:
  - Junior Coder implements comment stripping. (Achieved)

### Subtask 3: Manual E2E Testing, `ProjectContext` Logging & Verification

- **Status:** In Progress
- **Description:** Conduct comprehensive manual E2E testing for all changes. This includes verifying `AstAnalysisService` and `ProjectAnalyzer` modifications, ensuring correct file/directory exclusions, logging `ProjectContext` to a file, and checking for regressions.
- **Files to Modify / Create (Source Code):**
  - `src/core/analysis/project-analyzer.ts` (for `ProjectContext` file logging integration and refactoring to use helpers)
  - `src/core/analysis/project-analyzer.helpers.ts` (New file for extracted helper methods)
  - `src/core/di/modules/analysis-module.ts` (for `ProjectAnalyzerHelpers` DI registration)
  - `src/core/di/modules/core-module.ts` (for updating `ProjectAnalyzer` factory to inject helpers)
- **Files to Modify / Create (Test Code for Build Fixes):**
  - `tests/__mocks__/project-analyzer.helpers.mock.ts` (New)
  - `tests/__mocks__/project-analyzer.mock.ts` (New/Refactored)
  - `tests/__mocks__/llm-agent.mock.ts` (Modified)
  - `tests/core/analysis/project-analyzer.ast-analysis.test.ts` (Modified)
  - `tests/core/analysis/project-analyzer.directory.test.ts` (Modified)
  - Other affected test files under `tests/`
- **Implementation Details:**
  - **`ProjectContext` Logging (Completed by Junior Coder):**
    - `ProjectAnalyzer.analyzeProject` now serializes the final `ProjectContext` object to `project-context-output.json`.
    - Implemented via `ProjectAnalyzerHelpers._saveProjectContextToFile`.
    - Errors are logged as warnings and do not crash the analysis.
  - **Deviation: `ProjectAnalyzer` Refactoring (Completed by Junior Coder, Commit: `5d47a53`):**
    - **Description:** `ProjectAnalyzer` was refactored to improve maintainability.
    - **Actions:** Helper methods extracted to `ProjectAnalyzerHelpers` class; DI updated.
    - **Rationale:** Reduce complexity of `project-analyzer.ts`.
  - **Deviation: Test Environment Fixes for `ProjectAnalyzer` Refactoring (Completed by Junior Tester, Commit: `5d52018`):**
    - **Description:** Following the `ProjectAnalyzer` refactoring, the test environment required updates to ensure the build passed and E2E testing could proceed.
    - **Actions:**
      - Created centralized mocks: `tests/__mocks__/project-analyzer.helpers.mock.ts`, `tests/__mocks__/project-analyzer.mock.ts`.
      - Updated `tests/__mocks__/llm-agent.mock.ts`.
      - Refactored affected test files (e.g., `project-analyzer.ast-analysis.test.ts`, `project-analyzer.directory.test.ts`, and others) to use the new mocking strategy.
    - **Rationale:** To unblock E2E testing by resolving build and test failures caused by the refactoring.
  - **E2E Test Execution (To be delegated to Junior Tester):**
    - Run `ProjectAnalyzer.analyzeProject` on specified projects.
    - Inspect `project-context-output.json`.
    - Verify AC5 (codeInsights), AC6 (tsconfig comments), AC7 (exclusions), AC8 (core analysis regressions), AC1-AC4 (GoogleGenAIProvider regressions), AC10 (code quality).
- **Testing Requirements:** As per description. Document manual test cases, observations, and the path to the logged `ProjectContext` file.
- **Related Acceptance Criteria:** AC1-AC8, AC10. (AC9 covered by the thoroughness of manual E2E).
- **Estimated effort:** 2 - 3 hours (original estimate) + time for refactoring and test fixes.
- **Required Delegation Components:**
  - Junior Coder:
    - Component: Add file logging for `ProjectContext`. (Completed)
    - Component: Refactor `ProjectAnalyzer` & update DI. (Completed)
  - Junior Tester:
    - Component: Fix test environment (mocks, test files) post-refactoring to enable build. (Completed)
    - Component: Execute `ProjectAnalyzer` on specified projects. (Pending)
    - Component: Locate and retrieve `project-context-output.json`. (Pending)
    - Component: Meticulously verify `project-context-output.json` against ACs. (Pending)
    - Component: Execute E2E scenarios for regressions. (Pending)
    - Component: Document all findings. (Pending)
- **Delegation Success Criteria**:
  - Junior Coder successfully implements logging and refactoring. (Achieved)
  - Junior Tester successfully fixes the build and test environment. (Achieved)
  - Junior Tester provides a comprehensive report detailing E2E test execution, `ProjectContext` file analysis, and verification of all relevant ACs. (Pending)

## 5. Testing Strategy (Revised)

- **Primary Focus: Manual End-to-End (E2E) Testing (Subtask 3):** This will be the main validation method for this iteration.
  - Execution of `ProjectAnalyzer.analyzeProject` on representative local projects.
  - **Crucially, the full `ProjectContext` object will be logged to a JSON file at the end of `analyzeProject` for detailed manual inspection.**
  - Verification of `codeInsights` parsing, `tsconfig.json` comment handling, and all file/directory exclusions.
  - Checking for any regressions in core analysis features or `GoogleGenAIProvider` stability.
- **Developer-Level Testing:** Informal manual tests by developers during Subtasks 1 & 2.
- **Unit & Integration Testing:** Deferred for this iteration.

## 6. Implementation Sequence

1.  **Subtask 1:** Integrate `parseRobustJson` into `AstAnalysisService`
2.  **Subtask 2:** Implement `tsconfig.json` Comment Stripping in `ProjectAnalyzer`
3.  **Subtask 3:** Manual E2E Testing, `ProjectContext` Logging & Verification
    - Includes `ProjectContext` logging implementation.
    - Includes `ProjectAnalyzer` refactoring.
    - Includes test environment fixes post-refactoring.
    - Concludes with E2E testing and verification.

This revised plan focuses on delivering the core functional improvements quickly, relying on thorough manual E2E testing and detailed `ProjectContext` inspection for validation in this iteration.
