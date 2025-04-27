/* eslint-disable @typescript-eslint/unbound-method */
import { MemoryBankGenerator } from '../../src/memory-bank/memory-bank-generator';
import { IServiceContainer } from '../../src/core/di/interfaces';
import {
  IMemoryBankValidator,
  IMemoryBankOrchestrator,
  IProjectContextService,
  GenerationOptions,
} from '../../src/memory-bank/interfaces';
import { ILogger } from '../../src/core/services/logger-service';
import { Result } from '../../src/core/result/result';
import { ProjectConfig } from '../../types/shared';
import { IProjectConfigService } from '../../src/core/config/interfaces';
import { MemoryBankGenerationError } from '../../src/core/errors/memory-bank-errors';

describe('MemoryBankGenerator', () => {
  let memoryBankGenerator: MemoryBankGenerator;
  let mockContainer: jest.Mocked<IServiceContainer>;
  let mockValidator: jest.Mocked<IMemoryBankValidator>;
  let mockOrchestrator: jest.Mocked<IMemoryBankOrchestrator>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockProjectConfigService: jest.Mocked<IProjectConfigService>;
  let mockProjectContextService: jest.Mocked<IProjectContextService>;

  // Add missing properties to satisfy ProjectConfig type
  const testConfig: ProjectConfig = {
    name: 'test-project',
    baseDir: '/test',
    rootDir: '/test',
    generators: [],
  };

  beforeEach(() => {
    // Reset mocks for each test
    jest.resetAllMocks();

    // Create deep mocks for interfaces
    mockValidator = {
      validateRequiredFiles: jest.fn(),
      validateTemplateFiles: jest.fn(),
      validateFileContent: jest.fn(),
    };

    mockOrchestrator = {
      orchestrateGeneration: jest.fn(),
    };

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    mockProjectConfigService = {
      loadConfig: jest.fn(),
      saveConfig: jest.fn(),
      validateConfig: jest.fn().mockReturnValue(Result.ok(undefined)),
    };

    mockProjectContextService = {
      gatherContext: jest.fn(),
    };

    // Mock the DI container resolve method
    mockContainer = {
      resolve: jest.fn(),
      initialize: jest.fn(),
      register: jest.fn().mockReturnValue(Result.ok(undefined)),
      registerSingleton: jest.fn().mockReturnValue(Result.ok(undefined)),
      registerFactory: jest.fn().mockReturnValue(Result.ok(undefined)),
      clear: jest.fn(),
    };

    // Instantiate the generator with mocks
    memoryBankGenerator = new MemoryBankGenerator(
      mockContainer,
      mockValidator,
      mockOrchestrator,
      mockLogger,
      mockProjectConfigService,
      mockProjectContextService
    );

    // Default happy path mocks
    mockProjectContextService.gatherContext.mockResolvedValue(Result.ok('Project context data'));
    mockOrchestrator.orchestrateGeneration.mockResolvedValue(Result.ok(undefined));
  });

  // --- Test Cases for Error Handling ---

  it('should return MemoryBankGenerationError if dependencies are missing', async () => {
    // Arrange: Create generator with missing dependencies
    const generatorWithMissingDeps = new MemoryBankGenerator(
      mockContainer,
      undefined as unknown as IMemoryBankValidator, // Missing validator
      mockOrchestrator,
      mockLogger,
      mockProjectConfigService,
      mockProjectContextService
    );

    // Act
    const result = await generatorWithMissingDeps.executeGeneration(testConfig);

    // Assert
    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(MemoryBankGenerationError);
    expect(result.error?.message).toContain('Required dependencies are not initialized');
    expect((result.error as MemoryBankGenerationError).context?.operation).toBe(
      'validateDependencies'
    );
    expect((result.error as MemoryBankGenerationError).context?.missingDependencies).toContain(
      'IMemoryBankValidator'
    );
  });

  it('should return MemoryBankGenerationError if context gathering fails', async () => {
    // Arrange
    const contextError = new Error('Context gathering failed');
    mockProjectContextService.gatherContext.mockResolvedValue(Result.err(contextError));

    // Act
    const result = await memoryBankGenerator.executeGeneration(testConfig);

    // Assert
    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(MemoryBankGenerationError);
    expect(result.error?.message).toContain('Failed to gather project context');
    expect((result.error as MemoryBankGenerationError).context?.operation).toBe('gatherContext');
    const genErrorContext = result.error as MemoryBankGenerationError;
    expect(genErrorContext.cause).toBe(contextError);
    // Check that error was logged with proper message and error object
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to gather project context'),
      expect.any(MemoryBankGenerationError)
    );
  });

  it('should return MemoryBankGenerationError if orchestration fails', async () => {
    // Arrange
    const orchestrationError = new Error('Orchestration failed');
    mockOrchestrator.orchestrateGeneration.mockResolvedValue(Result.err(orchestrationError));

    // Act
    const result = await memoryBankGenerator.executeGeneration(testConfig);

    // Assert
    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(MemoryBankGenerationError);
    expect(result.error?.message).toContain('Memory bank suite generation failed');
    expect((result.error as MemoryBankGenerationError).context?.operation).toBe(
      'generateMemoryBankSuite'
    );
    const genErrorOrch = result.error as MemoryBankGenerationError;
    expect(genErrorOrch.cause).toBe(orchestrationError);
    // Check that error was logged with proper message and error object
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Memory bank suite generation failed'),
      expect.any(MemoryBankGenerationError)
    );
  });

  it('should not wrap error if orchestrator returns MemoryBankGenerationError', async () => {
    // Arrange
    const originalError = new MemoryBankGenerationError('Original orchestrator error', {
      operation: 'originalOperation',
    });
    mockOrchestrator.orchestrateGeneration.mockResolvedValue(Result.err(originalError));

    // Act
    const result = await memoryBankGenerator.executeGeneration(testConfig);

    // Assert
    expect(result.isErr()).toBe(true);
    expect(result.error).toBe(originalError); // Should be the exact same error object
    // Check that error was logged with proper message and error object
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Memory bank suite generation failed'),
      originalError
    );
  });

  it('should handle unexpected errors during execution', async () => {
    // Arrange
    const unexpectedError = new Error('Unexpected error');
    mockProjectContextService.gatherContext.mockImplementation(() => {
      throw unexpectedError;
    });

    // Act
    const result = await memoryBankGenerator.executeGeneration(testConfig);

    // Assert
    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(MemoryBankGenerationError);
    expect(result.error?.message).toContain('Unexpected error during memory bank execution');
    expect((result.error as MemoryBankGenerationError).context?.operation).toBe(
      'executeGenerationCatch'
    );
    const genErrorUnexpected = result.error as MemoryBankGenerationError;
    expect(genErrorUnexpected.cause).toBe(unexpectedError);
    // Check that error was logged with proper message and error object
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Unexpected error during memory bank execution'),
      expect.any(MemoryBankGenerationError)
    );
  });

  it('should pass correct options to orchestrator', async () => {
    // Arrange
    const projectContext = 'Project context data';
    mockProjectContextService.gatherContext.mockResolvedValue(Result.ok(projectContext));

    // Act
    await memoryBankGenerator.executeGeneration(testConfig);

    // Assert
    // Check orchestrator was called with correct parameters
    expect(mockOrchestrator.orchestrateGeneration).toHaveBeenCalledWith(
      { context: projectContext },
      testConfig
    );
  });

  it('should return success message when generation completes', async () => {
    // Act
    const result = await memoryBankGenerator.executeGeneration(testConfig);

    // Assert
    expect(result.isOk()).toBe(true);
    expect(result.value).toBe('Memory bank generated successfully.');
  });

  it('should validate dependencies correctly', async () => {
    // Act
    const result = await memoryBankGenerator.validate();

    // Assert
    expect(result.isOk()).toBe(true);
  });

  it('should delegate to orchestrator in generateMemoryBankSuite', async () => {
    // Arrange
    const options: GenerationOptions = { context: 'test context' };

    // Act
    await memoryBankGenerator.generateMemoryBankSuite(options, testConfig);

    // Assert
    // Check orchestrator was called with correct parameters
    expect(mockOrchestrator.orchestrateGeneration).toHaveBeenCalledWith(options, testConfig);
  });

  it('should handle unexpected errors in generateMemoryBankSuite', async () => {
    // Arrange
    const unexpectedError = new Error('Unexpected suite error');
    mockOrchestrator.orchestrateGeneration.mockImplementation(() => {
      throw unexpectedError;
    });

    // Act
    const result = await memoryBankGenerator.generateMemoryBankSuite({}, testConfig);

    // Assert
    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(MemoryBankGenerationError);
    expect(result.error?.message).toContain('Unexpected error during memory bank suite generation');
    expect((result.error as MemoryBankGenerationError).context?.operation).toBe(
      'generateMemoryBankSuiteCatch'
    );
    const genErrorSuite = result.error as MemoryBankGenerationError;
    expect(genErrorSuite.cause).toBe(unexpectedError);
  });
});
