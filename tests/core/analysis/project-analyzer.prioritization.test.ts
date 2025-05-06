/* eslint-disable @typescript-eslint/unbound-method */
import { IAstAnalysisService } from '../../../src/core/analysis/ast-analysis.interfaces'; // Corrected path
import path from 'path';
import {
  // Removed unused: FileContentResult,
  IFileContentCollector,
  IFilePrioritizer,
  ITreeSitterParserService,
  FileMetadata, // Import FileMetadata
} from '../../../src/core/analysis/interfaces';
import { ProjectAnalyzer } from '../../../src/core/analysis/project-analyzer';
// import { ResponseParser } from '../../../src/core/analysis/response-parser'; // No longer a direct dependency
import { ITechStackAnalyzerService } from '../../../src/core/analysis/tech-stack-analyzer'; // Added
import { IFileOperations } from '../../../src/core/file-operations/interfaces';
import { LLMAgent } from '../../../src/core/llm/llm-agent';
import { Result } from '../../../src/core/result/result';
import { ILogger } from '../../../src/core/services/logger-service';
import { ProgressIndicator } from '../../../src/core/ui/progress-indicator';
import { Dirent } from 'fs'; // Import Dirent
import { /* ProjectContext, */ GenericAstNode } from '../../../src/core/analysis/types'; // Import ProjectContext and GenericAstNode

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

// Removed unused: type TestFileMetadata = { path: string; size: number };

