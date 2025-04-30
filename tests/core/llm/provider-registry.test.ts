import { LLMProviderRegistry } from '@core/llm/provider-registry';
import { ILLMConfigService } from '@core/config/interfaces';
import { Result } from '@core/result/result';
import { OpenRouterProvider } from '@core/llm/providers/open-router-provider';
import { LLMConfig } from 'types/shared';
import { ILogger } from '@core/services/logger-service';
import { LLMProviderFactory } from '@core/llm/interfaces';

describe('LLMProviderRegistry', () => {
  let mockConfigService: jest.Mocked<ILLMConfigService>;
  let mockLogger: jest.Mocked<ILogger>;
  let registry: LLMProviderRegistry;
  let providerFactory: LLMProviderFactory;

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

    // Create the provider factory
    providerFactory = (config: LLMConfig): Result<OpenRouterProvider, Error> => {
      try {
        return Result.ok(new OpenRouterProvider(config, mockLogger));
      } catch (error) {
        return Result.err(error instanceof Error ? error : new Error(String(error)));
      }
    };

    const providerFactories = {
      openrouter: providerFactory,
    };

    registry = new LLMProviderRegistry(mockConfigService, providerFactories);
  });

  it('should create OpenRouter provider when configured', async () => {
    const config: LLMConfig = {
      provider: 'openrouter',
      model: 'test-model',
      apiKey: 'test-key',
      temperature: 0.7,
      maxTokens: 1000,
    };

    mockConfigService.loadConfig.mockResolvedValue(Result.ok(config));

    const result = await registry.getProvider();
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toBeInstanceOf(OpenRouterProvider);
      expect(result.value?.name).toBe('openrouter');
    }
  });

  it('should return error for invalid provider', async () => {
    const config: LLMConfig = {
      provider: 'invalid-provider',
      model: 'test-model',
      apiKey: 'test-key',
      temperature: 0.7,
      maxTokens: 1000,
    };

    mockConfigService.loadConfig.mockResolvedValue(Result.ok(config));

    const result = await registry.getProvider();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error?.message).toContain('not found');
    }
  });

  it('should cache provider instance', async () => {
    const config: LLMConfig = {
      provider: 'openrouter',
      model: 'test-model',
      apiKey: 'test-key',
      temperature: 0.7,
      maxTokens: 1000,
    };

    mockConfigService.loadConfig.mockResolvedValue(Result.ok(config));

    const result1 = await registry.getProvider();
    const result2 = await registry.getProvider();

    expect(result1.isOk() && result2.isOk()).toBe(true);
    if (result1.isOk() && result2.isOk()) {
      expect(result1.value).toBe(result2.value); // Same instance
    }
    expect(mockConfigService.loadConfig.mock.calls.length).toBe(1); // Called only once
  });

  it('should handle config service errors', async () => {
    mockConfigService.loadConfig.mockResolvedValue(Result.err(new Error('Config error')));

    const result = await registry.getProvider();
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error?.message).toBe('Config error');
    }
  });
});
