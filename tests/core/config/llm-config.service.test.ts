/* eslint-disable @typescript-eslint/unbound-method */
import { createPromptModule } from 'inquirer';
import { LLMConfigService } from '../../../src/core/config/llm-config.service';
import { IFileOperations } from '../../../src/core/file-operations/interfaces';
import { Result } from '../../../src/core/result/result';
import { ILogger } from '../../../src/core/services/logger-service';
import { LLMConfig } from '../../../types/shared';

// Mocks
const mockFileOps: jest.Mocked<IFileOperations> = {
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

const mockLogger: jest.Mocked<ILogger> = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}; // Fixed missing brace and removed setLogLevel

// Mock inquirer instance and its prompt method
const mockInquirer = {
  prompt: jest.fn(),
};
// Cast to the expected type, assuming createPromptModule returns something compatible
const mockInquirerInstance = mockInquirer as unknown as ReturnType<typeof createPromptModule>;

describe('LLMConfigService', () => {
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
    service = new LLMConfigService(mockFileOps, mockLogger, mockInquirerInstance);
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

    it('should prompt user, update config, and save successfully', async () => {
      mockInquirer.prompt.mockResolvedValue(userAnswers);
      mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));

      const result = await service.interactiveEditConfig(baseConfig);

      expect(result.isOk()).toBe(true);
      expect(mockInquirer.prompt).toHaveBeenCalledTimes(1);
      // Check if questions passed to prompt match expected structure (basic check)
      expect(mockInquirer.prompt.mock.calls[0][0]).toHaveLength(3); // provider, apiKey, model
      expect(mockInquirer.prompt.mock.calls[0][0][0].name).toBe('provider');
      expect(mockInquirer.prompt.mock.calls[0][0][1].name).toBe('apiKey');
      expect(mockInquirer.prompt.mock.calls[0][0][2].name).toBe('model');

      expect(mockFileOps.writeFile).toHaveBeenCalledWith(
        configPath,
        JSON.stringify(expectedSavedConfig, null, 2)
      );
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should use defaults from baseConfig in prompts', async () => {
      mockInquirer.prompt.mockResolvedValue(userAnswers); // Answers don't matter here
      mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));

      await service.interactiveEditConfig(baseConfig);

      expect(mockInquirer.prompt).toHaveBeenCalledTimes(1);
      const questions = mockInquirer.prompt.mock.calls[0][0];
      expect(questions[0].default).toBe(baseConfig.provider);
      expect(questions[1].default).toBe(baseConfig.apiKey);
      expect(questions[2].default).toBe(baseConfig.model);
    });

    it('should use fallback defaults if baseConfig fields are empty', async () => {
      const emptyBaseConfig: LLMConfig = {
        provider: '',
        apiKey: '',
        model: '',
        maxTokens: 1,
        temperature: 1,
      };
      mockInquirer.prompt.mockResolvedValue(userAnswers);
      mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));

      await service.interactiveEditConfig(emptyBaseConfig);

      expect(mockInquirer.prompt).toHaveBeenCalledTimes(1);
      const questions = mockInquirer.prompt.mock.calls[0][0];
      expect(questions[0].default).toBe('openai'); // Fallback default
      expect(questions[1].default).toBe(''); // API key has no fallback
      expect(questions[2].default).toBe('gpt-4'); // Fallback default
    });

    it('should return error if inquirer prompt fails', async () => {
      const promptError = new Error('Inquirer failed');
      mockInquirer.prompt.mockRejectedValue(promptError);

      const result = await service.interactiveEditConfig(baseConfig);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(promptError);
      expect(mockFileOps.writeFile).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed interactive edit of LLM config',
        promptError
      );
    });

    it('should return error if saveConfig fails', async () => {
      const saveError = new Error('Save failed');
      mockInquirer.prompt.mockResolvedValue(userAnswers);
      mockFileOps.writeFile.mockResolvedValue(Result.err(saveError));

      const result = await service.interactiveEditConfig(baseConfig);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(saveError);
      expect(mockFileOps.writeFile).toHaveBeenCalledWith(
        configPath,
        JSON.stringify(expectedSavedConfig, null, 2)
      );
      expect(mockLogger.error).not.toHaveBeenCalled(); // Error handled by caller
    });

    // Test prompt validation functions
    describe('Interactive Prompt Validation', () => {
      let questions: any[]; // Type properly if possible

      beforeEach(async () => {
        // Call once to get the questions structure
        mockInquirer.prompt.mockResolvedValue(userAnswers);
        mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));
        await service.interactiveEditConfig(baseConfig);
        questions = mockInquirer.prompt.mock.calls[0][0];
      });

      it('should validate provider input', () => {
        const validate = questions.find((q: any) => q.name === 'provider')?.validate;
        expect(validate('test')).toBe(true);
        expect(validate('')).toBe('Provider name is required and cannot be empty.');
        expect(validate('  ')).toBe('Provider name is required and cannot be empty.');
      });

      it('should validate apiKey input', () => {
        const validate = questions.find((q: any) => q.name === 'apiKey')?.validate;
        expect(validate('test')).toBe(true);
        expect(validate('')).toBe('API Key is required and cannot be empty.');
        expect(validate('  ')).toBe('API Key is required and cannot be empty.');
      });

      it('should validate model input', () => {
        const validate = questions.find((q: any) => q.name === 'model')?.validate;
        expect(validate('test')).toBe(true);
        expect(validate('')).toBe('Model name is required and cannot be empty.');
        expect(validate('  ')).toBe('Model name is required and cannot be empty.');
      });
    });
  });
});
