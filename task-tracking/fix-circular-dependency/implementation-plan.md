---
title: Implementation Plan - Fix Circular Dependency in DI Container
version: 2.0.0
lastUpdated: 2025-04-30
type: implementation-plan
category: bug-fix
status: pending
taskId: fix-circular-dependency
---

# Implementation Plan: Fix Circular Dependency in DI Container (v2)

## 1. Overview

This plan addresses the circular dependency error (`ApplicationContainer -> ILLMConfigService -> LLMProviderRegistry -> ILLMConfigService`) occurring during application startup. The root cause is the mutual dependency between `LLMConfigService` and `LLMProviderRegistry`. `LLMConfigService` previously used the registry for dynamic model listing during interactive configuration, while `LLMProviderRegistry` uses the config service to load settings for provider instantiation.

The initial plan proposed removing the dynamic model listing feature, which was deemed undesirable. **This revised plan introduces a new dedicated service, `ModelListerService`, to break the cycle while preserving the interactive model listing functionality.** This service will encapsulate the logic for listing models based on provider factories, removing the need for `LLMConfigService` to depend directly on `LLMProviderRegistry`.

See [[task-tracking/fix-circular-dependency/task-description.md]] for detailed requirements.

## 2. Implementation Strategy

### Approach

The core strategy is **Dependency Inversion via New Service**. We will introduce `IModelListerService` and its implementation `ModelListerService` to handle model listing, breaking the direct dependency cycle.

1.  **Define Interface:** Create `IModelListerService` in `src/core/llm/interfaces.ts` defining a method like `listModelsForProvider(providerName: string, apiKey: string): Promise<Result<string[], Error>>`.
2.  **Implement Service:** Create `ModelListerService` in `src/core/llm/model-lister.service.ts`. This service will inject `ILLMProviderFactories` (the map of provider factory functions) and `ILogger`. It will contain the logic previously in `LLMConfigService.listAndSelectModel` to instantiate a temporary provider using the factory and call its `listModels` method.
3.  **Register Service:** Register `IModelListerService` and `ModelListerService` as a singleton in the DI container, likely within `src/core/di/modules/llm-module.ts`.
4.  **Modify `LLMConfigService`:**
    - Remove the `ILLMProviderRegistry` dependency from the constructor.
    - Inject the new `IModelListerService`.
    - Remove the old `listAndSelectModel` helper method.
    - Update the `interactiveEditConfig` method to call the `listModelsForProvider` method from the injected `IModelListerService`.
5.  **Update Tests:**
    - Create unit tests for the new `ModelListerService`.
    - Adjust unit tests for `LLMConfigService` (`interactive-edit.test.ts`) to mock `IModelListerService` and verify its usage.
6.  **Verify:** Build the application and run tests to confirm the circular dependency error is resolved, the interactive model listing works, and no regressions were introduced.

### Key Components

- **New Files**:
  - `src/core/llm/model-lister.service.ts`
  - `tests/core/llm/model-lister.service.test.ts`
- **Modified Files**:
  - `src/core/llm/interfaces.ts` (add `IModelListerService`)
  - `src/core/config/llm-config.service.ts`
  - `src/core/di/modules/llm-module.ts`
  - `tests/core/config/llm-config.service.interactive-edit.test.ts`
- **Affected Areas**:
  - DI container initialization.
  - `config` command's interactive mode (functionality preserved).
  - LLM module structure (new service added).
- **Dependencies**:
  - `ModelListerService` depends on `ILLMProviderFactories`, `ILogger`.
  - `LLMConfigService` depends on `IModelListerService` (instead of `ILLMProviderRegistry`).
  - `LLMProviderRegistry` still depends on `ILLMConfigService`. The cycle is broken because `LLMConfigService` no longer depends back on `LLMProviderRegistry`.
- **Risk Areas**:
  - Correct implementation of `ModelListerService` logic.
  - Correct DI registration and injection of the new service.
  - Ensuring tests adequately cover the new service and the modified `LLMConfigService`.

## 3. Implementation Subtasks with Progress Tracking

### Subtask 1: Define `IModelListerService` Interface

**Status**: Completed

**Description**: Define the interface for the new service responsible for listing models.

**Files to Modify**:

- `src/core/llm/interfaces.ts`:
  - Add the `IModelListerService` interface with a method signature like:
  ```typescript
  export interface IModelListerService {
    listModelsForProvider(providerName: string, apiKey: string): Promise<Result<string[], Error>>;
  }
  ```

**Implementation Details**: Ensure the interface clearly defines the contract for listing models based on provider name and API key.

**Testing Requirements**: N/A (Interface definition only).

**Acceptance Criteria**:

- [x] `IModelListerService` interface is defined in `src/core/llm/interfaces.ts`.
- [x] The interface includes the `listModelsForProvider` method with the correct signature.

**Estimated effort**: 5 minutes

### Subtask 2: Implement `ModelListerService`

