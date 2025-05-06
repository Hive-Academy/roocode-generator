---
title: Task Description
type: template
category: task
taskId: TSK-018
priority: High
---

# Task Description: TSK-018/FixDirectoryExclusionLogic

## Overview

During the verification of TSK-017 (Revised: Local ProjectContext Generation), a critical issue was identified: the directory exclusion logic in `ProjectAnalyzer` is not functioning correctly. Standard excluded directories (e.g., `node_modules`, `dist`, `coverage`, `bin`, `.git`) are being incorrectly included in the `ProjectContext.structure.directoryTree` and potentially other file lists when analyzing projects like `roocode-generator` itself.

This failure leads to a massively bloated `ProjectContext`, incorrect project representation, and directly causes downstream LLM token limit failures in the `MemoryBankContentGenerator`. This task is to investigate and fix this directory exclusion logic to ensure accurate and efficient project analysis.

## Requirements

### Functional Requirements

- The `ProjectAnalyzer` must correctly exclude predefined directories (e.g., `node_modules`, `dist`, `.git`, `coverage`, `bin`, and other common non-source directories) from its analysis and from the generated `ProjectContext`.
- The generated `ProjectContext.structure.directoryTree` must accurately reflect the project's structure, omitting excluded directories.
- The list of files considered for detailed analysis (e.g., for AST parsing, `codeInsights`) must not include files from excluded directories.

### Technical Requirements

- Review and correct the logic in `ProjectAnalyzer.collectAnalyzableFiles` (or equivalent functions) to ensure `SKIP_DIRECTORIES` (or similar exclusion configurations) are strictly adhered to.
- Review and correct any logic in `StructureHelpers.generateDirectoryTree` (or equivalent) to ensure it respects directory exclusions or processes already-filtered file/directory lists.
- Ensure that file system traversal logic (e.g., `recursiveReadDir`) correctly applies exclusion rules at appropriate levels to prevent unnecessary processing of excluded paths.
- Add comprehensive unit tests for the directory/file exclusion logic.

## Scope

### Included

- Modifying `src/core/analysis/project-analyzer.ts` to fix directory/file exclusion logic.
- Modifying `src/core/analysis/structure-helpers.ts` or any other helper utilities involved in file/directory collection and tree generation to respect exclusions.
- Updating constants or configurations related to `SKIP_DIRECTORIES` if necessary.
- Adding unit tests to verify the corrected exclusion logic.

### Excluded

- Optimizing `ProjectContext` size beyond fixing the exclusion logic (this will be TSK-020 if still needed).
- Fixing `tsconfig.json` parsing warnings (this will be TSK-019).
- Changes to the `MemoryBankContentGenerator`'s token handling (unless directly related to consuming a correctly filtered `ProjectContext`).

### Affected Components

See [[TechnicalArchitecture]] for component details.

- `src/core/analysis/project-analyzer.ts`
- `src/core/analysis/structure-helpers.ts` (and potentially other file/directory processing utilities)
- Constants/configurations for `SKIP_DIRECTORIES`.

## Dependencies

### Technical Dependencies

- None.

### Task Dependencies

- This task is a blocker for resuming TSK-017.
- This task is a blocker for unblocking TSK-016.

## Success Criteria

1.  **AC1 (Exclusion Logic Fixed):** The directory exclusion logic in `ProjectAnalyzer` (and related helpers) correctly excludes standard directories defined in `SKIP_DIRECTORIES` (e.g., `node_modules`, `dist`, `.git`, `coverage`, `bin`, etc.) from all parts of the `ProjectContext`, including `directoryTree` and file lists used for analysis.
    - _Verification:_ Code review confirms the corrected logic. Unit tests demonstrate that known excludable paths are correctly filtered out during file collection and tree generation.
2.  **AC2 (Correct Directory Tree):** When analyzing the `roocode-generator` project (or a similar test project with standard excluded directories), the `ProjectContext.structure.directoryTree` no longer includes entries from these standard excluded directories.
    - _Verification:_ Manual inspection of the logged/generated `ProjectContext` for `roocode-generator` confirms the absence of `node_modules`, `dist`, etc., in the `directoryTree`.
3.  **AC3 (Reduced ProjectContext Size):** The overall size/token count of the generated `ProjectContext` for `roocode-generator` is significantly reduced due to correct exclusions, making it more manageable for downstream consumers.
    - _Verification:_ Compare the token count or raw size of `ProjectContext` before and after the fix when analyzing `roocode-generator`. A noticeable reduction is expected.
4.  **AC4 (No Regressions):** Legitimate source code directories and files (those not in `SKIP_DIRECTORIES`) are still correctly included in the analysis and `ProjectContext`.
    - _Verification:_ Manual inspection and existing tests (if any cover this) confirm that expected source files are still processed and appear in the `ProjectContext`.
5.  **AC5 (Memory Bank Generation Unblocked - Partial):** After this fix, running `npm start -- generate -- -g memory-bank` on `roocode-generator` should result in a `ProjectContext` that is not excessively bloated by excluded directories. This should allow the `MemoryBankContentGenerator` to proceed with LLM calls without immediately hitting token limits _due to this specific bug_.
    - _Verification:_ Run the memory bank generation command. Observe that the `ProjectContext` passed to `MemoryBankContentGenerator` is of a reasonable size. The process should proceed to LLM calls for content generation. (Ultimate success of memory bank generation might still depend on other factors like legitimate context size, which is out of scope for this task).

## Additional Context

### Business Context

Accurate project analysis is fundamental to generating high-quality, relevant memory bank documentation. The current failure to exclude common non-source directories leads to incorrect project representation, inefficient processing, and critical failures in downstream processes (like LLM calls exceeding token limits). Fixing this is essential for the usability and reliability of the memory bank generation feature, especially for analyzing the generator's own codebase or other medium-to-large projects.

### Technical Context

The Architect's report for TSK-017 (Paused) identified that the `SKIP_DIRECTORIES` constant and associated logic in `collectAnalyzableFiles` (within `project-analyzer.ts`) and potentially `StructureHelpers.generateDirectoryTree` are not functioning as expected. This results in paths like `node_modules` being included in the `directoryTree`. The fix will likely involve ensuring that file system traversal and collection routines correctly and efficiently apply these exclusion rules.

### Related Documentation

- Implementation Plan: [[implementation-plan-template]]
- Technical Details: [[TechnicalArchitecture]]
- Development Guidelines: [[DeveloperGuide]]
- Originating Issue Report: TSK-017 (Paused) - see Architect's report in task history.
