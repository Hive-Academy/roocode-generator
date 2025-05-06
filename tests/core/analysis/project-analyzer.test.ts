/* eslint-disable @typescript-eslint/unbound-method */
import path from 'path';
import {
  FileMetadata,
  IFileContentCollector,
  IFilePrioritizer,
  ITreeSitterParserService,
} from '../../../src/core/analysis/interfaces';
import { ProjectContext, GenericAstNode } from '../../../src/core/analysis/types';
import {
  IAstAnalysisService,
  CodeInsights,
} from '../../../src/core/analysis/ast-analysis.interfaces'; // Import CodeInsights
import { ProjectAnalyzer } from '../../../src/core/analysis/project-analyzer';
import { ResponseParser } from '../../../src/core/analysis/response-parser';
import { IFileOperations } from '../../../src/core/file-operations/interfaces';
import { LLMAgent } from '../../../src/core/llm/llm-agent';
import { Result } from '../../../src/core/result/result';
import { ILogger } from '../../../src/core/services/logger-service';
import { ProgressIndicator } from '../../../src/core/ui/progress-indicator';
import { Dirent } from 'fs'; // Import Dirent

// Import all mock factories
import { createMockLogger } from '../../__mocks__/logger.mock';
import { createMockFileOperations } from '../../__mocks__/file-operations.mock';
import { createMockLLMAgent } from '../../__mocks__/llm-agent.mock';
import { createMockResponseParser } from '../../__mocks__/response-parser.mock';
import { createMockProgressIndicator } from '../../__mocks__/progress-indicator.mock';
import { createMockFileContentCollector } from '../../__mocks__/file-content-collector.mock';
import { createMockFilePrioritizer } from '../../__mocks__/file-prioritizer.mock';
import { createMockTreeSitterParserService } from '../../__mocks__/tree-sitter-parser.service.mock';
import { createMockAstAnalysisService } from '../../__mocks__/ast-analysis.service.mock';

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
let mockAstAnalysisService: jest.Mocked<IAstAnalysisService>; // Added mock variable

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
      externalDependencies: ['express'], // Keep this for testing merge logic
    },
  });

  // Mock parsed result corresponding to the above LLM response
  const mockParsedResultWithOldTsData: DeepPartial<ProjectContext> = {
    techStack: { languages: ['TypeScript'], frameworks: ['Node.js'] },
    structure: {
      rootDir: 'src', // This will be overridden by actual rootPath
    },
    dependencies: {
      internalDependencies: {
        'src/app.ts': ['./utils'],
      },
      // Simulate how LLM might return external deps before package.json merge
      dependencies: { express: 'some-version-from-llm' },
    },
  };

  // Mock LLM response without any structure fields
  const mockLlmResponseWithoutStructure = JSON.stringify({
    techStack: { languages: ['JavaScript'] },
    // structure field is missing
    dependencies: { externalDependencies: ['lodash'] }, // Keep this for testing merge logic
  });

  // Mock parsed result corresponding to the above LLM response
  const mockParsedResultWithoutStructure: DeepPartial<ProjectContext> = {
    techStack: { languages: ['JavaScript'] },
    // structure field is missing
    dependencies: {
      // Simulate how LLM might return external deps before package.json merge
      dependencies: { lodash: 'some-version-from-llm' },
    },
  };

  // Default CodeInsights mock
  const defaultCodeInsights: CodeInsights = { functions: [], classes: [], imports: [] };

  beforeEach(() => {
    // Use mock factories for all dependencies
    mockFileOps = createMockFileOperations();
    mockLogger = createMockLogger();
    mockLLMAgent = createMockLLMAgent();
    mockResponseParser = createMockResponseParser();
    mockProgress = createMockProgressIndicator();
    mockContentCollector = createMockFileContentCollector();
    mockFilePrioritizer = createMockFilePrioritizer();
    mockTreeSitterParserService = createMockTreeSitterParserService();
    mockAstAnalysisService = createMockAstAnalysisService(); // Use factory

    // --- Default Mocks for beforeEach ---
    // FileOps
    mockFileOps.readDir.mockImplementation((dirPath: string) => {
      if (dirPath === rootPath)
        return Promise.resolve(Result.ok(['src', 'package.json'] as unknown as Dirent[]));
      if (dirPath === path.join(rootPath, 'src'))
        return Promise.resolve(Result.ok(['app.ts', 'utils.ts'] as unknown as Dirent[]));
      return Promise.resolve(Result.ok([] as Dirent[]));
    });
    mockFileOps.isDirectory.mockImplementation((filePath: string) => {
      if (filePath === path.join(rootPath, 'src')) return Promise.resolve(Result.ok(true));
      return Promise.resolve(Result.ok(false));
    });
    mockFileOps.readFile.mockImplementation((filePath: string) => {
      if (filePath.endsWith('app.ts')) return Promise.resolve(Result.ok('app.ts content'));
      if (filePath.endsWith('utils.ts')) return Promise.resolve(Result.ok('utils.ts content'));
      if (filePath.endsWith('package.json'))
        return Promise.resolve(
          Result.ok('{"name": "test-package", "dependencies": {"express": "4.17.1"}}')
        );
      return Promise.resolve(Result.err(new Error(`Unexpected readFile call: ${filePath}`)));
    });

    // LLMAgent
    mockLLMAgent.getModelContextWindow.mockResolvedValue(10000);
    mockLLMAgent.countTokens.mockResolvedValue(10);
    mockLLMAgent.getProvider.mockResolvedValue(
      Result.ok({ countTokens: jest.fn().mockResolvedValue(10) } as any)
    );
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok('{}')); // Default success

    // ResponseParser - Default success with minimal structure
    const defaultProjectContext: ProjectContext = {
      techStack: {
        languages: [],
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
      codeInsights: {},
    };
    mockResponseParser.parseLlmResponse.mockResolvedValue(Result.ok(defaultProjectContext));

    // ContentCollector
    mockContentCollector.collectContent.mockResolvedValue(
      Result.ok({
        content: 'package.json content\nsrc/app.ts content\nsrc/utils.ts content',
        metadata: [
          { path: path.join(rootPath, 'package.json'), size: 50 },
          { path: path.join(rootPath, 'src/app.ts'), size: 300 },
          { path: path.join(rootPath, 'src/utils.ts'), size: 400 },
        ],
      })
    );

    // FilePrioritizer
    mockFilePrioritizer.prioritizeFiles.mockImplementation((metadata: FileMetadata[]) => metadata);

    // TreeSitter & AST Analysis
    mockTreeSitterParserService.initialize.mockReturnValue(Result.ok(undefined));
    mockTreeSitterParserService.parse.mockReturnValue(Result.ok(mockAstNode)); // Default success with mock node
    mockAstAnalysisService.analyzeAst.mockResolvedValue(Result.ok(defaultCodeInsights)); // Default success with empty insights

    // Instantiate projectAnalyzer
    projectAnalyzer = new ProjectAnalyzer(
      mockFileOps,
      mockLogger,
      mockLLMAgent,
      mockResponseParser,
      mockProgress,
      mockContentCollector,
      mockFilePrioritizer,
      mockTreeSitterParserService,
      mockAstAnalysisService // Pass the created mock
    );
  });

  it('should correctly merge Tree-sitter data (empty for TS), overriding LLM response', async () => {
    // LLM response still provides other data (techStack, etc.) and potentially outdated structure info
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok(mockLlmResponseWithOldTsData));
    // ResponseParser still parses the LLM response initially
    mockResponseParser.parseLlmResponse.mockResolvedValue(
      // Use mockResolvedValue
      Result.ok(mockParsedResultWithOldTsData as ProjectContext)
    ); // Cast for test

    // Mock AST analysis to return empty insights for the files
    mockAstAnalysisService.analyzeAst.mockResolvedValue(Result.ok(defaultCodeInsights));

    const result = await projectAnalyzer.analyzeProject([rootPath]);

    expect(result.isOk()).toBe(true);
    const context = result.unwrap();

    // Verify astData is ABSENT
    expect(context).not.toHaveProperty('astData');

    // Verify codeInsights is PRESENT and reflects the (empty) result from AstAnalysisService
    expect(context).toHaveProperty('codeInsights');
    expect(typeof context.codeInsights).toBe('object');
    // Check specific files if analyzeAst was called for them
    expect(context.codeInsights[path.join('src/app.ts')]).toEqual(defaultCodeInsights);
    expect(context.codeInsights[path.join('src/utils.ts')]).toEqual(defaultCodeInsights);

    // Verify structure.componentStructure defaults to {}
    expect(context.structure.componentStructure).toEqual({});

    // Verify dependencies defaults (overridden by package.json merge)
    expect(context.dependencies.dependencies).toEqual({ express: '4.17.1' }); // From package.json
    expect(context.dependencies.devDependencies).toEqual({});
    expect(context.dependencies.peerDependencies).toEqual({});
    // Internal dependencies might still come from LLM if not derived otherwise
    expect(context.dependencies.internalDependencies).toEqual({ 'src/app.ts': ['./utils'] });

    // Verify definedFunctions and definedClasses are NOT present (AC9)
    expect(context.structure).not.toHaveProperty('definedFunctions');
    expect(context.structure).not.toHaveProperty('definedClasses');

    // Verify other LLM-derived data is preserved (AC9) - Tech stack
    expect(context.techStack.languages).toEqual(['TypeScript']); // From LLM mock
  });

  it('should use Tree-sitter data (empty for TS) even if structure missing in LLM response', async () => {
    // LLM response doesn't contain the structure fields
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok(mockLlmResponseWithoutStructure));
    mockResponseParser.parseLlmResponse.mockResolvedValue(
      // Use mockResolvedValue
      Result.ok(mockParsedResultWithoutStructure as ProjectContext) // Cast for test
    );

    // Mock AST analysis to return empty insights
    mockAstAnalysisService.analyzeAst.mockResolvedValue(Result.ok(defaultCodeInsights));

    const result = await projectAnalyzer.analyzeProject([rootPath]);

    expect(result.isOk()).toBe(true);
    const context = result.unwrap();

    // Check existing fields
    expect(context.techStack.languages).toEqual(['JavaScript']); // From LLM mock
    expect(context.structure.rootDir).toBe(rootPath); // Should use the provided root path

    // Verify codeInsights is PRESENT and reflects the (empty) result from AstAnalysisService
    expect(context).toHaveProperty('codeInsights');
    expect(typeof context.codeInsights).toBe('object');
    expect(context.codeInsights[path.join('src/app.ts')]).toEqual(defaultCodeInsights);
    expect(context.codeInsights[path.join('src/utils.ts')]).toEqual(defaultCodeInsights);

    // Verify definedFunctions and definedClasses are NOT present (AC9)
    expect(context.structure).not.toHaveProperty('definedFunctions');
    expect(context.structure).not.toHaveProperty('definedClasses');

    // Verify other LLM-derived data is preserved (or defaults if missing) (AC9)
    expect(context.dependencies.internalDependencies).toEqual({}); // Defaults correctly
    // Check external dependencies derived from package.json mock (AC9)
    expect(context.dependencies.dependencies).toEqual({ express: '4.17.1' }); // From package.json
  });

  it('should return error if LLM response generation fails', async () => {
    const error = new Error('LLM Error');
    mockLLMAgent.getCompletion.mockResolvedValue(Result.err(error));

    // No need to mock responseParser as getCompletion fails first

    const result = await projectAnalyzer.analyzeProject([rootPath]);

    expect(result.isErr()).toBe(true);
    expect(result.error).toBe(error);
    expect(mockProgress.fail).toHaveBeenCalledWith(
      expect.stringContaining('Project context analysis failed after multiple LLM attempts')
    );
  });

  it('should return error if LLM response parsing fails', async () => {
    const error = new Error('Parsing Error');
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok('invalid json'));
    mockResponseParser.parseLlmResponse.mockResolvedValue(Result.err(error)); // Use mockResolvedValue

    const result = await projectAnalyzer.analyzeProject([rootPath]);

    expect(result.isErr()).toBe(true);
    expect(result.error).toBe(error);
    expect(mockProgress.fail).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse analysis results from LLM')
    );
  });

  // --- New Test: Handling Parser Errors (AC8) ---
  it('should log a warning and exclude file from codeInsights if parsing fails', async () => {
    // Updated expectation
    const parseError = new Error('Simulated TS parse error');
    // Mock LLM response (can be simple as structure is overridden)
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok(mockLlmResponseWithoutStructure));
    mockResponseParser.parseLlmResponse.mockResolvedValue(
      // Use mockResolvedValue
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

    // Mock AST analysis - it shouldn't be called for the failed file
    mockAstAnalysisService.analyzeAst.mockImplementation((ast, filePath) => {
      // Removed async
      if (filePath.endsWith('app.ts')) {
        return Promise.resolve(Result.ok(defaultCodeInsights)); // Wrap in Promise.resolve
      }
      // Throw if called for utils.ts, indicating an issue
      throw new Error(`analyzeAst should not have been called for ${filePath}`);
    });

    const result = await projectAnalyzer.analyzeProject([rootPath]);

    expect(result.isOk()).toBe(true);
    const context = result.unwrap();

    // Verify warning log for the failed file (single string argument)
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`Tree-sitter parsing failed for src/utils.ts: ${parseError.message}`)
    );

    // Verify codeInsights contains data for the successfully parsed file only
    expect(context.codeInsights).toHaveProperty(path.join('src/app.ts'));
    expect(context.codeInsights).not.toHaveProperty(path.join('src/utils.ts'));
    expect(context.codeInsights[path.join('src/app.ts')]).toEqual(defaultCodeInsights);

    // Verify other fields are still populated (AC9)
    expect(context.techStack.languages).toEqual(['JavaScript']); // From LLM mock
    expect(context.structure.rootDir).toBe(rootPath);
    expect(context.dependencies.dependencies).toEqual({ express: '4.17.1' }); // From package.json mock
  });

  // --- New Test: Handling Unsupported Files (AC7) ---
  it('should exclude unsupported file types from codeInsights', async () => {
    // Updated expectation
    // Add an unsupported file to the mock file system
    mockFileOps.readDir.mockImplementation((dirPath: string) => {
      if (dirPath === rootPath)
        return Promise.resolve(
          Result.ok([
            { name: 'src', isDirectory: () => true, isFile: () => false },
            { name: 'image.png', isDirectory: () => false, isFile: () => true },
            { name: 'package.json', isDirectory: () => false, isFile: () => true },
          ] as any)
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
    // Mock readFile for the new file
    mockFileOps.readFile.mockImplementation((filePath: string) => {
      if (filePath.endsWith('app.ts')) return Promise.resolve(Result.ok('app.ts content'));
      if (filePath.endsWith('utils.ts')) return Promise.resolve(Result.ok('utils.ts content'));
      if (filePath.endsWith('image.png')) return Promise.resolve(Result.ok('png binary data'));
      if (filePath.endsWith('package.json'))
        return Promise.resolve(
          Result.ok('{"name": "test-package", "dependencies": {"express": "4.17.1"}}')
        );
      return Promise.resolve(Result.err(new Error(`Unexpected readFile call: ${filePath}`)));
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

    // Use standard successful parse mock for TS files
    mockTreeSitterParserService.parse.mockImplementation((content, language) => {
      if (language === 'typescript' || language === 'javascript') {
        return Result.ok(mockAstNode);
      }
      return Result.err(
        new Error(`Mock parse called with unexpected language: ${String(language)}`)
      );
    });

    // Mock AST analysis to succeed for TS files
    mockAstAnalysisService.analyzeAst.mockResolvedValue(Result.ok(defaultCodeInsights));

    // Mock LLM response
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok(mockLlmResponseWithoutStructure));
    mockResponseParser.parseLlmResponse.mockResolvedValue(
      // Use mockResolvedValue
      Result.ok(mockParsedResultWithoutStructure as ProjectContext)
    );

    const result = await projectAnalyzer.analyzeProject([rootPath]);

    expect(result.isOk()).toBe(true);
    const context = result.unwrap();

    // Verify parser was NOT called for the unsupported file
    expect(mockTreeSitterParserService.parse).not.toHaveBeenCalledWith(
      'png binary data',
      expect.any(String)
    );
    // Verify parser WAS called for supported files
    expect(mockTreeSitterParserService.parse).toHaveBeenCalledWith('app.ts content', 'typescript');
    expect(mockTreeSitterParserService.parse).toHaveBeenCalledWith(
      'utils.ts content',
      'typescript'
    );

    // Verify codeInsights only contains entries for supported, parsed files
    expect(context.codeInsights).toHaveProperty(path.join('src/app.ts'));
    expect(context.codeInsights).toHaveProperty(path.join('src/utils.ts'));
    expect(context.codeInsights).not.toHaveProperty(path.join('image.png'));
    expect(context.codeInsights).not.toHaveProperty(path.join('package.json'));

    // Verify other fields are still populated (AC9)
    expect(context.techStack.languages).toEqual(['JavaScript']);
    expect(context.structure.rootDir).toBe(rootPath);
    expect(context.dependencies.dependencies).toEqual({ express: '4.17.1' });
  });
}); // Closing bracket for 'ProjectAnalyzer Analysis Result' describe block
