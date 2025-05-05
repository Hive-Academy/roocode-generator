---
title: Implementation Plan
type: template
category: implementation
status: active
taskId: TSK-013
---

# Implementation Plan: TSK-013/ImplementLlmAstAnalysis (Revised)

## 1. Overview

This plan outlines the steps to implement **TSK-013: Implement LLM Analysis of AST Data**. The goal is to enhance the `ProjectAnalyzer` by introducing a new service, `AstAnalysisService`, which uses an LLM to analyze the generic Abstract Syntax Tree (`astData`) generated in TSK-008. This analysis will extract structured code insights (functions, classes, imports) and store them in the `ProjectContext`.

**REVISION:** The initial approach ("Approach 1: Direct LLM Call per File") proved unreliable due to LLM context length limits and network instability when processing large, full AST JSON structures. This revised plan adopts an **AST Condensation/Filtering** strategy within `AstAnalysisService` before calling the LLM, as recommended in the research report (Section 2 of task description).

See [[task-tracking/TSK-013-ImplementLlmAstAnalysis/task-description.md]] for detailed requirements and the full research report.

## 2. Implementation Strategy

### 2.1. Approach (Revised)

1.  **AST Condensation (`AstAnalysisService`):** Before interacting with the LLM, the service will traverse the input `astData` (`GenericAstNode`) and extract only relevant nodes and their essential properties (e.g., type, name, parameters, source) related to functions, classes, and imports. This creates a significantly smaller, condensed JSON structure specifically for LLM analysis.
2.  **New Service (`AstAnalysisService`):** Create a dedicated service responsible for:
    - Accepting `astData` (`GenericAstNode`).
    - **Performing AST Condensation/Filtering** to create a smaller JSON input for the LLM.
    - Constructing a detailed prompt including task description, an explanation of the _condensed_ input structure, the target `CodeInsights` JSON schema, and few-shot examples mapping condensed input to `CodeInsights`.
    - Calling the `LLMAgent` with the condensed input to get LLM completion.
    - Validating the LLM response is valid JSON and conforms to the `CodeInsights` schema using the `zod` library.
    - Returning the validated `CodeInsights` or an error using the `Result` pattern.
3.  **Interface Definitions:** Define new interfaces (`IAstAnalysisService`, `CodeInsights`, `FunctionInfo`, `ClassInfo`, `ImportInfo`) in a dedicated file (`ast-analysis.interfaces.ts`). (Completed in Subtask 1)
4.  **`ProjectContext` Update:** Add a `codeInsights?: { [filePath: string]: CodeInsights }` field to the `ProjectContext` interface (`types.ts`). (Completed in Subtask 1)
5.  **`ProjectAnalyzer` Integration:**
    - Inject `IAstAnalysisService`.
    - After generating `astData` for each file, call `astAnalysisService.analyzeAst(astData)` concurrently using `Promise.allSettled`. (Condensation happens _inside_ the service).
    - Handle the `Result`: If `ok`, merge insights into `projectContext.codeInsights`. If `err`, log a warning using `ILogger` and continue analysis for other files.
6.  **Dependency Management:** Add `zod` as a project dependency. (Completed in Subtask 1)
7.  **DI Registration:** Register `AstAnalysisService` in the appropriate DI module (e.g., `analysis-module.ts`).

### 2.2. Key Components

- **Create:**
  - `src/core/analysis/ast-analysis.service.ts`
  - `src/core/analysis/ast-analysis.interfaces.ts` (Completed)
  - Unit tests for `AstAnalysisService` (e.g., `tests/core/analysis/ast-analysis.service.test.ts`) - _Needs update for condensation logic_
  - Integration tests for `ProjectAnalyzer` analysis integration (e.g., `tests/core/analysis/project-analyzer.ast-analysis.test.ts`)
