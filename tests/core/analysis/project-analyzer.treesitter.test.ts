/* eslint-disable @typescript-eslint/unbound-method */
import path from 'path';
import {
  IAstAnalysisService,
  CodeInsights,
} from '../../../src/core/analysis/ast-analysis.interfaces'; // Import CodeInsights
import {
  FileMetadata,
  IFileContentCollector,
  IFilePrioritizer,
  ITreeSitterParserService,
} from '../../../src/core/analysis/interfaces';
import { GenericAstNode } from '../../../src/core/analysis/types';
import { ProjectAnalyzer } from '../../../src/core/analysis/project-analyzer';
import { Result } from '../../../src/core/result/result';
import { ITechStackAnalyzerService } from '../../../src/core/analysis/tech-stack-analyzer'; // Added
import { IFileOperations } from '../../../src/core/file-operations/interfaces';
import { LLMAgent } from '../../../src/core/llm/llm-agent';
import { ILogger } from '../../../src/core/services/logger-service';
import { ProgressIndicator } from '../../../src/core/ui/progress-indicator';
import { Dirent } from 'fs';

// Import all mock factories
import { createMockLogger } from '../../__mocks__/logger.mock';
import { createMockFileOperations } from '../../__mocks__/file-operations.mock';
import { createMockLLMAgent } from '../../__mocks__/llm-agent.mock';
// import { createMockResponseParser } from '../../__mocks__/response-parser.mock'; // Unused
import { createMockProgressIndicator } from '../../__mocks__/progress-indicator.mock';
import { createMockFileContentCollector } from '../../__mocks__/file-content-collector.mock';
import { createMockFilePrioritizer } from '../../__mocks__/file-prioritizer.mock';
import { createMockTreeSitterParserService } from '../../__mocks__/tree-sitter-parser.service.mock';
import { createMockAstAnalysisService } from '../../__mocks__/ast-analysis.service.mock';
import { createMockTechStackAnalyzerService } from '../../__mocks__/tech-stack-analyzer.mock'; // Added

