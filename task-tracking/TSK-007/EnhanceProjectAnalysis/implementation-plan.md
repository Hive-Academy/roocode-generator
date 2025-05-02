---
title: Implementation Plan
type: implementation-plan
category: enhancement
taskId: TSK-007
taskName: EnhanceProjectAnalysis
status: Not Started
---

# Implementation Plan: TSK-007/Enhance Project Analysis

## 1. Overview

This plan outlines the technical steps required to enhance the Project Analysis phase (`ProjectAnalyzer`) to extract more granular code structure details (functions, classes, internal dependencies) into the `ProjectContext`. This addresses the findings from TSK-006, aiming to improve the quality of downstream generation tasks, particularly for the memory bank.

The core changes involve:

- Modifying the `ProjectContext` TypeScript interface (`src/core/analysis/types.ts`) to include new fields for defined functions and classes per file.
- Refining the `internalDependencies` structure within the `DependencyGraph` interface.
- Updating the system prompt used by the `ProjectAnalyzer` (`src/core/analysis/project-analyzer.ts`) to instruct the LLM to populate these new fields based on the provided code snippets, including the updated JSON schema definition.
- Updating unit tests to validate the new structure and data.

## 2. Implementation Strategy

The strategy focuses on leveraging the existing LLM-based analysis mechanism while refining its instructions and expected output format.

1.  **Schema Update:** The `ProjectStructure` interface will be augmented with `definedFunctions: Record<string, CodeElementInfo[]>` and `definedClasses: Record<string, CodeElementInfo[]>`. A simple `CodeElementInfo { name: string }` interface will be added. The `DependencyGraph.internalDependencies` will remain `Record<string, string[]>` but the prompt will clarify its expected content (imported modules per file). File paths used as keys will be relative to the project root.
2.  **Prompt Engineering:** The `buildSystemPrompt` method in `ProjectAnalyzer` will be updated. The JSON schema definition within the prompt will be modified to match the new `ProjectContext` structure. Clear instructions will be added, guiding the LLM to identify top-level function and class names within each provided file snippet and map them to their respective file paths in the output. Instructions for populating `internalDependencies` based on import statements will also be refined. The prompt will continue to emphasize relying _only_ on the provided file content.
3.  **Fallback Handling:** The code in `analyzeProject` that constructs the final `ProjectContext` from the parsed LLM response will be updated to include default empty values (`{}`) for the new `definedFunctions` and `definedClasses` fields if they are missing from the LLM output, ensuring backward compatibility and preventing errors if the LLM fails to provide them.
4.  **Testing:** Unit tests for `ProjectAnalyzer` will be updated to assert the presence and basic structure of the new fields in the returned `ProjectContext`. New test cases might be added to specifically target the extraction of function/class names from sample code snippets used in mock LLM responses.

## 3. Acceptance Criteria Mapping

| Acceptance Criterion                                                                                    | Relevant Subtask(s) | Verification Method                                                              |
| :------------------------------------------------------------------------------------------------------ | :------------------ | :------------------------------------------------------------------------------- |
| The Project Analysis process successfully extracts more granular code structure details.                | 2, 4, 5             | Unit Tests, Manual Verification Test (using sample project), Code Review         |
| The `ProjectContext` schema is updated to include the new details.                                      | 1, 4                | Unit Tests (compilation, structure validation), Code Review                      |
| The LLM prompt effectively guides the LLM to provide the granular details in the `ProjectContext`.      | 2, 4, 5             | Unit Tests (mock LLM response validation), Manual Verification Test, Code Review |
| The enhanced `ProjectContext` contains demonstrably more detailed information about internal structure. | 4, 5                | Manual Verification Test (comparison with previous output), Unit Test Assertions |

## 4. Implementation Subtasks

### 1. Update `ProjectContext` Schema

**Status**: Completed

**Description**: Modify the TypeScript interfaces in `src/core/analysis/types.ts` to include the new structure for granular code details.

**Files to Modify**:

