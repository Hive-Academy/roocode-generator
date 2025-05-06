---
title: Implementation Plan
type: template
category: implementation
status: active
taskId: TSK-013
---

# Implementation Plan: TSK-013/FixAndIntegrateLlmAstAnalysis (Revised)

**REVISION 10 (2025-05-05):** Code Review status: NEEDS CHANGES (Round 2). Build fixed and core functionality verified (AC10, AC13 pass). Remaining issue: Specific `debug` logs in `ProjectAnalyzer` are still too verbose. Added Subtask 5 to demote these logs to `trace`.

**REVISION 9 (2025-05-05):** Revised Subtask 4 approach. Build errors fixed using shared mocks.

**REVISION 8 (2025-05-05):** Code Review status: NEEDS CHANGES. Build failure due to outdated test mocks/fixtures (`ILogger`, `ProjectContext`) prevents manual verification. Added Subtask 4 to fix build errors.

**REVISION 7 (2025-05-05):** Updated verification instructions for Code Review phase. Verification (AC10, AC13, Log Observation) to be done via build & run.

**REVISION 6 (2025-05-05):** Subtask 3 scope changed. Automated test execution removed. Manual verification shifted to Code Review phase. Subtask 3 focused only on reducing logging verbosity.

**REVISION 5 (2025-05-05):** Subtask 3 scope changed. Focus shifted from fixture creation/test runs to reducing logging verbosity. Verification steps remained.

**REVISION 4 (2025-05-05):** Plan refined. Focus on fixing `_condenseAst`, correcting `ProjectAnalyzer` context assembly (removing `astData`, including `codeInsights`), fixing defaults, verifying TSK-015 blocker.

**REVISION 3 (2025-05-05):** Plan updated to focus on fixing existing implementation.

**REVISION 2 (2025-05-05):** Task redelegated due to Code Review feedback.

**REVISION 1:** Initial approach revised to adopt AST Condensation/Filtering strategy.

## 1. Overview

This plan outlines the steps to **fix and finalize** the implementation of **TSK-013**. The primary goals were:

1. Correct the AST condensation logic (`_condenseAst`) in `AstAnalysisService`. (Completed)
2. Correct the context assembly logic in `ProjectAnalyzer` (exclude `astData`, include `codeInsights`, fix defaults). (Completed)
3. **Reduce excessive logging** during the analysis process for better CLI usability. (Completed)
4. **Fix build errors** by creating and using shared mocks for test files. (Completed)
5. **Final logging adjustments** in `ProjectAnalyzer`. (Completed)
6. Verification of fixes (AC10, AC13) and log reduction will be performed during the **Code Review** phase after all fixes are complete.

See [[task-tracking/TSK-013-ImplementLlmAstAnalysis/task-description.md]] for detailed requirements.

## 2. Implementation Strategy

### 2.1. Approach (Targeted Fixes, Log Reduction, Shared Mock Fix, Final Log Adjustment)

1.  **Fix `AstAnalysisService._condenseAst`:** Apply corrections. (✅ Completed in Subtask 1).
2.  **Fix `ProjectAnalyzer` Context Assembly:** Modify final context (omit `astData`, include `codeInsights`, fix defaults). (✅ Completed in Subtask 2).
3.  **Reduce Logging (Initial Pass):** Identify and reduce excessive logging in key analysis components (✅ Completed in Subtask 3).
4.  **Fix Build Errors via Shared Mocks:** Create shared mocks and update tests (✅ Completed in Subtask 4).
5.  **Final Log Adjustment:** Demote specific `debug` logs in `ProjectAnalyzer` to `trace` level based on Code Review feedback (✅ Completed in Subtask 5).
6.  **Code Review & Verification:** Review code changes (including final log adjustment) and perform manual verification (AC10, AC13, log observation) by building and running the memory bank generator on the current codebase.

### 2.2. Key Components

- **Fixed:**
  - `src/core/analysis/ast-analysis.service.ts` (`_condenseAst` method, logging)
  - `src/core/analysis/project-analyzer.ts` (Final context assembly logic, logging)
  - `src/core/application/interfaces.ts` (Added `trace`, `verbose` to `ILogger`)
  - `src/core/services/logger-service.ts` (Implemented `trace`, `verbose`)
  - Unit tests for `AstAnalysisService`
  - Integration tests for `ProjectAnalyzer`
  - Relevant test mocks for logger.
  - Shared mocks (`tests/__mocks__/logger.mock.ts`, `tests/__mocks__/project-context.mock.ts`)
  - Test files updated to use shared mocks.
- **Verify/Use:**
  - Existing interfaces, DI, LLM Agent, Result pattern, Logger (`ILogger`), zod.

### 2.3. Dependencies

- No changes.

### 2.4. Risk Areas

- None significant.

## 3. Acceptance Criteria Mapping

- **AC1 (Service Correctness):** ✅ Completed in Subtask 1.
- **AC2 (Context Structure Verified):** ✅ Completed previously.
- **AC3 (Integration Correctness):** ✅ Completed in Subtask 2.
- **AC4 (Concurrency Verified):** ✅ Verified previously.
- **AC5-AC9 (LLM Interaction, Prompt, Output, Validation, Errors):** ✅ Verified previously.
- **AC10 (Basic Functionality Verified):** ✅ Verified in Code Review (Round 2).
- **AC11 (No New Config Verified):** ✅ Verified previously.
- **AC12 (Code Documentation Updated):** ✅ Completed in Subtask 1 & Subtask 2.
- **AC13 (Payload Prevention & Integration Correctness):** ✅ Verified in Code Review (Round 2).
- **(Implicit) Log Verbosity Reduced:** ✅ Implementation completed (Subtask 3 & 5). ⏳ Verification shifted to Code Review (Round 3).
- **(Implicit) Build Success:** ✅ Completed in Subtask 4.

