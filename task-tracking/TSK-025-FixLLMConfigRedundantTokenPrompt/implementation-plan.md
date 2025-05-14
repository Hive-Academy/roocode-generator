# Implementation Plan: TSK-025 - Fix LLM Config Redundant Token Prompt

**Task ID**: TSK-025
**Task Name**: Fix LLM Config Redundant Token Prompt
**Branch**: `fix/TSK-022-llm-config-redundant-token-prompt` (Note: branch name refers to TSK-022 but work is for TSK-025)

## 1. Overview

This plan outlines the technical steps to modify the `LLMConfigService` to conditionally prompt for the `maxTokens` configuration. If the selected LLM's context window can be determined, `maxTokens` will be automatically calculated (as 25% of the context window) and set. Otherwise, the user will be prompted for `maxTokens` as before. The `temperature` prompt will remain unchanged. Logging will be added to indicate when `maxTokens` is set automatically.

The primary changes will be within the [`promptForAdvancedConfig`](src/core/config/llm-config.service.ts:233) method in [`src/core/config/llm-config.service.ts`](src/core/config/llm-config.service.ts:1).

## 2. Implementation Strategy

The `promptForAdvancedConfig` method already attempts to fetch the model's context window. The strategy is to leverage this existing logic:

1.  **Conditional Prompting for `maxTokens`**:
    - Inside [`promptForAdvancedConfig`](src/core/config/llm-config.service.ts:233), after attempting to retrieve `contextWindow` (around line 262):
      - If `contextWindow` is successfully retrieved (i.e., `contextWindow > 0`):
        - `maxTokens` will be set to the already calculated `suggestedMaxTokens` (which is `Math.floor(contextWindow * 0.25)`).
        - A new log message using `this.logger.info` will be added to indicate that `maxTokens` is being set automatically, specifying the value and the context window it was derived from.
        - The `inquirer` prompt for `maxTokens` (currently lines 287-303) will be skipped.
      - If `contextWindow` cannot be retrieved (i.e., `contextWindow === 0` or an error occurred):
        - The user will be prompted for `maxTokens` as per the existing logic. The `suggestedMaxTokens` in this case will be the default fallback (e.g., 4096).
2.  **Dynamic Prompts Array**:
    - The array of prompt objects passed to `this.inquirer` (currently at line 277) will be constructed dynamically. The `temperature` prompt will always be included. The `maxTokens` prompt will only be added if `contextWindow === 0`.
3.  **Return Value**:
    - The method will return the `temperature` (from the prompt) and the `maxTokens` (either automatically set or from the prompt).
4.  **Logging**:
    - Ensure `this.logger.info` is used when `maxTokens` is set automatically. Example: `this.logger.info(\`Automatically setting maxTokens to \${finalMaxTokens} (25% of context window \${contextWindow}) for model \${modelName}.\`);`
    - Existing logging for context window retrieval (lines 265-272) should be reviewed for clarity and consistency.

## 3. Acceptance Criteria Mapping

| Acceptance Criterion               | How it will be satisfied                                                                                                                                                                                                                                      | Contributing Subtasks |
| :--------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------- |
| AC1: Automatic `maxTokens` Setting | If `contextWindow` is found (and > 0), `maxTokens` will be calculated as `Math.floor(contextWindow * 0.25)` and set without prompting the user. (Revised to correctly use `await provider.getContextWindowSize()` and handle its `Promise<number>` response.) | Subtask 1             |
| AC2: Fallback `maxTokens` Prompt   | If `contextWindow` is NOT found (is 0 or an error occurs during retrieval), the user will be prompted to enter `maxTokens`. (Revised to correctly trigger fallback based on `getContextWindowSize()` outcome.)                                                | Subtask 1             |
| AC3: Temperature Prompt Unchanged  | The prompt for `temperature` will always be presented to the user, regardless of whether `maxTokens` is set automatically or prompted.                                                                                                                        | Subtask 1             |
| AC4: Configuration Saving          | The `LLMConfigService` will save the `LLMConfig` (including the correctly determined `temperature` and `maxTokens`) to `llm.config.json`. This relies on existing save logic which should not need changes.                                                   | Subtask 1             |
| AC5: Logging                       | An informational log message will be recorded when `maxTokens` is set automatically. Debug and warning logs for context window fetching and `maxTokens` decisions have been updated for accuracy based on the revised `getContextWindowSize()` logic.         | Subtask 1             |

