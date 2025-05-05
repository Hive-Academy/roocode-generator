/* eslint-disable @typescript-eslint/unbound-method */
import path from 'path'; // Added path import
import {
  FileMetadata,
  IFileContentCollector,
  IFilePrioritizer,
  ITreeSitterParserService,
} from '../../../src/core/analysis/interfaces';
import { ProjectContext, GenericAstNode } from '../../../src/core/analysis/types'; // Import ProjectContext & GenericAstNode
import { IAstAnalysisService } from '../../../src/core/analysis/ast-analysis.interfaces'; // Re-add for casting mock
import { ProjectAnalyzer } from '../../../src/core/analysis/project-analyzer';
import { ResponseParser } from '../../../src/core/analysis/response-parser';
import { IFileOperations } from '../../../src/core/file-operations/interfaces';
import { LLMAgent } from '../../../src/core/llm/llm-agent';
import { Result } from '../../../src/core/result/result';
import { ILogger } from '../../../src/core/services/logger-service';
import { ProgressIndicator } from '../../../src/core/ui/progress-indicator';

// Define a type for the metadata objects used frequently in tests
// type TestFileMetadata = { path: string; size: number }; // Removed unused type

// ** FIX: Define DeepPartial utility type **
type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

// Define a mock AST node for reuse
const mockAstNode: GenericAstNode = {
  type: 'program',
  text: 'mock file content',
  startPosition: { row: 0, column: 0 },
  endPosition: { row: 5, column: 0 },
  isNamed: true,
  fieldName: null,
  children: [
    {
      type: 'mock_child',
      text: 'child text',
      startPosition: { row: 1, column: 2 },
      endPosition: { row: 1, column: 12 },
      isNamed: true,
      fieldName: 'body',
      children: [],
    },
  ],
};

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
// mockAstAnalysisService declaration removed

const rootPath = 'root/path';

