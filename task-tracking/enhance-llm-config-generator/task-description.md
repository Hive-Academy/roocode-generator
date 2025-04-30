---
title: Enhance LLM Configuration Generator and Research OpenRouter Integration
version: 1.0.0
lastUpdated: 2025-04-30
documentStatus: Draft
author: Boomerang (Technical Lead)
---

# Task Description: Enhance LLM Configuration Generator and Research OpenRouter Integration

## 1. Overview

This task involves enhancing the existing LLM configuration generator and integrating OpenRouter as a new LLM provider. Comprehensive research on OpenRouter/Langchain integration has been completed and the findings are available to inform the implementation.

1.  Enhancing the existing LLM configuration generator (`LLMConfigService`) to provide a more interactive user experience with clear prompts and real-time feedback. This enhancement should also explore the possibility of calling an API to list available models for a selected provider.
2.  Integrating OpenRouter as a new LLM provider within the Langchain framework, specifically considering the current `roocode-generator` LLM configuration structure (`llm.config.json`, `LLMProviderRegistry`, `LLMProvider` implementations), based on the completed research.

## 2. Functional Requirements

- The LLM configuration process initiated via the `config` command should be highly interactive, guiding the user step-by-step.
- Prompts should be clear and provide context for the required input (e.g., API keys, default model).
- Real-time feedback should be provided during the configuration process (e.g., validation of input format).
- Explore and implement the capability to call an API (if available for the selected provider) to fetch and present a list of available models to the user during configuration.
- Explore and implement the capability to call an API (if available for the selected provider) to fetch and present a list of available models to the user during configuration.

## 3. Technical Requirements

- **Interactive Generator:**
  - Modify `src/core/config/llm-config.service.ts` and potentially `src/core/cli/cli-interface.ts` to use `inquirer` or similar interactive CLI libraries for enhanced user interaction during the `config` command.
  - Implement input validation and feedback mechanisms.
  - Design and implement the logic for calling a provider-specific API to list models. This might involve adding new methods to `LLMProvider` implementations or creating a new service.
  - Ensure the interactive process updates the `llm.config.json` file correctly.
- **OpenRouter Integration:**
  - Implement the integration of OpenRouter as a new LLM provider based on the completed research findings. This includes adding the necessary provider implementation, updating the `LLMProviderRegistry`, and configuring `llm.config.json` to support OpenRouter.

## 3.1. Comprehensive Research Findings: OpenRouter Integration

Comprehensive research on integrating OpenRouter with Langchain has been completed using the `mcp-server-firecrawl` tool. The detailed findings are provided below to inform the architectural design and implementation plan.

### Overview of Findings

- **OpenRouter as a Unified LLM Access:** OpenRouter provides a single API endpoint (`https://openrouter.ai/api/v1`) to interact with various large language models from different providers (OpenAI, Anthropic, Cohere, Google, etc.). It acts as a middleware, simplifying access and allowing dynamic switching between models. This unified approach aligns well with Langchain's goal of abstracting LLM providers.
- **Langchain Compatibility:** Langchain's architecture is designed to be extensible, supporting integrations via community-built adapters. Integrating OpenRouter is feasible by creating a custom provider class that adheres to Langchain's core abstractions, specifically the `BaseLLM` interface from `@langchain/core`.
- **Implementation Strategy:** The general strategy involves:
  - Installing necessary packages (`langchain`, `@langchain/core`, and potentially `@langchain/community` for shared components or examples).
  - Creating a custom provider class (e.g., `OpenRouterProvider`) that extends `BaseLLM` and internally handles communication with the OpenRouter API.
  - Configuring the application's LLM setup (`llm.config.json`, `LLMProviderRegistry`) to recognize and instantiate the new `OpenRouterProvider`.
  - Instantiating and using the `OpenRouterProvider` within Langchain chains or agents as you would any other `BaseLLM` instance.

### Key Code Examples from Research

**1. Custom OpenRouter Provider Class (Conceptual based on research):**

This snippet illustrates the basic structure of a custom provider class that interacts with the OpenRouter API and conforms to the `BaseLLM` interface.

