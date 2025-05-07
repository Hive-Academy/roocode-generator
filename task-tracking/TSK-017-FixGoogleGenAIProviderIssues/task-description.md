# Task Description: TSK-017 - Fix Google GenAI Provider Issues & Enhance JSON Parsing Robustness

## 1. Task Overview

**Goal**: Resolve critical reliability issues with the Google GenAI provider and enhance the robustness of JSON parsing for `codeInsights` generation and `tsconfig.json` processing. This involves ensuring stable LLM interactions, accurate token handling, and correct parsing of potentially malformed or comment-laden JSON.

**Original Issues (from TSK-017 description & registry):**

- Malformed JSON responses from Google GenAI for `codeInsights`.
- Errors in Google GenAI token counting (e.g., HTML responses).
- Lack of robust retry logic and token limit handling for Google GenAI.
- `tsconfig.json` parsing warnings (potentially due to comments).
- Directory exclusion issues (addressed by TSK-018, but verification needed).

**Revised Scope based on Analysis:**

- Verify and test existing fixes in `GoogleGenAIProvider` (retries, token counting, limits).
- Integrate `parseRobustJson` (using `jsonrepair`) into `AstAnalysisService` for `codeInsights` LLM responses.
- Implement comment stripping for `tsconfig.json` content in `ProjectAnalyzer` before calling `parseRobustJson`.
- Ensure comprehensive unit and integration testing for all affected components.

**Business Context**: Reliable LLM interaction and project analysis are fundamental to `roocode-generator`'s core features, especially memory bank generation (blocked by TSK-016, which depends on this task).

**Task Categorization**: Bug Fix / Refactoring / Reliability Enhancement
**Priority**: High

## 2. Current Implementation Analysis

- **`src/core/llm/providers/google-genai-provider.ts`**: Contains significant existing implementations for retry logic (using `retryWithBackoff`), direct `fetch`-based token counting (with HTML error handling), and dynamic input token limit fetching with pre-call validation. Requires thorough testing.
- **`src/core/analysis/ast-analysis.service.ts`**: Currently uses direct `JSON.parse()` for LLM responses when generating `CodeInsights`. This is the primary integration point for `parseRobustJson`.
- **`src/core/utils/json-utils.ts`**: Contains the `parseRobustJson` utility, which already uses the `jsonrepair` library. This utility will be leveraged.
- **`src/core/analysis/project-analyzer.ts`**: Uses `parseRobustJson` for `tsconfig.json` but does not currently preprocess for comments. It also handles file/directory exclusions for AST analysis input and (with TSK-018 fixes) for `structure.directoryTree`.
- **`package.json`**: Already includes `jsonrepair` as a dependency.

## 3. Component Structure (Conceptual Changes)

- **`GoogleGenAIProvider`**: Behaviorally more robust due to verified existing fixes and comprehensive testing.
- **`AstAnalysisService`**: Will internally use `parseRobustJson` for LLM responses, making its `CodeInsights` generation more resilient to malformed JSON.
- **`ProjectAnalyzer`**: Will preprocess `tsconfig.json` content (strip comments) before passing it to `parseRobustJson`.

## 4. Detailed Requirements

### Functional Requirements

1.  **Google GenAI Provider Stability:**
    - API interactions with Google GenAI must automatically retry on transient errors (429, 500, 503) for both completions and token counting.
    - Input exceeding the model's dynamically fetched (or fallback) token limit must be detected _before_ sending requests to the API, with appropriate errors returned.
    - Token counting must handle non-JSON error responses (especially HTML) gracefully, log them, and fall back to approximation without retrying on such specific errors.
2.  **Robust `codeInsights` JSON Parsing:**
    - `AstAnalysisService` must successfully parse `codeInsights` JSON responses from the LLM even if they contain common syntax errors (e.g., trailing commas, missing quotes), by leveraging `jsonrepair` via `parseRobustJson`.
3.  **Robust `tsconfig.json` Parsing:**
    - `ProjectAnalyzer` must successfully parse `tsconfig.json` files, even if they contain comments, by stripping comments before attempting parsing with `parseRobustJson`.
