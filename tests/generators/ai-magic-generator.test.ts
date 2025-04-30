/* eslint-disable @typescript-eslint/unbound-method */
import { AiMagicGenerator } from '../../src/generators/ai-magic-generator';
import { MemoryBankService } from '../../src/memory-bank/memory-bank-service';
import { LoggerService } from '../../src/core/services/logger-service';
import { ProjectAnalyzer } from '../../src/core/analysis/project-analyzer';
import { LLMAgent } from '../../src/core/llm/llm-agent';
import { FileOperations } from '../../src/core/file-operations/file-operations';
import { IRulesPromptBuilder } from '../../src/generators/rules/interfaces';
import { IContentProcessor } from '../../src/memory-bank/interfaces';
import { Result } from '../../src/core/result/result';
import { ProjectConfig } from 'types/shared';

describe('AiMagicGenerator (Unit Tests)', () => {
  let generator: AiMagicGenerator;

  // Minimal valid ProjectConfig mock with required properties and generatorType
  const baseConfig = {
    name: 'test-project',
    baseDir: '.',
    rootDir: '.',
    generators: ['ai-magic'],
  };

  // Mock dependencies with jest.Mock typing and arrow functions to avoid unbound method ESLint errors
  const mockMemoryBankService: MemoryBankService = {
    generateMemoryBank: jest.fn(),
  } as unknown as MemoryBankService;

  const mockLoggerService: LoggerService = {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as LoggerService;

  const mockProjectAnalyzer: ProjectAnalyzer = {
    analyzeProject: jest.fn(),
  } as unknown as ProjectAnalyzer;

  const mockFileOperations: FileOperations = {
    writeFile: jest.fn(),
  } as unknown as FileOperations;

  const mockRulesPromptBuilder: IRulesPromptBuilder = {
    buildSystemPrompt: jest.fn(),
    buildPrompt: jest.fn(),
  } as unknown as IRulesPromptBuilder;

  const mockContentProcessor: IContentProcessor = {
    stripMarkdownCodeBlock: jest.fn(),
  } as unknown as IContentProcessor;

  const mockLLMAgent: LLMAgent = {
    getCompletion: jest.fn(),
  } as unknown as LLMAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    generator = new AiMagicGenerator(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      {} as any, // IServiceContainer not used in tests
      mockLoggerService,
      mockFileOperations,
      mockProjectAnalyzer,
      mockLLMAgent,
      mockMemoryBankService,
      mockRulesPromptBuilder,
      mockContentProcessor
    );
  });

  describe('generate', () => {
    const contextPaths = ['.'];

    it('should return an error if generatorType is undefined', async () => {
      const options = { ...baseConfig } as ProjectConfig; // no generatorType
      const result = await generator.generate(options, contextPaths);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe(
        'The --generators flag is required when using --generate.'
      );
      expect(mockLoggerService.error).toHaveBeenCalledWith(
        'The --generators flag is required when using --generate.'
      );
    });

    it('should call generateMemoryBankContent when generatorType is "memory-bank"', async () => {
      const options = { ...baseConfig, generatorType: 'memory-bank' };
      const projectContext = {
        /* mock project context */
      };
      (mockProjectAnalyzer.analyzeProject as jest.Mock).mockResolvedValue(
        Result.ok(projectContext)
      );
      (mockMemoryBankService.generateMemoryBank as jest.Mock).mockResolvedValue(
        Result.ok('success')
      );

      const result = await generator.generate(options, contextPaths);

      expect(result.isOk()).toBe(true);
      expect(mockLoggerService.info).toHaveBeenCalledWith(
        'Starting AI Magic generation process...'
      );
      expect(mockLoggerService.info).toHaveBeenCalledWith('Generating memory bank content...');
      expect(mockMemoryBankService.generateMemoryBank).toHaveBeenCalledWith(
        projectContext,
        options
      );
    });

    it('should return error if memory bank generation fails', async () => {
      const options = { ...baseConfig, generatorType: 'memory-bank' };
      const projectContext = {
        /* mock project context */
      };
      (mockProjectAnalyzer.analyzeProject as jest.Mock).mockResolvedValue(
        Result.ok(projectContext)
      );
      const error = new Error('Memory bank error');
      (mockMemoryBankService.generateMemoryBank as jest.Mock).mockResolvedValue(Result.err(error));

      const result = await generator.generate(options, contextPaths);

      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toBe('Memory bank error');
      expect(mockLoggerService.error).toHaveBeenCalledWith('Memory bank error');
    });

    it('should call generateRooContent when generatorType is "roo"', async () => {
      const options = { ...baseConfig, generatorType: 'roo' };
      const projectContext = {
        /* mock project context */
      };
      (mockProjectAnalyzer.analyzeProject as jest.Mock).mockResolvedValue(
        Result.ok(projectContext)
      );

      // Mock internal methods called by generateRooContent
      jest
        .spyOn(generator as any, 'buildRooPrompts')
        .mockReturnValue(Result.ok({ systemPrompt: 'sys', userPrompt: 'user' }));
      jest.spyOn(generator as any, 'getRooCompletion').mockResolvedValue(Result.ok('completion'));
      jest.spyOn(generator as any, 'processRooContent').mockReturnValue(Result.ok('processed'));
      jest.spyOn(generator as any, 'writeRooFile').mockResolvedValue(Result.ok('path/to/file'));

      const result = await generator.generate(options, contextPaths);

      expect(result.isOk()).toBe(true);
      expect(mockLoggerService.info).toHaveBeenCalledWith(
        'Starting AI Magic generation process...'
      );
      expect(mockLoggerService.info).toHaveBeenCalledWith('Generating roo (rules) content...');
      expect(generator['buildRooPrompts']).toHaveBeenCalledWith(projectContext);
      expect(generator['getRooCompletion']).toHaveBeenCalledWith('sys', 'user');
      expect(generator['processRooContent']).toHaveBeenCalledWith('completion');
      expect(generator['writeRooFile']).toHaveBeenCalledWith('processed');
    });

    it('should return error if roo generation fails', async () => {
      const options = { ...baseConfig, generatorType: 'roo' };
      const projectContext = {
        /* mock project context */
      };
      (mockProjectAnalyzer.analyzeProject as jest.Mock).mockResolvedValue(
        Result.ok(projectContext)
      );
      const error = new Error('Roo generation error');
      jest.spyOn(generator as any, 'buildRooPrompts').mockReturnValue(Result.err(error));

      const result = await generator.generate(options, contextPaths);

      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toBe('Roo generation error');
      expect(mockLoggerService.error).toHaveBeenCalledWith('Roo generation error');
    });

    it('should call handleCursorGenerationPlaceholder when generatorType is "cursor"', async () => {
      const options = { ...baseConfig, generatorType: 'cursor' };
      const projectContext = {
        /* mock project context */
      };
      (mockProjectAnalyzer.analyzeProject as jest.Mock).mockResolvedValue(
        Result.ok(projectContext)
      );
      jest
        .spyOn(generator as any, 'handleCursorGenerationPlaceholder')
        .mockReturnValue(Result.ok('placeholder'));

      const result = await generator.generate(options, contextPaths);

      expect(result.isOk()).toBe(true);
      expect(mockLoggerService.info).toHaveBeenCalledWith(
        'Cursor generation requested (placeholder)...'
      );
      expect(mockLoggerService.info).toHaveBeenCalledWith(
        'Starting AI Magic generation process...'
      );
      expect(generator['handleCursorGenerationPlaceholder']).toHaveBeenCalledWith(
        projectContext,
        options
      );
    });

    it('should return error for unknown generatorType', async () => {
      const options = { ...baseConfig, generatorType: 'unknown-type' };
      const projectContext = {
        /* mock project context */
      };
      (mockProjectAnalyzer.analyzeProject as jest.Mock).mockResolvedValue(
        Result.ok(projectContext)
      );

      const result = await generator.generate(options, contextPaths);

      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toBe('Unknown generator type: unknown-type');
      expect(mockLoggerService.error).toHaveBeenCalledWith('Unknown generator type: unknown-type');
    });
  });
});
