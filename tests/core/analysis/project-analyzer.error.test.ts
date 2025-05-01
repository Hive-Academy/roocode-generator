import { IFileContentCollector, IFilePrioritizer } from '../../../src/core/analysis/interfaces';
import { ProjectAnalyzer } from '../../../src/core/analysis/project-analyzer';
import { ResponseParser } from '../../../src/core/analysis/response-parser';
import { IFileOperations } from '../../../src/core/file-operations/interfaces';
import { LLMAgent } from '../../../src/core/llm/llm-agent';
import { LLMProviderError } from '../../../src/core/llm/llm-provider-errors';
import { Result } from '../../../src/core/result/result';
import { ILogger } from '../../../src/core/services/logger-service';
import { ProgressIndicator } from '../../../src/core/ui/progress-indicator';

describe('ProjectAnalyzer Error Handling Tests', () => {
  let projectAnalyzer: ProjectAnalyzer;
  let mockFileOps: jest.Mocked<IFileOperations>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockLlmAgent: jest.Mocked<LLMAgent>;
  let mockResponseParser: jest.Mocked<ResponseParser>;
  let mockProgress: jest.Mocked<ProgressIndicator>;
  let mockContentCollector: jest.Mocked<IFileContentCollector>;
  let mockFilePrioritizer: jest.Mocked<IFilePrioritizer>;

  beforeEach(() => {
    mockFileOps = {
      readDir: jest.fn(),
      isDirectory: jest.fn(),
    } as any;

    mockLogger = {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    mockLlmAgent = {
      getCompletion: jest.fn(),
      getModelContextWindow: jest.fn(),
      countTokens: jest.fn(),
      getProvider: jest.fn(),
    } as any;

    mockResponseParser = {
      parseLlmResponse: jest.fn(),
    } as any;

    mockProgress = {
      start: jest.fn(),
      update: jest.fn(),
      succeed: jest.fn(),
      fail: jest.fn(),
    } as any;

    mockContentCollector = {
      collectContent: jest.fn(),
    } as any;

    mockFilePrioritizer = {
      prioritizeFiles: jest.fn(),
    } as any;

    projectAnalyzer = new ProjectAnalyzer(
      mockFileOps,
      mockLogger,
      mockLlmAgent,
      mockResponseParser,
      mockProgress,
      mockContentCollector,
      mockFilePrioritizer
    );
  });

  describe('analyzeProject Error Handling', () => {
    it('should handle empty project paths', async () => {
      const result = await projectAnalyzer.analyzeProject([]);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error?.message).toBe('No project paths provided for analysis.');
      }
    });

    it('should handle file collection errors', async () => {
      const error = new Error('File collection failed');
      mockContentCollector.collectContent.mockResolvedValueOnce(Result.err(error));

      const result = await projectAnalyzer.analyzeProject(['/invalid/path']);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error?.message).toBe(
          'Error collecting analyzable files: Error: File collection failed'
        );
      }
    });

    it('should handle no analyzable files found', async () => {
      mockContentCollector.collectContent.mockResolvedValueOnce(
        Result.ok({ content: '', metadata: [] })
      );

      const result = await projectAnalyzer.analyzeProject(['/empty/path']);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error?.message).toBe(
          'No analyzable files found or collected within token limit'
        );
      }
    });

    it('should handle LLM provider errors', async () => {
      const error = new LLMProviderError(
        'API rate limit exceeded',
        'RATE_LIMIT_EXCEEDED',
        'LLM_ERROR',
        {}
      ) as Error;
      mockLlmAgent.getCompletion.mockResolvedValueOnce(Result.err(error));

      const result = await projectAnalyzer.analyzeProject(['/valid/path']);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error?.message).toContain('Project context analysis failed');
      }
    });

    it('should handle LLM response format errors', async () => {
      const error = new LLMProviderError(
        'Invalid JSON response',
        'INVALID_RESPONSE_FORMAT',
        'LLM_ERROR'
      ) as Error;
      mockLlmAgent.getCompletion.mockResolvedValueOnce(Result.err(error));

      const result = await projectAnalyzer.analyzeProject(['/valid/path']);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error?.message).toContain('Project context analysis failed');
      }
    });

    it('should handle LLM response parsing errors', async () => {
      mockLlmAgent.getCompletion.mockResolvedValueOnce(Result.ok('invalid json'));
      mockResponseParser.parseLlmResponse.mockResolvedValueOnce(
        Result.err(new Error('Failed to parse JSON response'))
      );

      const result = await projectAnalyzer.analyzeProject(['/valid/path']);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error?.message).toContain('Failed to parse analysis results from LLM');
      }
    });

    it('should handle undefined parsed results', async () => {
      mockLlmAgent.getCompletion.mockResolvedValueOnce(Result.ok('valid json'));
      mockResponseParser.parseLlmResponse.mockResolvedValueOnce(Result.ok(undefined));

      const result = await projectAnalyzer.analyzeProject(['/valid/path']);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error?.message).toContain('Parsed analysis result value is undefined');
      }
    });

    it('should handle directory reading errors', async () => {
      const error = new Error('Directory not found');
      mockFileOps.readDir.mockResolvedValueOnce(Result.err(error));

      const result = await projectAnalyzer.analyzeProject(['/invalid/path']);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error?.message).toContain('Error collecting analyzable files');
      }
    });

    it('should handle isDirectory check errors', async () => {
      const error = new Error('File not found');
      mockFileOps.isDirectory.mockResolvedValueOnce(Result.err(error));

      const result = await projectAnalyzer.analyzeProject(['/invalid/path']);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error?.message).toContain('Error collecting analyzable files');
      }
    });

    it('should handle LLM model context window errors', async () => {
      mockLlmAgent.getModelContextWindow.mockResolvedValueOnce(
        Result.err(new Error('Context window unavailable'))
      );

      const result = await projectAnalyzer.analyzeProject(['/valid/path']);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error?.message).toContain('Project context analysis failed');
      }
    });

    it('should handle unexpected errors', async () => {
      const error = new Error('Unexpected error');
      mockLlmAgent.getCompletion.mockRejectedValueOnce(error);

      const result = await projectAnalyzer.analyzeProject(['/valid/path']);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error?.message).toContain('Project context analysis failed');
      }
    });
  });

  describe('File Collection Error Handling', () => {
    it('should handle empty file collections', async () => {
      mockContentCollector.collectContent.mockResolvedValueOnce(
        Result.ok({ content: '', metadata: [] })
      );

      const result = await projectAnalyzer.analyzeProject(['/empty/path']);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error?.message).toContain('No analyzable files found');
      }
    });

    it('should handle file collection timeouts', async () => {
      mockContentCollector.collectContent.mockImplementation(() => {
        throw new Error('Timeout after 30 seconds');
      });

      const result = await projectAnalyzer.analyzeProject(['/valid/path']);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error?.message).toContain('Error collecting analyzable files');
      }
    });
  });

  describe('LLM Integration Error Handling', () => {
    it('should handle LLM provider initialization errors', async () => {
      const error = new LLMProviderError(
        'Failed to initialize provider',
        'INITIALIZATION_FAILED',
        'LLM_ERROR',
        {}
      ) as Error;
      mockLlmAgent.getProvider.mockResolvedValueOnce(Result.err(error));

      const result = await projectAnalyzer.analyzeProject(['/valid/path']);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error?.message).toContain('Project context analysis failed');
      }
    });

    it('should handle LLM token counting errors', async () => {
      mockLlmAgent.countTokens.mockImplementation(() => {
        throw new Error('Token counting failed');
      });

      const result = await projectAnalyzer.analyzeProject(['/valid/path']);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error?.message).toContain('Project context analysis failed');
      }
    });

    it('should handle LLM context window errors', async () => {
      mockLlmAgent.getModelContextWindow.mockResolvedValueOnce(
        Result.err(new Error('Context window unavailable'))
      );

      const result = await projectAnalyzer.analyzeProject(['/valid/path']);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error?.message).toContain('Project context analysis failed');
      }
    });

    it('should handle LLM connection timeout errors', async () => {
      mockLlmAgent.getCompletion.mockImplementation(() => {
        throw new Error('Connection timeout after 30 seconds');
      });

      const result = await projectAnalyzer.analyzeProject(['/valid/path']);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error?.message).toContain('Project context analysis failed');
      }
    });

    it('should handle LLM rate limit errors', async () => {
      const error = new LLMProviderError(
        'API rate limit exceeded',
        'RATE_LIMIT_EXCEEDED',
        'LLM_ERROR',
        {}
      ) as Error;
      mockLlmAgent.getCompletion.mockResolvedValueOnce(Result.err(error));

      const result = await projectAnalyzer.analyzeProject(['/valid/path']);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error?.message).toContain('Project context analysis failed');
      }
    });

    it('should handle LLM authentication errors', async () => {
      const error = new LLMProviderError(
        'Invalid API key',
        'AUTHENTICATION_FAILED',
        'LLM_ERROR',
        {}
      ) as Error;
      mockLlmAgent.getCompletion.mockResolvedValueOnce(Result.err(error));

      const result = await projectAnalyzer.analyzeProject(['/valid/path']);
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error?.message).toContain('Project context analysis failed');
      }
    });
  });
});
