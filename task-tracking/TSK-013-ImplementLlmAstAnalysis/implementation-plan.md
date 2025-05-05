---
title: Implementation Plan
type: template
category: implementation
status: active
taskId: TSK-013
---

# Implementation Plan: TSK-013/FixAndIntegrateLlmAstAnalysis (Revised)

**REVISION 9 (2025-05-05):** Revised Subtask 4 approach based on feedback. Build errors will be fixed by creating and using **shared mock files/factories** for `ILogger` and `ProjectContext` instead of patching individual test files.

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
4. **Fix build errors** by creating and using shared mocks for test files. (Subtask 4)
5. Verification of fixes (AC10, AC13) and log reduction will be performed during the **Code Review** phase after the build is fixed.

See [[task-tracking/TSK-013-ImplementLlmAstAnalysis/task-description.md]] for detailed requirements.

## 2. Implementation Strategy

### 2.1. Approach (Targeted Fixes, Log Reduction, Shared Mock Fix)

1.  **Fix `AstAnalysisService._condenseAst`:** Apply corrections. (✅ Completed in Subtask 1).
2.  **Fix `ProjectAnalyzer` Context Assembly:** Modify final context (omit `astData`, include `codeInsights`, fix defaults). (✅ Completed in Subtask 2).
3.  **Reduce Logging:** Identify and reduce excessive logging in key analysis components (✅ Completed in Subtask 3).
4.  **Fix Build Errors via Shared Mocks:** Create shared mock implementations/factories for `ILogger` and `ProjectContext`. Update affected test files to use these shared mocks, resolving build errors (Subtask 4).
5.  **Code Review & Verification:** Review code changes (including shared mocks) and perform manual verification (AC10, AC13, log observation) by building and running the memory bank generator on the current codebase.

### 2.2. Key Components

- **Fixed:**
  - `src/core/analysis/ast-analysis.service.ts` (`_condenseAst` method, logging)
  - `src/core/analysis/project-analyzer.ts` (Final context assembly logic, logging)
  - `src/core/application/interfaces.ts` (Added `trace`, `verbose` to `ILogger`)
  - `src/core/services/logger-service.ts` (Implemented `trace`, `verbose`)
  - Unit tests for `AstAnalysisService`
  - Integration tests for `ProjectAnalyzer`
  - Relevant test mocks for logger.
- **Create/Modify (Subtask 4):**
  - New shared mock file(s) (e.g., `tests/__mocks__/logger.mock.ts`, `tests/__mocks__/project-context.mock.ts` or similar).
  - Test files identified as causing build errors (update to use shared mocks).
- **Verify/Use:**
  - Existing interfaces, DI, LLM Agent, Result pattern, Logger (`ILogger`), zod.

### 2.3. Dependencies

- No changes.

### 2.4. Risk Areas

- **Shared Mock Implementation:** Ensuring shared mocks are flexible enough for different test scenarios.

## 3. Acceptance Criteria Mapping

- **AC1 (Service Correctness):** ✅ Completed in Subtask 1.
- **AC2 (Context Structure Verified):** ✅ Completed previously.
- **AC3 (Integration Correctness):** ✅ Completed in Subtask 2.
- **AC4 (Concurrency Verified):** ✅ Verified previously.
- **AC5-AC9 (LLM Interaction, Prompt, Output, Validation, Errors):** ✅ Verified previously.
- **AC10 (Basic Functionality Verified):** ⏳ Verification shifted to Code Review (Blocked by build).
- **AC11 (No New Config Verified):** ✅ Verified previously.
- **AC12 (Code Documentation Updated):** ✅ Completed in Subtask 1 & Subtask 2.
- **AC13 (Payload Prevention & Integration Correctness):** ✅ Fixes completed in Subtask 1 & 2. ⏳ Verification shifted to Code Review (Blocked by build).
- **(Implicit) Log Verbosity Reduced:** ✅ Implementation completed in Subtask 3. ⏳ Verification shifted to Code Review (Blocked by build).
- **(Implicit) Build Success:** Covered by Subtask 4.

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
**Architect Review Notes**: Completed successfully. Critical change (removing `astData`, including `codeInsights`) implemented and tested. Default fixes applied.

---

### Subtask 3: Reduce Logging Verbosity

**Status**: ✅ **Completed** (Commit: `52dba97`)
**Architect Review Notes**: Completed successfully. Logging levels adjusted as per revised scope. Verification deferred to Code Review.

---

### Subtask 4: Fix Build Errors using Shared Mocks

