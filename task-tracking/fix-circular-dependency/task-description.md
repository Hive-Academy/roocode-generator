---
title: Fix Circular Dependency in DI Container
version: 1.0.0
lastUpdated: 2025-04-30
type: task-description
category: bug-fix
status: open
priority: high
---

# Task Description: Fix Circular Dependency in DI Container

## 1. Overview

A circular dependency has been detected in the Dependency Injection (DI) container during application startup. This prevents the application from initializing correctly. The dependency chain identified in the error message is `ApplicationContainer -> ILLMConfigService -> LLMProviderRegistry -> ILLMConfigService`.

This task requires analyzing the DI setup for the involved components, identifying the root cause of the circular dependency, and implementing a solution to break the cycle.

## 2. Problem Details

The application fails to start with the following error:

```
DI Resolution Error for token 'ApplicationContainer': CircularDependencyError: Circular dependency detected: ApplicationContainer -> ILLMConfigService -> LLMProviderRegistry -> ILLMConfigService
    at Container.checkCircularDependency (D:\projects\roocode-generator\dist\roocode-generator.js:408:13)
    at Container.resolve (D:\projects\roocode-generator\dist\roocode-generator.js:312:12)
    at resolveDependency (D:\projects\roocode-generator\dist\roocode-generator.js:31:28)
    at Object.factory (D:\projects\roocode-generator\dist\roocode-generator.js:2977:27)
    at Container.resolveInstance (D:\projects\roocode-generator\dist\roocode-generator.js:353:36)
    at Container.resolve (D:\projects\roocode-generator\dist\roocode-generator.js:319:31)
    at resolveDependency (D:\projects\roocode-generator\dist\roocode-generator.js:31:28)
    at Object.factory (D:\projects\roocode-generator\dist\roocode-generator.js:2999:30)
    at Container.resolveInstance (D:\projects\roocode-generator\dist\roocode-generator.js:353:36)
    at Container.resolve (D:\projects\roocode-generator\dist\roocode-generator.js:319:31) {
  code: 'CIRCULAR_DEPENDENCY_ERROR',
  dependencyChain: [
    'ApplicationContainer',
    'ILLMConfigService',
    'LLMProviderRegistry',
    'ILLMConfigService'
  ]
}
Fatal error: Circular dependency detected: ApplicationContainer -> ILLMConfigService -> LLMProviderRegistry -> ILLMConfigService
```

The components involved are:

- `ApplicationContainer` (`src/core/application/application-container.ts`)
- `ILLMConfigService` (`src/core/config/llm-config.service.ts`)
- `LLMProviderRegistry` (`src/core/llm/provider-registry.ts`)

The issue lies in how these services are defined and registered within the custom DI container, creating a loop in their dependencies that prevents successful instantiation.

## 3. Functional Requirements

- The application must start without encountering a circular dependency error.
- The core functionality that relies on `ApplicationContainer`, `ILLMConfigService`, and `LLMProviderRegistry` (e.g., LLM configuration loading, LLM provider resolution) must remain functional.

## 4. Technical Requirements

- Identify the specific dependency or dependencies causing the circular reference between `ApplicationContainer`, `ILLMConfigService`, and `LLMProviderRegistry`.
- Modify the service definitions (constructors, `@Inject` decorators) or the DI registration logic (`src/core/di/modules/llm-module.ts`, `src/core/di/modules/app-module.ts`, `src/core/di/registrations.ts`) to break the circular dependency.
- The solution should adhere to the project's DI patterns (modular registration, use of `@Injectable`, `@Inject`, `registerFactory`, `registerSingleton`).
- Ensure the fix does not introduce new circular dependencies or break existing functionality.
- Update relevant tests or add new tests to cover the changes to the DI setup and service dependencies.

## 5. Scope

- **In Scope:** Analysis of `ApplicationContainer`, `ILLMConfigService`, `LLMProviderRegistry`, and relevant DI registration files (`src/core/di/modules/llm-module.ts`, `src/core/di/modules/app-module.ts`, `src/core/di/registrations.ts`). Modification of these files to resolve the circular dependency. Updating related tests.
- **Out of Scope:** Implementing new features. Refactoring unrelated parts of the application.

## 6. Success Criteria

- The application builds and runs without the circular dependency error.
- Existing unit and integration tests related to the involved components and DI setup pass.
- The fix is implemented in a way that aligns with the project's architectural principles and DI patterns.

## 7. Relevant Documentation

- [[TechnicalArchitecture#System-Design]] (Describes application flow and DI initialization)
- [[TechnicalArchitecture#Core-Components]] (Details on ApplicationContainer, LLMConfigService, LLMProviderRegistry, DI)
- [[DeveloperGuide#Modular-DI-Registration-Pattern]] (Guidelines on DI registration)
- [[DeveloperGuide#Quality-and-Testing]] (Testing guidelines)

## 8. Task Checklist

- [ ] Analyze dependencies of `ApplicationContainer`, `ILLMConfigService`, and `LLMProviderRegistry`.
- [ ] Review DI registration in `llm-module.ts`, `app-module.ts`, and `registrations.ts`.
- [ ] Identify the circular dependency path in the code/registration.
- [ ] Determine the best approach to break the cycle (e.g., refactor dependencies, use factories differently, lazy load).
- [ ] Implement the chosen solution.
- [ ] Run `npm run build` to verify the fix resolves the DI error.
- [ ] Run `npm test` to ensure existing tests pass.
- [ ] Add/update tests for the modified components/DI setup.
- [ ] Ensure code adheres to project standards (linting, formatting).
- [ ] Document the solution in the implementation plan.
