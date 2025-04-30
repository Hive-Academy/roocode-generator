/* eslint-disable @typescript-eslint/unbound-method */
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
});
