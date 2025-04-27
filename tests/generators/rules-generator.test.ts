import { Result } from '../../src/core/result/result'; // Import Result
import { DIError } from '../../src/core/di/errors'; // Import DIError for error case
import { IProjectAnalyzer } from '../../src/core/analysis/types';
import { IServiceContainer } from '../../src/core/di/interfaces'; // Removed ServiceToken import
import { IFileOperations } from '../../src/core/file-operations/interfaces';
import { LLMAgent } from '../../src/core/llm/llm-agent';
import { ILogger } from '../../src/core/services/logger-service';
import { IRulesContentProcessor } from '../../src/generators/rules/interfaces';
import { RulesGenerator } from '../../src/generators/rules/rules-generator';
import { ProgressIndicator } from '../../src/core/ui/progress-indicator'; // Import the class to mock

// Mock the ProgressIndicator module to prevent ESM issues with 'ora'
jest.mock('../../src/core/ui/progress-indicator', () => {
  return {
    ProgressIndicator: jest.fn().mockImplementation(() => {
      return {
        start: jest.fn(),
        succeed: jest.fn(),
        fail: jest.fn(),
        set text(value: string) {
          /* no-op */
        }, // Mock setter if needed
      };
    }),
  };
});

describe('RulesGenerator', () => {
  let rulesGenerator: RulesGenerator;
  let mockLogger: jest.Mocked<ILogger>;
  let mockFileOps: jest.Mocked<IFileOperations>;
  let mockProjectAnalyzer: jest.Mocked<IProjectAnalyzer>;
  let mockLLMAgent: jest.Mocked<LLMAgent>;
  let mockContentProcessor: jest.Mocked<IRulesContentProcessor>;
  let mockServiceContainer: jest.Mocked<IServiceContainer>;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as jest.Mocked<ILogger>;

    mockFileOps = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      exists: jest.fn(),
      isDirectory: jest.fn(),
      readDir: jest.fn(),
      copyFile: jest.fn(),
      copyDirectoryRecursive: jest.fn(),
      deleteFile: jest.fn(),
      deleteDirectory: jest.fn(),
      createDirectory: jest.fn(),
      getRelativePath: jest.fn(),
      getAbsolutePath: jest.fn(),
      joinPaths: jest.fn(),
      dirname: jest.fn(),
      basename: jest.fn(),
      extname: jest.fn(),
    } as unknown as jest.Mocked<IFileOperations>;

    mockProjectAnalyzer = {
      analyzeTechStack: jest.fn(),
      analyzeProjectStructure: jest.fn(),
      analyzeDependencies: jest.fn(),
    } as jest.Mocked<IProjectAnalyzer>;

    mockLLMAgent = {
      getCompletion: jest.fn(),
      getChatCompletion: jest.fn(),
    } as unknown as jest.Mocked<LLMAgent>;

    mockContentProcessor = {
      stripMarkdownCodeBlock: jest.fn(),
      processContent: jest.fn(),
    } as jest.Mocked<IRulesContentProcessor>;

    mockServiceContainer = {
      resolve: jest.fn(),
      initialize: jest.fn(),
      register: jest.fn(),
      registerSingleton: jest.fn(),
      registerFactory: jest.fn(),
      clear: jest.fn(),
    } as unknown as jest.Mocked<IServiceContainer>;

    // Configure the mock container to return the mocked ProgressIndicator wrapped in Result.Ok
    const MockedProgressIndicator = ProgressIndicator as jest.MockedClass<typeof ProgressIndicator>;
    const mockProgressIndicatorInstance = new MockedProgressIndicator();
    // Use 'any' for token type in mock implementation as ServiceToken is not exported
    mockServiceContainer.resolve.mockImplementation((token: any): Result<unknown, DIError> => {
      if (token === ProgressIndicator) {
        return Result.ok(mockProgressIndicatorInstance); // Use Result.ok (lowercase)
      }
      // For any other token requested in this test setup, return an error Result
      // This makes the mock more explicit about what it handles.
      const error = new DIError(
        `Mock does not handle resolution for token: ${token?.toString() ?? 'undefined'}`,
        'MOCK_RESOLUTION_FAILURE' // Add error code
      );
      return Result.err(error); // Use Result.err (lowercase) and pass the error instance
    });

    rulesGenerator = new RulesGenerator(
      mockServiceContainer,
      mockLogger,
      mockFileOps,
      mockProjectAnalyzer,
      mockLLMAgent,
      mockContentProcessor
    );
  });

  describe('validate', () => {
    it('should validate dependencies successfully', async () => {
      const result = await rulesGenerator.validate();
      expect(result.isOk()).toBe(true);
    });
  });

  describe('validateDependencies', () => {
    it('should return success when all dependencies are present', () => {
      const result = (rulesGenerator as any).validateDependencies();
      expect(result.isOk()).toBe(true);
    });

    it('should return error when dependencies are missing', () => {
      // Create a generator with missing dependencies
      const incompleteGenerator = new RulesGenerator(
        mockServiceContainer,
        mockLogger,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        null as any, // Missing fileOps
        mockProjectAnalyzer,
        mockLLMAgent,
        mockContentProcessor
      );

      const result = (incompleteGenerator as any).validateDependencies();
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('missing required dependencies');
    });
  });

  describe('trimIntroduction', () => {
    it('should remove common introductory text', () => {
      const content =
        'Okay, here are comprehensive coding rules and standards for your project.\n\n# Section 1\nContent';
      const result = (rulesGenerator as any).trimIntroduction(content);
      expect(result).toBe('# Section 1\nContent');
    });

    it('should handle content without introductory text', () => {
      const content = '# Section 1\nContent';
      const result = (rulesGenerator as any).trimIntroduction(content);
      expect(result).toBe('# Section 1\nContent');
    });
  });

  describe('limitContentSize', () => {
    it('should not modify content under 250 lines', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const result = (rulesGenerator as any).limitContentSize(content);
      expect(result).toBe(content);
    });

    it('should trim content over 250 lines', () => {
      // Create content with 300 lines
      const lines = Array.from({ length: 300 }, (_, i) => `Line ${i + 1}`);
      const content = lines.join('\n');

      const result = (rulesGenerator as any).limitContentSize(content);
      const resultLines = result.split('\n');

      expect(resultLines.length).toBeLessThanOrEqual(250);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Trimming content'));
    });
  });
});
