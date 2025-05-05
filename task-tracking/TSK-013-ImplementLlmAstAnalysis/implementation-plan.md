---
title: Implementation Plan
type: template
category: implementation
status: active
taskId: TSK-013
---

# Implementation Plan: TSK-013/FixAndIntegrateLlmAstAnalysis (Revised)

**REVISION 4 (2025-05-05):** Plan refined based on user feedback. Focus is strictly on fixing `_condenseAst`, correcting `ProjectAnalyzer` context assembly (**specifically removing raw `astData` from the final output** and ensuring `codeInsights` is included), fixing defaults, and verifying the TSK-015 blocker resolution. No reimplementation, only targeted fixes.

**REVISION 3 (2025-05-05):** Plan updated to focus on fixing the existing implementation based on revised task description and previous code review feedback.

**REVISION 2 (2025-05-05):** Task redelegated due to Code Review feedback.

**REVISION 1:** Initial approach revised to adopt AST Condensation/Filtering strategy.

## 1. Overview

This plan outlines the steps to **fix and finalize** the implementation of **TSK-013**. The primary goals are:

1. Correct the AST condensation logic (`_condenseAst`) in `AstAnalysisService` based on previous feedback.
2. Correct the context assembly logic in `ProjectAnalyzer` to:
   - **Exclude the large, raw `astData` from the final returned `ProjectContext`.**
   - Ensure the generated `codeInsights` are correctly included in the final `ProjectContext`.
   - Ensure correct default values for `componentStructure` and `dependencies`.
3. Verify these fixes resolve the payload size issues blocking TSK-015.

See [[task-tracking/TSK-013-ImplementLlmAstAnalysis/task-description.md]] for detailed requirements.

## 2. Implementation Strategy

### 2.1. Approach (Targeted Fixes)

1.  **Fix `AstAnalysisService._condenseAst`:** Apply corrections based on prior code review feedback (Subtask 1).
2.  **Fix `ProjectAnalyzer` Context Assembly:** Modify the final context creation step to **omit `astData`** and correctly include `codeInsights`. Fix default value handling (Subtask 2).
3.  **Verify Fixes:** Update tests to reflect the corrected logic (especially the absence of `astData` and presence of `codeInsights` in the final context). Perform manual verification (AC10) and confirm TSK-015 blocker resolution (AC13) (Subtask 3).

### 2.2. Key Components

- **Fix:**
  - `src/core/analysis/ast-analysis.service.ts` (`_condenseAst` method)
  - `src/core/analysis/project-analyzer.ts` (Final context assembly logic in `analyzeProject`)
  - Unit tests for `AstAnalysisService` (`tests/core/analysis/ast-analysis.service.test.ts`)
  - Integration tests for `ProjectAnalyzer` (`tests/core/analysis/project-analyzer.*.test.ts`) - **Crucially, verify `astData` is NOT in final context.**
- **Create:**
  - `tests/fixtures/sample-ast-analysis.ts` (If not already created in previous attempts)
- **Verify/Use:**
  - Existing interfaces, DI, LLM Agent, Result pattern, Logger, zod.

### 2.3. Dependencies

- No changes.

### 2.4. Risk Areas

- **Condensation Fix:** Ensuring the `_condenseAst` fix is complete.
- **Context Assembly Fix:** Ensuring `astData` is definitively removed and `codeInsights` correctly included in the final context object.
- **Verification:** Thoroughly testing AC13.

## 3. Acceptance Criteria Mapping

- **AC1 (Service Correctness):** ✅ Completed in Subtask 1.
- **AC2 (Context Structure Verified):** ✅ Completed previously.
- **AC3 (Integration Correctness):** ✅ Covered by Subtask 2 (**`codeInsights` populated, `astData` removed**).
- **AC4 (Concurrency Verified):** ✅ Verified previously.
- **AC5-AC9 (LLM Interaction, Prompt, Output, Validation, Errors):** ✅ Verified previously.
- **AC10 (Basic Functionality Verified):** Covered by Subtask 3.
- **AC11 (No New Config Verified):** ✅ Verified previously.
- **AC12 (Code Documentation Updated):** ✅ Completed in Subtask 1 & ✅ Covered by Subtask 2.
- **AC13 (Payload Prevention & Integration Correctness):** ✅ Condensation part completed in Subtask 1. ✅ Integration part covered by Subtask 2. Verification in Subtask 3.

## 4. Implementation Subtasks

### Subtask 0: Define Interfaces & Update Context (Completed)

**Status**: ✅ Completed
_(No changes needed)_

