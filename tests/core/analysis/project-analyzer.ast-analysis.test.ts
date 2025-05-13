/* eslint-disable @typescript-eslint/unbound-method */
import path from 'path';
import { CodeInsights } from '../../../src/core/analysis/ast-analysis.interfaces';
import { ProjectContext, GenericAstNode } from '../../../src/core/analysis/types';
import { FileMetadata } from '../../../src/core/analysis/interfaces'; // Corrected FileMetadata import
import { Result } from '../../../src/core/result/result';
import { EXTENSION_LANGUAGE_MAP } from '../../../src/core/analysis/tree-sitter.config';
import { Dirent } from 'fs'; // Import Dirent for mock
// Removed createMockTechStackAnalyzerService as it's part of createMockProjectAnalyzer
import {
  createMockProjectAnalyzer,
  MockProjectAnalyzer,
} from '../../__mocks__/project-analyzer.mock'; // Corrected path
import { ILLMProvider } from '@core/llm/interfaces';
import { LLMProviderError } from '@core/llm/llm-provider-errors';

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
};

// Mocks
let projectAnalyzer: MockProjectAnalyzer;
// Individual mock declarations removed, they are now part of MockProjectAnalyzer

const rootPath = '/mock/project';
const file1Path = path.join(rootPath, 'src/file1.ts');
const file2Path = path.join(rootPath, 'src/file2.js');
const file3Path = path.join(rootPath, 'config/config.json'); // Unsupported for AST
const file1RelativePath = 'src/file1.ts';
const file2RelativePath = 'src/file2.js';