- **Modify:**
  - `src/core/analysis/project-analyzer.ts`
  - `src/core/analysis/types.ts` (Completed)
  - `src/core/di/modules/analysis-module.ts` (or core module)
  - `package.json` / `package-lock.json` (Completed)
  - Existing `ProjectAnalyzer` tests (`tests/core/analysis/project-analyzer.test.ts`, `tests/core/analysis/project-analyzer.treesitter.test.ts`)
- **Use:**
  - `src/core/llm/llm-agent.ts` (`LLMAgent`)
  - `src/core/result/result.ts` (`Result`)
  - `src/core/services/logger-service.ts` (`ILogger`)
  - `zod` library

### 2.3. Dependencies

- Internal: `LLMAgent`, `ILogger`, `Result`, `GenericAstNode`, `ProjectContext`.
- External: `zod`.

### 2.4. Risk Areas (Revised)

- **AST Condensation Logic:** Implementing the traversal and filtering logic correctly and efficiently is crucial. Needs careful handling of different node types and structures.
- **Prompt Engineering (Revised):** The prompt must now accurately describe the _condensed_ input structure to the LLM.
- **Information Loss:** Condensation might inadvertently remove context needed by the LLM for accurate analysis, although targeting specific structures should minimize this for the required insights.
- **LLM Reliability/Variability:** Still a risk, but reduced input size should improve reliability. Validation (`zod`) remains essential.
- **Input `astData` Quality:** Still relies on TSK-008 output.
- **Performance:** Condensation adds a pre-processing step, but the reduction in LLM processing time and token cost should yield a net performance gain.

## 3. Acceptance Criteria Mapping

- **AC1 (Service Created):** Covered by Subtask 1 (Interface) & Revised Subtask 2 (Implementation).
- **AC2 (Context Updated):** ✅ Completed in Subtask 1.
- **AC3 (Integration):** Covered by Subtask 3.
- **AC4 (Concurrency):** Covered by Subtask 3.
- **AC5 (LLM Interaction):** Covered by Revised Subtask 2.
- **AC6 (Prompt Definition):** Covered by Revised Subtask 2 (prompt uses condensed input).
- **AC7 (Structured Output):** ✅ Completed in Subtask 1 (interface definition). Verified by Revised Subtask 2 (validation).
- **AC8 (Validation):** Covered by Revised Subtask 2.
- **AC9 (Error Handling):** Covered by Revised Subtask 2 & Subtask 3.
- **AC10 (Basic Functionality):** Verified via testing (Subtask 4). _Should now be achievable._
- **AC11 (No New Config):** Ensured by design.
- **AC12 (Documentation):** Covered by all implementation subtasks.

## 4. Implementation Subtasks

### Subtask 1: Define Interfaces & Update Context

**Status**: ✅ Completed

**Description**: Define the necessary interfaces for the AST analysis feature and update the `ProjectContext` to accommodate the results. Add `zod` dependency.
_(No changes needed for this completed subtask)_

---

### Subtask 2 (Revised): Implement `AstAnalysisService` with Condensation

**Status**: ✅ Completed

**Description**: Implement the core logic of `AstAnalysisService`, including **AST condensation**, prompt construction (using condensed input), LLM interaction via `LLMAgent`, and response validation using `zod`.

**Files to Modify**:

- `src/core/analysis/ast-analysis.service.ts` (Create/Modify): Implement `analyzeAst` including condensation.
- `tests/core/analysis/ast-analysis.service.test.ts` (Modify): Update tests for condensation logic.

**Implementation Details**:

1.  **Constructor:** Inject `LLMAgent` and `ILogger`.
2.  **AST Condensation Logic (New private method, e.g., `_condenseAst`):**
    - Accepts `astData: GenericAstNode`.
    - Recursively traverses the `astData` tree.
    - Identifies relevant node types: `import_statement`, `function_definition`, `class_definition`, and their key children (e.g., `identifier` for names, `formal_parameters` for params, `string_literal` for import sources).
    - Constructs a new, simplified JSON object containing only these extracted details. Example structure:
    ```json
    {
      "imports": [{ "source": "string" }],
      "functions": [{ "name": "string", "params": ["string"] }],
      "classes": [{ "name": "string" }]
    }
    ```
    - Return this condensed JSON object. Handle potential errors during traversal if necessary.
