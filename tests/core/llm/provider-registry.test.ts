/* eslint-disable @typescript-eslint/unbound-method */
import { LLMProviderRegistry } from '@core/llm/provider-registry';
import { ILLMConfigService } from '@core/config/interfaces';
import { Result } from '@core/result/result';
import { OpenRouterProvider } from '@core/llm/providers/open-router-provider';
import { LLMConfig } from 'types/shared';
import { ILogger } from '@core/services/logger-service'; // Keep type import
import { createMockLogger } from '../../__mocks__/logger.mock'; // Import mock factory
import { LLMProviderFactory, ILLMProvider, LLMCompletionConfig } from '@core/llm/interfaces'; // Added LLMCompletionConfig
import { LLMProviderError } from '@core/llm/llm-provider-errors';
import type { BaseLanguageModelInput } from '@langchain/core/language_models/base'; // Added
import { z } from 'zod'; // Added

describe('LLMProviderRegistry', () => {
  let mockConfigService: jest.Mocked<ILLMConfigService>;
  let mockLogger: jest.Mocked<ILogger>; // Keep declaration
  let registry: LLMProviderRegistry;
  let openRouterFactory: LLMProviderFactory;
  let genericFactory1: LLMProviderFactory;
  let genericFactory2: LLMProviderFactory;

  beforeEach(() => {
    mockConfigService = {
      loadConfig: jest.fn(),
    } as any;

    mockLogger = createMockLogger(); // Initialize mock logger here

    // Create the OpenRouter provider factory
    openRouterFactory = (config: LLMConfig): Result<ILLMProvider, LLMProviderError> => {
      try {
        const provider = new OpenRouterProvider(config, mockLogger);
        const illmProviderInstance: ILLMProvider = provider;
        return Result.ok(illmProviderInstance);
      } catch (error) {
        return Result.err(LLMProviderError.fromError(error, 'openRouterFactory'));
      }
    };

    // Create generic mock provider factories
    const createGenericFactory = (name: string): LLMProviderFactory => {
      return (_config: LLMConfig): Result<ILLMProvider, LLMProviderError> => {
        const mockProvider: jest.Mocked<ILLMProvider> = {
          name,
          getCompletion: jest
            .fn<Promise<Result<string, LLMProviderError>>, [string, string]>()
            .mockResolvedValue(Result.ok(`mock completion from ${name}`)),
          getStructuredCompletion: jest
            .fn()
            .mockImplementation(
              <T extends z.ZodTypeAny>(
                _prompt: BaseLanguageModelInput,
                _schema: T,
                _completionConfig?: LLMCompletionConfig
              ): Promise<Result<z.infer<T>, LLMProviderError>> =>
                Promise.resolve(Result.ok({ mockKey: `mock structured value from ${name}` } as any))
            ),
          listModels: jest
            .fn<Promise<Result<string[], LLMProviderError>>, []>()
            .mockResolvedValue(Result.ok([`${name}-model1`, `${name}-model2`])),
          getContextWindowSize: jest.fn<Promise<number>, []>().mockResolvedValue(4096),
          countTokens: jest
            .fn<Promise<number>, [string]>()
            .mockImplementation(async (text: string) =>
              Promise.resolve(Math.ceil(text.length / 4))
            ),
        };
        mockLogger.debug(`Creating ${name} provider with model: ${_config.model}`);
        return Result.ok(mockProvider);
      };
    };

    genericFactory1 = createGenericFactory('generic1');
    genericFactory2 = createGenericFactory('generic2');

    const providerFactories = {
      openrouter: openRouterFactory,
      generic1: genericFactory1,
      generic2: genericFactory2,
    };

    registry = new LLMProviderRegistry(mockConfigService, providerFactories);
  });

  it('should create OpenRouter provider when configured', async () => {
    const config: LLMConfig = {
      provider: 'openrouter',
      model: 'test-model',
      apiKey: 'test-key',
      temperature: 0.1,
      maxTokens: 1000,
    };

    mockConfigService.loadConfig.mockResolvedValue(Result.ok(config));

    const result = await registry.getProvider();
    expect(result.isOk()).toBe(true);
    const provider = result.value!;
    expect(provider).toBeInstanceOf(OpenRouterProvider);
    expect(provider.name).toBe('openrouter');
  });

  it('should return error for invalid provider', async () => {
    const config: LLMConfig = {
      provider: 'invalid-provider',
      model: 'test-model',
      apiKey: 'test-key',
      temperature: 0.1,
      maxTokens: 1000,
    };

    mockConfigService.loadConfig.mockResolvedValue(Result.ok(config));

    const result = await registry.getProvider();
    expect(result.isErr()).toBe(true);
    const error = result.error!;
    expect(error).toBeInstanceOf(LLMProviderError);
    expect(error.message).toContain("LLM provider 'invalid-provider' not found");
  });

  it('should create generic provider 1 when configured', async () => {
    const config: LLMConfig = {
      provider: 'generic1',
      model: 'test-model',
      apiKey: 'test-key',
      temperature: 0.1,
      maxTokens: 1000,
    };

    mockConfigService.loadConfig.mockResolvedValue(Result.ok(config));

    const result = await registry.getProvider();
    expect(result.isOk()).toBe(true);
    const provider = result.value!; // Added !
    expect(provider.name).toBe('generic1');
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Creating generic1 provider with model: test-model'
    );
  });

  it('should create generic provider 2 when configured', async () => {
    const config: LLMConfig = {
      provider: 'generic2',
      model: 'another-model',
      apiKey: 'test-key',
      temperature: 0.5,
      maxTokens: 2000,
    };

    mockConfigService.loadConfig.mockResolvedValue(Result.ok(config));

    const result = await registry.getProvider();
    expect(result.isOk()).toBe(true);
    const provider = result.value!; // Added !
    expect(provider.name).toBe('generic2');
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Creating generic2 provider with model: another-model'
    );
  });

  it('should select the correct provider based on configuration', async () => {
    const configs = [
      { provider: 'openrouter', model: 'openai-model' },
      { provider: 'generic1', model: 'generic1-model' },
      { provider: 'generic2', model: 'generic2-model' },
    ];

    for (const providerConfig of configs) {
      const config: LLMConfig = {
        ...providerConfig,
        apiKey: 'test-key',
        temperature: 0.1,
        maxTokens: 1000,
      };

      mockConfigService.loadConfig.mockResolvedValue(Result.ok(config));

      const result = await registry.getProvider();
      expect(result.isOk()).toBe(true);
      const provider = result.value!;
      expect(provider.name).toBe(providerConfig.provider);
      if (providerConfig.provider === 'openrouter') {
        expect(provider).toBeInstanceOf(OpenRouterProvider);
      } else {
        const debugMessage = `Creating ${providerConfig.provider} provider with model: ${providerConfig.model}`;
        expect(mockLogger.debug).toHaveBeenCalledWith(debugMessage);
      }
    }
  });

  it('should return error for unsupported provider', async () => {
    const config: LLMConfig = {
      provider: 'unsupported',
      model: 'test-model',
      apiKey: 'test-key',
      temperature: 0.1,
      maxTokens: 1000,
    };

    mockConfigService.loadConfig.mockResolvedValue(Result.ok(config));

    const result = await registry.getProvider();
    expect(result.isErr()).toBe(true);
    const error = result.error!;
    expect(error).toBeInstanceOf(LLMProviderError);
    expect(error.message).toContain("LLM provider 'unsupported' not found");
  });

  it('should cache provider instance', async () => {
    const config: LLMConfig = {
      provider: 'openrouter',
      model: 'test-model',
      apiKey: 'test-key',
      temperature: 0.1,
      maxTokens: 1000,
    };

    mockConfigService.loadConfig.mockResolvedValue(Result.ok(config));

    const result1 = await registry.getProvider();
    const result2 = await registry.getProvider();

    expect(result1.isOk()).toBe(true);
    expect(result2.isOk()).toBe(true);
    expect(result1.value!).toBe(result2.value!);
    expect(mockConfigService.loadConfig).toHaveBeenCalledTimes(1);
  });

  it('should handle config service errors', async () => {
    mockConfigService.loadConfig.mockResolvedValue(Result.err(new Error('Config error')));

    const result = await registry.getProvider();
    expect(result.isErr()).toBe(true);
    const error = result.error!;
    expect(error).toBeInstanceOf(LLMProviderError);
    expect(error.message).toBe('Config error');
  });

  it('should return provider factory for a valid provider', () => {
    const result = registry.getProviderFactory('openrouter');
    expect(result.isOk()).toBe(true);
    expect(result.value!).toBe(openRouterFactory);
  });

  it('should return error for an invalid provider factory', () => {
    const result = registry.getProviderFactory('invalid-provider');
    expect(result.isErr()).toBe(true);
    const error = result.error!;
    expect(error).toBeInstanceOf(LLMProviderError);
    expect(error.message).toContain("LLM provider factory 'invalid-provider' not found");
  });

  it('should switch between different providers', async () => {
    const configs = [
      { provider: 'openrouter', model: 'openai-model' },
      { provider: 'generic1', model: 'generic1-model' },
      { provider: 'generic2', model: 'generic2-model' },
    ];

    // Reset cache for this test if registry caches, or create new registry instance
    registry = new LLMProviderRegistry(mockConfigService, {
      openrouter: openRouterFactory,
      generic1: genericFactory1,
      generic2: genericFactory2,
    });

    for (const providerConfig of configs) {
      const config: LLMConfig = {
        ...providerConfig,
        apiKey: 'test-key',
        temperature: 0.1,
        maxTokens: 1000,
      };

      mockConfigService.loadConfig.mockResolvedValue(Result.ok(config));

      const result = await registry.getProvider();
      expect(result.isOk()).toBe(true);
      const provider = result.value!;
      expect(provider.name).toBe(providerConfig.provider);
    }

    expect(mockConfigService.loadConfig).toHaveBeenCalledTimes(configs.length);
  });

  it('should handle provider factory failure', async () => {
    const failingFactory: LLMProviderFactory = () =>
      Result.err(new LLMProviderError('Factory failed', 'FACTORY_ERROR', 'failingFactory'));
    const providerFactoriesWithFailing = { failing: failingFactory };
    const registryWithFailingFactory = new LLMProviderRegistry(
      mockConfigService,
      providerFactoriesWithFailing
    );

    const config: LLMConfig = {
      provider: 'failing',
      model: 'test-model',
      apiKey: 'test-key',
      temperature: 0.1,
      maxTokens: 1000,
    };

    mockConfigService.loadConfig.mockResolvedValue(Result.ok(config));

    const result = await registryWithFailingFactory.getProvider();
    expect(result.isErr()).toBe(true);
    const error = result.error!;
    expect(error).toBeInstanceOf(LLMProviderError);
    expect(error.message).toBe('Factory failed');
    expect(error.code).toBe('UNKNOWN_ERROR');
    expect(error.provider).toBe('LLMProviderRegistry');
  });

  it('should provide token counting functionality', async () => {
    const config: LLMConfig = {
      provider: 'generic1',
      model: 'test-model',
      apiKey: 'test-key',
      temperature: 0.1,
      maxTokens: 1000,
    };

    mockConfigService.loadConfig.mockResolvedValue(Result.ok(config));
    const result = await registry.getProvider();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // Type guard
      const provider = result.value!; // Safe due to type guard
      const text = 'This is a test string';
      const tokens = await provider.countTokens(text);
      expect(tokens).toBe(Math.ceil(text.length / 4));
    }
  });

  it('should return configured context window size', async () => {
    const config: LLMConfig = {
      provider: 'generic1',
      model: 'test-model',
      apiKey: 'test-key',
      temperature: 0.1,
      maxTokens: 1000,
    };

    mockConfigService.loadConfig.mockResolvedValue(Result.ok(config));
    const result = await registry.getProvider();

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // Type guard
      const provider = result.value!; // Safe due to type guard
      const size = await provider.getContextWindowSize();
      expect(size).toBe(4096);
    }
  });
});
