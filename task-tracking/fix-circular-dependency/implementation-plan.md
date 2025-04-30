---
title: Implementation Plan - Fix Circular Dependency in DI Container
version: 4.0.0
lastUpdated: 2025-04-30
type: implementation-plan
category: bug-fix
status: pending
taskId: fix-circular-dependency
---

# Implementation Plan: Fix Circular Dependency in DI Container (v4)

## 1. Overview

This plan addresses the circular dependency error (`ApplicationContainer -> ILLMConfigService -> LLMProviderRegistry -> ILLMConfigService`) occurring during application startup. The root cause is the mutual dependency between `LLMConfigService` and `LLMProviderRegistry`.

**This revised plan introduces a new dedicated service, `ModelListerService`, to break the cycle while preserving the interactive model listing functionality.** It also includes a preliminary step to fix a blocking issue with the project's Jest test configuration and ensures all tests for the modified `LLMConfigService` are updated.

See [[task-tracking/fix-circular-dependency/task-description.md]] for detailed requirements.

## 2. Implementation Strategy

### Approach

1.  **Fix Test Environment:** Resolve the Jest `moduleNameMapper` configuration issue.
2.  **Dependency Inversion via New Service:** Introduce `IModelListerService` and `ModelListerService`.
3.  **Integrate New Service:** Update `LLMConfigService` to use the new service.
4.  **Implement & Verify Tests:** Create tests for the new service and update _all_ tests for the modified `LLMConfigService`, ensuring they pass.

### Key Components

- **New Files**:
  - `src/core/llm/model-lister.service.ts`
  - `tests/core/llm/model-lister.service.test.ts`
- **Modified Files**:
  - `jest.config.js`
  - `src/core/llm/interfaces.ts`
  - `src/core/config/llm-config.service.ts`
  - `src/core/di/modules/llm-module.ts`
  - `tests/core/config/llm-config.service.interactive-edit.test.ts`
  - `tests/core/config/llm-config.service.test.ts`
- **Affected Areas**:
  - Project test execution environment.
  - DI container initialization.
  - `config` command's interactive mode.
  - LLM module structure.
  - `LLMConfigService` unit tests.
- **Dependencies**: See individual subtasks.
- **Risk Areas**: Ensuring all `LLMConfigService` tests are correctly updated for the new dependency.

## 3. Implementation Subtasks with Progress Tracking

### Subtask 0: Fix Jest Configuration Issue (High Priority)

**Status**: Completed
**Description**: Investigate and resolve the Jest configuration issue preventing tests from running correctly.
**Files to Modify**: `jest.config.js`, potentially others.
**Acceptance Criteria**:

- [x] Jest `moduleNameMapper` configuration is corrected.
- [x] Path aliases resolve correctly during test execution.
- [x] `npm test` can be initiated without module resolution errors.
      **Estimated effort**: 30-60 minutes

---

### Subtask 1: Define `IModelListerService` Interface

**Status**: Completed
**Description**: Define the interface for the new service responsible for listing models.
**Files to Modify**: `src/core/llm/interfaces.ts`
**Acceptance Criteria**:

- [x] `IModelListerService` interface is defined.
- [x] Interface includes `listModelsForProvider` method.
      **Estimated effort**: 5 minutes

### Subtask 2: Implement `ModelListerService`

**Status**: Completed
**Description**: Create the concrete implementation of `IModelListerService`.
**Files to Create/Modify**: `src/core/llm/model-lister.service.ts`
**Acceptance Criteria**:

- [x] `ModelListerService` class created and implements interface.
- [x] Dependencies injected correctly.
- [x] `listModelsForProvider` method implemented correctly.
- [x] Error conditions handled.
      **Estimated effort**: 25 minutes

### Subtask 3: Register `ModelListerService` in DI Container

**Status**: Completed
**Description**: Register the new service and its interface with the DI container.
**Files to Modify**: `src/core/di/modules/llm-module.ts`
**Acceptance Criteria**:

- [x] `IModelListerService` registered in `llm-module.ts`.
- [x] Registration uses correct token and implementation class/factory.
      **Estimated effort**: 5 minutes

### Subtask 4: Modify `LLMConfigService` to Use `IModelListerService`

**Status**: Completed
**Description**: Update `LLMConfigService` to remove the old dependency and use the new `IModelListerService`.
**Files to Modify**: `src/core/config/llm-config.service.ts`
**Acceptance Criteria**:

