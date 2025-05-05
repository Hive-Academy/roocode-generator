/* eslint-disable @typescript-eslint/unbound-method */
import path from 'path';
import { ProjectAnalyzer } from '../../../src/core/analysis/project-analyzer';
import { IFileOperations } from '../../../src/core/file-operations/interfaces';
import { ILogger } from '../../../src/core/services/logger-service';
import { LLMAgent } from '../../../src/core/llm/llm-agent';
import { ResponseParser } from '../../../src/core/analysis/response-parser';
import { ProgressIndicator } from '../../../src/core/ui/progress-indicator';
import {
  IFileContentCollector,
  IFilePrioritizer,
  ITreeSitterParserService,
  FileMetadata,
} from '../../../src/core/analysis/interfaces';
import {
  IAstAnalysisService,
  CodeInsights,
} from '../../../src/core/analysis/ast-analysis.interfaces';
import { ProjectContext, GenericAstNode } from '../../../src/core/analysis/types';
import { Result } from '../../../src/core/result/result';
import { EXTENSION_LANGUAGE_MAP } from '../../../src/core/analysis/tree-sitter.config';
import { Dirent } from 'fs'; // Import Dirent for mock

// Mock data
const mockAstNode: GenericAstNode = {
  type: 'program',
  text: 'mock file content',
  startPosition: { row: 0, column: 0 },
  endPosition: { row: 5, column: 0 },
  isNamed: true,
  fieldName: null,
  children: [],
};

// Updated mock CodeInsights based on interface definitions
const mockCodeInsights1: CodeInsights = {
  functions: [{ name: 'func1', parameters: ['p1'] }],
  classes: [],
  imports: [{ source: 'dep1' }],
  // Removed non-existent properties like languageConstructs, dependencies
};

const mockCodeInsights2: CodeInsights = {
  functions: [{ name: 'func2', parameters: [] }],
  classes: [{ name: 'MyClass' }],
  imports: [{ source: 'dep2' }, { source: 'dep3' }],
};

const mockBasicProjectContext: Partial<ProjectContext> = {
  techStack: {
    languages: ['typescript'],
    frameworks: [],
    buildTools: [],
    testingFrameworks: [],
    linters: [],
    packageManager: '',
  },
  structure: {
    rootDir: '',
    sourceDir: '',
    testDir: '',
    configFiles: [],
    mainEntryPoints: [],
    componentStructure: {},
  },
  dependencies: {
    dependencies: {},
    devDependencies: {},
    peerDependencies: {},
    internalDependencies: {},
  },
};

// Mocks
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

const rootPath = '/mock/project';
const file1Path = path.join(rootPath, 'src/file1.ts');
const file2Path = path.join(rootPath, 'src/file2.js');
const file3Path = path.join(rootPath, 'config/config.json'); // Unsupported for AST
const file1RelativePath = 'src/file1.ts';
const file2RelativePath = 'src/file2.js';

