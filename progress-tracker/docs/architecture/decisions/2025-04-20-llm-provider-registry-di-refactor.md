# Architectural Decision Record: Refactor LLM Provider Registry and DI Registrations

## Status

Proposed

## Context

The project uses a custom dependency injection (DI) container (`./container.ts`) that supports singleton and factory registrations keyed by unique tokens. It does not support multi-injection or multiple registrations under the same token.

Currently, `src/core/llm/provider-registry.ts` uses `inversify` decorators and multi-injection to collect all LLM providers registered under the same token `"ILLMProvider"`. This causes TypeScript errors and runtime issues because the custom container does not support this pattern.

In `src/core/di/registrations.ts`, multiple LLM providers are registered under the same token `"ILLMProvider"`, which is incompatible with the container's unique token requirement. The `LLMProviderRegistry` is registered as a singleton but depends on inversify multi-injection, causing further errors.

## Decision

1. **Refactor `LLMProviderRegistry` to remove inversify dependencies:**

   - Remove all `inversify` imports and decorators.
   - Change the constructor to accept an explicit array of `ILLMProvider` instances.
   - Internally store providers in a Map keyed by provider name.
   - Provide a method to get a provider by name.

2. **Change DI registrations in `registrations.ts`:**

   - Register each LLM provider under a unique token, e.g., `"ILLMProvider.OpenAI"`, `"ILLMProvider.GoogleGenAI"`, `"ILLMProvider.Anthropic"`.
   - After registering individual providers, resolve each provider instance from the container.
   - Instantiate `LLMProviderRegistry` manually with the array of resolved providers.
   - Register the `LLMProviderRegistry` instance as a singleton in the container.

3. **Remove all inversify usage from the LLM provider codebase.**

4. **Fix any remaining DI registration errors by ensuring all registrations use unique tokens and proper factory or singleton registration methods.**

## Consequences

- The DI system aligns with the custom container's capabilities.
- The `LLMProviderRegistry` no longer relies on unsupported multi-injection.
- The codebase removes dependency on `inversify`.
- DI registration is explicit and clear, improving maintainability.
- Slightly more manual wiring is required in `registrations.ts` to instantiate the registry.

## Alternatives Considered

- Extending the container to support multi-injection was rejected due to complexity and scope.
- Removing `LLMProviderRegistry` entirely was rejected because the registry provides useful abstraction for resolving providers by name.

## References

- memory-bank/TechnicalArchitecture.md:50-70 (LLM integration and component structure)
- memory-bank/DeveloperGuide.md:120-140 (implementation standards and modularity)
- docs/architecture/decisions/2025-04-19-di-blocker-and-adoption-resolution.md (previous DI decisions)
- docs/architecture/decisions/0002-multiple-llm-providers.md (multiple LLM providers decision)
- docs/specs/dependency-injection-system.md (custom DI system specification)
- src/core/llm/provider-registry.ts (current provider registry implementation)
- src/core/di/registrations.ts (current DI registrations)
- src/core/di/container.ts (custom DI container implementation)

---

# Implementation Instructions for Code Mode

1. **Refactor `src/core/llm/provider-registry.ts`:**

   - Remove all `inversify` imports and decorators.
   - Change constructor to accept `providers: ILLMProvider[]`.
   - Store providers in a Map keyed by provider name.
   - Implement `getProvider(name: string): Result<ILLMProvider, Error>` method.

2. **Update `src/core/di/registrations.ts`:**

   - Register each LLM provider under unique tokens, e.g.:
     ```ts
     container.registerSingleton<ILLMProvider>("ILLMProvider.OpenAI", OpenAILLMProvider);
     container.registerSingleton<ILLMProvider>("ILLMProvider.GoogleGenAI", GoogleGenAILLMProvider);
     container.registerSingleton<ILLMProvider>("ILLMProvider.Anthropic", AnthropicLLMProvider);
     ```
   - After registering providers, resolve each provider instance:
     ```ts
     const openAIProvider = resolveDependency<ILLMProvider>(container, "ILLMProvider.OpenAI");
     const googleGenAIProvider = resolveDependency<ILLMProvider>(
       container,
       "ILLMProvider.GoogleGenAI"
     );
     const anthropicProvider = resolveDependency<ILLMProvider>(container, "ILLMProvider.Anthropic");
     ```
   - Instantiate the registry:
     ```ts
     const llmProviderRegistry = new LLMProviderRegistry([
       openAIProvider,
       googleGenAIProvider,
       anthropicProvider,
     ]);
     ```
   - Register the registry instance as a singleton:
     ```ts
     container.registerInstance<LLMProviderRegistry>("LLMProviderRegistry", llmProviderRegistry);
     ```
   - Remove the previous `registerSingleton` call for `LLMProviderRegistry` class.

3. **Fix any other DI registration errors similarly by ensuring unique tokens and proper registration methods.**

4. **Test the DI container initialization and LLM provider resolution to confirm errors are resolved.**

---

This plan ensures the DI system works correctly with the custom container and removes the inversify dependency causing errors.