- [x] `ILLMProviderRegistry` dependency removed.
- [x] `IModelListerService` dependency added.
- [x] `listAndSelectModel` method removed.
- [x] `interactiveEditConfig` uses `IModelListerService` correctly.
- [x] Application builds successfully.
      **Estimated effort**: 20 minutes

### Subtask 5: Create Unit Tests for `ModelListerService`

**Status**: Completed
**Description**: Create comprehensive unit tests for the new `ModelListerService`.
**Files to Create/Modify**: `tests/core/llm/model-lister.service.test.ts`
**Acceptance Criteria**:

- [x] Unit tests for `ModelListerService` created.
- [x] Tests cover success and failure scenarios.
- [x] Tests verify interactions with dependencies.
- [x] All tests in `model-lister.service.test.ts` pass.
      **Estimated effort**: 25 minutes

### Subtask 6: Update `LLMConfigService` Interactive Edit Tests

**Status**: Completed
**Description**: Update the unit tests for `LLMConfigService` interactive editing (`interactive-edit.test.ts`) to reflect the use of `IModelListerService`.
**Files to Modify**: `tests/core/config/llm-config.service.interactive-edit.test.ts`
**Acceptance Criteria**:

- [x] Tests in `llm-config.service.interactive-edit.test.ts` mock `IModelListerService`.
- [x] Tests verify the correct flow within `interactiveEditConfig`.
- [x] All tests in `llm-config.service.interactive-edit.test.ts` pass.
      **Estimated effort**: 20 minutes

### Subtask 7: Update Remaining `LLMConfigService` Tests

**Status**: Completed
**Description**: Update the remaining unit tests for `LLMConfigService` (in `llm-config.service.test.ts`) to correctly mock the new `IModelListerService` dependency introduced in the constructor.
**Files to Modify**: `tests/core/config/llm-config.service.test.ts`
**Implementation Details**: - Identify tests in this file that instantiate `LLMConfigService`. - Update the instantiation logic to provide a mock for `IModelListerService` (the fourth constructor argument). A simple mock object `{ listModelsForProvider: jest.fn() }` might suffice for tests not directly exercising the interactive edit flow. - Ensure the mocks for other dependencies (`IFileOperations`, `ILogger`, `Inquirer`) are still correctly provided.
**Testing Requirements**: - Ensure all tests in `tests/core/config/llm-config.service.test.ts` pass after the changes. - Run `npm test` to verify all project tests pass.
**Acceptance Criteria**:

- [x] Tests in `llm-config.service.test.ts` are updated to mock `IModelListerService`.
- [x] All tests in `llm-config.service.test.ts` pass.
- [ ] All project tests pass (`npm test`).
      **Estimated effort**: 15 minutes

## 4. Implementation Sequence

1.  **Subtask 0: Fix Jest Configuration Issue** (Completed)
2.  **Subtask 1: Define `IModelListerService` Interface** (Completed)
3.  **Subtask 2: Implement `ModelListerService`** (Completed)
4.  **Subtask 3: Register `ModelListerService` in DI Container** (Completed)
5.  **Subtask 4: Modify `LLMConfigService` to Use `IModelListerService`** (Completed)
6.  **Subtask 5: Create Unit Tests for `ModelListerService`** (Completed)
7.  **Subtask 6: Update `LLMConfigService` Interactive Edit Tests** (Completed)
8.  **Subtask 7: Update Remaining `LLMConfigService` Tests** - Ensure full test coverage for the modified service.

## 5. Technical Considerations

### Architecture Impact

- Introduction of `ModelListerService` improves separation of concerns.
- Resolves the circular dependency.
- Test environment configuration confirmed working.

### Testing Approach

- Unit tests cover the new service (`ModelListerService`).
- Unit tests cover the modified service (`LLMConfigService`), including interactive and non-interactive parts.
- Full project test suite (`npm test`) should pass upon completion of Subtask 7.

## 6. Documentation Update Needs

- Architectural documentation ([[TechnicalArchitecture.md]]) might need an update for `ModelListerService`. (Post-implementation)

## 7. Verification Checklist

- [x] Task Description reviewed.
- [x] Codebase analyzed.
- [x] Dependencies confirmed.
- [x] Solution revised: Introduce `ModelListerService`.
- [x] Blocker Identified & Resolved: Jest configuration issue fixed (Subtask 0).
- [x] New Subtask Added: Subtask 7 added to update remaining `LLMConfigService` tests.
- [x] Subtasks defined & sequenced.
- [x] Testing strategy outlined.
- [x] Documentation needs identified.