```typescript
// src/core/llm/providers/OpenRouterProvider.ts (Conceptual location)
import { BaseLLM, BaseLLMCallOptions } from '@langchain/core/language_models/llms';
import { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import { GenerationChunk } from '@langchain/core/outputs';

// Define options specific to the OpenRouter provider
export interface OpenRouterCallOptions extends BaseLLMCallOptions {
  model: string; // OpenRouter uses 'model' to specify the desired LLM
  apiUrl?: string; // Default OpenRouter endpoint
  // Add other OpenRouter specific parameters here if needed
}

export interface OpenRouterInput {
  apiKey?: string;
  model: string;
  apiUrl?: string;
  // Add other constructor parameters here
}

export class OpenRouterProvider extends BaseLLM<OpenRouterCallOptions> {
  static lc_name() {
    return 'OpenRouter';
  }

  lc_serializable = true;

  apiKey: string;
  model: string;
  apiUrl: string;

  constructor(fields: OpenRouterInput) {
    super(fields);
    this.apiKey = fields.apiKey ?? process.env.OPENROUTER_API_KEY ?? '';
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not provided.');
    }
    this.model = fields.model;
    this.apiUrl = fields.apiUrl || 'https://openrouter.ai/api/v1';
  }

  _llmType() {
    return 'openrouter'; // Unique identifier for the LLM type
  }

  /**
   * Concrete implementation of the _call method for the OpenRouter provider.
   * This method handles the actual API call to OpenRouter.
   * @param prompt The prompt string to send to the LLM.
   * @param options Options for the LLM call, including callbacks.
   * @returns A Promise that resolves with the generated text.
   */
  async _call(
    prompt: string,
    options: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): Promise<string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      // Recommended headers for OpenRouter
      'HTTP-Referer': 'YOUR_APP_URL', // Replace with your app's URL
      'X-Title': 'YOUR_APP_NAME', // Replace with your app's name
    };

    const body = JSON.stringify({
      model: this.model,
      messages: [{ role: 'user', content: prompt }], // OpenRouter uses messages array for chat completions
      // Include other options from `options` if they map to OpenRouter parameters
      ...options, // Spread parsed call options
    });

    const response = await fetch(`${this.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: headers,
      body: body,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `OpenRouter API error: ${response.status} ${response.statusText} - ${JSON.stringify(error)}`
      );
    }

    const data = await response.json();
    // Extract the completion text from the response structure
    const completionText = data.choices?.[0]?.message?.content ?? '';

    // You can use runManager to report tokens or other info if available in the response
    // runManager?.handleLLMNewToken(completionText);

    return completionText;
  }

  // If streaming is supported and desired, implement _stream method
  // async _stream(
  //   prompt: string,
  //   options: this["ParsedCallOptions"],
  //   runManager?: CallbackManagerForLLMRun
  // ): Promise<AsyncIterable<GenerationChunk>> {
  //   // Implementation for streaming...
  // }

  // Implement _generate method if needed for batching or more complex generation
  // async _generate(
  //   prompts: string[],
  //   options: this["ParsedCallOptions"],
  //   runManager?: CallbackManagerForLLMRun
  // ): Promise<LLMResult> {
  //   // Implementation for batch generation...
  // }

  // Implement other required methods from BaseLLM if necessary,
  // e.g., _identifyingParams(), _modelType(), etc.
}
```

**2. Using the Custom Provider with Langchain (Conceptual):**

This snippet shows how the custom `OpenRouterProvider` can be instantiated and used within a Langchain chain, similar to how other `BaseLLM` instances are used.

```typescript
// src/main.ts (Conceptual usage)
import { OpenRouterProvider } from './core/llm/providers/OpenRouterProvider'; // Adjust path as needed
import { LLMChain } from 'langchain/chains';
import { PromptTemplate } from '@langchain/core/prompts';

// Instantiate the OpenRouter provider
const openRouterLLM = new OpenRouterProvider({
  apiKey: process.env.OPENROUTER_API_KEY!, // Load API key from environment variables
  model: 'gpt-3.5-turbo', // Specify the desired model via OpenRouter
  // apiUrl: '...' // Optional: specify a different OpenRouter endpoint if needed
});

// Define a prompt template
const prompt = PromptTemplate.fromTemplate('What is the meaning of life according to {topic}?');

