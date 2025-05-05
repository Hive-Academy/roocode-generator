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

- **AC1 (Service Correctness):** Covered by Subtask 1.
- **AC2 (Context Structure Verified):** ✅ Completed previously.
- **AC3 (Integration Correctness):** Covered by Subtask 2 (**`codeInsights` populated, `astData` removed**).
- **AC4 (Concurrency Verified):** ✅ Verified previously.
- **AC5-AC9 (LLM Interaction, Prompt, Output, Validation, Errors):** ✅ Verified previously.
- **AC10 (Basic Functionality Verified):** Covered by Subtask 3.
- **AC11 (No New Config Verified):** ✅ Verified previously.
- **AC12 (Code Documentation Updated):** Covered by Subtask 1 & 2.
- **AC13 (Payload Prevention & Integration Correctness):** Covered by Subtask 1 & 2, Verified in Subtask 3 (**Blocker resolved due to `astData` removal and correct `codeInsights` integration**).

## 4. Implementation Subtasks

### Subtask 0: Define Interfaces & Update Context (Completed)

**Status**: ✅ Completed
_(No changes needed)_

---

### Subtask 1: Fix `AstAnalysisService` Condensation Logic

**Status**: **Needs Fixes**

**Description**: Apply corrections to the `_condenseAst` method in `AstAnalysisService` based _only_ on previous code review feedback (e.g., handling methods with modifiers). Update unit tests for the corrected logic.

**Files to Modify**:

- `src/core/analysis/ast-analysis.service.ts` (Modify `_condenseAst`)
- `tests/core/analysis/ast-analysis.service.test.ts` (Modify/Add tests for corrected `_condenseAst`)

**Implementation Details**:

1.  **Apply Review Feedback:** Implement the specific changes requested in the code review for `_condenseAst`.
2.  **Update Unit Tests:** Adjust existing tests or add minimal new ones to cover _only_ the specific fixes applied to `_condenseAst`.
3.  **Update TSDoc:** Ensure comments for the fixed parts of `_condenseAst` are accurate.

**Testing Requirements**:

- Unit tests covering the specific fixes in `_condenseAst` must pass.

**Related Acceptance Criteria**: AC1, AC12, AC13 (Condensation part).
**Estimated effort**: 30 minutes

**Required Delegation Components**:

- Implementation: Apply specific fixes to `_condenseAst`.
- Testing: Update unit tests for the fixes.

**Delegation Success Criteria**:

- Code review feedback for `_condenseAst` is addressed.
- Unit tests validate the specific fixes.

---

### Subtask 2: Fix `ProjectAnalyzer` Context Assembly (Remove `astData`, Add `codeInsights`, Fix Defaults)

**Status**: **Needs Fixes**

**Description**: Modify the final context assembly logic in `ProjectAnalyzer.analyzeProject` to **exclude the raw `astData` property** while ensuring the `codeInsights` property is correctly populated. Also, apply fixes for default values (`componentStructure`, `dependencies`) based on previous review feedback. Update integration tests to verify the final context structure.

**Files to Modify**:

- `src/core/analysis/project-analyzer.ts` (Modify final context creation/return in `analyzeProject`)
- `tests/core/analysis/project-analyzer.test.ts` (Update tests)
- `tests/core/analysis/project-analyzer.treesitter.test.ts` (Update tests)
- `tests/core/analysis/project-analyzer.ast-analysis.test.ts` (Update tests)

**Implementation Details**:

1.  **Apply Review Feedback (Defaults):** Implement the specific changes requested for default handling of `structure.componentStructure` (`{}`) and `dependencies.*` (`{}`).
2.  **Modify Final Context Assembly:**
    - Locate the step where the final `ProjectContext` object is created before being returned.
    - **Ensure the `astData` property is NOT included/copied into this final object.**
    - Ensure the collected `codeInsights` map IS correctly assigned to the `codeInsights` property of the final object.
3.  **Update Integration Tests:**
    - Modify integration tests (`project-analyzer.*.test.ts`) to:
      - **Assert that `result.value.astData` is `undefined` or not present.**
      - Assert that `result.value.codeInsights` IS present and correctly structured (based on mocks).
      - Assert the correct default values for `componentStructure` and `dependencies`.
4.  **Update TSDoc:** Ensure comments for the modified context assembly logic are accurate.

**Testing Requirements**:

- Integration tests for `ProjectAnalyzer` must pass, specifically verifying the **absence** of `astData`, the presence and correctness of `codeInsights`, and the correct default values in the final returned `ProjectContext`.

**Related Acceptance Criteria**: AC3, AC12, AC13 (Integration part).
**Estimated effort**: 30 minutes

**Required Delegation Components**:

- Implementation: Modify final context assembly logic in `analyzeProject`.
- Testing: Update integration tests to verify the final context structure (no `astData`, yes `codeInsights`, correct defaults).

**Delegation Success Criteria**:

- Final `ProjectContext` excludes `astData` and includes correct `codeInsights`.
- Final `ProjectContext` uses correct defaults.
- Integration tests validate the corrected final context structure.

---

### Subtask 3: Create Fixture & Verify Fixes (AC10, AC13)

**Status**: **Needs Fixes**

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
- [ ] `AstAnalysisService` fixed (`_condenseAst`) - **Subtask 1**
- [ ] `ProjectAnalyzer` fixed (Context Assembly: **No `astData`**, Yes `codeInsights`, Defaults) - **Subtask 2**
- [x] `zod` dependency added - Completed
- [x] DI registration verified - Completed
- [ ] Unit tests updated (`AstAnalysisService` fixes) - **Subtask 1**
- [ ] Integration tests updated (`ProjectAnalyzer` final context structure) - **Subtask 2**
- [ ] Fixture file created/verified (`tests/fixtures/sample-ast-analysis.ts`) - **Subtask 3**
- [ ] Manual verification performed (AC10) - **Subtask 3**
- [ ] Blocker verification performed (AC13) - **Subtask 3**
- [ ] Documentation updated (TSDoc comments) - **Subtask 1 & 2**
- [ ] All automated tests pass - **Subtask 3**

## 8. Implementation Sequence

1.  **Subtask 1:** Fix `AstAnalysisService` Condensation Logic
2.  **Subtask 2:** Fix `ProjectAnalyzer` Context Assembly (Remove `astData`, Add `codeInsights`, Fix Defaults)
3.  **Subtask 3:** Create Fixture & Verify Fixes (AC10, AC13)