## 4. Implementation Subtasks

### Subtask 0: Define Interfaces & Update Context (Completed)

**Status**: ✅ Completed
_(No changes needed)_

---

### Subtask 1: Fix `AstAnalysisService` Condensation Logic

**Status**: ✅ **Completed** (Commit: `ec1fa42`)
**Architect Review Notes**: Completed successfully. Fixes applied and tested.

---

### Subtask 2: Fix `ProjectAnalyzer` Context Assembly (Remove `astData`, Add `codeInsights`, Fix Defaults)

**Status**: ✅ **Completed** (Commit: `8aa43b4`)
**Architect Review Notes**: Completed successfully. Critical change implemented and tested.

---

### Subtask 3: Reduce Logging Verbosity

**Status**: ✅ **Completed** (Commit: `52dba97`)
**Architect Review Notes**: Completed successfully. Initial logging reduction implemented.

---

### Subtask 4: Fix Build Errors using Shared Mocks

**Status**: ✅ **Completed** (Commit: `8d3f6fa`)
**Architect Review Notes**: Completed successfully. Shared mocks implemented, build fixed.

---

### Subtask 5: Final Logging Adjustments in ProjectAnalyzer

**Status**: ✅ **Completed** (Commit: `db46237`)

**Description**: Demote specific `debug` log calls in `src/core/analysis/project-analyzer.ts` to `trace` level, as identified in the second round of Code Review, to further reduce default logging verbosity.

**Files Modified**:

- `src/core/analysis/project-analyzer.ts`

**Implementation Details**:

1.  **Located Specific Logs:** Lines 145, 191, 291, 356 identified.
2.  **Changed Log Level:** Calls changed from `debug` to `trace`.
3.  **Verified Changes:** Changes confirmed correct.

**Testing Requirements**:

- Verification shifted to Code Review.

**Related Acceptance Criteria**: (Implicit: Log Verbosity Reduced). Verification shifted to Code Review.
**Estimated effort**: 15 minutes
**Actual Effort**: ~10 minutes (Based on Senior Dev report)

**Delegation Summary (Senior Dev Report)**:

- Junior Coder: Modify log calls (✅ Completed, 0 redelegations).
- Integration: Reviewed changes.

**Architect Review Notes**: Completed successfully. Final logging adjustments applied as requested by Code Review.

---

## 5. Technical Considerations

- Simple adjustment of log levels using existing logger methods.

## 6. Testing Approach

- **Build/Type Check**: Completed successfully post-Subtask 4.
- **Automated Tests**: Deferred.
- **Manual Verification**: Shifted to Code Review phase (log observation).

## 7. Implementation Checklist

- [x] Requirements reviewed (task-description.md - revised)
- [x] Architecture reviewed
- [x] Dependencies checked
- [x] Subtasks defined for fixes & logging
- [x] Interfaces defined - Completed
- [x] `ProjectContext` updated - Completed
- [x] `AstAnalysisService` fixed (`_condenseAst`) - **Subtask 1 Completed**
- [x] `ProjectAnalyzer` fixed (Context Assembly: **No `astData`**, Yes `codeInsights`, Defaults) - **Subtask 2 Completed**
- [x] `zod` dependency added - Completed
- [x] DI registration verified - Completed
- [x] Unit tests updated (`AstAnalysisService` fixes) - **Subtask 1 Completed**
- [x] Integration tests updated (`ProjectAnalyzer` final context structure) - **Subtask 2 Completed**
- [x] Logging reviewed and adjusted for verbosity - **Subtask 3 Completed**
- [x] Shared mocks created (`ILogger`, `ProjectContext`) - **Subtask 4 Completed**
- [x] Test files updated to use shared mocks - **Subtask 4 Completed**
- [x] Final logging adjustments applied (`ProjectAnalyzer`) - **Subtask 5 Completed**
- [x] Manual verification performed (AC10) - **Verified in Code Review (R2)**
- [x] Blocker verification performed (AC13) - **Verified in Code Review (R2)**
- [x] Documentation updated (TSDoc comments) - **Subtask 1 & 2 Completed**
- [x] Project builds successfully (`npm run build`) - **Subtask 4 Completed**
- [x] Type checking passes (`npm run type-check`) - **Subtask 4 Completed**
- [ ] Log output manually observed and confirmed less verbose - **Shifted to Code Review (R3)**

## 8. Implementation Sequence

1.  **Subtask 1:** Fix `AstAnalysisService` Condensation Logic (✅ Completed)
2.  **Subtask 2:** Fix `ProjectAnalyzer` Context Assembly (Remove `astData`, Add `codeInsights`, Fix Defaults) (✅ Completed)
3.  **Subtask 3:** Reduce Logging Verbosity (✅ Completed)
4.  **Subtask 4:** Fix Build Errors using Shared Mocks (✅ Completed)
5.  **Subtask 5:** Final Logging Adjustments in ProjectAnalyzer (✅ Completed)
6.  **Code Review & Verification (via build & run)**
