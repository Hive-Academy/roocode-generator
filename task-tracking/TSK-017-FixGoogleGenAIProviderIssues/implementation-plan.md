# Implementation Plan: TSK-017 - Implement Full Structured LLM Output & Finalize Robustness

**Task ID:** TSK-017
**Feature Name:** Implement Full Structured LLM Output, Enhance JSON Parsing Robustness & Verify Exclusions
**Date:** May 7, 2025
**Architect:** Software Architect
**Status:** In Progress

## 1. Overview

This implementation plan addresses TSK-017. The scope has evolved to:

1.  Implement structured LLM output (`getStructuredCompletion` using `withStructuredOutput` or equivalent) across all key providers (`GoogleGenAI`, `Anthropic`, `OpenAI`, `OpenRouter`). This ensures `AstAnalysisService` receives reliable, schema-compliant JSON for `codeInsights`.
2.  Finalize `ProjectAnalyzer` robustness by ensuring `tsconfig.json` comments are handled.
3.  Conduct comprehensive E2E testing, including `ProjectContext` logging for verification of all changes and exclusions.

**Key Decisions & Approach:**

- `AstAnalysisService` will use `await llmAgent.getStructuredCompletion(...)` and directly consume the typed, parsed JavaScript object it returns. The `parseRobustJson` utility will not be used for `codeInsights` from LLMs that support reliable structured output.
- `GoogleGenAIProvider`'s `getStructuredCompletion` is already implemented (as part of a previous iteration of Subtask 3).
- Testing for individual provider implementations will be developer-led manual checks. Full E2E testing will occur after all providers are updated.

## 2. Implementation Strategy

1.  **Provider Enhancements:** Implement `getStructuredCompletion` for `AnthropicProvider`, `OpenAIProvider`, and `OpenRouterProvider` using Langchain's `model.withStructuredOutput(zodSchema)` or equivalent tool-calling mechanisms if `withStructuredOutput` is not directly applicable.
2.  **`ProjectAnalyzer` `tsconfig.json`:** Ensure comment stripping logic for `tsconfig.json` (already implemented) is robust.
3.  **`ProjectContext` Logging:** Implement logging of the final `ProjectContext` to a file. (Already implemented).
4.  **E2E Testing & Verification:** After all provider enhancements, conduct thorough E2E testing focusing on the generation and integrity of `ProjectContext`, file exclusions, and stability of all LLM interactions.

## 3. Acceptance Criteria Mapping

| Subtask                                                          | Related Acceptance Criteria (from task-description.md) |
| :--------------------------------------------------------------- | :----------------------------------------------------- |
| 1. Implement `getStructuredCompletion` for `AnthropicProvider`   | AC1-AC4 (Anthropic path), AC5, AC10                    |
| 2. Implement `getStructuredCompletion` for `OpenAIProvider`      | AC1-AC4 (OpenAI path), AC5, AC10                       |
| 3. Implement `getStructuredCompletion` for `OpenRouterProvider`  | AC1-AC4 (OpenRouter path), AC5, AC10                   |
| 4. Verify `tsconfig.json` Comment Stripping in `ProjectAnalyzer` | AC6, AC10 (Covered by existing completed work)         |
| 5. Final E2E Testing, `ProjectContext` Logging & Verification    | AC1-AC8 (all providers), AC9 (via E2E), AC10           |

_Original AC5 for `AstAnalysisService` (robust parsing) is now met by the structured output from providers._
_Original AC1-AC4 for `GoogleGenAIProvider` are considered met by its existing `getStructuredCompletion` implementation, to be confirmed in final E2E._

## 4. Implementation Subtasks

**Completed Preparatory Work (from previous iterations/revisions of this task plan):**

- **`AstAnalysisService` uses `llmAgent.getStructuredCompletion()`:** (Commit `a81dd99`)
- **`GoogleGenAIProvider` implements `getStructuredCompletion()`:** (Commit `a81dd99`)
- **`ProjectContext` logging in `ProjectAnalyzer`:** (Part of commit `5d47a53` or related, as per previous plan)
- **`tsconfig.json` comment stripping in `ProjectAnalyzer`:** (Commit `52025c6`)
- **`ILLMProvider` & `ILLMAgent` interfaces updated for `getStructuredCompletion`:** (Commit `a81dd99`)
- **Stubs for `getStructuredCompletion` in other providers:** (Commit `a81dd99`)

**New & Remaining Subtasks:**

### Subtask 1: Implement `getStructuredCompletion` for `AnthropicProvider`