## 4. Implementation Subtasks

### 1. Modify `promptForAdvancedConfig` and Add Unit Tests

**Status**: Completed

**Description**: Update the [`promptForAdvancedConfig`](src/core/config/llm-config.service.ts:233) method in [`src/core/config/llm-config.service.ts`](src/core/config/llm-config.service.ts:1) to conditionally prompt for `maxTokens` based on the availability of the model's context window. Implement logging for automatic `maxTokens` setting. Add comprehensive unit tests for `LLMConfigService` to cover both scenarios (automatic and prompted `maxTokens`).

**Files to Modify**:

- [`src/core/config/llm-config.service.ts`](src/core/config/llm-config.service.ts:1): Implement the logic changes in `promptForAdvancedConfig`.
- `tests/core/config/llm-config.service.test.ts` (or create if not existing): Add unit tests.

**Implementation Details**:

```typescript
// In src/core/config/llm-config.service.ts, within promptForAdvancedConfig method

// ... (existing logic to determine contextWindow and suggestedMaxTokens) ...

const prompts: any[] = [
  // Consider using a more specific type for Inquirer prompts
  {
    type: 'number',
    name: 'temperature',
    message:
      'Set temperature for response creativity (0-1):\n  0: focused/deterministic\n  0.5: balanced\n  1: more creative',
    default: 0.1,
    validate: (input: number) =>
      (input >= 0 && input <= 1) || 'Temperature must be between 0 and 1',
  },
];

let finalMaxTokens: number;

if (contextWindow > 0) {
  finalMaxTokens = suggestedMaxTokens; // suggestedMaxTokens is already Math.floor(contextWindow * 0.25)
  this.logger.info(
    `Automatically setting maxTokens to ${finalMaxTokens} (25% of context window ${contextWindow}) for model ${modelName}.`
  );
} else {
  // contextWindow is 0 or could not be determined
  this.logger.warn(
    `Could not determine context window for model ${modelName}. User will be prompted for maxTokens.`
  );
  prompts.push({
    type: 'number',
    name: 'maxTokens',
    message: `Set maximum tokens per response (e.g., 4096):`, // Updated message
    default: suggestedMaxTokens, // This will be the fallback default (e.g. 4096)
    validate: (input: number) => {
      // If contextWindow was 0, there's no upper bound from it to validate against here.
      // The original validation for when contextWindow is known is:
      // (input > 0 && input <= contextWindow) || `Maximum tokens must be between 1 and ${contextWindow}`
      // For unknown contextWindow, a simple positive check is fine.
      return input > 0 || 'Maximum tokens must be greater than 0';
    },
  });
}

const answers = await this.inquirer(prompts);

if (contextWindow === 0) {
  // Only if prompted
  finalMaxTokens = answers.maxTokens as number;
}

return {
  temperature: answers.temperature as number,
  maxTokens: finalMaxTokens,
};
```

**Testing Requirements**:

- **Unit Tests for `LLMConfigService`**:
  - Test case 1: `promptForAdvancedConfig` when `contextWindow` IS successfully retrieved.
    - Mock `providerRegistry.getProviderFactory` to return a factory.
    - Mock the created provider's `getContextWindowSize` to return `Promise.resolve(validContextWindow)`. (Revised to match `ILLMProvider` interface).
    - Verify `inquirer` is called ONLY for `temperature`.
    - Verify `this.logger.info` is called with the automatic `maxTokens` message.
    - Verify the returned `maxTokens` is `Math.floor(validContextWindow * 0.25)`.
    - Verify the returned `temperature` is the one provided by the (mocked) `inquirer`.
  - Test case 2: `promptForAdvancedConfig` when `contextWindow` IS NOT successfully retrieved (e.g., `getContextWindowSize` returns `Promise.resolve(0)` or `Promise.reject(new Error(...))`).
    - Mock `providerRegistry.getProviderFactory` and `getContextWindowSize` accordingly. (Revised to match `ILLMProvider` interface).
    - Verify `inquirer` is called for BOTH `temperature` AND `maxTokens`.
    - Verify `this.logger.warn` is called about context window determination failure.
    - Verify the returned `maxTokens` is the one provided by the (mocked) `inquirer` for `maxTokens`.
    - Verify the returned `temperature` is the one provided by the (mocked) `inquirer`.
  - Test case 3: `promptForAdvancedConfig` when provider factory itself fails, or provider instance creation fails, or provider doesn't have `getContextWindowSize` method, or `getContextWindowSize` call rejects.
    - Verify `inquirer` is called for BOTH `temperature` AND `maxTokens` (fallback behavior).
    - Verify appropriate logging.
  - Test `interactiveEditConfig` end-to-end (mocking dependencies) to ensure the final saved config has the correct `maxTokens` and `temperature` based on the above scenarios.

