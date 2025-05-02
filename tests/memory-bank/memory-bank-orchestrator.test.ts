/* eslint-disable @typescript-eslint/unbound-method */
import { MemoryBankOrchestrator } from '../../src/memory-bank/memory-bank-orchestrator';
import {
  IMemoryBankTemplateProcessor,
  IMemoryBankContentGenerator,
  IMemoryBankFileManager,
  MemoryBankFileType,
  // GenerationOptions, // Remove GenerationOptions
} from '../../src/memory-bank/interfaces';
import { ILogger } from '../../src/core/services/logger-service';
import { Result } from '../../src/core/result/result';
import { MemoryBankGenerationError } from '../../src/core/errors/memory-bank-errors';
import { ProjectConfig } from '../../types/shared';
import { ProjectContext } from '../../src/core/analysis/types'; // Import ProjectContext
import path from 'path';

describe('MemoryBankOrchestrator', () => {
  let orchestrator: MemoryBankOrchestrator;
  let mockTemplateProcessor: jest.Mocked<IMemoryBankTemplateProcessor>;
  let mockContentGenerator: jest.Mocked<IMemoryBankContentGenerator>;
  let mockFileManager: jest.Mocked<IMemoryBankFileManager>;
  let mockLogger: jest.Mocked<ILogger>;

  // Test data
  const testConfig: ProjectConfig = {
    name: 'test-project',
    baseDir: '/test/base/dir',
    rootDir: '.roo',
    generators: ['memory-bank'],
    description: 'Test project description',
    memoryBank: {
      // Add memoryBank config for completeness in tests
      outputDir: '/test/base/dir/memory-bank',
      useTemplates: true,
    },
  };

  // Replace testOptions with mockProjectContext
  const mockProjectContext: ProjectContext = {
    techStack: {
      languages: ['TypeScript'],
      frameworks: ['Jest'],
      buildTools: [],
      testingFrameworks: [],
      linters: [],
      packageManager: 'npm',
    },
    structure: {
      rootDir: '/test/base/dir',
      sourceDir: 'src',
      testDir: 'tests',
      configFiles: [],
      mainEntryPoints: [],
      componentStructure: {},
      definedClasses: {},
      definedFunctions: {},
    },
    dependencies: {
      dependencies: {},
      devDependencies: {},
      peerDependencies: {},
      internalDependencies: {},
    },
  };
  const mockStringContext = JSON.stringify(mockProjectContext, null, 2); // Pre-calculate serialized context

  beforeEach(() => {
    // Create mocks
    mockTemplateProcessor = {
      loadAndProcessTemplate: jest.fn(),
    } as unknown as jest.Mocked<IMemoryBankTemplateProcessor>;

    mockContentGenerator = {
      generateContent: jest.fn(),
    } as unknown as jest.Mocked<IMemoryBankContentGenerator>;

    mockFileManager = {
      createMemoryBankDirectory: jest.fn(),
      writeMemoryBankFile: jest.fn(),
      readMemoryBankFile: jest.fn(),
      copyDirectoryRecursive: jest.fn(),
    } as unknown as jest.Mocked<IMemoryBankFileManager>;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<ILogger>;

    // Create the orchestrator with mocks
    orchestrator = new MemoryBankOrchestrator(
      mockTemplateProcessor,
      mockContentGenerator,
      mockFileManager,
      mockLogger
    );

    // Default happy path mocks
    mockFileManager.createMemoryBankDirectory.mockResolvedValue(Result.ok(undefined));
    mockTemplateProcessor.loadAndProcessTemplate.mockResolvedValue(Result.ok('Processed template'));
    mockContentGenerator.generateContent.mockResolvedValue(Result.ok('Generated content'));
    mockFileManager.writeMemoryBankFile.mockResolvedValue(Result.ok(undefined));
    mockFileManager.copyDirectoryRecursive.mockResolvedValue(Result.ok(undefined));
  });

  describe('orchestrateGeneration', () => {
    it('should successfully orchestrate the generation process', async () => {
      // Act
      const result = await orchestrator.orchestrateGeneration(mockProjectContext, testConfig);

      // Assert
      expect(result.isOk()).toBe(true);

      // Verify directory creation

      expect(mockFileManager.createMemoryBankDirectory).toHaveBeenCalledWith(
        testConfig.memoryBank?.outputDir
      ); // Use configured output dir

      // Verify template processing for each file type
      Object.values(MemoryBankFileType).forEach((fileType) => {
        expect(mockTemplateProcessor.loadAndProcessTemplate).toHaveBeenCalledWith(
          fileType,
          expect.objectContaining({
            projectName: testConfig.name,
            projectDescription: testConfig.description,
          })
        );
      });

      // Verify content generation for each file type
      Object.values(MemoryBankFileType).forEach((fileType) => {
        expect(mockContentGenerator.generateContent).toHaveBeenCalledWith(
          fileType,
          mockStringContext, // Expect serialized context string
          'Processed template'
        );
      });

      // Verify file writing for each file type
      Object.values(MemoryBankFileType).forEach((fileType) => {
        const expectedFilePath = path.join(
          testConfig.memoryBank!.outputDir, // Use configured output dir
          `${String(fileType)}.md`
        );

        expect(mockFileManager.writeMemoryBankFile).toHaveBeenCalledWith(
          expectedFilePath,
          'Generated content'
        );
      });

      // Verify template directory copying

      expect(mockFileManager.copyDirectoryRecursive).toHaveBeenCalledWith(
        path.join('templates', 'memory-bank', 'templates'), // Default source
        path.join(testConfig.memoryBank!.outputDir, 'templates') // Destination in output dir
      );

      // Verify logging

      expect(mockLogger.info).toHaveBeenCalledWith('Memory bank generation completed successfully');
    });

    it('should handle directory creation failure', async () => {
      // Arrange
      const dirError = new Error('Directory creation failed');
      mockFileManager.createMemoryBankDirectory.mockResolvedValue(Result.err(dirError));

      // Act
      const result = await orchestrator.orchestrateGeneration(mockProjectContext, testConfig);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankGenerationError);
      expect(result.error?.message).toContain('Failed to create memory-bank directory structure');

      const genError = result.error as MemoryBankGenerationError;
      expect(genError.context?.operation).toBe('createMemoryBankDirectory');
      expect(genError.cause).toBe(dirError);

      // Verify no further processing occurred

      expect(mockTemplateProcessor.loadAndProcessTemplate).not.toHaveBeenCalled();

      expect(mockContentGenerator.generateContent).not.toHaveBeenCalled();

      expect(mockFileManager.writeMemoryBankFile).not.toHaveBeenCalled();
    });

    it('should continue processing when template processing fails for a file type', async () => {
      // Arrange
      const templateError = new Error('Template processing failed');
      mockTemplateProcessor.loadAndProcessTemplate.mockImplementation((fileType) => {
        if (fileType === MemoryBankFileType.ProjectOverview) {
          return Promise.resolve(Result.err(templateError));
        }
        return Promise.resolve(Result.ok('Processed template'));
      });

      // Act
      const result = await orchestrator.orchestrateGeneration(mockProjectContext, testConfig);

      // Assert
      expect(result.isOk()).toBe(true);

      // Verify error was logged

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          `Failed to process template for ${MemoryBankFileType.ProjectOverview}`
        ),
        templateError
      );

      // Verify other file types were still processed

      expect(mockContentGenerator.generateContent).toHaveBeenCalledTimes(
        Object.values(MemoryBankFileType).length - 1
      );

      // Verify ProjectOverview was skipped

      expect(mockContentGenerator.generateContent).not.toHaveBeenCalledWith(
        MemoryBankFileType.ProjectOverview,
        expect.any(String), // Context is still string here, but this call shouldn't happen
        expect.any(String)
      );
    });

    it('should continue processing when content generation fails for a file type', async () => {
      // Arrange
      const contentError = new Error('Content generation failed');
      mockContentGenerator.generateContent.mockImplementation((fileType) => {
        if (fileType === MemoryBankFileType.TechnicalArchitecture) {
          return Promise.resolve(Result.err(contentError));
        }
        return Promise.resolve(Result.ok('Generated content'));
      });

      // Act
      const result = await orchestrator.orchestrateGeneration(mockProjectContext, testConfig);

      // Assert
      expect(result.isOk()).toBe(true);

      // Verify error was logged

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          `Failed to generate content for ${MemoryBankFileType.TechnicalArchitecture}`
        ),
        contentError
      );

      // Verify TechnicalArchitecture file was not written
      Object.values(MemoryBankFileType).forEach((fileType) => {
        const expectedFilePath = path.join(
          testConfig.memoryBank!.outputDir, // Use configured output dir
          `${String(fileType)}.md`
        );
        if (fileType === MemoryBankFileType.TechnicalArchitecture) {
          expect(mockFileManager.writeMemoryBankFile).not.toHaveBeenCalledWith(
            expectedFilePath,
            expect.any(String)
          );
        } else {
          expect(mockFileManager.writeMemoryBankFile).toHaveBeenCalledWith(
            expectedFilePath,
            'Generated content'
          );
        }
      });
    });

    it('should continue processing when file writing fails for a file type', async () => {
      // Arrange
      const writeError = new Error('File write failed');
      mockFileManager.writeMemoryBankFile.mockImplementation((filePath) => {
        if (filePath.includes(MemoryBankFileType.DeveloperGuide)) {
          return Promise.resolve(Result.err(writeError));
        }
        return Promise.resolve(Result.ok(undefined));
      });

      // Act
      const result = await orchestrator.orchestrateGeneration(mockProjectContext, testConfig);

      // Assert
      expect(result.isOk()).toBe(true);

      // Verify error was logged

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to write ${MemoryBankFileType.DeveloperGuide} to file`),
        writeError
      );

      // Verify other files were still written

      expect(mockFileManager.writeMemoryBankFile).toHaveBeenCalledTimes(
        Object.values(MemoryBankFileType).length
      );
    });

    it('should continue processing when template copying fails', async () => {
      // Arrange
      const copyError = new Error('Template copy failed');
      mockFileManager.copyDirectoryRecursive.mockResolvedValue(Result.err(copyError));

      // Act
      const result = await orchestrator.orchestrateGeneration(mockProjectContext, testConfig);

      // Assert
      expect(result.isOk()).toBe(true);

      // Verify error was logged

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to copy templates directory'),
        expect.any(MemoryBankGenerationError)
      );

      // Verify generation was still marked as successful

      expect(mockLogger.info).toHaveBeenCalledWith('Memory bank generation completed successfully');
    });

    it('should handle unexpected errors during execution', async () => {
      // Arrange
      const unexpectedError = new Error('Unexpected error');
      mockTemplateProcessor.loadAndProcessTemplate.mockImplementation(() => {
        throw unexpectedError;
      });

      // Act
      const result = await orchestrator.orchestrateGeneration(mockProjectContext, testConfig);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankGenerationError);
      expect(result.error?.message).toContain('Unexpected error during memory bank generation');

      const genError = result.error as MemoryBankGenerationError;
      expect(genError.context?.operation).toBe('orchestrateGeneration');
      expect(genError.cause).toBe(unexpectedError);

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Unexpected error during memory bank generation'),
        expect.any(MemoryBankGenerationError)
      );
    });
  });
});
