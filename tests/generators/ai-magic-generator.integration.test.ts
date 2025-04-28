/* eslint-disable @typescript-eslint/unbound-method */
import { AiMagicGenerator } from '@/generators/ai-magic-generator';
import { MemoryBankService } from '@/memory-bank/memory-bank-service';
import { IProjectAnalyzer, ProjectContext } from '@/core/analysis/types';
import { ILogger } from '@/core/services/logger-service';
import { IFileOperations } from '@/core/file-operations/interfaces';
import { LLMAgent } from '@/core/llm/llm-agent';
import { Result } from '@/core/result/result';
import { IServiceContainer } from '@/core/di/interfaces';
import { ProjectConfig } from '../../types/shared'; // Corrected import path
import { IRulesPromptBuilder } from '@/generators/rules/interfaces'; // Import for mock
import { IContentProcessor } from '@/memory-bank/interfaces'; // Import for mock

// Mock dependencies
const mockLogger: ILogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockFileOps: IFileOperations = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  exists: jest.fn(),
  ensureDir: jest.fn(),
  // Add other methods if needed by the generator during testing
} as any; // Using 'as any' for brevity, refine if necessary

// Update mock to match the new IProjectAnalyzer interface
const mockProjectAnalyzer: jest.Mocked<IProjectAnalyzer> = {
  analyzeProject: jest.fn(),
};

const mockLlmAgent: LLMAgent = {
  getCompletion: jest.fn(),
} as any; // Using 'as any' for brevity

const mockMemoryBankService: MemoryBankService = {
  generateMemoryBank: jest.fn(),
} as any; // Using 'as any' for brevity, ensure methods match

const mockContainer: IServiceContainer = {
  // Corrected mock based on IServiceContainer interface
  initialize: jest.fn(),
  register: jest.fn(),
  registerSingleton: jest.fn(),
  registerFactory: jest.fn(),
  resolve: jest.fn(),
  clear: jest.fn(),
};

// Mock for RulesPromptBuilder
const mockRulesPromptBuilder: jest.Mocked<IRulesPromptBuilder> = {
  buildSystemPrompt: jest.fn(),
  buildPrompt: jest.fn(),
};

// Mock for ContentProcessor
const mockContentProcessor: jest.Mocked<IContentProcessor> = {
  stripMarkdownCodeBlock: jest.fn(),
  processTemplate: jest.fn(), // Add missing mock method
};

