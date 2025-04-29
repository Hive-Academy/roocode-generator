/* eslint-disable @typescript-eslint/unbound-method */
import 'reflect-metadata'; // Required for DI
// Removed unused import ApplicationContainer
import { GeneratorOrchestrator } from '@/core/application/generator-orchestrator';
import { IGeneratorOrchestrator } from '@/core/application/interfaces';
import { ProjectConfigService } from '@/core/config/project-config.service';
// Removed unused import IProjectConfigService
import { ILogger } from '@/core/services/logger-service';

// Removed unused import ApplicationContainer
import { IGenerator } from '@/core/generators/base-generator';
import { Result } from '@/core/result/result';
import { IFileOperations } from '@/core/file-operations/interfaces'; // Import IFileOperations
import { ProjectConfig } from '../../../types/shared'; // Keep this for type definition

// Define the default config matching the service's private property
const testDefaultConfig: ProjectConfig = {
  name: 'default-project',
  baseDir: '.',
  rootDir: '.roo',
  generators: [],
  description: 'Default project configuration.',
};

// Mocks
const mockLogger: jest.Mocked<ILogger> = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock IFileOperations (needed by ProjectConfigService constructor, though not used by loadConfig)
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

const mockGenerator1: jest.Mocked<IGenerator<unknown>> = {
  name: 'mock-generator-1',
  generate: jest.fn().mockResolvedValue(Result.ok('Generator 1 success')),
  validate: jest.fn().mockResolvedValue(Result.ok(undefined)), // Add missing validate mock
};

const mockGenerator2: jest.Mocked<IGenerator<unknown>> = {
  name: 'mock-generator-2',
  generate: jest.fn().mockResolvedValue(Result.ok('Generator 2 success')),
  validate: jest.fn().mockResolvedValue(Result.ok(undefined)), // Add missing validate mock
};

describe('GeneratorOrchestrator Integration Test', () => {
  let orchestrator: IGeneratorOrchestrator;
  let projectConfigServiceInstance: ProjectConfigService; // Hold the instance for spying

  beforeEach(() => {
    jest.clearAllMocks();

    // Manually instantiate ProjectConfigService with mocks
    projectConfigServiceInstance = new ProjectConfigService(mockFileOps, mockLogger);

    // Instantiate GeneratorOrchestrator with mocks and the ProjectConfigService instance
    const generators = [mockGenerator1, mockGenerator2];
    orchestrator = new GeneratorOrchestrator(generators, projectConfigServiceInstance, mockLogger);
  });

  it('should load default config from ProjectConfigService and execute generators', async () => {
    const selectedGenerators = ['mock-generator-1']; // Select one generator to run

    // Act
    await orchestrator.execute(selectedGenerators);

    // Assert
    // 1. Verify ProjectConfigService logged the use of default config
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Using in-memory default roocode-config.json configuration.'
    );

    // 2. Verify the orchestrator logged the start and success messages
    expect(mockLogger.info).toHaveBeenCalledWith(
      `Executing generators: ${selectedGenerators.join(', ')}`
    );
    expect(mockLogger.info).toHaveBeenCalledWith(`Executing generator: ${selectedGenerators[0]}`);
    expect(mockLogger.info).toHaveBeenCalledWith('All selected generators executed successfully.');

    // 3. Verify the selected generator was called with the default config
    expect(mockGenerator1.generate).toHaveBeenCalledTimes(1);
    expect(mockGenerator1.generate).toHaveBeenCalledWith(
      testDefaultConfig, // Compare against the known default config defined in the test
      [process.cwd()] // Default context path
    );

    // 4. Verify the unselected generator was not called
    expect(mockGenerator2.generate).not.toHaveBeenCalled();

    // 5. Verify no errors were logged by the orchestrator itself regarding config loading
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should handle error if ProjectConfigService loadConfig fails (hypothetical)', async () => {
    const configError = new Error('Failed to load config');
    // Mock loadConfig to return an error (it's synchronous now)
    jest
      .spyOn(projectConfigServiceInstance, 'loadConfig')
      .mockReturnValueOnce(Result.err(configError));

    // Act & Assert
    // The execute method catches the error from loadConfig and throws it
    await expect(orchestrator.execute(['mock-generator-1'])).rejects.toThrow(configError);

    // Verify error logging
    expect(mockLogger.error).toHaveBeenCalledWith(
      `Failed to load project config: ${configError.message}`,
      configError
    );
    expect(mockGenerator1.generate).not.toHaveBeenCalled();
  });
});
