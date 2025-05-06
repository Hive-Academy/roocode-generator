---
title: Task Description
type: template
category: task
taskId: TSK-017
priority: High
---

# Task Description: TSK-017/FixGoogleGenAIProviderIssues

## Overview

This task addresses critical reliability issues encountered when interacting with the Google GenAI provider (specifically `gemini-2.5-flash-preview-04-17`). The current implementation fails due to:

1.  Malformed JSON responses returned during project analysis (`codeInsights` generation), causing parsing errors.
2.  Errors during token counting, including receiving unexpected non-JSON (HTML) responses.

Fixing these issues is essential to ensure the stability of the memory bank generation process and to unblock the completion of TSK-016 ("Enhance Memory Bank Generator Content Quality"). This task implements recommendations from the research conducted (see Related Documentation).

## Requirements

### Functional Requirements

- The project analysis process must successfully generate `codeInsights` even if the LLM returns common JSON syntax errors (e.g., trailing commas, missing quotes).
- The token counting mechanism for the Google GenAI provider must return accurate counts or fail gracefully with informative logs.
- API interactions with Google GenAI should automatically retry on transient errors (e.g., rate limits, server errors).
- Input exceeding the model's token limit should be detected _before_ sending the request to the API.

### Technical Requirements

- Integrate the `jsonrepair` library (or a similar robust alternative identified in research) to sanitize JSON responses from the Google GenAI provider before parsing.
- Implement retry logic with exponential backoff for specific Google GenAI API errors (`429`, `500`, `503`) in both completion (`generateContent`) and `countTokens` calls within `google-genai-provider.ts`.
- Add specific error detection logic within the `countTokens` handling to identify and log non-JSON responses (specifically checking for HTML like `<!DOCTYPE...`).
- Implement a mechanism to programmatically retrieve the `input_token_limit` for the configured Google GenAI model using the `getModels` API/SDK method.
- Use the retrieved (or a fallback) token limit to validate input size _before_ making API calls (`countTokens`, `generateContent`).
- Ensure comprehensive logging around JSON repair attempts, API retries, and token limit handling.

## Scope

### Included

- Modifying `src/core/analysis/project-analyzer.ts` (or utility) to integrate JSON repair logic for LLM responses.
- Modifying `src/core/llm/providers/google-genai-provider.ts` to:
  - Implement API retry logic (exponential backoff).
  - Fix the `countTokens` implementation, including handling non-JSON error responses.
  - Integrate token limit retrieval and pre-call validation.
- Potentially modifying `src/core/llm/llm-config.service.ts` or similar to manage/cache the retrieved token limit.
- Adding `jsonrepair` as a project dependency.
- Adding unit/integration tests for the new/modified logic (JSON repair, retry, error handling, token limits).

### Excluded

- Changing the primary LLM provider from Google GenAI.
- Implementing a vector store or RAG approach.
- Fixing potential issues in other LLM providers.
- Major refactoring of the analysis or LLM modules beyond what's needed for these fixes.
- Addressing the root cause of _why_ the LLM returns malformed JSON (focus is on handling it).

### Affected Components

See [[TechnicalArchitecture]] for component details.

- `src/core/analysis/project-analyzer.ts`
- `src/core/llm/providers/google-genai-provider.ts`
- Potentially `src/core/llm/llm-config.service.ts`
- `package.json` (to add `jsonrepair` dependency)

## Dependencies

### Technical Dependencies

- Requires installation of the `jsonrepair` npm package.
- Depends on the Google GenAI API/SDK providing the `getModels` functionality.

### Task Dependencies

- None. This task is intended to unblock TSK-016.

## Success Criteria

1.  **AC1 (JSON Repair):** The `jsonrepair` library (or a similarly effective one based on the research) is integrated into the LLM response handling logic (likely within `project-analyzer.ts` or a utility).
    - _Verification:_ Code review confirms integration and usage pattern (try standard parse, then repair, then parse again).
2.  **AC2 (Malformed JSON Handling):** The system successfully parses previously problematic JSON responses from Google GenAI (examples from TSK-016 logs) after implementing the repair logic.
    - _Verification:_ Unit tests using the logged malformed JSON strings as input demonstrate successful parsing after repair. Manual testing confirms `codeInsights` generation works without JSON parsing errors for the affected files (`json-schema-helper.ts`, `template.ts`).
3.  **AC3 (Token Counting Fix):** The token counting mechanism for the Google GenAI provider correctly returns the token count or handles API errors gracefully.
    - _Verification:_ Unit/integration tests confirm `countTokens` returns a number for valid requests.
4.  **AC4 (HTML Error Handling):** The specific HTML `<!DOCTYPE...` error encountered during token counting is detected, logged comprehensively (including a snippet of the HTML), and treated as a distinct failure (not just a generic error).
    - _Verification:_ Unit test simulating the HTML response confirms detection and specific logging. Code review verifies the check (e.g., `responseString.trim().startsWith('<!DOCTYPE')`).
5.  **AC5 (API Retry Logic):** Retry logic with exponential backoff is implemented for specific Google GenAI API errors (`429`, `500`, `503`) in both completion and token counting calls.
    - _Verification:_ Code review confirms retry logic implementation. Unit tests mocking API responses with these codes verify retry behavior.
6.  **AC6 (Token Limit Retrieval):** A mechanism is implemented to programmatically retrieve the `input_token_limit` for the configured Google GenAI model using the `getModels` API/SDK method.
    - _Verification:_ Code review confirms implementation. Unit/integration test verifies successful retrieval of the limit.
7.  **AC7 (Token Limit Fallback):** A sensible fallback value (e.g., 1,000,000 tokens for Gemini 2.5 Flash) is used if the programmatic retrieval of the token limit fails.
    - _Verification:_ Code review confirms fallback logic. Unit test simulating API failure for `getModels` confirms fallback value is used.
8.  **AC8 (Token Limit Usage):** The retrieved (or fallback) token limit is used to validate input size _before_ making calls to `countTokens` or `generateContent` to prevent unnecessary API calls destined to fail.
    - _Verification:_ Code review confirms pre-call validation logic. Unit tests with input exceeding the limit confirm the API call is skipped and an appropriate error/warning is generated.

## Additional Context

### Business Context

The memory bank generation feature is a core capability of this tool. Its reliability is paramount. The current errors with the Google GenAI provider block the generation process and prevent further quality enhancements planned in TSK-016. Resolving these provider-specific issues ensures the feature works as expected and allows development to continue.

### Technical Context

The `project-analyzer` component relies on LLM calls (via `google-genai-provider.ts`) to generate `codeInsights`. Logs from TSK-016 execution show that the `gemini-2.5-flash-preview-04-17` model is returning JSON with syntax errors, causing `JSON.parse` to fail. Additionally, the `countTokens` function within the provider is failing with non-JSON errors (HTML detected), indicating issues with API interaction or error handling. The research report provides specific recommendations for libraries (`jsonrepair`) and techniques (retry logic, specific error detection, token limit handling) to address these problems.

### Related Documentation

- Research Report: [research-report.md](./research-report.md)
- Implementation Plan: [[implementation-plan-template]]
- Technical Details: [[TechnicalArchitecture]]
- Development Guidelines: [[DeveloperGuide]]
- Blocked Task: [[TSK-016-EnhanceMemoryBankGenQuality/task-description.md]]
