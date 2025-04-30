---
title: Implementation Plan - Fix Circular Dependency in DI Container
version: 3.0.0
lastUpdated: 2025-04-30
type: implementation-plan
category: bug-fix
status: pending
taskId: fix-circular-dependency
---

# Implementation Plan: Fix Circular Dependency in DI Container (v3)

## 1. Overview

This plan addresses the circular dependency error (`ApplicationContainer -> ILLMConfigService -> LLMProviderRegistry -> ILLMConfigService`) occurring during application startup. The root cause is the mutual dependency between `LLMConfigService` and `LLMProviderRegistry`.

**This revised plan introduces a new dedicated service, `ModelListerService`, to break the cycle while preserving the interactive model listing functionality.** It also includes a preliminary step to fix a blocking issue with the project's Jest test configuration.

See [[task-tracking/fix-circular-dependency/task-description.md]] for detailed requirements.

## 2. Implementation Strategy

### Approach

1.  **Fix Test Environment:** Resolve the Jest `moduleNameMapper` configuration issue, potentially related to Vite integration, to enable test execution.
2.  **Dependency Inversion via New Service:** Introduce `IModelListerService` and `ModelListerService` to handle model listing, breaking the direct dependency cycle.
3.  **Integrate New Service:** Update `LLMConfigService` to use the new service.
4.  **Implement & Verify Tests:** Create tests for the new service and update tests for the modified service, ensuring they pass in the fixed environment.

### Key Components

- **New Files**:
  - `src/core/llm/model-lister.service.ts`
  - `tests/core/llm/model-lister.service.test.ts`
- **Modified Files**:
  - `jest.config.js` (or related test config files)
  - `vite.config.ts` (potentially)
  - `src/core/llm/interfaces.ts`
  - `src/core/config/llm-config.service.ts`
  - `src/core/di/modules/llm-module.ts`
  - `tests/core/config/llm-config.service.interactive-edit.test.ts`
- **Affected Areas**:
  - Project test execution environment.
  - DI container initialization.
  - `config` command's interactive mode.
  - LLM module structure.
- **Dependencies**: See individual subtasks.
- **Risk Areas**:
  - Complexity of fixing the Jest/Vite configuration interaction.
  - Ensuring the fix doesn't break other parts of the build or test setup.
  - Correct implementation and testing of the new service and its integration.

## 3. Implementation Subtasks with Progress Tracking

### Subtask 0: Fix Jest Configuration Issue (High Priority)

**Status**: Completed

**Description**: Investigate and resolve the Jest configuration issue (likely related to `moduleNameMapper` and potentially Vite integration) that is preventing tests from running correctly.

**Files to Modify**:

- `jest.config.js`
- Potentially `tsconfig.json` (paths aliases)
- Potentially `vite.config.ts` (if conflicting)
- Any other relevant configuration files.

**Implementation Details**: - Analyze the error message related to `moduleNameMapper`. - Review the path aliases defined in `tsconfig.json`. - Ensure `jest.config.js`'s `moduleNameMapper` correctly maps these aliases for the test environment. - Investigate potential conflicts or necessary configurations related to the Vite setup. - The goal is to allow `npm test` (or specific test file execution) to run without module resolution errors.

**Testing Requirements**: - Run `npm test` or `npm test -- <some_existing_test_file>.test.ts` and confirm that module resolution errors are gone and tests can execute (they might still fail due to code issues, but the environment should work).

**Acceptance Criteria**:

- [x] Jest `moduleNameMapper` configuration is corrected.
- [x] Path aliases used in the source code resolve correctly during test execution.
- [x] `npm test` can be initiated without throwing module resolution errors related to path mapping.

**Estimated effort**: 30-60 minutes (Investigation required)

---

### Subtask 1: Define `IModelListerService` Interface

**Status**: Completed

**Description**: Define the interface for the new service responsible for listing models.
**Files to Modify**: `src/core/llm/interfaces.ts`
**Acceptance Criteria**:

- [x] `IModelListerService` interface is defined in `src/core/llm/interfaces.ts`.
- [x] The interface includes the `listModelsForProvider` method with the correct signature.
      **Estimated effort**: 5 minutes

### Subtask 2: Implement `ModelListerService`

**Status**: Completed

**Description**: Create the concrete implementation of `IModelListerService`.
**Files to Create/Modify**: `src/core/llm/model-lister.service.ts` (New File)
**Acceptance Criteria**:

- [x] `ModelListerService` class is created in `src/core/llm/model-lister.service.ts`.
- [x] The class implements `IModelListerService`.
- [x] Dependencies (`ILLMProviderFactories`, `ILogger`) are injected correctly.
- [x] `listModelsForProvider` method correctly implements the model listing logic.
- [x] Error conditions are handled.
      **Estimated effort**: 25 minutes

