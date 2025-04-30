import { OpenRouterProvider } from '@core/llm/providers/open-router-provider';
import { LLMConfig } from 'types/shared';
import { LLMProviderError } from '@core/llm/llm-provider-errors';
import { ILogger } from '@core/services/logger-service';

describe('OpenRouterProvider', () => {
  // Keep mockLogger untyped here for Jest mock methods
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  const mockConfig: LLMConfig = {
    model: 'test-model',
    provider: 'openrouter',
    apiKey: 'test-api-key',
    maxTokens: 1000,
    temperature: 0.1,
  };

  let provider: OpenRouterProvider;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    // Cast mockLogger to ILogger when passing to constructor
    provider = new OpenRouterProvider(mockConfig, mockLogger as ILogger);
    originalFetch = global.fetch;
    // mockClear should work now
    mockLogger.debug.mockClear();
    mockLogger.error.mockClear();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('getCompletion', () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: 'Test completion response',
            role: 'assistant',
          },
        },
      ],
    };

    it('should successfully get completion', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await provider.getCompletion('system prompt', 'user prompt');

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe('Test completion response');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
          body: expect.stringContaining('system prompt'),
        })
      );
    });

    it('should handle API errors', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: 'Invalid API key' }),
      });

      const result = await provider.getCompletion('system prompt', 'user prompt');

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(LLMProviderError);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle missing completion content', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ choices: [{ message: {} }] }), // Missing content property
      });

      const result = await provider.getCompletion('system prompt', 'user prompt');

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(LLMProviderError);
      expect((result.error as LLMProviderError)?.code).toBe('EMPTY_COMPLETION_CONTENT');
      expect(result.error?.message).toContain('missing completion content');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  // New test cases for TSK-004
  describe('getCompletion - TSK-004 Error Handling', () => {
    it('should throw LLMProviderError and log data for 200 response with error in body', async () => {
      const mockErrorResponse = {
        error: {
          message: 'API quota exceeded',
          type: 'quota_error',
        },
      };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockErrorResponse),
      });

      const result = await provider.getCompletion('system prompt', 'user prompt');

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(LLMProviderError);
      expect((result.error as LLMProviderError)?.code).toBe('API_ERROR_IN_BODY');
      expect(result.error?.message).toContain('API quota exceeded');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'OpenRouter response contained an error in the body',
        expect.any(Error) // Expecting an Error object as the second argument
      );
      // Also expect the error log from the catch block
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get completion from OpenRouter',
        expect.any(LLMProviderError) // Expecting the thrown LLMProviderError
      );
      expect(mockLogger.error).toHaveBeenCalledTimes(2); // Verify exactly two error logs
    });

    it('should throw LLMProviderError and log data for 200 response missing choices', async () => {
      const mockInvalidResponse = {
        id: 'response-123',
        // Missing choices array
      };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockInvalidResponse),
      });

      const result = await provider.getCompletion('system prompt', 'user prompt');

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(LLMProviderError);
      expect((result.error as LLMProviderError)?.code).toBe('INVALID_RESPONSE_FORMAT');
      expect(result.error?.message).toContain('missing or empty choices array');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'OpenRouter response has invalid structure: missing or empty choices array. Response data: ' +
          JSON.stringify(mockInvalidResponse),
        expect.any(Error) // Expecting an Error object as the second argument
      );
      // Also expect the error log from the catch block
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get completion from OpenRouter',
        expect.any(LLMProviderError) // Expecting the thrown LLMProviderError
      );
      expect(mockLogger.error).toHaveBeenCalledTimes(2); // Verify exactly two error logs
    });

    it('should return successful result and log debug for valid 200 response', async () => {
      const mockValidResponse = {
        choices: [
          {
            message: {
              content: 'Valid response',
              role: 'assistant',
            },
          },
        ],
      };
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockValidResponse),
      });

      const result = await provider.getCompletion('system prompt', 'user prompt');

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toBe('Valid response');
      expect(result.isErr()).toBe(false); // Explicitly check no error

      // Expect the two debug logs
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Sending completion request to OpenRouter (model: test-model)'
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Received completion from OpenRouter (model: test-model, length: ${mockValidResponse.choices[0].message.content.length})`
      );
      expect(mockLogger.debug).toHaveBeenCalledTimes(2); // Verify exactly two debug logs
    });
  });

  describe('listModels', () => {
    const mockModelsResponse = {
      data: [
        { id: 'model-1', name: 'Model 1' },
        { id: 'model-2', name: 'Model 2' },
      ],
    };

    it('should successfully list models', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockModelsResponse),
      });

      const result = await provider.listModels();

      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(['model-1', 'model-2']);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-api-key',
          }),
        })
      );
    });

    it('should handle API errors when listing models', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: () => Promise.resolve({ error: 'Service is temporarily unavailable' }),
      });

      const result = await provider.listModels();

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(LLMProviderError);
      expect(result.error?.message).toContain(
        'OpenRouter API error: Service is temporarily unavailable'
      );
      expect(result.error?.code).toBe('HTTP_503');
      expect(result.error?.provider).toBe('openrouter');
      expect(result.error?.details).toEqual(
        expect.objectContaining({
          statusCode: 503,
          statusText: 'Service Unavailable',
          error: 'Service is temporarily unavailable',
        })
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle network errors when listing models', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await provider.listModels();

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(LLMProviderError);
      expect(result.error?.message).toContain('Network error');
      expect(result.error?.provider).toBe('openrouter');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getCompletion', () => {
    // ... (existing tests)

    it('should handle network errors when getting completion', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const result = await provider.getCompletion('system prompt', 'user prompt');

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(LLMProviderError);
      expect(result.error?.message).toContain('Network error');
      expect((result.error as LLMProviderError).provider).toBe('openrouter');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getContextWindowSize', () => {
    it('should return configured context window size', async () => {
      const providerWithContext = new OpenRouterProvider(
        {
          ...mockConfig, // Should be accessible now
          modelParams: { context_length: 8192 },
        },
        mockLogger as ILogger // Cast here too
      );
      const size = await providerWithContext.getContextWindowSize();
      expect(size).toBe(8192);
    });

    it('should return default context window size if not configured', async () => {
      // Use the provider instance from beforeEach
      const size = await provider.getContextWindowSize(); // provider should be accessible now
      // The default in BaseLLMProvider is 4096
      expect(size).toBe(4096);
    });
  });

  describe('countTokens', () => {
    it('should count tokens using default implementation', async () => {
      // Use the provider instance from beforeEach
      const text = 'Test string'; // Length 11
      const tokens = await provider.countTokens(text); // provider should be accessible now
      // Default implementation is Math.ceil(text.length / 4)
      expect(tokens).toBe(Math.ceil(11 / 4)); // Should be 3
      expect(tokens).toBe(3);
    });
  });
}); // Closing brace for the main describe block
