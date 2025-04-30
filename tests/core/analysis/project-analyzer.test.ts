/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
import { ProjectAnalyzer } from '../../../src/core/analysis/project-analyzer';
import { IFileOperations } from '../../../src/core/file-operations/interfaces';
import { LLMAgent } from '../../../src/core/llm/llm-agent';
import { ILogger } from '../../../src/core/services/logger-service';
import { ResponseParser } from '../../../src/core/analysis/response-parser';
import { ProgressIndicator } from '../../../src/core/ui/progress-indicator';
import { IFileContentCollector } from '../../../src/core/analysis/interfaces';
import { IFilePrioritizer } from '../../../src/core/analysis/interfaces';
import { Result } from '../../../src/core/result/result';

describe('ProjectAnalyzer File Prioritization and Token Limiting', () => {
  let projectAnalyzer: ProjectAnalyzer;
  let mockFileOps: jest.Mocked<IFileOperations>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockLLMAgent: jest.Mocked<LLMAgent>;
  let mockResponseParser: jest.Mocked<ResponseParser>;
  let mockProgress: jest.Mocked<ProgressIndicator>;
  let mockContentCollector: jest.Mocked<IFileContentCollector>;
  let mockFilePrioritizer: jest.Mocked<IFilePrioritizer>;

  beforeEach(() => {
    mockFileOps = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      createDirectory: jest.fn(),
      validatePath: jest.fn(),
    } as any;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    mockLLMAgent = {
      getModelContextWindow: jest.fn(),
      countTokens: jest.fn(),
    } as any;

    mockResponseParser = {} as any;

    mockProgress = {
      start: jest.fn(),
      update: jest.fn(),
      fail: jest.fn(),
    } as any;

    mockContentCollector = {
      collectContent: jest.fn(),
    } as unknown as jest.Mocked<IFileContentCollector>;

    mockFilePrioritizer = {
      prioritizeFiles: jest.fn(),
    } as unknown as jest.Mocked<IFilePrioritizer>;

    projectAnalyzer = new ProjectAnalyzer(
      mockFileOps,
      mockLogger,
      mockLLMAgent,
      mockResponseParser,
      mockProgress,
      mockContentCollector,
      mockFilePrioritizer
    );
  });

  describe('File Prioritization', () => {
    it('should prioritize core configuration files first', async () => {
      const files = ['src/app.ts', 'package.json', 'src/utils.ts', 'tsconfig.json'];

      (mockFileOps as any).getFiles.mockResolvedValue(files);
      // collectAnalyzableFiles uses fileOps.getFiles internally, so we mock it indirectly by mocking collectAnalyzableFiles if needed
      // But since collectAnalyzableFiles is private, we simulate by mocking fileOps.getFiles and filePrioritizer.prioritizeFiles

      // Mock collectAnalyzableFiles by mocking fileOps.getFiles and filePrioritizer.prioritizeFiles
      // We simulate collectAnalyzableFiles returning files
      // Then filePrioritizer.prioritizeFiles returns files reordered with config files first
      mockFilePrioritizer.prioritizeFiles.mockReturnValue([
        { path: 'package.json', size: 100 },
        { path: 'tsconfig.json', size: 200 },
        { path: 'src/app.ts', size: 300 },
        { path: 'src/utils.ts', size: 400 },
      ]);

      // Mock contentCollector.collectContent to return dummy content for all files using FileContentResult structure
      mockContentCollector.collectContent.mockResolvedValue(
        Result.ok({
          content:
            'package.json content\ntsconfig.json content\nsrc/app.ts content\nsrc/utils.ts content',
          metadata: [
            { path: 'package.json', size: 100 },
            { path: 'tsconfig.json', size: 200 },
            { path: 'src/app.ts', size: 300 },
            { path: 'src/utils.ts', size: 400 },
          ],
        })
      );

      mockLLMAgent.getModelContextWindow.mockResolvedValue(1000);
      // Mock getPromptOverheadTokens is private, so we mock llmAgent.getModelContextWindow and assume overhead is small

      // Mock llmAgent.countTokens to return token counts
      mockLLMAgent.countTokens.mockResolvedValue(10);

      const result = await projectAnalyzer.analyzeProject(['root/path']);

      expect(result.isOk()).toBe(true);
      expect(mockFilePrioritizer.prioritizeFiles as jest.Mock).toHaveBeenCalledWith(
        files,
        'root/path'
      );

      // Verify that prioritized files have config files first
      const prioritizedFiles = mockFilePrioritizer.prioritizeFiles.mock.results[0].value;
      expect(prioritizedFiles[0].path).toBe('package.json');
      expect(prioritizedFiles[1].path).toBe('tsconfig.json');
    });

    it('should respect priority order when collecting files', async () => {
      const files = ['src/styles.css', 'package.json', 'webpack.config.js', 'src/index.ts'];

      (mockFileOps as any).getFiles.mockResolvedValue(files);

      mockFilePrioritizer.prioritizeFiles.mockReturnValue([
        { path: 'package.json', size: 100 },
        { path: 'webpack.config.js', size: 150 },
        { path: 'src/index.ts', size: 200 },
        { path: 'src/styles.css', size: 250 },
      ]);

      mockContentCollector.collectContent.mockResolvedValue(
        Result.ok({
          content:
            'package.json content\nwebpack.config.js content\nsrc/index.ts content\nsrc/styles.css content',
          metadata: [
            { path: 'package.json', size: 100 },
            { path: 'webpack.config.js', size: 150 },
            { path: 'src/index.ts', size: 200 },
            { path: 'src/styles.css', size: 250 },
          ],
        })
      );

      mockLLMAgent.getModelContextWindow.mockResolvedValue(1000);
      mockLLMAgent.countTokens.mockResolvedValue(10);

      const result = await projectAnalyzer.analyzeProject(['root/path']);

      expect(result.isOk()).toBe(true);
      expect(mockFilePrioritizer.prioritizeFiles as jest.Mock).toHaveBeenCalledWith(
        files,
        'root/path'
      );

      const prioritizedFiles = mockFilePrioritizer.prioritizeFiles.mock.results[0].value;
      expect(prioritizedFiles).toEqual([
        'package.json',
        'webpack.config.js',
        'src/index.ts',
        'src/styles.css',
      ]);
    });

    it('should handle files with same priority level', async () => {
      const files = ['src/app.ts', 'src/utils.ts', 'src/index.ts'];

      (mockFileOps as any).getFiles.mockResolvedValue(files);

      mockFilePrioritizer.prioritizeFiles.mockReturnValue(
        files.map((f) => ({ path: f, size: 300 }))
      );

      mockContentCollector.collectContent.mockResolvedValue(
        Result.ok({
          content: files.map((f) => `${f} content`).join('\n'),
          metadata: files.map((f) => ({ path: f, size: 300 })),
        })
      );

      mockLLMAgent.getModelContextWindow.mockResolvedValue(1000);
      mockLLMAgent.countTokens.mockResolvedValue(10);

      const result = await projectAnalyzer.analyzeProject(['root/path']);

      expect(result.isOk()).toBe(true);
      expect(mockFilePrioritizer.prioritizeFiles as jest.Mock).toHaveBeenCalledWith(
        files,
        'root/path'
      );

      const prioritizedFiles = mockFilePrioritizer.prioritizeFiles.mock.results[0].value;
      expect(prioritizedFiles).toEqual(expect.arrayContaining(files));
    });
  });

  describe('Token Limiting', () => {
    it('should respect token limit when collecting files', async () => {
      const files = ['package.json', 'src/app.ts', 'src/utils.ts'];

      (mockFileOps as any).getFiles.mockResolvedValue(files);

      mockFilePrioritizer.prioritizeFiles.mockReturnValue(
        files.map((f, index) => ({ path: f, size: (index + 1) * 100 }))
      );

      // Simulate token limit by controlling maxTokens and contentCollector.collectContent behavior
      mockLLMAgent.getModelContextWindow.mockResolvedValue(60);
      // Assume overhead tokens is 10, so maxTokens = 50

      // contentCollector.collectContent should only return files within token limit
      mockContentCollector.collectContent.mockResolvedValue(
        Result.ok({
          content: 'package.json content\nsrc/app.ts content',
          metadata: [
            { path: 'package.json', size: 100 },
            { path: 'src/app.ts', size: 200 },
          ],
        })
      );

      mockLLMAgent.countTokens.mockResolvedValue(10);

      const result = await projectAnalyzer.analyzeProject(['root/path']);

      expect(result.isOk()).toBe(true);

      const collectedFiles = mockContentCollector.collectContent.mock.calls[0][0];
      expect(collectedFiles).toContain('package.json');
      expect(collectedFiles).toContain('src/app.ts');
      expect(collectedFiles).not.toContain('src/utils.ts');
    });

    it('should prioritize high-priority files within token limit', async () => {
      const files = ['src/large-file.ts', 'package.json', 'tsconfig.json'];

      (mockFileOps as any).getFiles.mockResolvedValue(files);

      mockFilePrioritizer.prioritizeFiles.mockReturnValue([
        { path: 'package.json', size: 100 },
        { path: 'tsconfig.json', size: 200 },
        { path: 'src/large-file.ts', size: 1000 },
      ]);

      mockLLMAgent.getModelContextWindow.mockResolvedValue(20);
      // Assume overhead tokens is 5, so maxTokens = 15

      mockContentCollector.collectContent.mockResolvedValue(
        Result.ok({
          content: 'package.json content\ntsconfig.json content',
          metadata: [
            { path: 'package.json', size: 100 },
            { path: 'tsconfig.json', size: 200 },
          ],
        })
      );

      mockLLMAgent.countTokens.mockResolvedValue(5);

      const result = await projectAnalyzer.analyzeProject(['root/path']);

      expect(result.isOk()).toBe(true);

      const collectedFiles = mockContentCollector.collectContent.mock.calls[0][0];
      expect(collectedFiles).toContain('package.json');
      expect(collectedFiles).toContain('tsconfig.json');
      expect(collectedFiles).not.toContain('src/large-file.ts');
    });

    it('should handle empty or invalid files gracefully', async () => {
      const files = ['package.json', 'empty-file.ts', 'invalid-file.ts'];

      (mockFileOps as any).getFiles.mockResolvedValue(files);

      mockFilePrioritizer.prioritizeFiles.mockReturnValue(
        files.map((f) => ({ path: f, size: 100 }))
      );

      // Simulate contentCollector.collectContent returning error for invalid file
      mockContentCollector.collectContent.mockResolvedValue(
        Result.ok({
          content: 'package.json content\nempty-file.ts content',
          metadata: [
            { path: 'package.json', size: 100 },
            { path: 'empty-file.ts', size: 100 },
          ],
        })
      );

      mockLLMAgent.getModelContextWindow.mockResolvedValue(1000);
      mockLLMAgent.countTokens.mockResolvedValue(10);

      const result = await projectAnalyzer.analyzeProject(['root/path']);

      expect(result.isOk()).toBe(true);

      const collectedFiles = mockContentCollector.collectContent.mock.calls[0][0];
      expect(collectedFiles).toContain('package.json');
      expect(collectedFiles).toContain('empty-file.ts');
      expect(collectedFiles).not.toContain('invalid-file.ts');
    });
  });
});
