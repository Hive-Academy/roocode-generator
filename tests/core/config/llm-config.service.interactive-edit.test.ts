/* eslint-disable @typescript-eslint/unbound-method */
import { LLMConfigService } from '../../../src/core/config/llm-config.service';
import { IFileOperations } from '../../../src/core/file-operations/interfaces';
import { ILLMProviderRegistry, ILLMProvider } from '../../../src/core/llm/interfaces';
import { Result } from '../../../src/core/result/result';
import { ILogger } from '../../../src/core/services/logger-service';
import { LLMConfig } from '../../../types/shared';
import type { Question } from 'inquirer';

describe('LLMConfigService - interactiveEditConfig', () => {
  let service: LLMConfigService;
  let mockFileOps: jest.Mocked<IFileOperations>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockInquirer: jest.Mock;
  let mockProviderRegistry: jest.Mocked<ILLMProviderRegistry>;
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

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    mockInquirer = jest.fn();

    mockProviderRegistry = {
      getProvider: jest.fn(),
      getProviderFactory: jest.fn(),
    };

    service = new LLMConfigService(
      mockFileOps,
      mockLogger,
      mockInquirer as any,
      mockProviderRegistry
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

  const expectedSavedConfig: LLMConfig = {
    ...baseConfig,
    ...userAnswers,
  };

  beforeEach(() => {
    mockInquirer.mockReset();
    mockInquirer
      .mockResolvedValueOnce({ provider: userAnswers.provider })
      .mockResolvedValueOnce({ apiKey: userAnswers.apiKey })
      .mockResolvedValueOnce({ model: userAnswers.model })
      .mockResolvedValueOnce({ temperature: baseConfig.temperature });
  });

  it('should prompt user, update config, and save successfully', async () => {
    const mockProvider: ILLMProvider = {
      name: 'new-provider',
      getCompletion: jest.fn(),
      listModels: jest.fn().mockResolvedValue(Result.ok(['model-1', 'model-2', 'new-model'])),
    };
    const mockProviderFactory = jest.fn().mockReturnValue(Result.ok(mockProvider));
    mockProviderRegistry.getProviderFactory.mockReturnValue(Result.ok(mockProviderFactory));
    mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));

    const result = await service.interactiveEditConfig(baseConfig);

    expect(result.isOk()).toBe(true);
    expect(mockInquirer).toHaveBeenCalledTimes(4);
    const questions = mockInquirer.mock.calls.map((call) => call[0][0]);
    expect(questions[0].name).toBe('provider');
    expect(questions[1].name).toBe('apiKey');
    expect(questions[2].name).toBe('model');
    expect(questions[3].name).toBe('temperature');

    expect(() => mockProviderRegistry.getProviderFactory).toHaveBeenCalledWith('new-provider');
    expect(() => mockProvider.listModels).toHaveBeenCalled();
    expect(() => mockFileOps.writeFile).toHaveBeenCalledWith(
      configPath,
      JSON.stringify(expectedSavedConfig, null, 2)
    );
    expect(() => mockLogger.error).not.toHaveBeenCalled();
    expect(() => mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('saved successfully')
    );
  });

  it('should use defaults from baseConfig in prompts', async () => {
    const mockProvider: ILLMProvider = {
      name: baseConfig.provider,
      getCompletion: jest.fn(),
      listModels: jest.fn().mockResolvedValue(Result.ok(['old-model', 'other-model'])),
    };
    const mockProviderFactory = jest.fn().mockReturnValue(Result.ok(mockProvider));
    mockProviderRegistry.getProviderFactory.mockReturnValue(Result.ok(mockProviderFactory));
    mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));

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
    const mockProvider: ILLMProvider = {
      name: 'openai',
      getCompletion: jest.fn(),
      listModels: jest.fn().mockResolvedValue(Result.ok(['gpt-3.5-turbo', 'gpt-4'])),
    };
    const mockProviderFactory = jest.fn().mockReturnValue(Result.ok(mockProvider));
    mockProviderRegistry.getProviderFactory.mockReturnValue(Result.ok(mockProviderFactory));
    mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));

    await service.interactiveEditConfig(emptyBaseConfig);

    expect(mockInquirer).toHaveBeenCalledTimes(4);
    const questions = mockInquirer.mock.calls.map((call) => call[0][0]) as Question[];
    expect(questions[0].default).toBe('openai');
    expect(questions[1].default).toBe('');
    expect(questions[2].default).toBe('gpt-4');
    expect(questions[3].default).toBe(1);
  });

  it('should return error if inquirer prompt fails', async () => {
    const promptError = new Error('Inquirer failed');
    mockInquirer.mockRejectedValueOnce(promptError);

    const result = await service.interactiveEditConfig(baseConfig);

    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toContain('Interactive configuration failed');
    expect(() => mockFileOps.writeFile).not.toHaveBeenCalled();
    expect(() => mockLogger.error).toHaveBeenCalledWith('Configuration failed', promptError);
  });

  it('should return error if saveConfig fails', async () => {
    const saveError = new Error('Save failed');
    const mockProvider: ILLMProvider = {
      name: userAnswers.provider,
      getCompletion: jest.fn(),
      listModels: jest.fn().mockResolvedValue(Result.ok(['new-model', 'other-model'])),
    };
    const mockProviderFactory = jest.fn().mockReturnValue(Result.ok(mockProvider));
    mockProviderRegistry.getProviderFactory.mockReturnValue(Result.ok(mockProviderFactory));
    mockFileOps.writeFile.mockResolvedValue(Result.err(saveError));

    const result = await service.interactiveEditConfig(baseConfig);

    expect(result.isErr()).toBe(true);
    expect(result.error).toBe(saveError);
    expect(() => mockFileOps.writeFile).toHaveBeenCalledWith(
      configPath,
      JSON.stringify(expectedSavedConfig, null, 2)
    );
    expect(() => mockLogger.error).not.toHaveBeenCalled();
  });

  it('should fetch and list models if provider supports it', async () => {
    const mockModels = ['model-a', 'model-b', 'model-c'];
    const mockProvider: ILLMProvider = {
      name: 'openai',
      listModels: jest.fn().mockResolvedValue(Result.ok(mockModels)),
      getCompletion: jest.fn(),
    };
    const mockProviderFactory = jest.fn().mockReturnValue(Result.ok(mockProvider));

    mockInquirer
      .mockResolvedValueOnce({ provider: 'openai' })
      .mockResolvedValueOnce({ apiKey: 'test-key' })
      .mockResolvedValueOnce({ model: 'model-b' })
      .mockResolvedValueOnce({ temperature: 0.5 });

    mockProviderRegistry.getProviderFactory.mockReturnValue(Result.ok(mockProviderFactory));
    mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));

    await service.interactiveEditConfig(baseConfig);

    expect(mockInquirer).toHaveBeenCalledTimes(4);
    expect(() => mockProviderRegistry.getProviderFactory).toHaveBeenCalledWith('openai');
    expect(() => mockProvider.listModels).toHaveBeenCalled();
    expect(() => mockFileOps.writeFile).toHaveBeenCalledWith(
      configPath,
      expect.stringContaining('"model": "model-b"')
    );
  });

  it('should handle error when getProviderFactory fails', async () => {
    mockProviderRegistry.getProviderFactory.mockReturnValue(Result.err(new Error('Factory error')));

    mockInquirer
      .mockResolvedValueOnce({ provider: 'openai' })
      .mockResolvedValueOnce({ apiKey: 'test-key' })
      .mockResolvedValueOnce({ model: 'manual-model' })
      .mockResolvedValueOnce({ temperature: 0.5 });

    mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));

    await service.interactiveEditConfig(baseConfig);

    expect(mockInquirer).toHaveBeenCalledTimes(4);
    expect(() => mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Could not fetch available models')
    );
    expect(() => mockFileOps.writeFile).toHaveBeenCalledWith(
      configPath,
      expect.stringContaining('"model": "manual-model"')
    );
  });

  it('should handle scenario where selected provider differs from default', async () => {
    const defaultProvider: ILLMProvider = {
      name: 'old-provider',
      getCompletion: jest.fn(),
      listModels: jest.fn().mockResolvedValue(Result.ok(['old-model-1', 'old-model-2'])),
    };
    const newProvider: ILLMProvider = {
      name: 'new-provider',
      getCompletion: jest.fn(),
      listModels: jest.fn().mockResolvedValue(Result.ok(['new-model-1', 'new-model-2'])),
    };
    const defaultProviderFactory = jest.fn().mockReturnValue(Result.ok(defaultProvider));
    const newProviderFactory = jest.fn().mockReturnValue(Result.ok(newProvider));

    mockProviderRegistry.getProviderFactory
      .mockReturnValueOnce(Result.ok(defaultProviderFactory))
      .mockReturnValueOnce(Result.ok(newProviderFactory));

    mockInquirer
      .mockResolvedValueOnce({ provider: 'new-provider' })
      .mockResolvedValueOnce({ apiKey: 'new-key' })
      .mockResolvedValueOnce({ model: 'new-model-2' })
      .mockResolvedValueOnce({ temperature: 0.7 });

    mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));

    const result = await service.interactiveEditConfig(baseConfig);

    expect(result.isOk()).toBe(true);
    expect(() => mockProviderRegistry.getProviderFactory).toHaveBeenCalledTimes(2);
    expect(() => mockProviderRegistry.getProviderFactory).toHaveBeenNthCalledWith(
      1,
      'old-provider'
    );
    expect(() => mockProviderRegistry.getProviderFactory).toHaveBeenNthCalledWith(
      2,
      'new-provider'
    );
    expect(() => newProvider.listModels).toHaveBeenCalled();
    expect(() => defaultProvider.listModels).not.toHaveBeenCalled();
    expect(() => mockFileOps.writeFile).toHaveBeenCalledWith(
      configPath,
      expect.stringContaining('"provider": "new-provider"')
    );
    expect(() => mockFileOps.writeFile).toHaveBeenCalledWith(
      configPath,
      expect.stringContaining('"model": "new-model-2"')
    );
  });
});