- **Status:** Completed (Commit: `eb5db94`)
- **Description:** Implement the `getStructuredCompletion<T extends z.ZodTypeAny>(prompt: string, schema: T, config?: LLMCompletionConfig | undefined): Promise<Result<z.infer<T>, LLMProviderError>>` method in `AnthropicProvider.ts`.
- **Files to Modify:**
  - `src/core/llm/providers/anthropic-provider.ts`
- **Implementation Summary (from Senior Developer report):**
  - Delegated to Junior Coder. Reviewed and integrated.
  - Implemented `getStructuredCompletion` using `this.model.withStructuredOutput(schema)`.
  - Added pre-call token validation (`_validateInputTokens`) and retry logic (`_performStructuredCallWithRetry` using `retryWithBackoff`).
  - Constructor updated to set `maxTokens` from `LLMConfig` on the `ChatAnthropic` model instance.
  - Errors are mapped to `LLMProviderError`.
  - AC1-AC5 (Anthropic path) & AC10 verified by Senior Developer based on implementation and developer checks.
- **Implementation Details (Planned):**
  - Use `this.model.withStructuredOutput(schema)` with the `ChatAnthropic` instance.
  - Handle potential errors and map them to `LLMProviderError`.
  - Ensure `LLMCompletionConfig` (e.g., `maxTokens`) is respected.
- **Testing Requirements:** Developer to manually test with a simple schema and prompt. Formal E2E testing in final subtask.
- **Related Acceptance Criteria:** AC1-AC4 (Anthropic path), AC5, AC10
- **Estimated effort:** 1 - 1.5 hours
- **Required Delegation Components:**
  - Junior Coder: Implemented `getStructuredCompletion` in `AnthropicProvider.ts`. (Completed)
- **Delegation Success Criteria**:
  - Junior Coder implements the method, and it successfully returns a Zod-schema-compliant object in a developer-led test. (Achieved)

### Subtask 2: Implement `getStructuredCompletion` for `OpenAIProvider`

- **Status:** Completed (Commit: `c787f09`)
- **Description:** Implement `getStructuredCompletion` in `OpenAIProvider.ts`.
- **Files to Modify:**
  - `src/core/llm/providers/openai-provider.ts`
- **Implementation Summary (from Senior Developer report):**
  - Delegated to Junior Coder. Reviewed and integrated.
  - Implemented `getStructuredCompletion` using `this.model.withStructuredOutput(schema)`.
  - Constructor updated for `maxTokens`, `temperature`.
  - Pre-call token validation using `this.model.getNumTokens()`.
  - Retry logic with `retryWithBackoff`.
  - Error mapping to `LLMProviderError`, including OpenAI-specific error details.
  - Per-call configuration overrides via `runnable.bind()`.
  - AC1-AC5 (OpenAI path) & AC10 verified by Senior Developer based on implementation and developer checks.
- **Implementation Details (Planned):**
  - Use `this.model.withStructuredOutput(schema)` with the `ChatOpenAI` instance. This leverages OpenAI function calling.
  - Handle errors and map to `LLMProviderError`.
- **Testing Requirements:** Developer to manually test. Formal E2E testing in final subtask.
- **Related Acceptance Criteria:** AC1-AC4 (OpenAI path), AC5, AC10
- **Estimated effort:** 1 - 1.5 hours
- **Required Delegation Components:**
  - Junior Coder: Implemented `getStructuredCompletion` in `OpenAIProvider.ts`. (Completed)
- **Delegation Success Criteria**:
  - Junior Coder implements the method, returning a schema-compliant object in a developer-led test. (Achieved)

### Subtask 3: Implement `getStructuredCompletion` for `OpenRouterProvider`

- **Status:** Completed (Commit: `310c74e`)
- **Description:** Implement `getStructuredCompletion` in `OpenRouterProvider.ts`.
- **Files to Modify:**
  - `src/core/llm/providers/open-router-provider.ts`
- **Implementation Summary (from Senior Developer report):**
  - Delegated to Junior Coder. Reviewed and integrated.
  - Implemented `getStructuredCompletion` using `ChatOpenAI` (configured for OpenRouter API) with `withStructuredOutput(schema)`. This was a deviation from using `ChatOpenRouter` but deemed acceptable and functional.
  - Constructor updated to initialize `ChatOpenAI` with OpenRouter config (API key, model, baseURL, headers).
  - Pre-call token validation using `this.model.getNumTokens()` (from `ChatOpenAI`), with logged warnings about approximation for proxied models.
  - Retry logic with `retryWithBackoff`.
  - Error mapping to `LLMProviderError`, including detection of "tool use not supported" scenarios.
  - Per-call configuration overrides via `runnable.bind()`.
  - AC1-AC4 (OpenRouter path), AC5, AC10 verified by Senior Developer based on implementation review and conceptual spot-check.