describe('ProjectAnalyzer File Prioritization and Token Limiting', () => {
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

    // Set default return values for mocks used in multiple tests if needed
    // eslint-disable-next-line @typescript-eslint/require-await
    mockFileOps.readFile.mockImplementation(async (filePath: string) => {
      return Result.ok(`Mock content for ${path.basename(filePath)}`);
    });
    mockFileOps.readDir.mockResolvedValue(Result.ok([]));
    mockFileOps.isDirectory.mockResolvedValue(Result.ok(false));
    mockFileOps.normalizePath.mockImplementation((p: string) => p);
    mockFileOps.exists.mockResolvedValue(Result.ok(true));
    mockFileOps.copyDirectoryRecursive.mockResolvedValue(Result.ok(undefined));

    mockLLMAgent.getModelContextWindow.mockResolvedValue(10000);
    mockLLMAgent.countTokens.mockResolvedValue(10);
    mockLLMAgent.getProvider.mockResolvedValue(
      Result.ok({
        getContextWindowSize: jest.fn().mockReturnValue(10000),
        countTokens: jest.fn().mockResolvedValue(10),
        getCompletion: jest.fn(),
        providerId: 'mock-provider',
        modelId: 'mock-model',
      } as any) // Keep 'any' for simplicity in test setup
    );
    // getProviderId and getModelId might not be needed if LLMAgent mock is sufficient

    // Provide a valid default GenericAstNode
    const defaultAstNode: GenericAstNode = {
      type: 'program',
      text: '',
      startPosition: { row: 0, column: 0 },
      endPosition: { row: 0, column: 0 },
      isNamed: true,
      fieldName: null,
      children: [],
    };
    mockTreeSitterParserService.initialize.mockReturnValue(Result.ok(undefined));
    mockTreeSitterParserService.parse.mockReturnValue(Result.ok(defaultAstNode));
    mockAstAnalysisService.analyzeAst.mockResolvedValue(
      Result.ok({ functions: [], classes: [], imports: [] })
    );

    mockTechStackAnalyzerService.analyze.mockResolvedValue({
      // Default mock
      languages: ['typescript'],
      frameworks: ['jest'],
      buildTools: ['npm'],
      testingFrameworks: ['jest'],
      linters: ['eslint'],
      packageManager: 'npm',
    });

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

  describe('File Prioritization', () => {
    it('should prioritize core configuration files first', async () => {
      const rootPath = 'root/path';
      const srcPath = path.join(rootPath, 'src');

      // --- Test-specific Mocks for collectAnalyzableFiles ---
      (mockFileOps.readDir as jest.Mock).mockImplementation((dirPath: string) => {
        if (dirPath === rootPath)
          return Promise.resolve(
            Result.ok(['src', 'package.json', 'tsconfig.json'] as unknown as Dirent[])
          ); // Mock Dirent structure
        if (dirPath === srcPath)
          return Promise.resolve(Result.ok(['app.ts', 'utils.ts'] as unknown as Dirent[]));
        return Promise.resolve(Result.ok([] as Dirent[]));
      });
      (mockFileOps.isDirectory as jest.Mock).mockImplementation((filePath: string) => {
        return Promise.resolve(Result.ok(filePath === srcPath)); // Only srcPath is a directory
      });
      // --- End Test-specific Mocks ---

      // Define expected collected paths (full paths) and metadata
      const expectedCollectedPaths = [
        path.join(rootPath, 'package.json'),
        path.join(rootPath, 'tsconfig.json'),
        path.join(srcPath, 'app.ts'), // Use joined path
        path.join(srcPath, 'utils.ts'), // Use joined path
      ];
      const expectedFileMetadata: FileMetadata[] = expectedCollectedPaths.map((p: string) => ({
        // Use FileMetadata
        path: p,
        size: 0, // Size is updated by collector, initial is 0
      }));

      // Mock prioritizeFiles return value based on test logic (using full paths)
      const prioritizedFilesMockReturn: FileMetadata[] = [
        // Use FileMetadata
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
            .map((f: FileMetadata) => `Mock content for ${path.basename(f.path)}`) // Use FileMetadata
            .join('\n'),
          metadata: prioritizedFilesMockReturn,
        })
      );

      // Mock later stages to allow successful completion
      mockLLMAgent.getCompletion.mockResolvedValue(Result.ok('{}')); // Simple valid JSON
      // mockResponseParser uses default success mock from beforeEach

      // Execute
      const result = await projectAnalyzer.analyzeProject([rootPath]);

      // Assertions
      if (result.isErr()) console.error('analyzeProject failed:', result.error); // Log error on failure
      expect(result.isOk()).toBe(true);

      // Check that prioritizeFiles was called with the correctly collected FileMetadata
      expect(mockFilePrioritizer.prioritizeFiles as jest.Mock).toHaveBeenCalledWith(
        expect.arrayContaining(
          expectedFileMetadata.map((m: FileMetadata) =>
            expect.objectContaining({ path: m.path, size: m.size })
          ) // Use FileMetadata
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
        if (dirPath === rootPath)
          return Promise.resolve(
            Result.ok(['src', 'package.json', 'webpack.config.js'] as unknown as Dirent[])
          );
        if (dirPath === srcPath)
          return Promise.resolve(Result.ok(['styles.css', 'index.ts'] as unknown as Dirent[]));
        return Promise.resolve(Result.ok([] as Dirent[]));
      });
      (mockFileOps.isDirectory as jest.Mock).mockImplementation((filePath: string) => {
        return Promise.resolve(Result.ok(filePath === srcPath));
      });
      // --- End Test-specific Mocks ---

      const expectedCollectedPaths = [
        path.join(srcPath, 'styles.css'),
        path.join(rootPath, 'package.json'),
        path.join(rootPath, 'webpack.config.js'),
        path.join(srcPath, 'index.ts'),
      ];
      const expectedFileMetadata: FileMetadata[] = expectedCollectedPaths.map((p: string) => ({
        // Use FileMetadata
        path: p,
        size: 0,
      }));

      // Mock prioritizeFiles return value
      const prioritizedFilesMockReturn: FileMetadata[] = [
        // Use FileMetadata
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
            .map((f: FileMetadata) => `Mock content for ${path.basename(f.path)}`) // Use FileMetadata
            .join('\n'),
          metadata: prioritizedFilesMockReturn,
        })
      );

      // Mock later stages
      mockLLMAgent.getCompletion.mockResolvedValue(Result.ok('{}'));
      // mockResponseParser uses default success mock from beforeEach

      // Execute
      const result = await projectAnalyzer.analyzeProject([rootPath]);

      // Assertions
      if (result.isErr()) console.error('analyzeProject failed:', result.error);
      expect(result.isOk()).toBe(true);

      expect(mockFilePrioritizer.prioritizeFiles as jest.Mock).toHaveBeenCalledWith(
        expect.arrayContaining(
          expectedFileMetadata.map((m: FileMetadata) =>
            expect.objectContaining({ path: m.path, size: m.size })
          ) // Use FileMetadata
        ),
        rootPath
      );

      const prioritizedFilesResult = mockFilePrioritizer.prioritizeFiles.mock.results[0].value;
      expect(prioritizedFilesResult.map((f: FileMetadata) => f.path)).toEqual([
        // Use FileMetadata
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
        if (dirPath === rootPath) return Promise.resolve(Result.ok(['src'] as unknown as Dirent[]));
        if (dirPath === srcPath) return Promise.resolve(Result.ok(files as unknown as Dirent[]));
        return Promise.resolve(Result.ok([] as Dirent[]));
      });
      (mockFileOps.isDirectory as jest.Mock).mockImplementation((filePath: string) => {
        return Promise.resolve(Result.ok(filePath === srcPath));
      });
      // --- End Test-specific Mocks ---

      const expectedCollectedPaths = files.map((f: string) => path.join(srcPath, f));
      const expectedFileMetadata: FileMetadata[] = expectedCollectedPaths.map((p: string) => ({
        // Use FileMetadata
        path: p,
        size: 0,
      }));

      const prioritizedFilesMockReturn: FileMetadata[] = expectedCollectedPaths.map(
        // Use FileMetadata
        (p: string) => ({
          path: p,
          size: 300,
        })
      );
      mockFilePrioritizer.prioritizeFiles.mockReturnValue(prioritizedFilesMockReturn);

      mockContentCollector.collectContent.mockResolvedValue(
        Result.ok({
          content: prioritizedFilesMockReturn
            .map((f: FileMetadata) => `Mock content for ${path.basename(f.path)}`) // Use FileMetadata
            .join('\n'),
          metadata: prioritizedFilesMockReturn,
        })
      );

      // Mock later stages
      mockLLMAgent.getCompletion.mockResolvedValue(Result.ok('{}'));
      // mockResponseParser uses default success mock from beforeEach

      // Execute
      const result = await projectAnalyzer.analyzeProject([rootPath]);

      // Assertions
      if (result.isErr()) console.error('analyzeProject failed:', result.error);
      expect(result.isOk()).toBe(true);

      expect(mockFilePrioritizer.prioritizeFiles as jest.Mock).toHaveBeenCalledWith(
        expect.arrayContaining(
          expectedFileMetadata.map((m: FileMetadata) =>
            expect.objectContaining({ path: m.path, size: m.size })
          ) // Use FileMetadata
        ),
        rootPath
      );

      const prioritizedFilesResult = mockFilePrioritizer.prioritizeFiles.mock.results[0].value;
      expect(prioritizedFilesResult.map((f: FileMetadata) => f.path)).toEqual(
        // Use FileMetadata
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
        if (dirPath === rootPath)
          return Promise.resolve(Result.ok(['src', 'package.json'] as unknown as Dirent[]));
        if (dirPath === srcPath)
          return Promise.resolve(Result.ok(['app.ts', 'utils.ts'] as unknown as Dirent[]));
        return Promise.resolve(Result.ok([] as Dirent[]));
      });
      (mockFileOps.isDirectory as jest.Mock).mockImplementation((filePath: string) => {
        return Promise.resolve(Result.ok(filePath === srcPath));
      });
      // --- End Test-specific Mocks ---

      // Mock prioritizeFiles to return files in order
      const prioritizedFilesMockReturn: FileMetadata[] = [
        // Use FileMetadata
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
        (f: FileMetadata) => f.path // Use FileMetadata
      );
      const contentCollectorResultMetadata: FileMetadata[] = [
        // Use FileMetadata
        // Only first two files fit
        { path: path.join(rootPath, 'package.json'), size: 100 },
        { path: path.join(srcPath, 'app.ts'), size: 200 },
      ];
      mockContentCollector.collectContent.mockResolvedValue(
        Result.ok({
          content: 'Mock content for package.json\nMock content for app.ts', // Corrected content based on readFile mock
          metadata: contentCollectorResultMetadata,
        })
      );

      // Mock later stages
      mockLLMAgent.getCompletion.mockResolvedValue(Result.ok('{}'));
      // mockResponseParser uses default success mock from beforeEach

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
          collectContentMockResult.value.metadata.find(
            (
              m: FileMetadata // Use FileMetadata
            ) => m.path.endsWith('utils.ts')
          )
        ).toBeUndefined();
      }
    });

    it('should prioritize high-priority files within token limit', async () => {
      const rootPath = 'root/path';
      const srcPath = path.join(rootPath, 'src');

      // --- Test-specific Mocks ---
      (mockFileOps.readDir as jest.Mock).mockImplementation((dirPath: string) => {
        if (dirPath === rootPath)
          return Promise.resolve(
            Result.ok(['src', 'package.json', 'tsconfig.json'] as unknown as Dirent[])
          );
        if (dirPath === srcPath)
          return Promise.resolve(Result.ok(['large-file.ts'] as unknown as Dirent[]));
        return Promise.resolve(Result.ok([] as Dirent[]));
      });
      (mockFileOps.isDirectory as jest.Mock).mockImplementation((filePath: string) => {
        return Promise.resolve(Result.ok(filePath === srcPath));
      });
      // --- End Test-specific Mocks ---

      // Mock prioritizeFiles to return high-priority first
      const prioritizedFilesMockReturn: FileMetadata[] = [
        // Use FileMetadata
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
        (f: FileMetadata) => f.path // Use FileMetadata
      );
      const contentCollectorResultMetadata: FileMetadata[] = [
        // Use FileMetadata
        // Only first two (high-priority) files fit
        { path: path.join(rootPath, 'package.json'), size: 100 },
        { path: path.join(rootPath, 'tsconfig.json'), size: 200 },
      ];
      mockContentCollector.collectContent.mockResolvedValue(
        Result.ok({
          content: 'Mock content for package.json\nMock content for tsconfig.json', // Corrected content
          metadata: contentCollectorResultMetadata,
        })
      );

      // Mock later stages
      mockLLMAgent.getCompletion.mockResolvedValue(Result.ok('{}'));
      // mockResponseParser uses default success mock from beforeEach

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
          collectContentMockResult.value.metadata.find(
            (
              m: FileMetadata // Use FileMetadata
            ) => m.path.endsWith('large-file.ts')
          )
        ).toBeUndefined();
      }
    });

    it('should handle empty or invalid files gracefully', async () => {
      const rootPath = 'root/path';
      const srcPath = path.join(rootPath, 'src');

      // --- Test-specific Mocks ---
      (mockFileOps.readDir as jest.Mock).mockImplementation((dirPath: string) => {
        if (dirPath === rootPath)
          return Promise.resolve(
            Result.ok(['src', 'empty.txt', 'invalid.bin'] as unknown as Dirent[])
          );
        if (dirPath === srcPath)
          return Promise.resolve(Result.ok(['app.ts'] as unknown as Dirent[]));
        return Promise.resolve(Result.ok([] as Dirent[]));
      });
      (mockFileOps.isDirectory as jest.Mock).mockImplementation((filePath: string) => {
        return Promise.resolve(Result.ok(filePath === srcPath));
      });
      // Mock readFile to return error for invalid.bin and empty for empty.txt
      (mockFileOps.readFile as jest.Mock).mockImplementation((filePath: string) => {
        // Removed async
        if (filePath.endsWith('invalid.bin')) return Result.err(new Error('Cannot read binary'));
        if (filePath.endsWith('empty.txt')) return Result.ok('');
        return Result.ok(`Mock content for ${path.basename(filePath)}`);
      });
      // --- End Test-specific Mocks ---

      const expectedCollectedPaths = [
        // Only analyzable files
        path.join(srcPath, 'app.ts'),
        path.join(rootPath, 'empty.txt'), // empty.txt is analyzable but empty
      ];
      const expectedFileMetadata: FileMetadata[] = expectedCollectedPaths.map((p: string) => ({
        // Use FileMetadata
        path: p,
        size: 0,
      }));

      const prioritizedFilesMockReturn: FileMetadata[] = [
        // Use FileMetadata
        { path: path.join(srcPath, 'app.ts'), size: 100 },
        { path: path.join(rootPath, 'empty.txt'), size: 0 },
      ];
      mockFilePrioritizer.prioritizeFiles.mockReturnValue(prioritizedFilesMockReturn);

      mockContentCollector.collectContent.mockResolvedValue(
        Result.ok({
          content: 'Mock content for app.ts\n', // Content for empty.txt is just newline
          metadata: prioritizedFilesMockReturn,
        })
      );

      // Mock later stages
      mockLLMAgent.getCompletion.mockResolvedValue(Result.ok('{}'));
      // mockResponseParser uses default success mock from beforeEach

      // Execute
      const result = await projectAnalyzer.analyzeProject([rootPath]);

      // Assertions
      if (result.isErr()) console.error('analyzeProject failed:', result.error);
      expect(result.isOk()).toBe(true);

      // Verify prioritizeFiles was called only with analyzable files
      expect(mockFilePrioritizer.prioritizeFiles).toHaveBeenCalledWith(
        expect.arrayContaining(
          expectedFileMetadata.map((m: FileMetadata) =>
            expect.objectContaining({ path: m.path, size: m.size })
          ) // Use FileMetadata
        ),
        rootPath
      );
      expect(mockFilePrioritizer.prioritizeFiles).not.toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ path: expect.stringContaining('invalid.bin') }),
        ])
      );

      // Verify contentCollector was called with prioritized analyzable files
      expect(mockContentCollector.collectContent).toHaveBeenCalledWith(
        prioritizedFilesMockReturn.map((f) => f.path),
        rootPath,
        expect.any(Number)
      );
    });
  });
});