**Status**: Completed

**Description**: Create the concrete implementation of `IModelListerService`.

**Files to Create/Modify**:

- `src/core/llm/model-lister.service.ts` (New File):
  - Create the `ModelListerService` class implementing `IModelListerService`.
  - Inject `ILLMProviderFactories` (token: `'ILLMProviderFactories'`) and `ILogger` (token: `'ILogger'`) via the constructor.
  - Implement the `listModelsForProvider` method. This method should:
    - Get the appropriate factory from the injected `providerFactories` map based on `providerName`.
    - Handle cases where the factory is not found.
    - Create a temporary `LLMConfig` object using the provided `apiKey` and a placeholder model name.
    - Call the factory with the temporary config to get a temporary provider instance.
    - Handle errors during provider creation.
    - Check if the provider instance has a `listModels` method.
    - Call the provider's `listModels` method.
    - Return the result (list of model names or an error).
    - Include logging for warnings and errors.
  - Add `@Injectable()` decorator.

**Implementation Details**: Port the logic from the old `LLMConfigService.listAndSelectModel` method related to factory lookup, temporary provider creation, and calling `listModels`. Ensure proper error handling and logging.

**Testing Requirements**: Unit tests will be created in Subtask 4.

**Acceptance Criteria**:

- [x] `ModelListerService` class is created in `src/core/llm/model-lister.service.ts`.
- [x] The class implements `IModelListerService`.
- [x] Dependencies (`ILLMProviderFactories`, `ILogger`) are injected correctly.
- [x] `listModelsForProvider` method correctly implements the model listing logic.
- [x] Error conditions (factory not found, provider creation fails, `listModels` not supported/fails) are handled.

**Estimated effort**: 25 minutes

### Subtask 3: Register `ModelListerService` in DI Container

**Status**: Completed

**Description**: Register the new service and its interface with the DI container.

**Files to Modify**:

- `src/core/di/modules/llm-module.ts`:
  - Import `IModelListerService` and `ModelListerService`.
  - Add a registration for the service as a singleton:
  ```typescript
  container.registerSingleton<IModelListerService>('IModelListerService', ModelListerService);
  ```

**Implementation Details**: Ensure the registration uses the correct interface token (`'IModelListerService'`) and implementation class.

**Testing Requirements**: DI initialization will be verified implicitly by running the application and tests later.

**Acceptance Criteria**:

- [x] `IModelListerService` is registered in `llm-module.ts`.
- [x] The registration maps the interface token to the `ModelListerService` class.

**Estimated effort**: 5 minutes

### Subtask 4: Modify `LLMConfigService` to Use `IModelListerService`

**Status**: Not Started

**Description**: Update `LLMConfigService` to remove the old dependency and use the new `IModelListerService`.

**Files to Modify**:

- `src/core/config/llm-config.service.ts`:
  - Remove the `@Inject('ILLMProviderRegistry')` parameter from the constructor.
  - Add an `@Inject('IModelListerService')` parameter for `IModelListerService` to the constructor and assign it to a private readonly property (e.g., `modelListerService`).
  - Remove the `private async listAndSelectModel(...)` method entirely.
  - In `interactiveEditConfig`, replace the block that called `listAndSelectModel` and `promptForModelName` with logic that:
    - Calls `this.modelListerService.listModelsForProvider(providerName, apiKey)`.
    - If the call is successful and returns models, use `inquirer` to prompt the user to select from the list.
    - If the call fails or returns no models (log a warning), fall back to calling `this.promptForModelName(providerName)`.
  - Update imports (remove `ILLMProviderRegistry`, add `IModelListerService`).

**Implementation Details**: Ensure the dependency swap is done correctly in the constructor. The logic in `interactiveEditConfig` should now delegate model listing to the new service and handle both success (prompt with list) and failure/empty list (fallback to manual input) scenarios.

**Testing Requirements**: Unit tests updated in Subtask 5. Manual test: `npm run start -- config` should show model list when possible, otherwise prompt for manual input. Build should pass (`npm run build`).

**Acceptance Criteria**:

- [ ] `ILLMProviderRegistry` is no longer injected into `LLMConfigService`.
- [ ] `IModelListerService` is injected into `LLMConfigService`.
- [ ] `listAndSelectModel` method is removed.
- [ ] `interactiveEditConfig` uses `IModelListerService` to attempt model listing and falls back to `promptForModelName` correctly.
- [ ] Application builds successfully.

**Estimated effort**: 20 minutes

### Subtask 5: Create Unit Tests for `ModelListerService`

**Status**: Not Started

**Description**: Create comprehensive unit tests for the new `ModelListerService`.

**Files to Create/Modify**:

