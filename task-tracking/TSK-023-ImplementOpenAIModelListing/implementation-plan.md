# Implementation Plan: Implement OpenAI Model Listing and Token Context Checking

## Overview

This plan outlines the implementation of the `listModels` method and the token context checking functionality within the existing `OpenAIProvider` class. The `listModels` method retrieves available models from the OpenAI API. The token context checking will involve determining the maximum token limit for a given OpenAI model. Both implementations will adhere to existing architectural patterns for LLM providers and error handling, returning results using the `Result` type. Additionally, the interactive LLM configuration will be updated to suggest a default `maxTokens` generation parameter based on the selected model's context window.

Key implementation decisions include using the `fetch` API for HTTP requests, consistent error mapping to `LLMProviderError` types, integrating with existing configuration and logging services, using a predefined mapping for token limits, and modifying the interactive configuration flow.

Files to be modified:

- `src/core/llm/providers/openai-provider.ts` - Add/modify methods for model listing and token context checking.
- `src/core/llm/model-lister.service.ts` - Integrate the `listModels` method call.
- `src/core/llm/token-context.service.ts` - (DEFERRED - Deemed not strictly necessary, `LlmConfigService` uses provider directly)
- `src/core/config/llm-config.service.ts` - Modify the interactive configuration logic.

## Implementation Strategy

The core strategy involves three main parts:

1.  **Model Listing (`listModels`)**: Add the `listModels` method to the `OpenAIProvider`. This method will:

    - Construct the API endpoint URL (`https://api.openai.com/v1/models`).
    - Prepare the request headers, including the `Authorization: Bearer YOUR_API_KEY` header.
    - Use `fetch` to make the GET request.
    - Handle the response: parse the JSON body, extract model IDs from the `data` array, and return `Result.ok` with an array of model ID strings on success. Handle invalid/empty responses and API errors (401, 429, 5xx), mapping them to appropriate `LLMProviderError` types and returning `Result.err`.
    - Include logging for success and failure scenarios.

2.  **Token Context Checking (`getTokenContextWindow`)**: Add or modify a method (likely `getTokenContextWindow` or similar) in `OpenAIProvider` to return the maximum token limit for a given model name. This will be implemented by using a predefined internal mapping of common OpenAI models to their known token limits.

3.  **Interactive Config `maxTokens` Suggestion**: Modify the interactive configuration flow in `LlmConfigService` to:
    - After a model is selected, use the `LLMProviderRegistry` to get a temporary provider instance and call its `getTokenContextWindow` method to get the model's maximum context window.
    - Calculate a suggested default `maxTokens` value (e.g., 25% of the context window).
    - Present this suggested value to the user when prompting for the `maxTokens` generation parameter.

All methods will integrate with existing services (`ModelListerService`, `LlmConfigService`) and utilize the `Result` type for error handling. The circular dependency between `LLMProviderRegistry` and `ILLMConfigService` has been resolved.

Technical challenges include ensuring correct error mapping and robust parsing for model listing, maintaining an accurate internal mapping for token context checking, correctly integrating the token context lookup into the interactive config flow. The circular DI issue and `OpenAIProvider` token handling issues have been addressed. `TokenContextService` was deemed not necessary.

## Acceptance Criteria Mapping

- **AC1**: The `OpenAIProvider` class has a public asynchronous method named `listModels` that returns `Promise<Result<string[], LLMProviderError>>`. (Covered by Subtask 1)
- **AC2**: The `listModels` method makes an HTTP GET request to `https://api.openai.com/v1/models`. (Covered by Subtask 1)
- **AC3**: The API request includes the `Authorization` header with the API key from `this.config.apiKey` in the format `Bearer YOUR_API_KEY`. (Covered by Subtask 1)
- **AC4**: The method correctly parses the API response to extract model IDs from the `data` array. (Covered by Subtask 1)
- **AC5**: The method returns `Result.ok` with an array of model ID strings on a successful API call with models found. (Covered by Subtask 1)
- **AC6**: The method returns `Result.err` with an `LLMProviderError` on API failure, invalid response format, or if the `data` array is empty or missing (for `listModels`), with correct error propagation. (Covered by Subtask 1 & Redelegation)
- **AC7**: API errors (e.g., 401, 429, 5xx) are caught and mapped to appropriate `LLMProviderError` types (for `listModels`), with correct error propagation. (Covered by Subtask 1 & Redelegation)
- **AC8**: Appropriate logging is included for success and error cases (for `listModels`). (Covered by Subtask 1)
- **AC9**: The interactive LLM configuration (`npm run config`) successfully lists OpenAI models when OpenAI is selected and a valid API key is provided, and handles errors gracefully with correct messages. (Covered by Subtask 1 & Redelegation)
- **AC10**: The `OpenAIProvider` class has a public method (async if needed) named `getTokenContextWindow` that accepts a model name string and returns `Result<number, LLMProviderError>`.
- **AC11**: The `getTokenContextWindow` method correctly returns the maximum token limit for known OpenAI models.
- **AC12**: The `getTokenContextWindow` method returns `Result.err` with an `LLMProviderError` (e.g., `ModelNotFoundError`) if the provided model name is not recognized or its token limit is unknown. (Covered by Subtask 2 & Redelegation)
- **AC13**: Appropriate logging is included for success and error cases in `getTokenContextWindow`.
- **AC14**: The application correctly uses `getTokenContextWindow` to determine the context limit for OpenAI models. (Covered by Subtask 2 & Redelegation)
- **AC15**: The interactive LLM configuration (`npm run config`) suggests a default `maxTokens` value based on the selected model's maximum context window (e.g., 25% of the context window).

