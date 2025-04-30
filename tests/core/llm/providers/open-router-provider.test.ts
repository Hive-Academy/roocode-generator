import { OpenRouterProvider } from '@core/llm/providers/open-router-provider';
import { LLMConfig } from 'types/shared';
import { LLMProviderError } from '@core/llm/llm-provider-errors';

describe('OpenRouterProvider', () => {
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
    provider = new OpenRouterProvider(mockConfig, mockLogger);
    originalFetch = global.fetch;
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

  it('should handle response with missing choices array', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}), // Missing choices array
    });

    const result = await provider.getCompletion('system prompt', 'user prompt');

    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(LLMProviderError);
    expect((result.error as LLMProviderError)?.code).toBe('INVALID_RESPONSE_FORMAT');
    expect(result.error?.message).toContain('missing or empty choices array');
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should handle response with empty choices array', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [] }), // Empty choices array
    });

    const result = await provider.getCompletion('system prompt', 'user prompt');

    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(LLMProviderError);
    expect((result.error as LLMProviderError)?.code).toBe('INVALID_RESPONSE_FORMAT');
    expect(result.error?.message).toContain('missing or empty choices array');
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should handle response with missing message in first choice', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{}] }), // Missing message property
    });

    const result = await provider.getCompletion('system prompt', 'user prompt');

    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(LLMProviderError);
    expect((result.error as LLMProviderError)?.code).toBe('INVALID_RESPONSE_FORMAT');
    expect(result.error?.message).toContain('first choice or message missing');
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('should handle response with missing content in message', async () => {
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

  it('should handle response with null content in message', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ choices: [{ message: { content: null } }] }), // Null content
    });

    const result = await provider.getCompletion('system prompt', 'user prompt');

    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(LLMProviderError);
    expect((result.error as LLMProviderError)?.code).toBe('EMPTY_COMPLETION_CONTENT');
    expect(result.error?.message).toContain('missing completion content');
    expect(mockLogger.error).toHaveBeenCalled();
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
});
