/* eslint-disable @typescript-eslint/unbound-method */
import { MemoryBankGenerationError } from '../../src/core/errors/memory-bank-errors';
import { Result } from '../../src/core/result/result';
import { ILogger } from '../../src/core/services/logger-service'; // Keep ILogger type
import { IMemoryBankOrchestrator } from '../../src/memory-bank/interfaces';
import { MemoryBankService } from '../../src/memory-bank/memory-bank-service';
import { ProjectConfig } from '../../types/shared';
import { createMockLogger } from '../__mocks__/logger.mock'; // Import logger mock factory
import { createMockProjectContext } from '../__mocks__/project-context.mock'; // Import context mock factory

describe('MemoryBankService', () => {
  let service: MemoryBankService;
  let mockOrchestrator: jest.Mocked<IMemoryBankOrchestrator>;
  let mockLogger: jest.Mocked<ILogger>; // Keep declaration

  // Use the factory to create the mock context
  const mockProjectContext = createMockProjectContext({
    techStack: {
      languages: ['TypeScript'],
      frameworks: ['React'],
      buildTools: ['Webpack'],
      testingFrameworks: ['Jest'],
      linters: ['ESLint'],
      packageManager: 'npm',
    },

    // codeInsights: {} // Default is {}, override if specific insights needed
  });

  const mockConfig: ProjectConfig = {
    name: 'Test Project',
    baseDir: '/project',
    rootDir: '/project/dist', // Added missing property
    generators: ['memory-bank'], // Added missing property
    memoryBank: {
      outputDir: 'memory-bank-output',
      useTemplates: true,
    },
  };

  beforeEach(() => {
    mockOrchestrator = {
      orchestrateGeneration: jest.fn(),
    };
    mockLogger = createMockLogger(); // Initialize mock logger here
    service = new MemoryBankService(mockOrchestrator, mockLogger);
  });

  it('should call orchestrator.orchestrateGeneration with correct arguments on success', async () => {
    mockOrchestrator.orchestrateGeneration.mockResolvedValue(Result.ok(undefined));

    const result = await service.generateMemoryBank(mockProjectContext, mockConfig); // Cast type

    expect(result.isOk()).toBe(true);
    expect(result.value).toBe('Memory bank generated successfully.');

    expect(mockOrchestrator.orchestrateGeneration).toHaveBeenCalledTimes(1);

    expect(mockOrchestrator.orchestrateGeneration).toHaveBeenCalledWith(
      mockProjectContext,
      mockConfig
    );

    expect(mockLogger.info).toHaveBeenCalledWith(
      'Starting memory bank generation from project context...'
    );

    expect(mockLogger.info).toHaveBeenCalledWith('Memory bank generation completed successfully.');

    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should return error if config is not provided', async () => {
    const result = await service.generateMemoryBank(mockProjectContext, undefined); // Cast type

    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(MemoryBankGenerationError);
    expect(result.error?.message).toContain('ProjectConfig is required');

    expect(mockOrchestrator.orchestrateGeneration).not.toHaveBeenCalled();

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('ProjectConfig is required'),
      expect.any(Error)
    );
  });

  it('should return error if orchestrator fails', async () => {
    const orchestratorError = new Error('Orchestrator failed');
    mockOrchestrator.orchestrateGeneration.mockResolvedValue(Result.err(orchestratorError));

    const result = await service.generateMemoryBank(mockProjectContext, mockConfig); // Cast type

    expect(result.isErr()).toBe(true);
    expect(result.error).toBe(orchestratorError);

    expect(mockOrchestrator.orchestrateGeneration).toHaveBeenCalledWith(
      mockProjectContext,
      mockConfig
    );

    expect(mockLogger.error).toHaveBeenCalledWith(
      `Memory bank generation failed: ${orchestratorError.message}`,
      orchestratorError
    );
  });

  it('should return error if orchestrator fails without specific error object', async () => {
    // Simulate a scenario where the Result.err doesn't contain an error object (less likely but possible)
    mockOrchestrator.orchestrateGeneration.mockResolvedValue(Result.err(undefined as any));

    const result = await service.generateMemoryBank(mockProjectContext, mockConfig); // Cast type

    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error?.message).toContain('Unknown error during memory bank generation');

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Unknown error during memory bank generation',
      expect.any(Error)
    );
  });

  it('should handle unexpected errors during generation', async () => {
    const unexpectedError = new Error('Unexpected boom!');
    mockOrchestrator.orchestrateGeneration.mockRejectedValue(unexpectedError);

    const result = await service.generateMemoryBank(mockProjectContext, mockConfig); // Cast type

    expect(result.isErr()).toBe(true);
    expect(result.error).toBe(unexpectedError);

    expect(mockLogger.error).toHaveBeenCalledWith(
      'Unexpected error during memory bank generation',
      unexpectedError
    );
  });
});
