import { LLMProviderRegistry } from '@core/llm/provider-registry';
import { ILLMConfigService } from '@core/config/interfaces';
import { Result } from '@core/result/result';
import { OpenRouterProvider } from '@core/llm/providers/open-router-provider';
import { LLMConfig } from 'types/shared';
import { ILogger } from '@core/services/logger-service';
import { LLMProviderFactory, ILLMProvider } from '@core/llm/interfaces';
import { LLMProviderError } from '@core/llm/llm-provider-errors';

describe('LLMProviderRegistry', () => {
  let mockConfigService: jest.Mocked<ILLMConfigService>;
  let mockLogger: jest.Mocked<ILogger>;
  let registry: LLMProviderRegistry;
  let openRouterFactory: LLMProviderFactory;
  let genericFactory1: LLMProviderFactory;
  let genericFactory2: LLMProviderFactory;

  beforeEach(() => {
    mockConfigService = {
      loadConfig: jest.fn(),
    } as any;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Create the OpenRouter provider factory
    openRouterFactory = (config: LLMConfig): Result<ILLMProvider, Error> => {
      try {
        const provider = new OpenRouterProvider(config, mockLogger);
        const asyncProvider: ILLMProvider = {
          name: provider.name,
          getCompletion: (...args) => provider.getCompletion(...args),
          listModels: () => provider.listModels(),
          getContextWindowSize: async () => Promise.resolve(provider.getContextWindowSize()),
          countTokens: async (text: string) => Promise.resolve(provider.countTokens(text)),
        };
        return Result.ok(asyncProvider);
      } catch (error) {
        return Result.err(error instanceof Error ? error : new Error(String(error)));
      }
    };

    // Create generic mock provider factories
    const createGenericFactory = (name: string): LLMProviderFactory => {
      return (config: LLMConfig): Result<ILLMProvider, Error> => {
        const mockProvider: ILLMProvider = {
          name,
          getCompletion: jest.fn(),
          listModels: jest.fn(),
          getContextWindowSize: async () => Promise.resolve(4096),
          countTokens: async (text: string) => Promise.resolve(Math.ceil(text.length / 4)),
        };
        mockLogger.debug(`Creating ${name} provider with model: ${config.model}`);
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
    if (result.isOk() && result.value) {
      expect(() => expect(result.value).toBeInstanceOf(OpenRouterProvider)).not.toThrow();
      expect(() => expect(result.value?.name).toBe('openrouter')).not.toThrow();
    }
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
    if (result.isErr() && result.error) {
      expect(() => expect(result.error?.message).toContain('not found')).not.toThrow();
    }
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
    if (result.isOk() && result.value) {
      expect(result.value.name).toBe('generic1');
      expect(() =>
        mockLogger.debug('Creating generic1 provider with model: test-model')
      ).toHaveBeenCalled();
    }
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
    if (result.isOk() && result.value) {
      expect(result.value.name).toBe('generic2');
      expect(() =>
        mockLogger.debug('Creating generic2 provider with model: another-model')
      ).toHaveBeenCalled();
    }
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
      if (result.isOk() && result.value) {
        expect(result.value.name).toBe(providerConfig.provider);
        if (providerConfig.provider === 'openrouter') {
          expect(result.value).toBeInstanceOf(OpenRouterProvider);
        } else {
          const debugMessage = `Creating ${providerConfig.provider} provider with model: ${providerConfig.model}`;
          expect(() => mockLogger.debug(debugMessage)).toHaveBeenCalled();
        }
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
    if (result.isErr() && result.error) {
      expect(result.error.message).toContain(
        'Provider factory not found for provider: unsupported'
      );
    }
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

    expect(result1.isOk() && result2.isOk()).toBe(true);
    if (result1.isOk() && result2.isOk() && result1.value && result2.value) {
      expect(() => expect(result1.value).toBe(result2.value)).not.toThrow(); // Same instance
    }
    expect(() => expect(mockConfigService.loadConfig.mock.calls.length).toBe(1)).not.toThrow(); // Called only once
  });

  it('should handle config service errors', async () => {
    mockConfigService.loadConfig.mockResolvedValue(Result.err(new Error('Config error')));

    const result = await registry.getProvider();
    expect(result.isErr()).toBe(true);
    if (result.isErr() && result.error) {
      expect(() => expect(result.error?.message).toBe('Config error')).not.toThrow();
    }
  });

  it('should return provider factory for a valid provider', () => {
    const result = registry.getProviderFactory('openrouter');
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(() => expect(result.value).toBe(openRouterFactory)).not.toThrow();
    }
  });

  it('should return error for an invalid provider factory', () => {
    const result = registry.getProviderFactory('invalid-provider');
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(() => expect(result.error).toBeInstanceOf(LLMProviderError)).not.toThrow();
      expect(() =>
        expect(result.error?.message).toContain('Provider factory not found')
      ).not.toThrow();
    }
  });

  it('should switch between different providers', async () => {
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
      if (result.isOk() && result.value) {
        expect(() => expect(result.value?.name).toBe(providerConfig.provider)).not.toThrow();
      }
    }

    expect(() => expect(mockConfigService.loadConfig.mock.calls.length).toBe(3)).not.toThrow();
  });

  it('should handle provider factory failure', async () => {
    const failingFactory: LLMProviderFactory = () => Result.err(new Error('Factory failed'));
    const registryWithFailingFactory = new LLMProviderRegistry(mockConfigService, {
      failing: failingFactory,
    });

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
    if (result.isErr()) {
      expect(() => expect(result.error).toBeInstanceOf(LLMProviderError)).not.toThrow();
      expect(() =>
        expect(result.error?.message).toContain('Failed to create provider')
      ).not.toThrow();
    }
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
    if (result.isOk() && result.value) {
      const provider = result.value;
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
    if (result.isOk() && result.value) {
      const provider = result.value;
      const size = await provider.getContextWindowSize();
      expect(size).toBe(4096);
    }
  });
});
