# Task Description: Implement Google GenAI Model Listing and Fix Model Limits Fetch

## Task Overview

Implement the missing `listModels` method in the `GoogleGenAIProvider` class (`src/core/llm/providers/google-genai-provider.ts`) and investigate/fix the 404 error occurring when fetching model limits in the same class. This is necessary to enable proper interactive configuration for the Google GenAI provider.

## Current Implementation Analysis

The `GoogleGenAIProvider` currently lacks a `listModels` method, which is required by the `ModelListerService` for the interactive LLM configuration (`npm run config`).

Additionally, the `fetchModelLimits` method in `GoogleGenAIProvider` attempts to fetch model limits by making a GET request to `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}?key=${this.config.apiKey}`. This call is resulting in a 404 error, indicating that the endpoint or the way the model name is used is incorrect for retrieving model limits.

The existing `GoogleGenAIProvider` does contain methods for interacting with the Google GenAI API (e.g., `getCompletion`, `getStructuredCompletion`, `countTokens`), which can serve as a reference for making authenticated API calls.

## Component Structure

- `src/core/cli/cli-interface.ts`: Handles the `config` command.
- `src/core/config/llm-config.service.ts`: Orchestrates the interactive configuration, calls `ModelListerService` and uses provider's token context information.
- `src/core/llm/model-lister.service.ts`: Calls the `listModels` method on the selected provider.
- `src/core/llm/providers/google-genai-provider.ts`: The class where the `listModels` method needs to be implemented and `fetchModelLimits` needs to be fixed.
- `src/core/llm/types/google-genai.types.ts`: Contains relevant types for Google GenAI API responses.

## Detailed Requirements

1.  **Implement `listModels` method**:

    - Implement the `public async listModels(): Promise<Result<string[], LLMProviderError>>` method in the `GoogleGenAIProvider`.
    - Research the correct Google GenAI API endpoint and method for listing available models.
    - Make an authenticated HTTP request to this endpoint using the API key.
    - Parse the API response to extract the list of model IDs.
    - Return `Result.ok` with an array of model ID strings on success.
    - Return `Result.err` with an appropriate `LLMProviderError` on API failure, invalid response, or no models found.
    - Log relevant information.

2.  **Fix `fetchModelLimits` 404 error**:

    - Investigate why the current GET request to `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}?key=${this.config.apiKey}` is returning a 404. This might involve:
      - Verifying the correct endpoint for fetching model details/limits.
      - Checking if the model name format used in the URL is correct for this specific API call.
      - Confirming if model limits are available via this endpoint or require a different approach.
    - Correct the API call in `fetchModelLimits` to successfully retrieve the input token limit for the configured model.
    - Ensure proper error handling and logging for this API call.

3.  **Integrate and Test**:
    - Ensure the new `listModels` method is correctly integrated and works with the `ModelListerService` during the `config` command.
    - Verify that the `fetchModelLimits` method now successfully retrieves the token limit and that the `getTokenContextWindow` method (which uses `this.inputTokenLimit`) provides the correct limit.
    - Ensure the interactive configuration (`npm run config`) for Google GenAI now lists models and correctly suggests a default `maxTokens` based on the fetched context window.

## Acceptance Criteria Checklist

- [ ] The `GoogleGenAIProvider` class has a public asynchronous method named `listModels` that returns `Promise<Result<string[], LLMProviderError>>`.
- [ ] The `listModels` method makes an authenticated HTTP request to the correct Google GenAI API endpoint for listing models.
- [ ] The `listModels` method correctly parses the API response to extract model IDs.
- [ ] The `listModels` method returns `Result.ok` with an array of model ID strings on a successful API call with models found.
- [ ] The `listModels` method returns `Result.err` with an `LLMProviderError` on API failure, invalid response format, or if no models are found.
- [ ] The `fetchModelLimits` method in `GoogleGenAIProvider` no longer returns a 404 error under normal conditions with a valid API key and model.
- [ ] The `fetchModelLimits` method successfully retrieves the input token limit for the configured model.
- [ ] The `getTokenContextWindow` method in `GoogleGenAIProvider` correctly returns the fetched input token limit.
- [ ] Appropriate logging is included in both `listModels` and `fetchModelLimits`.
- [ ] The interactive LLM configuration (`npm run config`) successfully lists Google GenAI models when Google is selected and a valid API key is provided.
- [ ] The interactive LLM configuration (`npm run config`) suggests a default `maxTokens` value based on the fetched context window for Google GenAI models.

## Implementation Guidance

- Research the Google GenAI API documentation for endpoints related to listing models and retrieving model information/limits.
- Use `fetch` or a similar library for HTTP requests, following the pattern in existing methods like `countTokens` and `fetchModelLimits`.
- Use the `LLMProviderError` class for error reporting, mapping API errors to appropriate error types.
- Refer to the implementation of `listModels` and `getTokenContextWindow` in the `OpenAIProvider` (TSK-023) as a reference, adapting for the Google GenAI API specifics.

## File and Component References

- `src/core/llm/providers/google-genai-provider.ts` (Implementation target)
- `src/core/llm/model-lister.service.ts` (Consumer of `listModels`)
- `src/core/config/llm-config.service.ts` (Initiates model listing and uses token context)
- `src/core/llm/llm-provider-errors.ts` (Error class)
- `src/core/result/result.ts` (Result type)
- `src/core/services/logger-service.ts` (Logger)
- `types/shared.d.ts` (LLMConfig type)
- `src/core/llm/types/google-genai.types.ts` (Potential location for new types if needed)