// --- Describe Block for Analysis Result ---
describe('ProjectAnalyzer Analysis Result', () => {
  // Mock LLM response that might contain outdated/different TS structure info
  const mockLlmResponseWithOldTsData = JSON.stringify({
    techStack: { languages: ['TypeScript'], frameworks: ['Node.js'] },
    structure: {
      rootDir: 'src',
      // definedFunctions and definedClasses removed
    },
    dependencies: {
      internalDependencies: {
        'src/app.ts': ['./utils'],
      },
      externalDependencies: ['express'],
    },
  });

  // Mock parsed result corresponding to the above LLM response
  const mockParsedResultWithOldTsData: DeepPartial<ProjectContext> = {
    // Use DeepPartial for flexibility
    techStack: { languages: ['TypeScript'], frameworks: ['Node.js'] },
    structure: {
      rootDir: 'src',
      // definedFunctions and definedClasses removed
    },
    dependencies: {
      internalDependencies: {
        'src/app.ts': ['./utils'],
      },
      // Add the nested structure expected by the analyzer's merge logic
      dependencies: { express: '4.17.1' },
    },
  };

  // Mock LLM response without any structure fields
  const mockLlmResponseWithoutStructure = JSON.stringify({
    techStack: { languages: ['JavaScript'] },
    // structure field is missing
    dependencies: { externalDependencies: ['lodash'] },
  });

  // Mock parsed result corresponding to the above LLM response
  const mockParsedResultWithoutStructure: DeepPartial<ProjectContext> = {
    techStack: { languages: ['JavaScript'] },
    // structure field is missing
    dependencies: {
      // Add the nested structure expected by the analyzer's merge logic
      dependencies: { express: '4.17.1' },
    },
  };

  beforeEach(() => {
    // Mocks for the 'Analysis Result' tests - Re-initialize fully
    mockFileOps = {
      writeFile: jest.fn(),
      createDirectory: jest.fn(),
      validatePath: jest.fn(),
      getFiles: jest.fn(),
      // Mock readDir and isDirectory for collectAnalyzableFiles
      readDir: jest.fn().mockImplementation((dirPath: string) => {
        if (dirPath === rootPath) return Result.ok(['src', 'package.json']); // Added package.json
        if (dirPath === path.join(rootPath, 'src')) return Result.ok(['app.ts', 'utils.ts']);
        return Result.ok([]);
      }),
      isDirectory: jest.fn().mockImplementation((filePath: string) => {
        if (filePath === path.join(rootPath, 'src')) return Result.ok(true);
        return Result.ok(false);
      }),
      // readFile will be overridden below
      readFile: jest.fn(), // Add placeholder
    } as any;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    mockLLMAgent = {
      getModelContextWindow: jest.fn().mockResolvedValue(10000),
      countTokens: jest.fn().mockResolvedValue(10),
      getCompletion: jest.fn(), // Mocked per test
      getProvider: jest.fn().mockResolvedValue(
        Result.ok({
          getContextWindowSize: jest.fn().mockReturnValue(10000),
          countTokens: jest.fn().mockResolvedValue(10),
          getCompletion: jest.fn(),
        })
      ),
    } as any;

    mockResponseParser = {
      parseLlmResponse: jest.fn(), // Mocked per test
    } as any;

    mockProgress = {
      start: jest.fn(),
      update: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    } as any;

    mockContentCollector = {
      collectContent: jest.fn().mockResolvedValue(
        Result.ok({
          // Include package.json content if needed by tests
          content: 'package.json content\nsrc/app.ts content\nsrc/utils.ts content',
          metadata: [
            { path: path.join(rootPath, 'package.json'), size: 50 },
            { path: path.join(rootPath, 'src/app.ts'), size: 300 },
            { path: path.join(rootPath, 'src/utils.ts'), size: 400 },
          ],
        })
      ),
    } as unknown as jest.Mocked<IFileContentCollector>;

    mockFilePrioritizer = {
      prioritizeFiles: jest.fn().mockImplementation((metadata: FileMetadata[]) => metadata),
    } as unknown as jest.Mocked<IFilePrioritizer>;

    mockTreeSitterParserService = {
      parse: jest.fn(), // Will be mocked more specifically below
    } as any;

    // mockAstAnalysisService instantiation removed

    // Mock TreeSitterParserService.parse to return the mock AST node for supported languages
    mockTreeSitterParserService.parse.mockImplementation((content, language) => {
      if (language === 'typescript' || language === 'javascript') {
        // Return the predefined mock AST node
        return Result.ok(mockAstNode);
      }
      // For unsupported languages in this test context, return an error or a specific result
      // For simplicity, let's assume it might return an error if called unexpectedly
      return Result.err(
        new Error(`Mock parse called with unexpected language: ${String(language)}`)
      );
    });

    // Mock readFile to return simple content for the expected files
    // eslint-disable-next-line @typescript-eslint/require-await
    mockFileOps.readFile = jest.fn().mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('app.ts')) {
        return Result.ok('app.ts content');
      }
      if (filePath.endsWith('utils.ts')) {
        return Result.ok('utils.ts content');
      }
      if (filePath.endsWith('package.json')) {
        return Result.ok('{"name": "test-package", "dependencies": {"express": "4.17.1"}}'); // Example package.json content
      }
      // Return error for unexpected calls
      return Result.err(
        new Error(`Unexpected readFile call in 'Analysis Result' suite: ${filePath}`)
      );
    });

    // Re-instantiate projectAnalyzer with mocks for this suite
    projectAnalyzer = new ProjectAnalyzer(
      mockFileOps,
      mockLogger,
      mockLLMAgent,
      mockResponseParser,
      mockProgress,
      mockContentCollector,
      mockFilePrioritizer,
      mockTreeSitterParserService,
      {
        analyzeAst: jest
          .fn()
          .mockResolvedValue(Result.ok({ functions: [], classes: [], imports: [] })),
      } as jest.Mocked<IAstAnalysisService> // Return default success Result
    );
  });

  it('should correctly merge Tree-sitter data (empty for TS), overriding LLM response', async () => {
    // LLM response still provides other data (techStack, etc.) and potentially outdated structure info
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok(mockLlmResponseWithOldTsData));
    // ResponseParser still parses the LLM response initially
    mockResponseParser.parseLlmResponse.mockReturnValue(
      Result.ok(mockParsedResultWithOldTsData as ProjectContext)
    ); // Cast for test

    const result = await projectAnalyzer.analyzeProject([rootPath]);

    expect(result.isOk()).toBe(true);
    const context = result.unwrap();

    // Check existing fields (basic check)
    expect(context.techStack.languages).toEqual(['TypeScript']); // From LLM mock
    expect(context.structure.rootDir).toBe(rootPath); // Should use the provided root path

    // Verify astData field (AC2, AC3, AC4)
    expect(context.astData).toBeDefined();
    expect(Object.keys(context.astData)).toEqual(['src/app.ts', 'src/utils.ts']); // Relative paths
    expect(context.astData['src/app.ts']).toEqual(mockAstNode); // Check value against mock
    expect(context.astData['src/utils.ts']).toEqual(mockAstNode); // Check value against mock

    // Verify definedFunctions and definedClasses are NOT present (AC9)
    expect(context.structure).not.toHaveProperty('definedFunctions');
    expect(context.structure).not.toHaveProperty('definedClasses');

    // Verify other LLM-derived data is preserved (AC9)
    expect(context.dependencies.internalDependencies).toEqual({
      'src/app.ts': ['./utils'], // From LLM mock
    });
    // Check external dependencies derived from package.json mock (AC9)
    expect(context.dependencies.dependencies).toEqual({ express: '4.17.1' }); // Corrected property name and value structure
  });

  it('should use Tree-sitter data (empty for TS) even if structure missing in LLM response', async () => {
    // LLM response doesn't contain the structure fields
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok(mockLlmResponseWithoutStructure));
    mockResponseParser.parseLlmResponse.mockReturnValue(
      Result.ok(mockParsedResultWithoutStructure as ProjectContext) // Cast for test
    );

    const result = await projectAnalyzer.analyzeProject([rootPath]);

    expect(result.isOk()).toBe(true);
    const context = result.unwrap();

    // Check existing fields
    expect(context.techStack.languages).toEqual(['JavaScript']); // From LLM mock
    expect(context.structure.rootDir).toBe(rootPath); // Should use the provided root path

    // Verify astData field (AC2, AC3, AC4)
    expect(context.astData).toBeDefined();
    expect(Object.keys(context.astData)).toEqual(['src/app.ts', 'src/utils.ts']); // Relative paths
    expect(context.astData['src/app.ts']).toEqual(mockAstNode); // Check value against mock
    expect(context.astData['src/utils.ts']).toEqual(mockAstNode); // Check value against mock

    // Verify definedFunctions and definedClasses are NOT present (AC9)
    expect(context.structure).not.toHaveProperty('definedFunctions');
    expect(context.structure).not.toHaveProperty('definedClasses');

    // Verify other LLM-derived data is preserved (or defaults if missing) (AC9)
    expect(context.dependencies.internalDependencies).toEqual({}); // Defaults correctly
    // Check external dependencies derived from package.json mock (AC9)
    expect(context.dependencies.dependencies).toEqual({ express: '4.17.1' }); // Corrected property name and value structure
  });

  it('should return error if LLM response generation fails', async () => {
    const error = new Error('LLM Error');
    mockLLMAgent.getCompletion.mockResolvedValue(Result.err(error));

    const result = await projectAnalyzer.analyzeProject([rootPath]);

    expect(result.isErr()).toBe(true);
    expect(result.error).toBe(error);
    // ** FIX: Corrected expected string **
    expect(mockProgress.fail).toHaveBeenCalledWith(
      expect.stringContaining('Project context analysis failed after multiple LLM attempts')
    );
  });

  it('should return error if LLM response parsing fails', async () => {
    const error = new Error('Parsing Error');
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok('invalid json'));
    mockResponseParser.parseLlmResponse.mockReturnValue(Result.err(error));

    const result = await projectAnalyzer.analyzeProject([rootPath]);

    expect(result.isErr()).toBe(true);
    expect(result.error).toBe(error);
    // ** FIX: Corrected expected string **
    expect(mockProgress.fail).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse analysis results from LLM')
    );
  });

  // --- New Test: Handling Parser Errors (AC8) ---
  it('should log a warning and exclude file from astData if parsing fails', async () => {
    const parseError = new Error('Simulated TS parse error');
    // Mock LLM response (can be simple as structure is overridden)
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok(mockLlmResponseWithoutStructure));
    mockResponseParser.parseLlmResponse.mockReturnValue(
      Result.ok(mockParsedResultWithoutStructure as ProjectContext)
    );

    // Mock parser to fail for one file
    mockTreeSitterParserService.parse.mockImplementation((content, language) => {
      if (language === 'typescript' && content === 'utils.ts content') {
        return Result.err(parseError); // Fail for utils.ts
      }
      if (language === 'typescript' || language === 'javascript') {
        return Result.ok(mockAstNode); // Succeed for others (app.ts)
      }
      return Result.err(
        new Error(`Mock parse called with unexpected language: ${String(language)}`)
      );
    });

    const result = await projectAnalyzer.analyzeProject([rootPath]);

    expect(result.isOk()).toBe(true);
    const context = result.unwrap();

    // Verify warning log for the failed file (single string argument)
    // Use POSIX path in the expected log message for consistency
    // Use the relative path as logged by the actual code
    expect(mockLogger.warn).toHaveBeenCalledWith(
      // Correct the prefix to match the actual log output
      expect.stringContaining(`Tree-sitter parsing failed for src/utils.ts: ${parseError.message}`)
    );

    // Verify astData only contains the successfully parsed file (AC3, AC8)
    expect(context.astData).toBeDefined();
    expect(Object.keys(context.astData)).toEqual(['src/app.ts']); // Only app.ts should be present
    expect(context.astData['src/app.ts']).toEqual(mockAstNode);

    // Verify other fields are still populated (AC9)
    expect(context.techStack.languages).toEqual(['JavaScript']); // From LLM mock
    expect(context.structure.rootDir).toBe(rootPath);
    expect(context.dependencies.dependencies).toEqual({ express: '4.17.1' }); // From package.json mock
  });

  // --- New Test: Handling Unsupported Files (AC7) ---
  it('should exclude unsupported file types from astData', async () => {
    // Add an unsupported file to the mock file system
    // Mock readDir to return Dirent-like objects wrapped in Promise<Result>
    mockFileOps.readDir.mockImplementation((dirPath: string) => {
      if (dirPath === rootPath)
        return Promise.resolve(
          Result.ok([
            { name: 'src', isDirectory: () => true, isFile: () => false },
            { name: 'image.png', isDirectory: () => false, isFile: () => true },
            { name: 'package.json', isDirectory: () => false, isFile: () => true },
          ] as any) // Use 'as any' for simplified Dirent mock
        );
      if (dirPath === path.join(rootPath, 'src'))
        return Promise.resolve(
          Result.ok([
            { name: 'app.ts', isDirectory: () => false, isFile: () => true },
            { name: 'utils.ts', isDirectory: () => false, isFile: () => true },
          ] as any)
        );
      return Promise.resolve(Result.ok([]));
    });
    // Mock readFile for the new file (remove async)
    mockFileOps.readFile = jest.fn().mockImplementation((filePath: string) => {
      // Removed async
      if (filePath.endsWith('app.ts')) return Promise.resolve(Result.ok('app.ts content')); // Wrap in Promise.resolve
      if (filePath.endsWith('utils.ts')) return Promise.resolve(Result.ok('utils.ts content')); // Wrap in Promise.resolve
      if (filePath.endsWith('image.png')) return Promise.resolve(Result.ok('png binary data')); // Wrap in Promise.resolve
      if (filePath.endsWith('package.json'))
        return Promise.resolve(
          Result.ok('{"name": "test-package", "dependencies": {"express": "4.17.1"}}')
        ); // Wrap in Promise.resolve
      return Promise.resolve(Result.err(new Error(`Unexpected readFile call: ${filePath}`))); // Wrap in Promise.resolve
    });
    // Mock content collector to include the new file
    mockContentCollector.collectContent.mockResolvedValue(
      Result.ok({
        content:
          'package.json content\nimage.png content\nsrc/app.ts content\nsrc/utils.ts content',
        metadata: [
          { path: path.join(rootPath, 'package.json'), size: 50 },
          { path: path.join(rootPath, 'image.png'), size: 1024 }, // Add metadata
          { path: path.join(rootPath, 'src/app.ts'), size: 300 },
          { path: path.join(rootPath, 'src/utils.ts'), size: 400 },
        ],
      })
    );

    // Use standard successful parse mock
    mockTreeSitterParserService.parse.mockImplementation((content, language) => {
      if (language === 'typescript' || language === 'javascript') {
        return Result.ok(mockAstNode);
      }
      return Result.err(
        new Error(`Mock parse called with unexpected language: ${String(language)}`)
      );
    });

    // Mock LLM response
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok(mockLlmResponseWithoutStructure));
    mockResponseParser.parseLlmResponse.mockReturnValue(
      Result.ok(mockParsedResultWithoutStructure as ProjectContext)
    );

    const result = await projectAnalyzer.analyzeProject([rootPath]);

    expect(result.isOk()).toBe(true);
    const context = result.unwrap();

    // Verify parser was NOT called for the unsupported file
    expect(mockTreeSitterParserService.parse).not.toHaveBeenCalledWith(
      'png binary data',
      expect.any(String) // Or be more specific if needed
    );
    // Verify parser WAS called for supported files
    expect(mockTreeSitterParserService.parse).toHaveBeenCalledWith('app.ts content', 'typescript');
    expect(mockTreeSitterParserService.parse).toHaveBeenCalledWith(
      'utils.ts content',
      'typescript'
    );

    // Verify astData only contains supported files (AC3, AC7)
    expect(context.astData).toBeDefined();
    expect(Object.keys(context.astData)).toEqual(['src/app.ts', 'src/utils.ts']);
    expect(context.astData['src/app.ts']).toEqual(mockAstNode);
    expect(context.astData['src/utils.ts']).toEqual(mockAstNode);

    // Verify other fields are still populated (AC9)
    expect(context.techStack.languages).toEqual(['JavaScript']);
    expect(context.structure.rootDir).toBe(rootPath);
    expect(context.dependencies.dependencies).toEqual({ express: '4.17.1' });
  });
}); // Closing bracket for 'ProjectAnalyzer Analysis Result' describe block
