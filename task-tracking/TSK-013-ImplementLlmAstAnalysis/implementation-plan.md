---
title: Implementation Plan
type: template
category: implementation
status: active
taskId: TSK-013
---

# Implementation Plan: TSK-013/FixAndIntegrateLlmAstAnalysis (Revised)

**REVISION 6 (2025-05-05):** Subtask 3 scope changed again per user feedback. Automated test execution removed. Manual verification (AC10, AC13, log observation) shifted to Code Review phase. Subtask 3 now focuses _only_ on reducing logging verbosity.

**REVISION 5 (2025-05-05):** Subtask 3 scope changed. Focus shifted from fixture creation/test runs to reducing logging verbosity. Verification steps remained.

**REVISION 4 (2025-05-05):** Plan refined. Focus on fixing `_condenseAst`, correcting `ProjectAnalyzer` context assembly (removing `astData`, including `codeInsights`), fixing defaults, verifying TSK-015 blocker.

**REVISION 3 (2025-05-05):** Plan updated to focus on fixing existing implementation.

**REVISION 2 (2025-05-05):** Task redelegated due to Code Review feedback.

**REVISION 1:** Initial approach revised to adopt AST Condensation/Filtering strategy.

## 1. Overview

This plan outlines the steps to **fix and finalize** the implementation of **TSK-013**. The primary goals are:

1. Correct the AST condensation logic (`_condenseAst`) in `AstAnalysisService`. (Completed)
2. Correct the context assembly logic in `ProjectAnalyzer` (exclude `astData`, include `codeInsights`, fix defaults). (Completed)
3. **Reduce excessive logging** during the analysis process for better CLI usability. (Subtask 3)
4. Verification of fixes (AC10, AC13) and log reduction will be performed during the **Code Review** phase.

See [[task-tracking/TSK-013-ImplementLlmAstAnalysis/task-description.md]] for detailed requirements.

## 2. Implementation Strategy

### 2.1. Approach (Targeted Fixes & Log Reduction)

1.  **Fix `AstAnalysisService._condenseAst`:** Apply corrections. (✅ Completed in Subtask 1).
2.  **Fix `ProjectAnalyzer` Context Assembly:** Modify final context (omit `astData`, include `codeInsights`, fix defaults). (✅ Completed in Subtask 2).
3.  **Reduce Logging:** Identify and reduce excessive logging in key analysis components (Subtask 3).
4.  **Code Review & Verification:** Review code changes and perform manual verification (AC10, AC13, log observation).

### 2.2. Key Components

- **Fix:**
  - `src/core/analysis/ast-analysis.service.ts` (Logging)
  - `src/core/analysis/project-analyzer.ts` (Logging)
  - Potentially other analysis files with verbose logging.
- **Verify/Use:**
  - Existing interfaces, DI, LLM Agent, Result pattern, Logger (`ILogger`), zod.

### 2.3. Dependencies

- No changes.

### 2.4. Risk Areas

- **Log Reduction:** Ensuring essential error/status messages are not inadvertently removed.

## 3. Acceptance Criteria Mapping

- **AC1 (Service Correctness):** ✅ Completed in Subtask 1.
- **AC2 (Context Structure Verified):** ✅ Completed previously.
- **AC3 (Integration Correctness):** ✅ Completed in Subtask 2.
- **AC4 (Concurrency Verified):** ✅ Verified previously.
- **AC5-AC9 (LLM Interaction, Prompt, Output, Validation, Errors):** ✅ Verified previously.
- **AC10 (Basic Functionality Verified):** ⏳ Verification shifted to Code Review.
- **AC11 (No New Config Verified):** ✅ Verified previously.
- **AC12 (Code Documentation Updated):** ✅ Completed in Subtask 1 & Subtask 2.
- **AC13 (Payload Prevention & Integration Correctness):** ✅ Fixes completed in Subtask 1 & 2. ⏳ Verification shifted to Code Review.
- **(Implicit) Log Verbosity Reduced:** Covered by Subtask 3. ⏳ Verification shifted to Code Review.

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

**Status**: ✅ **Completed**
**Delegation Notes**: Task delegated to Junior Coder. Logging levels adjusted in `project-analyzer.ts`, `ast-analysis.service.ts`, `ILogger`, `LoggerService`, and test mocks updated. Verification deferred to Code Review.

**Description**: Reduce logging verbosity throughout the analysis process (e.g., in `ProjectAnalyzer`, `AstAnalysisService`) to improve CLI usability. Ensure only essential progress/status messages and errors are logged by default.

**Files to Modify**:

- `src/core/analysis/project-analyzer.ts` (Review and adjust logging)
- `src/core/analysis/ast-analysis.service.ts` (Review and adjust logging)
- Potentially other files involved in analysis with verbose logging (e.g., file collectors, parsers).

**Implementation Details**:

1.  **Identify Verbose Logging:** Scan `project-analyzer.ts`, `ast-analysis.service.ts`, and related analysis files for logs that are too detailed for default CLI output (e.g., logging entire objects, frequent per-file status messages not essential for overall progress).
2.  **Adjust Log Levels:**
    - Change overly verbose `this.logger.info(...)` calls to `this.logger.verbose(...)` or `this.logger.debug(...)`.
    - Change detailed debugging logs from `this.logger.debug(...)` to `this.logger.trace(...)`.
    - Remove logs that provide little value.
    - Ensure critical errors (`this.logger.error(...)`) and important warnings (`this.logger.warn(...)`) remain.
    - Ensure essential progress indicators (e.g., "Starting analysis", "Analysis complete", major phase changes) remain at `info` level if appropriate.

**Testing Requirements**:

- Automated tests are deferred for this subtask.
- Manual observation/verification of reduced log output will be performed during Code Review.

**Related Acceptance Criteria**: (Implicit: Reduced log verbosity). Verification shifted to Code Review.
**Estimated effort**: 30 minutes

**Required Delegation Components**:

- Implementation: Identify verbose logging points and adjust log levels/remove logs (Junior Coder).

**Delegation Success Criteria**:

- Logging is demonstrably less verbose during typical analysis runs (to be verified in Code Review).
- Essential error and status messages are preserved.

---

## 5. Technical Considerations

- Focus on adjusting log levels (`info` -> `verbose`/`debug`, `debug` -> `trace`) using the existing `ILogger` interface.

## 6. Testing Approach

- **Automated Tests**: Deferred.
- **Manual Verification**: Shifted to Code Review phase (AC10, AC13, log observation).

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
- [ ] Manual verification performed (AC10) - **Shifted to Code Review**
- [ ] Blocker verification performed (AC13) - **Shifted to Code Review**
- [x] Documentation updated (TSDoc comments) - **Subtask 1 & 2 Completed**
- [ ] All automated tests pass - **Deferred**
- [ ] Log output manually observed and confirmed less verbose - **Shifted to Code Review**

## 8. Implementation Sequence

1.  **Subtask 1:** Fix `AstAnalysisService` Condensation Logic (✅ Completed)
2.  **Subtask 2:** Fix `ProjectAnalyzer` Context Assembly (Remove `astData`, Add `codeInsights`, Fix Defaults) (✅ Completed)
3.  **Subtask 3:** Reduce Logging Verbosity
4.  **Code Review & Verification**
