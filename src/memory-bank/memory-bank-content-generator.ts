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

    // Helper function to format a section of context data into a Markdown JSON block
    // Skips empty or null data to keep the prompt clean.
    const formatContextSection = (title: string, data: unknown): string => {
      if (
        !data ||
        (Array.isArray(data) && data.length === 0) ||
        (typeof data === 'object' && data !== null && Object.keys(data).length === 0)
      ) {
        return ''; // Don't include empty sections
      }
      try {
        // Ensure complex objects are stringified correctly
        const jsonData = JSON.stringify(data, null, 2);
        return `**${title}:**\n\`\`\`json\n${jsonData}\n\`\`\`\n\n`;
      } catch (error) {
        this.logger.error(`Failed to stringify context section "${title}": ${String(error)}`);
        return `**${title}:**\n\`\`\`json\n${JSON.stringify({ error: 'Failed to serialize data' }, null, 2)}\n\`\`\`\n\n`;
      }
    };

    // Select and format context based on the file type
    switch (fileType) {
      case MemoryBankFileType.ProjectOverview:
        instructions = `Generate the content for the Project Overview document. Use the structured PROJECT CONTEXT data provided below as directed by the \`<!-- LLM: ... -->\` comments found within the TEMPLATE section. Strictly adhere to the template structure and the embedded comments. Focus on high-level information suitable for a project overview.`;
        // Select high-level context relevant for an overview
        contextDataString += formatContextSection(
          'Project Summary (from codeInsights)',
          (context.codeInsights as any)?.projectSummary
        );
        contextDataString += formatContextSection(
          'Key Components (Summaries)',
          (context.codeInsights as any)?.components?.map(
            (c: { name: string; summary: string }) => ({
              name: c.name,
              summary: c.summary,
            })
          ) || []
        );
        contextDataString += formatContextSection('Tech Stack (Languages/Frameworks)', {
          languages: context.techStack?.languages,
          frameworks: context.techStack?.frameworks,
        });
        // Removed access to context.structure.overview as it doesn't exist in the type definition
        break;

      case MemoryBankFileType.TechnicalArchitecture: {
        instructions = `Generate the content for the Technical Architecture document. Use the structured PROJECT CONTEXT data provided below as directed by the \`<!-- LLM: ... -->\` comments found within the TEMPLATE section. Strictly adhere to the template structure and the embedded comments. Focus on technical details, components, interactions, and dependencies.`;
        // Select detailed technical context
        contextDataString += formatContextSection('Tech Stack (Detailed)', context.techStack);
        contextDataString += formatContextSection('Project Structure', context.structure);
        contextDataString += formatContextSection('Dependencies', context.dependencies);
        // Extract functions and classes from all files for Technical Architecture
        const allFunctions = Object.values(context.codeInsights || {})
          .flatMap((insight) => insight.functions || [])
          .filter((f) => f.name); // Ensure functions have names
        const allClassNames = Object.values(context.codeInsights || {})
          .flatMap((insight) => insight.classes || [])
          .map((c) => c.name)
          .filter(Boolean); // Ensure class names exist

        contextDataString += formatContextSection(
          'Identified Functions (Across Project)',
          allFunctions.map((f) => ({ name: f.name, params: f.parameters.length })) // Simplified view
        );
        contextDataString += formatContextSection(
          'Identified Classes (Names Across Project)',
          allClassNames
        );
        break;
      }

      case MemoryBankFileType.DeveloperGuide:
        instructions = `Generate the content for the Developer Guide document. Use the structured PROJECT CONTEXT data provided below as directed by the \`<!-- LLM: ... -->\` comments found within the TEMPLATE section. Strictly adhere to the template structure and the embedded comments. Focus on setup, development workflows, coding standards, and component usage.`;
        // Select context relevant for developers
        contextDataString += formatContextSection('Tech Stack (for Setup)', context.techStack);
        contextDataString += formatContextSection(
          'Project Structure (Detailed)',
          context.structure
        );
        contextDataString += formatContextSection(
          'Dependencies (for Setup/Build)',
          context.dependencies
        );
        contextDataString += formatContextSection(
          'Key Components (Usage & Details from codeInsights)',
          (context.codeInsights as any)?.components
        ); // Focus on components
        // Consider adding context.codeInsights.codingStandards or similar if available in the future
        break;

      default:
        // Fallback for safety, though enums should prevent this
        this.logger.warn(
          `Unexpected MemoryBankFileType encountered: ${String(fileType)}. Using generic prompt structure.`
        );
        instructions = `Generate the content for the document. Use the structured PROJECT CONTEXT data provided below as directed by the \`<!-- LLM: ... -->\` comments found within the TEMPLATE section. Strictly adhere to the template structure and the embedded comments.`;
        // Include broader context for fallback
        contextDataString += formatContextSection('Full Project Context', context); // Less selective for unknown types
        break;
    }

    // Add a note if no specific context was selected or available
    if (contextDataString === 'PROJECT CONTEXT DATA:\n\n') {
      contextDataString =
        'PROJECT CONTEXT DATA:\n\n*(No specific context data selected or available for this file type)*\n\n';
    }

    // Construct the final user prompt
    const userPrompt = `${instructions}\n\n${contextDataString}TEMPLATE:\n${template}`;

    return { systemPrompt, userPrompt };
  }
}
