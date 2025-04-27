/* eslint-disable @typescript-eslint/unbound-method */
import path from 'path'; // Add missing import
import { MemoryBankGenerator } from '../../src/memory-bank/memory-bank-generator';
import { IServiceContainer } from '../../src/core/di/interfaces'; // Removed unused ServiceLifetime, DIError
import {
  IMemoryBankValidator,
  IMemoryBankFileManager,
  IMemoryBankTemplateManager,
  IContentProcessor,
  IProjectContextService,
  IPromptBuilder,
  MemoryBankFileType,
} from '../../src/memory-bank/interfaces';
import { ILogger } from '../../src/core/services/logger-service';
import { LLMAgent } from '../../src/core/llm/llm-agent';
import { Result } from '../../src/core/result/result';
import { ProjectConfig } from '../../types/shared';
import { IFileOperations } from '../../src/core/file-operations/interfaces';
import { IProjectConfigService } from '../../src/core/config/interfaces';
import { ITemplate } from '../../src/core/template-manager/interfaces';
import {
  MemoryBankGenerationError,
  MemoryBankTemplateError,
  MemoryBankFileError,
} from '../../src/core/errors/memory-bank-errors'; // Import new errors
// Removed unused RooCodeError import

// Mock ITemplate - Removed 'name' property
// Corrected ITemplate mock structure
const mockTemplate: ITemplate = {
  metadata: {
    // Added metadata object
    name: 'mock-template',
    version: '1.0.0',
  },
  process: jest.fn(),
  validate: jest.fn().mockReturnValue(Result.ok(undefined)), // Mock validate to return success
};