- `tests/core/llm/model-lister.service.test.ts` (New File):
  - Set up mocks for dependencies (`ILLMProviderFactories`, `ILogger`, temporary provider instances, provider `listModels` method).
  - Test the `listModelsForProvider` method for various scenarios:
    - Successful model listing.
    - Provider factory not found.
    - Provider factory fails to create instance.
    - Provider instance does not support `listModels`.
    - Provider's `listModels` method returns an error.
    - Provider's `listModels` method returns an empty list.
  - Verify correct interaction with mocks (factory lookup, provider creation, `listModels` call).
  - Verify correct logging calls for warnings/errors.

**Implementation Details**: Ensure thorough coverage of success and failure paths within the `listModelsForProvider` logic.

**Testing Requirements**: Run `npm test -- model-lister.service.test.ts`.

**Acceptance Criteria**:

- [ ] Unit tests for `ModelListerService` are created.
- [ ] Tests cover success and failure scenarios for model listing.
- [ ] Tests verify interactions with dependencies.
- [ ] All tests in the new file pass.

**Estimated effort**: 25 minutes

### Subtask 6: Update `LLMConfigService` Tests

**Status**: Not Started

**Description**: Update the unit tests for `LLMConfigService` interactive editing to reflect the use of `IModelListerService`.

**Files to Modify**:

- `tests/core/config/llm-config.service.interactive-edit.test.ts`:
  - Remove mocks related to `ILLMProviderRegistry`.
  - Add mocks for `IModelListerService` and its `listModelsForProvider` method.
  - Update test cases to verify that `interactiveEditConfig`:
    - Calls `modelListerService.listModelsForProvider`.
    - Correctly uses `inquirer` with the returned list when models are available.
    - Correctly calls `promptForModelName` when `listModelsForProvider` fails or returns no models.
  - Ensure tests still cover other parts of the interactive flow (provider prompt, API key prompt, advanced config).

**Implementation Details**: Focus on mocking the new service dependency and verifying the conditional logic within `interactiveEditConfig` based on the outcome of the model listing attempt.

**Testing Requirements**:

- Run `npm test -- llm-config.service.interactive-edit.test.ts` to verify the specific test file passes.
- Run `npm test` to ensure all project tests pass.

**Acceptance Criteria**:

- [ ] Tests in `llm-config.service.interactive-edit.test.ts` mock `IModelListerService`.
- [ ] Tests verify the correct flow within `interactiveEditConfig` based on `listModelsForProvider` results (list prompt vs. manual input).
- [ ] All tests related to `LLMConfigService` pass.
- [ ] All project tests pass (`npm test`).

**Estimated effort**: 20 minutes

## 4. Implementation Sequence

1.  **Subtask 1: Define `IModelListerService` Interface** - Establish the contract.
2.  **Subtask 2: Implement `ModelListerService`** - Create the core logic.
3.  **Subtask 3: Register `ModelListerService` in DI Container** - Make the service available.
4.  **Subtask 4: Modify `LLMConfigService` to Use `IModelListerService`** - Integrate the new service and remove the old dependency.
5.  **Subtask 5: Create Unit Tests for `ModelListerService`** - Verify the new service.
6.  **Subtask 6: Update `LLMConfigService` Tests** - Verify the integration and updated logic.

## 5. Technical Considerations

### Architecture Impact

- Introduces a new service (`ModelListerService`) dedicated to a specific concern (model listing), improving separation of concerns within the LLM module.
- Resolves the circular dependency by breaking the direct link between `LLMConfigService` and `LLMProviderRegistry`.
- Maintains adherence to DI principles with explicit constructor injection.
- The overall architecture becomes slightly more complex with the addition of a new service, but significantly more robust regarding DI initialization.
- See [[TechnicalArchitecture#Core-Components]] for component details.

### Testing Approach

- **Unit Tests:** Dedicated tests for `ModelListerService` are crucial. Tests for `LLMConfigService` need to verify the interaction with the mocked `IModelListerService`.
- **Integration Tests:** Existing tests relying on DI initialization should now pass. Tests involving the `config` command implicitly test the integration.
- **Manual Tests:** Manually run `npm run start -- config` to verify the interactive model listing works as expected (shows list or prompts for manual input).
- See [[DeveloperGuide#Quality-and-Testing]] for testing guidelines.

## 6. Documentation Update Needs

- Architectural documentation ([[TechnicalArchitecture.md]]) might need an update to include the new `ModelListerService` and illustrate the revised dependency graph for the LLM/Config components. This will be handled by Boomerang post-implementation.

## 7. Verification Checklist

- [x] Task Description reviewed: `task-tracking/fix-circular-dependency/task-description.md`
- [x] Codebase analyzed: `ApplicationContainer`, `LLMConfigService`, `LLMProviderRegistry` constructors and relevant methods reviewed.
- [x] Dependencies confirmed: Circular dependency path verified.
- [x] **Solution revised:** Introduce `ModelListerService` to break cycle and preserve functionality.
- [x] Subtasks defined: Clear steps for interface, implementation, registration, integration, and testing.
- [x] Implementation sequence defined.
- [x] Testing strategy outlined.
- [x] Documentation needs identified.
