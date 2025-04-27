/* eslint-disable @typescript-eslint/unbound-method */
import { ProjectConfigService } from '../../../src/core/config/project-config.service';
import { IFileOperations } from '../../../src/core/file-operations/interfaces';
import { Result } from '../../../src/core/result/result';
import type { ProjectConfig } from '../../../types/shared';

describe('ProjectConfigService', () => {
  let service: ProjectConfigService;
  let mockFileOps: jest.Mocked<IFileOperations>;
  let configPath: string;

  const defaultConfig: ProjectConfig = {
    name: 'default-project',
    baseDir: '.',
    rootDir: '.roo',
    generators: [],
    description: 'Default project configuration.',
  };

  beforeEach(() => {
    jest.resetAllMocks();

    // Set the config path to match what the service will use
    configPath = `${process.cwd()}/roocode-config.json`;

    mockFileOps = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      createDirectory: jest.fn(),
      readDir: jest.fn(),
      exists: jest.fn(),
      isDirectory: jest.fn(),
      normalizePath: jest.fn((p) => p),
      validatePath: jest.fn((_path: string) => true),
      copyDirectoryRecursive: jest.fn().mockResolvedValue(Result.ok(undefined)),
    };

    service = new ProjectConfigService(mockFileOps);
  });

  describe('loadConfig', () => {
    it('should load config from file when it exists', async () => {
      const testConfig: ProjectConfig = {
        name: 'test-project',
        baseDir: './src',
        rootDir: '.roo',
        generators: ['memory-bank', 'rules'],
        description: 'Test project configuration',
      };

      mockFileOps.readFile.mockResolvedValue(Result.ok(JSON.stringify(testConfig)));

      const result = await service.loadConfig();

      expect(result.isOk()).toBe(true);
      expect(result.value).toEqual(testConfig);
      expect(mockFileOps.readFile).toHaveBeenCalledWith(configPath);
    });

    it('should return default config when file does not exist', async () => {
      mockFileOps.readFile.mockResolvedValue(Result.err(new Error('File not found')));

      const result = await service.loadConfig();

      expect(result.isOk()).toBe(true);
      expect(result.value).toEqual(
        expect.objectContaining({
          name: 'default-project',
          baseDir: '.',
          rootDir: '.roo',
        })
      );
      expect(mockFileOps.readFile).toHaveBeenCalledWith(configPath);
    });

    it('should return error when file exists but contains invalid JSON', async () => {
      mockFileOps.readFile.mockResolvedValue(Result.ok('invalid json'));

      const result = await service.loadConfig();

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain('Failed to parse config');
    });

    it('should return error when config validation fails', async () => {
      const invalidConfig = {
        // Missing required fields
        name: 'test-project',
      };

      mockFileOps.readFile.mockResolvedValue(Result.ok(JSON.stringify(invalidConfig)));

      const result = await service.loadConfig();

      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('Invalid config');
    });

    it('should handle unexpected errors during loading', async () => {
      mockFileOps.readFile.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await service.loadConfig();

      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('Unexpected error');
    });
  });

  describe('validateConfig', () => {
    it('should return null for valid config', () => {
      const validConfig: ProjectConfig = {
        name: 'test-project',
        baseDir: './src',
        rootDir: '.roo',
        generators: [],
      };

      const result = service.validateConfig(validConfig);

      expect(result).toBeNull();
    });

    it('should return error message when name is missing', () => {
      const invalidConfig = {
        baseDir: './src',
        rootDir: '.roo',
        generators: [],
      } as unknown as ProjectConfig;

      const result = service.validateConfig(invalidConfig);

      expect(result).toContain("Missing or invalid 'name'");
    });

    it('should return error message when baseDir is missing', () => {
      const invalidConfig = {
        name: 'test-project',
        rootDir: '.roo',
        generators: [],
      } as unknown as ProjectConfig;

      const result = service.validateConfig(invalidConfig);

      expect(result).toContain("Missing or invalid 'baseDir'");
    });

    it('should return error message when rootDir is missing', () => {
      const invalidConfig = {
        name: 'test-project',
        baseDir: './src',
        generators: [],
      } as unknown as ProjectConfig;

      const result = service.validateConfig(invalidConfig);

      expect(result).toContain("Missing or invalid 'rootDir'");
    });

    it('should return error message when generators is not an array', () => {
      const invalidConfig = {
        name: 'test-project',
        baseDir: './src',
        rootDir: '.roo',
        generators: 'not-an-array',
      } as unknown as ProjectConfig;

      const result = service.validateConfig(invalidConfig);

      expect(result).toContain("Missing or invalid 'generators'");
    });
  });

  describe('saveConfig', () => {
    it('should save config to file successfully', async () => {
      const config: ProjectConfig = {
        name: 'test-project',
        baseDir: './src',
        rootDir: '.roo',
        generators: ['memory-bank'],
      };

      mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));

      const result = await service.saveConfig(config);

      expect(result.isOk()).toBe(true);
      expect(mockFileOps.writeFile).toHaveBeenCalledWith(
        configPath,
        JSON.stringify(config, null, 2)
      );
    });

    it('should return error when file write fails', async () => {
      const config: ProjectConfig = defaultConfig;
      const writeError = new Error('Write failed');

      mockFileOps.writeFile.mockResolvedValue(Result.err(writeError));

      const result = await service.saveConfig(config);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(writeError);
    });

    it('should handle unexpected errors during saving', async () => {
      const config: ProjectConfig = defaultConfig;

      mockFileOps.writeFile.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      mockFileOps.writeFile.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await service.saveConfig(config);

      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('Unexpected error');
    });
  });
});