// Create an LLM chain using the OpenRouter provider
const llmChain = new LLMChain({
  llm: openRouterLLM,
  prompt: prompt,
});

// Run the chain
async function runChain() {
  try {
    const result = await llmChain.call({ topic: 'philosophy' });
    console.log('Chain Result:', result);
  } catch (error) {
    console.error('Error running chain:', error);
  }
}

runChain();
```

### Challenges Identified

- **Type Consistency:** Ensuring strict type consistency between the OpenRouter API response structure and Langchain's expected types (`CompletionResponse`, `GenerationChunk`, etc.) requires careful mapping and potential type assertions.
- **Dependency Conflicts:** Managing versions of `@langchain/core` and other shared Langchain dependencies across different provider implementations is crucial. Using package manager features like `overrides` (npm) or `resolutions` (yarn) might be necessary to enforce a consistent version.
- **Error and Timeout Management:** Implementing robust error handling for API rate limits, timeouts, and network issues is essential for a production-ready provider. This includes implementing retry logic and graceful fallbacks.
- **Model Specificity:** OpenRouter routes requests to various models. The custom provider needs to handle specifying the target model correctly via the `model` parameter in the API call body.
- **API Endpoint and Headers:** The research indicates using the `/chat/completions` endpoint for chat models and including recommended headers like `HTTP-Referer` and `X-Title`.

### Best Practices for Implementation

- **Clear Abstraction Layers:** Keep the `OpenRouterProvider` implementation separate from the core application logic. Place it within the `src/core/llm/providers/` directory or a similar logical location.
- **Comprehensive Logging:** Utilize the `ILogger` service (resolved via DI) within the `OpenRouterProvider` to log API requests, responses, and errors. This is critical for debugging and monitoring.
- **Modular Design:** Design the `OpenRouterProvider` as a modular component that can be easily registered and resolved via the custom DI container (`src/core/di/`).
- **Documentation and Comments:** Thoroughly document the `OpenRouterProvider` class, its constructor options, and the implementation of the `_call` (and potentially `_stream`, `_generate`) methods. Add inline comments for complex logic.
- **Configuration Flexibility:** Ensure the `OpenRouterInput` interface and the provider's constructor allow configuring the API key, model, and potentially the API URL, aligning with the structure in `llm.config.json` and `LLMConfigService`.
- **Testing:** Write comprehensive unit tests for the `OpenRouterProvider` using Jest, mocking the `fetch` calls to simulate API responses and errors. Write integration tests to verify its usage within Langchain chains.

This detailed summary and the provided code examples should serve as a strong foundation for the architectural design and implementation of the OpenRouter integration.

## 4. Constraints

- The interactive configuration generator must integrate seamlessly with the existing CLI structure (`commander`, `inquirer`).
- The OpenRouter integration must be within the current `roocode-generator` LLM architecture (`src/core/llm/`).

## 5. Success Criteria

- The `config` command provides a significantly more interactive and user-friendly experience.
- The generator attempts to list models via API for supported providers during configuration.
- OpenRouter is successfully integrated as a new LLM provider, selectable via the configuration.

## 6. Related Documentation

- [[ProjectOverview]]
- [[TechnicalArchitecture]]
- [[DeveloperGuide]]
- `src/core/config/llm-config.service.ts`
- `src/core/cli/cli-interface.ts`
- `src/core/llm/llm-provider-configs.ts`
- `src/core/llm/llm-provider.ts`
- `src/core/llm/provider-registry.ts`
- `llm.config.json`

## 7. Task Breakdown (Initial - Architect will refine)

1.  Refine task description and create implementation plan.
2.  Implement interactive LLM configuration flow.
3.  Implement API call logic for model listing (if feasible).
4.  Update memory bank documentation with implementation details and OpenRouter integration information.
5.  Implement OpenRouter provider integration based on completed research.
6.  Test interactive generator and OpenRouter integration.
7.  Create completion report.

## 8. Timeline Estimates

- Planning: 1-2 days
- Interactive generator implementation: 2-3 days
- OpenRouter integration implementation: 3-5 days
- Testing and documentation updates: 1-2 days

_Note: These are initial estimates and may be adjusted during the planning phase._
