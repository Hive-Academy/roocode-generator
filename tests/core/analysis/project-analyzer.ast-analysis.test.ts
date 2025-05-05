/* eslint-disable @typescript-eslint/unbound-method */
import path from 'path';
import {
  CodeInsights,
  IAstAnalysisService,
} from '../../../src/core/analysis/ast-analysis.interfaces';
import {
  FileMetadata,
  IFileContentCollector,
  IFilePrioritizer,
  ITreeSitterParserService,
} from '../../../src/core/analysis/interfaces';
import { ProjectAnalyzer } from '../../../src/core/analysis/project-analyzer';
import { ResponseParser } from '../../../src/core/analysis/response-parser';
import { GenericAstNode } from '../../../src/core/analysis/types';
import { IFileOperations } from '../../../src/core/file-operations/interfaces';
import { LLMAgent } from '../../../src/core/llm/llm-agent';
import { Result } from '../../../src/core/result/result';
import { ILogger } from '../../../src/core/services/logger-service';
import { ProgressIndicator } from '../../../src/core/ui/progress-indicator';

// --- Global Mocks & Variables ---
let projectAnalyzer: ProjectAnalyzer;
let mockFileOps: jest.Mocked<IFileOperations>;
let mockLogger: jest.Mocked<ILogger>;
let mockLLMAgent: jest.Mocked<LLMAgent>;
let mockResponseParser: jest.Mocked<ResponseParser>;
let mockProgress: jest.Mocked<ProgressIndicator>;
let mockContentCollector: jest.Mocked<IFileContentCollector>;
let mockFilePrioritizer: jest.Mocked<IFilePrioritizer>;
let mockTreeSitterParserService: jest.Mocked<ITreeSitterParserService>;
let mockAstAnalysisService: jest.Mocked<IAstAnalysisService>;

const rootPath = 'root/path';

// Define a mock AST node for reuse
const mockAstNode: GenericAstNode = {
  type: 'program',
  text: 'mock file content',
  startPosition: { row: 0, column: 0 },
  endPosition: { row: 5, column: 0 },
  isNamed: true,
  fieldName: null,
  children: [], // Keep children minimal for these tests
};