describe('AiMagicGenerator Integration Tests', () => {
  let aiMagicGenerator: AiMagicGenerator;

  // Define mock context at describe level for reuse
  const mockProjectContext: ProjectContext = {
    techStack: {
      languages: ['ts'],
      frameworks: ['react'],
      buildTools: ['webpack'],
      testingFrameworks: ['jest'],
      linters: ['eslint'],
      packageManager: 'npm',
    },
    structure: {
      rootDir: '/path/to/project',
      sourceDir: 'src',
      testDir: 'tests',
      configFiles: ['tsconfig.json'],
      mainEntryPoints: ['src/index.ts'],
      componentStructure: {},
    },
    dependencies: {
      dependencies: { react: '18.0.0' },
      devDependencies: { jest: '29.0.0' },
      peerDependencies: {},
      internalDependencies: {},
    },
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Instantiate the generator with mocked dependencies
    aiMagicGenerator = new AiMagicGenerator(
      mockContainer,
      mockLogger,
      mockFileOps,
      mockProjectAnalyzer,
      mockLlmAgent, // LLMAgent is used for rules generation now
      mockMemoryBankService,
      mockRulesPromptBuilder, // Add new mock
      mockContentProcessor // Add new mock
    );

    // Mock the consolidated analyzeProject method
    mockProjectAnalyzer.analyzeProject.mockResolvedValue(Result.ok(mockProjectContext));
  });

  it('should call MemoryBankService and generate rules file on successful analysis', async () => {
    const mockContextPaths = ['/path/to/project'];
    // Corrected mockConfig to satisfy ProjectConfig interface
    const mockConfig: ProjectConfig = {
      name: 'test-project',
      baseDir: '/path/to/project',
      rootDir: '/path/to/project/dist',
      generators: ['ai-magic'],
    };
    // mockProjectContext is now defined at the describe level
    const mockMemoryBankOutputPath = 'memory-bank/output.md';
    const mockRulesOutputPath = '.roo/rules-code/generated-rules.md';
    const mockGeneratedRulesContent = '# Generated Rules\n\n- Rule 1';
    const mockStrippedRulesContent = '# Generated Rules\n\n- Rule 1'; // Assume stripping doesn't change it here

    // Arrange: Mock analyzeProject to return success
    // Note: analyzeProject is private, but its underlying calls are mocked above.
    // If analyzeProject itself needs mocking (e.g., if made protected/public for testing), adjust here.

    // Arrange: Mock MemoryBankService to return success
    (mockMemoryBankService.generateMemoryBank as jest.Mock).mockResolvedValue(
      Result.ok(mockMemoryBankOutputPath)
    );
    // Arrange: Mock Rules generation steps to succeed
    mockRulesPromptBuilder.buildSystemPrompt.mockReturnValue(Result.ok('SYSTEM_PROMPT'));
    mockRulesPromptBuilder.buildPrompt.mockReturnValue(Result.ok('USER_PROMPT'));
    (mockLlmAgent.getCompletion as jest.Mock).mockResolvedValue(
      Result.ok(mockGeneratedRulesContent)
    );
    mockContentProcessor.stripMarkdownCodeBlock.mockReturnValue(
      Result.ok(mockStrippedRulesContent)
    );
    (mockFileOps.writeFile as jest.Mock).mockResolvedValue(Result.ok(undefined)); // Mock writeFile success

    // Act
    const result = await aiMagicGenerator.generate(mockConfig, mockContextPaths);

    // Assert
    expect(result.isOk()).toBe(true);
    // Assert: Check combined success message
    expect(result.value).toContain(
      `Memory Bank generated successfully. ${mockMemoryBankOutputPath}`
    );
    expect(result.value).toContain(`Rules file generated successfully at ${mockRulesOutputPath}`);
    // Check that the new analyzeProject method was called
    expect(mockProjectAnalyzer.analyzeProject).toHaveBeenCalledTimes(1);
    expect(mockProjectAnalyzer.analyzeProject).toHaveBeenCalledWith(mockContextPaths);
    expect(mockMemoryBankService.generateMemoryBank).toHaveBeenCalledTimes(1);
    // Deep equality check for the context passed to memory bank service
    expect(mockMemoryBankService.generateMemoryBank).toHaveBeenCalledWith(
      expect.objectContaining(mockProjectContext)
    );
    // Assert: Check rules generation calls
    expect(mockRulesPromptBuilder.buildSystemPrompt).toHaveBeenCalledWith('code');
    expect(mockRulesPromptBuilder.buildPrompt).toHaveBeenCalledWith(
      expect.any(String), // instruction
      expect.any(String), // context string
      '' // template
    );
    expect(mockLlmAgent.getCompletion).toHaveBeenCalledWith('SYSTEM_PROMPT', 'USER_PROMPT');
    expect(mockContentProcessor.stripMarkdownCodeBlock).toHaveBeenCalledWith(
      mockGeneratedRulesContent
    );
    expect(mockFileOps.writeFile).toHaveBeenCalledWith(
      mockRulesOutputPath,
      mockStrippedRulesContent
    );

    // Assert: Check logger calls
    expect(mockLogger.info).toHaveBeenCalledWith('Starting AI Magic generation process...');
    expect(mockLogger.info).toHaveBeenCalledWith('Starting Memory Bank Service generation...');
    expect(mockLogger.info).toHaveBeenCalledWith('Starting Rules file generation...');
    expect(mockLogger.info).toHaveBeenCalledWith(
      `Memory Bank Service completed successfully. ${mockMemoryBankOutputPath}`
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      `Rules file generated successfully at ${mockRulesOutputPath}`
    );
  });

  it('should return error if project analysis fails', async () => {
    const mockContextPaths = ['/path/to/project'];
    const mockConfig: ProjectConfig = {
      // Corrected mockConfig
      name: 'test-project',
      baseDir: '/path/to/project',
      rootDir: '/path/to/project/dist',
      generators: ['ai-magic'],
    };
    const analysisError = new Error('Analysis failed');

    // Arrange: Mock the consolidated analyzeProject to fail
    mockProjectAnalyzer.analyzeProject.mockResolvedValue(Result.err(analysisError));

    // Act
    const result = await aiMagicGenerator.generate(mockConfig, mockContextPaths);

    // Assert
    expect(result.isErr()).toBe(true);
    // The error from analyzeProject should be propagated
    expect(result.error).toBe(analysisError);
    expect(mockMemoryBankService.generateMemoryBank).not.toHaveBeenCalled();
    // Logger might log the specific analysis error or a wrapper message depending on implementation
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Project analysis failed'), // Check if the logger message indicates analysis failure
      analysisError
    );
  });

  it('should return error if MemoryBankService fails', async () => {
    const mockContextPaths = ['/path/to/project'];
    const mockConfig: ProjectConfig = {
      // Corrected mockConfig
      name: 'test-project',
      baseDir: '/path/to/project',
      rootDir: '/path/to/project/dist',
      generators: ['ai-magic'],
    };
    const memoryBankError = new Error('Memory bank generation failed');
    // Corrected mockProjectContext with all required fields
    const mockProjectContext: ProjectContext = {
      techStack: {
        languages: ['ts'],
        frameworks: ['react'],
        buildTools: ['webpack'],
        testingFrameworks: ['jest'],
        linters: ['eslint'],
        packageManager: 'npm',
      },
      structure: {
        rootDir: '/path/to/project',
        sourceDir: 'src',
        testDir: 'tests',
        configFiles: ['tsconfig.json'],
        mainEntryPoints: ['src/index.ts'],
        componentStructure: {},
      },
      dependencies: {
        dependencies: { react: '18.0.0' },
        devDependencies: { jest: '29.0.0' },
        peerDependencies: {},
        internalDependencies: {},
      },
    };

    // Arrange: Mock analyzeProject to succeed
    mockProjectAnalyzer.analyzeProject.mockResolvedValue(Result.ok(mockProjectContext));
    // Arrange: Mock MemoryBankService to return error
    (mockMemoryBankService.generateMemoryBank as jest.Mock).mockResolvedValue(
      Result.err(memoryBankError)
    );

    // Act
    const result = await aiMagicGenerator.generate(mockConfig, mockContextPaths);

    // Assert
    expect(result.isErr()).toBe(true);
    expect(result.error).toBe(memoryBankError);
    expect(mockMemoryBankService.generateMemoryBank).toHaveBeenCalledTimes(1);
    expect(mockMemoryBankService.generateMemoryBank).toHaveBeenCalledWith(
      expect.objectContaining(mockProjectContext)
    );
    expect(mockLogger.error).toHaveBeenCalledWith('Memory Bank Service failed', memoryBankError);
  });

  it('should return error if no context paths are provided', async () => {
    const mockConfig: ProjectConfig = {
      // Corrected mockConfig
      name: 'test-project',
      baseDir: '/path/to/project',
      rootDir: '/path/to/project/dist',
      generators: ['ai-magic'],
    };

    // Act
    const result = await aiMagicGenerator.generate(mockConfig, []); // Empty context paths

    // Assert
    expect(result.isErr()).toBe(true);
    expect(result.error?.message).toBe('No context path provided for analysis');
    // analyzeProject should not be called if paths are empty
    expect(mockProjectAnalyzer.analyzeProject).not.toHaveBeenCalled();
    expect(mockMemoryBankService.generateMemoryBank).not.toHaveBeenCalled();
  });

  it('should return error if rules generation fails but memory bank succeeds', async () => {
    const mockContextPaths = ['/path/to/project'];
    const mockConfig: ProjectConfig = {
      name: 'test-project',
      baseDir: '/path/to/project',
      rootDir: '/path/to/project/dist',
      generators: ['ai-magic'],
    };
    const mockMemoryBankOutputPath = 'memory-bank/output.md';
    const rulesGenError = new Error('LLM failed for rules');

    // Arrange: Mock analysis to succeed (Ensure mockProjectContext is accessible)
    mockProjectAnalyzer.analyzeProject.mockResolvedValue(Result.ok(mockProjectContext));
    // Arrange: Mock MemoryBankService to succeed
    (mockMemoryBankService.generateMemoryBank as jest.Mock).mockResolvedValue(
      Result.ok(mockMemoryBankOutputPath)
    );
    // Arrange: Mock Rules generation steps to fail at LLM call
    mockRulesPromptBuilder.buildSystemPrompt.mockReturnValue(Result.ok('SYSTEM_PROMPT'));
    mockRulesPromptBuilder.buildPrompt.mockReturnValue(Result.ok('USER_PROMPT'));
    (mockLlmAgent.getCompletion as jest.Mock).mockResolvedValue(Result.err(rulesGenError));

    // Act
    const result = await aiMagicGenerator.generate(mockConfig, mockContextPaths); // Use the instance variable

    // Assert
    expect(result.isErr()).toBe(true);
    expect(result.error?.message).toContain('Rules file generation failed');
    expect(result.error?.message).toContain(rulesGenError.message);
    expect(mockMemoryBankService.generateMemoryBank).toHaveBeenCalledTimes(1); // Memory bank should still be called
    expect(mockLlmAgent.getCompletion).toHaveBeenCalledTimes(1); // LLM for rules was called
    expect(mockFileOps.writeFile).not.toHaveBeenCalled(); // Rules file shouldn't be written
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Rules file generation failed'),
      expect.any(Error) // The wrapped error
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('AI Magic generation completed with errors'), // Overall error
      expect.any(Error)
    );
  });
}); // Move the closing bracket here to include the new test case
