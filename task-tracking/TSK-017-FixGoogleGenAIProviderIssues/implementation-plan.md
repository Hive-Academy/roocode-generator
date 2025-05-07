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
  - `src/core/analysis/project-analyzer.ts`
- **Implementation Details:**

  - Create a utility function (e.g., private method `stripJsonComments` in `ProjectAnalyzer`).

  ```typescript
  // Example comment stripping logic (to be refined):
  // private stripJsonComments(jsonString: string): string {
  //   // Remove block comments first
  //   let cleanedString = jsonString.replace(/\/\*[\s\S]*?\*\//g, '');
  //   // Remove line comments (those not preceded by a colon, to be safer with URLs in strings)
  //   cleanedString = cleanedString.replace(/(?<!http:|https:|file:)\/\/[^\r\n]*/g, '');
  //   return cleanedString;
  // }

  // In ProjectAnalyzer.analyzeProject, when reading tsconfig.json:
  // const tsconfigContent = await this.fileOps.readFile(tsconfigPath);
  // if (tsconfigContent.isOk()) {
  //   const fileContentString = tsconfigFileReadResult.value;
  //   const cleanedFileContentString = this.stripJsonComments(fileContentString); // New line
  //   const parsedTsconfig = parseRobustJson(cleanedFileContentString, this.logger); // Modified line
  //   // ...
  // }
  ```

- **Actual Implementation Summary (from Senior Developer report):**
  - Delegated to Junior Coder: Implementation of `stripJsonComments` private method in `ProjectAnalyzer` and its integration into the `tsconfig.json` parsing flow.
  - Junior Coder successfully implemented `stripJsonComments` using a two-pass regex approach:
    1. `/\/\*[\s\S]*?\*\//g` for block comments.
    2. `/(?<!http:|https:|file:)\/\/[^\r\n]*/g` for line comments (protecting URLs).
  - The method was integrated correctly before calling `parseRobustJson` for `tsconfig.json` content.
  - Trace logging was added to the new method.
  - AC6: Verified by Senior Developer. `ProjectAnalyzer` now strips comments from `tsconfig.json` before parsing. The stripping logic handles single-line, multi-line comments and avoids stripping URLs.
  - AC10: Verified by Senior Developer. Changes adhere to project coding standards and patterns.
- **Testing Requirements:** Verification will occur during Subtask 3 (Manual E2E Testing). The developer should manually test with sample `tsconfig.json` files containing comments during development.
- **Related Acceptance Criteria:** AC6, AC10
- **Estimated effort:** 45-60 minutes (including regex refinement)
- **Required Delegation Components:**
  - Junior Coder: Implemented the comment stripping function and integrated it.
    - Component: Implement `stripJsonComments` function. (Completed)
    - Component: Integrate `stripJsonComments` into `ProjectAnalyzer`. (Completed)
  - Junior Tester: N/A for this subtask directly.
- **Delegation Success Criteria**:
  - Junior Coder implements comment stripping. Manual spot-check by Senior Developer confirms basic functionality with a commented `tsconfig.json`. (Achieved)

### Subtask 3: Manual E2E Testing, `ProjectContext` Logging & Verification

- **Status:** In Progress
- **Description:** Conduct comprehensive manual E2E testing for all changes. This includes verifying `AstAnalysisService` and `ProjectAnalyzer` modifications, ensuring correct file/directory exclusions, logging `ProjectContext` to a file, and checking for regressions.
- **Files to Modify / Create:**
  - `src/core/analysis/project-analyzer.ts` (for `ProjectContext` file logging integration and refactoring to use helpers)
  - `src/core/analysis/project-analyzer.helpers.ts` (New file for extracted helper methods)
  - `src/core/di/modules/analysis-module.ts` (for `ProjectAnalyzerHelpers` DI registration)
  - `src/core/di/modules/core-module.ts` (for updating `ProjectAnalyzer` factory to inject helpers)