describe('ProjectAnalyzer AST Analysis Integration', () => {
  beforeEach(() => {
    // Initialize mocks
    mockFileOps = {
      readFile: jest.fn(),
      // Add other methods if needed by ProjectAnalyzer during these tests
      readDir: jest.fn().mockImplementation((dirPath: string) => {
        // Basic mock for file discovery
        if (dirPath === rootPath) return Result.ok(['src', 'package.json']);
        if (dirPath === path.join(rootPath, 'src')) return Result.ok(['app.ts', 'utils.ts']);
        return Result.ok([]);
      }),
      isDirectory: jest.fn().mockImplementation((filePath: string) => {
        if (filePath === path.join(rootPath, 'src')) return Result.ok(true);
        return Result.ok(false);
      }),
      validatePath: jest.fn(),
      getFiles: jest.fn(),
      writeFile: jest.fn(),
      createDirectory: jest.fn(),
    } as any;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    // Mock readFile specifically for the files used in these tests
    mockFileOps.readFile.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('app.ts')) return Result.ok('app.ts content');
      if (filePath.endsWith('utils.ts')) return Result.ok('utils.ts content');
      // Add package.json mock if needed for dependency merging tests, though less relevant here
      if (filePath.endsWith('package.json')) return Result.ok('{"name": "test-package"}');
      return await Promise.resolve(Result.err(new Error(`Unexpected readFile call: ${filePath}`)));
    });

    mockLLMAgent = {
      getModelContextWindow: jest.fn().mockResolvedValue(10000),
      countTokens: jest.fn().mockResolvedValue(10),
      getCompletion: jest.fn().mockResolvedValue(Result.ok('{}')), // Default success
      getProvider: jest.fn().mockResolvedValue(
        Result.ok({
          getContextWindowSize: jest.fn().mockReturnValue(10000),
          countTokens: jest.fn().mockResolvedValue(10),
          getCompletion: jest.fn(),
        })
      ),
    } as any;

    mockResponseParser = {
      parseLlmResponse: jest
        .fn()
        .mockReturnValue(Result.ok({ techStack: {}, structure: {}, dependencies: {} })), // Default success
    } as any;

    mockProgress = {
      start: jest.fn(),
      update: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    } as any;

    // Basic mock for content collector - assumes files are found and read individually later
    mockContentCollector = {
      collectContent: jest.fn().mockResolvedValue(
        Result.ok({
          content: 'app.ts content\nutils.ts content', // Simplified
          metadata: [
            { path: path.join(rootPath, 'src/app.ts'), size: 100 },
            { path: path.join(rootPath, 'src/utils.ts'), size: 100 },
          ],
        })
      ),
    } as unknown as jest.Mocked<IFileContentCollector>;

    mockFilePrioritizer = {
      prioritizeFiles: jest.fn().mockImplementation((metadata: FileMetadata[]) => metadata), // Pass through
    } as unknown as jest.Mocked<IFilePrioritizer>;

    mockTreeSitterParserService = {
      parse: jest.fn(), // Mocked per test
    } as any;

    mockAstAnalysisService = {
      analyzeAst: jest.fn(), // Mocked per test
    } as any;

    // Instantiate ProjectAnalyzer
    projectAnalyzer = new ProjectAnalyzer(
      mockFileOps,
      mockLogger,
      mockLLMAgent,
      mockResponseParser,
      mockProgress,
      mockContentCollector,
      mockFilePrioritizer,
      mockTreeSitterParserService,
      mockAstAnalysisService
    );
  });

  // --- Tests Extracted from project-analyzer.test.ts ---

  it('should call analyzeAst for valid ASTs and populate codeInsights (AC1, AC2, AC4)', async () => {
    // Arrange

    const relativeTsPath = 'src/app.ts';
    const relativeJsPath = 'src/utils.ts';

    // Mock successful parsing for both files
    mockTreeSitterParserService.parse
      .mockReturnValueOnce(Result.ok({ ...mockAstNode, text: 'app.ts content' })) // For app.ts
      .mockReturnValueOnce(Result.ok({ ...mockAstNode, text: 'utils.ts content' })); // For utils.ts

    // Mock successful analysis for both files
    const insights1: CodeInsights = {
      functions: [{ name: 'func1', parameters: [] }],
      classes: [],
      imports: [],
    };
    const insights2: CodeInsights = {
      functions: [{ name: 'func2', parameters: [] }],
      classes: [],
      imports: [],
    };
    mockAstAnalysisService.analyzeAst
      .mockResolvedValueOnce(Result.ok(insights1))
      .mockResolvedValueOnce(Result.ok(insights2));

    // Act
    const result = await projectAnalyzer.analyzeProject([rootPath]);

    // Assert
    expect(result.isOk()).toBe(true);
    const context = result.unwrap();

    // Verify analyzeAst calls (AC1)
    expect(mockAstAnalysisService.analyzeAst).toHaveBeenCalledTimes(2);
    expect(mockAstAnalysisService.analyzeAst).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'app.ts content' }), // Check AST object
      relativeTsPath // Check relative path
    );
    expect(mockAstAnalysisService.analyzeAst).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'utils.ts content' }), // Check AST object
      relativeJsPath // Check relative path
    );

    // Verify codeInsights population (AC2)
    expect(context.codeInsights).toBeDefined();
    expect(context.codeInsights).toHaveProperty(relativeTsPath);
    expect(context.codeInsights?.[relativeTsPath]).toEqual(insights1);
    expect(context.codeInsights).toHaveProperty(relativeJsPath);
    expect(context.codeInsights?.[relativeJsPath]).toEqual(insights2);

    // Verify logger calls (AC4)
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining(`Successfully generated code insights for ${relativeTsPath}`)
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining(`Successfully generated code insights for ${relativeJsPath}`)
    );
    expect(mockLogger.warn).not.toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();

    // Verify overall success (AC5)
    expect(result.isOk()).toBe(true);
  });

  it('should handle failed analysis (Result.err), log warning, and exclude from codeInsights (AC4, AC5)', async () => {
    const relativeTsPath = 'src/app.ts';
    const relativeJsPath = 'src/utils.ts';
    const analysisError = new Error('Analysis failed');

    // Mock successful parsing for both
    mockTreeSitterParserService.parse
      .mockReturnValueOnce(Result.ok({ ...mockAstNode, text: 'app.ts content' }))
      .mockReturnValueOnce(Result.ok({ ...mockAstNode, text: 'utils.ts content' }));

    // Mock one success, one failure
    const insights1: CodeInsights = {
      functions: [{ name: 'func1', parameters: [] }],
      classes: [],
      imports: [],
    };
    mockAstAnalysisService.analyzeAst
      .mockResolvedValueOnce(Result.ok(insights1)) // Success for app.ts
      .mockResolvedValueOnce(Result.err(analysisError)); // Failure for utils.ts

    // Act
    const result = await projectAnalyzer.analyzeProject([rootPath]);

    // Assert
    expect(result.isOk()).toBe(true); // Overall success (AC5)
    const context = result.unwrap();

    // Verify analyzeAst calls
    expect(mockAstAnalysisService.analyzeAst).toHaveBeenCalledTimes(2);

    // Verify codeInsights population
    expect(context.codeInsights).toBeDefined();
    expect(context.codeInsights).toHaveProperty(relativeTsPath);
    expect(context.codeInsights?.[relativeTsPath]).toEqual(insights1);
    expect(context.codeInsights).not.toHaveProperty(relativeJsPath); // Excluded due to failure

    // Verify logger calls (AC4)
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining(`Successfully generated code insights for ${relativeTsPath}`)
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        `Failed to generate code insights for ${relativeJsPath}: ${analysisError.message}`
      )
    );
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should handle rejected analysis (Promise.reject), log error, and exclude from codeInsights (AC4, AC5)', async () => {
    const relativeTsPath = 'src/app.ts';
    const relativeJsPath = 'src/utils.ts';
    const rejectionError = new Error('Promise rejected');

    // Mock successful parsing for both
    mockTreeSitterParserService.parse
      .mockReturnValueOnce(Result.ok({ ...mockAstNode, text: 'app.ts content' }))
      .mockReturnValueOnce(Result.ok({ ...mockAstNode, text: 'utils.ts content' }));

    // Mock one success, one rejection
    const insights1: CodeInsights = {
      functions: [{ name: 'func1', parameters: [] }],
      classes: [],
      imports: [],
    };
    mockAstAnalysisService.analyzeAst
      .mockResolvedValueOnce(Result.ok(insights1)) // Success for app.ts
      .mockRejectedValueOnce(rejectionError); // Rejection for utils.ts

    // Act
    const result = await projectAnalyzer.analyzeProject([rootPath]);

    // Assert
    expect(result.isOk()).toBe(true); // Overall success (AC5)
    const context = result.unwrap();

    // Verify analyzeAst calls
    expect(mockAstAnalysisService.analyzeAst).toHaveBeenCalledTimes(2);

    // Verify codeInsights population
    expect(context.codeInsights).toBeDefined();
    expect(context.codeInsights).toHaveProperty(relativeTsPath);
    expect(context.codeInsights?.[relativeTsPath]).toEqual(insights1);
    expect(context.codeInsights).not.toHaveProperty(relativeJsPath); // Excluded due to rejection

    // Verify logger calls (AC4)
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining(`Successfully generated code insights for ${relativeTsPath}`)
    );
    expect(mockLogger.warn).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining(
        `Error during AST analysis for ${relativeJsPath}: ${rejectionError.message}`
      )
    );
  });

  it('should NOT call analyzeAst for files where AST parsing failed (AC1, AC3)', async () => {
    const relativeTsPath = 'src/app.ts';
    const relativeJsPath = 'src/utils.ts';
    const parseError = new Error('Parsing failed');

    // Mock one parse success, one failure
    mockTreeSitterParserService.parse
      .mockReturnValueOnce(Result.ok({ ...mockAstNode, text: 'app.ts content' })) // Success for app.ts
      .mockReturnValueOnce(Result.err(parseError)); // Failure for utils.ts

    // Mock successful analysis if called
    const insights1: CodeInsights = {
      functions: [{ name: 'func1', parameters: [] }],
      classes: [],
      imports: [],
    };
    mockAstAnalysisService.analyzeAst.mockResolvedValue(Result.ok(insights1));

    // Act
    const result = await projectAnalyzer.analyzeProject([rootPath]);

    // Assert
    expect(result.isOk()).toBe(true);
    const context = result.unwrap();

    // Verify analyzeAst was called only for the successfully parsed file (AC1)
    expect(mockAstAnalysisService.analyzeAst).toHaveBeenCalledTimes(1);
    expect(mockAstAnalysisService.analyzeAst).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'app.ts content' }),
      relativeTsPath
    );
    expect(mockAstAnalysisService.analyzeAst).not.toHaveBeenCalledWith(
      expect.any(Object),
      relativeJsPath
    );

    // Verify codeInsights population
    expect(context.codeInsights).toBeDefined();
    expect(context.codeInsights).toHaveProperty(relativeTsPath);
    expect(context.codeInsights?.[relativeTsPath]).toEqual(insights1);
    expect(context.codeInsights).not.toHaveProperty(relativeJsPath);

    // Verify astData population (AC3)
    expect(context.astData).toBeDefined();
    expect(context.astData).toHaveProperty(relativeTsPath);
    expect(context.astData).not.toHaveProperty(relativeJsPath);

    // Verify logger calls
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`Failed to parse  for AST: ${parseError.message}`)
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining(`Successfully generated code insights for ${relativeTsPath}`)
    );
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should handle cases with no valid ASTs generated (AC1, AC5)', async () => {
    // Arrange
    const parseError = new Error('Parsing failed');
    // Mock all parsing attempts to fail
    mockTreeSitterParserService.parse.mockReturnValue(Result.err(parseError));

    // Act
    const result = await projectAnalyzer.analyzeProject([rootPath]);

    // Assert
    expect(result.isOk()).toBe(true); // Overall success (AC5)
    const context = result.unwrap();

    // Verify analyzeAst was never called (AC1)
    expect(mockAstAnalysisService.analyzeAst).not.toHaveBeenCalled();

    // Verify codeInsights is empty or undefined
    expect(context.codeInsights).toBeUndefined(); // Or expect(context.codeInsights).toEqual({}); depending on implementation

    // Verify astData is empty or undefined (AC3)
    expect(context.astData).toBeUndefined(); // Or expect(context.astData).toEqual({});

    // Verify logger calls
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`Failed to parse ${path.join(rootPath, 'src/app.ts')} for AST`)
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`Failed to parse ${path.join(rootPath, 'src/utils.ts')} for AST`)
    );
    expect(mockLogger.debug).not.toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should complete successfully even if all analyses fail or reject (AC5)', async () => {
    // Arrange
    const analysisError = new Error('Analysis failed');
    const rejectionError = new Error('Promise rejected');

    // Mock successful parsing for both
    mockTreeSitterParserService.parse
      .mockReturnValueOnce(Result.ok({ ...mockAstNode, text: 'app.ts content' }))
      .mockReturnValueOnce(Result.ok({ ...mockAstNode, text: 'utils.ts content' }));

    // Mock one failure, one rejection
    mockAstAnalysisService.analyzeAst
      .mockResolvedValueOnce(Result.err(analysisError)) // Failure for app.ts
      .mockRejectedValueOnce(rejectionError); // Rejection for utils.ts

    // Act
    const result = await projectAnalyzer.analyzeProject([rootPath]);

    // Assert
    expect(result.isOk()).toBe(true); // Overall success (AC5)
    const context = result.unwrap();

    // Verify analyzeAst calls
    expect(mockAstAnalysisService.analyzeAst).toHaveBeenCalledTimes(2);

    // Verify codeInsights is empty or undefined
    expect(context.codeInsights).toBeUndefined(); // Or expect(context.codeInsights).toEqual({});

    // Verify logger calls (AC4)
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        `Failed to generate code insights for src/app.ts: ${analysisError.message}`
      )
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining(
        `Error during AST analysis for src/utils.ts: ${rejectionError.message}`
      )
    );
    expect(mockLogger.debug).not.toHaveBeenCalled();
  });
});