**Related Acceptance Criteria**:

- AC1: Automatic `maxTokens` Setting
- AC2: Fallback `maxTokens` Prompt
- AC3: Temperature Prompt Unchanged
- AC4: Configuration Saving
- AC5: Logging

**Estimated effort**: 2-3 hours (including writing robust tests)

**Required Delegation Components**:

- Implementation components for Junior Coder: None for this subtask, as it's a focused modification within a single method.
- Testing components for Junior Tester: None for this subtask; Senior Developer will handle unit tests.

**Delegation Success Criteria**: N/A

**Deviations**:

- **Initial Implementation (Completed)**:
  - Unit tests for `promptForAdvancedConfig` and related updates to `interactiveEditConfig` tests were initially implemented.
  - The core logic modification in `promptForAdvancedConfig` was completed.
- **Post-Code Review Revisions (TSK-025 Attempt #2)**:
  - Corrected the call to `provider.getContextWindowSize()` in `src/core/config/llm-config.service.ts` to align with the `ILLMProvider` interface (using `await` and `try/catch` for the returned `Promise<number>`, instead of expecting a `Result` object and calling a non-existent `getTokenContextWindow(modelName)`).
  - Updated associated logging in `llm-config.service.ts` to accurately reflect the outcomes of `getContextWindowSize()`.
  - Revised unit tests in `tests/core/config/llm-config.service.interactive-edit.test.ts`:
    - Corrected mocking of `mockProvider.getContextWindowSize()` to return `Promise<number>` (e.g., `mockResolvedValue(16000)`, `mockResolvedValue(0)`, `mockRejectedValue(new Error(...))`).
    - Updated assertions for `inquirer` calls, saved configuration, and `mockLogger` calls to match the fixed service logic and actual log messages/levels.
  - Addressed a TypeScript error `factoryResult.error is possibly 'undefined'` by adding a nullish coalescing operator for the error message.
  - An ESLint parsing error related to `tsconfig.json` inclusion for the test file was noted but not fixed as it's a project configuration issue outside the direct scope of this task's code changes. The tests are expected to pass functionally despite this linting setup issue.

## 5. Implementation Sequence

1.  **Subtask 1: Modify `promptForAdvancedConfig` and Add Unit Tests** - This is the only subtask.

## 6. Testing Strategy

- **Unit Testing**: Primarily focus on unit testing [`LLMConfigService`](src/core/config/llm-config.service.ts:1).
  - Mock `IFileOperations`, `ILogger`, `Inquirer`, `IModelListerService`, and `LLMProviderRegistry`.
  - Specifically for `LLMProviderRegistry` and the provider instances, mock the `getContextWindowSize` method (note: corrected from `getTokenContextWindow`) to simulate different outcomes (resolving with a context window value, resolving with 0, or rejecting with an error).
  - Use `jest.spyOn` for `this.logger.info`, `this.logger.debug`, and `this.logger.warn` to verify logging calls.
  - Mock `this.inquirer` to control user input and verify which questions are asked.
- **Integration Testing**: While full integration tests are broader, the unit tests for `interactiveEditConfig` (which calls `promptForAdvancedConfig` and `saveConfig`) will serve as mini-integration tests for the config flow.
- **Manual Verification**: After implementation, manually run the configuration process (`roo config --edit`) with different LLM providers/models to observe:
  - Automatic `maxTokens` setting when context window is known.
  - Prompt for `maxTokens` when context window is unknown.
  - Correct logging messages.
  - Correct values saved in `llm.config.json`.

This task is self-contained and does not require delegation to Junior roles due to its small scope and specific nature of change within a single complex method. The Senior Developer will be responsible for the full implementation and testing of this subtask.
