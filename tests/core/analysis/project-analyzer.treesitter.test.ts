/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import path from 'path'; // Added path import
import {
  FileMetadata,
  IFileContentCollector,
  IFilePrioritizer,
  ITreeSitterParserService, // Added TreeSitter service interface
} from '../../../src/core/analysis/interfaces'; // Added FileMetadata import
import { ParsedCodeInfo } from '../../../src/core/analysis/types'; // Import ParsedCodeInfo from types.ts
import { ProjectAnalyzer } from '../../../src/core/analysis/project-analyzer';
import { ResponseParser } from '../../../src/core/analysis/response-parser';
import { IFileOperations } from '../../../src/core/file-operations/interfaces';
import { LLMAgent } from '../../../src/core/llm/llm-agent';
import { Result } from '../../../src/core/result/result';
import { ILogger } from '../../../src/core/services/logger-service';
import { ProgressIndicator } from '../../../src/core/ui/progress-indicator';

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

    mockTreeSitterParserService = {
      parse: jest.fn(),
    } as any;

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
      mockTreeSitterParserService
    );
  });

  it('should call treeSitterParserService.parse for supported files, skip unsupported, and include results in context (AC1, AC2, AC3, AC7)', async () => {
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
    // Note: We mock prioritizeFiles and collectContent directly to isolate the parsing logic
    mockFilePrioritizer.prioritizeFiles.mockReturnValue(allFilesMetadata); // Assume all files are returned in some order
    mockContentCollector.collectContent.mockResolvedValue(
      Result.ok({
        content: 'Combined content irrelevant for this test',
        metadata: allFilesMetadata, // Provide metadata for all files found
      })
    );

    // Mock readFile to return content for each file when requested by the parsing loop
    // This overrides the beforeEach mock for this specific test's needs
    (mockFileOps.readFile as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath === tsFilePath) return Result.ok(tsContent);
      if (filePath === jsFilePath) return Result.ok(jsContent);
      if (filePath === txtFilePath) return Result.ok(txtContent); // Needed if loop doesn't skip early enough
      if (filePath === cssFilePath) return Result.ok(cssContent); // Needed if loop doesn't skip early enough
      return Result.err(new Error(`Unexpected readFile call in test: ${filePath}`));
    });

    // Mock successful parsing for supported files with specific data
    // Updated mock for TS: Expect empty arrays due to config change
    const mockTsParsedInfo: ParsedCodeInfo = {
      functions: [],
      classes: [],
    };
    const mockJsParsedInfo: ParsedCodeInfo = {
      functions: [{ name: 'helper', startLine: 1, endLine: 1 }], // Example data
      classes: [],
    };
    mockTreeSitterParserService.parse.mockImplementation((content, language) => {
      // Removed async
      if (language === 'typescript' && content === tsContent) {
        return Result.ok(mockTsParsedInfo);
      }
      if (language === 'javascript' && content === jsContent) {
        return Result.ok(mockJsParsedInfo); // Return Result directly
      }
      // Should not be called for other languages/content in this test setup
      return Result.err(new Error(`Unexpected parse call: lang=${language}`));
    });

    // Mock LLM and ResponseParser for successful run
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok('{}'));
    mockResponseParser.parseLlmResponse.mockReturnValue(
      Result.ok({ techStack: {}, structure: {}, dependencies: {} })
    );

    // Act
    const result = await projectAnalyzer.analyzeProject([rootPath]);

    // Assert
    expect(result.isOk()).toBe(true); // Ensure analysis completed

    // Verify parse calls for supported files
    expect(mockTreeSitterParserService.parse).toHaveBeenCalledWith(tsContent, 'typescript');
    expect(mockTreeSitterParserService.parse).toHaveBeenCalledWith(jsContent, 'javascript');

    // Verify parse was NOT called for unsupported files (by checking content or language)
    expect(mockTreeSitterParserService.parse).not.toHaveBeenCalledWith(
      txtContent,
      expect.any(String)
    );
    expect(mockTreeSitterParserService.parse).not.toHaveBeenCalledWith(
      cssContent,
      expect.any(String)
    );
    expect(mockTreeSitterParserService.parse).not.toHaveBeenCalledWith(expect.any(String), 'text');
    expect(mockTreeSitterParserService.parse).not.toHaveBeenCalledWith(expect.any(String), 'css');

    // Verify logger.debug was called for skipping unsupported files
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining(`Skipping unsupported file type: ${txtFilePath}`)
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining(`Skipping unsupported file type: ${cssFilePath}`)
    );

    // Verify the final context contains the parsed data
    const finalContext = result.unwrap();
    const relativeTsPath = path.relative(rootPath, tsFilePath);
    const relativeJsPath = path.relative(rootPath, jsFilePath);
    const relativeTxtPath = path.relative(rootPath, txtFilePath);
    const relativeCssPath = path.relative(rootPath, cssFilePath);

    expect(finalContext.structure.definedFunctions).toEqual({
      [relativeJsPath]: mockJsParsedInfo.functions,
    });
    // Updated assertion for TS: Expect empty arrays
    expect(finalContext.structure.definedClasses).toEqual({
      // TS file should have an entry, but the value should be an empty array
      [relativeTsPath]: [],
    });

    // Verify unsupported files are not present
    expect(finalContext.structure.definedFunctions).not.toHaveProperty(relativeTsPath); // No functions in mock TS
    expect(finalContext.structure.definedFunctions).not.toHaveProperty(relativeTxtPath);
    expect(finalContext.structure.definedFunctions).not.toHaveProperty(relativeCssPath);
    expect(finalContext.structure.definedClasses).not.toHaveProperty(relativeJsPath); // No classes in mock JS
    expect(finalContext.structure.definedClasses).not.toHaveProperty(relativeTxtPath);
    expect(finalContext.structure.definedClasses).not.toHaveProperty(relativeCssPath);
  });

  it('should log a warning if parsing fails and exclude failed file from context (AC5, AC6)', async () => {
    // Arrange
    const rootPath = '/path/to/project';
    const jsFilePath = path.join(rootPath, 'src', 'buggy.js');
    const jsContent = 'function () { // invalid syntax';
    const mockError = new Error('Mock parse error: Syntax issue');

    const fileMetadata: FileMetadata[] = [{ path: jsFilePath, size: jsContent.length }];

    // Mock file system and collection - Add specific mocks for file discovery
    (mockFileOps.readDir as jest.Mock).mockImplementation((dirPath: string) => {
      if (dirPath === rootPath) return Promise.resolve(Result.ok(['src']));
      if (dirPath === path.join(rootPath, 'src')) return Promise.resolve(Result.ok(['buggy.js']));
      return Promise.resolve(Result.ok([]));
    });
    (mockFileOps.isDirectory as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath === path.join(rootPath, 'src')) return Promise.resolve(Result.ok(true));
      return Promise.resolve(Result.ok(false));
    });
    mockFilePrioritizer.prioritizeFiles.mockReturnValue(fileMetadata);
    mockContentCollector.collectContent.mockResolvedValue(
      Result.ok({
        content: 'Irrelevant combined content',
        metadata: fileMetadata,
      })
    );
    // Override readFile specifically for this test's file
    (mockFileOps.readFile as jest.Mock).mockResolvedValue(Result.ok(jsContent));

    // Mock failed parsing for the JS file
    mockTreeSitterParserService.parse.mockImplementation((content, language) => {
      // Removed async
      if (language === 'javascript' && content === jsContent) {
        return Result.err(mockError); // Return Result directly
      }
      return Result.err(new Error('Unexpected parse call')); // Return Result directly
    });

    // Mock LLM and ResponseParser for successful run otherwise
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok('{}'));
    mockResponseParser.parseLlmResponse.mockReturnValue(
      Result.ok({ techStack: {}, structure: {}, dependencies: {} })
    );

    // Act
    const result = await projectAnalyzer.analyzeProject([rootPath]);

    // Assert
    expect(result.isOk()).toBe(true); // Analysis should still complete successfully overall

    // Verify parse was called
    expect(mockTreeSitterParserService.parse).toHaveBeenCalledWith(jsContent, 'javascript');

    // Verify logger.warn was called with file path and error message
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`Failed to parse file ${jsFilePath}`)
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(mockError.message) // Check if the specific error message is logged
    );

    // Verify the final context does NOT contain entries for the failed file
    const finalContext = result.unwrap();
    const relativeBuggyPath = path.relative(rootPath, jsFilePath);
    expect(finalContext.structure.definedFunctions).not.toHaveProperty(relativeBuggyPath);
    expect(finalContext.structure.definedClasses).not.toHaveProperty(relativeBuggyPath);
    // Ensure other parts of the context might still exist (e.g., from LLM)
    expect(finalContext.techStack).toBeDefined();
  });
});