- `src/core/analysis/types.ts`: Add `CodeElementInfo` interface. Add `definedFunctions` and `definedClasses` fields to `ProjectStructure`. Review and confirm `internalDependencies` structure in `DependencyGraph`.

**Implementation Details**:

```typescript
// Add near other interfaces
export interface CodeElementInfo {
  name: string;
  // Potentially add more details later like start/end line, params, etc.
}

// Modify ProjectStructure
export interface ProjectStructure {
  // ... existing fields ...
  definedFunctions: Record<string, CodeElementInfo[]>; // Key: relative file path
  definedClasses: Record<string, CodeElementInfo[]>; // Key: relative file path
}

// Confirm DependencyGraph structure (no changes needed for this task)
export interface DependencyGraph {
  // ... existing fields ...
  internalDependencies: Record<string, string[]>; // Key: relative file path, Value: list of imported modules/paths
}
```

**Testing Requirements**:

- Ensure TypeScript compilation succeeds after changes.
- Unit tests in Subtask 4 will validate the usage of this schema.

**Related Acceptance Criteria**:

- AC2: The `ProjectContext` schema is updated...

**Estimated effort**: 15 minutes

**Delegation Notes**: Suitable for Senior Developer. Straightforward interface modification.

**Redelegation History**: N/A

### 2. Update `ProjectAnalyzer` Prompt

**Status**: Completed

**Description**: Modify the `buildSystemPrompt` method in `src/core/analysis/project-analyzer.ts` to include the updated JSON schema definition and instructions for extracting function/class names and internal dependencies.

**Files to Modify**:

- `src/core/analysis/project-analyzer.ts`: Update the string returned by `buildSystemPrompt`.

**Implementation Details**:

- Update the JSON schema definition within the prompt string to match the structure defined in Subtask 1.
- Add specific instructions for populating `definedFunctions`, `definedClasses`, and `internalDependencies`. Example instructions:
  - "For each file provided, identify top-level function definitions and list their names under `structure.definedFunctions`, keyed by the relative file path."
  - "For each file provided, identify top-level class definitions and list their names under `structure.definedClasses`, keyed by the relative file path."
  - "For each file provided, identify imported modules/files (both package imports and relative project imports) and list them as strings under `dependencies.internalDependencies`, keyed by the relative file path."
- Ensure the prompt version (`PROMPT_VERSION`) is incremented if desired.

**Testing Requirements**:

- Unit tests in Subtask 4 will use mock LLM responses based on this new prompt structure.
- Manual verification (Subtask 5) will confirm the LLM follows the instructions.

**Related Acceptance Criteria**:

- AC1: The Project Analysis process successfully extracts...
- AC3: The LLM prompt effectively guides the LLM...

**Estimated effort**: 30 minutes

**Delegation Notes**: Suitable for Senior Developer. Requires careful prompt engineering.

**Redelegation History**: N/A

**Implementation Notes**: Updated the `buildSystemPrompt` method in `src/core/analysis/project-analyzer.ts`. Incremented `PROMPT_VERSION` to `v1.1.0`. Modified the JSON schema definition within the prompt string to include `structure.definedFunctions` and `structure.definedClasses`. Added explicit instructions for the LLM on how to populate these fields (using relative paths as keys and extracting top-level definitions) and refined instructions for `dependencies.internalDependencies`. Emphasized reliance on provided files and strict JSON output.

### 3. Update `ProjectAnalyzer` Default Values

**Status**: Completed

**Description**: Update the fallback logic in the `analyzeProject` method within `src/core/analysis/project-analyzer.ts` to handle cases where the LLM response might be missing the new fields.

**Files to Modify**:

- `src/core/analysis/project-analyzer.ts`: Modify the section where `finalContext` is assembled after parsing the LLM response.

**Implementation Details**:

- Ensure that when constructing `finalContext`, default empty objects (`{}`) are provided for `structure.definedFunctions` and `structure.definedClasses` if they are not present in the `parsedResult.value`.

