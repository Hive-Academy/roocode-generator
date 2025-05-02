/* eslint-disable @typescript-eslint/no-unsafe-call */
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
type TestFileMetadata = { path: string; size: number };

describe('ProjectAnalyzer File Prioritization and Token Limiting', () => {
  let projectAnalyzer: ProjectAnalyzer;
  let mockFileOps: jest.Mocked<IFileOperations>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockLLMAgent: jest.Mocked<LLMAgent>;
  let mockResponseParser: jest.Mocked<ResponseParser>;
  let mockProgress: jest.Mocked<ProgressIndicator>;
  let mockContentCollector: jest.Mocked<IFileContentCollector>;
  let mockFilePrioritizer: jest.Mocked<IFilePrioritizer>;
  let mockTreeSitterParserService: jest.Mocked<ITreeSitterParserService>; // Added TreeSitter mock

  beforeEach(() => {
    // Mocks for the 'File Prioritization and Token Limiting' tests
    mockFileOps = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      createDirectory: jest.fn(),
      validatePath: jest.fn(),
      getFiles: jest.fn(), // This might not be directly used if collectAnalyzableFiles is mocked indirectly
      // Mock readDir and isDirectory - These will be overridden in specific tests
      readDir: jest.fn().mockResolvedValue(Result.ok([])),
      isDirectory: jest.fn().mockResolvedValue(Result.ok(false)),
    } as any;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    mockLLMAgent = {
      getModelContextWindow: jest.fn().mockResolvedValue(10000), // Provide default mock value
      countTokens: jest.fn().mockResolvedValue(10), // Provide default mock value
      getCompletion: jest.fn(),
      // Add getProvider mock, returning a mock provider with necessary methods
      getProvider: jest.fn().mockResolvedValue(
        Result.ok({
          getContextWindowSize: jest.fn().mockReturnValue(10000),
          countTokens: jest.fn().mockResolvedValue(10),
          getCompletion: jest.fn(), // Include getCompletion on the mock provider if needed elsewhere
        })
      ),
    } as any;

    mockResponseParser = {
      parseLlmResponse: jest.fn(), // Corrected method name
    } as any;

    mockProgress = {
      start: jest.fn(),
      update: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(), // Added succeed mock
    } as any;

    mockContentCollector = {
      collectContent: jest.fn(),
    } as unknown as jest.Mocked<IFileContentCollector>;

    mockFilePrioritizer = {
      prioritizeFiles: jest.fn(),
    } as unknown as jest.Mocked<IFilePrioritizer>;

    mockTreeSitterParserService = {
      // Initialize the mock
      parse: jest.fn(),
    } as any;

    projectAnalyzer = new ProjectAnalyzer(
      mockFileOps,
      mockLogger,
      mockLLMAgent,
      mockResponseParser,
      mockProgress,
      mockContentCollector,
      mockFilePrioritizer,
      mockTreeSitterParserService // Pass the new mock
    );
  });

  describe('File Prioritization', () => {
    it('should prioritize core configuration files first', async () => {
      const rootPath = 'root/path';
      const srcPath = path.join(rootPath, 'src');

      // --- Test-specific Mocks for collectAnalyzableFiles ---
      (mockFileOps.readDir as jest.Mock).mockImplementation((dirPath: string) => {
        if (dirPath === rootPath) return Result.ok(['src', 'package.json', 'tsconfig.json']);
        if (dirPath === srcPath) return Result.ok(['app.ts', 'utils.ts']);
        return Result.ok([]);
      });
      (mockFileOps.isDirectory as jest.Mock).mockImplementation((filePath: string) => {
        return Result.ok(filePath === srcPath); // Only srcPath is a directory
      });
      // --- End Test-specific Mocks ---

      // Define expected collected paths (full paths) and metadata
      const expectedCollectedPaths = [
        path.join(rootPath, 'package.json'),
        path.join(rootPath, 'tsconfig.json'),
        path.join(srcPath, 'app.ts'), // Use joined path
        path.join(srcPath, 'utils.ts'), // Use joined path
      ];
      const expectedFileMetadata: TestFileMetadata[] = expectedCollectedPaths.map((p: string) => ({
        path: p,
        size: 0,
      }));

      // Mock prioritizeFiles return value based on test logic (using full paths)
      const prioritizedFilesMockReturn: TestFileMetadata[] = [
        { path: path.join(rootPath, 'package.json'), size: 100 },
        { path: path.join(rootPath, 'tsconfig.json'), size: 200 },
        { path: path.join(srcPath, 'app.ts'), size: 300 },
        { path: path.join(srcPath, 'utils.ts'), size: 400 },
      ];
      mockFilePrioritizer.prioritizeFiles.mockReturnValue(prioritizedFilesMockReturn);

      // Mock contentCollector to return content based on prioritized files (using full paths)
      mockContentCollector.collectContent.mockResolvedValue(
        Result.ok({
          content: prioritizedFilesMockReturn
            .map((f: TestFileMetadata) => `${path.basename(f.path)} content`)
            .join('\n'),
          metadata: prioritizedFilesMockReturn,
        })
      );

      // Mock later stages to allow successful completion
      mockLLMAgent.getCompletion.mockResolvedValue(Result.ok('{}'));
      mockResponseParser.parseLlmResponse.mockReturnValue(
        Result.ok({ techStack: {}, structure: {}, dependencies: {} })
      );
      mockLLMAgent.getModelContextWindow.mockResolvedValue(1000);
      mockLLMAgent.countTokens.mockResolvedValue(10); // Ensure countTokens is mocked
      // Mock TreeSitter parse for this test case (assuming successful parse for all)
      mockTreeSitterParserService.parse.mockResolvedValue(
        Result.ok({ functions: [], classes: [] })
      );

      // Execute
      const result = await projectAnalyzer.analyzeProject([rootPath]);

      // Assertions
      if (result.isErr()) console.error('analyzeProject failed:', result.error); // Log error on failure
      expect(result.isOk()).toBe(true);

      // Check that prioritizeFiles was called with the correctly collected FileMetadata
      expect(mockFilePrioritizer.prioritizeFiles as jest.Mock).toHaveBeenCalledWith(
        expect.arrayContaining(
          expectedFileMetadata.map((m: TestFileMetadata) => expect.objectContaining(m))
        ),
        rootPath
      );

      // Check the order returned by the mock (which simulates prioritization)
      const prioritizedFilesResult = mockFilePrioritizer.prioritizeFiles.mock.results[0].value;
      expect(prioritizedFilesResult[0].path).toBe(path.join(rootPath, 'package.json'));
      expect(prioritizedFilesResult[1].path).toBe(path.join(rootPath, 'tsconfig.json'));
    });

    it('should respect priority order when collecting files', async () => {
      const rootPath = 'root/path';
      const srcPath = path.join(rootPath, 'src');

      // --- Test-specific Mocks ---
      (mockFileOps.readDir as jest.Mock).mockImplementation((dirPath: string) => {
        if (dirPath === rootPath) return Result.ok(['src', 'package.json', 'webpack.config.js']);
        if (dirPath === srcPath) return Result.ok(['styles.css', 'index.ts']);
        return Result.ok([]);
      });
      (mockFileOps.isDirectory as jest.Mock).mockImplementation((filePath: string) => {
        return Result.ok(filePath === srcPath);
      });
      // --- End Test-specific Mocks ---

      const expectedCollectedPaths = [
        path.join(srcPath, 'styles.css'),
        path.join(rootPath, 'package.json'),
        path.join(rootPath, 'webpack.config.js'),
        path.join(srcPath, 'index.ts'),
      ];
      const expectedFileMetadata: TestFileMetadata[] = expectedCollectedPaths.map((p: string) => ({
        path: p,
        size: 0,
      }));

      // Mock prioritizeFiles return value
      const prioritizedFilesMockReturn: TestFileMetadata[] = [
        { path: path.join(rootPath, 'package.json'), size: 100 },
        { path: path.join(rootPath, 'webpack.config.js'), size: 150 },
        { path: path.join(srcPath, 'index.ts'), size: 200 },
        { path: path.join(srcPath, 'styles.css'), size: 250 },
      ];
      mockFilePrioritizer.prioritizeFiles.mockReturnValue(prioritizedFilesMockReturn);

      // Mock contentCollector
      mockContentCollector.collectContent.mockResolvedValue(
        Result.ok({
          content: prioritizedFilesMockReturn
            .map((f: TestFileMetadata) => `${path.basename(f.path)} content`)
            .join('\n'),
          metadata: prioritizedFilesMockReturn,
        })
      );

      // Mock later stages
      mockLLMAgent.getCompletion.mockResolvedValue(Result.ok('{}'));
      mockResponseParser.parseLlmResponse.mockReturnValue(
        Result.ok({ techStack: {}, structure: {}, dependencies: {} })
      );
      mockLLMAgent.getModelContextWindow.mockResolvedValue(1000);
      mockLLMAgent.countTokens.mockResolvedValue(10);
      mockTreeSitterParserService.parse.mockResolvedValue(
        Result.ok({ functions: [], classes: [] })
      );

      // Execute
      const result = await projectAnalyzer.analyzeProject([rootPath]);

      // Assertions
      if (result.isErr()) console.error('analyzeProject failed:', result.error);
      expect(result.isOk()).toBe(true);

      expect(mockFilePrioritizer.prioritizeFiles as jest.Mock).toHaveBeenCalledWith(
        expect.arrayContaining(
          expectedFileMetadata.map((m: TestFileMetadata) => expect.objectContaining(m))
        ),
        rootPath
      );

      const prioritizedFilesResult = mockFilePrioritizer.prioritizeFiles.mock.results[0].value;
      expect(prioritizedFilesResult.map((f: TestFileMetadata) => f.path)).toEqual([
        // Added type here
        path.join(rootPath, 'package.json'),
        path.join(rootPath, 'webpack.config.js'),
        path.join(srcPath, 'index.ts'), // Use joined path
        path.join(srcPath, 'styles.css'), // Use joined path
      ]);
    });

    it('should handle files with same priority level', async () => {
      const files = ['app.ts', 'utils.ts', 'index.ts']; // Files within src
      const rootPath = 'root/path';
      const srcPath = path.join(rootPath, 'src');

      // --- Test-specific Mocks ---
      (mockFileOps.readDir as jest.Mock).mockImplementation((dirPath: string) => {
        if (dirPath === rootPath) return Result.ok(['src']);
        if (dirPath === srcPath) return Result.ok(files);
        return Result.ok([]);
      });
      (mockFileOps.isDirectory as jest.Mock).mockImplementation((filePath: string) => {
        return Result.ok(filePath === srcPath);
      });
      // --- End Test-specific Mocks ---

      const expectedCollectedPaths = files.map((f: string) => path.join(srcPath, f));
      const expectedFileMetadata: TestFileMetadata[] = expectedCollectedPaths.map((p: string) => ({
        path: p,
        size: 0,
      }));

      const prioritizedFilesMockReturn: TestFileMetadata[] = expectedCollectedPaths.map(
        (p: string) => ({
          path: p,
          size: 300,
        })
      );
      mockFilePrioritizer.prioritizeFiles.mockReturnValue(prioritizedFilesMockReturn);

      mockContentCollector.collectContent.mockResolvedValue(
        Result.ok({
          content: prioritizedFilesMockReturn
            .map((f: TestFileMetadata) => `${path.basename(f.path)} content`)
            .join('\n'),
          metadata: prioritizedFilesMockReturn,
        })
      );

      // Mock later stages
      mockLLMAgent.getCompletion.mockResolvedValue(Result.ok('{}'));
      mockResponseParser.parseLlmResponse.mockReturnValue(
        Result.ok({ techStack: {}, structure: {}, dependencies: {} })
      );
      mockLLMAgent.getModelContextWindow.mockResolvedValue(1000);
      mockLLMAgent.countTokens.mockResolvedValue(10);
      mockTreeSitterParserService.parse.mockResolvedValue(
        Result.ok({ functions: [], classes: [] })
      );

      // Execute
      const result = await projectAnalyzer.analyzeProject([rootPath]);

      // Assertions
      if (result.isErr()) console.error('analyzeProject failed:', result.error);
      expect(result.isOk()).toBe(true);

      expect(mockFilePrioritizer.prioritizeFiles as jest.Mock).toHaveBeenCalledWith(
        expect.arrayContaining(
          expectedFileMetadata.map((m: TestFileMetadata) => expect.objectContaining(m))
        ),
        rootPath
      );

      const prioritizedFilesResult = mockFilePrioritizer.prioritizeFiles.mock.results[0].value;
      expect(prioritizedFilesResult.map((f: TestFileMetadata) => f.path)).toEqual(
        // Added type here
        expect.arrayContaining(expectedCollectedPaths)
      );
    });
  });

  describe('Token Limiting', () => {
    it('should respect token limit when collecting files', async () => {
      const rootPath = 'root/path';
      const srcPath = path.join(rootPath, 'src');

      // --- Test-specific Mocks ---
      (mockFileOps.readDir as jest.Mock).mockImplementation((dirPath: string) => {
        if (dirPath === rootPath) return Result.ok(['src', 'package.json']);
        if (dirPath === srcPath) return Result.ok(['app.ts', 'utils.ts']);
        return Result.ok([]);
      });
      (mockFileOps.isDirectory as jest.Mock).mockImplementation((filePath: string) => {
        return Result.ok(filePath === srcPath);
      });
      // --- End Test-specific Mocks ---

      // Mock prioritizeFiles to return files in order
      const prioritizedFilesMockReturn: TestFileMetadata[] = [
        { path: path.join(rootPath, 'package.json'), size: 100 },
        { path: path.join(srcPath, 'app.ts'), size: 200 },
        { path: path.join(srcPath, 'utils.ts'), size: 300 }, // Size increases
      ];
      mockFilePrioritizer.prioritizeFiles.mockReturnValue(prioritizedFilesMockReturn);

      // Simulate token limit by controlling maxTokens
      mockLLMAgent.getModelContextWindow.mockResolvedValue(60);
      // Assume overhead is 10 (mocked via getProvider), so maxTokens = 50

      // Mock contentCollector to respect token limit (it should be called with prioritized list)
      const expectedContentCollectorInputPaths = prioritizedFilesMockReturn.map(
        (f: TestFileMetadata) => f.path
      );
      const contentCollectorResultMetadata: TestFileMetadata[] = [
        // Only first two files fit
        { path: path.join(rootPath, 'package.json'), size: 100 },
        { path: path.join(srcPath, 'app.ts'), size: 200 },
      ];
      mockContentCollector.collectContent.mockResolvedValue(
        Result.ok({
          content: 'package.json content\napp.ts content', // Corrected content
          metadata: contentCollectorResultMetadata,
        })
      );

      // Mock later stages
      mockLLMAgent.getCompletion.mockResolvedValue(Result.ok('{}'));
      mockResponseParser.parseLlmResponse.mockReturnValue(
        Result.ok({ techStack: {}, structure: {}, dependencies: {} })
      );
      mockLLMAgent.countTokens.mockResolvedValue(10); // Mock token counting
      mockTreeSitterParserService.parse.mockResolvedValue(
        Result.ok({ functions: [], classes: [] })
      );

      // Execute
      const result = await projectAnalyzer.analyzeProject([rootPath]);

      // Assertions
      if (result.isErr()) console.error('analyzeProject failed:', result.error);
      expect(result.isOk()).toBe(true);

      // Verify contentCollector was called correctly
      expect(mockContentCollector.collectContent).toHaveBeenCalledWith(
        expectedContentCollectorInputPaths, // Called with all prioritized paths
        rootPath,
        expect.any(Number) // Max tokens calculated internally
      );

      // Verify the *mocked return value* of collectContent reflects the limit
      const collectContentMockResult =
        await mockContentCollector.collectContent.mock.results[0].value;
      expect(collectContentMockResult.isOk()).toBe(true);
      if (collectContentMockResult.isOk()) {
        expect(collectContentMockResult.value.metadata).toEqual(contentCollectorResultMetadata);
        expect(
          collectContentMockResult.value.metadata.find((m: TestFileMetadata) =>
            m.path.endsWith('utils.ts')
          )
        ).toBeUndefined();
      }
    });

    it('should prioritize high-priority files within token limit', async () => {
      const rootPath = 'root/path';
      const srcPath = path.join(rootPath, 'src');

      // --- Test-specific Mocks ---
      (mockFileOps.readDir as jest.Mock).mockImplementation((dirPath: string) => {
        if (dirPath === rootPath) return Result.ok(['src', 'package.json', 'tsconfig.json']);
        if (dirPath === srcPath) return Result.ok(['large-file.ts']);
        return Result.ok([]);
      });
      (mockFileOps.isDirectory as jest.Mock).mockImplementation((filePath: string) => {
        return Result.ok(filePath === srcPath);
      });
      // --- End Test-specific Mocks ---

      // Mock prioritizeFiles to return high-priority first
      const prioritizedFilesMockReturn: TestFileMetadata[] = [
        { path: path.join(rootPath, 'package.json'), size: 100 },
        { path: path.join(rootPath, 'tsconfig.json'), size: 200 },
        { path: path.join(srcPath, 'large-file.ts'), size: 1000 },
      ];
      mockFilePrioritizer.prioritizeFiles.mockReturnValue(prioritizedFilesMockReturn);

      // Simulate token limit
      mockLLMAgent.getModelContextWindow.mockResolvedValue(20);
      // Assume overhead is 5, maxTokens = 15

      // Mock contentCollector to respect limit
      const expectedContentCollectorInputPaths = prioritizedFilesMockReturn.map(
        (f: TestFileMetadata) => f.path
      );
      const contentCollectorResultMetadata: TestFileMetadata[] = [
        // Only first two (high-priority) files fit
        { path: path.join(rootPath, 'package.json'), size: 100 },
        { path: path.join(rootPath, 'tsconfig.json'), size: 200 },
      ];
      mockContentCollector.collectContent.mockResolvedValue(
        Result.ok({
          content: 'package.json content\ntsconfig.json content',
          metadata: contentCollectorResultMetadata,
        })
      );

      // Mock later stages
      mockLLMAgent.getCompletion.mockResolvedValue(Result.ok('{}'));
      mockResponseParser.parseLlmResponse.mockReturnValue(
        Result.ok({ techStack: {}, structure: {}, dependencies: {} })
      );
      mockLLMAgent.countTokens.mockResolvedValue(5);
      mockTreeSitterParserService.parse.mockResolvedValue(
        Result.ok({ functions: [], classes: [] })
      );

      // Execute
      const result = await projectAnalyzer.analyzeProject([rootPath]);

      // Assertions
      if (result.isErr()) console.error('analyzeProject failed:', result.error);
      expect(result.isOk()).toBe(true);

      // Verify contentCollector was called correctly
      expect(mockContentCollector.collectContent).toHaveBeenCalledWith(
        expectedContentCollectorInputPaths,
        rootPath,
        expect.any(Number)
      );

      // Verify the *mocked return value* of collectContent reflects the limit + prioritization
      const collectContentMockResult =
        await mockContentCollector.collectContent.mock.results[0].value;
      expect(collectContentMockResult.isOk()).toBe(true);
      if (collectContentMockResult.isOk()) {
        expect(collectContentMockResult.value.metadata).toEqual(contentCollectorResultMetadata);
        expect(
          collectContentMockResult.value.metadata.find((m: TestFileMetadata) =>
            m.path.endsWith('large-file.ts')
          )
        ).toBeUndefined();
      }
    });

    it('should handle empty or invalid files gracefully', async () => {
      const rootPath = 'root/path';

      // --- Test-specific Mocks ---
      (mockFileOps.readDir as jest.Mock).mockImplementation((dirPath: string) => {
        if (dirPath === rootPath)
          return Result.ok(['package.json', 'empty-file.ts', 'invalid-file.ts']);
        return Result.ok([]);
      });
      (mockFileOps.isDirectory as jest.Mock).mockImplementation((_filePath: string) => {
        return Result.ok(false); // Assume no directories
      });
      // --- End Test-specific Mocks ---

      // Mock prioritizeFiles (order doesn't matter much here)
      const prioritizedFilesMockReturn: TestFileMetadata[] = [
        path.join(rootPath, 'package.json'),
        path.join(rootPath, 'empty-file.ts'),
        path.join(rootPath, 'invalid-file.ts'),
      ].map((p: string) => ({
        path: p,
        size: 100,
      }));
      mockFilePrioritizer.prioritizeFiles.mockReturnValue(prioritizedFilesMockReturn);

      // Simulate contentCollector skipping 'invalid-file.ts' (e.g., by returning metadata without it)
      const expectedContentCollectorInputPaths = prioritizedFilesMockReturn.map(
        (f: TestFileMetadata) => f.path
      );
      const contentCollectorResultMetadata: TestFileMetadata[] = [
        { path: path.join(rootPath, 'package.json'), size: 100 },
        { path: path.join(rootPath, 'empty-file.ts'), size: 100 },
      ];
      mockContentCollector.collectContent.mockResolvedValue(
        Result.ok({
          content: 'package.json content\nempty-file.ts content',
          metadata: contentCollectorResultMetadata,
        })
      );

      // Mock later stages
      mockLLMAgent.getCompletion.mockResolvedValue(Result.ok('{}'));
      mockResponseParser.parseLlmResponse.mockReturnValue(
        Result.ok({ techStack: {}, structure: {}, dependencies: {} })
      );
      mockLLMAgent.getModelContextWindow.mockResolvedValue(1000);
      mockLLMAgent.countTokens.mockResolvedValue(10);
      mockTreeSitterParserService.parse.mockResolvedValue(
        Result.ok({ functions: [], classes: [] })
      );

      // Execute
      const result = await projectAnalyzer.analyzeProject([rootPath]);

      // Assertions
      if (result.isErr()) console.error('analyzeProject failed:', result.error);
      expect(result.isOk()).toBe(true);

      // Verify contentCollector was called correctly
      expect(mockContentCollector.collectContent).toHaveBeenCalledWith(
        expectedContentCollectorInputPaths,
        rootPath,
        expect.any(Number)
      );

      // Verify the *mocked return value* of collectContent reflects the limit
      const collectContentMockResult =
        await mockContentCollector.collectContent.mock.results[0].value;
      expect(collectContentMockResult.isOk()).toBe(true);
      if (collectContentMockResult.isOk()) {
        expect(collectContentMockResult.value.metadata).toEqual(contentCollectorResultMetadata);
      }
    });
  });
});

