/* eslint-disable @typescript-eslint/unbound-method */
import type { Question } from 'inquirer';
import 'reflect-metadata';
import './llm-config.service.interactive-edit.test'; // Import the new test file
import { LLMConfigService } from '@core/config/llm-config.service';
import { IFileOperations } from '@core/file-operations/interfaces';
import { IModelListerService } from '@core/llm/interfaces';
import { Result } from '@core/result/result';
import { ILogger } from '@core/services/logger-service';
import { LLMConfig } from 'types/shared';

describe('LLMConfigService', () => {
  let mockFileOps: jest.Mocked<IFileOperations>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockInquirer: jest.Mock;
  let mockModelListerService: jest.Mocked<IModelListerService>;

  beforeEach(() => {
    // Setup mocks
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

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    mockInquirer = jest.fn();

    mockModelListerService = {
      listModelsForProvider: jest.fn(),
    };
  });

  // interactiveEditConfig tests have been moved to a separate file

  let service: LLMConfigService;
  const configPath = `${process.cwd()}/llm.config.json`;
  const validConfig: LLMConfig = {
    provider: 'test-provider',
    apiKey: 'test-key',
    model: 'test-model',
    maxTokens: 1000,
    temperature: 0.5,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Provide the mocked inquirer instance during service creation
    service = new LLMConfigService(mockFileOps, mockLogger, mockInquirer, mockModelListerService);
  });

  // --- validateConfig ---
  describe('validateConfig', () => {
    it('should return null for a valid config', () => {
      expect(service.validateConfig(validConfig)).toBeNull();
    });

    it.each([
      ['provider', { ...validConfig, provider: '' }],
      ['provider', { ...validConfig, provider: '  ' }],
      ['provider', { ...validConfig, provider: undefined as any }],
      ['apiKey', { ...validConfig, apiKey: '' }],
      ['apiKey', { ...validConfig, apiKey: '  ' }],
      ['apiKey', { ...validConfig, apiKey: undefined as any }],
      ['model', { ...validConfig, model: '' }],
      ['model', { ...validConfig, model: '  ' }],
      ['model', { ...validConfig, model: undefined as any }],
    ])('should return error for missing or invalid %s', (field, config) => {
      expect(service.validateConfig(config as LLMConfig)).toContain(
        `Missing or invalid '${field}'`
      );
    });
  });

  // describe('Inquirer DI Injection and Interactive Flow', () => {
  //   // These tests were testing internal implementation details and the mock itself,
  //   // not the service's public behavior correctly after the refactor.
  //   // The tests within 'interactiveEditConfig' cover the actual usage.
  //   it('should call inquirer prompt with expected questions and return answers', async () => {
  //     const questions = [{ type: 'input', name: 'provider', message: 'Enter LLM provider', default: 'openai' }];
  //     const expectedAnswers = { provider: 'openai' };
  //     mockInquirer.mockResolvedValue(expectedAnswers);
  //
  //     // Accessing private member 'inquirer' directly is not ideal test practice.
  //     // const answers = await (service as any).inquirer(questions); // Corrected call if testing private
  //
  //     // Instead, test via public method like interactiveEditConfig
  //     // expect(mockInquirer).toHaveBeenCalledWith(questions);
  //     // expect(answers).toEqual(expectedAnswers);
  //     expect(true).toBe(true); // Placeholder
  //   });
  //
  //   it('should handle prompt rejection gracefully', async () => {
  //     const questions = [{ type: 'input', name: 'provider', message: 'Enter LLM provider', default: 'openai' }];
  //     const error = new Error('Prompt failed');
  //     mockInquirer.mockRejectedValue(error);
  //
  //     // Accessing private member 'inquirer' directly is not ideal test practice.
  //     // await expect((service as any).inquirer(questions)).rejects.toThrow('Prompt failed'); // Corrected call if testing private
  //     expect(true).toBe(true); // Placeholder
  //   });
  // });

  // --- saveConfig ---
  describe('saveConfig', () => {
    it('should successfully save the config file', async () => {
      mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));
      const result = await service.saveConfig(validConfig);

      expect(result.isOk()).toBe(true);
      expect(mockFileOps.writeFile).toHaveBeenCalledWith(
        configPath,
        JSON.stringify(validConfig, null, 2)
      );
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should return error if writeFile fails', async () => {
      const error = new Error('Write failed');
      mockFileOps.writeFile.mockResolvedValue(Result.err(error));
      const result = await service.saveConfig(validConfig);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(error);
      expect(mockFileOps.writeFile).toHaveBeenCalledWith(
        configPath,
        JSON.stringify(validConfig, null, 2)
      );
      expect(mockLogger.error).not.toHaveBeenCalled(); // Error handled by caller
    });

    it('should return error if JSON.stringify fails (unexpected)', async () => {
      const circularConfig: any = {};
      circularConfig.myself = circularConfig; // Create circular reference

      // No need to mock writeFile as stringify will throw
      const result = await service.saveConfig(circularConfig as LLMConfig); // Cast to satisfy type, though it will fail at runtime

      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('circular structure');
      expect(mockFileOps.writeFile).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to save LLM config',
        expect.any(TypeError) // JSON.stringify throws TypeError for circular refs
      );
    });
  });

  // --- loadConfig ---
  describe('loadConfig', () => {
    it('should successfully load and parse a valid config file', async () => {
      mockFileOps.readFile.mockResolvedValue(Result.ok(JSON.stringify(validConfig)));
      const result = await service.loadConfig();

      expect(result.isOk()).toBe(true);
      expect(result.value).toEqual(validConfig);
      expect(mockFileOps.readFile).toHaveBeenCalledWith(configPath);
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should return error if readFile fails', async () => {
      const error = new Error('Read failed');
      mockFileOps.readFile.mockResolvedValue(Result.err(error));
      const result = await service.loadConfig();

      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(error);
      expect(mockFileOps.readFile).toHaveBeenCalledWith(configPath);
      expect(mockLogger.error).not.toHaveBeenCalled(); // Error handled by caller
    });

    it('should return error if JSON parsing fails', async () => {
      mockFileOps.readFile.mockResolvedValue(Result.ok('invalid json'));
      const result = await service.loadConfig();

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Unexpected token'); // JSON parse error message
      expect(mockFileOps.readFile).toHaveBeenCalledWith(configPath);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to load LLM config',
        expect.any(SyntaxError)
      );
    });

    it('should return error if loaded config is invalid', async () => {
      const invalidConfig = { ...validConfig, provider: '' };
      mockFileOps.readFile.mockResolvedValue(Result.ok(JSON.stringify(invalidConfig)));
      const result = await service.loadConfig();

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain("Invalid LLM config: Missing or invalid 'provider'");
      expect(mockFileOps.readFile).toHaveBeenCalledWith(configPath);
      expect(mockLogger.error).not.toHaveBeenCalled(); // Validation error, not load error
    });
  });

  // --- interactiveEditConfig ---
  describe('interactiveEditConfig', () => {
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
    const expectedSavedConfig: LLMConfig = {
      ...baseConfig, // Keep existing maxTokens/temp
      ...userAnswers,
    };

    beforeEach(() => {
      // Reset inquirer mock before each test in this describe block
      mockInquirer.mockReset();
      // Default mock for inquirer to resolve with basic answers
      mockInquirer
        .mockResolvedValueOnce({ provider: userAnswers.provider })
        .mockResolvedValueOnce({ apiKey: userAnswers.apiKey })
        .mockResolvedValueOnce({ model: userAnswers.model })
        .mockResolvedValueOnce({ temperature: baseConfig.temperature }); // Default temperature
    });

    it('should prompt user, update config, and save successfully', async () => {
      mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));
      // Mock provider registry to return a provider that doesn't support listModels
      mockProviderRegistry.getProvider.mockResolvedValue(
        Result.ok({ name: 'new-provider', getCompletion: jest.fn() })
      );

      const result = await service.interactiveEditConfig(baseConfig);

      expect(result.isOk()).toBe(true);
      // Expect prompts for provider, apiKey, model, and temperature
      expect(mockInquirer).toHaveBeenCalledTimes(4);
      // Check if questions passed to prompt match expected structure (basic check)
      const questions = mockInquirer.mock.calls.map((call) => call[0][0]); // Get the first question object from each call
      expect(questions[0].name).toBe('provider');
      expect(questions[1].name).toBe('apiKey');
      expect(questions[2].name).toBe('model');
      expect(questions[3].name).toBe('temperature');

      expect(mockFileOps.writeFile).toHaveBeenCalledWith(
        configPath,
        JSON.stringify(expectedSavedConfig, null, 2)
      );
      expect(mockLogger.error).not.toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('saved successfully'));
    });

    it('should use defaults from baseConfig in prompts', async () => {
      mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));
      // Mock provider registry to return a provider that doesn't support listModels
      mockProviderRegistry.getProvider.mockResolvedValue(
        Result.ok({ name: baseConfig.provider, getCompletion: jest.fn() })
      );

      await service.interactiveEditConfig(baseConfig);

      expect(mockInquirer).toHaveBeenCalledTimes(4);
      const questions = mockInquirer.mock.calls.map((call) => call[0][0]) as Question[];
      expect(questions[0].default).toBe(baseConfig.provider);
      expect(questions[1].default).toBe(baseConfig.apiKey);
      expect(questions[2].default).toBe(baseConfig.model);
      expect(questions[3].default).toBe(baseConfig.temperature);
    });

    it('should use fallback defaults if baseConfig fields are empty', async () => {
      const emptyBaseConfig: LLMConfig = {
        provider: '',
        apiKey: '',
        model: '',
        maxTokens: 1,
        temperature: 1,
      };
      mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));
      // Mock provider registry to return a provider that doesn't support listModels
      mockProviderRegistry.getProvider.mockResolvedValue(
        Result.ok({ name: 'openai', getCompletion: jest.fn() })
      );

      await service.interactiveEditConfig(emptyBaseConfig);

      expect(mockInquirer).toHaveBeenCalledTimes(4);
      const questions = mockInquirer.mock.calls.map((call) => call[0][0]) as Question[];
      expect(questions[0].default).toBe('openai'); // Fallback default
      expect(questions[1].default).toBe(''); // API key has no fallback
      expect(questions[2].default).toBe('gpt-4'); // Fallback default
      expect(questions[3].default).toBe(1); // Default temperature from emptyBaseConfig
    });

    it('should return error if inquirer prompt fails', async () => {
      const promptError = new Error('Inquirer failed');
      // Mock only the first prompt to fail
      mockInquirer.mockRejectedValueOnce(promptError);

      const result = await service.interactiveEditConfig(baseConfig);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(Error); // Expect a new Error wrapping the original
      expect(result.error?.message).toContain('Interactive configuration failed');
      expect(mockFileOps.writeFile).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Configuration failed', // The catch block logs this
        promptError // The original error
      );
    });

    it('should return error if saveConfig fails', async () => {
      const saveError = new Error('Save failed');
      mockFileOps.writeFile.mockResolvedValue(Result.err(saveError));
      // Mock provider registry to return a provider that doesn't support listModels
      mockProviderRegistry.getProvider.mockResolvedValue(
        Result.ok({ name: userAnswers.provider, getCompletion: jest.fn() })
      );

      const result = await service.interactiveEditConfig(baseConfig);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(saveError);
      expect(mockFileOps.writeFile).toHaveBeenCalledWith(
        configPath,
        JSON.stringify(expectedSavedConfig, null, 2)
      );
      expect(mockLogger.error).not.toHaveBeenCalled(); // Error handled by caller
    });

    it('should fetch and list models if provider supports it', async () => {
      const mockModels = ['model-a', 'model-b', 'model-c'];
      const mockProvider = {
        name: 'openai',
        listModels: jest.fn().mockResolvedValue(Result.ok(mockModels)),
        getCompletion: jest.fn(),
      };
      const mockProviderFactory = jest.fn().mockReturnValue(Result.ok(mockProvider));

      // Mock inquirer responses: provider, apiKey, model selection, temperature
      mockInquirer
        .mockResolvedValueOnce({ provider: 'openai' })
        .mockResolvedValueOnce({ apiKey: 'test-key' })
        .mockResolvedValueOnce({ model: 'model-b' }) // User selects model-b
        .mockResolvedValueOnce({ temperature: 0.5 });

      mockProviderRegistry.getProviderFactory.mockReturnValue(Result.ok(mockProviderFactory));
      mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));

      const result = await service.interactiveEditConfig(baseConfig);

      expect(result.isOk()).toBe(true);
      expect(mockInquirer).toHaveBeenCalledTimes(4);
      expect(mockProviderRegistry.getProviderFactory).toHaveBeenCalledWith('openai');
      expect(mockProvider.listModels).toHaveBeenCalled();
      expect(mockFileOps.writeFile).toHaveBeenCalledWith(
        configPath,
        expect.stringContaining('"model": "model-b"')
      );

      const modelPrompt = mockInquirer.mock.calls.find(
        (call) => call[0][0].name === 'model'
      )?.[0][0];
      expect(modelPrompt).toBeDefined();
      expect(modelPrompt.type).toBe('list');
      expect(modelPrompt.choices).toEqual(mockModels);

      const savedConfig = JSON.parse(mockFileOps.writeFile.mock.calls[0][1]);
      expect(savedConfig.model).toBe('model-b');
      expect(savedConfig.provider).toBe('openai');
    });

    it('should handle different provider selection from default', async () => {
      const defaultProvider = 'openai';
      const selectedProvider = 'anthropic';
      const mockModels = ['claude-1', 'claude-2'];
      const mockProvider = {
        name: selectedProvider,
        listModels: jest.fn().mockResolvedValue(Result.ok(mockModels)),
        getCompletion: jest.fn(),
      };
      const mockProviderFactory = jest.fn().mockReturnValue(Result.ok(mockProvider));

      mockInquirer
        .mockResolvedValueOnce({ provider: selectedProvider })
        .mockResolvedValueOnce({ apiKey: 'test-key' })
        .mockResolvedValueOnce({ model: 'claude-2' })
        .mockResolvedValueOnce({ temperature: 0.7 });

      mockProviderRegistry.getProviderFactory.mockReturnValue(Result.ok(mockProviderFactory));
      mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));

      const result = await service.interactiveEditConfig({
        ...baseConfig,
        provider: defaultProvider,
      });

      expect(result.isOk()).toBe(true);
      expect(mockProviderRegistry.getProviderFactory).toHaveBeenCalledWith(selectedProvider);
      expect(mockProvider.listModels).toHaveBeenCalled();

      const savedConfig = JSON.parse(mockFileOps.writeFile.mock.calls[0][1]);
      expect(savedConfig.provider).toBe(selectedProvider);
      expect(savedConfig.model).toBe('claude-2');
    });

    it('should fallback to manual model input if listModels fails', async () => {
      const mockProvider = {
        name: 'openai',
        listModels: jest.fn().mockResolvedValue(Result.err(new Error('API error'))),
        getCompletion: jest.fn(),
      };
      // Mock inquirer responses: provider, apiKey, manual model input, temperature
      mockInquirer
        .mockResolvedValueOnce({ provider: 'openai' })
        .mockResolvedValueOnce({ apiKey: 'test-key' })
        .mockResolvedValueOnce({ model: 'manual-model-input' }) // User provides manual input
        .mockResolvedValueOnce({ temperature: 0.5 });

      mockProviderRegistry.getProvider.mockResolvedValue(Result.ok(mockProvider));
      mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));

      await service.interactiveEditConfig(baseConfig);

      // Expect inquirer to be called 4 times: provider, apiKey, model (input), temperature
      expect(mockInquirer).toHaveBeenCalledTimes(4);
      // Verify listModels was called
      expect(mockProvider.listModels).toHaveBeenCalled();
      // Verify the model prompt was an input type
      const modelPrompt = mockInquirer.mock.calls.find(
        (call) => call[0][0].name === 'model'
      )?.[0][0];
      expect(modelPrompt).toBeDefined();
      expect(modelPrompt.type).toBe('input');
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not fetch models list')
      );

      // Verify the saved config includes the manual model input
      const savedConfig = JSON.parse(mockFileOps.writeFile.mock.calls[0][1]);
      expect(savedConfig.model).toBe('manual-model-input');
    });

    it('should fallback to manual model input if provider does not support listModels', async () => {
      const mockProvider = {
        name: 'unsupported-provider',
        getCompletion: jest.fn(),
        // No listModels method
      };
      // Mock inquirer responses: provider, apiKey, manual model input, temperature
      mockInquirer
        .mockResolvedValueOnce({ provider: 'unsupported-provider' })
        .mockResolvedValueOnce({ apiKey: 'test-key' })
        .mockResolvedValueOnce({ model: 'manual-model-input' }) // User provides manual input
        .mockResolvedValueOnce({ temperature: 0.5 });

      mockProviderRegistry.getProvider.mockResolvedValue(Result.ok(mockProvider));
      mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));

      await service.interactiveEditConfig(baseConfig);

      // Expect inquirer to be called 4 times: provider, apiKey, model (input), temperature
      expect(mockInquirer).toHaveBeenCalledTimes(4);
      // Verify listModels was NOT called on the mockProvider
      expect(mockProvider.getCompletion).not.toHaveBeenCalledWith('listModels'); // Check for listModels call attempt

      // Verify the model prompt was an input type
      const modelPrompt = mockInquirer.mock.calls.find(
        (call) => call[0][0].name === 'model'
      )?.[0][0];
      expect(modelPrompt).toBeDefined();
      expect(modelPrompt.type).toBe('input');
      // No warning should be logged if listModels is simply not present
      expect(mockLogger.warn).not.toHaveBeenCalled();

      // Verify the saved config includes the manual model input
      const savedConfig = JSON.parse(mockFileOps.writeFile.mock.calls[0][1]);
      expect(savedConfig.model).toBe('manual-model-input');
    });

    it('should fallback to manual model input if listModels returns empty array', async () => {
      const mockProvider = {
        name: 'openai',
        listModels: jest.fn().mockResolvedValue(Result.ok([])), // Empty array
        getCompletion: jest.fn(),
      };
      // Mock inquirer responses: provider, apiKey, manual model input, temperature
      mockInquirer
        .mockResolvedValueOnce({ provider: 'openai' })
        .mockResolvedValueOnce({ apiKey: 'test-key' })
        .mockResolvedValueOnce({ model: 'manual-model-input' }) // User provides manual input
        .mockResolvedValueOnce({ temperature: 0.5 });

      mockProviderRegistry.getProvider.mockResolvedValue(Result.ok(mockProvider));
      mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));

      await service.interactiveEditConfig(baseConfig);

      // Expect inquirer to be called 4 times: provider, apiKey, model (input), temperature
      expect(mockInquirer).toHaveBeenCalledTimes(4);
      // Verify listModels was called
      expect(mockProvider.listModels).toHaveBeenCalled();
      // Verify the model prompt was an input type
      const modelPrompt = mockInquirer.mock.calls.find(
        (call) => call[0][0].name === 'model'
      )?.[0][0];
      expect(modelPrompt).toBeDefined();
      expect(modelPrompt.type).toBe('input');
      // No warning should be logged for empty list, only for errors
      expect(mockLogger.warn).not.toHaveBeenCalled();

      // Verify the saved config includes the manual model input
      const savedConfig = JSON.parse(mockFileOps.writeFile.mock.calls[0][1]);
      expect(savedConfig.model).toBe('manual-model-input');
    });

    // Test prompt validation functions
    describe('Interactive Prompt Validation', () => {
      let questions: any[]; // Type properly if possible

      beforeEach(async () => {
        // Call once to get the questions structure
        // Mock inquirer responses to get through the flow and capture questions
        mockInquirer
          .mockResolvedValueOnce({ provider: 'openai' })
          .mockResolvedValueOnce({ apiKey: 'test-key' })
          .mockResolvedValueOnce({ model: 'gpt-4' })
          .mockResolvedValueOnce({ temperature: 0.1 });

        // Mock provider registry to avoid model listing issues
        mockProviderRegistry.getProvider.mockResolvedValue(
          Result.ok({ name: 'openai', getCompletion: jest.fn() })
        );
        mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));

        await service.interactiveEditConfig(baseConfig);
        // Capture all calls to inquirer.prompt
        questions = mockInquirer.mock.calls.map((call) => call[0][0]);
      });

      it('should validate provider input', () => {
        const validate = questions.find((q: any) => q.name === 'provider')?.validate;
        expect(validate).toBeDefined();
        expect(validate('test')).toBe(true);
        expect(validate('')).toBe('Provider selection is required');
        expect(validate('  ')).toBe('Provider selection is required');
      });

      it('should validate apiKey input', () => {
        const validate = questions.find((q: any) => q.name === 'apiKey')?.validate;
        expect(validate).toBeDefined();
        expect(validate('test')).toBe(true);
        expect(validate('a-valid-key_1.2')).toBe(true); // Test regex
        expect(validate('')).toBe('API key is required');
        expect(validate('  ')).toBe('API key is required');
        expect(validate('invalid@key')).toBe('Invalid API key format'); // Test regex
        expect(validate('key with spaces')).toBe('Invalid API key format'); // Test regex
      });

      it('should validate model input (manual fallback)', async () => {
        // Need to trigger the manual model input path
        mockInquirer.mockReset(); // Reset mocks
        mockInquirer
          .mockResolvedValueOnce({ provider: 'unsupported-provider' }) // Select provider that doesn't list models
          .mockResolvedValueOnce({ apiKey: 'test-key' })
          .mockResolvedValueOnce({ model: 'manual-model' }) // Manual input
          .mockResolvedValueOnce({ temperature: 0.1 });

        mockProviderRegistry.getProvider.mockResolvedValue(
          Result.ok({ name: 'unsupported-provider', getCompletion: jest.fn() })
        );
        mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));

        await service.interactiveEditConfig(baseConfig);
        const questionsManual = mockInquirer.mock.calls.map((call) => call[0][0]);

        const validate = questionsManual.find((q: any) => q.name === 'model')?.validate;
        expect(validate).toBeDefined();
        expect(validate('test-model')).toBe(true);
        expect(validate('')).toBe('Model name is required');
        expect(validate('  ')).toBe('Model name is required');
      });

      it('should validate temperature input', () => {
        const validate = questions.find((q: any) => q.name === 'temperature')?.validate;
        expect(validate).toBeDefined();
        expect(validate(0)).toBe(true);
        expect(validate(1)).toBe(true);
        expect(validate(2)).toBe(true);
        expect(validate(0.5)).toBe(true);
        expect(validate(-0.1)).toBe('Temperature must be between 0 and 2');
        expect(validate(2.1)).toBe('Temperature must be between 0 and 2');
        expect(validate('abc')).toBe('Temperature must be between 0 and 2'); // Inquirer number type handles non-numeric, but validate should catch range
      });
    });
  });
});
