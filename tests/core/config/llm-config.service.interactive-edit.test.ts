/* eslint-disable @typescript-eslint/unbound-method */
import { LLMConfigService } from '../../../src/core/config/llm-config.service';
import { IFileOperations } from '../../../src/core/file-operations/interfaces';
import { IModelListerService } from '../../../src/core/llm/interfaces';
import { Result } from '../../../src/core/result/result';
import { ILogger } from '../../../src/core/services/logger-service';
import { createMockLogger } from '../../__mocks__/logger.mock';
import { LLMConfig } from '../../../types/shared';
import { LLMProviderError } from '../../../src/core/llm/llm-provider-errors';
// import { LLMProviderRegistry } from '../../../src/core/llm/provider-registry'; // No longer needed here

describe('LLMConfigService - interactiveEditConfig', () => {
  let service: LLMConfigService;
  let mockFileOps: jest.Mocked<IFileOperations>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockInquirer: jest.Mock;
  let mockModelListerService: jest.Mocked<IModelListerService>;
  // let mockLLMProviderRegistry: jest.Mocked<LLMProviderRegistry>; // Removed
  const configPath = `${process.cwd()}/llm.config.json`;

  beforeEach(() => {
    mockFileOps = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      createDirectory: jest.fn(),
      validatePath: jest.fn(),
      normalizePath: jest.fn(),
      readDir: jest.fn(),
      exists: jest.fn(),
      isDirectory: jest.fn(),
      copyDirectoryRecursive: jest.fn(),
    };

    mockLogger = createMockLogger();

    mockInquirer = jest.fn().mockImplementation((promptOrQuestions) => {
      const questions = Array.isArray(promptOrQuestions) ? promptOrQuestions : [promptOrQuestions];
      const answers: any = {};
      questions.forEach((q) => {
        if (q.name === 'provider') answers.provider = userAnswers.provider;
        else if (q.name === 'apiKey') answers.apiKey = userAnswers.apiKey;
        else if (q.name === 'model') answers.model = userAnswers.model;
        else if (q.name === 'temperature') answers.temperature = baseConfig.temperature;
        else if (q.name === 'maxTokens') answers.maxTokens = baseConfig.maxTokens;
      });
      return Promise.resolve(answers);
    });

    mockModelListerService = {
      listModelsForProvider: jest.fn(),
      getContextWindowSize: jest.fn(), // Added mock for new method
    };
    // mockLLMProviderRegistry = { // Removed
    //   getProviderFactory: jest.fn(),
    //   getProvider: jest.fn(),
    //   initializeProvider: jest.fn(),
    //   cachedProvider: null,
    //   providerFactories: new Map(),
    // } as any as jest.Mocked<LLMProviderRegistry>;

    service = new LLMConfigService(
      mockFileOps,
      mockLogger,
      mockInquirer as any,
      mockModelListerService
      // mockLLMProviderRegistry // Removed
    );
  });

  const baseConfig: LLMConfig = {
    provider: 'old-provider',
    apiKey: 'old-key',
    model: 'old-model',
    maxTokens: 500,
    temperature: 0.2,
  };

  const userAnswers = {
    provider: 'new-provider',
    apiKey: 'new-key',
    model: 'new-model',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should prompt user, update config, and save successfully', async () => {
    mockModelListerService.listModelsForProvider.mockResolvedValue(
      Result.ok(['model-1', 'model-2', 'new-model'])
    );
    // Mock getContextWindowSize to return a valid window, so maxTokens is auto-calculated
    mockModelListerService.getContextWindowSize.mockResolvedValue(Result.ok(16000));
    mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));

    const result = await service.interactiveEditConfig(baseConfig);

    expect(result.isOk()).toBe(true);
    // Number of inquirer calls might change based on context window retrieval
    // If context window is retrieved, maxTokens is not prompted.
    // 1 (provider) + 1 (apiKey) + 1 (model) + 1 (temperature) = 4 calls
    expect(mockInquirer).toHaveBeenCalledTimes(4);
    expect(mockModelListerService.listModelsForProvider).toHaveBeenCalledWith(
      'new-provider',
      'new-key'
    );
    expect(mockModelListerService.getContextWindowSize).toHaveBeenCalledWith(
      'new-provider',
      'new-key',
      'new-model'
    );

    expect(mockFileOps.writeFile).toHaveBeenCalledWith(configPath, expect.any(String));
    const writeFileCall = mockFileOps.writeFile.mock.calls[0];
    const writtenJson = writeFileCall[1];
    expect(writtenJson).toContain('"provider": "new-provider"');
    expect(writtenJson).toContain('"apiKey": "new-key"');
    expect(writtenJson).toContain('"model": "new-model"');
    expect(writtenJson).toContain(`"maxTokens": ${Math.floor(16000 * 0.25)}`); // Auto-calculated
    expect(mockLogger.error).not.toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('saved successfully'));
  });

  it('should use defaults from baseConfig in prompts', async () => {
    mockModelListerService.listModelsForProvider.mockResolvedValue(
      Result.ok(['old-model', 'other-model'])
    );
    mockModelListerService.getContextWindowSize.mockResolvedValue(Result.ok(8000)); // Simulate successful fetch
    mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));

    await service.interactiveEditConfig(baseConfig);

    expect(mockInquirer).toHaveBeenCalled();
  });

  it('should use fallback defaults if baseConfig fields are empty', async () => {
    const emptyBaseConfig: LLMConfig = {
      provider: '',
      apiKey: '',
      model: '',
      maxTokens: 1,
      temperature: 1,
    };
    mockModelListerService.listModelsForProvider.mockResolvedValue(
      Result.ok(['gpt-3.5-turbo', 'gpt-4'])
    );
    mockModelListerService.getContextWindowSize.mockResolvedValue(Result.ok(4096)); // Simulate successful fetch
    mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));

    await service.interactiveEditConfig(emptyBaseConfig);

    expect(mockInquirer).toHaveBeenCalled();
  });

  it('should return error if inquirer prompt fails', async () => {
    const promptError = new Error('Inquirer failed');
    mockInquirer.mockRejectedValueOnce(promptError);

    const result = await service.interactiveEditConfig(baseConfig);

    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toContain('Interactive LLM configuration failed');
    expect(mockFileOps.writeFile).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith('LLM configuration failed', promptError);
  });

  it('should return error if saveConfig fails', async () => {
    const saveError = new Error('Save failed');
    mockModelListerService.listModelsForProvider.mockResolvedValue(
      Result.ok(['new-model', 'other-model'])
    );
    mockModelListerService.getContextWindowSize.mockResolvedValue(Result.ok(8192));
    mockFileOps.writeFile.mockResolvedValue(Result.err(saveError));

    const result = await service.interactiveEditConfig(baseConfig);

    expect(result.isErr()).toBe(true);
    expect(result.error).toBe(saveError);
    expect(mockFileOps.writeFile).toHaveBeenCalledWith(configPath, expect.any(String));
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should fetch and list models if provider supports it', async () => {
    const mockModels = ['model-a', 'model-b', 'model-c'];
    mockInquirer.mockImplementation((questions) => {
      // This mock needs to handle the case where maxTokens is NOT prompted if context window is found
      const isAdvancedPrompt =
        Array.isArray(questions) && questions.some((q) => q.name === 'temperature');
      if (isAdvancedPrompt) {
        // Assuming only temperature is prompted if context window is found
        return Promise.resolve({ temperature: 0.5 });
      }
      const question = Array.isArray(questions) ? questions[0] : questions; // Simplified for single prompts
      if (question.name === 'provider') return Promise.resolve({ provider: 'openai' });
      if (question.name === 'apiKey') return Promise.resolve({ apiKey: 'test-key' });
      if (question.name === 'model') return Promise.resolve({ model: 'model-b' });
      return Promise.resolve({});
    });

    mockModelListerService.listModelsForProvider.mockResolvedValue(Result.ok(mockModels));
    mockModelListerService.getContextWindowSize.mockResolvedValue(Result.ok(16000)); // Successful fetch
    mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));

    await service.interactiveEditConfig(baseConfig);

    // provider, apiKey, model, temperature
    expect(mockInquirer).toHaveBeenCalledTimes(4);
    expect(mockModelListerService.listModelsForProvider).toHaveBeenCalled();
    expect(mockModelListerService.getContextWindowSize).toHaveBeenCalledWith(
      'openai',
      'test-key',
      'model-b'
    );
    expect(mockFileOps.writeFile).toHaveBeenCalledWith(
      configPath,
      expect.stringContaining('"model": "model-b"')
    );
  });

  it('should handle error when model listing fails', async () => {
    mockModelListerService.listModelsForProvider.mockResolvedValue(
      Result.err(new LLMProviderError('Model listing error', 'PROVIDER_ERROR', 'ProviderTest'))
    );
    // Even if model listing fails, getContextWindowSize might be called with the manually entered model
    mockModelListerService.getContextWindowSize.mockResolvedValue(
      Result.err(new LLMProviderError('Ctx error', 'CTX_ERROR', 'ProviderTest'))
    );

    mockInquirer.mockImplementation((questions) => {
      const isAdvancedPrompt =
        Array.isArray(questions) && questions.some((q) => q.name === 'temperature');
      if (isAdvancedPrompt) {
        // Assuming temperature AND maxTokens are prompted if context window fails
        return Promise.resolve({ temperature: 0.5, maxTokens: 2048 });
      }
      const question = Array.isArray(questions) ? questions[0] : questions;
      if (question.name === 'provider') return Promise.resolve({ provider: 'openai' });
      if (question.name === 'apiKey') return Promise.resolve({ apiKey: 'test-key' });
      if (question.name === 'model') return Promise.resolve({ model: 'manual-model' }); // Manually entered
      return Promise.resolve({});
    });
    mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));

    await service.interactiveEditConfig(baseConfig);

    // provider, apiKey, model (manual), temperature, maxTokens
    expect(mockInquirer).toHaveBeenCalledTimes(5);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not fetch available models')
    );
    expect(mockModelListerService.getContextWindowSize).toHaveBeenCalledWith(
      'openai',
      'test-key',
      'manual-model'
    );
    expect(mockFileOps.writeFile).toHaveBeenCalledWith(configPath, expect.any(String));
  });

  // --- Tests for promptForAdvancedConfig logic (via interactiveEditConfig) ---
  describe('Advanced Config Prompting (maxTokens logic)', () => {
    const providerName = 'test-advanced-provider';
    const modelName = 'test-advanced-model';
    const apiKey = 'test-advanced-key';

    beforeEach(() => {
      userAnswers.provider = providerName;
      userAnswers.apiKey = apiKey;
      userAnswers.model = modelName;

      mockModelListerService.listModelsForProvider.mockResolvedValue(Result.ok([modelName]));
      mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));
    });

    it('Test Case 1: should automatically set maxTokens if contextWindow is retrieved, only prompt for temperature', async () => {
      const validContextWindow = 16000;
      const expectedMaxTokens = Math.floor(validContextWindow * 0.25);
      const promptedTemperature = 0.65;

      mockModelListerService.getContextWindowSize.mockResolvedValue(Result.ok(validContextWindow));

      mockInquirer.mockImplementation(async (promptsArg: any) => {
        const prompts = Array.isArray(promptsArg) ? promptsArg : [promptsArg];
        // Provider, API Key, Model are prompted first (3 calls)
        // Then, only temperature should be prompted if context window is found (1 call)
        if (prompts.length === 1 && prompts[0].name === 'temperature') {
          return Promise.resolve({ temperature: promptedTemperature });
        }
        // Simulate other prompts
        if (prompts[0].name === 'provider') return Promise.resolve({ provider: providerName });
        if (prompts[0].name === 'apiKey') return Promise.resolve({ apiKey: apiKey });
        if (prompts[0].name === 'model') return Promise.resolve({ model: modelName });
        return Promise.resolve({});
      });

      const loggerDebugSpy = jest.spyOn(mockLogger, 'debug');
      const loggerInfoSpy = jest.spyOn(mockLogger, 'info');

      const result = await service.interactiveEditConfig(baseConfig);

      expect(result.isOk()).toBe(true);
      expect(mockModelListerService.getContextWindowSize).toHaveBeenCalledWith(
        providerName,
        apiKey,
        modelName
      );

      expect(loggerDebugSpy).toHaveBeenCalledWith(
        `Successfully retrieved context window size ${validContextWindow} for model ${modelName}. Suggested maxTokens: ${expectedMaxTokens}.`
      );
      expect(loggerInfoSpy).toHaveBeenCalledWith(
        `Automatically setting maxTokens to ${expectedMaxTokens} (25% of context window ${validContextWindow}) for model ${modelName}.`
      );

      expect(mockFileOps.writeFile).toHaveBeenCalledWith(
        configPath,
        JSON.stringify(
          expect.objectContaining({
            maxTokens: expectedMaxTokens,
            temperature: promptedTemperature,
          }),
          null,
          2
        )
      );
    });

    it('Test Case 2a: should prompt for maxTokens if getContextWindowSize returns an error', async () => {
      const promptedMaxTokens = 2048;
      const promptedTemperature = 0.75;
      const contextWindowError = new LLMProviderError(
        'Failed to get context window',
        'TEST_ERROR',
        providerName
      );

      mockModelListerService.getContextWindowSize.mockResolvedValue(Result.err(contextWindowError));

      mockInquirer.mockImplementation(async (promptsArg: any) => {
        const prompts = Array.isArray(promptsArg) ? promptsArg : [promptsArg];
        if (
          prompts.length === 2 &&
          prompts.find((p) => p.name === 'temperature') &&
          prompts.find((p) => p.name === 'maxTokens')
        ) {
          return Promise.resolve({
            temperature: promptedTemperature,
            maxTokens: promptedMaxTokens,
          });
        }
        if (prompts[0].name === 'provider') return Promise.resolve({ provider: providerName });
        if (prompts[0].name === 'apiKey') return Promise.resolve({ apiKey: apiKey });
        if (prompts[0].name === 'model') return Promise.resolve({ model: modelName });
        return Promise.resolve({});
      });

      const loggerWarnSpy = jest.spyOn(mockLogger, 'warn');
      const result = await service.interactiveEditConfig(baseConfig);

      expect(result.isOk()).toBe(true);
      expect(mockModelListerService.getContextWindowSize).toHaveBeenCalledWith(
        providerName,
        apiKey,
        modelName
      );
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        `Error getting context window size for model ${modelName} via ModelListerService: ${contextWindowError.message}. Will prompt for maxTokens. Using default suggestion: 4096.`
      );
      expect(mockFileOps.writeFile).toHaveBeenCalledWith(
        configPath,
        JSON.stringify(
          expect.objectContaining({
            maxTokens: promptedMaxTokens,
            temperature: promptedTemperature,
          }),
          null,
          2
        )
      );
    });

    it('Test Case 2b: should prompt for maxTokens if getContextWindowSize returns 0', async () => {
      const promptedMaxTokens = 1024;
      const promptedTemperature = 0.22;

      mockModelListerService.getContextWindowSize.mockResolvedValue(Result.ok(0));

      mockInquirer.mockImplementation(async (promptsArg: any) => {
        const prompts = Array.isArray(promptsArg) ? promptsArg : [promptsArg];
        if (
          prompts.length === 2 &&
          prompts.find((p) => p.name === 'temperature') &&
          prompts.find((p) => p.name === 'maxTokens')
        ) {
          return Promise.resolve({
            temperature: promptedTemperature,
            maxTokens: promptedMaxTokens,
          });
        }
        if (prompts[0].name === 'provider') return Promise.resolve({ provider: providerName });
        if (prompts[0].name === 'apiKey') return Promise.resolve({ apiKey: apiKey });
        if (prompts[0].name === 'model') return Promise.resolve({ model: modelName });
        return Promise.resolve({});
      });
      const loggerWarnSpy = jest.spyOn(mockLogger, 'warn');
      const result = await service.interactiveEditConfig(baseConfig);

      expect(result.isOk()).toBe(true);
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        `ModelListerService returned context window size 0 or less for model ${modelName}. Will prompt for maxTokens. Using default suggestion: 4096.`
      );
      expect(mockFileOps.writeFile).toHaveBeenCalledWith(
        configPath,
        JSON.stringify(
          expect.objectContaining({
            maxTokens: promptedMaxTokens,
            temperature: promptedTemperature,
          }),
          null,
          2
        )
      );
    });
  });
});
