import { IProjectAnalyzer } from '../../src/core/analysis/types';
import { IServiceContainer } from '../../src/core/di/interfaces';
import { IFileOperations } from '../../src/core/file-operations/interfaces';
import { LLMAgent } from '../../src/core/llm/llm-agent';
import { ILogger } from '../../src/core/services/logger-service';
import { IRulesContentProcessor } from '../../src/generators/rules/interfaces';
import { RulesGenerator } from '../../src/generators/rules/rules-generator';

describe('RulesGenerator', () => {
  let rulesGenerator: RulesGenerator;
  let mockLogger: jest.Mocked<ILogger>;
  let mockFileOps: jest.Mocked<IFileOperations>;
  let mockProjectAnalyzer: jest.Mocked<IProjectAnalyzer>;
  let mockLLMAgent: jest.Mocked<LLMAgent>;
  let mockContentProcessor: jest.Mocked<IRulesContentProcessor>;
  let mockServiceContainer: jest.Mocked<IServiceContainer>;

  beforeEach(() => {
    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as jest.Mocked<ILogger>;

    mockFileOps = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      exists: jest.fn(),
      isDirectory: jest.fn(),
      readDir: jest.fn(),
      copyFile: jest.fn(),
      copyDirectoryRecursive: jest.fn(),
      deleteFile: jest.fn(),
      deleteDirectory: jest.fn(),
      createDirectory: jest.fn(),
      getRelativePath: jest.fn(),
      getAbsolutePath: jest.fn(),
      joinPaths: jest.fn(),
      dirname: jest.fn(),
      basename: jest.fn(),
      extname: jest.fn(),
    } as unknown as jest.Mocked<IFileOperations>;

    mockProjectAnalyzer = {
      analyzeTechStack: jest.fn(),
      analyzeProjectStructure: jest.fn(),
      analyzeDependencies: jest.fn(),
    } as jest.Mocked<IProjectAnalyzer>;

    mockLLMAgent = {
      getCompletion: jest.fn(),
      getChatCompletion: jest.fn(),
    } as unknown as jest.Mocked<LLMAgent>;

    mockContentProcessor = {
      stripMarkdownCodeBlock: jest.fn(),
      processContent: jest.fn(),
    } as jest.Mocked<IRulesContentProcessor>;

    mockServiceContainer = {
      resolve: jest.fn(),
      initialize: jest.fn(),
      register: jest.fn(),
      registerSingleton: jest.fn(),
      registerFactory: jest.fn(),
      clear: jest.fn(),
    } as unknown as jest.Mocked<IServiceContainer>;

    rulesGenerator = new RulesGenerator(
      mockServiceContainer,
      mockLogger,
      mockFileOps,
      mockProjectAnalyzer,
      mockLLMAgent,
      mockContentProcessor
    );
  });

  describe('validate', () => {
    it('should validate dependencies successfully', async () => {
      const result = await rulesGenerator.validate();
      expect(result.isOk()).toBe(true);
    });
  });

  describe('validateDependencies', () => {
    it('should return success when all dependencies are present', () => {
      const result = (rulesGenerator as any).validateDependencies();
      expect(result.isOk()).toBe(true);
    });

    it('should return error when dependencies are missing', () => {
      // Create a generator with missing dependencies
      const incompleteGenerator = new RulesGenerator(
        mockServiceContainer,
        mockLogger,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        null as any, // Missing fileOps
        mockProjectAnalyzer,
        mockLLMAgent,
        mockContentProcessor
      );

      const result = (incompleteGenerator as any).validateDependencies();
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('missing required dependencies');
    });
  });

  describe('trimIntroduction', () => {
    it('should remove common introductory text', () => {
      const content =
        'Okay, here are comprehensive coding rules and standards for your project.\n\n# Section 1\nContent';
      const result = (rulesGenerator as any).trimIntroduction(content);
      expect(result).toBe('# Section 1\nContent');
    });

    it('should handle content without introductory text', () => {
      const content = '# Section 1\nContent';
      const result = (rulesGenerator as any).trimIntroduction(content);
      expect(result).toBe('# Section 1\nContent');
    });
  });

  describe('limitContentSize', () => {
    it('should not modify content under 250 lines', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      const result = (rulesGenerator as any).limitContentSize(content);
      expect(result).toBe(content);
    });

    it('should trim content over 250 lines', () => {
      // Create content with 300 lines
      const lines = Array.from({ length: 300 }, (_, i) => `Line ${i + 1}`);
      const content = lines.join('\n');

      const result = (rulesGenerator as any).limitContentSize(content);
      const resultLines = result.split('\n');

      expect(resultLines.length).toBeLessThanOrEqual(250);
      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Trimming content'));
    });
  });
});