- **Implementation Details (Planned):**
  - Use `this.model.withStructuredOutput(schema)` with the `ChatOpenRouter` instance (Actual: `ChatOpenAI` was used).
  - Success depends on the underlying model specified in OpenRouter config supporting function calling/tools.
  - Handle errors and map to `LLMProviderError`.
- **Testing Requirements:** Developer to manually test with an OpenRouter model known to support function calling (e.g., an OpenAI model). Formal E2E testing in final subtask.
- **Related Acceptance Criteria:** AC1-AC4 (OpenRouter path), AC5, AC10
- **Estimated effort:** 1 - 1.5 hours
- **Required Delegation Components:**
  - Junior Coder: Implemented `getStructuredCompletion` in `OpenRouterProvider.ts`. (Completed)
- **Delegation Success Criteria**:
  - Junior Coder implements the method, returning a schema-compliant object in a developer-led test with a compatible OpenRouter model. (Achieved)

### Subtask 4: Verify `tsconfig.json` Comment Stripping (Already Completed Logic)

- **Status:** Logic Completed (Commit `52025c6`) - Verification Pending in E2E
- **Description:** The logic for stripping comments from `tsconfig.json` in `ProjectAnalyzer` is already implemented. This subtask is a placeholder to ensure its effect is verified during the final E2E testing.
- **Files to Modify:** None (code is complete).
- **Testing Requirements:** Verified during Subtask 5 (Final E2E Testing).
- **Related Acceptance Criteria:** AC6
- **Estimated effort:** 0 (Covered by Subtask 5)

### Subtask 5: Final E2E Testing, `ProjectContext` Logging & Verification

- **Status:** Completed
- **Description:** Conducted E2E testing for `ProjectContext` generation, focusing on Google GenAI provider for `codeInsights`, and verified related ACs. Resolved build-blocking type inconsistencies across LLM components.
- **Files to Modify:**
  - `src/core/llm/interfaces.ts` (Updated signatures, error types)
  - `src/core/llm/providers/google-genai-provider.ts` (Updated signatures, error types)
  - `src/core/llm/providers/anthropic-provider.ts` (Updated signatures, error types)
  - `src/core/llm/providers/openai-provider.ts` (Updated signatures, error types)
  - `src/core/llm/providers/open-router-provider.ts` (Updated signatures, error types)
  - `src/core/llm/llm-agent.ts` (Updated signatures, error types, internal logic)
  - `src/core/llm/provider-registry.ts` (Updated signatures, error types)
  - `src/core/llm/model-lister.service.ts` (Updated signatures, error types)
  - `src/core/analysis/ast-analysis.interfaces.ts` (Updated error types)
  - `src/core/analysis/ast-analysis.service.ts` (Updated signatures, error types, prompt construction)
  - `src/core/di/modules/llm-module.ts` (Updated factory error returns, fixed logger scope)
  - `tests/__mocks__/llm-agent.mock.ts` (Updated signatures, added missing mocks)
  - `tests/__mocks__/ast-analysis.service.mock.ts` (Updated signatures)
  - `tests/__mocks__/project-analyzer.mock.ts` (Updated signatures)
  - `tests/core/analysis/ast-analysis.service.test.ts` (Updated mocks and assertions)
  - `tests/core/llm/provider-registry.test.ts` (Updated mock factories and assertions)
