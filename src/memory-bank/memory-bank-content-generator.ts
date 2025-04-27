import { Injectable, Inject } from '../core/di/decorators';
import { ILogger } from '../core/services/logger-service';
import { Result } from '../core/result/result';
import { LLMAgent } from '../core/llm/llm-agent';
import {
  IPromptBuilder,
  IMemoryBankContentGenerator,
  MemoryBankFileType,
  IContentProcessor, // Added import
} from './interfaces';
import { MemoryBankGenerationError } from '../core/errors/memory-bank-errors';

/**
 * Generates memory bank content using LLM
 */
@Injectable()
export class MemoryBankContentGenerator implements IMemoryBankContentGenerator {
  constructor(
    @Inject('LLMAgent') private readonly llmAgent: LLMAgent,
    @Inject('IPromptBuilder') private readonly promptBuilder: IPromptBuilder,
    @Inject('IContentProcessor') private readonly contentProcessor: IContentProcessor, // Added dependency
    @Inject('ILogger') private readonly logger: ILogger
  ) {}

  /**
   * Generates content for a memory bank file using LLM
   * @param fileType - Type of memory bank file to generate
   * @param context - Project context information
   * @param template - Template content to use for generation
   * @returns A Result containing the generated content or an error
   */
  async generateContent(
    fileType: MemoryBankFileType,
    context: string,
    template: string
  ): Promise<Result<string, Error>> {
    try {
      this.logger.debug(`Generating content for ${fileType} memory bank file`);

      // Build system prompt based on file type
      const systemPrompt = this.buildSystemPrompt(fileType);

      // Build user prompt with context and template
      const userPromptResult = this.promptBuilder.buildPrompt(
        this.buildUserInstruction(fileType),
        context,
        template
      );

      if (userPromptResult.isErr()) {
        const error = new MemoryBankGenerationError(
          `Failed to build prompt for ${fileType}`,
          { operation: 'buildPrompt', fileType },
          userPromptResult.error
        );
        this.logger.error(`Failed to build prompt for ${fileType}`, error);
        return Result.err(error);
      }

      // Get completion from LLM
      const completionResult = await this.llmAgent.getCompletion(
        systemPrompt,
        userPromptResult.value as string
      );

      if (completionResult.isErr()) {
        const error = new MemoryBankGenerationError(
          `LLM invocation failed for ${fileType}`,
          { operation: 'llmGetCompletion', fileType },
          completionResult.error
        );
        this.logger.error(`LLM invocation failed for ${fileType}`, error);
        return Result.err(error);
      }

      // Validate the LLM response
      const content = completionResult.value;
      if (!content || content.trim().length === 0) {
        const error = new MemoryBankGenerationError(`LLM returned empty content for ${fileType}`, {
          operation: 'validateLlmResponse',
          fileType,
        });
        this.logger.error(`LLM returned empty content for ${fileType}`, error);
        return Result.err(error);
      }

      this.logger.debug(
        `Successfully generated content for ${fileType}, attempting to strip markdown.`
      );

      // Strip markdown code blocks
      const strippedContentResult = this.contentProcessor.stripMarkdownCodeBlock(content);

      if (strippedContentResult.isErr()) {
        const stripError = new MemoryBankGenerationError(
          `Failed to strip markdown from ${fileType} content`,
          { operation: 'stripMarkdownCodeBlock', fileType },
          strippedContentResult.error
        );
        this.logger.error(`Failed to strip markdown for ${fileType}`, stripError);
        return Result.err(stripError);
      }

      // Explicit check for undefined, potentially due to TS inference issue
      if (strippedContentResult.value === undefined) {
        const undefinedError = new MemoryBankGenerationError(
          `Content stripping unexpectedly returned undefined for ${fileType}`,
          { operation: 'stripMarkdownCodeBlock', fileType }
        );
        this.logger.error(`Content stripping returned undefined for ${fileType}`, undefinedError);
        return Result.err(undefinedError);
      }

      // Now TS should be certain value is string
      this.logger.debug(`Successfully stripped markdown for ${fileType}`);
      return Result.ok(strippedContentResult.value);
    } catch (error) {
      const wrappedError = new MemoryBankGenerationError(
        `Unexpected error generating content for ${fileType}`,
        { operation: 'generateContent', fileType },
        error instanceof Error ? error : new Error(String(error))
      );
      this.logger.error(`Unexpected error generating content for ${fileType}`, wrappedError);
      return Result.err(wrappedError);
    }
  }

  /**
   * Builds the system prompt for the LLM based on file type
   * @param fileType - Type of memory bank file
   * @returns System prompt string
   */
  private buildSystemPrompt(fileType: MemoryBankFileType): string {
    switch (fileType) {
      case MemoryBankFileType.ProjectOverview:
        return 'You are a technical documentation expert specializing in creating clear, concise project overviews. Your task is to analyze the provided project context and create a comprehensive project overview document following the template structure.';

      case MemoryBankFileType.TechnicalArchitecture:
        return 'You are a software architect with expertise in documenting technical architectures. Your task is to analyze the provided project context and create a detailed technical architecture document following the template structure.';

      case MemoryBankFileType.DeveloperGuide:
        return 'You are a senior developer with expertise in creating developer documentation. Your task is to analyze the provided project context and create a comprehensive developer guide following the template structure.';

      default:
        return 'You are a technical documentation expert. Your task is to analyze the provided project context and create documentation following the template structure.';
    }
  }

  /**
   * Builds the user instruction based on file type
   * @param fileType - Type of memory bank file
   * @returns User instruction string
   */
  private buildUserInstruction(fileType: MemoryBankFileType): string {
    switch (fileType) {
      case MemoryBankFileType.ProjectOverview:
        return 'Create a project overview document that explains the purpose, goals, and key features of the project. Include information about the target audience, business value, and high-level functionality.';

      case MemoryBankFileType.TechnicalArchitecture:
        return 'Create a technical architecture document that describes the system design, components, data flow, and technical decisions. Include information about technologies used, architectural patterns, and system boundaries.';

      case MemoryBankFileType.DeveloperGuide:
        return 'Create a developer guide that explains how to work with the codebase, including setup instructions, coding standards, and key workflows. Include information about the project structure, important APIs, and development best practices.';

      default:
        return 'Create a documentation file based on the provided context and template.';
    }
  }
}