## Implementation Subtasks

### 1. Implement `listModels` method in `OpenAIProvider`

**Status**: Completed

**Description**: Add the `listModels` asynchronous method to the `OpenAIProvider` class. This method will perform the HTTP GET request to the OpenAI models endpoint, handle authentication, parse the response, and manage errors, returning a `Result<string[], LLMProviderError>`.

**Files to Modify**:

- [`src/core/llm/providers/openai-provider.ts`](src/core/llm/providers/openai-provider.ts) - Add the new method.
- [`src/core/llm/model-lister.service.ts`](src/core/llm/model-lister.service.ts) - Integrate the new method call.

**Implementation Details**:

```typescript
// Inside OpenAIProvider class
// (Implementation details for listModels as previously defined)
```

**Related Acceptance Criteria**:

- AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9

**Estimated effort**: 30-45 minutes

**Required Delegation Components**:

- Implementation components for Junior Coder: None (single, cohesive task).
- Testing components for Junior Tester: None (unit tests are tightly coupled to the implementation logic).

**Delegation Success Criteria**:

- N/A

**Redelegation History**: N/A

### 2. Implement `getTokenContextWindow` method in `OpenAIProvider` and Integrate

**Status**: Completed

**Description**: Add the `getTokenContextWindow` method to the `OpenAIProvider` class using an internal mapping. Integrate this method into `_validateInputTokens` within `OpenAIProvider`. Refactor `_getDefaultContextSizeForModel` for better unknown model detection (returning `undefined` for unknown models). The `TokenContextService` was deemed not necessary.

**Files to Modify**:

- [`src/core/llm/providers/openai-provider.ts`](src/core/llm/providers/openai-provider.ts) - Add the new method, internal mapping, and modify `_validateInputTokens`. Refactor `_getDefaultContextSizeForModel`.
- [`src/core/llm/token-context.service.ts`](src/core/llm/token-context.service.ts) - (DEFERRED - Not implemented)

**Implementation Details**:

```typescript
// Inside OpenAIProvider class

// Refactor _getDefaultContextSizeForModel to return undefined or a specific indicator for unknown models
private _getDefaultContextSizeForModel(modelName: string): number | undefined {
    // Existing mapping logic
    const context = this.modelContextMap.get(modelName);
    return context; // Return undefined if not found
}

public getTokenContextWindow(modelName: string): Result<number, LLMProviderError> {
    this.logger.info(`Getting token context window for model: ${modelName}`);
    const contextWindow = this._getDefaultContextSizeForModel(modelName);

    if (contextWindow === undefined) {
        this.logger.warn(`Unknown token context window for model: ${modelName}`);
        return Result.err(new ModelNotFoundError(`Unknown token context window for model: ${modelName}`));
    }

    this.logger.info(`Token context window for ${modelName}: ${contextWindow}`);
    return Result.ok(contextWindow);
}

// Modify _validateInputTokens to use getTokenContextWindow
private async _validateInputTokens(promptTokens: number): Promise<Result<void, LLMProviderError>> {
    // ... existing logic ...
    const contextWindowResult = this.getTokenContextWindow(this.config.model);

    if (contextWindowResult.isErr()) {
        // Handle the error from getTokenContextWindow, e.g., ModelNotFoundError
        return Result.err(contextWindowResult.error);
    }

    const maxContextWindow = contextWindowResult.value;

    // ... rest of the validation logic using maxContextWindow ...
}


// TokenContextService was not implemented. LlmConfigService uses the provider directly.
```