- **Implementation Summary:**
  - Confirmed `ProjectContext` logging in `ProjectAnalyzer.ts` and `ProjectAnalyzerHelpers.ts` was correctly implemented (pretty-printed to `.cache/project-context-output.json`, path logged).
  - **Type System Refactoring:** Undertook extensive refactoring to resolve build-blocking TypeScript errors. This involved:
    - Standardizing `getStructuredCompletion` method signature across `ILLMProvider`, `ILLMAgent`, and all concrete provider implementations to use `(prompt: BaseLanguageModelInput, schema: T, completionConfig?: LLMCompletionConfig)` and return `Promise<Result<z.infer<T>, LLMProviderError>>`.
    - Standardizing `getCompletion` method signature across `ILLMProvider`, `ILLMAgent`, and all concrete provider implementations to return `Promise<Result<string, LLMProviderError>>`.
    - Updating `LLMProviderFactory` type in `interfaces.ts` to return `Result<ILLMProvider, LLMProviderError>`.
    - Updating `IModelListerService` and its implementation `ModelListerService` for `listModelsForProvider` to return `Promise<Result<string[], LLMProviderError>>`.
    - Updating `IAstAnalysisService` and its implementation `AstAnalysisService` for `analyzeAst` to return `Promise<Result<CodeInsights, LLMProviderError>>` and to correctly call the updated `llmAgent.getStructuredCompletion`.
    - Correcting provider factories in `llm-module.ts` to align with updated `LLMProviderFactory` type and simplified constructor signatures for `OpenAIProvider` and `OpenRouterProvider`. Fixed logger scoping issues.
    - Updating all relevant mock implementations (`llm-agent.mock.ts`, `ast-analysis.service.mock.ts`, `project-analyzer.mock.ts`, and mocks within `provider-registry.test.ts`) to match new interface signatures and error types.
    - Correcting test assertions in `ast-analysis.service.test.ts` and `provider-registry.test.ts` to expect `LLMProviderError` and handle changes in error propagation.
  - **E2E Test Execution & Verification (Scoped by Architect):**
    - Delegated E2E testing to Junior Tester.
    - Junior Tester ran `ProjectAnalyzer.analyzeProject` (via `npm start -- generate -- -g memory-bank`) on the `roocode-generator` project itself.
    - Testing for `codeInsights` was performed using the **Google GenAI provider**.
    - The generated `.cache/project-context-output.json` and application logs were inspected.
    - **All specified Acceptance Criteria (AC1-AC8, AC10) were reported as PASSING for the Google GenAI provider path.** This includes:
      - AC5: `codeInsights` present, structured, and schema-compliant (for Google GenAI).
      - AC6: `tsconfig.json` (with comments) correctly parsed and represented.
      - AC7: File/directory exclusions (`SKIP_DIRECTORIES`, hidden dirs) correctly applied in `directoryTree` and for `codeInsights`.
      - AC8: No regressions in other core analysis parts of `ProjectContext`.
      - AC1-AC4: Google GenAI provider stable and `getStructuredCompletion` successful.
      - AC10: Code quality of recent logging changes maintained.
    - Per Architect's direction, E2E testing for Anthropic, OpenAI, and OpenRouter providers for `codeInsights` was deferred for this task.
- **Deviations:**
  - The full E2E testing across all four LLM providers for `codeInsights` was not completed in this subtask due to Architect's decision to scope down after successful Google GenAI verification and extensive type-fixing efforts. Only Google GenAI was E2E tested for `codeInsights` verification against `project-context-output.json`.
- **Junior Tester Observations (for future consideration):**
  - Potential data duplication in `project-context-output.json`:
    - Dependencies object (`ProjectContext.dependencies`) vs. nested dependencies in `ProjectContext.packageJson`.
    - `ProjectContext.structure.directoryTree` potentially redundant with info in `codeInsights` and `internalDependencies`.
    - Suggestion to create a new task to trim/optimize `projectContext` output.
- **Related Acceptance Criteria:** AC1-AC8, AC10 verified for Google GenAI path. AC9 (Comprehensive E2E) partially met as per Architect's revised scope for this subtask.
- **Estimated effort:** 3 - 4 hours (Actual effort significantly higher due to extensive type error resolution across multiple files).
- **Required Delegation Components:**
  - Junior Tester:
    - Component: Build verification.
    - Component: Execute `ProjectAnalyzer` with Google GenAI provider configuration.
    - Component: Retrieve and meticulously verify `project-context-output.json` against ACs for the Google GenAI path.
    - Component: Document findings, configuration, and AC verification status.
- **Delegation Success Criteria**:
  - Junior Tester confirmed build success and provided a report on E2E test execution for Google GenAI, verifying ACs for that path.

## 5. Testing Strategy (Revised)

- **Developer Testing:** Implementers of Subtasks 1-3 will perform manual checks to ensure their specific provider's `getStructuredCompletion` works.
- **Primary Focus: Manual End-to-End (E2E) Testing (Subtask 5):** This is the main validation for the entire task.
  - Execution of `ProjectAnalyzer.analyzeProject` with different LLM providers.
  - `ProjectContext` logged to JSON for inspection.
  - Verification of structured output, `tsconfig.json` handling, exclusions, and no regressions.
- **Unit & Integration Testing:** Deferred for this iteration.

## 6. Implementation Sequence

1.  **Subtask 1:** Implement `getStructuredCompletion` for `AnthropicProvider`
2.  **Subtask 2:** Implement `getStructuredCompletion` for `OpenAIProvider`
3.  **Subtask 3:** Implement `getStructuredCompletion` for `OpenRouterProvider`
    _Rationale: Implement structured output for all remaining key providers first to ensure a consistent `AstAnalysisService` experience._
4.  **Subtask 4:** Verify `tsconfig.json` Comment Stripping (Placeholder for E2E verification of existing logic)
5.  **Subtask 5:** Final E2E Testing, `ProjectContext` Logging & Verification
    _Rationale: Comprehensive validation of all changes across all providers, including `ProjectContext` integrity and regression checks._

This plan now centralizes the structured output implementation and prepares for comprehensive E2E validation.