4.  **Exclusion Integrity:**
    - The final `ProjectContext` must correctly reflect file/directory exclusions (as per `SKIP_DIRECTORIES` and hidden file conventions), building upon TSK-018 fixes.

### Technical Requirements

1.  **`GoogleGenAIProvider` Testing:**
    - Add comprehensive unit/integration tests for existing retry logic, token limit fetching/validation, and token counting (including HTML error and approximation fallback).
2.  **`AstAnalysisService` Modification:**
    - Modify `AstAnalysisService.analyzeAst` to use `parseRobustJson` (from `json-utils.ts`) for parsing the LLM response string.
    - Ensure appropriate error handling and logging around this parsing step.
3.  **`ProjectAnalyzer` Modification:**
    - Modify `ProjectAnalyzer.analyzeProject` to implement comment stripping from `tsconfig.json` file content _before_ calling `parseRobustJson`.
4.  **Testing:**
    - Add unit tests for the `tsconfig.json` comment stripping logic.
    - Add/update unit tests for `AstAnalysisService` focusing on robust JSON parsing.
    - Ensure all new and modified code adheres to project standards and `Result` pattern.

## 5. Acceptance Criteria Checklist

| #                                    | Criterion                                                                                                                                                                                                                                                                                                                                                            | Verification Method                                                                                                                                                                                                                         |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Google GenAI Provider Robustness** |                                                                                                                                                                                                                                                                                                                                                                      |
| AC1                                  | **`GoogleGenAIProvider.getCompletion` Pre-call Validation:** Input exceeding the model's fetched or fallback token limit is detected _before_ sending the request, an error is logged, and an `LLMProviderError` is returned.                                                                                                                                        | Unit Test: Mock `countTokens` to return a high value, mock `inputTokenLimit`. Verify `this.model.predict` is not called and correct error is returned. Code Review: Verify pre-call validation logic.                                       |
| AC2                                  | **`GoogleGenAIProvider.countTokens` Retry & HTML Handling:** `countTokens` correctly retries on specified API errors (429, 500, 503) and correctly identifies, logs, and does _not_ retry on HTML error responses, falling back to approximation.                                                                                                                    | Unit Tests: Mock `fetch` to simulate retriable errors, HTML errors, and success. Verify retry attempts, HTML detection, logging, and final token count (or approximation). Code Review.                                                     |
| AC3                                  | **`GoogleGenAIProvider.fetchModelLimits` Functionality:** The provider attempts to fetch the model's input token limit on initialization. If successful, the fetched limit is used. If failed, a defined fallback limit is used and logged.                                                                                                                          | Unit Tests: Mock `fetch` for `fetchModelLimits` to simulate success and failure. Verify `inputTokenLimit` property is set correctly and logs are appropriate. Code Review.                                                                  |
| AC4                                  | **`GoogleGenAIProvider` General Retry Logic:** Retry logic with exponential backoff is correctly implemented and verified for `getCompletion` and `countTokens` for specified API errors (429, 500, 503).                                                                                                                                                            | Unit Tests: Mock API responses with these codes for both methods, verify retry behavior and eventual success/failure. Code Review.                                                                                                          |
| **JSON Repair & Parsing**            |                                                                                                                                                                                                                                                                                                                                                                      |
| AC5                                  | **`AstAnalysisService` Uses Robust Parsing:** `AstAnalysisService.analyzeAst` uses the `parseRobustJson` utility (or an equivalent robust mechanism incorporating `jsonrepair`) to parse the LLM response when generating `CodeInsights`.                                                                                                                            | Code Review: Verify `ast-analysis.service.ts` calls `parseRobustJson`. Unit Test: Mock `llmAgent.getCompletion` to return malformed JSON; verify `AstAnalysisService` attempts repair and can succeed or fail gracefully with proper error. |
| AC6                                  | **`ProjectAnalyzer` Handles `tsconfig.json` Comments:** `ProjectAnalyzer.analyzeProject` preprocesses `tsconfig.json` content to remove comments _before_ passing it to `parseRobustJson`.                                                                                                                                                                           | Code Review: Verify comment stripping logic in `project-analyzer.ts`. Unit Test: Provide `tsconfig.json` content with comments; verify it's parsed successfully by `parseRobustJson` after preprocessing.                                   |
| **Exclusions & Context Integrity**   |                                                                                                                                                                                                                                                                                                                                                                      |
| AC7                                  | **Correct File/Directory Exclusions in `ProjectContext`:** The final `ProjectContext` generated by `ProjectAnalyzer.analyzeProject` correctly excludes directories from `SKIP_DIRECTORIES` (e.g., `node_modules`, `dist`) and hidden directories (e.g., `.git`, `.vscode`) from both the `structure.directoryTree` and from the files considered for `codeInsights`. | Manual Inspection: Run `ProjectAnalyzer` on the current project. Inspect logged `ProjectContext` or a saved output. Verify exclusions. Automated Test: If possible, an integration test checking `ProjectContext` structure.                |
| **Overall & Testing**                |                                                                                                                                                                                                                                                                                                                                                                      |
| AC8                                  | **No Regressions in Core Analysis:** Core project analysis features (tech stack, non-LLM structure analysis, dependency analysis) remain functional and are not negatively impacted.                                                                                                                                                                                 | Existing integration tests for `ProjectAnalyzer` should pass. Manual spot checks of `ProjectContext` for these sections.                                                                                                                    |
| AC9                                  | **Comprehensive Unit Tests:** New and updated unit tests cover all modified logic in `GoogleGenAIProvider`, `AstAnalysisService`, and the `tsconfig.json` comment stripping in `ProjectAnalyzer`. Tests cover success paths, error handling, retry logic, and edge cases.                                                                                            | Code Review: Verify test coverage and scenarios. Automated Testing: All relevant tests pass with sufficient coverage.                                                                                                                       |
| AC10                                 | **Code Quality Standards:** All new/modified code adheres to project coding standards (ESLint, Prettier), includes necessary comments, and follows the `Result` pattern for error handling.                                                                                                                                                                          | Code Review: Static analysis tools pass. Manual review for clarity, comments, and error handling patterns.                                                                                                                                  |