describe('ProjectAnalyzer - IAstAnalysisService Integration', () => {
  beforeEach(() => {
    // Reset mocks for each test
    mockFileOps = {
      readFile: jest.fn(),
      readDir: jest.fn(),
      isDirectory: jest.fn(),
      // Add other methods if needed by ProjectAnalyzer setup, ensure they return Results
      writeFile: jest.fn().mockResolvedValue(Result.ok(undefined)),
      createDirectory: jest.fn().mockResolvedValue(Result.ok(undefined)),
      validatePath: jest.fn().mockReturnValue(true), // validatePath is synchronous
      normalizePath: jest.fn((p) => p), // Simple pass-through normalize
      exists: jest.fn().mockResolvedValue(Result.ok(true)), // Assume exists for simplicity
      copyDirectoryRecursive: jest.fn().mockResolvedValue(Result.ok(undefined)),
      // Removed getFiles as it's not in the interface
    };
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
    // Cast to any initially to add potentially private/complex properties, then cast to Mocked
    mockLLMAgent = {
      getModelContextWindow: jest.fn().mockResolvedValue(100000),
      countTokens: jest.fn().mockResolvedValue(10),
      getCompletion: jest.fn().mockImplementation(async (_systemPrompt, _userPrompt) => {
        // Added async
        // Prefix unused args
        console.log('>>> MOCK: getCompletion called.');
        const result = Result.ok(JSON.stringify(mockBasicProjectContext));
        console.log('>>> MOCK: getCompletion returning:', result);
        return Promise.resolve(result); // Keep Promise.resolve for consistency, async handles it
      }),
      // Fix: Return a provider object with a countTokens method
      getProvider: jest.fn().mockResolvedValue(
        Result.ok({
          countTokens: jest.fn().mockResolvedValue(5), // Mock provider's countTokens
        })
      ),
      analyzeProject: jest.fn().mockResolvedValue(Result.ok({})),
      // Add other properties mentioned in TS error if needed by Mocked<LLMAgent>
      llmProviderRegistry: jest.fn(),
      fileOps: jest.fn(),
      logger: jest.fn(),
      readFileContent: jest.fn(),
      // Add placeholders for other potential missing properties if errors persist
      configService: jest.fn(),
      tokenCounter: jest.fn(),
      buildPrompt: jest.fn(),
      parseResponse: jest.fn(),
      handleLLMError: jest.fn(),
    } as any as jest.Mocked<LLMAgent>; // Cast to Mocked<LLMAgent>

    mockResponseParser = {
      parseLlmResponse: jest.fn().mockReturnValue(Result.ok(mockBasicProjectContext)),
      // logger is private, cannot be assigned directly in mock object literal
      jsonSchemaHelper: { validate: jest.fn().mockReturnValue({ valid: true, errors: [] }) } as any,
      cleanResponse: jest.fn((text) => text),
      applyProjectContextDefaults: jest.fn((ctx) => ctx),
    } as any as jest.Mocked<ResponseParser>; // Cast to Mocked<ResponseParser>

    mockProgress = {
      start: jest.fn(),
      update: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
      stop: jest.fn(),
      // spinner is private, cannot be assigned directly
    } as any as jest.Mocked<ProgressIndicator>; // Re-add cast after removing spinner
    mockContentCollector = {
      collectContent: jest.fn().mockImplementation(async (...args) => {
        // Added async
        console.log('>>> MOCK: collectContent called with:', args);
        const result = Result.ok({
          content: 'file1 content\nfile2 content',
          metadata: [
            { path: file1Path, size: 100 },
            { path: file2Path, size: 150 },
            { path: file3Path, size: 50 },
          ],
        });
        console.log('>>> MOCK: collectContent returning:', result);
        return Promise.resolve(result); // Return a promise as original is async
      }),
    };
    mockFilePrioritizer = {
      // Update signature to include rootDir
      prioritizeFiles: jest.fn((files: FileMetadata[], _rootDir: string) => files), // Prefix unused rootDir
    };
    mockTreeSitterParserService = {
      parse: jest.fn(),
      initialize: jest.fn().mockResolvedValue(Result.ok(undefined)), // Add missing initialize
    };
    mockAstAnalysisService = {
      analyzeAst: jest.fn(), // Mocked per test case below
    };

    // --- Mock File System Setup ---
    // Mock readDir to return mock Dirent objects
    mockFileOps.readDir.mockImplementation(async (dirPath: string) => {
      // Keep async
      const normalizedDirPath = dirPath.replace(/\\/g, '/'); // Normalize path
      console.log(`>>> MOCK: readDir called with: ${normalizedDirPath}`);
      const mockDirent = (name: string, isDir: boolean): Partial<Dirent> => ({
        name,
        isDirectory: () => isDir,
        isFile: () => !isDir,
      });

      // Use normalized paths for comparison keys
      const normRootPath = rootPath.replace(/\\/g, '/');
      const srcPath = path.join(rootPath, 'src').replace(/\\/g, '/');
      const configPath = path.join(rootPath, 'config').replace(/\\/g, '/');

      if (normalizedDirPath === normRootPath) {
        return Promise.resolve(
          Result.ok([
            mockDirent('src', true),
            mockDirent('config', true),
            mockDirent('package.json', false),
          ] as Dirent[])
        );
      }
      if (normalizedDirPath === srcPath) {
        return Promise.resolve(
          Result.ok([mockDirent('file1.ts', false), mockDirent('file2.js', false)] as Dirent[])
        );
      }
      if (normalizedDirPath === configPath) {
        return Promise.resolve(Result.ok([mockDirent('config.json', false)] as Dirent[]));
      }
      return Promise.resolve(Result.ok([]));
    });

    // Mock isDirectory
    mockFileOps.isDirectory.mockImplementation(async (filePath: string) => {
      // Added async
      const normalizedFilePath = filePath.replace(/\\/g, '/'); // Normalize path
      console.log(`>>> MOCK: isDirectory called with: ${normalizedFilePath}`);
      let isDir = false;
      const srcPath = path.join(rootPath, 'src').replace(/\\/g, '/'); // Normalize comparison path
      const configPath = path.join(rootPath, 'config').replace(/\\/g, '/'); // Normalize comparison path
      if (normalizedFilePath === srcPath || normalizedFilePath === configPath) {
        isDir = true;
      }
      console.log(`>>> MOCK: isDirectory returning: ${isDir}`);
      return Promise.resolve(Result.ok(isDir)); // Keep explicit Promise return
    });

    // Mock readFile for files that will be parsed
    mockFileOps.readFile.mockImplementation(async (filePath: string) => {
      // Added async
      const normalizedFilePath = filePath.replace(/\\/g, '/'); // Normalize path
      console.log(`>>> MOCK: readFile called with: ${normalizedFilePath}`);
      let result: Result<string, Error>;
      const normFile1Path = file1Path.replace(/\\/g, '/'); // Normalize comparison path
      const normFile2Path = file2Path.replace(/\\/g, '/'); // Normalize comparison path
      const normPkgJsonPath = path.join(rootPath, 'package.json').replace(/\\/g, '/'); // Normalize comparison path

      if (normalizedFilePath === normFile1Path) result = Result.ok('file1 content');
      else if (normalizedFilePath === normFile2Path) result = Result.ok('file2 content');
      // config.json won't be read for parsing as it's not in EXTENSION_LANGUAGE_MAP
      // Add package.json read for dependency analysis part of ProjectAnalyzer
      else if (normalizedFilePath === normPkgJsonPath) result = Result.ok('{}');
      else result = Result.err(new Error(`Unexpected readFile call: ${normalizedFilePath}`));
      console.log(`>>> MOCK: readFile returning: ${result.isOk() ? 'Ok(...)' : 'Err(...)'}`);
      return Promise.resolve(result); // Keep explicit Promise return
    });

    // Mock TreeSitterParserService to return ASTs for supported files
    mockTreeSitterParserService.parse.mockImplementation(
      (content: string, language: keyof typeof EXTENSION_LANGUAGE_MAP) => {
        console.log(
          `>>> MOCK: parse called with language: ${language}, content: "${content.substring(0, 20)}..."`
        );
        let result: Result<GenericAstNode, Error>;
        if (language === 'typescript' && content === 'file1 content') {
          result = Result.ok({ ...mockAstNode, text: content }); // Return unique AST for file 1
        } else if (language === 'javascript' && content === 'file2 content') {
          result = Result.ok({ ...mockAstNode, text: content, type: 'program_js' }); // Return unique AST for file 2
        } else {
          result = Result.err(
            new Error(`Mock parse called unexpectedly for language: ${language}`)
          );
        }
        console.log(`>>> MOCK: parse returning: ${result.isOk() ? 'Ok(...)' : 'Err(...)'}`);
        return result;
      }
    );

    // Instantiate ProjectAnalyzer with all mocks
    projectAnalyzer = new ProjectAnalyzer(
      mockFileOps,
      mockLogger,
      mockLLMAgent,
      mockResponseParser,
      mockProgress,
      mockContentCollector,
      mockFilePrioritizer,
      mockTreeSitterParserService,
      mockAstAnalysisService // Inject the specific mock
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- Test Cases Start Here ---

  test('should call astAnalysisService.analyzeAst concurrently for all valid ASTs', async () => {
    // Arrange: Setup analyzeAst to resolve successfully for both files
    mockAstAnalysisService.analyzeAst
      .mockResolvedValueOnce(Result.ok(mockCodeInsights1)) // For file1.ts
      .mockResolvedValueOnce(Result.ok(mockCodeInsights2)); // For file2.js

    // Act
    const result = await projectAnalyzer.analyzeProject([rootPath]);

    // Assert
    expect(result.isOk()).toBe(true);
    // Verify analyzeAst was called twice (concurrency implicitly tested by Promise.allSettled)
    expect(mockAstAnalysisService.analyzeAst).toHaveBeenCalledTimes(2);
    // Verify logger messages indicating concurrent analysis start/end
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Starting concurrent AST analysis for 2 files...')
    );
    expect(mockLogger.debug).toHaveBeenCalledWith('Concurrent AST analysis step completed.');
  });

  test('should call astAnalysisService.analyzeAst with correct AST data and relative path', async () => {
    // Arrange
    mockAstAnalysisService.analyzeAst
      .mockResolvedValueOnce(Result.ok(mockCodeInsights1))
      .mockResolvedValueOnce(Result.ok(mockCodeInsights2));

    // Act
    await projectAnalyzer.analyzeProject([rootPath]);

    // Assert
    expect(mockAstAnalysisService.analyzeAst).toHaveBeenCalledTimes(2);

    // Verify call arguments for file1.ts
    expect(mockAstAnalysisService.analyzeAst).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'file1 content', type: 'program' }), // Check unique part of AST
      file1RelativePath // Check relative path
    );

    // Verify call arguments for file2.js
    expect(mockAstAnalysisService.analyzeAst).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'file2 content', type: 'program_js' }), // Check unique part of AST
      file2RelativePath // Check relative path
    );
  });
  test('Success Path: should populate codeInsights correctly when all analyses succeed', async () => {
    // Arrange
    mockAstAnalysisService.analyzeAst
      .mockResolvedValueOnce(Result.ok(mockCodeInsights1)) // file1.ts
      .mockResolvedValueOnce(Result.ok(mockCodeInsights2)); // file2.js

    // Act
    const result = await projectAnalyzer.analyzeProject([rootPath]);

    // Assert
    expect(result.isOk()).toBe(true);
    const context = result.unwrap();

    // Verify codeInsights content
    expect(context.codeInsights).toBeDefined();
    expect(Object.keys(context.codeInsights)).toEqual([file1RelativePath, file2RelativePath]);
    expect(context.codeInsights[file1RelativePath]).toEqual(mockCodeInsights1);
    expect(context.codeInsights[file2RelativePath]).toEqual(mockCodeInsights2);

    // Verify logger messages for success
    expect(mockLogger.debug).toHaveBeenCalledWith(
      `Successfully generated code insights for ${file1RelativePath}`
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      `Successfully generated code insights for ${file2RelativePath}`
    );
    expect(mockLogger.warn).not.toHaveBeenCalled(); // No warnings
    expect(mockLogger.error).not.toHaveBeenCalled(); // No errors related to AST analysis

    // Verify codeInsights content
    expect(context.codeInsights).toBeDefined();
    expect(Object.keys(context.codeInsights)).toEqual([file1RelativePath, file2RelativePath]);
    expect(context.codeInsights[file1RelativePath]).toEqual(mockCodeInsights1);
    expect(context.codeInsights[file2RelativePath]).toEqual(mockCodeInsights2);

    // Verify structure.componentStructure defaults to {}
    expect(context.structure.componentStructure).toEqual({});

    // Verify dependencies defaults
    expect(context.dependencies.dependencies).toEqual({});
    expect(context.dependencies.devDependencies).toEqual({});
    expect(context.dependencies.peerDependencies).toEqual({});
    expect(context.dependencies.internalDependencies).toEqual({});

    // CRITICAL: Verify final context structure
    const contextKeys = Object.keys(context);
    expect(contextKeys).toEqual(
      expect.arrayContaining(['techStack', 'structure', 'dependencies', 'codeInsights'])
    );
    expect(contextKeys.length).toBe(4);
    expect(context).not.toHaveProperty('astData');
    expect(context).not.toHaveProperty('someIntermediateData');

    test('Partial Failure Path: should handle Err results from analyzeAst and log warnings', async () => {
      // Arrange
      const analysisError = new Error('Simulated AST analysis failure');
      mockAstAnalysisService.analyzeAst
        .mockResolvedValueOnce(Result.ok(mockCodeInsights1)) // file1.ts succeeds
        .mockResolvedValueOnce(Result.err(analysisError)); // file2.js fails with Err

      // Act
      const result = await projectAnalyzer.analyzeProject([rootPath]);

      // Assert
      expect(result.isOk()).toBe(true); // Overall analysis should still succeed
      const context = result.unwrap();

      // Verify codeInsights only contains the successful result
      expect(context.codeInsights).toBeDefined();
      expect(Object.keys(context.codeInsights)).toEqual([file1RelativePath]); // Only file1
      expect(context.codeInsights[file1RelativePath]).toEqual(mockCodeInsights1);
      expect(context.codeInsights[file2RelativePath]).toBeUndefined();

      // Verify logger messages
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Successfully generated code insights for ${file1RelativePath}`
      );
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          `Failed to generate code insights for ${file2RelativePath}: ${analysisError.message}`
        )
      );
      expect(mockLogger.error).not.toHaveBeenCalled(); // No errors expected for Err results

      const contextKeys = Object.keys(context);
      expect(contextKeys).toEqual(
        expect.arrayContaining(['techStack', 'structure', 'dependencies', 'codeInsights'])
      );
      expect(contextKeys.length).toBe(4);
      expect(context).not.toHaveProperty('astData');
      expect(context).not.toHaveProperty('someIntermediateData');
    }); // <-- End of Partial Failure Path test

    test('Promise Rejection Path: should handle promise rejections from analyzeAst and log errors', async () => {
      // Arrange
      const rejectionError = new Error('Simulated AST analysis promise rejection');
      mockAstAnalysisService.analyzeAst
        .mockResolvedValueOnce(Result.ok(mockCodeInsights1)) // file1.ts succeeds
        .mockRejectedValueOnce(rejectionError); // file2.js promise rejects

      // Act
      const result = await projectAnalyzer.analyzeProject([rootPath]);

      // Assert
      expect(result.isOk()).toBe(true); // Overall analysis should still succeed
      const context = result.unwrap();

      // Verify codeInsights only contains the successful result
      expect(context.codeInsights).toBeDefined();
      expect(Object.keys(context.codeInsights)).toEqual([file1RelativePath]); // Only file1
      expect(context.codeInsights[file1RelativePath]).toEqual(mockCodeInsights1);
      expect(context.codeInsights[file2RelativePath]).toBeUndefined();

      // Verify logger messages
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Successfully generated code insights for ${file1RelativePath}`
      );
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
      // Note: Promise.allSettled wraps rejection reason, check for that structure if needed,
      // but the ProjectAnalyzer code logs the reason directly.
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          `AST analysis promise rejected for ${file2RelativePath}: ${rejectionError}`
        )
      );
      expect(mockLogger.warn).not.toHaveBeenCalled(); // No warnings expected for rejections

      // CRITICAL: Verify final context structure
      const contextKeys = Object.keys(context);
      expect(contextKeys).toEqual(
        expect.arrayContaining([
          'techStack',
          'structure',
          'dependencies',
          'codeInsights', // Should still be present
        ])
      );
      expect(contextKeys.length).toBe(4); // Length should be 4 now
      expect(context).not.toHaveProperty('astData'); // Assert astData is NOT present
      expect(context).not.toHaveProperty('someIntermediateData');
    }); // <-- End of Promise Rejection Path test

    test('No ASTs Case: should not call analyzeAst and codeInsights should be undefined if no ASTs are generated', async () => {
      // Arrange: Mock TreeSitterParserService to fail parsing for all files
      const parseError = new Error('Simulated parsing failure for all files');
      mockTreeSitterParserService.parse.mockReturnValue(Result.err(parseError));

      // Act
      const result = await projectAnalyzer.analyzeProject([rootPath]);

      // Assert
      expect(result.isOk()).toBe(true); // Analysis should still succeed overall
      const context = result.unwrap();

      // Verify astAnalysisService was NOT called
      expect(mockAstAnalysisService.analyzeAst).not.toHaveBeenCalled();

      // Verify logger messages indicating parsing failures and skipping analysis
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          `Tree-sitter parsing failed for ${file1RelativePath}: ${parseError.message}`
        )
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          `Tree-sitter parsing failed for ${file2RelativePath}: ${parseError.message}`
        )
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'No valid ASTs found to analyze. Skipping analysis step.'
      );

      // Verify codeInsights is an empty object (as it's initialized to {})
      expect(context.codeInsights).toEqual({});

      // CRITICAL: Verify final context structure (should NOT include codeInsights)
      const contextKeys = Object.keys(context);
      expect(contextKeys).toEqual(
        expect.arrayContaining([
          'techStack',
          'structure',
          'dependencies',
          'astData', // astData is still a required key, even if empty
          'codeInsights', // Expect codeInsights to be present (as {})
        ])
      );
      // Ensure ONLY the expected 5 keys are present
      expect(contextKeys.length).toBe(5); // Expect 5 keys
      // Removed: expect(context).not.toHaveProperty('codeInsights');
      expect(context).not.toHaveProperty('someIntermediateData');
    }); // <-- End of No ASTs Case test
  });
});
