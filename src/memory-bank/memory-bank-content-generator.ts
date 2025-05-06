import { Injectable, Inject } from '../core/di/decorators';
import { ILogger } from '../core/services/logger-service';
import { Result } from '../core/result/result';
import { LLMAgent } from '../core/llm/llm-agent';
import {
  IMemoryBankContentGenerator,
  MemoryBankFileType,
  IContentProcessor, // Added import
} from './interfaces';
// Import ProjectContext from the core analysis types
import { ProjectContext } from '../core/analysis/types';
import { MemoryBankGenerationError } from '../core/errors/memory-bank-errors';

/**
 * Generates memory bank content using LLM
 */
@Injectable()
export class MemoryBankContentGenerator implements IMemoryBankContentGenerator {
  constructor(
    @Inject('LLMAgent') private readonly llmAgent: LLMAgent,
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
    context: ProjectContext, // Updated context type
    template: string
  ): Promise<Result<string, Error>> {
    try {
      this.logger.debug(`Generating content for ${fileType} memory bank file`);

      // TODO: Implement new prompt building logic here (delegated to Junior Coder)
      // This logic should call internal methods based on fileType
      // and return { systemPrompt: string, userPrompt: string }
      const { systemPrompt: newSystemPrompt, userPrompt: newUserPrompt } = this.buildPrompts(
        fileType,
        context,
        template
      ); // Placeholder call

      // Get completion from LLM
      const completionResult = await this.llmAgent.getCompletion(
        newSystemPrompt, // Use the newly built system prompt
        newUserPrompt // Use the newly built user prompt
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

      // Strip HTML comments (<!-- ... -->)
      const contentWithoutCommentsResult = this.contentProcessor.stripHtmlComments(
        strippedContentResult.value
      );

      if (contentWithoutCommentsResult.isErr()) {
        const commentStripError = new MemoryBankGenerationError(
          `Failed to strip HTML comments from ${fileType} content`,
          { operation: 'stripHtmlComments', fileType },
          contentWithoutCommentsResult.error
        );
        this.logger.error(`Failed to strip HTML comments for ${fileType}`, commentStripError);
        return Result.err(commentStripError);
      }

      // Explicit check for undefined after comment stripping
      if (contentWithoutCommentsResult.value === undefined) {
        const undefinedError = new MemoryBankGenerationError(
          `Content stripping (comments) unexpectedly returned undefined for ${fileType}`,
          { operation: 'stripHtmlComments', fileType }
        );
        this.logger.error(
          `Content stripping (comments) returned undefined for ${fileType}`,
          undefinedError
        );
        return Result.err(undefinedError);
      }

      this.logger.debug(`Successfully stripped markdown and comments for ${fileType}`);
      return Result.ok(contentWithoutCommentsResult.value);
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
   * Builds the system and user prompts for the LLM based on file type, context, and template.
   * Selects relevant context data and formats it appropriately for the user prompt.
   * @param fileType - Type of memory bank file
   * @param context - Project context information
   * @param template - Template content with embedded LLM instructions
   * @returns An object containing the system and user prompts
   */
  private buildPrompts(
    fileType: MemoryBankFileType,
    context: ProjectContext,
    template: string
  ): { systemPrompt: string; userPrompt: string } {
    this.logger.debug(`Building prompts for ${fileType}`);

    // Consistent system prompt defining the role and core task
    const systemPrompt = `You are an expert technical writer specializing in software documentation. Your task is to populate the provided Markdown template using the structured PROJECT CONTEXT data provided in the user prompt. You MUST strictly follow the instructions embedded in HTML comments (\`<!-- LLM: ... -->\`) within the template to guide content generation and data selection. Adhere precisely to the template's structure and formatting.`;

    let instructions = '';
    let contextDataString = 'PROJECT CONTEXT DATA:\n\n';

    // Instructions for the LLM when provided with the full context
    instructions = `Generate the content for the ${String(fileType)} document. You have been provided with the full structured PROJECT CONTEXT DATA for the project. Use this data as directed by the \`<!-- LLM: ... -->\` instructions embedded within the TEMPLATE section. Carefully select and utilize the relevant information from the PROJECT CONTEXT DATA to populate the template sections. Adhere to the template's structure and formatting. Aim for detailed and informative content based on the available context.`;

    // Format the entire ProjectContext object
    try {
      const fullContextJson = JSON.stringify(context, null, 2);
      contextDataString += `Full Project Context:\n\`\`\`json\n${fullContextJson}\n\`\`\`\n\n`;
    } catch (error) {
      this.logger.error(`Failed to stringify full ProjectContext: ${String(error)}`);
      contextDataString += `Full Project Context:\n\`\`\`json\n${JSON.stringify({ error: 'Failed to serialize full context' }, null, 2)}\n\`\`\`\n\n`;
    }

    // Construct the final user prompt
    const userPrompt = `${instructions}\n\n${contextDataString}TEMPLATE:\n${template}`;

    return { systemPrompt, userPrompt };
  }
}
