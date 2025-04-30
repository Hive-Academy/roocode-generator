# Implementation Plan: Enhance LLM Configuration Generator & Integrate OpenRouter

## 1. Overview

This plan details the enhancement of the LLM configuration generator for a highly interactive CLI experience and the integration of OpenRouter as a new LLM provider, based on comprehensive research and best practices. The plan references the latest research findings, project architecture, and code standards.

**Key Objectives:**

- Upgrade the `config` command for step-by-step, validated, and user-friendly LLM configuration.
- Implement provider-specific API calls to list available models during configuration (where supported).
- Integrate OpenRouter as a new, fully supported LLM provider, following Langchain and RooCode patterns.

**Files to Modify / Create:**

- `src/core/config/llm-config.service.ts`
- `src/core/cli/cli-interface.ts`
- `src/core/llm/llm-provider-configs.ts`
- `src/core/llm/llm-provider.ts`
- `src/core/llm/provider-registry.ts`
- `src/core/llm/providers/OpenRouterProvider.ts` (new)
- `llm.config.json`
- Tests: `tests/core/config/llm-config.service.test.ts`, `tests/core/llm/providers/openrouter-provider.test.ts`, etc.

---

## 2. Current Status Summary

- The interactive LLM configuration flow in `llm-config.service.ts` is partially implemented but lacks full interactive prompts, validation, and model listing integration.
- The `OpenRouterProvider` class exists with partial implementation: placeholder for completion calls and partial model listing API call.
- The `OpenRouterProvider` is not yet registered in the `LLMProviderRegistry` or DI container, so it is not selectable or usable in the current system.
- No evidence of provider factories registration for OpenRouter was found.
- The CLI wiring for enhanced interactive config and model listing is incomplete.

---

## 3. Refined Implementation Subtasks

### 1. Complete Interactive LLM Configuration Flow

**Status**: Completed

**Deviations**:

- Removed non-interactive CLI options to align with architecture
- Service coordination moved to ApplicationContainer
- Enhanced error handling and logging

**Description**: Enhance `LLMConfigService` and `cli-interface.ts` to provide a fully interactive, step-by-step configuration experience with input validation, real-time feedback, and dynamic model listing for supported providers.

**Files to Modify**:

- `src/core/config/llm-config.service.ts`
- `src/core/cli/cli-interface.ts`

**Implementation Details**:

- Use advanced `inquirer` features for conditional prompts and validation.
- Integrate calls to provider's `listModels()` during model selection.
- Persist validated config to `llm.config.json`.

**Testing Requirements**:

- Unit tests for prompt logic, validation, and config persistence.
- Test cases for invalid inputs, missing fields, and model selection.

**Acceptance Criteria**:

- [ ] Prompts are clear, contextual, and validated.
- [ ] Real-time feedback is provided.
- [ ] Config updates are saved correctly.

**Estimated effort**: 45 minutes

---

### 2. Implement and Complete OpenRouterProvider

**Status**: Completed

**Deviations**:

- Enhanced error handling with detailed error information
- Improved logging with structured context
- Added OpenRouter-specific request headers for proper API attribution

**Description**: Complete the `OpenRouterProvider` implementation including API calls for completions and model listing, error handling, logging, and configuration support.

**Files to Modify**:

- `src/core/llm/providers/OpenRouterProvider.ts`

**Implementation Details**:

- Implement actual OpenRouter API calls for completions.
- Complete `listModels()` method with proper API response parsing.
- Use DI for logger and config.
- Follow Result pattern for error handling.

**Testing Requirements**:

- Unit tests with mocked API calls for completions and model listing.
- Error scenario tests.

**Acceptance Criteria**:

- [x] OpenRouter API calls function correctly.
- [x] Errors are handled and logged.
- [x] Models are listed correctly.

**Estimated effort**: 45 minutes

---

### 3. Register OpenRouterProvider in Provider Registry

**Status**: Not Started

**Description**: Register the `OpenRouterProvider` factory in the `LLMProviderRegistry` and DI container to enable instantiation and selection via config.

**Files to Modify**:

- `src/core/llm/provider-registry.ts`
- DI registration files (e.g., `src/core/di/registrations.ts` or equivalent)

**Implementation Details**:

- Add factory function for OpenRouterProvider.
- Ensure DI container can resolve dependencies.
- Update config schema if needed.

**Testing Requirements**:

- Unit tests for registry instantiation.
- Integration tests for provider selection.

**Acceptance Criteria**:

- [ ] OpenRouterProvider is selectable and instantiated correctly.
- [ ] Config options are validated.

**Estimated effort**: 30 minutes

---

### 4. Expand and Update Tests

**Status**: Completed

**Deviations**:

- Focused test expansion primarily on `tests/core/config/llm-config.service.test.ts` as existing tests for `cli-interface.ts` and `open-router-provider.test.ts` were deemed sufficient for the changes made in previous subtasks.

**Description**: Add comprehensive unit and integration tests covering the enhanced config flow and OpenRouterProvider.

**Files to Modify/Create**:

- `tests/core/config/llm-config.service.test.ts`
- `tests/core/llm/providers/openrouter-provider.test.ts`

**Implementation Details**:

- Use Jest with API mocking.
- Cover edge cases and error handling.

**Testing Requirements**:

- 90%+ coverage for new/changed code.
- Tests pass reliably.

**Acceptance Criteria**:

- [ ] All new code is tested.
- [ ] Tests cover edge cases and error scenarios.

**Estimated effort**: 45 minutes

---

## 4. Implementation Sequence

1. Complete Interactive LLM Configuration Flow - foundation for user experience and model selection.
2. Implement and Complete OpenRouterProvider - enables OpenRouter usage.
3. Register OpenRouterProvider in Provider Registry - integrates provider into system.
4. Expand and Update Tests - ensures quality and correctness.

---

## 5. Next Steps

Please review this updated implementation plan and status summary. Upon approval, I will delegate the first subtask for implementation.
