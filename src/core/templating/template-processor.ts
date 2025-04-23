import { Inject, Injectable } from "../di";
import { Result } from "../result/result"; // Import Result from core module
import { IRulesTemplateManager } from "../../types/rules-template-types"; // Import interface
import { IProjectAnalyzer, ProjectContext } from "../analysis/types"; // Assuming ProjectContext and IProjectAnalyzer location
import { LLMAgent } from "../llm/llm-agent"; // Assuming LLMAgent location
import { ILogger } from "../services/logger-service"; // Assuming logger interface location

@Injectable()
/**
 * Orchestrates the template processing pipeline for rules generation.
 * This includes loading and merging templates, generating contextual rules
 * using the LLM based on project analysis, and combining the results.
 */
export class TemplateProcessor {
  /**
   * @param templateManager - Manages loading, merging, and validating templates.
   * @param projectAnalyzer - Provides project context for generating contextual rules (injected but not fully used in current stub).
   * @param llmAgent - Interacts with the LLM for generating contextual rules.
   * @param logger - Logging service for reporting information, warnings, and errors.
   */
  constructor(
    @Inject("IRulesTemplateManager") private readonly templateManager: IRulesTemplateManager,
    @Inject("IProjectAnalyzer") private readonly projectAnalyzer: IProjectAnalyzer, // Injected but not used in the provided stub, keeping for potential future use
    @Inject("LLMAgent") private readonly llmAgent: LLMAgent,
    @Inject("ILogger") private readonly logger: ILogger
  ) {}

  /**
   * Processes templates by loading base and custom templates, merging them,
   * generating contextual rules using the LLM based on project context,
   * and combining everything into a final template string.
   * @param mode The mode (e.g., 'javascript', 'typescript').
   * @param context The project context obtained from the project analyzer.
   * @returns A Result containing the final processed template string or an Error.
   */
  public async processTemplate(
    mode: string,
    context: ProjectContext
  ): Promise<Result<string, Error>> {
    try {
      this.logger.info(`Starting template processing for mode: ${mode}`);

      // Load and merge templates
      const baseTemplateResult = await this.templateManager.loadBaseTemplate(mode);
      if (baseTemplateResult.isErr()) {
        this.logger.error(`Failed to load base template: ${baseTemplateResult.error?.message}`);
        return Result.err(baseTemplateResult.error as Error);
      }
      const baseTemplate = baseTemplateResult.value; // Type is string here

      const customTemplateResult = await this.templateManager.loadCustomizations(mode);
      if (customTemplateResult.isErr()) {
        this.logger.error(`Failed to load customizations: ${customTemplateResult.error?.message}`);
        return Result.err(customTemplateResult.error as Error);
      }
      const customTemplate = customTemplateResult.value; // Type is string here

      const mergedTemplateResult = this.templateManager.mergeTemplates(
        baseTemplate!, // Use non-null assertion as baseTemplateResult was Ok
        customTemplate! // Use non-null assertion as customTemplateResult was Ok
      );

      if (mergedTemplateResult.isErr()) {
        this.logger.error(`Failed to merge templates: ${mergedTemplateResult.error?.message}`);
        return Result.err(mergedTemplateResult.error as Error);
      }
      const mergedTemplate = mergedTemplateResult.value; // Type is string here

      this.logger.info("Templates loaded and merged successfully.");

      // Generate contextual rules using LLM
      const contextualRulesResult = await this.generateContextualRules(
        mode,
        context,
        mergedTemplate! // Use non-null assertion as mergedTemplateResult was Ok
      );

      if (contextualRulesResult.isErr()) {
        this.logger.error(
          `Failed to generate contextual rules: ${contextualRulesResult.error?.message}`
        );
        return Result.err(contextualRulesResult.error as Error);
      }
      const contextualRules = contextualRulesResult.value; // Type is string here

      this.logger.info("Contextual rules generated successfully.");

      // Combine everything into final template
      const finalTemplateResult = this.combineTemplateWithRules(
        mergedTemplate!, // Use non-null assertion
        contextualRules! // Use non-null assertion
      );

      if (finalTemplateResult.isErr()) {
        this.logger.error(
          `Failed to combine template with rules: ${finalTemplateResult.error?.message}`
        );
        return Result.err(finalTemplateResult.error as Error);
      }

      this.logger.info("Final template combined successfully.");
      return Result.ok(finalTemplateResult.value!); // Use non-null assertion
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `Unexpected error during template processing for mode ${mode}: ${err.message}`
      );
      return Result.err(err);
    }
  }

  /**
   * Generates contextual rules using the LLM based on the project context and the merged template.
   * It crafts a prompt using the project context and potentially parts of the template,
   * sends it to the LLM agent, and processes the response to generate rules.
   * @param mode The mode (e.g., 'javascript', 'typescript').
   * @param context The project context obtained from the project analyzer.
   * @param template The merged template content.
   * @returns A Promise resolving to a Result containing the generated contextual rules string on success, or an Error on failure.
   */
  private async generateContextualRules(
    mode: string,
    context: ProjectContext,
    template: string
  ): Promise<Result<string, Error>> {
    this.logger.info(`Generating contextual rules for mode: ${mode}`);

    // Craft a basic prompt using the mode and context.
    // A more sophisticated prompt would incorporate parts of the template structure.
    const prompt = `Generate contextual rules for a ${mode} project based on the following analysis:\n\n${JSON.stringify(context, null, 2)}\n\nConsider the structure of the following template:\n\n${template}\n\nProvide only the rules content, formatted appropriately for the template.`;

    // Call the LLM agent to generate the rules
    // The LLMAgent's getCompletion method is used for generating text from prompts.
    const systemPrompt =
      "You are a helpful assistant that generates code rules based on project context and a template structure. Provide only the rule definitions.";
    const llmResponse = await this.llmAgent.getCompletion(systemPrompt, prompt);

    if (llmResponse.isErr()) {
      this.logger.error(`LLM agent failed to generate rules: ${llmResponse.error!.message}`);
      return Result.err(llmResponse.error!);
    }

    this.logger.info("Contextual rules generated by LLM.");
    return Result.ok(llmResponse.value!);
  }

  /**
   * Combines the merged template content with the generated contextual rules.
   * It looks for a \`{{CONTEXTUAL_RULES}}\` placeholder in the template and replaces it.
   * If the placeholder is not found, the rules are appended to the end of the template.
   * @param template The merged template content string.
   * @param rules The generated contextual rules string.
   * @returns A Result containing the final template string on success, or an Error on failure.
   */
  private combineTemplateWithRules(template: string, rules: string): Result<string, Error> {
    this.logger.info("Combining template with generated rules.");

    const placeholder = "{{CONTEXTUAL_RULES}}";
    let finalTemplate: string;

    if (template.includes(placeholder)) {
      finalTemplate = template.replace(placeholder, rules);
      this.logger.info(`Replaced "${placeholder}" placeholder with generated rules.`);
    } else {
      finalTemplate = `${template}\n\n${rules}`;
      this.logger.warn(`Placeholder "${placeholder}" not found. Appending generated rules.`);
    }

    return Result.ok(finalTemplate);
  }
}
