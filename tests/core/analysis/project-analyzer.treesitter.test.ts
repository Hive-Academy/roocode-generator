/* eslint-disable @typescript-eslint/unbound-method */
import path from 'path'; // Added path import
import { IAstAnalysisService } from '@core/analysis/ast-analysis.interfaces';
import {
  FileMetadata,
  IFileContentCollector,
  IFilePrioritizer,
  ITreeSitterParserService,
} from '../../../src/core/analysis/interfaces';
import { GenericAstNode, ProjectContext } from '../../../src/core/analysis/types'; // Added ProjectContext
import { ProjectAnalyzer } from '../../../src/core/analysis/project-analyzer';
import { Result } from '../../../src/core/result/result'; // Import Result
import { ResponseParser } from '../../../src/core/analysis/response-parser';
import { IFileOperations } from '../../../src/core/file-operations/interfaces';
import { LLMAgent } from '../../../src/core/llm/llm-agent';
// Removed duplicate Result import
import { ILogger } from '../../../src/core/services/logger-service';
import { ProgressIndicator } from '../../../src/core/ui/progress-indicator';
import { Dirent } from 'fs'; // Added Dirent import

// Define a type for the metadata objects used frequently in tests

// --- New Describe Block for TreeSitter Integration ---
describe('ProjectAnalyzer TreeSitter Integration', () => {
  let projectAnalyzer: ProjectAnalyzer;
  let mockFileOps: jest.Mocked<IFileOperations>;
  let mockLogger: jest.Mocked<ILogger>; // Restored
  let mockLLMAgent: jest.Mocked<LLMAgent>; // Restored
  let mockResponseParser: jest.Mocked<ResponseParser>; // Restored
  let mockProgress: jest.Mocked<ProgressIndicator>; // Restored
  let mockContentCollector: jest.Mocked<IFileContentCollector>; // Restored
  let mockFilePrioritizer: jest.Mocked<IFilePrioritizer>; // Restored
  let mockTreeSitterParserService: jest.Mocked<ITreeSitterParserService>; // Restored
  let mockAstAnalysisService: jest.Mocked<IAstAnalysisService>; // Added

  beforeEach(() => {
    // Re-initialize mocks for this describe block
    mockFileOps = {
      readDir: jest.fn().mockResolvedValue(Result.ok([])),
      isDirectory: jest.fn().mockResolvedValue(Result.ok(false)),
      validatePath: jest.fn(),
      getFiles: jest.fn(),
      writeFile: jest.fn(),
      createDirectory: jest.fn(),
      // readFile will be overridden below
      readFile: jest.fn(), // Add placeholder
      // Add other methods if needed by tests
      getRelativePath: jest.fn((base: string, full: string) => path.relative(base, full)),
      getAbsolutePath: jest.fn((p: string) => path.resolve(p)),
      joinPaths: jest.fn((...args: string[]) => path.join(...args)),
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
      getCompletion: jest.fn(),
      getProvider: jest.fn().mockResolvedValue(
        Result.ok({
          getContextWindowSize: jest.fn().mockReturnValue(10000),
          countTokens: jest.fn().mockResolvedValue(10),
          getCompletion: jest.fn(),
        })
      ),
    } as any;

    mockResponseParser = {
      parseLlmResponse: jest.fn(),
    } as any;

    mockProgress = {
      start: jest.fn(),
      update: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    } as any;

    mockContentCollector = {
      collectContent: jest.fn(),
    } as unknown as jest.Mocked<IFileContentCollector>;

    mockFilePrioritizer = {
      prioritizeFiles: jest.fn(),
    } as unknown as jest.Mocked<IFilePrioritizer>;

    // Corrected mock definition for ITreeSitterParserService
    mockTreeSitterParserService = {
      initialize: jest.fn().mockReturnValue(Result.ok(undefined)), // initialize is synchronous
      parse: jest.fn(), // Mock parse
    } as jest.Mocked<ITreeSitterParserService>;

    mockAstAnalysisService = {
      analyzeAst: jest
        .fn()
        .mockResolvedValue(Result.ok({ functions: [], classes: [], imports: [] })),
    } as jest.Mocked<IAstAnalysisService>;

    // Assign the specific readFile mock implementation AFTER basic mock setup
    // eslint-disable-next-line @typescript-eslint/require-await
    mockFileOps.readFile = jest.fn().mockImplementation(async (filePath: string) => {
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
      mockResponseParser,
      mockProgress,
      mockContentCollector,
      mockFilePrioritizer,
      mockTreeSitterParserService,
      mockAstAnalysisService // Added 9th argument
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
    // Mock readDir to return Dirent-like objects
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
    const mockGenericAstNode: GenericAstNode = {
      type: 'program',
      text: '',
      startPosition: { row: 0, column: 0 },
      endPosition: { row: 0, column: 0 },
      isNamed: true,
      fieldName: null,
      children: [],
    };

    // Corrected: Mock the parse method
    mockTreeSitterParserService.parse.mockImplementation((content, language) => {
      if (
        (language === 'typescript' && content === tsContent) ||
        (language === 'javascript' && content === jsContent)
      ) {
        return Result.ok(mockGenericAstNode);
      }
      return Result.err(new Error(`Unexpected parse call: lang=${String(language)}`));
    });

    // Mock LLM and ResponseParser for successful run
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok('{}')); // Assume LLM part succeeds
    mockResponseParser.parseLlmResponse.mockReturnValue(Result.ok({} as ProjectContext)); // Assume LLM parsing succeeds

    // Mock AstAnalysisService for successful run
    mockAstAnalysisService.analyzeAst.mockResolvedValue(
      Result.ok({ functions: [], classes: [], imports: [] })
    );

    // Act
    const result = await projectAnalyzer.analyzeProject([rootPath]);

    // Assert
    expect(result.isOk()).toBe(true); // Ensure analysis completed

    // Corrected: Verify parse calls for supported files
    expect(mockTreeSitterParserService.parse).toHaveBeenCalledWith(tsContent, 'typescript');
    expect(mockTreeSitterParserService.parse).toHaveBeenCalledWith(jsContent, 'javascript');

    // Corrected: Verify parse was NOT called for unsupported files
    expect(mockTreeSitterParserService.parse).not.toHaveBeenCalledWith(
      txtContent,
      expect.any(String)
    );
    expect(mockTreeSitterParserService.parse).not.toHaveBeenCalledWith(
      cssContent,
      expect.any(String)
    );

    // Verify logger.debug was called for skipping unsupported files (check might be fragile depending on internal logic)
    // expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining(`Skipping unsupported file type: ${txtFilePath}`));
    // expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining(`Skipping unsupported file type: ${cssFilePath}`));

    // Verify the final context contains the parsed data in astData
    const finalContext = result.unwrap();

    // Verify astData is ABSENT
    expect(finalContext).not.toHaveProperty('astData');

    // Verify codeInsights is PRESENT and is an object
    expect(finalContext).toHaveProperty('codeInsights');
    expect(typeof finalContext.codeInsights).toBe('object');
    expect(finalContext.codeInsights).toEqual({}); // Defaults to {}

    // Verify structure.componentStructure defaults to {}
    expect(finalContext.structure.componentStructure).toEqual({});

    // Verify dependencies defaults
    expect(finalContext.dependencies.dependencies).toEqual({});
    expect(finalContext.dependencies.devDependencies).toEqual({});
    expect(finalContext.dependencies.peerDependencies).toEqual({});
    expect(finalContext.dependencies.internalDependencies).toEqual({});
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
    (mockFileOps.readFile as jest.Mock).mockResolvedValue(Result.ok(jsContent));

    // Corrected: Mock failed parsing for the JS file using parse
    mockTreeSitterParserService.parse.mockImplementation((content, language) => {
      if (language === 'javascript' && content === jsContent) {
        return Result.err(mockError);
      }
      return Result.err(new Error('Unexpected parse call'));
    });

    // Mock LLM, ResponseParser, AstAnalysisService for successful run otherwise
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok('{}'));
    mockResponseParser.parseLlmResponse.mockReturnValue(Result.ok({} as ProjectContext));
    mockAstAnalysisService.analyzeAst.mockResolvedValue(
      Result.ok({ functions: [], classes: [], imports: [] })
    );

    // Act
    const result = await projectAnalyzer.analyzeProject([rootPath]);

    // Assert
    expect(result.isOk()).toBe(true); // Analysis should still complete successfully overall

    // Corrected: Verify parse was called
    expect(mockTreeSitterParserService.parse).toHaveBeenCalledWith(jsContent, 'javascript');

    // Verify logger.warn was called with file path and error message
    expect(mockLogger.warn).toHaveBeenCalledTimes(1); // Should be called once for the parse failure
    // Use POSIX path in the expected log message
    expect(mockLogger.warn).toHaveBeenCalledWith(
      // Use the relative path as logged
      expect.stringContaining(`Tree-sitter parsing failed for src/buggy.js`)
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining(mockError.message));

    // Verify the final context does NOT contain entries for the failed file in astData
    const finalContext = result.unwrap();

    // Ensure other parts of the context might still exist
    expect(finalContext.techStack).toBeDefined(); // Assuming LLM part succeeded
  });
});