- **Implementation Details:**
  - **`ProjectContext` Logging (Completed by Junior Coder):**
    - `ProjectAnalyzer.analyzeProject` now serializes the final `ProjectContext` object to `project-context-output.json` (in `.cache` or project root).
    - This was implemented in a private method `_saveProjectContextToFile` (now moved to helpers).
    - Errors are logged as warnings and do not crash the analysis.
    ```typescript
    // In ProjectAnalyzer.analyzeProject (now calling helper):
    // await this.helpers._saveProjectContextToFile(finalContext, this.projectRoot);
    // ...
    // return Result.ok(finalContext);
    ```
  - **Deviation: `ProjectAnalyzer` Refactoring (Completed by Junior Coder):**
    - **Description:** Based on a request to improve maintainability prior to E2E testing, `ProjectAnalyzer` was refactored.
    - **Actions:**
      - Helper methods (`stripJsonComments`, `shouldAnalyzeFile`, `isDirectory`, `_saveProjectContextToFile`, `collectAnalyzableFiles`) were extracted from `ProjectAnalyzer`.
      - These methods were moved into a new injectable class `ProjectAnalyzerHelpers` in `src/core/analysis/project-analyzer.helpers.ts`.
      - `ProjectAnalyzer` now receives `ProjectAnalyzerHelpers` via DI and calls these methods through `this.helpers.*`.
      - DI modules (`analysis-module.ts`, `core-module.ts`) were updated to register and inject `ProjectAnalyzerHelpers`.
    - **Rationale:** To reduce the size and complexity of `project-analyzer.ts` and improve modularity.
  - **E2E Test Execution (To be delegated to Junior Tester):**
    - Run `ProjectAnalyzer.analyzeProject` (e.g., via `npm start -- generate -- -g memory-bank` or a dedicated test script) on the current `roocode-generator` project and potentially 1-2 other diverse small sample projects.
    - Inspect the generated `project-context-output.json` file thoroughly.
    - Verify:
      - Correct parsing of `codeInsights` (AC5).
      - Successful parsing of `tsconfig.json` containing comments (AC6).
      - Correct exclusion of `SKIP_DIRECTORIES` and hidden directories (AC7).
      - No regressions in core analysis features (AC8).
      - No obvious regressions in `GoogleGenAIProvider` functionality (AC1-AC4).
      - Adherence to code quality standards for new code (AC10).
- **Testing Requirements:** As per description. Document manual test cases, observations, and the path to the logged `ProjectContext` file.
- **Related Acceptance Criteria:** AC1-AC8, AC10. (AC9 covered by the thoroughness of manual E2E).
- **Estimated effort:** 2 - 3 hours (logging implementation + refactoring + extensive manual testing and verification)
- **Required Delegation Components:**
  - Junior Coder:
    - Component: Add file logging for `ProjectContext` in `ProjectAnalyzer`. (Completed)
    - Component: Refactor `ProjectAnalyzer` by extracting helper methods to `ProjectAnalyzerHelpers` and update DI. (Completed as part of deviation)
  - Junior Tester: Will perform the bulk of the manual E2E testing and verification.
    - Component: Execute `ProjectAnalyzer` on specified projects.
    - Component: Locate and retrieve the logged `project-context-output.json`.
    - Component: Meticulously verify the content of `project-context-output.json` against all relevant ACs (exclusions, `codeInsights` structure, `tsconfig` parsing outcome).
    - Component: Execute E2E scenarios to check for regressions in core analysis and `GoogleGenAIProvider`.
    - Component: Document all findings, including paths to logs/output files.
- **Delegation Success Criteria**:
  - Junior Coder successfully implements `ProjectContext` file logging and `ProjectAnalyzer` refactoring.
  - Junior Tester provides a comprehensive report detailing E2E test execution, `ProjectContext` file analysis, and verification of all relevant ACs. The `project-context-output.json` file is provided.

## 5. Testing Strategy (Revised)

- **Primary Focus: Manual End-to-End (E2E) Testing (Subtask 3):** This will be the main validation method for this iteration.
  - Execution of `ProjectAnalyzer.analyzeProject` on representative local projects.
  - **Crucially, the full `ProjectContext` object will be logged to a JSON file at the end of `analyzeProject` for detailed manual inspection.** This allows for thorough verification of its structure and content against all acceptance criteria.
  - Verification of `codeInsights` parsing, `tsconfig.json` comment handling, and all file/directory exclusions.
  - Checking for any regressions in core analysis features or `GoogleGenAIProvider` stability through functional E2E scenarios.
- **Developer-Level Testing:** Developers implementing Subtasks 1 and 2 should perform informal manual tests with sample inputs during development to ensure basic correctness before handoff.
- **Unit & Integration Testing:** Deferred for this iteration to expedite delivery of core functional changes. These should be added in a follow-up task to ensure long-term maintainability.
- **Overall:** All new and modified code must adhere to project standards, and the `Result` pattern must be used for error handling.

## 6. Implementation Sequence

1.  **Subtask 1:** Integrate `parseRobustJson` into `AstAnalysisService`
    _Rationale: Foundational change for robust LLM response parsing._
2.  **Subtask 2:** Implement `tsconfig.json` Comment Stripping in `ProjectAnalyzer`
    _Rationale: Addresses a specific parsing issue, building on robust parsing concepts._
3.  **Subtask 3:** Manual E2E Testing, `ProjectContext` Logging & Verification
    _Rationale: Comprehensive validation of all changes, including `ProjectContext` integrity and regression checks. Logging `ProjectContext` is key here. This subtask now also includes the refactoring of `ProjectAnalyzer`._

This revised plan focuses on delivering the core functional improvements quickly, relying on thorough manual E2E testing and detailed `ProjectContext` inspection for validation in this iteration.
