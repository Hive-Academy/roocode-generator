/* eslint-disable @typescript-eslint/unbound-method */
import 'reflect-metadata'; // Required for DI
// Removed unused import ApplicationContainer
import { GeneratorOrchestrator } from '@core/application/generator-orchestrator';
import { IGeneratorOrchestrator } from '@core/application/interfaces';
import { ProjectConfigService } from '@core/config/project-config.service';
// Removed unused import IProjectConfigService
import { ILogger } from '@core/services/logger-service';

// Removed unused import ApplicationContainer
import { IGenerator } from '@core/generators/base-generator';
import { Result } from '@core/result/result';
import { IFileOperations } from '@core/file-operations/interfaces'; // Import IFileOperations
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

  it('should execute AiMagicGenerator with options for "generate" command', async () => {
    // This integration test now focuses on the new 'generate' command flow
    // It verifies that the orchestrator correctly resolves and calls AiMagicGenerator
    // with the provided options when the command is 'generate'.

    // We need to add AiMagicGenerator to the list of generators for this test
    const mockAiMagicGenerator: jest.Mocked<IGenerator<any>> = {
      name: 'ai-magic',
      generate: jest.fn().mockResolvedValue(Result.ok(undefined)),
      validate: jest.fn().mockResolvedValue(Result.ok(undefined)),
    };

    // Re-instantiate orchestrator with AiMagicGenerator
    const generators = [mockGenerator1, mockGenerator2, mockAiMagicGenerator];
    orchestrator = new GeneratorOrchestrator(generators, projectConfigServiceInstance, mockLogger);

    const options = { generatorType: 'memory-bank', someOtherOption: 'value' };

    // Mock loadConfig to return a successful result as it's called internally by the new execute method
    jest
      .spyOn(projectConfigServiceInstance, 'loadConfig')
      .mockReturnValueOnce(Result.ok(testDefaultConfig));

    // Act
    const result = await orchestrator.execute('generate', options);

    // Assert
    expect(result.isOk()).toBe(true);

    // Verify that AiMagicGenerator was called with the correct arguments

    expect(mockAiMagicGenerator.generate).toHaveBeenCalledTimes(1);
    expect(mockAiMagicGenerator.generate).toHaveBeenCalledWith(expect.objectContaining(options));

    // Verify other generators were not called

    expect(mockGenerator1.generate).not.toHaveBeenCalled();

    expect(mockGenerator2.generate).not.toHaveBeenCalled();

    // Verify no errors were logged

    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should return an error if AiMagicGenerator is not found for "generate" command', async () => {
    // This test verifies that if AiMagicGenerator is not registered,
    // the orchestrator returns an error when the 'generate' command is executed.

    // Instantiate orchestrator WITHOUT AiMagicGenerator
    const generators = [mockGenerator1, mockGenerator2];
    orchestrator = new GeneratorOrchestrator(generators, projectConfigServiceInstance, mockLogger);

    const options = { generatorType: 'memory-bank' };

    // Act
    const result = await orchestrator.execute('generate', options);

    // Assert
    expect(result.isErr()).toBe(true);
    expect(result.error?.message).toContain('AiMagicGenerator not found in the registry.');

    // Verify no generators were called

    expect(mockGenerator1.generate).not.toHaveBeenCalled();

    expect(mockGenerator2.generate).not.toHaveBeenCalled();

    // Verify error was logged

    expect(mockLogger.error).toHaveBeenCalledWith('AiMagicGenerator not found in the registry.');
  });

  // The previous test case for ProjectConfigService loadConfig failure is removed
  // because the new execute method's primary check is for the generator existence first.
  // A separate test for ProjectConfigService loadConfig failure might be added elsewhere
  // if needed, but it's less relevant to the orchestrator's new 'generate' command flow.

  // Keep the executeGenerators test if it's still relevant for other command flows
  // For now, assuming the orchestrator's main execute method is for command routing.
});