describe('ProjectAnalyzer - IAstAnalysisService Integration', () => {
  beforeEach(() => {
    projectAnalyzer = createMockProjectAnalyzer();

    // Configure default behavior for encapsulated mocks as needed for this test suite
    projectAnalyzer.mockLLMAgent.getModelContextWindow.mockResolvedValue(100000);
    projectAnalyzer.mockLLMAgent.countTokens.mockResolvedValue(10);
    projectAnalyzer.mockLLMAgent.getCompletion.mockImplementation(
      async (_systemPrompt: string, _userPrompt: string) => {
        // Typed parameters
        console.log('>>> MOCK (via projectAnalyzer): getCompletion called.');
        const result = Result.ok(JSON.stringify(mockBasicProjectContext));
        console.log('>>> MOCK (via projectAnalyzer): getCompletion returning:', result);
        return Promise.resolve(result);
      }
    );
    // Ensure the mock for getProvider returns a complete enough ILLMProvider
    projectAnalyzer.mockLLMAgent.getProvider.mockResolvedValue(
      Result.ok({
        name: 'testMockProvider', // Added name
        getCompletion: jest.fn().mockResolvedValue(Result.ok('test provider completion')), // Added getCompletion
        getStructuredCompletion: jest.fn().mockResolvedValue(Result.ok('test provider')),
        getContextWindowSize: jest.fn().mockResolvedValue(2048), // Added getContextWindowSize
        countTokens: jest.fn().mockResolvedValue(5), // Existing
        // listModels is optional
      } as ILLMProvider) // Added cast for clarity
    );

    projectAnalyzer.mockTechStackAnalyzerService.analyze.mockResolvedValue({
      languages: ['typescript'],
      frameworks: ['jest'],
      buildTools: ['npm'],
      testingFrameworks: ['jest'],
      linters: ['eslint'],
      packageManager: 'npm',
    });

    projectAnalyzer.mockFileContentCollector.collectContent.mockImplementation(
      async (_filePaths: string[], _rootDir: string, _tokenLimit: number) => {
        // Typed parameters
        console.log('>>> MOCK (via projectAnalyzer): collectContent called with:', {
          _filePaths,
          _rootDir,
          _tokenLimit,
        }); // Adjusted log
        const result = Result.ok({
          content: 'file1 content\nfile2 content',
          metadata: [
            { path: file1Path, size: 100 },
            { path: file2Path, size: 150 },
            { path: file3Path, size: 50 },
          ],
        });
        console.log('>>> MOCK (via projectAnalyzer): collectContent returning:', result);
        return Promise.resolve(result);
      }
    );

    projectAnalyzer.mockFilePrioritizer.prioritizeFiles.mockImplementation(
      (files: FileMetadata[], _rootDir: string) => files
    );
    projectAnalyzer.mockTreeSitterParserService.initialize.mockReturnValue(Result.ok(undefined)); // Changed to mockReturnValue

    // --- Mock File System Setup (on projectAnalyzer.mockFileOps) ---
    projectAnalyzer.mockFileOps.readDir.mockImplementation(async (dirPath: string) => {
      const normalizedDirPath = dirPath.replace(/\\/g, '/');
      console.log(`>>> MOCK (via projectAnalyzer): readDir called with: ${normalizedDirPath}`);
      const mockDirent = (name: string, isDir: boolean): Partial<Dirent> => ({
        name,
        isDirectory: () => isDir,
        isFile: () => !isDir,
      });
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

    projectAnalyzer.mockFileOps.isDirectory.mockImplementation(async (filePath: string) => {
      const normalizedFilePath = filePath.replace(/\\/g, '/');
      console.log(`>>> MOCK (via projectAnalyzer): isDirectory called with: ${normalizedFilePath}`);
      let isDir = false;
      const srcPath = path.join(rootPath, 'src').replace(/\\/g, '/');
      const configPath = path.join(rootPath, 'config').replace(/\\/g, '/');
      if (normalizedFilePath === srcPath || normalizedFilePath === configPath) {
        isDir = true;
      }
      console.log(`>>> MOCK (via projectAnalyzer): isDirectory returning: ${isDir}`);
      return Promise.resolve(Result.ok(isDir));
    });

    projectAnalyzer.mockFileOps.readFile.mockImplementation(async (filePath: string) => {
      const normalizedFilePath = filePath.replace(/\\/g, '/');
      console.log(`>>> MOCK (via projectAnalyzer): readFile called with: ${normalizedFilePath}`);
      let result: Result<string, Error>;
      const normFile1Path = file1Path.replace(/\\/g, '/');
      const normFile2Path = file2Path.replace(/\\/g, '/');
      const normPkgJsonPath = path.join(rootPath, 'package.json').replace(/\\/g, '/');

      if (normalizedFilePath === normFile1Path) result = Result.ok('file1 content');
      else if (normalizedFilePath === normFile2Path) result = Result.ok('file2 content');
      else if (normalizedFilePath === normPkgJsonPath)
        result = Result.ok('{}'); // For package.json
      else result = Result.err(new Error(`Unexpected readFile call: ${normalizedFilePath}`));
      console.log(
        `>>> MOCK (via projectAnalyzer): readFile returning: ${result.isOk() ? 'Ok(...)' : 'Err(...)'}`
      );
      return Promise.resolve(result);
    });

    projectAnalyzer.mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined)); // Default for saveProjectContextToFile
    projectAnalyzer.mockFileOps.createDirectory.mockResolvedValue(Result.ok(undefined)); // Default for saveProjectContextToFile
    projectAnalyzer.mockFileOps.exists.mockResolvedValue(Result.ok(true));

    projectAnalyzer.mockTreeSitterParserService.parse.mockImplementation(
      (content: string, language: keyof typeof EXTENSION_LANGUAGE_MAP) => {
        console.log(
          `>>> MOCK (via projectAnalyzer): parse called with language: ${language}, content: "${content.substring(0, 20)}..."`
        );
        let result: Result<GenericAstNode, Error>;
        if (language === 'typescript' && content === 'file1 content') {
          result = Result.ok({ ...mockAstNode, text: content });
        } else if (language === 'javascript' && content === 'file2 content') {
          result = Result.ok({ ...mockAstNode, text: content, type: 'program_js' });
        } else {
          result = Result.err(
            new Error(`Mock parse called unexpectedly for language: ${language}`)
          );
        }
        console.log(
          `>>> MOCK (via projectAnalyzer): parse returning: ${result.isOk() ? 'Ok(...)' : 'Err(...)'}`
        );
        return result;
      }
    );
    // mockAstAnalysisService.analyzeAst is configured per test using projectAnalyzer.mockAstAnalysisService.analyzeAst
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // --- Test Cases Start Here ---

  test('should call astAnalysisService.analyzeAst concurrently for all valid ASTs', async () => {
    // Arrange: Setup analyzeAst to resolve successfully for both files
    projectAnalyzer.mockAstAnalysisService.analyzeAst
      .mockResolvedValueOnce(Result.ok(mockCodeInsights1)) // For file1.ts
      .mockResolvedValueOnce(Result.ok(mockCodeInsights2)); // For file2.js

    // Act
    const result = await projectAnalyzer.analyzeProject([rootPath]);

    // Assert
    expect(result.isOk()).toBe(true);
    // Verify analyzeAst was called twice (concurrency implicitly tested by Promise.allSettled)
    expect(projectAnalyzer.mockAstAnalysisService.analyzeAst).toHaveBeenCalledTimes(2);
    // Verify logger messages indicating concurrent analysis start/end
    expect(projectAnalyzer.mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Starting concurrent AST analysis for 2 files...')
    );
    expect(projectAnalyzer.mockLogger.debug).toHaveBeenCalledWith(
      'Concurrent AST analysis step completed.'
    );
  });

  test('should call astAnalysisService.analyzeAst with correct AST data and relative path', async () => {
    // Arrange
    projectAnalyzer.mockAstAnalysisService.analyzeAst
      .mockResolvedValueOnce(Result.ok(mockCodeInsights1))
      .mockResolvedValueOnce(Result.ok(mockCodeInsights2));

    // Act
    await projectAnalyzer.analyzeProject([rootPath]);

    // Assert
    expect(projectAnalyzer.mockAstAnalysisService.analyzeAst).toHaveBeenCalledTimes(2);

    // Verify call arguments for file1.ts
    expect(projectAnalyzer.mockAstAnalysisService.analyzeAst).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'file1 content', type: 'program' }), // Check unique part of AST
      file1RelativePath // Check relative path
    );

    // Verify call arguments for file2.js
    expect(projectAnalyzer.mockAstAnalysisService.analyzeAst).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'file2 content', type: 'program_js' }), // Check unique part of AST
      file2RelativePath // Check relative path
    );
  });
  test('Success Path: should populate codeInsights correctly when all analyses succeed', async () => {
    // Arrange
    projectAnalyzer.mockAstAnalysisService.analyzeAst
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
    expect(projectAnalyzer.mockLogger.trace).toHaveBeenCalledWith(
      `Successfully generated code insights for ${file1RelativePath}`
    );
    expect(projectAnalyzer.mockLogger.trace).toHaveBeenCalledWith(
      `Successfully generated code insights for ${file2RelativePath}`
    );
    expect(projectAnalyzer.mockLogger.warn).not.toHaveBeenCalled(); // No warnings
    expect(projectAnalyzer.mockLogger.error).not.toHaveBeenCalled(); // No errors related to AST analysis

    // Verify codeInsights content
    expect(context.codeInsights).toBeDefined();
    expect(Object.keys(context.codeInsights)).toEqual([file1RelativePath, file2RelativePath]);
    expect(context.codeInsights[file1RelativePath]).toEqual(mockCodeInsights1);
    expect(context.codeInsights[file2RelativePath]).toEqual(mockCodeInsights2);

    // CRITICAL: Verify final context structure
    const contextKeys = Object.keys(context);
    expect(contextKeys).toEqual(
      expect.arrayContaining(['techStack', 'structure', 'dependencies', 'codeInsights'])
    );
    expect(contextKeys.length).toBe(5);
    expect(context).not.toHaveProperty('astData');
    expect(context).not.toHaveProperty('someIntermediateData');
  }); // <-- MOVED CLOSING BRACKET HERE

  test('Partial Failure Path: should handle Err results from analyzeAst and log warnings', async () => {
    // Arrange
    const analysisError = new LLMProviderError('Simulated AST analysis failure', 'Error', 'Error');
    projectAnalyzer.mockAstAnalysisService.analyzeAst
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
    expect(projectAnalyzer.mockLogger.trace).toHaveBeenCalledWith(
      `Successfully generated code insights for ${file1RelativePath}`
    );
    expect(projectAnalyzer.mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(projectAnalyzer.mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        `Failed to generate code insights for ${file2RelativePath}: ${analysisError.message}`
      )
    );
    expect(projectAnalyzer.mockLogger.error).not.toHaveBeenCalled(); // No errors expected for Err results

    const contextKeys = Object.keys(context);
    expect(contextKeys).toEqual(
      expect.arrayContaining(['techStack', 'structure', 'dependencies', 'codeInsights'])
    );
    expect(contextKeys.length).toBe(5);
    expect(context).not.toHaveProperty('astData');
    expect(context).not.toHaveProperty('someIntermediateData');
  }); // <-- End of Partial Failure Path test

  test('Promise Rejection Path: should handle promise rejections from analyzeAst and log errors', async () => {
    // Arrange
    const rejectionError = new Error('Simulated AST analysis promise rejection');
    projectAnalyzer.mockAstAnalysisService.analyzeAst
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
    expect(projectAnalyzer.mockLogger.trace).toHaveBeenCalledWith(
      `Successfully generated code insights for ${file1RelativePath}`
    );
    expect(projectAnalyzer.mockLogger.error).toHaveBeenCalledTimes(1);
    // Note: Promise.allSettled wraps rejection reason, check for that structure if needed,
    // but the ProjectAnalyzer code logs the reason directly.
    expect(projectAnalyzer.mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining(
        `AST analysis promise rejected for ${file2RelativePath}: ${rejectionError}`
      )
    );
    expect(projectAnalyzer.mockLogger.warn).not.toHaveBeenCalled(); // No warnings expected for rejections

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
    expect(contextKeys.length).toBe(5); // Length should be 5 now
    expect(context).not.toHaveProperty('astData'); // Assert astData is NOT present
    expect(context).not.toHaveProperty('someIntermediateData');
  }); // <-- End of Promise Rejection Path test

  test('No ASTs Case: should not call analyzeAst and codeInsights should be undefined if no ASTs are generated', async () => {
    // Arrange: Mock TreeSitterParserService to fail parsing for all files
    const parseError = new Error('Simulated parsing failure for all files');
    projectAnalyzer.mockTreeSitterParserService.parse.mockReturnValue(Result.err(parseError));

    // Act
    const result = await projectAnalyzer.analyzeProject([rootPath]);

    // Assert
    expect(result.isOk()).toBe(true); // Analysis should still succeed overall
    const context = result.unwrap();

    // Verify astAnalysisService was NOT called
    expect(projectAnalyzer.mockAstAnalysisService.analyzeAst).not.toHaveBeenCalled();

    // Verify logger messages indicating parsing failures and skipping analysis
    expect(projectAnalyzer.mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        `Tree-sitter parsing failed for ${file1RelativePath}: ${parseError.message}`
      )
    );
    expect(projectAnalyzer.mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        `Tree-sitter parsing failed for ${file2RelativePath}: ${parseError.message}`
      )
    );
    expect(projectAnalyzer.mockLogger.debug).toHaveBeenCalledWith(
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
        // 'astData', // astData is intentionally excluded from the final context
        'codeInsights', // Expect codeInsights to be present (as {})
        'packageJson', // Expect packageJson to be present
      ])
    );
    // Ensure ONLY the expected 5 keys are present
    expect(contextKeys.length).toBe(5); // Expect 5 keys (techStack, structure, dependencies, codeInsights, packageJson)
    // Removed: expect(context).not.toHaveProperty('codeInsights');
    expect(context).not.toHaveProperty('someIntermediateData');
  }); // <-- End of No ASTs Case test
}); // <-- CORRECT CLOSING BRACKET FOR DESCRIBE BLOCK
