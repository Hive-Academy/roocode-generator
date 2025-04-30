/* eslint-disable @typescript-eslint/unbound-method */
import 'reflect-metadata';
import { ModelListerService } from '@core/llm/model-lister.service';
import { ILogger } from '@core/services/logger-service';
import { LLMProviderFactory } from '@core/llm/interfaces';
import { Result } from '@core/result/result';
import { LLMProviderError } from '@core/llm/llm-provider-errors';
import { LLMConfig } from 'types/shared';

describe('ModelListerService', () => {
  let service: ModelListerService;
  let mockProviderFactories: Record<string, LLMProviderFactory>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockProvider: any;
  let mockProviderFactory: jest.Mock;

  beforeEach(() => {
    // Set up mock provider
    mockProvider = {
      listModels: jest.fn(),
    };

    // Set up mock provider factory
    mockProviderFactory = jest.fn();

    // Set up mock provider factories
    mockProviderFactories = {
      'test-provider': mockProviderFactory,
    };

    // Set up mock logger
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    // Create service instance
    service = new ModelListerService(mockProviderFactories, mockLogger);
  });

  describe('listModelsForProvider', () => {
    const providerName = 'test-provider';
    const apiKey = 'test-api-key';
    const expectedModels = ['model-1', 'model-2', 'model-3'];

    it('should successfully list models when provider supports it', async () => {
      // Arrange
      mockProviderFactory.mockReturnValue(Result.ok(mockProvider));
      mockProvider.listModels.mockResolvedValue(Result.ok(expectedModels));

      // Act
      const result = await service.listModelsForProvider(providerName, apiKey);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.value).toEqual(expectedModels);
      expect(mockProviderFactory).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: providerName,
          apiKey: apiKey,
        })
      );
      expect(mockProvider.listModels).toHaveBeenCalled();
      expect(mockLogger.warn).not.toHaveBeenCalled();
    });

    it('should return error when provider factory is not found', async () => {
      // Act
      const result = await service.listModelsForProvider('unknown-provider', apiKey);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('not found');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Provider factory not found')
      );
      expect(mockProvider.listModels).not.toHaveBeenCalled();
    });

    it('should return error when provider factory fails to create provider', async () => {
      // Arrange
      const factoryError = new Error('Factory error');
      mockProviderFactory.mockReturnValue(Result.err(factoryError));

      // Act
      const result = await service.listModelsForProvider(providerName, apiKey);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(factoryError);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create provider instance')
      );
      expect(mockProvider.listModels).not.toHaveBeenCalled();
    });

    it('should return error when provider does not support listModels', async () => {
      // Arrange
      const providerWithoutListModels = { name: 'test-provider' };
      mockProviderFactory.mockReturnValue(Result.ok(providerWithoutListModels));

      // Act
      const result = await service.listModelsForProvider(providerName, apiKey);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('does not support listing models');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('does not support listing models')
      );
    });

    it('should return error when listModels returns an error', async () => {
      // Arrange
      const listModelsError = new LLMProviderError('API error', 'API_ERROR', 'test-provider');
      mockProviderFactory.mockReturnValue(Result.ok(mockProvider));
      mockProvider.listModels.mockResolvedValue(Result.err(listModelsError));

      // Act
      const result = await service.listModelsForProvider(providerName, apiKey);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(listModelsError);
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('No models available'));
    });

    it('should return error when listModels returns an empty list', async () => {
      // Arrange
      mockProviderFactory.mockReturnValue(Result.ok(mockProvider));
      mockProvider.listModels.mockResolvedValue(Result.ok([]));

      // Act
      const result = await service.listModelsForProvider(providerName, apiKey);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('No models available');
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('No models available'));
    });

    it('should handle unexpected errors during execution', async () => {
      // Arrange
      const unexpectedError = new Error('Unexpected error');
      mockProviderFactory.mockReturnValue(Result.ok(mockProvider));
      mockProvider.listModels.mockImplementation(() => {
        throw unexpectedError;
      });

      // Act
      const result = await service.listModelsForProvider(providerName, apiKey);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('Failed to list models');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not fetch available models')
      );
    });

    it('should handle case-insensitive provider names', async () => {
      // Arrange
      mockProviderFactory.mockReturnValue(Result.ok(mockProvider));
      mockProvider.listModels.mockResolvedValue(Result.ok(expectedModels));

      // Act - use uppercase provider name
      const result = await service.listModelsForProvider('TEST-PROVIDER', apiKey);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.value).toEqual(expectedModels);
      expect(mockProviderFactory).toHaveBeenCalledWith(
        expect.objectContaining({
          provider: 'TEST-PROVIDER', // Original case is preserved in the config
          apiKey: apiKey,
        })
      );
    });

    it('should create temporary config with correct values', async () => {
      // Arrange
      mockProviderFactory.mockReturnValue(Result.ok(mockProvider));
      mockProvider.listModels.mockResolvedValue(Result.ok(expectedModels));

      // Act
      await service.listModelsForProvider(providerName, apiKey);

      // Assert - verify the config passed to the factory
      const configArg = mockProviderFactory.mock.calls[0][0] as LLMConfig;
      expect(configArg).toEqual({
        provider: providerName,
        apiKey: apiKey,
        model: 'temporary', // Placeholder model name
        temperature: 1,
        maxTokens: 2048,
      });
    });
  });
});
