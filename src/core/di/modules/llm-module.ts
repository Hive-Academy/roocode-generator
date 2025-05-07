import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';

import { ILLMConfigService } from '@core/config/interfaces';
import { LLMConfigService } from '@core/config/llm-config.service';
import { Container } from '@core/di/container';
import { assertIsDefined, resolveDependency } from '@core/di/utils'; // Import helpers from utils
import { IFileOperations } from '@core/file-operations/interfaces';
import { ILLMProvider, IModelListerService, LLMProviderFactory } from '@core/llm/interfaces';
import { LLMProviderError } from '@core/llm/llm-provider-errors'; // Added import
import { LLMAgent } from '@core/llm/llm-agent';
import { ModelListerService } from '@core/llm/model-lister.service';
import { AnthropicProvider } from '@core/llm/providers/anthropic-provider';
import { GoogleGenAIProvider } from '@core/llm/providers/google-genai-provider';
import { OpenAIProvider } from '@core/llm/providers/openai-provider';
import { LLMProviderRegistry } from '@core/llm/provider-registry';
import { OpenRouterProvider } from '@core/llm/providers/open-router-provider';
import { Result } from '@core/result/result';
import { ILogger } from '@core/services/logger-service';
import { createPromptModule } from 'inquirer';
import { LLMConfig } from 'types/shared';

