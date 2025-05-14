/* eslint-disable @typescript-eslint/unbound-method */
import 'reflect-metadata';
import './llm-config.service.interactive-edit.test'; // Import the new test file
import { LLMConfigService } from '../../../src/core/config/llm-config.service'; // Relative path
import { IFileOperations } from '../../../src/core/file-operations/interfaces'; // Relative path
import { IModelListerService } from '../../../src/core/llm/interfaces'; // Relative path
import { Result } from '../../../src/core/result/result'; // Relative path
import { ILogger } from '../../../src/core/services/logger-service'; // Relative path
import { createMockLogger } from '../../__mocks__/logger.mock'; // Import mock factory
import { LLMConfig } from '../../../types/shared'; // Relative path
// import { LLMProviderRegistry } from '../../../src/core/llm/provider-registry'; // No longer needed here

describe('LLMConfigService', () => {
  let mockFileOps: jest.Mocked<IFileOperations>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockInquirer: jest.Mock;
  let mockModelListerService: jest.Mocked<IModelListerService>;
  // let mockLLMProviderRegistry: jest.Mocked<LLMProviderRegistry>; // Removed

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

    mockLogger = createMockLogger();

    mockInquirer = jest.fn();

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
    service = new LLMConfigService(
      mockFileOps,
      mockLogger,
      mockInquirer,
      mockModelListerService
      // mockLLMProviderRegistry // Removed
    );
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

  // describe('Inquirer DI Injection and Interactive Flow', () => { // Commented out as per original
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
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should return error if JSON.stringify fails (unexpected)', async () => {
      const circularConfig: any = {};
      circularConfig.myself = circularConfig;

      const result = await service.saveConfig(circularConfig as LLMConfig);

      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('circular structure');
      expect(mockFileOps.writeFile).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to save LLM config',
        expect.any(TypeError)
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
      expect(mockLogger.error).not.toHaveBeenCalled();
    });

    it('should return error if JSON parsing fails', async () => {
      mockFileOps.readFile.mockResolvedValue(Result.ok('invalid json'));
      const result = await service.loadConfig();

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Unexpected token');
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
      expect(mockLogger.error).not.toHaveBeenCalled();
    });
  });
});
