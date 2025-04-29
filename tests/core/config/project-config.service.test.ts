/* eslint-disable @typescript-eslint/unbound-method */
import { ProjectConfigService } from '../../../src/core/config/project-config.service';
import { IFileOperations } from '../../../src/core/file-operations/interfaces';
import { Result } from '../../../src/core/result/result';
import type { ProjectConfig } from '../../../types/shared';
import { ILogger } from '@core/services/logger-service'; // Added missing import

describe('ProjectConfigService', () => {
  let service: ProjectConfigService;
  let mockFileOps: jest.Mocked<IFileOperations>;
  let mockLogger: jest.Mocked<ILogger>; // Added missing declaration
  let configPath: string;

  // Renamed to expectedDefaultConfig for clarity in tests
  const expectedDefaultConfig: ProjectConfig = {
    name: 'default-project',
    baseDir: '.',
    rootDir: '.roo',
    generators: [],
    description: 'Default project configuration.',
  };

  beforeEach(() => {
    jest.resetAllMocks();

    // Set the config path (though not used by loadConfig anymore)
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

    // Mock the logger - Corrected initialization
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    // Instantiate service with mocked dependencies - Corrected instantiation
    service = new ProjectConfigService(mockFileOps, mockLogger);
  });

  describe('loadConfig', () => {
    it('should always return the in-memory default config', () => {
      const result = service.loadConfig();

      expect(result.isOk()).toBe(true);
      // Compare with the expected structure defined above - Corrected variable name
      expect(result.value).toEqual(expectedDefaultConfig);
    });

    it('should log an info message when returning the default config', () => {
      service.loadConfig();

      expect(mockLogger.info).toHaveBeenCalledTimes(1);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Using in-memory default roocode-config.json configuration.'
      );
    });

    it('should not attempt any file system read operations', () => {
      service.loadConfig();

      expect(mockFileOps.readFile).not.toHaveBeenCalled();
      expect(mockFileOps.exists).not.toHaveBeenCalled(); // Ensure no existence checks either
    });

    it('should return an error if an unexpected issue occurs (e.g., logger fails)', () => {
      const unexpectedError = new Error('Logger failed');
      mockLogger.info.mockImplementation(() => {
        throw unexpectedError;
      });

      const result = service.loadConfig();

      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(unexpectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Unexpected error loading default config: ${unexpectedError.message}`
      );
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
      const config: ProjectConfig = expectedDefaultConfig; // Use correct variable
      const writeError = new Error('Write failed');

      mockFileOps.writeFile.mockResolvedValue(Result.err(writeError));

      const result = await service.saveConfig(config);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(writeError);
    });

    it('should handle unexpected errors during saving', async () => {
      const config: ProjectConfig = expectedDefaultConfig; // Use correct variable

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