```typescript
// Example adjustment in analyzeProject
const structure = parsedResult.value.structure ?? { /* existing defaults */ };
const dependencies = parsedResult.value.dependencies ?? { /* existing defaults */ };

const finalContext: ProjectContext = {
  techStack: /* ... */,
  structure: {
    ...structure,
    rootDir: rootPath,
    // Add defaults for new fields
    definedFunctions: structure.definedFunctions ?? {},
    definedClasses: structure.definedClasses ?? {},
  },
  dependencies: {
      ...dependencies,
      // Ensure internalDependencies default is handled if structure changes later
      internalDependencies: dependencies.internalDependencies ?? {},
  },
};
```

**Testing Requirements**:

- Unit tests (Subtask 4) should include cases where the mock LLM response omits the new fields to ensure no errors occur.

**Related Acceptance Criteria**:

- AC2: The `ProjectContext` schema is updated... (Ensures robustness)

**Estimated effort**: 15 minutes

**Delegation Notes**: Suitable for Senior Developer. Simple defensive coding adjustment.

**Redelegation History**: N/A

**Implementation Notes**: Added nullish coalescing operators (`?? {}`) to default `structure.definedFunctions`, `structure.definedClasses`, and `dependencies.internalDependencies` to empty objects in the final context construction within `analyzeProject`. This ensures robustness if the LLM omits these fields.

### 4. Update Unit Tests

**Status**: Completed

**Description**: Update existing unit tests and potentially add new ones for `ProjectAnalyzer` to validate the new schema fields and the extraction logic based on mock LLM responses.

**Files to Modify**:

- `tests/core/analysis/project-analyzer.test.ts`
- Potentially `tests/core/analysis/project-analyzer.prompt.test.ts` (if prompt structure tests exist)
- Related test fixtures/mocks.

**Implementation Details**:

- Modify existing tests that assert the structure of `ProjectContext` to include checks for `definedFunctions` and `definedClasses`.
- Update mock LLM responses used in tests to include examples of the new fields populated according to the updated prompt.
- Add specific test cases that provide sample code snippets in the mock input and verify that the expected function/class names appear in the corresponding fields of the mock `ProjectContext` output.
- Include test cases where the mock LLM response _omits_ the new fields to verify the fallback logic (Subtask 3).

**Testing Requirements**:

- All existing and new unit tests for `ProjectAnalyzer` must pass.
- Test coverage should be maintained or improved.

**Related Acceptance Criteria**:

- AC1: The Project Analysis process successfully extracts...
- AC2: The `ProjectContext` schema is updated...
- AC3: The LLM prompt effectively guides the LLM...
- AC4: The enhanced `ProjectContext` contains demonstrably more detailed information...

**Estimated effort**: 30 minutes

**Delegation Notes**: Suitable for Senior Developer or potentially Junior Tester under guidance, focusing on test case design and implementation. Senior Developer responsible for integration.

**Redelegation History**: N/A

**Implementation Notes**: Added a new `describe` block to `tests/core/analysis/project-analyzer.test.ts` for 'ProjectAnalyzer Analysis Result'. Updated mocks for `LLMAgent` (using `getCompletion`, adding `getProvider`), `ResponseParser` (using `parseLlmResponse`), and `FileOperations` (adding `getFiles`, `readDir`). Added tests to verify parsing of new `definedFunctions`/`definedClasses` fields and the fallback logic when they are missing. Corrected usage of `Result` methods (`unwrap`, `error`). Removed unused `ProjectContext` import to pass linting.
**Implementation Notes**: Added a new `describe` block to `tests/core/analysis/project-analyzer.test.ts` for 'ProjectAnalyzer Analysis Result'. Updated mocks for `LLMAgent` (using `getCompletion`, adding `getProvider`), `ResponseParser` (using `parseLlmResponse`), and `FileOperations` (adding `getFiles`, `readDir`). Added tests to verify parsing of new `definedFunctions`/`definedClasses` fields and the fallback logic when they are missing. Corrected usage of `Result` methods (`unwrap`, `error`). Removed unused `ProjectContext` import to pass linting. **Update**: Fixed the `this.fileOps.isDirectory is not a function` error by adding the missing mock in the test setup. Refactored mocks within the 'File Prioritization and Token Limiting' tests to be test-specific, resolving conflicts and ensuring correct simulation of file collection. Corrected assertions in token limiting tests to properly access mock results. Added explicit types to map/find callbacks to resolve TS errors. All tests in `project-analyzer.test.ts` now pass.

