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
- Tests: `tests/core/config/llm-config.service.test.ts`, `tests/core/config/llm-config.service.interactive-edit.test.ts`, `tests/core/llm/providers/openrouter-provider.test.ts`, `tests/core/llm/provider-registry.test.ts`

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

**Estimated effort**: 45 minutes

---

### 3. Register OpenRouterProvider in Provider Registry

**Status**: Completed _(Note: Plan file status was not updated in commit 7c6139c, but implementation was reported complete)_

**Description**: Register the `OpenRouterProvider` factory in the `LLMProviderRegistry` and DI container to enable instantiation and selection via config.

**Files to Modify**:

- `src/core/llm/provider-registry.ts`
- `src/core/di/modules/llm-module.ts`

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

**Estimated effort**: 45 minutes

---

### 5. Address Code Review Feedback (Split into Subtasks 5a, 5b, 5c)

**Original Description**: Implement fixes and improvements based on the Code Review findings to address logic errors, test coverage gaps, and minor issues.
**Status**: Partially Completed (Split)

---

### 5a. Complete Refactoring of `LLMConfigService.interactiveEditConfig`

**Status**: Completed

**Description**: Complete the refactoring of `LLMConfigService.interactiveEditConfig` to correctly use the `getProviderFactory` method for dynamic model listing based on user selection, addressing the critical logic error identified in Code Review. Also address minor related issues (unused param, generic error message, API key regex, hardcoded maxTokens).

**Files Modified**:

- `src/core/config/llm-config.service.ts`
- `src/core/llm/provider-registry.ts` (Ensured `getProviderFactory` is correctly implemented)

**Implementation Details**:

- Implemented the logic in `interactiveEditConfig` to:
  - Call `providerRegistry.getProviderFactory(selectedProviderName)`.
  - Create temporary config with selected provider and API key.
  - Call the factory with temporary config.
  - Call `listModels()` on the temporary provider instance.
  - Use models in the `inquirer` prompt.
- Addressed minor issues: kept unused `_config` param for backward compatibility, improved error messages, refined API key regex, added a comment about `maxTokens` configurability.

**Testing Requirements**:

- Unit tests updated/fixed in Subtask 5b.

**Acceptance Criteria**:

- [x] `interactiveEditConfig` correctly uses `getProviderFactory` to list models for the selected provider.
- [x] Temporary provider instantiation logic is correct and safe.
- [x] Related minor issues in `LLMConfigService` are addressed.

**Actual effort**: 30 minutes

**Deviations**:

- Kept the unused `_config` parameter for backward compatibility with existing tests.
- Added a comment about `maxTokens` configurability instead of making it fully configurable, as it may vary by provider and model.

---

### 5b. Fix and Update Tests for Config Service & Registry

**Status**: Completed

**Description**: Fixed broken tests and updated/expanded unit tests for `LLMConfigService` and `LLMProviderRegistry` to correctly cover the refactored dynamic model listing logic and address Code Review feedback.

**Files Modified**:

- `tests/core/config/llm-config.service.interactive-edit.test.ts`
- `tests/core/llm/provider-registry.test.ts`

**Implementation Details**:

- Fixed and updated tests in `llm-config.service.interactive-edit.test.ts` related to the dynamic model listing flow.
- Ensured tests correctly mock `getProviderFactory` and the temporary provider instantiation/`listModels` call.
- Verified scenarios where the selected provider differs from the default.
- Expanded `LLMProviderRegistry` tests to include multiple generic mock provider factories and test selection logic based on different configurations.
- Added tests for `getProviderFactory` method.
- Improved consistency with arrow functions in expect statements.
- Added tests for switching between providers and handling factory failures.
- Improved null checking with optional chaining operators.

**Testing Results**:

- All tests pass with high coverage for the refactored logic.

**Acceptance Criteria**:

- [x] Broken tests in `llm-config.service.interactive-edit.test.ts` are fixed and correctly validate the refactored logic.
- [x] Test coverage gaps identified in Code Review for `LLMConfigService` (dynamic listing) are addressed.
- [x] Test coverage gaps identified in Code Review for `LLMProviderRegistry` (multiple providers, generic mocks) are fully addressed.
- [x] All tests pass.

**Actual effort**: 45 minutes

**Deviations**:

- No significant deviations from the planned implementation.

---

### 5c. Address Minor Issues in `OpenRouterProvider`

**Status**: Completed

**Description**: Address the remaining minor issues in `OpenRouterProvider` and its tests as identified during Code Review.

**Files Modified**:

- `src/core/llm/providers/open-router-provider.ts`
- `tests/core/llm/providers/open-router-provider.test.ts`