## 6. Implementation Guidance

- **`GoogleGenAIProvider`**: Focus on writing comprehensive tests for the existing advanced features (retries, token limits, specific error handling in `countTokens`). Ensure all ACs related to its robustness are met through these tests.
- **`AstAnalysisService`**:
  - Locate the `JSON.parse()` call for the LLM response.
  - Replace it with a call to `parseRobustJson(responseString, this.logger)`.
  - Adjust surrounding error handling to align with `parseRobustJson`'s behavior (it throws on final failure).
- **`ProjectAnalyzer`**:
  - Before calling `parseRobustJson` for `tsconfig.json` content, implement a simple comment stripping utility (e.g., using regex to remove `//` and `/* ... */` style comments). Be mindful of not breaking JSON strings that might contain comment-like sequences.
  - Ensure the logger is passed correctly to `parseRobustJson`.
- **Testing**:
  - For `GoogleGenAIProvider`, mock `fetch` responses extensively to simulate various API success/error conditions.
  - For `AstAnalysisService`, mock `llmAgent.getCompletion` to return various forms of valid and malformed JSON strings.
  - For `tsconfig.json` comment stripping, provide test strings with different comment styles and ensure they are correctly cleaned and then parsed.

## 7. File and Component References

- `src/core/llm/providers/google-genai-provider.ts` (Testing focus)
- `src/core/analysis/ast-analysis.service.ts` (Modify for robust parsing)
- `src/core/analysis/project-analyzer.ts` (Modify for tsconfig comment stripping)
- `src/core/utils/json-utils.ts` (Leverage `parseRobustJson`)
- `package.json` (Verify `jsonrepair` dependency - already confirmed)
- Associated unit test files for the above.
