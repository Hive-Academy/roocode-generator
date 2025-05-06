# Implementation Plan (Revised): Resolve Tree-sitter Query Runtime Error

**Task ID:** TSK-012
**Priority:** High (Blocks TSK-008)
**Revision:** This plan revises the original TSK-012 scope based on an architectural pivot away from complex Tree-sitter queries.

## 1. Overview

This revised plan addresses the persistent `TSQueryErrorNodeType` runtime error encountered in the Vite-built application. The root cause was identified as problematic Tree-sitter queries (`TS_FUNCTION_QUERY`, `TS_CLASS_QUERY`) in `src/core/analysis/tree-sitter.config.ts`.

Following architectural review, the strategy has pivoted: complex code element extraction (like specific function/class definitions) will be handled by the LLM in a future task, not by intricate Tree-sitter queries.

This plan focuses solely on **removing the problematic queries and their usage** to resolve the immediate runtime blocker, ensuring the application builds and runs successfully with basic Tree-sitter parsing capabilities intact.

**Files to Modify:**

- `src/core/analysis/tree-sitter.config.ts` (Remove specific queries)
- `src/core/analysis/tree-sitter-parser.service.ts` (Remove usage of specific queries)
- Potentially other files consuming the results of these specific queries.

## 2. Implementation Strategy

1.  **Remove Queries:** Delete or comment out `TS_FUNCTION_QUERY` and `TS_CLASS_QUERY` from `src/core/analysis/tree-sitter.config.ts`.
2.  **Remove Query Usage:** Refactor `TreeSitterParserService` and any dependent services to stop executing or relying on the results of these specific queries. The service should still load grammars and parse files into ASTs.
3.  **Testing:** Perform a clean build (`npm run clean && npm run build`) and run the built application (e.g., `npm start -- generate -- --generators memory-bank`) to verify the `TSQueryErrorNodeType` is resolved.

## 3. Acceptance Criteria Mapping

- **AC1 (Build Success):** Verified by `npm run build`. **(Expected: Met)**
- **AC2 (Runtime Error Gone):** Verified by running the built app with Tree-sitter dependent commands. The specific `TSQueryErrorNodeType` must be gone. **(Primary Goal)**
- **AC3 (Grammar Loading):** Verified via logging/debugger that grammars are still loaded via `require`. **(Expected: Met)**
- **AC4 (Robust Handling):** Verified by code review confirming removal of problematic queries and their usage. **(Goal: Ensure clean removal)**
- **AC5 (Unblocks TSK-008):** Verified by confirming the runtime error blocking TSK-008 is resolved. **(Primary Goal)**

## 4. Implementation Subtasks

### 1. Remove Problematic Tree-sitter Queries and Usage

**Status**: Completed

**Delegation Notes**:

- Unit test fixing delegated to Junior Tester due to failures after initial code changes.
- Junior Tester refactored `project-analyzer.test.ts` into multiple files and fixed mock implementations and assertions.
- Build errors in new test files (`project-analyzer.prioritization.test.ts`, `project-analyzer.treesitter.test.ts`) also delegated to Junior Tester for resolution.

**Acceptance Criteria Verification**:

- AC1 (Build Success): ✅ Verified by `npm run build` completing successfully after test fixes.
- AC2 (Runtime Error Gone): ✅ Verified by running `npm start -- generate -- --generators memory-bank`. The `TSQueryErrorNodeType` is confirmed absent. A downstream LLM error occurred, but the target error is resolved.
- AC3 (Grammar Loading): ✅ Verified via runtime logs showing successful grammar initialization.
- AC4 (Robust Handling): ✅ Verified by code changes removing queries and usage, confirmed by passing tests and successful build/runtime execution past the previous error point.
- AC5 (Unblocks TSK-008): ✅ Verified as the runtime blocker (`TSQueryErrorNodeType`) is removed.

**Description**: Remove the `TS_FUNCTION_QUERY` and `TS_CLASS_QUERY` constants from `tree-sitter.config.ts` and refactor `TreeSitterParserService` (and potentially downstream consumers) to no longer execute or depend on these specific queries. Basic file parsing should remain functional.

**Files to Modify**:

- `src/core/analysis/tree-sitter.config.ts`
- `src/core/analysis/tree-sitter-parser.service.ts`
- Search for usages of the query results and remove/refactor as needed.

**Implementation Details**:

- Delete or comment out the query constants.
- Identify methods in `TreeSitterParserService` that used these queries (e.g., methods for extracting functions/classes).
- Remove the query execution logic within those methods. Decide whether to:
  - Remove the methods entirely if they solely relied on these queries.
  - Keep the methods but have them return empty results or throw a 'Not Implemented' error temporarily.
  - Modify downstream code to no longer call these specific extraction methods.
- Ensure the core parsing logic (`parseFile`) remains functional.

**Testing Requirements**:

- Run `npm run test` to ensure unit tests pass after refactoring (tests might need updates).
- Run `npm run clean && npm run build`. Ensure it completes successfully (AC1).
- Run the built application (e.g., `npm start -- generate -- --generators memory-bank`). Verify the `TSQueryErrorNodeType` is gone (AC2, AC5).
- Check logs/debugger to confirm grammars are still loaded (AC3).

**Related Acceptance Criteria**:

- AC1, AC2, AC3, AC4, AC5

**Estimated effort**: 15-30 minutes

**Delegation Notes**: Suitable for Senior Developer. Requires careful removal of specific query logic while preserving basic parsing functionality.

## 5. Implementation Sequence

1.  **Subtask 1: Remove Problematic Tree-sitter Queries and Usage**
2.  **Test Subtask 1 Thoroughly:** Verify against all acceptance criteria.

## 6. Testing Strategy

- **Unit Tests:** Update and run unit tests (`npm run test`) to reflect the removal of query-specific functionality.
- **Build Verification:** Run `npm run clean && npm run build` after changes.
- **Runtime Verification:** Execute the built application (`node dist/roocode-generator.cjs generate -- --generators memory-bank` or similar) after the build. Check console output and logs carefully for the absence of `TSQueryErrorNodeType`.
- **Manual Verification (TSK-008):** Once the error is confirmed gone, attempt the basic steps of TSK-008 again to ensure it is unblocked.

## 7. Verification Checklist

- [ ] Plan is concise and focuses on removing problematic queries.
- [ ] Files to be modified are identified.
- [ ] Subtask is clearly defined.
- [ ] Implementation sequence is logical.
- [ ] Testing requirements are specific.
- [ ] Acceptance criteria are clearly mapped.