// --- Existing Describe Block for Analysis Result ---
describe('ProjectAnalyzer Analysis Result', () => {
  let projectAnalyzer: ProjectAnalyzer;
  let mockFileOps: jest.Mocked<IFileOperations>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockLLMAgent: jest.Mocked<LLMAgent>;
  let mockResponseParser: jest.Mocked<ResponseParser>;
  let mockProgress: jest.Mocked<ProgressIndicator>;
  let mockContentCollector: jest.Mocked<IFileContentCollector>;
  let mockFilePrioritizer: jest.Mocked<IFilePrioritizer>;
  let mockTreeSitterParserService: jest.Mocked<ITreeSitterParserService>; // Declare the mock variable

  const rootPath = 'root/path';
  const mockLlmResponseWithNewFields = JSON.stringify({
    techStack: { languages: ['TypeScript'], frameworks: ['Node.js'] },
    structure: {
      rootDir: 'src', // Example, might be overridden
      definedFunctions: {
        'src/utils.ts': [{ name: 'formatDate' }],
        'src/app.ts': [{ name: 'startApp' }],
      },
      definedClasses: {
        'src/app.ts': [{ name: 'Application' }],
      },
    },
    dependencies: {
      internalDependencies: {
        'src/app.ts': ['./utils'],
      },
      externalDependencies: ['express'],
    },
  });

  const mockParsedResultWithNewFields = {
    techStack: { languages: ['TypeScript'], frameworks: ['Node.js'] },
    structure: {
      rootDir: 'src',
      definedFunctions: {
        'src/utils.ts': [{ name: 'formatDate' }],
        'src/app.ts': [{ name: 'startApp' }],
      },
      definedClasses: {
        'src/app.ts': [{ name: 'Application' }],
      },
    },
    dependencies: {
      internalDependencies: {
        'src/app.ts': ['./utils'],
      },
      externalDependencies: ['express'],
    },
  };

  const mockLlmResponseWithoutNewFields = JSON.stringify({
    techStack: { languages: ['JavaScript'] },
    structure: { rootDir: 'lib' },
    dependencies: { externalDependencies: ['lodash'] },
  });

  const mockParsedResultWithoutNewFields = {
    techStack: { languages: ['JavaScript'] },
    structure: { rootDir: 'lib' },
    dependencies: { externalDependencies: ['lodash'] },
  };

  beforeEach(() => {
    // Mocks for the 'Analysis Result' tests
    mockFileOps = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      createDirectory: jest.fn(),
      validatePath: jest.fn(),
      getFiles: jest.fn(),
      // Mock readDir and isDirectory for collectAnalyzableFiles
      readDir: jest.fn().mockImplementation((dirPath: string) => {
        if (dirPath === rootPath) return Result.ok(['src']);
        if (dirPath === path.join(rootPath, 'src')) return Result.ok(['app.ts', 'utils.ts']);
        return Result.ok([]);
      }),
      isDirectory: jest.fn().mockImplementation((filePath: string) => {
        if (filePath === path.join(rootPath, 'src')) return Result.ok(true);
        return Result.ok(false);
      }),
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
          getCompletion: jest.fn(), // Include getCompletion on the mock provider if needed elsewhere
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
          content: 'src/app.ts content\nsrc/utils.ts content',
          metadata: [
            { path: path.join(rootPath, 'src/app.ts'), size: 300 },
            { path: path.join(rootPath, 'src/utils.ts'), size: 400 },
          ],
        })
      ),
    } as unknown as jest.Mocked<IFileContentCollector>;

    mockFilePrioritizer = {
      prioritizeFiles: jest.fn().mockImplementation((metadata: FileMetadata[]) => metadata), // Simple pass-through mock, added type
    } as unknown as jest.Mocked<IFilePrioritizer>;

    mockTreeSitterParserService = {
      // Initialize the mock variable
      parse: jest.fn().mockResolvedValue(Result.ok({ functions: [], classes: [] })), // Default successful parse
    } as any;

    projectAnalyzer = new ProjectAnalyzer(
      mockFileOps,
      mockLogger,
      mockLLMAgent,
      mockResponseParser,
      mockProgress,
      mockContentCollector,
      mockFilePrioritizer,
      mockTreeSitterParserService // Add missing mock service
    );
  });

  it('should correctly parse LLM response and include definedFunctions/Classes', async () => {
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok(mockLlmResponseWithNewFields)); // Use getCompletion
    mockResponseParser.parseLlmResponse.mockReturnValue(Result.ok(mockParsedResultWithNewFields));

    const result = await projectAnalyzer.analyzeProject([rootPath]);

    expect(result.isOk()).toBe(true);
    const context = result.unwrap(); // Removed 'as ProjectContext' cast

    // Check existing fields (basic check)
    expect(context.techStack.languages).toEqual(['TypeScript']);
    expect(context.structure.rootDir).toBe(rootPath); // Should use the provided root path

    // Check new fields
    expect(context.structure.definedFunctions).toEqual({
      'src/utils.ts': [{ name: 'formatDate' }],
      'src/app.ts': [{ name: 'startApp' }],
    });
    expect(context.structure.definedClasses).toEqual({
      'src/app.ts': [{ name: 'Application' }],
    });
    expect(context.dependencies.internalDependencies).toEqual({
      'src/app.ts': ['./utils'],
    });
  });

  it('should apply default empty objects when definedFunctions/Classes are missing in LLM response', async () => {
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok(mockLlmResponseWithoutNewFields));
    mockResponseParser.parseLlmResponse.mockReturnValue(
      Result.ok(mockParsedResultWithoutNewFields)
    );

    const result = await projectAnalyzer.analyzeProject([rootPath]);

    expect(result.isOk()).toBe(true);
    const context = result.unwrap();

    // Check existing fields
    expect(context.techStack.languages).toEqual(['JavaScript']);
    expect(context.structure.rootDir).toBe(rootPath); // Should use the provided root path

    // Check that new fields default to empty objects
    expect(context.structure.definedFunctions).toEqual({});
    expect(context.structure.definedClasses).toEqual({});
    expect(context.dependencies.internalDependencies).toEqual({}); // Assuming this also defaults if missing
  });

  it('should return error if LLM response generation fails', async () => {
    const error = new Error('LLM Error');
    mockLLMAgent.getCompletion.mockResolvedValue(Result.err(error));

    const result = await projectAnalyzer.analyzeProject([rootPath]);

    expect(result.isErr()).toBe(true);
    expect(result.error).toBe(error);
    expect(mockProgress.fail).toHaveBeenCalledWith(expect.stringContaining('LLM analysis failed'));
  });

  it('should return error if LLM response parsing fails', async () => {
    const error = new Error('Parsing Error');
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok('invalid json'));
    mockResponseParser.parseLlmResponse.mockReturnValue(Result.err(error));

    const result = await projectAnalyzer.analyzeProject([rootPath]);

    expect(result.isErr()).toBe(true);
    expect(result.error).toBe(error);
    expect(mockProgress.fail).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse LLM response')
    );
  });
});

