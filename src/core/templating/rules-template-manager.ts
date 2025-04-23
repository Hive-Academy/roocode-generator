import { Result } from "../result/result"; // Import Result from core module
import { IRulesTemplateManager, TemplateCustomization } from "../../types/rules-template-types"; // Import interfaces
import { LLMAgent } from "../llm/llm-agent"; // Assuming LLMAgent location
import { Inject, Injectable } from "../di";
import { IFileOperations } from "../file-operations/interfaces";
import { ILogger } from "../services/logger-service";

@Injectable()
/**
 * Manages the loading, merging, and validation of rules templates and their customizations.
 * This class is responsible for interacting with the file system to retrieve template content
 * and applying basic merging and validation logic.
 */
export class RulesTemplateManager implements IRulesTemplateManager {
  /**
   * @param fileOps - File operations service for reading template files.
   * @param logger - Logging service for reporting information, warnings, and errors.
   * @param llmAgent - LLM Agent (injected but not directly used in current manager logic, kept as per plan).
   */
  constructor(
    @Inject("IFileOperations") private readonly fileOps: IFileOperations,
    @Inject("ILogger") private readonly logger: ILogger,
    @Inject("LLMAgent") private readonly llmAgent: LLMAgent // LLMAgent might not be needed directly in manager, but keeping as per subtask doc for now
  ) {}