**Status**: ✅ **Completed**

**Description**: Fix the build failure identified in Code Review by creating shared mocks/factories for `ILogger` and `ProjectContext` and updating affected test files to use them.

**Files to Create/Modify**:

- **Create:** Shared mock file(s) in `tests/__mocks__/` (e.g., `logger.mock.ts`, `project-context.mock.ts`).
- **Modify:** Test files identified as causing build errors (update imports and usage to leverage the new shared mocks).

**Implementation Details**:

1.  **Identify Failing Tests:** Run `npm run build` or `npm run type-check` to get the list of files with TypeScript errors related to `ILogger` or `ProjectContext`.
2.  **Create Shared `ILogger` Mock:**
    - Create a file (e.g., `tests/__mocks__/logger.mock.ts`).
    - Implement a reusable mock object or factory function that provides a complete `ILogger` implementation (including `info`, `warn`, `error`, `debug`, `verbose`, `trace` as `jest.fn()`).
3.  **Create Shared `ProjectContext` Mock/Factory:**
    - Create a file (e.g., `tests/__mocks__/project-context.mock.ts`).
    - Implement a factory function that generates mock `ProjectContext` objects.
    - Ensure the generated objects **do not include `astData`** and **do include `codeInsights`** (defaulting to `{}` or accepting overrides).
    - Ensure other properties (`techStack`, `structure`, `dependencies`) have reasonable defaults or allow overrides.
4.  **Update Failing Test Files:**
    - Modify the identified test files.
    - Remove local/inline mocks for `ILogger` and `ProjectContext`.
    - Import and use the new shared mocks/factories to provide test dependencies and expected data. Adjust test logic as needed.
5.  **Verify Build:** Run `npm run build` and `npm run type-check` again to confirm all build errors related to these interfaces are resolved.

**Testing Requirements**:

- `npm run build` must complete successfully.
- `npm run type-check` must complete successfully.
- Running `npm test` is recommended to ensure tests still pass after refactoring to shared mocks, but is not strictly required by this subtask.

**Related Acceptance Criteria**: (Implicit: Build Success). Enables AC10, AC13 verification.
**Estimated effort**: 45 minutes - 1 hour (includes creating shared mocks)

**Required Delegation Components**:

- Implementation: Create shared mock files/factories for `ILogger` and `ProjectContext`. Update affected test files to use the shared mocks (Junior Coder or Junior Tester).

**Delegation Success Criteria**:

- Shared mocks for `ILogger` and `ProjectContext` are created and correctly implement the interfaces (including recent changes).
- Affected test files are updated to use the shared mocks.
- All TypeScript errors related to `ILogger` and `ProjectContext` in test files are resolved.
- The project builds successfully (`npm run build`).
- Type checking passes (`npm run type-check`).

---

## 5. Technical Considerations

- Shared mocks improve maintainability by centralizing mock logic.
- Ensure shared mocks are placed in a conventional location (e.g., `tests/__mocks__/`).

## 6. Testing Approach

- **Build/Type Check**: Primary verification for Subtask 4.
- **Automated Tests**: Running `npm test` is recommended post-fix but deferred as mandatory step.
- **Manual Verification**: Shifted to Code Review phase (AC10, AC13, log observation) - **Blocked until Subtask 4 is complete**.

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
- [x] Shared mocks created (`ILogger`, `ProjectContext`) - **Subtask 4**
- [x] Test files updated to use shared mocks - **Subtask 4**
- [ ] Manual verification performed (AC10) - **Shifted to Code Review (Blocked)**
- [ ] Blocker verification performed (AC13) - **Shifted to Code Review (Blocked)**
- [x] Documentation updated (TSDoc comments) - **Subtask 1 & 2 Completed**
- [x] Project builds successfully (`npm run build`) - **Subtask 4**
- [x] Type checking passes (`npm run type-check`) - **Subtask 4**
- [ ] Log output manually observed and confirmed less verbose - **Shifted to Code Review (Blocked)**

## 8. Implementation Sequence

1.  **Subtask 1:** Fix `AstAnalysisService` Condensation Logic (✅ Completed)
2.  **Subtask 2:** Fix `ProjectAnalyzer` Context Assembly (Remove `astData`, Add `codeInsights`, Fix Defaults) (✅ Completed)
3.  **Subtask 3:** Reduce Logging Verbosity (✅ Completed)
4.  **Subtask 4:** Fix Build Errors using Shared Mocks
5.  **Code Review & Verification (via build & run)**