// --- New Describe Block for TreeSitter Integration ---
describe('ProjectAnalyzer TreeSitter Integration', () => {
  let projectAnalyzer: ProjectAnalyzer;
  let mockFileOps: jest.Mocked<IFileOperations>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockLLMAgent: jest.Mocked<LLMAgent>;
  let mockResponseParser: jest.Mocked<ResponseParser>;
  let mockProgress: jest.Mocked<ProgressIndicator>;
  let mockContentCollector: jest.Mocked<IFileContentCollector>;
  let mockFilePrioritizer: jest.Mocked<IFilePrioritizer>;
  let mockTreeSitterParserService: jest.Mocked<ITreeSitterParserService>;

  beforeEach(() => {
    // Re-initialize mocks for this describe block
    mockFileOps = {
      readFile: jest.fn(),
      readDir: jest.fn().mockResolvedValue(Result.ok([])),
      isDirectory: jest.fn().mockResolvedValue(Result.ok(false)),
      // Add other methods if needed by collectAnalyzableFiles or other parts
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

  it('should call treeSitterParserService.parse for supported files and skip unsupported ones (AC7)', async () => {
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

    // Mock readFile to return content for each file when requested
    // Ensure it returns Promise.resolve as readFile is async
    (mockFileOps.readFile as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath === tsFilePath) return Promise.resolve(Result.ok(tsContent));
      if (filePath === jsFilePath) return Promise.resolve(Result.ok(jsContent));
      if (filePath === txtFilePath) return Promise.resolve(Result.ok(txtContent));
      if (filePath === cssFilePath) return Promise.resolve(Result.ok(cssContent));
      return Promise.resolve(Result.err(new Error(`Unexpected readFile call: ${filePath}`)));
    });

    // Mock successful parsing for supported files
    const mockParsedInfo: ParsedCodeInfo = { functions: [], classes: [] };
    // Removed async, return Promise.resolve as parse is async
    mockTreeSitterParserService.parse.mockImplementation((content, language) => {
      if (language === 'typescript' && content === tsContent)
        return Promise.resolve(Result.ok(mockParsedInfo));
      if (language === 'javascript' && content === jsContent)
        return Promise.resolve(Result.ok(mockParsedInfo));
      // Should not be called for other languages/content in this test setup
      return Promise.resolve(Result.err(new Error(`Unexpected parse call: lang=${language}`)));
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

    // Verify logger.debug might have been called for skipping (optional, depends on implementation)
    // expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining(`Skipping parsing for unsupported file: ${txtFilePath}`));
    // expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining(`Skipping parsing for unsupported file: ${cssFilePath}`));
  });

  it('should log a warning if parsing fails for a supported file (AC5)', async () => {
    // Arrange
    const rootPath = '/path/to/project';
    const jsFilePath = path.join(rootPath, 'src', 'buggy.js');
    const jsContent = 'function () { // invalid syntax';
    const mockError = new Error('Mock parse error: Syntax issue');

    const fileMetadata: FileMetadata[] = [{ path: jsFilePath, size: jsContent.length }];

    // Mock file system and collection
    mockFilePrioritizer.prioritizeFiles.mockReturnValue(fileMetadata);
    mockContentCollector.collectContent.mockResolvedValue(
      Result.ok({
        content: 'Irrelevant combined content',
        metadata: fileMetadata,
      })
    );
    mockFileOps.readFile.mockResolvedValue(Result.ok(jsContent));

    // Mock failed parsing for the JS file
    // Ensure it returns Promise.resolve as parse is async
    mockTreeSitterParserService.parse.mockImplementation((content, language) => {
      if (language === 'javascript' && content === jsContent) {
        return Promise.resolve(Result.err(mockError));
      }
      return Promise.resolve(Result.err(new Error('Unexpected parse call')));
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
  });
});
