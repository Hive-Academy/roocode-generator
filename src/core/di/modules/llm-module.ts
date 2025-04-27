import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOpenAI } from '@langchain/openai';

import { Container } from '@core/di/container';
import { resolveDependency } from '@core/di/utils'; // Import helpers from utils
import { ILLMProvider, LLMProviderFactory } from '@core/llm/interfaces';
import { LLMAgent } from '@core/llm/llm-agent';
import {
  AnthropicLLMProvider,
  GoogleGenAILLMProvider,
  OpenAILLMProvider,
} from '@core/llm/llm-provider';
import { LLMProviderRegistry } from '@core/llm/provider-registry';
import { ILLMConfigService } from '@core/config/interfaces';
import { Result } from '@core/result/result';
import { ILogger } from '@core/services/logger-service';
import { IFileOperations } from '@core/file-operations/interfaces';
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
    const logger = resolveDependency<ILogger>(container, 'ILogger'); // Resolve logger early for error handling
    try {
      const clientFactory = resolveDependency<(config: LLMConfig) => ChatOpenAI>(
        container,
        'OpenAIClientFactory'
      );

      return function factory(config: LLMConfig): Result<ILLMProvider, Error> {
        try {
          const client = clientFactory(config);
          return Result.ok(new OpenAILLMProvider(config, () => client));
        } catch (error) {
          logger.error(
            `Error creating OpenAI provider instance: ${error instanceof Error ? error.message : String(error)}`,
            error as Error
          );
          return Result.err(error instanceof Error ? error : new Error(String(error)));
        }
      };
    } catch (error) {
      logger.error(
        `Failed to resolve dependencies for OpenAI provider factory: ${error instanceof Error ? error.message : String(error)}`,
        error as Error
      );
      // Return a factory that always returns an error if dependency resolution fails
      return () =>
        Result.err(
          new Error(
            `Failed to create OpenAI factory: ${error instanceof Error ? error.message : String(error)}`
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

      return function factory(config: LLMConfig): Result<ILLMProvider, Error> {
        try {
          const client = clientFactory(config);
          return Result.ok(new GoogleGenAILLMProvider(config, () => client));
        } catch (error) {
          logger.error(
            `Error creating Google GenAI provider instance: ${error instanceof Error ? error.message : String(error)}`,
            error as Error
          );
          return Result.err(error instanceof Error ? error : new Error(String(error)));
        }
      };
    } catch (error) {
      logger.error(
        `Failed to resolve dependencies for GoogleGenAI provider factory: ${error instanceof Error ? error.message : String(error)}`,
        error as Error
      );
      return () =>
        Result.err(
          new Error(
            `Failed to create GoogleGenAI factory: ${error instanceof Error ? error.message : String(error)}`
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

      return function factory(config: LLMConfig): Result<ILLMProvider, Error> {
        try {
          const client = clientFactory(config);
          return Result.ok(new AnthropicLLMProvider(config, () => client));
        } catch (error) {
          logger.error(
            `Error creating Anthropic provider instance: ${error instanceof Error ? error.message : String(error)}`,
            error as Error
          );
          return Result.err(error instanceof Error ? error : new Error(String(error)));
        }
      };
    } catch (error) {
      logger.error(
        `Failed to resolve dependencies for Anthropic provider factory: ${error instanceof Error ? error.message : String(error)}`,
        error as Error
      );
      return () =>
        Result.err(
          new Error(
            `Failed to create Anthropic factory: ${error instanceof Error ? error.message : String(error)}`
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
    };
    return new LLMProviderRegistry(configService, providerFactories);
  });

  // Register LLMAgent
  container.registerFactory<LLMAgent>('LLMAgent', () => {
    const registry = resolveDependency<LLMProviderRegistry>(container, 'LLMProviderRegistry');
    const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    return new LLMAgent(registry, fileOps, logger);
  });
}