describe('MemoryBankGenerator', () => {
  let memoryBankGenerator: MemoryBankGenerator;
  let mockContainer: jest.Mocked<IServiceContainer>;
  let mockValidator: jest.Mocked<IMemoryBankValidator>;
  let mockFileManager: jest.Mocked<IMemoryBankFileManager>;
  let mockTemplateManager: jest.Mocked<IMemoryBankTemplateManager>;
  let mockContentProcessor: jest.Mocked<IContentProcessor>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockProjectConfigService: jest.Mocked<IProjectConfigService>;
  let mockProjectContextService: jest.Mocked<IProjectContextService>;
  let mockPromptBuilder: jest.Mocked<IPromptBuilder>;
  let mockLlmAgent: jest.Mocked<LLMAgent>;
  let mockFileOps: jest.Mocked<IFileOperations>;

  // Add missing properties to satisfy ProjectConfig type
  const testConfig: ProjectConfig = {
    name: 'test-project',
    baseDir: '/test',
    rootDir: '/test', // Added required property
    generators: [], // Changed to string[] as required by ProjectConfig
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
    mockFileManager = {
      createMemoryBankDirectory: jest.fn(),
      writeMemoryBankFile: jest.fn(),
      readMemoryBankFile: jest.fn(),
    };
    // Removed getTemplatePath as it doesn't exist on the interface
    mockTemplateManager = {
      loadTemplate: jest.fn(),
      // Mock methods from extended ITemplateManager if necessary
      processTemplate: jest.fn(), // Assuming this comes from ITemplateManager base
      validateTemplate: jest.fn(), // Assuming this comes from ITemplateManager base
    };
    mockContentProcessor = {
      stripMarkdownCodeBlock: jest.fn(),
      processTemplate: jest.fn(),
    };
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    // Removed getConfig as it doesn't exist on the interface
    mockProjectConfigService = {
      loadConfig: jest.fn(),
      saveConfig: jest.fn(),
      validateConfig: jest.fn().mockReturnValue(Result.ok(undefined)), // Added missing method
    };
    mockProjectContextService = {
      gatherContext: jest.fn(),
    };
    mockPromptBuilder = {
      buildPrompt: jest.fn(),
    };
    // Mock LLMAgent methods if it's a class, or properties if interface
    mockLlmAgent = {
      getCompletion: jest.fn(),
    } as unknown as jest.Mocked<LLMAgent>; // Cast needed if LLMAgent is complex

    mockFileOps = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      createDirectory: jest.fn(),
      readDir: jest.fn(),
      normalizePath: jest.fn((p) => p),
      validatePath: jest.fn((_path: string) => true),
      // Add missing methods from IFileOperations
      exists: jest.fn().mockResolvedValue(Result.ok(true)), // Assume exists by default
      isDirectory: jest.fn().mockResolvedValue(Result.ok(false)), // Assume file by default
    };

    // Mock the DI container resolve method and add missing methods for full type compatibility
    mockContainer = {
      resolve: jest.fn(),
      // Add other methods required by IServiceContainer interface
      initialize: jest.fn(),
      register: jest.fn().mockReturnValue(Result.ok(undefined)), // Mock return for chaining/type safety
      registerSingleton: jest.fn().mockReturnValue(Result.ok(undefined)),
      registerFactory: jest.fn().mockReturnValue(Result.ok(undefined)),
      clear: jest.fn(),
    };
    (mockContainer.resolve as jest.Mock).mockImplementation((token: string) => {
      if (token === 'IFileOperations') {
        return Result.ok(mockFileOps);
      }
      // Add other resolutions if needed by the generator directly
      return Result.err(new Error(`Test mock resolve error: Token not found: ${token}`));
    });

    // Instantiate the generator with mocks
    memoryBankGenerator = new MemoryBankGenerator(
      mockContainer,
      mockValidator,
      mockFileManager,
      mockTemplateManager,
      mockContentProcessor,
      mockLogger,
      mockProjectConfigService, // Added missing dependency
      mockProjectContextService,
      mockPromptBuilder,
      mockLlmAgent
      // Note: FileOps is resolved via container now, not directly injected
    );

    // Default happy path mocks
    mockProjectContextService.gatherContext.mockResolvedValue(Result.ok('Project context data'));
    mockFileManager.createMemoryBankDirectory.mockResolvedValue(Result.ok(undefined));
    mockTemplateManager.loadTemplate.mockResolvedValue(Result.ok(mockTemplate));
    (mockTemplate.process as jest.Mock).mockReturnValue(Result.ok('Processed template content'));
    mockPromptBuilder.buildPrompt.mockReturnValue(Result.ok('Generated prompt'));
    mockLlmAgent.getCompletion.mockResolvedValue(Result.ok('LLM response content'));
    mockContentProcessor.processTemplate.mockResolvedValue(Result.ok('Final processed content'));
    mockContentProcessor.stripMarkdownCodeBlock.mockReturnValue(Result.ok('Stripped content'));
    mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));
    mockFileOps.readDir.mockResolvedValue(Result.ok([])); // Mock for copyDirectoryRecursive
    mockFileOps.createDirectory.mockResolvedValue(Result.ok(undefined)); // Mock for copyDirectoryRecursive
  });

  // --- Test Cases for Error Handling ---

  it('should return MemoryBankGenerationError if dependencies are missing', async () => {
    // Arrange: Create generator with a missing dependency (e.g., logger)
    const generatorWithMissingDeps = new MemoryBankGenerator(
      mockContainer,
      mockValidator,
      mockFileManager,
      mockTemplateManager,
      mockContentProcessor,
      mockLogger,
      mockProjectConfigService,
      mockProjectContextService,
      mockPromptBuilder,
      mockLlmAgent
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
      'ILogger'
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
    const genErrorContext = result.error as MemoryBankGenerationError; // Cast before accessing cause
    expect(genErrorContext.cause).toBe(contextError);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to gather project context'),
      expect.any(MemoryBankGenerationError)
    );
  });

  it('should return MemoryBankGenerationError if directory creation fails', async () => {
    // Arrange
    const dirError = new Error('Cannot create dir');
    // Simulate failure in the fileManager call used by generateMemoryBankSuite
    mockFileManager.createMemoryBankDirectory.mockResolvedValue(Result.err(dirError));

    // Act - Call generateMemoryBankSuite directly or via executeGeneration
    const result = await memoryBankGenerator.generateMemoryBankSuite(
      { context: 'ctx' },
      testConfig
    );

    // Assert
    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(MemoryBankGenerationError);
    expect(result.error?.message).toContain('Failed to create memory-bank directory structure');
    expect((result.error as MemoryBankGenerationError).context?.operation).toBe(
      'createMemoryBankDirectory'
    );
    const genErrorDir = result.error as MemoryBankGenerationError; // Cast before accessing cause
    expect(genErrorDir.cause).toBe(dirError);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to create memory-bank directory structure'),
      expect.any(MemoryBankGenerationError)
    );
  });

  it('should return MemoryBankTemplateError if template loading fails', async () => {
    // Arrange
    const templateError = new Error('Template not found');
    // Return a specific MemoryBankTemplateError for type safety
    mockTemplateManager.loadTemplate.mockResolvedValue(
      Result.err(
        new MemoryBankTemplateError('Template not found', 'mock-template', {}, templateError)
      )
    );

    // Act
    const result = await memoryBankGenerator.generateMemoryBankSuite(
      { context: 'ctx' },
      testConfig
    );

    // Assert
    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(MemoryBankTemplateError);
    expect(result.error?.message).toContain('Failed to load template');
    expect((result.error as MemoryBankTemplateError).templateName).toBeDefined(); // Check specific property
    expect((result.error as MemoryBankTemplateError).context?.operation).toBe('loadTemplate');
    const templateLoadError = result.error as MemoryBankTemplateError; // Cast before accessing cause
    expect(templateLoadError.cause).toBe(templateError);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to load template'),
      expect.any(MemoryBankTemplateError)
    );
  });

  it('should return MemoryBankTemplateError if template processing fails', async () => {
    // Arrange
    const processError = new Error('Template syntax error');
    // Mock the process method on the *mocked template object*
    (mockTemplate.process as jest.Mock).mockReturnValue(Result.err(processError));
    mockTemplateManager.loadTemplate.mockResolvedValue(Result.ok(mockTemplate)); // Ensure template loads

    // Act
    const result = await memoryBankGenerator.generateMemoryBankSuite(
      { context: 'ctx' },
      testConfig
    );

    // Assert
    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(MemoryBankTemplateError);
    expect(result.error?.message).toContain('Failed to process template content');
    expect((result.error as MemoryBankTemplateError).templateName).toBe('mock-template');
    expect((result.error as MemoryBankTemplateError).context?.operation).toBe(
      'processTemplateContent'
    );
    const templateProcessError = result.error as MemoryBankTemplateError; // Cast before accessing cause
    expect(templateProcessError.cause).toBe(processError);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to process template content'),
      expect.any(MemoryBankTemplateError)
    );
  });

  it('should return MemoryBankGenerationError if prompt building fails', async () => {
    // Arrange
    const promptError = new Error('Invalid prompt data');
    mockPromptBuilder.buildPrompt.mockReturnValue(Result.err(promptError));

    // Act
    const result = await memoryBankGenerator.generateMemoryBankSuite(
      { context: 'ctx' },
      testConfig
    );

    // Assert
    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(MemoryBankGenerationError);
    // It could fail on the first or second call, check message broadly
    expect(result.error?.message).toMatch(/Failed to build (system )?prompt/);
    expect((result.error as MemoryBankGenerationError).context?.operation).toMatch(
      /build(System)?Prompt/
    );
    const promptGenError = result.error as MemoryBankGenerationError; // Cast before accessing cause
    expect(promptGenError.cause).toBe(promptError);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringMatching(/Failed to build (system )?prompt/),
      expect.any(MemoryBankGenerationError)
    );
  });

  it('should return MemoryBankGenerationError if LLM call fails', async () => {
    // Arrange
    const llmError = new Error('API limit reached');
    mockLlmAgent.getCompletion.mockResolvedValue(Result.err(llmError));

    // Act
    const result = await memoryBankGenerator.generateMemoryBankSuite(
      { context: 'ctx' },
      testConfig
    );

    // Assert
    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(MemoryBankGenerationError);
    expect(result.error?.message).toContain('LLM invocation failed');
    expect((result.error as MemoryBankGenerationError).context?.operation).toBe('llmGetCompletion');
    const llmGenError = result.error as MemoryBankGenerationError; // Cast before accessing cause
    expect(llmGenError.cause).toBe(llmError);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('LLM invocation failed'),
      expect.any(MemoryBankGenerationError)
    );
  });

  it('should return MemoryBankGenerationError if content processing fails', async () => {
    // Arrange
    const processError = new Error('Processing error');
    mockContentProcessor.processTemplate.mockResolvedValue(Result.err(processError));

    // Act
    const result = await memoryBankGenerator.generateMemoryBankSuite(
      { context: 'ctx' },
      testConfig
    );

    // Assert
    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(MemoryBankGenerationError);
    expect(result.error?.message).toContain('Failed to process LLM response content');
    expect((result.error as MemoryBankGenerationError).context?.operation).toBe(
      'processLlmResponse'
    );
    const contentGenError = result.error as MemoryBankGenerationError; // Cast before accessing cause
    expect(contentGenError.cause).toBe(processError);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to process LLM response content'),
      expect.any(MemoryBankGenerationError)
    );
  });

  it('should log MemoryBankFileError and continue if file write fails in loop', async () => {
    // Arrange
    const writeError = new Error('Disk full');
    // Fail only on the second file type write (e.g., TechnicalArchitecture)
    mockFileOps.writeFile
      .mockResolvedValueOnce(Result.ok(undefined)) // ProjectOverview succeeds
      .mockResolvedValueOnce(Result.err(writeError)) // TechnicalArchitecture fails
      .mockResolvedValue(Result.ok(undefined)); // DeveloperGuide succeeds

    // Act
    const result = await memoryBankGenerator.generateMemoryBankSuite(
      { context: 'ctx' },
      testConfig
    );

    // Assert
    expect(result.isOk()).toBe(true); // Overall suite should succeed
    // Check that the error for the specific file was logged
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining(`Failed to write ${MemoryBankFileType.TechnicalArchitecture}`),
      expect.any(MemoryBankFileError)
    );
    // Check that the error logged has the correct properties
    const loggedError = mockLogger.error.mock.calls.find(
      (call) => call[1] instanceof MemoryBankFileError
    )?.[1] as MemoryBankFileError;
    expect(loggedError).toBeDefined();
    expect(loggedError.filePath).toContain(`${MemoryBankFileType.TechnicalArchitecture}.md`);
    expect(loggedError.context?.operation).toBe('writeFileLoop');
    expect(loggedError.cause).toBe(writeError); // Direct cause is correct here

    // Verify other files were attempted/written
    expect(mockFileOps.writeFile).toHaveBeenCalledTimes(Object.values(MemoryBankFileType).length);
    expect(mockFileOps.writeFile).toHaveBeenCalledWith(
      expect.stringContaining(`${MemoryBankFileType.ProjectOverview}.md`),
      expect.any(String)
    );
    expect(mockFileOps.writeFile).toHaveBeenCalledWith(
      expect.stringContaining(`${MemoryBankFileType.TechnicalArchitecture}.md`),
      expect.any(String)
    );
    expect(mockFileOps.writeFile).toHaveBeenCalledWith(
      expect.stringContaining(`${MemoryBankFileType.DeveloperGuide}.md`),
      expect.any(String)
    );
  });

  it('should log MemoryBankFileError and continue if template copy fails', async () => {
    // Arrange
    const copyError = new Error('Permission denied on read');
    // Mock readDir to succeed, but readFile within copyDirectoryRecursive to fail
    mockFileOps.readDir.mockResolvedValue(
      Result.ok([{ name: 'template.md', isDirectory: () => false, isFile: () => true } as any])
    );
    mockFileOps.readFile.mockResolvedValue(Result.err(copyError)); // Fail reading the template file

    // Act
    const result = await memoryBankGenerator.generateMemoryBankSuite(
      { context: 'ctx' },
      testConfig
    );

    // Assert
    expect(result.isOk()).toBe(true); // Overall suite should succeed despite copy failure
    // Check that the copy error was logged
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to copy templates'),
      expect.any(MemoryBankFileError)
    );
    // Check that the error logged has the correct properties
    const loggedError = mockLogger.error.mock.calls.find(
      (call) => call[1] instanceof MemoryBankFileError
    )?.[1] as MemoryBankFileError;
    expect(loggedError).toBeDefined();
    expect(loggedError.filePath).toContain(path.join('templates', 'memory-bank', 'templates')); // Source dir
    expect(loggedError.context?.operation).toBe('copyTemplates');
    // The cause might be wrapped deeper, check the message or type if needed
    expect(loggedError.cause).toBeInstanceOf(MemoryBankFileError); // Error from deeper copyRecursive call
    const copyCause = loggedError.cause as MemoryBankFileError; // Cause is wrapped FileError
    expect(copyCause).toBeInstanceOf(MemoryBankFileError);
    expect(copyCause.message).toContain('Failed to read file');
    expect(copyCause.cause).toBe(copyError); // Check the original cause deeper
  });
});