export function registerLlmModule(container: Container): void {
  // Register client factory functions for each provider
  container.registerFactory<(config: LLMConfig) => ChatOpenAI>('OpenAIClientFactory', () => {
    return (config: LLMConfig) =>
      new ChatOpenAI({
        modelName: config.model,
        temperature: config.temperature,
        openAIApiKey: config.apiKey,
      });
  });

  container.registerFactory<(config: LLMConfig) => ChatGoogleGenerativeAI>(
    'GoogleGenAIClientFactory',
    () => {
      return (config: LLMConfig) =>
        new ChatGoogleGenerativeAI({
          model: config.model,
          temperature: config.temperature,
          apiKey: config.apiKey,
        });
    }
  );

  container.registerFactory<(config: LLMConfig) => ChatAnthropic>('AnthropicClientFactory', () => {
    return (config: LLMConfig) =>
      new ChatAnthropic({
        modelName: config.model,
        anthropicApiKey: config.apiKey,
      });
  });

  // Register factories for LLM providers that instantiate with config and client factory
  container.registerFactory<LLMProviderFactory>('ILLMProvider.OpenAI.Factory', () => {
    const logger = resolveDependency<ILogger>(container, 'ILogger'); // Keep this one
    // OpenAIProvider constructor was simplified and no longer takes a clientFactory.
    // It instantiates ChatOpenAI internally.
    // The clientFactory for ChatOpenAI ('OpenAIClientFactory') is not directly used by OpenAIProvider factory anymore.
    // However, other services might still use 'OpenAIClientFactory' if they need a raw ChatOpenAI client.
    // For the provider factory, we just need logger and config.
    // const logger = resolveDependency<ILogger>(container, 'ILogger'); // REMOVE DUPLICATE
    try {
      return function factory(config: LLMConfig): Result<ILLMProvider, LLMProviderError> {
        // Changed Error to LLMProviderError
        try {
          // OpenAIProvider now creates its own ChatOpenAI client.
          return Result.ok(new OpenAIProvider(config, logger));
        } catch (error) {
          logger.error(
            `Error creating OpenAI provider instance: ${error instanceof Error ? error.message : String(error)}`,
            error as Error // Logger can take Error
          );
          return Result.err(LLMProviderError.fromError(error, 'OpenAIFactory'));
        }
      };
    } catch (error) {
      // This catch is for errors resolving the logger, less likely.
      logger.error(
        `Failed to resolve dependencies for OpenAI provider factory (e.g., logger): ${error instanceof Error ? error.message : String(error)}`,
        error as Error // Logger can take Error
      );
      return () =>
        // This factory now needs to return Result<ILLMProvider, LLMProviderError>
        Result.err(
          new LLMProviderError( // Changed to LLMProviderError
            `Failed to create OpenAI factory due to DI error: ${error instanceof Error ? error.message : String(error)}`,
            'FACTORY_INIT_ERROR',
            'OpenAIFactory'
          )
        );
    }
  });

  container.registerFactory<LLMProviderFactory>('ILLMProvider.GoogleGenAI.Factory', () => {
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    try {
      const clientFactory = resolveDependency<(config: LLMConfig) => ChatGoogleGenerativeAI>(
        container,
        'GoogleGenAIClientFactory'
      );

      return function factory(config: LLMConfig): Result<ILLMProvider, LLMProviderError> {
        // Changed Error to LLMProviderError
        try {
          const client = clientFactory(config);
          return Result.ok(new GoogleGenAIProvider(config, logger, () => client));
        } catch (error) {
          logger.error(
            `Error creating Google GenAI provider instance: ${error instanceof Error ? error.message : String(error)}`,
            error as Error
          );
          return Result.err(LLMProviderError.fromError(error, 'GoogleGenAIFactory'));
        }
      };
    } catch (error) {
      logger.error(
        `Failed to resolve dependencies for GoogleGenAI provider factory: ${error instanceof Error ? error.message : String(error)}`,
        error as Error
      );
      return () =>
        Result.err(
          new LLMProviderError( // Changed to LLMProviderError
            `Failed to create GoogleGenAI factory: ${error instanceof Error ? error.message : String(error)}`,
            'FACTORY_INIT_ERROR',
            'GoogleGenAIFactory'
          )
        );
    }
  });

  container.registerFactory<LLMProviderFactory>('ILLMProvider.Anthropic.Factory', () => {
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    try {
      const clientFactory = resolveDependency<(config: LLMConfig) => ChatAnthropic>(
        container,
        'AnthropicClientFactory'
      );

      return function factory(config: LLMConfig): Result<ILLMProvider, LLMProviderError> {
        // Changed Error to LLMProviderError
        try {
          const client = clientFactory(config);
          return Result.ok(new AnthropicProvider(config, logger, () => client));
        } catch (error) {
          logger.error(
            `Error creating Anthropic provider instance: ${error instanceof Error ? error.message : String(error)}`,
            error as Error
          );
          return Result.err(LLMProviderError.fromError(error, 'AnthropicFactory'));
        }
      };
    } catch (error) {
      logger.error(
        `Failed to resolve dependencies for Anthropic provider factory: ${error instanceof Error ? error.message : String(error)}`,
        error as Error
      );
      return () =>
        Result.err(
          new LLMProviderError( // Changed to LLMProviderError
            `Failed to create Anthropic factory: ${error instanceof Error ? error.message : String(error)}`,
            'FACTORY_INIT_ERROR',
            'AnthropicFactory'
          )
        );
    }
  });

  // Register OpenRouter provider factory
  container.registerFactory<LLMProviderFactory>('ILLMProvider.OpenRouter.Factory', () => {
    const logger = resolveDependency<ILogger>(container, 'ILogger'); // Keep this one

    // OpenRouterProvider constructor was simplified and no longer takes a clientFactory.
    // const logger = resolveDependency<ILogger>(container, 'ILogger'); // REMOVE DUPLICATE
    try {
      return function factory(config: LLMConfig): Result<ILLMProvider, LLMProviderError> {
        // Changed Error to LLMProviderError
        try {
          return Result.ok(new OpenRouterProvider(config, logger));
        } catch (error) {
          logger.error(
            `Error creating OpenRouter provider instance: ${error instanceof Error ? error.message : String(error)}`,
            error as Error
          );
          return Result.err(LLMProviderError.fromError(error, 'OpenRouterFactory'));
        }
      };
    } catch (error) {
      // This catch is for errors resolving the logger.
      logger.error(
        `Failed to resolve dependencies for OpenRouter provider factory (e.g., logger): ${error instanceof Error ? error.message : String(error)}`,
        error as Error
      );
      return () =>
        Result.err(
          new LLMProviderError(
            `Failed to create OpenRouter factory due to DI error: ${error instanceof Error ? error.message : String(error)}`,
            'FACTORY_INIT_ERROR',
            'OpenRouterFactory'
          )
        );
    }
  });

  // Register LLMProviderRegistry
  container.registerFactory<LLMProviderRegistry>('LLMProviderRegistry', () => {
    const configService = resolveDependency<ILLMConfigService>(container, 'ILLMConfigService');
    const providerFactories = {
      openai: resolveDependency<LLMProviderFactory>(container, 'ILLMProvider.OpenAI.Factory'),
      'google-genai': resolveDependency<LLMProviderFactory>(
        container,
        'ILLMProvider.GoogleGenAI.Factory'
      ),
      anthropic: resolveDependency<LLMProviderFactory>(container, 'ILLMProvider.Anthropic.Factory'),
      openrouter: resolveDependency<LLMProviderFactory>(
        container,
        'ILLMProvider.OpenRouter.Factory'
      ),
    };
    return new LLMProviderRegistry(configService, providerFactories);
  });

  // Register provider factories for ModelListerService
  container.registerFactory<Record<string, LLMProviderFactory>>('ILLMProviderFactories', () => {
    return {
      openai: resolveDependency<LLMProviderFactory>(container, 'ILLMProvider.OpenAI.Factory'),
      'google-genai': resolveDependency<LLMProviderFactory>(
        container,
        'ILLMProvider.GoogleGenAI.Factory'
      ),
      anthropic: resolveDependency<LLMProviderFactory>(container, 'ILLMProvider.Anthropic.Factory'),
      openrouter: resolveDependency<LLMProviderFactory>(
        container,
        'ILLMProvider.OpenRouter.Factory'
      ),
    };
  });

  // Register ModelListerService
  container.registerFactory<IModelListerService>('IModelListerService', () => {
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    const providerFactories = resolveDependency<Record<string, LLMProviderFactory>>(
      container,
      'ILLMProviderFactories'
    );

    assertIsDefined(logger, 'ILogger dependency not found');
    assertIsDefined(providerFactories, 'ILLMProviderFactories dependency not found');
    return new ModelListerService(providerFactories, logger);
  });

  container.registerFactory<ILLMConfigService>('ILLMConfigService', () => {
    const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    const inquirer = resolveDependency<ReturnType<typeof createPromptModule>>(
      container,
      'Inquirer'
    );
    const modelListerService = resolveDependency<IModelListerService>(
      container,
      'IModelListerService'
    );
    assertIsDefined(fileOps, 'IFileOperations dependency not found');
    assertIsDefined(logger, 'ILogger dependency not found');
    assertIsDefined(inquirer, 'Inquirer dependency not found');
    assertIsDefined(modelListerService, 'IModelListerService dependency not found');
    return new LLMConfigService(fileOps, logger, inquirer, modelListerService);
  });

  // Register LLMAgent
  container.registerFactory<LLMAgent>('LLMAgent', () => {
    const registry = resolveDependency<LLMProviderRegistry>(container, 'LLMProviderRegistry');
    const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    return new LLMAgent(registry, fileOps, logger);
  });
}