**Implementation Details**:

- Aligned `listModels` error handling with `getCompletion` (use `LLMProviderError` directly).
- Added attribution headers (`HTTP-Referer`, `X-Title`) to `listModels` fetch request.
- Enhanced tests to assert `LLMProviderError` details for `listModels` errors.
- Added test cases for network errors (`fetch` rejection) for both `getCompletion` and `listModels`.

**Testing Results**:

- All minor issues are fixed and covered by tests.
- All tests pass.

**Acceptance Criteria**:

- [x] Minor error handling inconsistency in `listModels` is fixed.
- [x] Attribution headers are added to `listModels`.
- [x] Tests assert specific error details and cover network errors.
- [x] All tests pass.

**Actual effort**: 20 minutes

**Deviations**:

- Added network error test case for `getCompletion` in addition to `listModels` for consistency.

---

## 4. Implementation Sequence (Revised)

1. Complete Interactive LLM Configuration Flow - foundation for user experience and model selection. _(Completed)_
2. Implement and Complete OpenRouterProvider - enables OpenRouter usage. _(Completed)_
3. Register OpenRouterProvider in Provider Registry - integrates provider into system. _(Completed)_
4. Expand and Update Tests - ensures quality and correctness. _(Completed)_
5. Address Code Review Feedback:
   1. Complete Refactoring of `LLMConfigService.interactiveEditConfig` _(Completed)_
   2. **Fix and Update Tests for Config Service & Registry** _(Completed)_
   3. **Address Minor Issues in `OpenRouterProvider`** _(Completed)_

---

## 5. Next Steps

All subtasks (1-5, including 5a, 5b, and 5c) are now complete. The next step is to submit the entire implementation for a final Code Review to ensure all issues have been addressed and the implementation meets the project's quality standards.

---

## Code Review Findings

Review Date: 4/30/2025
Reviewer: Roo Code Reviewer

### Overall Assessment

**Status**: APPROVED

**Summary**:
The implementation successfully enhances the LLM configuration generator and integrates the OpenRouter provider. All critical, major, and minor issues identified in the previous review have been addressed. The code follows project standards, utilizes Dependency Injection and the Result pattern effectively, and includes comprehensive test coverage for the implemented features and fixes.

**Key Strengths**:

- Effective use of Dependency Injection across services and providers.
- Consistent application of the Result pattern for error handling.
- Well-structured OpenRouterProvider implementation with appropriate API interaction and error handling.
- Comprehensive test suite for LLMConfigService covering various scenarios, including dynamic model listing.
- Robust test coverage for the LLMProviderRegistry, including multiple providers and factory handling.
- Correct registration of the OpenRouter provider factory in the DI module and Provider Registry.
- Addressed minor issues in OpenRouterProvider implementation and tests.

**Critical Issues**:

- None. All critical issues from the previous review have been resolved.

### Subtask Reviews

#### Subtask 1: Complete Interactive LLM Configuration Flow

**Compliance**: ✅ Full
**Issues**: None. Previous critical and minor issues have been resolved.

#### Subtask 2: Implement and Complete OpenRouterProvider

**Compliance**: ✅ Full
**Issues**: None. Previous minor issues have been resolved.

#### Subtask 3: Register OpenRouterProvider in Provider Registry

**Compliance**: ✅ Full
**Issues**: None. Previous major test coverage gaps have been addressed.

#### Subtask 4: Expand and Update Tests

**Compliance**: ✅ Full
**Issues**: None. Previous major and minor test coverage gaps have been addressed.

#### Subtask 5a. Complete Refactoring of `LLMConfigService.interactiveEditConfig`

**Compliance**: ✅ Full
**Issues**: None. The critical logic error and related minor issues have been resolved.

#### Subtask 5b. Fix and Update Tests for Config Service & Registry

**Compliance**: ✅ Full
**Issues**: None. The broken tests and test coverage gaps have been fixed and addressed.

#### Subtask 5c. Address Minor Issues in `OpenRouterProvider`

**Compliance**: ✅ Full
**Issues**: None. The minor issues in the provider and its tests have been resolved.

### Manual Testing Results

Due to the limitations of the current environment, interactive manual testing of the CLI `config` command could not be performed. The review relied on code inspection and automated tests to verify the interactive flow logic. The comprehensive test suite provides high confidence in the correctness of the implementation.

### Memory Bank Update Recommendations

- The pattern for implementing LLM providers and integrating them into the DI container and Provider Registry should be documented in `memory-bank/DeveloperGuide.md`.
- The approach to interactive CLI configuration using `inquirer` and integrating it with services should be documented in `memory-bank/DeveloperGuide.md`.