### Subtask 3: Register `ModelListerService` in DI Container

**Status**: Completed

**Description**: Register the new service and its interface with the DI container.
**Files to Modify**: `src/core/di/modules/llm-module.ts`
**Acceptance Criteria**:

- [x] `IModelListerService` is registered in `llm-module.ts`.
- [x] The registration maps the interface token to the `ModelListerService` class using an appropriate method (e.g., `registerFactory`).
      **Estimated effort**: 5 minutes

### Subtask 4: Modify `LLMConfigService` to Use `IModelListerService`

**Status**: Completed

**Description**: Update `LLMConfigService` to remove the old dependency and use the new `IModelListerService`.
**Files to Modify**: `src/core/config/llm-config.service.ts`
**Acceptance Criteria**:

- [x] `ILLMProviderRegistry` is no longer injected into `LLMConfigService`.
- [x] `IModelListerService` is injected into `LLMConfigService`.
- [x] `listAndSelectModel` method is removed.
- [x] `interactiveEditConfig` uses `IModelListerService` correctly.
- [x] Application builds successfully.
      **Estimated effort**: 20 minutes

### Subtask 5: Create Unit Tests for `ModelListerService`

**Status**: Blocked (Pending Subtask 0)

**Description**: Create comprehensive unit tests for the new `ModelListerService`.
**Files to Create/Modify**: `tests/core/llm/model-lister.service.test.ts` (New File)
**Acceptance Criteria**:

- [x] Unit tests for `ModelListerService` are created.
- [x] Tests cover success and failure scenarios for model listing.
- [x] Tests verify interactions with dependencies.
- [ ] All tests in the new file pass (Blocked by Subtask 0).
      **Estimated effort**: 25 minutes

### Subtask 6: Update `LLMConfigService` Tests

**Status**: Blocked (Pending Subtask 0)

**Description**: Update the unit tests for `LLMConfigService` interactive editing to reflect the use of `IModelListerService`.
**Files to Modify**: `tests/core/config/llm-config.service.interactive-edit.test.ts`
**Acceptance Criteria**:

- [ ] Tests in `llm-config.service.interactive-edit.test.ts` mock `IModelListerService`.
- [ ] Tests verify the correct flow within `interactiveEditConfig`.
- [ ] All tests related to `LLMConfigService` pass (Blocked by Subtask 0).
- [ ] All project tests pass (`npm test`) (Blocked by Subtask 0).
      **Estimated effort**: 20 minutes

## 4. Implementation Sequence

1.  **Subtask 0: Fix Jest Configuration Issue** - Unblock test execution environment.
2.  **Subtask 1: Define `IModelListerService` Interface** - (Already Completed)
3.  **Subtask 2: Implement `ModelListerService`** - (Already Completed)
4.  **Subtask 3: Register `ModelListerService` in DI Container** - (Already Completed)
5.  **Subtask 4: Modify `LLMConfigService` to Use `IModelListerService`** - (Already Completed)
6.  **Subtask 5: Create Unit Tests for `ModelListerService`** - Verify the new service (Requires Subtask 0).
7.  **Subtask 6: Update `LLMConfigService` Tests** - Verify the integration and updated logic (Requires Subtask 0).

## 5. Technical Considerations

### Architecture Impact

- Introduction of `ModelListerService` improves separation of concerns.
- Resolves the circular dependency.
- Requires ensuring test environment configuration (Jest/Vite) is correct.

### Testing Approach

- **Unit Tests:** Blocked until Jest configuration is fixed. Once fixed, dedicated tests for `ModelListerService` and updated tests for `LLMConfigService` are required.
- **Integration Tests:** Will rely on the DI container initializing correctly, which this task aims to fix. Also blocked until Jest config is fixed.
- **Manual Tests:** Manually run `npm run start -- config` to verify interactive flow. Run `npm run build` to verify build success.

## 6. Documentation Update Needs

- Architectural documentation ([[TechnicalArchitecture.md]]) might need an update for `ModelListerService`. (Post-implementation)

## 7. Verification Checklist

- [x] Task Description reviewed.
- [x] Codebase analyzed.
- [x] Dependencies confirmed.
- [x] Solution revised: Introduce `ModelListerService`.
- [x] **Blocker Identified:** Jest configuration issue prevents test execution.
- [x] **New Subtask Added:** Subtask 0 created to fix Jest configuration.
- [x] Subtasks defined & sequenced (including blocker).
- [x] Testing strategy outlined (acknowledging blocker).
- [x] Documentation needs identified.