3.  **`analyzeAst` Method (Revised):**
    - Receive `astData: GenericAstNode` and `filePath: string`.
    - Call `_condenseAst(astData)` to get the condensed structure. Handle potential errors from condensation.
    - **Prompt Construction (Revised `buildPrompt`):**
      - Update the prompt to explain it receives a _condensed_ JSON input (describe the structure from step 2).
      - Update the few-shot example to show a condensed input snippet mapping to the `CodeInsights` output.
      - Keep the target `CodeInsights` schema definition in the prompt.
    - **LLM Call:**
      - Use `JSON.stringify(condensedAstData)` as the input payload (likely within the system prompt or as user input depending on final prompt structure).
      - Call `this.llmAgent.getCompletion(systemPrompt, condensedJsonString)`.
      - Handle potential errors from `getCompletion`.
    - **Validation:**
      - Define/use the `zod` schema for `CodeInsights` (from original Subtask 2).
      - Parse the LLM response string.
      - Validate the parsed object against the `codeInsightsSchema`.
      - Handle parsing and validation errors, returning `Result.err`.
    - **Return:** If validation succeeds, return `Result.ok(validatedData)`.

**Testing Requirements (Revised)**:

- Unit tests for `AstAnalysisService`:
  - **New:** Test the `_condenseAst` method directly with various `GenericAstNode` inputs (simple cases, nested structures, files with/without relevant nodes) to verify the condensed output structure.
  - Update existing tests:
    - Mock `LLMAgent.getCompletion`.
    - Provide mock _condensed_ AST data to `analyzeAst` (or mock `_condenseAst`).
    - Test successful path: valid JSON response -> `Result.ok(CodeInsights)`.
    - Test failure paths (LLM error, invalid JSON, schema validation failure).
    - Verify the prompt construction reflects the condensed input.

**Related Acceptance Criteria**:

- AC1: Service implemented with condensation.
- AC5: Uses `LLMAgent`.
- AC6: Prompt updated for condensed input.
- AC8: Validation implemented.
- AC9: Returns `Result`.
- AC12: TSDoc added/updated.

**Estimated effort**: 1 - 1.5 hours (due to new condensation logic)

**Required Delegation Components (Revised)**:

- Implementation components for Junior Coder:
  - Implement the `_condenseAst` private method for traversing `GenericAstNode` and extracting relevant details into the condensed JSON structure.
  - Implement the `zod` schema (`codeInsightsSchema` and sub-schemas).
  - Update the `buildPrompt` method to describe the condensed input structure and adjust the few-shot example.
- Testing components for Junior Tester:
  - Implement unit tests specifically for the `_condenseAst` method.
  - Update existing/implement unit tests for `analyzeAst`, mocking `_condenseAst` or providing condensed input, covering success and failure paths for LLM interaction and validation.

**Delegation Success Criteria (Revised)**:

- Junior Coder components must: `_condenseAst` correctly extracts required info into the defined structure. `zod` schema is correct. `buildPrompt` accurately reflects the condensed input.
- Junior Tester components must: Unit tests cover `_condenseAst` logic thoroughly. `analyzeAst` tests correctly mock dependencies and verify behavior with condensed input.

**Actual Delegation Summary**:

- Junior Coder: Implemented `_condenseAst` method, updated `buildPrompt` method. `zod` schema was already present. Work reviewed and integrated. (1 attempt)
- Junior Tester: Implemented unit tests for `analyzeAst` using spy strategy for `_condenseAst`, covering success/failure paths and prompt verification. Work reviewed and integrated. (1 attempt)

**Acceptance Criteria Verification**:

- AC1 (Service Implemented): ✅ Satisfied by `src/core/analysis/ast-analysis.service.ts` implementation, including condensation logic in `_condenseAst`.
- AC5 (Uses LLMAgent): ✅ Satisfied by `llmAgent.getCompletion` call within `analyzeAst`. Verified in unit tests.
- AC6 (Prompt Updated): ✅ Satisfied by the updated `buildPrompt` method, which describes condensed input and includes a relevant few-shot example. Verified in unit tests.
- AC8 (Validation Implemented): ✅ Satisfied by using `codeInsightsSchema.safeParse` on the LLM response within `analyzeAst`. Verified in unit tests.
- AC9 (Returns Result): ✅ Satisfied by `analyzeAst` returning `Result.ok` or `Result.err`. Verified in unit tests.
- AC12 (TSDoc Added): ✅ Satisfied by adding/updating TSDoc comments for the service, methods, and interfaces.

---

### Subtask 3: Integrate `AstAnalysisService` into `ProjectAnalyzer`

**Status**: Not Started (Resetting status)

**Description**: Modify `ProjectAnalyzer` to use the new `AstAnalysisService` to analyze `astData` for each file concurrently and merge the results into `ProjectContext`. (Condensation happens inside the service).

**Files to Modify**:

- `src/core/analysis/project-analyzer.ts`
- `tests/core/analysis/project-analyzer.test.ts` (Update/Add)
- `tests/core/analysis/project-analyzer.treesitter.test.ts` (Update/Add)
- `tests/core/analysis/project-analyzer.ast-analysis.test.ts` (Create/Modify)

**Implementation Details**:
_(Largely the same as original Subtask 3, as the condensation is internal to the service)_

1.  **Constructor Injection:** Inject `IAstAnalysisService`.
2.  **Refactor `analyzeProject` Method:**
    - Collect successfully parsed `astData` and `relativePath` into `validAstData`. Log warnings for parsing failures.
    - Use `Promise.allSettled` to call `this.astAnalysisService.analyzeAst(astData, relativePath)` concurrently for each item in `validAstData`.
    - Process results: Handle fulfilled/rejected promises and the inner `Result` (`ok`/`err`). Populate `codeInsightsMap` for successes, log warnings/errors for failures.
    - Update final `ProjectContext` assembly to include `astData` (from `validAstData`) and `codeInsights` (from `codeInsightsMap`).

**Testing Requirements**:
_(Same as original Subtask 3)_

- Update/add integration tests for `ProjectAnalyzer`.
- Mock `IAstAnalysisService`.
- Verify `analyzeAst` is called with full `astData`.
- Verify `codeInsightsMap` population based on mocked `Ok` results.
- Verify logging for mocked `Err` results and rejections.
- Verify overall method success despite partial failures.

**Related Acceptance Criteria**:

- AC3: Integration logic implemented.
- AC4: Concurrency using `Promise.allSettled`.
- AC9: Error handling for analysis results.
- AC12: TSDoc added for modifications.

**Estimated effort**: 30 minutes (Review/Minor Adjustments if needed)

**Required Delegation Components**:
_(Same as original Subtask 3)_

- Implementation components for Junior Coder: Refactor AST collection (if needed after Subtask 2 changes), implement `Promise.allSettled` for analysis calls, implement result processing/logging.
- Testing components for Junior Tester: Update/create integration tests verifying interaction with mocked `IAstAnalysisService`, context population, and logging.

**Delegation Success Criteria**:
_(Same as original Subtask 3)_

- Junior Coder components must: Correctly implement concurrent calls, handle results/errors, log appropriately.
- Junior Tester components must: Tests accurately mock the service, verify interactions, context population, and logging.

---

### Subtask 4: DI Registration & Testing

**Status**: Not Started (Resetting status)

**Description**: Register the new `AstAnalysisService` for dependency injection, ensure all automated tests pass, and perform manual verification (AC10), which should now be feasible with the condensation strategy.

**Files to Modify**:

- `src/core/di/modules/analysis-module.ts` (Create/Verify)
- `src/core/di/registrations.ts` (Modify/Verify)
- `tests/fixtures/sample-ast-analysis.ts` (Create/Verify)
- `run-analyzer.js` (Modify temporarily for AC10, or use temporary logging)

