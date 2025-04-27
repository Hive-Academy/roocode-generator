/* eslint-disable @typescript-eslint/unbound-method */
import { MemoryBankContentGenerator } from '../../src/memory-bank/memory-bank-content-generator';
import { IPromptBuilder, MemoryBankFileType } from '../../src/memory-bank/interfaces';
import { LLMAgent } from '../../src/core/llm/llm-agent';
import { ILogger } from '../../src/core/services/logger-service';
import { Result } from '../../src/core/result/result';
import { MemoryBankGenerationError } from '../../src/core/errors/memory-bank-errors';

describe('MemoryBankContentGenerator', () => {
  let contentGenerator: MemoryBankContentGenerator;
  let mockLlmAgent: jest.Mocked<LLMAgent>;
  let mockPromptBuilder: jest.Mocked<IPromptBuilder>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    // Create mocks
    mockLlmAgent = {
      getCompletion: jest.fn(),
      analyzeProject: jest.fn(),
    } as unknown as jest.Mocked<LLMAgent>;

    mockPromptBuilder = {
      buildPrompt: jest.fn(),
    } as jest.Mocked<IPromptBuilder>;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as jest.Mocked<ILogger>;

    // Create the content generator with mocks
    contentGenerator = new MemoryBankContentGenerator(mockLlmAgent, mockPromptBuilder, mockLogger);

    // Default happy path mocks
    mockPromptBuilder.buildPrompt.mockReturnValue(Result.ok('Test prompt'));
    mockLlmAgent.getCompletion.mockResolvedValue(Result.ok('Generated content'));
  });

  describe('generateContent', () => {
    it('should successfully generate content for ProjectOverview', async () => {
      // Arrange
      const fileType = MemoryBankFileType.ProjectOverview;
      const context = 'Project context';
      const template = 'Template content';

      // Act
      const result = await contentGenerator.generateContent(fileType, context, template);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.value).toBe('Generated content');
      expect(mockPromptBuilder.buildPrompt).toHaveBeenCalledWith(
        expect.stringContaining('Create a project overview'),
        context,
        template
      );
      expect(mockLlmAgent.getCompletion).toHaveBeenCalledWith(
        expect.stringContaining('technical documentation expert'),
        'Test prompt'
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining(`Generating content for ${fileType}`)
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.stringContaining(`Successfully generated content for ${fileType}`)
      );
    });

    it('should successfully generate content for TechnicalArchitecture', async () => {
      // Arrange
      const fileType = MemoryBankFileType.TechnicalArchitecture;
      const context = 'Project context';
      const template = 'Template content';

      // Act
      const result = await contentGenerator.generateContent(fileType, context, template);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.value).toBe('Generated content');
      expect(mockPromptBuilder.buildPrompt).toHaveBeenCalledWith(
        expect.stringContaining('Create a technical architecture'),
        context,
        template
      );
      expect(mockLlmAgent.getCompletion).toHaveBeenCalledWith(
        expect.stringContaining('software architect'),
        'Test prompt'
      );
    });

    it('should successfully generate content for DeveloperGuide', async () => {
      // Arrange
      const fileType = MemoryBankFileType.DeveloperGuide;
      const context = 'Project context';
      const template = 'Template content';

      // Act
      const result = await contentGenerator.generateContent(fileType, context, template);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.value).toBe('Generated content');
      expect(mockPromptBuilder.buildPrompt).toHaveBeenCalledWith(
        expect.stringContaining('Create a developer guide'),
        context,
        template
      );
      expect(mockLlmAgent.getCompletion).toHaveBeenCalledWith(
        expect.stringContaining('senior developer'),
        'Test prompt'
      );
    });

    it('should return error when prompt building fails', async () => {
      // Arrange
      const fileType = MemoryBankFileType.ProjectOverview;
      const context = 'Project context';
      const template = 'Template content';
      const promptError = new Error('Prompt building failed');
      mockPromptBuilder.buildPrompt.mockReturnValue(Result.err(promptError));

      // Act
      const result = await contentGenerator.generateContent(fileType, context, template);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankGenerationError);
      expect(result.error?.message).toContain(`Failed to build prompt for ${fileType}`);
      const genError = result.error as MemoryBankGenerationError;
      expect(genError.context?.operation).toBe('buildPrompt');
      expect(genError.context?.fileType).toBe(fileType);
      expect(genError.cause).toBe(promptError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to build prompt for ${fileType}`),
        expect.any(MemoryBankGenerationError)
      );
      expect(mockLlmAgent.getCompletion).not.toHaveBeenCalled();
    });

    it('should return error when LLM invocation fails', async () => {
      // Arrange
      const fileType = MemoryBankFileType.ProjectOverview;
      const context = 'Project context';
      const template = 'Template content';
      const llmError = new Error('LLM API error');
      mockLlmAgent.getCompletion.mockResolvedValue(Result.err(llmError));

      // Act
      const result = await contentGenerator.generateContent(fileType, context, template);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankGenerationError);
      expect(result.error?.message).toContain(`LLM invocation failed for ${fileType}`);
      const genError = result.error as MemoryBankGenerationError;
      expect(genError.context?.operation).toBe('llmGetCompletion');
      expect(genError.context?.fileType).toBe(fileType);
      expect(genError.cause).toBe(llmError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`LLM invocation failed for ${fileType}`),
        expect.any(MemoryBankGenerationError)
      );
    });

    it('should return error when LLM returns empty content', async () => {
      // Arrange
      const fileType = MemoryBankFileType.ProjectOverview;
      const context = 'Project context';
      const template = 'Template content';
      mockLlmAgent.getCompletion.mockResolvedValue(Result.ok(''));

      // Act
      const result = await contentGenerator.generateContent(fileType, context, template);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankGenerationError);
      expect(result.error?.message).toContain(`LLM returned empty content for ${fileType}`);
      const genError = result.error as MemoryBankGenerationError;
      expect(genError.context?.operation).toBe('validateLlmResponse');
      expect(genError.context?.fileType).toBe(fileType);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`LLM returned empty content for ${fileType}`),
        expect.any(MemoryBankGenerationError)
      );
    });

    it('should handle unexpected errors during execution', async () => {
      // Arrange
      const fileType = MemoryBankFileType.ProjectOverview;
      const context = 'Project context';
      const template = 'Template content';
      const unexpectedError = new Error('Unexpected error');
      mockPromptBuilder.buildPrompt.mockImplementation(() => {
        throw unexpectedError;
      });

      // Act
      const result = await contentGenerator.generateContent(fileType, context, template);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(MemoryBankGenerationError);
      expect(result.error?.message).toContain(
        `Unexpected error generating content for ${fileType}`
      );
      const genError = result.error as MemoryBankGenerationError;
      expect(genError.context?.operation).toBe('generateContent');
      expect(genError.context?.fileType).toBe(fileType);
      expect(genError.cause).toBe(unexpectedError);
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Unexpected error generating content for ${fileType}`),
        expect.any(MemoryBankGenerationError)
      );
    });
  });
});