### 5. Manual Verification Test Design & Execution Prep

**Status**: Completed

**Description**: Design a simple manual test case using a small, representative code sample to verify the end-to-end enhancement. Prepare instructions for the Senior Developer to execute this test after implementation.

**Files to Modify**:

- (Optional) Create a temporary test project or document the steps in a markdown file within the task tracking directory (e.g., `manual-verification-steps.md`).

**Implementation Details**:

- Define a small set of sample source files (e.g., 2-3 TypeScript files with simple functions, classes, and imports).
- Document the expected `ProjectContext` output for these files, specifically focusing on the `definedFunctions`, `definedClasses`, and `internalDependencies` fields.
- Provide clear steps for the Senior Developer to:
  1. Run the `ProjectAnalyzer` against the sample files (potentially via a temporary script or test runner setup).
  2. Capture the generated `ProjectContext` JSON output.
  3. Compare the actual output against the expected output defined in the test case.

**Testing Requirements**:

- The Senior Developer will execute these steps after completing subtasks 1-4 and report the results.

**Related Acceptance Criteria**:

- AC1: The Project Analysis process successfully extracts...
- AC4: The enhanced `ProjectContext` contains demonstrably more detailed information...

**Estimated effort**: 15 minutes (for design)

**Delegation Notes**: Architect designs the test case. Senior Developer executes it during implementation review.

**Redelegation History**: N/A

**Implementation Notes**: Created sample TS files in `/tmp/tsk-007-manual-test` (`utils.ts`, `models.ts`, `main.ts`). Created `/projects/roocode-generator/task-tracking/TSK-007/EnhanceProjectAnalysis/manual-verification-steps.md` documenting the manual execution steps using a temporary script (`run-analyzer.mjs`) and the expected `ProjectContext` JSON output, focusing on `definedFunctions`, `definedClasses`, and `internalDependencies`.

**Deviations**: N/A

## 5. Implementation Sequence

1.  **Subtask 1: Update `ProjectContext` Schema** - Foundational change.
2.  **Subtask 3: Update `ProjectAnalyzer` Default Values** - Small adjustment based on schema change.
3.  **Subtask 2: Update `ProjectAnalyzer` Prompt** - Core logic change, depends on schema.
4.  **Subtask 4: Update Unit Tests** - Validate all code changes.
5.  **Subtask 5: Manual Verification Test Design & Execution Prep** - Prepare for final validation by Senior Dev.

## 6. Testing Strategy

- **Unit Testing:** Focus on `ProjectAnalyzer`. Mock dependencies (`LLMAgent`, `FileOperations`, etc.). Validate the structure of the returned `ProjectContext`, including the new fields, based on controlled mock LLM responses. Test edge cases like empty responses or responses missing the new fields.
- **Manual Verification:** Use a small, controlled set of input files to run the actual `ProjectAnalyzer` (potentially requiring a small test harness or script). Manually inspect the generated `ProjectContext` JSON to confirm that function/class names and internal dependencies are being extracted as expected according to the prompt instructions. This verifies the LLM's adherence to the new prompt and schema end-to-end.
- **Code Review:** Ensure code quality, adherence to standards, and logical correctness of the changes.

## 7. Rollback Plan

- Revert changes using Git version control.
- The changes are localized primarily to `src/core/analysis/types.ts` and `src/core/analysis/project-analyzer.ts`, making rollback straightforward.
- Unit tests should catch regressions if changes are reverted incorrectly.