  /**
   * Loads the base template content for a given mode from the file system.
   * Performs basic validation after loading.
   * @param mode The mode (e.g., 'javascript', 'typescript') for which to load the base template.
   * @returns A Promise resolving to a Result containing the base template string on success, or an Error on failure.
   */
  public async loadBaseTemplate(mode: string): Promise<Result<string, Error>> {
    try {
      this.logger.info(`Attempting to load base template for mode: ${mode}`);
      const templatePath = this.getTemplatePathForMode(mode);
      const content = await this.fileOps.readFile(templatePath);

      if (content.isErr()) {
        // content is narrowed to Err<Error>, content.error is Error
        this.logger.error(
          `Failed to read base template file ${templatePath}: ${content.error?.message}`
        );
        return Result.err(new Error(`Failed to load base template: ${content.error?.message}`));
      }

      // If we are here, content must be Ok<string>
      const templateContent = content.value; // content.value is string here

      this.logger.info(`Base template file ${templatePath} loaded successfully.`);

      // Basic validation after loading
      const validationResult = this.validateTemplate(templateContent!); // Use non-null assertion as a workaround if compiler struggles
      if (validationResult.isErr()) {
        // validationResult is narrowed to Err<Error>, validationResult.error is Error
        this.logger.error(
          `Base template validation failed for ${templatePath}: ${validationResult.error?.message}`
        );
        return Result.err(validationResult.error as Error); // validationResult.error is Error here
      }

      this.logger.info(`Base template for mode ${mode} validated successfully.`);
      return Result.ok(templateContent!); // Use non-null assertion as a workaround if compiler struggles
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Unexpected error loading base template for mode ${mode}: ${err.message}`);
      return Result.err(err);
    }
  }

  /**
   * Loads template customizations for a given mode from the file system.
   * Returns an empty string if no customization file is found.
   * @param mode The mode for which to load customizations.
   * @returns A Promise resolving to a Result containing the customization string on success, or an Error on failure.
   */
  public async loadCustomizations(mode: string): Promise<Result<string, Error>> {
    try {
      this.logger.info(`Attempting to load customizations for mode: ${mode}`);
      const customPath = this.getCustomizationPathForMode(mode);
      const exists = await this.fileOps.exists(customPath);

      if (exists.isErr()) {
        this.logger.error(
          `Error checking for customization file ${customPath}: ${exists.error?.message}`
        );
        return Result.err(new Error(`Error checking for customizations: ${exists.error?.message}`));
      }

      if (!exists.value) {
        this.logger.info(
          `No customization file found for mode: ${mode} at ${customPath}. Returning empty string.`
        );
        return Result.ok(""); // No customizations found
      }

      const content = await this.fileOps.readFile(customPath);
      if (content.isErr()) {
        this.logger.error(
          `Failed to read customization file ${customPath}: ${content.error?.message}`
        );
      } else {
        this.logger.info(`Customization file ${customPath} loaded successfully.`);
      }
      return content; // Returns Result<string, Error> directly
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Unexpected error loading customizations for mode ${mode}: ${err.message}`);
      return Result.err(err);
    }
  }

  /**
   * Merges a base template string with a customization string.
   * This implementation assumes a simple merging strategy based on sections and priorities
   * extracted by `parseTemplate`. Sections in the custom template override sections
   * in the base template with the same name if the custom section has a higher priority.
   * A more sophisticated template engine might be needed for complex scenarios like
   * merging content within sections.
   * @param base The base template string content.
   * @param custom The customization template string content.
   * @returns A Result containing the merged template string on success, or an Error on failure (e.g., if parsing fails).
   */
  public mergeTemplates(base: string, custom: string): Result<string, Error> {
    try {
      this.logger.info("Merging base and custom templates.");
      const baseTemplate = this.parseTemplate(base);
      const customTemplate = this.parseTemplate(custom);

      // Simple merge logic: sections in custom override sections in base by name,
      // higher priority sections override lower priority ones if names conflict.
      // This is a basic implementation and may need refinement based on actual template format.
      const mergedSections = new Map<string, { content: string; priority: number }>();

      // Add base sections
      for (const section of baseTemplate.sections) {
        mergedSections.set(section.name, { content: section.content, priority: section.priority });
      }

      // Add or override with custom sections based on priority
      for (const section of customTemplate.sections) {
        const existing = mergedSections.get(section.name);
        if (!existing || section.priority > existing.priority) {
          mergedSections.set(section.name, {
            content: section.content,
            priority: section.priority,
          });
        }
      }

      // Reconstruct the template string (this format is illustrative and depends on actual template syntax)
      // A real template engine would handle this based on defined syntax (e.g., handlebars, custom markers)
      let mergedContent = `# Template for Mode: ${baseTemplate.mode || customTemplate.mode}\n\n`;

      // Sort sections by priority or name for consistent output
      const sortedSections = Array.from(mergedSections.entries()).sort(
        ([, a], [, b]) => b.priority - a.priority
      );

      for (const [name, { content }] of sortedSections) {
        mergedContent += `## ${name}\n${content}\n\n`; // Example markdown-like section format
      }

      this.logger.info("Templates merged successfully.");
      return Result.ok(mergedContent);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Error merging templates: ${err.message}`);
      return Result.err(err);
    }
  }

  /**
   * Validates the structure and content of a template string.
   * This implementation performs basic checks:
   * 1. Ensures the template string is not empty.
   * 2. Attempts to parse the template using `parseTemplate` to check for basic structural validity.
   * 3. Checks if all required sections for the template's mode are present (if mode metadata is available).
   * More sophisticated validation (e.g., against a schema, content format within sections) may be needed.
   * @param template The template string content to validate.
   * @returns A Result indicating success (void) if validation passes, or an Error if validation fails.
   */
  public validateTemplate(template: string): Result<void, Error> {
    try {
      this.logger.info("Validating template structure.");
      // Basic validation: check if it's a non-empty string
      if (!template || template.trim().length === 0) {
        return Result.err(new Error("Template content is empty."));
      }

      // Attempt to parse to check for basic structural validity (depends on parseTemplate implementation)
      let parsedTemplate: TemplateCustomization;
      try {
        parsedTemplate = this.parseTemplate(template);
      } catch (parseError) {
        const err = parseError instanceof Error ? parseError : new Error(String(parseError));
        this.logger.error(`Template parsing failed during validation: ${err.message}`);
        return Result.err(new Error(`Template parsing failed: ${err.message}`));
      }

      // Check for required sections based on the mode identified in the template metadata
      // This assumes the template string contains parsable metadata including the mode.
      // If mode is not available in the template itself, it might need to be passed separately.
      if (!parsedTemplate.mode) {
        this.logger.warn(
          "Template metadata does not contain 'mode'. Cannot check required sections."
        );
        // Decide if this is a validation error or just a warning depending on requirements
        // For now, we'll allow templates without mode metadata but won't check required sections.
      } else {
        const requiredSections = this.getRequiredSectionsForMode(parsedTemplate.mode);
        const missingSections = requiredSections.filter(
          (sectionName) => !parsedTemplate.sections.some((s) => s.name === sectionName)
        );

        if (missingSections.length > 0) {
          this.logger.error(
            `Template validation failed: Missing required sections for mode ${parsedTemplate.mode}: ${missingSections.join(", ")}`
          );
          return Result.err(new Error(`Missing required sections: ${missingSections.join(", ")}`));
        }
        this.logger.info(`Required sections check passed for mode ${parsedTemplate.mode}.`);
      }

      this.logger.info("Template validation successful.");
      return Result.ok(undefined);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error(`Unexpected error during template validation: ${err.message}`);
      return Result.err(err);
    }
  }

  /**
   * Determines the file path for the base template based on the mode.
   * This is a placeholder implementation and needs to be updated with the actual
   * logic for locating template files within the project structure.
   * @param mode The mode (e.g., 'javascript', 'typescript').
   * @returns The file path to the base template.
   */
  private getTemplatePathForMode(mode: string): string {
    // Construct the path based on the project structure.
    // Assumes templates are stored in a 'templates/rules' directory at the project root.
    return `templates/rules/${mode}/base.md`;
  }

  /**
   * Determines the file path for template customizations based on the mode.
   * @param mode The mode (e.g., 'javascript', 'typescript').
   * @returns The file path to the template customizations.
   */
  private getCustomizationPathForMode(mode: string): string {
    // Construct the path based on the project structure.
    // Assumes customizations are stored in a 'templates/rules' directory at the project root.
    return `templates/rules/${mode}/custom.md`;
  }

  /**
   * Parses a template string into a structured TemplateCustomization object.
   * It extracts metadata (like mode), sections (with name, content, priority),
   * and identifies the marker for where contextual rules should be inserted.
   * Assumes a markdown-like format with:
   * - Optional metadata block at the start (e.g., "Mode: typescript")
   * - Sections defined by `## Section Name`
   * - A `{{CONTEXTUAL_RULES}}` marker for LLM-generated content insertion.
   * @param template The template string content to parse.
   * @returns A TemplateCustomization object representing the parsed template structure and data.
   * @throws Error if the template format is invalid or parsing fails.
   */
  private parseTemplate(template: string): TemplateCustomization {
    this.logger.info("Parsing template string.");

    const sections: { name: string; content: string; priority: number }[] = [];
    let mode = "";
    const contextualRulesMarkers: string[] = []; // Store markers found

    const lines = template.split("\n");
    let currentSectionName: string | null = null;
    let currentSectionContent: string[] = [];
    let sectionPriorityCounter = 100; // Assign decreasing priority

    // Process lines to extract metadata and sections
    for (const line of lines) {
      const modeMatch = line.match(/^Mode:\s*(.+)/);
      if (modeMatch && modeMatch[1]) {
        mode = modeMatch[1].trim();
        continue; // Skip metadata line
      }

      const sectionMatch = line.match(/^##\s*(.+)\s*$/);
      if (sectionMatch) {
        // If we were in a section, save it
        if (currentSectionName !== null) {
          sections.push({
            name: currentSectionName,
            content: currentSectionContent.join("\n").trim(),
            priority: sectionPriorityCounter--,
          });
        }
        // Start a new section
        currentSectionName = sectionMatch[1].trim();
        currentSectionContent = [];
      } else {
        // Add line to current section content or process markers
        if (line.includes("{{CONTEXTUAL_RULES}}")) {
          contextualRulesMarkers.push("{{CONTEXTUAL_RULES}}"); // Found the marker
          // Optionally, you might want to remove the marker from the content
          // currentSectionContent.push(line.replace("{{CONTEXTUAL_RULES}}", "").trim());
        } else {
          currentSectionContent.push(line);
        }
      }
    }

    // Save the last section
    if (currentSectionName !== null) {
      sections.push({
        name: currentSectionName,
        content: currentSectionContent.join("\n").trim(),
        priority: sectionPriorityCounter--,
      });
    }

    // Basic validation: ensure at least one section was found if template is not empty
    if (template.trim().length > 0 && sections.length === 0 && mode === "") {
      this.logger.warn("Template parsing found no sections or mode metadata.");
      // Depending on requirements, this might be an error. For now, just log.
    }

    // Return the parsed structure
    return {
      mode: mode,
      sections: sections,
      contextualRules: contextualRulesMarkers, // Indicate if the marker was found
    };
  }

  /**
   * Merges parsed template sections from base and custom templates.
   * Sections in the custom template override sections in the base template
   * with the same name if the custom section has a higher priority.
   * Reconstructs the template string in the defined format.
   * @param base The parsed base template object.
   * @param custom The parsed custom template object.
   * @returns A string representing the merged template content in the defined format.
   */
  private mergeTemplateSections(
    base: TemplateCustomization,
    custom: TemplateCustomization
  ): string {
    this.logger.info("Merging parsed template sections.");

    const mergedSections = new Map<string, { content: string; priority: number }>();
    let hasContextualRulesMarker = false;

    // Add base sections
    for (const section of base.sections) {
      mergedSections.set(section.name, { content: section.content, priority: section.priority });
    }
    if (base.contextualRules.length > 0) {
      hasContextualRulesMarker = true;
    }

    // Add or override with custom sections based on priority
    for (const section of custom.sections) {
      const existing = mergedSections.get(section.name);
      if (!existing || section.priority > existing.priority) {
        mergedSections.set(section.name, { content: section.content, priority: section.priority });
      }
    }
    if (custom.contextualRules.length > 0) {
      hasContextualRulesMarker = true;
    }

    // Reconstruct the template string
    let mergedContent = `# Template for Mode: ${base.mode || custom.mode}\n\n`;

    // Add metadata line if mode is available
    if (base.mode || custom.mode) {
      mergedContent = `Mode: ${base.mode || custom.mode}\n\n` + mergedContent;
    }

    // Sort sections by priority (descending) for consistent output
    const sortedSections = Array.from(mergedSections.entries()).sort(
      ([, a], [, b]) => b.priority - a.priority
    );

    for (const [name, { content }] of sortedSections) {
      mergedContent += `## ${name}\n${content}\n\n`; // Markdown-like section format
    }

    // Ensure the {{CONTEXTUAL_RULES}} marker is present if it was in either template
    if (hasContextualRulesMarker && !mergedContent.includes("{{CONTEXTUAL_RULES}}")) {
      mergedContent += "\n{{CONTEXTUAL_RULES}}\n"; // Append if not found in merged sections
      this.logger.warn("Contextual rules marker not found in merged sections, appending to end.");
    }

    return mergedContent;
  }

  /**
   * Returns the list of required section names for a given mode.
   * @param mode The mode (e.g., 'javascript', 'typescript').
   * @returns An array of strings representing the names of required sections for the given mode.
   */
  private getRequiredSectionsForMode(mode: string): string[] {
    // Define required sections for each supported mode.
    switch (mode) {
      case "typescript":
        return ["Overview", "Coding Standards", "Testing"];
      case "javascript":
        return ["Overview", "Coding Style"];
      default:
        return []; // No required sections by default
    }
  }
}
