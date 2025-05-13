# Task Description: Implement OpenAI Model Listing

## Task Overview

Implement the missing `listModels` method in the `OpenAIProvider` class (`src/core/llm/providers/openai-provider.ts`). This method is required by the `ModelListerService` to fetch available models during the interactive LLM configuration process.

## Current Implementation Analysis

The `LLMConfigService` uses the `ModelListerService` to get a list of available models for a selected provider during the interactive `config` command. The `ModelListerService` expects each LLM provider implementation to have a `listModels` method. However, the current `OpenAIProvider` class does not implement this method. This leads to a "not implemented" error when attempting to list OpenAI models via the `config` command.

The existing `OpenAIProvider` does contain a method (`getContextWindowSize`) that demonstrates how to make authenticated GET requests to the OpenAI API (`/v1/models/{model_id}`).

## Component Structure

- `src/core/cli/cli-interface.ts`: Handles the `config` command.
- `src/core/config/llm-config.service.ts`: Orchestrates the interactive configuration, calls `ModelListerService`.
- `src/core/llm/model-lister.service.ts`: Calls the `listModels` method on the selected provider.
- `src/core/llm/providers/openai-provider.ts`: The class where the `listModels` method needs to be implemented.

## Detailed Requirements

Implement the `public async listModels(): Promise<Result<string[], LLMProviderError>>` method in the `OpenAIProvider` class. This method should:

1.  Construct the URL for the OpenAI models API endpoint: `https://api.openai.com/v1/models`.
2.  Make an HTTP GET request to this endpoint.
3.  Include the API key from the `LLMConfig` in the `Authorization` header as a Bearer token (`Authorization: Bearer YOUR_OPENAI_API_KEY`).
4.  Handle the API response.
5.  Parse the JSON response to extract the list of model IDs. Based on the research, the expected successful response structure is:
    ```json
    {
      "object": "list",
      "data": [
        { "id": "model-id-1", "object": "model", ... },
        { "id": "model-id-2", "object": "model", ... },
        ...
      ]
    }
    ```
    Extract the `id` string from each object within the `data` array.
6.  Return a `Result.ok` with an array of model ID strings if the API call is successful and models are found.
7.  Return a `Result.err` with an appropriate `LLMProviderError` if:
    - The API call fails (e.g., network error).
    - The API returns an error status code (e.g., 401, 429, 5xx). Map common OpenAI error codes/statuses (like 401 for authentication, 429 for rate limits/quota) to appropriate `LLMProviderError` types (`AUTHENTICATION_ERROR`, `RATE_LIMIT_ERROR`, `API_ERROR`, etc.).
    - The response format is unexpected or parsing fails.
    - No models are returned in the `data` array.
8.  Log relevant information (success, errors, warnings) using the injected `ILogger`. Include details from API error responses where available (e.g., error message, type, code, status).
9.  Consider implementing basic retry logic for transient errors (e.g., 429, 5xx) similar to the pattern used in `_performStructuredCallWithRetry`, although the `ModelListerService` itself might also handle retries. Focus on robust error classification for `LLMProviderError`.

## Acceptance Criteria Checklist

- [ ] The `OpenAIProvider` class has a public asynchronous method named `listModels` that returns `Promise<Result<string[], LLMProviderError>>`.
- [ ] The `listModels` method makes an HTTP GET request to `https://api.openai.com/v1/models`.
- [ ] The API request includes the `Authorization` header with the API key from `this.config.apiKey` in the format `Bearer YOUR_API_KEY`.
- [ ] The method correctly parses the API response to extract model IDs from the `data` array.
- [ ] The method returns `Result.ok` with an array of model ID strings on a successful API call with models found.
- [ ] The method returns `Result.err` with an `LLMProviderError` on API failure, invalid response format, or if the `data` array is empty or missing.
- [ ] API errors (e.g., 401, 429, 5xx) are caught and mapped to appropriate `LLMProviderError` types.
- [ ] Appropriate logging is included for success and error cases, providing context about the API call and response.
- [ ] The interactive LLM configuration (`npm run config`) successfully lists OpenAI models when OpenAI is selected and a valid API key is provided.

## Implementation Guidance

- You can use `fetch` or a similar library for the HTTP request. Ensure proper error handling for network issues and HTTP response status codes.
- Refer to the existing `getContextWindowSize` method in `OpenAIProvider` for an example of making an API call to OpenAI and handling the response.
- Use the `LLMProviderError` class for error reporting and ensure appropriate error codes are used based on the research findings (e.g., `AUTHENTICATION_ERROR`, `RATE_LIMIT_ERROR`, `API_ERROR`, `VALIDATION_ERROR`, `NO_MODELS_FOUND`).
- Consider using `zod` or similar for robust parsing and validation of the API response structure, although a simple check for `response.data` being an array and mapping `id` might suffice initially.
- The research report is available at `task-tracking/TSK-022-ImplementOpenAIModelListing/research-report.md` and contains detailed information on the API structure and error handling.

## File and Component References

- `src/core/llm/providers/openai-provider.ts` (Implementation target)
- `src/core/llm/model-lister.service.ts` (Consumer of the new method)
- `src/core/config/llm-config.service.ts` (Initiates the model listing)
- `src/core/llm/llm-provider-errors.ts` (Error class)
- `src/core/result/result.ts` (Result type)
- `src/core/services/logger-service.ts` (Logger)
- `types/shared.d.ts` (LLMConfig type)
- `task-tracking/TSK-022-ImplementOpenAIModelListing/research-report.md` (Research findings)
