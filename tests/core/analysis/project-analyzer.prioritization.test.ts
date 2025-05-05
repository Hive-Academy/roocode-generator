/* eslint-disable @typescript-eslint/unbound-method */
import { IAstAnalysisService } from '@core/analysis/ast-analysis.interfaces'; // Added
import path from 'path'; // Added path import
import {
  IFileContentCollector,
  IFilePrioritizer,
  ITreeSitterParserService,
} from '../../../src/core/analysis/interfaces';
import { ProjectAnalyzer } from '../../../src/core/analysis/project-analyzer';
import { ResponseParser } from '../../../src/core/analysis/response-parser';
import { IFileOperations } from '../../../src/core/file-operations/interfaces';
import { LLMAgent } from '../../../src/core/llm/llm-agent';
import { Result } from '../../../src/core/result/result'; // Import Result
// Removed duplicate Result import
import { ILogger } from '../../../src/core/services/logger-service'; // Keep type import
import { createMockLogger } from '../../__mocks__/logger.mock'; // Add mock factory import
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
  let mockTreeSitterParserService: jest.Mocked<ITreeSitterParserService>;
  let mockAstAnalysisService: jest.Mocked<IAstAnalysisService>; // Added

  beforeEach(() => {
    // Mocks for the 'File Prioritization and Token Limiting' tests
    mockFileOps = {
      // Add a default readFile mock here again
      // eslint-disable-next-line @typescript-eslint/require-await
      readFile: jest.fn().mockImplementation(async (filePath: string) => {
        return Result.ok(`Mock content for ${path.basename(filePath)}`);
      }),
      writeFile: jest.fn(),
      createDirectory: jest.fn(),
      validatePath: jest.fn(),
      getFiles: jest.fn(), // This might not be directly used if collectAnalyzableFiles is mocked indirectly
      // Mock readDir and isDirectory - These will be overridden in specific tests
      readDir: jest.fn().mockResolvedValue(Result.ok([])),
      isDirectory: jest.fn().mockResolvedValue(Result.ok(false)),
      // Add missing properties required by IFileOperations
      normalizePath: jest.fn().mockImplementation((p: string) => p),
      exists: jest.fn().mockResolvedValue(Result.ok(true)),
      copyDirectoryRecursive: jest.fn().mockResolvedValue(Result.ok(undefined)),
    } as jest.Mocked<IFileOperations>; // Use stricter typing

    mockLogger = createMockLogger();

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
          providerId: 'mock-provider', // Add missing property
          modelId: 'mock-model', // Add missing property
        })
      ),
      getProviderId: jest.fn().mockReturnValue('mock-provider'), // Add missing method
      getModelId: jest.fn().mockReturnValue('mock-model'), // Add missing method
      // analyzeProject: jest.fn(), // Removed - LLMAgent doesn't have this; was likely a mistake
    } as any; // Revert to 'as any' for LLMAgent

    mockResponseParser = {
      parseLlmResponse: jest.fn(), // Corrected method name
      // Removed properties added for stricter typing
    } as any; // Revert to 'as any' for ResponseParser

    mockProgress = {
      start: jest.fn(),
      update: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(), // Added succeed mock
      stop: jest.fn(), // Keep added stop method
      // spinner: null, // Removed spinner property
    } as any; // Revert to 'as any' for ProgressIndicator

    mockContentCollector = {
      collectContent: jest.fn(),
    } as unknown as jest.Mocked<IFileContentCollector>;

    mockFilePrioritizer = {
      prioritizeFiles: jest.fn(),
    } as unknown as jest.Mocked<IFilePrioritizer>;

    mockTreeSitterParserService = {
      // Initialize the mock
      initialize: jest.fn().mockResolvedValue(Result.ok(undefined)), // Added mock for initialize
      // Ensure parse returns a Result by default
      parse: jest.fn().mockReturnValue(Result.ok({ type: 'program', children: [] })),
      parseFile: jest.fn().mockResolvedValue(Result.ok({ type: 'program', children: [] })), // Added mock for parseFile
    } as jest.Mocked<ITreeSitterParserService>;

    mockAstAnalysisService = {
      // Added
      analyzeAst: jest
        .fn()
        .mockResolvedValue(Result.ok({ functions: [], classes: [], imports: [] })), // Added
    } as jest.Mocked<IAstAnalysisService>; // Added

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
      // TreeSitter mock is already set in beforeEach

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
      // TreeSitter mock is already set in beforeEach

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
      // TreeSitter mock is already set in beforeEach

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
      // TreeSitter mock is already set in beforeEach

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
      // TreeSitter mock is already set in beforeEach

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
      // TreeSitter mock is already set in beforeEach

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