---

### Subtask 1: Fix `AstAnalysisService` Condensation Logic

**Status**: ✅ **Completed** (Commit: `ec1fa42`)

**Description**: Apply corrections to the `_condenseAst` method in `AstAnalysisService` based _only_ on previous code review feedback (e.g., handling methods with modifiers). Update unit tests for the corrected logic.

**Files Modified**:

- `src/core/analysis/ast-analysis.service.ts`
- `tests/core/analysis/ast-analysis.service.test.ts`

**Implementation Details**:

1.  **Applied Review Feedback:** Specific changes requested in the code review for `_condenseAst` were implemented.
2.  **Updated Unit Tests:** Tests adjusted/added to cover the specific fixes.
3.  **Updated TSDoc:** Comments for fixed parts updated.

**Testing Requirements**:

- Unit tests covering the specific fixes in `_condenseAst` passed.

**Related Acceptance Criteria**: AC1, AC12, AC13 (Condensation part) - All Verified.
**Estimated effort**: 30 minutes
**Actual Effort**: ~30 minutes (Based on Senior Dev report)

**Delegation Summary (Senior Dev Report)**:

- Junior Coder: Fix `_condenseAst` logic (✅ Completed, 0 redelegations).
- Junior Tester: Update unit tests (✅ Completed, 0 redelegations).
- Integration: Minor fixes to mock data typing, test structure refactoring.

**Architect Review Notes**: Senior Developer report confirms fixes applied as per review feedback, tests updated, and ACs verified. Delegation was successful. Proceeding to Subtask 2.

---

### Subtask 2: Fix `ProjectAnalyzer` Context Assembly (Remove `astData`, Add `codeInsights`, Fix Defaults)

**Status**: ✅ **Completed**

**Description**: Modify the final context assembly logic in `ProjectAnalyzer.analyzeProject` to **exclude the raw `astData` property** while ensuring the `codeInsights` property is correctly populated. Also, apply fixes for default values (`componentStructure`, `dependencies`) based on previous review feedback. Update integration tests to verify the final context structure.

**Files Modified**:

- `src/core/analysis/types.ts` (Removed `astData` from interface)
- `src/core/analysis/project-analyzer.ts` (Modify final context creation/return in `analyzeProject`)
- `tests/core/analysis/project-analyzer.test.ts` (Update tests)
- `tests/core/analysis/project-analyzer.treesitter.test.ts` (Update tests)
- `tests/core/analysis/project-analyzer.ast-analysis.test.ts` (Update tests)

**Implementation Details**:

1.  **Apply Review Feedback (Defaults):** Verified default handling of `structure.componentStructure` (`{}`) and `dependencies.*` (`{}`) is correct.
2.  **Modify Final Context Assembly:**
    - Located the step where the final `ProjectContext` object is created before being returned.
    - **Ensured the `astData` property is NOT included/copied into this final object.** (Removed from interface and final assembly).
    - Ensured the collected `codeInsights` map IS correctly assigned to the `codeInsights` property of the final object (using `?? {}` default).
3.  **Update Integration Tests:**
    - Modified integration tests (`project-analyzer.*.test.ts`) to:
      - **Assert that `result.value.astData` is `undefined` or not present.**
      - Assert that `result.value.codeInsights` IS present and correctly structured (based on mocks or `{}`).
      - Assert the correct default values for `componentStructure` and `dependencies`.
4.  **Update TSDoc:** Ensured comments for the modified context assembly logic and interface are accurate.

**Testing Requirements**:

- Integration tests for `ProjectAnalyzer` must pass, specifically verifying the **absence** of `astData`, the presence and correctness of `codeInsights`, and the correct default values in the final returned `ProjectContext`. (✅ Verified by Junior Tester)

**Related Acceptance Criteria**: AC3, AC12, AC13 (Integration part) - All Verified.
**Estimated effort**: 30 minutes
**Actual Effort**: ~45 minutes (including delegation, review, redelegation, verification)

**Delegation Summary**:

- Junior Coder: Modify final context assembly logic in `analyzeProject` and update `types.ts`. (✅ Completed, 0 redelegations).
- Junior Tester: Update integration tests to verify the final context structure (no `astData`, yes `codeInsights`, correct defaults). (✅ Completed, 1 redelegation due to incorrect assertions in failure paths).
- Integration: Reviewed and verified changes from both Junior roles.

**Delegation Success Criteria**:

- Final `ProjectContext` excludes `astData` and includes correct `codeInsights`. (✅ Verified)
- Final `ProjectContext` uses correct defaults. (✅ Verified)
- Integration tests validate the corrected final context structure. (✅ Verified after redelegation)

---

### Subtask 3: Create Fixture & Verify Fixes (AC10, AC13)

**Status**: **Not Started**

**Description**: Create the test fixture file (if missing). Run all automated tests. Perform manual verification for basic functionality (AC10) using the fixture. Verify the TSK-015 blocker is resolved (AC13), confirming analysis completes without payload errors and the final context lacks raw `astData`.

**Files to Create/Modify**:

- `tests/fixtures/sample-ast-analysis.ts` (Create, if needed)
- Potentially `run-analyzer.js` or a temporary script for verification.

**Implementation Details**:

1.  **Create/Verify Fixture File:** Ensure `tests/fixtures/sample-ast-analysis.ts` exists and contains suitable sample code (see previous plan version for example content if needed).
2.  **Run Automated Tests:** Execute `npm test` and `npm run type-check`. Fix any failures resulting from Subtask 1 & 2.
3.  **Manual Verification (AC10):**
    - Run `ProjectAnalyzer.analyzeProject` targeting _only_ the fixture file.
    - Log the resulting `ProjectContext`.
    - Verify `codeInsights` is present and correct.
    - **Verify `astData` is NOT present.**
    - Document the outcome.
4.  **Blocker Verification (AC13):**
    - Re-run the steps known to cause the TSK-015 failure (e.g., analyzing a large project/file).
    - Verify the payload error no longer occurs.
    - Verify the process completes successfully.
    - Inspect the final `ProjectContext` (if possible via logging/debugging) to confirm `astData` is absent and `codeInsights` is present.
    - Document the verification method and outcome.

**Testing Requirements**:

- All automated tests must pass.
- Manual verification for AC10 must pass (correct `codeInsights`, no `astData`).
- Verification for AC13 must pass (no payload error, analysis completes, final context structure correct).

**Related Acceptance Criteria**: AC10, AC13.
**Estimated effort**: 45 minutes (including test runs and verification)

**Required Delegation Components**:

- Implementation: Create/verify fixture file.
- Testing: Run all automated tests, perform manual verification (AC10), perform blocker verification (AC13).

**Delegation Success Criteria**:

- Fixture file exists.
- All automated tests pass.
- AC10 verification passes and is documented.
- AC13 verification passes and is documented.

---

## 5. Technical Considerations

- Focus is on minimal, targeted fixes to existing code.
- Key change: Removal of `astData` from the final `ProjectContext` output.

## 6. Testing Approach

- **Unit Tests**: Verify specific fixes in `_condenseAst`.
- **Integration Tests**: Verify final `ProjectContext` structure (**no `astData`**, yes `codeInsights`, correct defaults).
- **Manual/Blocker Verification**: Confirm AC10 and AC13 are met with the corrected implementation.

## 7. Implementation Checklist

- [x] Requirements reviewed (task-description.md - revised)
- [x] Architecture reviewed
- [x] Dependencies checked
- [x] Subtasks defined for fixes
- [x] Interfaces defined - Completed
- [x] `ProjectContext` updated - Completed
- [x] `AstAnalysisService` fixed (`_condenseAst`) - **Subtask 1 Completed**
- [x] `ProjectAnalyzer` fixed (Context Assembly: **No `astData`**, Yes `codeInsights`, Defaults) - **Subtask 2 Completed**
- [x] `zod` dependency added - Completed
- [x] DI registration verified - Completed
- [x] Unit tests updated (`AstAnalysisService` fixes) - **Subtask 1 Completed**
- [x] Integration tests updated (`ProjectAnalyzer` final context structure) - **Subtask 2 Completed**
- [ ] Fixture file created/verified (`tests/fixtures/sample-ast-analysis.ts`) - **Subtask 3**
- [ ] Manual verification performed (AC10) - **Subtask 3**
- [ ] Blocker verification performed (AC13) - **Subtask 3**
- [x] Documentation updated (TSDoc comments) - **Subtask 1 Completed** / **Subtask 2 Completed**
- [ ] All automated tests pass - **Subtask 3**

## 8. Implementation Sequence

1.  **Subtask 1:** Fix `AstAnalysisService` Condensation Logic (✅ Completed)
2.  **Subtask 2:** Fix `ProjectAnalyzer` Context Assembly (Remove `astData`, Add `codeInsights`, Fix Defaults) (✅ Completed)
3.  **Subtask 3:** Create Fixture & Verify Fixes (AC10, AC13)