// --- New Describe Block for TreeSitter Integration ---
describe('ProjectAnalyzer TreeSitter Integration', () => {
  let projectAnalyzer: ProjectAnalyzer;
  let mockFileOps: jest.Mocked<IFileOperations>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockLLMAgent: jest.Mocked<LLMAgent>;
  // let mockResponseParser: jest.Mocked<ResponseParser>; // Removed
  let mockProgress: jest.Mocked<ProgressIndicator>;
  let mockContentCollector: jest.Mocked<IFileContentCollector>;
  let mockFilePrioritizer: jest.Mocked<IFilePrioritizer>;
  let mockTreeSitterParserService: jest.Mocked<ITreeSitterParserService>;
  let mockAstAnalysisService: jest.Mocked<IAstAnalysisService>;
  let mockTechStackAnalyzerService: jest.Mocked<ITechStackAnalyzerService>; // Added

  // Default CodeInsights mock
  const defaultCodeInsights: CodeInsights = { functions: [], classes: [], imports: [] };

  // Define a mock AST node for reuse
  const mockGenericAstNode: GenericAstNode = {
    type: 'program',
    text: '',
    startPosition: { row: 0, column: 0 },
    endPosition: { row: 0, column: 0 },
    isNamed: true,
    fieldName: null,
    children: [],
  };

  beforeEach(() => {
    // Use mock factories for all dependencies
    mockFileOps = createMockFileOperations();
    mockLogger = createMockLogger();
    mockLLMAgent = createMockLLMAgent();
    // mockResponseParser = createMockResponseParser(); // Removed
    mockProgress = createMockProgressIndicator();
    mockContentCollector = createMockFileContentCollector();
    mockFilePrioritizer = createMockFilePrioritizer();
    mockTreeSitterParserService = createMockTreeSitterParserService();
    mockAstAnalysisService = createMockAstAnalysisService();
    mockTechStackAnalyzerService = createMockTechStackAnalyzerService(); // Added

    // --- Default Mocks for beforeEach ---
    // FileOps
    mockFileOps.readDir.mockResolvedValue(Result.ok([]));
    mockFileOps.isDirectory.mockResolvedValue(Result.ok(false));
    mockFileOps.normalizePath.mockImplementation((p: string) => p);
    mockFileOps.exists.mockResolvedValue(Result.ok(true));
    mockFileOps.copyDirectoryRecursive.mockResolvedValue(Result.ok(undefined));
    // readFile is mocked specifically in tests below

    // LLMAgent
    mockLLMAgent.getModelContextWindow.mockResolvedValue(10000);
    mockLLMAgent.countTokens.mockResolvedValue(10);
    mockLLMAgent.getProvider.mockResolvedValue(
      Result.ok({ countTokens: jest.fn().mockResolvedValue(10) } as any)
    );
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok('{}')); // Default success

    // mockResponseParser.parseLlmResponse.mockResolvedValue(Result.ok(defaultProjectContext)); // Removed
    mockTechStackAnalyzerService.analyze.mockResolvedValue({
      // Default mock
      languages: ['typescript'],
      frameworks: ['jest'],
      buildTools: ['npm'],
      testingFrameworks: ['jest'],
      linters: ['eslint'],
      packageManager: 'npm',
    });

    // ContentCollector - Default empty success
    mockContentCollector.collectContent.mockResolvedValue(Result.ok({ content: '', metadata: [] }));

    // FilePrioritizer - Default pass-through
    mockFilePrioritizer.prioritizeFiles.mockImplementation((metadata: FileMetadata[]) => metadata);

    // TreeSitter & AST Analysis
    mockTreeSitterParserService.initialize.mockReturnValue(Result.ok(undefined));
    mockTreeSitterParserService.parse.mockReturnValue(Result.ok(mockGenericAstNode)); // Default success
    mockAstAnalysisService.analyzeAst.mockResolvedValue(Result.ok(defaultCodeInsights)); // Default success

    // Assign the specific readFile mock implementation AFTER basic mock setup
    // eslint-disable-next-line @typescript-eslint/require-await
    mockFileOps.readFile.mockImplementation(async (filePath: string) => {
      // This mock needs to handle the files used in the tests within this suite
      const tsFilePath = path.join('/path/to/project', 'src', 'component.ts');
      const jsFilePath = path.join('/path/to/project', 'lib', 'utils.js');
      const txtFilePath = path.join('/path/to/project', 'docs', 'notes.txt');
      const cssFilePath = path.join('/path/to/project', 'styles', 'main.css');
      const buggyJsFilePath = path.join('/path/to/project', 'src', 'buggy.js');

      if (filePath === tsFilePath) return Result.ok('export class MyComponent {}');
      if (filePath === jsFilePath) return Result.ok('function helper() {}');
      if (filePath === txtFilePath) return Result.ok('Some notes');
      if (filePath === cssFilePath) return Result.ok('body { color: red; }');
      if (filePath === buggyJsFilePath) return Result.ok('function () { // invalid syntax');

      // Use a more specific error for unexpected calls within this suite
      return Result.err(
        new Error(`Unexpected readFile call in 'TreeSitter Integration' suite: ${filePath}`)
      );
    });

    // Re-instantiate projectAnalyzer with mocks for this suite
    projectAnalyzer = new ProjectAnalyzer(
      mockFileOps,
      mockLogger,
      mockLLMAgent,
      mockProgress, // Corrected: 4th arg
      mockContentCollector,
      mockFilePrioritizer,
      mockTreeSitterParserService,
      mockAstAnalysisService,
      mockTechStackAnalyzerService // Added: 9th arg
    );
  });

  // Test focusing on TreeSitter interaction
  it('should call treeSitterParserService.parse for supported files, skip unsupported, and include results in context', async () => {
    // Arrange
    const rootPath = '/path/to/project';
    const tsFilePath = path.join(rootPath, 'src', 'component.ts');
    const jsFilePath = path.join(rootPath, 'lib', 'utils.js');
    const txtFilePath = path.join(rootPath, 'docs', 'notes.txt');
    const cssFilePath = path.join(rootPath, 'styles', 'main.css');

    const tsContent = 'export class MyComponent {}';
    const jsContent = 'function helper() {}';
    const txtContent = 'Some notes';
    const cssContent = 'body { color: red; }';

    const allFilesMetadata: FileMetadata[] = [
      { path: tsFilePath, size: tsContent.length },
      { path: jsFilePath, size: jsContent.length },
      { path: txtFilePath, size: txtContent.length },
      { path: cssFilePath, size: cssContent.length },
    ];

    // Mock file system operations to simulate finding these files
    (mockFileOps.readDir as jest.Mock).mockImplementation((dirPath: string) => {
      if (dirPath === rootPath) {
        return Promise.resolve(
          Result.ok([
            { name: 'src', isDirectory: () => true, isFile: () => false } as Dirent,
            { name: 'lib', isDirectory: () => true, isFile: () => false } as Dirent,
            { name: 'docs', isDirectory: () => true, isFile: () => false } as Dirent,
            { name: 'styles', isDirectory: () => true, isFile: () => false } as Dirent,
          ])
        );
      }
      if (dirPath === path.join(rootPath, 'src')) {
        return Promise.resolve(
          Result.ok([
            { name: 'component.ts', isDirectory: () => false, isFile: () => true } as Dirent,
          ])
        );
      }
      if (dirPath === path.join(rootPath, 'lib')) {
        return Promise.resolve(
          Result.ok([{ name: 'utils.js', isDirectory: () => false, isFile: () => true } as Dirent])
        );
      }
      if (dirPath === path.join(rootPath, 'docs')) {
        return Promise.resolve(
          Result.ok([{ name: 'notes.txt', isDirectory: () => false, isFile: () => true } as Dirent])
        );
      }
      if (dirPath === path.join(rootPath, 'styles')) {
        return Promise.resolve(
          Result.ok([{ name: 'main.css', isDirectory: () => false, isFile: () => true } as Dirent])
        );
      }
      return Promise.resolve(Result.ok([]));
    });
    (mockFileOps.isDirectory as jest.Mock).mockImplementation((filePath: string) => {
      const dirs = [
        path.join(rootPath, 'src'),
        path.join(rootPath, 'lib'),
        path.join(rootPath, 'docs'),
        path.join(rootPath, 'styles'),
      ];
      return Promise.resolve(Result.ok(dirs.includes(filePath)));
    });

    // Mock prioritizeFiles and collectContent directly to isolate the parsing logic
    mockFilePrioritizer.prioritizeFiles.mockReturnValue(allFilesMetadata);
    mockContentCollector.collectContent.mockResolvedValue(
      Result.ok({
        content: 'Combined content irrelevant for this test',
        metadata: allFilesMetadata,
      })
    );

    // Mock successful parsing for supported files with specific data
    mockTreeSitterParserService.parse.mockImplementation((content, language) => {
      if (
        (language === 'typescript' && content === tsContent) ||
        (language === 'javascript' && content === jsContent)
      ) {
        return Result.ok(mockGenericAstNode);
      }
      return Result.err(new Error(`Unexpected parse call: lang=${String(language)}`));
    });

    // Mock LLM and ResponseParser for successful run (using defaults from beforeEach)

    // Mock AstAnalysisService for successful run
    const tsInsights: CodeInsights = {
      functions: [],
      classes: [{ name: 'MyComponent' }],
      imports: [],
    }; // Example specific insight
    const jsInsights: CodeInsights = {
      functions: [{ name: 'helper', parameters: [] }],
      classes: [],
      imports: [],
    }; // Example specific insight
    mockAstAnalysisService.analyzeAst.mockImplementation(async (ast, filePath) => {
      if (filePath.endsWith('component.ts')) return Result.ok(tsInsights);
      if (filePath.endsWith('utils.js')) return Result.ok(jsInsights);
      return await Promise.resolve(Result.ok(defaultCodeInsights)); // Default empty for others
    });

    // Act
    const result = await projectAnalyzer.analyzeProject([rootPath]);

    // Assert
    expect(result.isOk()).toBe(true); // Ensure analysis completed

    // Verify parse calls for supported files
    expect(mockTreeSitterParserService.parse).toHaveBeenCalledWith(tsContent, 'typescript');
    expect(mockTreeSitterParserService.parse).toHaveBeenCalledWith(jsContent, 'javascript');

    // Verify parse was NOT called for unsupported files
    expect(mockTreeSitterParserService.parse).not.toHaveBeenCalledWith(
      txtContent,
      expect.any(String)
    );
    expect(mockTreeSitterParserService.parse).not.toHaveBeenCalledWith(
      cssContent,
      expect.any(String)
    );

    // Verify logger.debug was called for skipping unsupported files
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining(`Skipping unsupported file type: ${txtFilePath}`)
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining(`Skipping unsupported file type: ${cssFilePath}`)
    );

    // Verify the final context contains the parsed data in codeInsights
    const finalContext = result.unwrap();

    expect(finalContext).toHaveProperty('codeInsights');
    expect(typeof finalContext.codeInsights).toBe('object');
    expect(finalContext.codeInsights[path.join('src/component.ts')]).toEqual(tsInsights);
    expect(finalContext.codeInsights[path.join('lib/utils.js')]).toEqual(jsInsights);
    expect(finalContext.codeInsights).not.toHaveProperty(path.join('docs/notes.txt'));
    expect(finalContext.codeInsights).not.toHaveProperty(path.join('styles/main.css'));

    // Verify other parts of context are still present (using defaults from beforeEach)
    expect(finalContext.techStack).toBeDefined();
    expect(finalContext.structure).toBeDefined();
    expect(finalContext.dependencies).toBeDefined();
  });

  it('should log a warning if parsing fails and exclude failed file from context', async () => {
    // Arrange
    const rootPath = '/path/to/project';
    const jsFilePath = path.join(rootPath, 'src', 'buggy.js');
    const jsContent = 'function () { // invalid syntax';
    const mockError = new Error('Mock parse error: Syntax issue');

    const fileMetadata: FileMetadata[] = [{ path: jsFilePath, size: jsContent.length }];

    // Mock file system and collection
    (mockFileOps.readDir as jest.Mock).mockImplementation((dirPath: string) => {
      if (dirPath === rootPath)
        return Promise.resolve(
          Result.ok([{ name: 'src', isDirectory: () => true, isFile: () => false } as Dirent])
        );
      if (dirPath === path.join(rootPath, 'src'))
        return Promise.resolve(
          Result.ok([{ name: 'buggy.js', isDirectory: () => false, isFile: () => true } as Dirent])
        );
      return Promise.resolve(Result.ok([]));
    });
    (mockFileOps.isDirectory as jest.Mock).mockImplementation((filePath: string) => {
      return Promise.resolve(Result.ok(filePath === path.join(rootPath, 'src')));
    });
    mockFilePrioritizer.prioritizeFiles.mockReturnValue(fileMetadata);
    mockContentCollector.collectContent.mockResolvedValue(
      Result.ok({ content: 'Irrelevant combined content', metadata: fileMetadata })
    );
    (mockFileOps.readFile as jest.Mock).mockResolvedValue(Result.ok(jsContent)); // Ensure readFile returns the buggy content

    // Mock failed parsing for the JS file using parse
    mockTreeSitterParserService.parse.mockImplementation((content, language) => {
      if (language === 'javascript' && content === jsContent) {
        return Result.err(mockError);
      }
      return Result.err(new Error('Unexpected parse call'));
    });

    // Mock LLM, ResponseParser, AstAnalysisService for successful run otherwise (using defaults)
    // AstAnalysisService should not be called for the failed file

    // Act
    const result = await projectAnalyzer.analyzeProject([rootPath]);

    // Assert
    expect(result.isOk()).toBe(true); // Analysis should still complete successfully overall

    // Verify parse was called
    expect(mockTreeSitterParserService.parse).toHaveBeenCalledWith(jsContent, 'javascript');

    // Verify logger.warn was called with file path and error message
    expect(mockLogger.warn).toHaveBeenCalledTimes(1); // Should be called once for the parse failure
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`Tree-sitter parsing failed for src/buggy.js`) // Use relative path
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining(mockError.message));

    // Verify AstAnalysisService was NOT called for the failed file
    expect(mockAstAnalysisService.analyzeAst).not.toHaveBeenCalledWith(
      expect.any(Object), // AST data wouldn't exist
      path.join('src/buggy.js')
    );

    // Verify the final context does NOT contain entries for the failed file in codeInsights
    const finalContext = result.unwrap();
    expect(finalContext.codeInsights).toEqual({}); // Should be empty as no files were successfully parsed AND analyzed

    // Ensure other parts of the context might still exist
    expect(finalContext.techStack).toBeDefined(); // Assuming LLM part succeeded
  });
});