**Related Acceptance Criteria**:

- AC10, AC11, AC12, AC13, AC14

**Estimated effort**: 30-45 minutes

**Required Delegation Components**:

- Implementation components for Junior Coder: None (single, cohesive task).
- Testing components for Junior Tester: None (unit tests are tightly coupled to the implementation logic).

**Delegation Success Criteria**:

- N/A

**Redelegation History**: N/A

### 3. Implement Interactive Config `maxTokens` Suggestion

**Status**: Completed

**Description**: Modify the interactive configuration logic in `LlmConfigService` to fetch the selected model's context window by obtaining a temporary provider instance via `LLMProviderRegistry` and calling its `getTokenContextWindow` method. Suggest a default `maxTokens` value (e.g., 25% of the context window) to the user.

**Files to Modify**:

- [`src/core/config/llm-config.service.ts`](src/core/config/llm-config.service.ts) - Modify the interactive configuration method.

**Implementation Details**:

```typescript
// Inside LlmConfigService, within the interactive configuration method

// After model selection:
// const modelContextResult = this.tokenContextService.getContextWindow(selectedModelName);
// This is now handled by getting a temporary provider instance from LLMProviderRegistry
// and calling getTokenContextWindow on it, as already implemented in LlmConfigService.
// See existing LlmConfigService.promptForAdvancedConfig

let suggestedMaxTokens = 4096; // Default fallback

if (modelContextResult.isOk()) {
  const contextWindow = modelContextResult.value;
  suggestedMaxTokens = Math.floor(contextWindow * 0.25); // Calculate 25%
  // Ensure suggestedMaxTokens is within reasonable bounds if needed
} else {
  // Log the error from getContextWindow if necessary, but proceed with fallback
  this.logger.warn(
    `Could not get context window for model ${selectedModelName}, using fallback for maxTokens suggestion.`
  );
}

// When prompting for maxTokens:
// Use the suggestedMaxTokens value as the default or hint in the prompt.
```

**Related Acceptance Criteria**:

- AC15

**Estimated effort**: 15-30 minutes

**Required Delegation Components**:

- Implementation components for Junior Coder: None (single, cohesive task).
- Testing components for Junior Tester: None (unit tests are tightly coupled to the implementation logic).

**Delegation Success Criteria**:

- N/A

**Redelegation History**: N/A

## Implementation Sequence

1. Implement `listModels` method in `OpenAIProvider` and integrate into `ModelListerService`. (Completed)
2. Implement `getTokenContextWindow` method in `OpenAIProvider`, integrate into `_validateInputTokens`, and refactor `_getDefaultContextSizeForModel`. (Completed)
3. Implement Interactive Config `maxTokens` Suggestion in `LlmConfigService`. (Completed - existing logic was confirmed sufficient)
4. Resolve circular dependency in DI module. (Completed)
5. Manually test the interactive LLM config flow to verify model listing, correct error handling, and the `maxTokens` suggestion. Manually test application logic that uses provider's `getTokenContextWindow` (via `LlmConfigService` or directly) with OpenAI models.

## Testing Strategy

The testing strategy will cover model listing, token context checking, and the interactive config `maxTokens` suggestion through manual testing.

For **Model Listing**:

- Manual testing of the interactive LLM configuration flow (`npm run config`) will verify that:
  - Selecting OpenAI prompts for an API key.
  - Providing a valid API key triggers the `listModels` call and displays the list.
  - Error scenarios (invalid key, network issues) are handled gracefully with informative messages (addressing the previous error propagation issue).

For **Token Context Checking**:

- Manual testing will involve verifying application logic that utilizes the provider's `getTokenContextWindow` (e.g., through `LlmConfigService`) with an OpenAI model. This might require running a specific command or feature that depends on knowing the model's context window.
- Critical manual test cases include:
  - Using a known OpenAI model and verifying the correct context window is retrieved.
  - Using an unknown or unsupported OpenAI model and verifying that an appropriate error is handled.

For **Interactive Config `maxTokens` Suggestion**:

- Manual testing of the interactive LLM configuration flow (`npm run config`) will verify that:
  - After selecting an OpenAI model, a default `maxTokens` value is suggested based on the model's context window.
  - The suggested value is approximately 25% of the model's known context window.

Unit tests for `OpenAIProvider` methods and `LlmConfigService` are not required for this specific task as per user feedback, with the focus being on manual verification through the CLI and application flow.
