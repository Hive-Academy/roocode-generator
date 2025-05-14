# Task Description: TSK-022 - Fix LLM Config Redundant Token Prompt

## 1. Task Overview

The `npm start -- config` command for LLM configuration currently prompts the user to enter `maxTokens` even if the system has already successfully retrieved the model's context window (and derived a suggested `maxTokens` value). This is a redundant step and a poor user experience.

The goal is to modify the configuration flow so that if the model's context window is successfully determined, a derived `maxTokens` value is used automatically, and the user is not prompted for it. If the context window cannot be determined, the existing behavior of prompting the user for `maxTokens` should be maintained.

## 2. Current Implementation Analysis

- **File**: [`src/core/config/llm-config.service.ts`](src/core/config/llm-config.service.ts:1)
- **Method**: `interactiveEditConfig` calls `promptForAdvancedConfig`.
- **`promptForAdvancedConfig` Behavior**:
  1.  Attempts to fetch `contextWindow` for the selected model using the provider's `getTokenContextWindow` method.
  2.  Calculates `suggestedMaxTokens = Math.floor(contextWindow * 0.25)` if `contextWindow` is found.
  3.  Logs the `contextWindow` and `suggestedMaxTokens` if found.
  4.  **Always** prompts the user for `maxTokens` via `inquirer`, using `suggestedMaxTokens` as the default in the prompt.

## 3. Component Structure

- `LLMConfigService`: Orchestrates the interactive configuration.
  - `promptForAdvancedConfig`: Method responsible for prompting temperature and `maxTokens`.
- LLM Provider Implementations (e.g., OpenAI, GoogleGenAI): Provide `getTokenContextWindow` method.
- `inquirer`: Used for CLI prompts.

## 4. Detailed Requirements

1.  Modify the `promptForAdvancedConfig` method in [`src/core/config/llm-config.service.ts`](src/core/config/llm-config.service.ts:1).
2.  **Conditional `maxTokens` Prompting**:
    - If `contextWindow` is successfully retrieved (i.e., `contextWindow > 0`):
      - The `maxTokens` value should be automatically set to `suggestedMaxTokens` (which is `Math.floor(contextWindow * 0.25)`).
      - The user should **not** be prompted to enter `maxTokens`.
      - A log message (debug or info) should indicate that `maxTokens` was set automatically.
    - If `contextWindow` cannot be retrieved (i.e., `contextWindow` is `0` or retrieval fails):
      - The user **should** be prompted to enter `maxTokens` as per the current behavior.
      - The prompt should use the fallback `suggestedMaxTokens` (currently 4096) as the default.
3.  The prompt for `temperature` should remain unchanged and always occur.
4.  The final `llm.config.json` should correctly store the `provider`, `apiKey`, `model`, `temperature`, and the determined `maxTokens`.

## 5. Acceptance Criteria Checklist

- [ ] **AC1: Automatic `maxTokens` Setting**:
  - **Given** `config` command, provider/model with retrievable context window.
  - **When** `promptForAdvancedConfig` executes.
  - **Then** NO prompt for `maxTokens`.
  - **And** `maxTokens` in result is `Math.floor(contextWindow * 0.25)`.
- [ ] **AC2: Fallback `maxTokens` Prompt**:
  - **Given** `config` command, provider/model without retrievable context window.
  - **When** `promptForAdvancedConfig` executes.
  * **Then** user IS prompted for `maxTokens`.
  * **And** prompt default is fallback `suggestedMaxTokens` (4096).
- [ ] **AC3: Temperature Prompt Unchanged**:
  - **Given** AC1 or AC2.
  - **When** `promptForAdvancedConfig` executes.
  - **Then** user IS always prompted for `temperature`.
- [ ] **AC4: Configuration Saving**:
  - **Given** `interactiveEditConfig` completes.
  - **When** config is saved.
  - **Then** `llm.config.json` correctly reflects all values, including determined `maxTokens`.
- [ ] **AC5: Logging**:
  - **Given** `maxTokens` set automatically (AC1).
  - **When** `promptForAdvancedConfig` completes.
  - **Then** log message indicates automatic `maxTokens` setting with derived value and context window.

## 6. Implementation Guidance

- Focus changes within the `promptForAdvancedConfig` method in [`src/core/config/llm-config.service.ts`](src/core/config/llm-config.service.ts:1).
- Store the result of the `inquirer` prompt for temperature.
- After attempting to get `contextWindow`:
  - If `contextWindow > 0`:
    - Calculate `finalMaxTokens = Math.floor(contextWindow * 0.25)`.
    - Log the automatic setting.
  - Else (`contextWindow` is 0 or retrieval failed):
    - Prompt for `maxTokens` using `inquirer` as currently done.
    - `finalMaxTokens` will be the user's input.
- Return `{ temperature: userTemperature, maxTokens: finalMaxTokens }`.

## 7. File and Component References

- Primary file: [`src/core/config/llm-config.service.ts`](src/core/config/llm-config.service.ts:1)
- Method: `promptForAdvancedConfig`
- Related: `interactiveEditConfig` (caller), LLM provider implementations (source of `getTokenContextWindow`).