**Implementation Details**:

1.  **DI Registration:** Ensure `AstAnalysisService` is correctly registered (likely completed in the previous attempt, but verify).
2.  **Testing & Verification:**
    - Execute all automated tests (`npm test`, `npm run type-check`). Ensure all pass, including updated unit tests for `AstAnalysisService` (condensation) and integration tests for `ProjectAnalyzer`. Fix any failures.
    - Perform the **Basic Manual Test (AC10) (Revised Expectation):**
      - Use the simple fixture file (`tests/fixtures/sample-ast-analysis.ts`).
      - Analyze _only_ this fixture file using a test script or temporary logging.
      - Verify the `codeInsights` field contains the correctly extracted information.
      - **Additionally (Optional but Recommended):** Attempt the full generator run again (e.g., `memory-bank`) to see if context length/reliability issues are significantly reduced or eliminated. Document the outcome.

**Testing Requirements**:

- All automated tests must pass.
- Manual verification step (AC10) using the fixture file must pass. Outcome of the optional full run should be documented.

**Related Acceptance Criteria**:

- AC1: Service registered for DI.
- AC10: Basic functionality verified (should pass now).

**Estimated effort**: 30 minutes (including delegation setup and review)

**Required Delegation Components**:

- Implementation components for Junior Coder: Verify/complete DI registration.
- Testing components for Junior Tester: Execute automated tests, fix failures. Perform manual test (AC10) on the fixture file, document results. Optionally perform and document the full generator run test.

**Delegation Success Criteria**:

- Junior Coder components: DI registration is correct.
- Junior Tester components: Automated tests pass. Manual test (AC10) on fixture file passes and is documented. Optional full run outcome documented.

---

## 5. Technical Considerations (Revised)

- **Architecture Impact**: `AstAnalysisService` now includes internal condensation logic, making it slightly more complex but decoupling the LLM from the raw AST size. `ProjectAnalyzer` interaction remains the same.
- **Dependencies**: No new dependencies beyond `zod`.
- **Error Handling**: Condensation step might introduce new internal errors to handle within `AstAnalysisService`, returning `Result.err`.
- **Concurrency**: Remains the same in `ProjectAnalyzer`.
- **Scalability**: Significantly improved by addressing the primary context length blocker.

## 6. Testing Approach (Revised)

- **Unit Tests**: `AstAnalysisService` tests now need to cover the `_condenseAst` logic thoroughly, in addition to the LLM interaction/validation logic (using condensed input).
- **Integration Tests**: `ProjectAnalyzer` tests remain largely the same, mocking `IAstAnalysisService`, but verifying calls are made with the full `astData`.
- **Manual Verification (AC10)**: Should now be achievable using a simple fixture file. A full run test is recommended to gauge overall improvement.

## 7. Implementation Checklist (Revised)

- [x] Requirements reviewed (task-description.md)
- [x] Research report reviewed (task-description.md Section 2)
- [x] Architecture reviewed (TechnicalArchitecture.md, DeveloperGuide.md)
- [x] Dependencies checked (`LLMAgent`, `ILogger`, `zod` added)
- [ ] Subtasks revised and sequenced
- [x] Interfaces defined (`IAstAnalysisService`, `CodeInsights`, etc.)
- [x] `ProjectContext` updated
- [ ] `AstAnalysisService` implemented (with **condensation**)
- [ ] `ProjectAnalyzer` integrated (DI, concurrency, result handling)
- [x] `zod` dependency added
- [ ] DI registration added/verified
- [ ] Unit tests planned/implemented/updated (`AstAnalysisService` incl. condensation)
- [ ] Integration tests planned/updated (`ProjectAnalyzer`)
- [ ] Manual verification step planned (AC10 - revised)
- [ ] Documentation planned (TSDoc comments)
- [ ] Delegation strategy revised for subtasks
