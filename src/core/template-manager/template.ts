import { Result } from "../result/result";
import { TemplateError, TemplateValidationError, TemplateProcessingError } from "./errors";
import { ITemplate, ITemplateMetadata } from "./interfaces";

/**
 * Represents a loaded template with metadata.
 */
export class Template implements ITemplate {
  public readonly metadata: ITemplateMetadata;
  private readonly content: string;

  /**
   * Creates a new Template instance.
   * @param metadata Template metadata
   * @param content Template content string
   */
  constructor(metadata: ITemplateMetadata, content: string) {
    this.metadata = metadata;
    this.content = content;
  }

  /**
   * Validates the template content and metadata.
   * @returns Result<void, TemplateError>
   */
  public validate(): Result<void, TemplateError> {
    if (!this.metadata.name) {
      return Result.err(new TemplateValidationError("Template name is required", this.metadata));
    }
    if (!this.metadata.version) {
      return Result.err(new TemplateValidationError("Template version is required", this.metadata));
    }
    if (!this.content || this.content.trim() === "") {
      return Result.err(
        new TemplateValidationError("Template content cannot be empty", this.metadata)
      );
    }
    // Additional validation logic can be added here
    return Result.ok(undefined);
  }

  /**
   * Processes the template with the given context data.
   * @param context Data to process the template
   * @returns Result<string, TemplateError> Processed output or error
   */
  public process(context: Record<string, unknown>): Result<string, TemplateError> {
    try {
      // Simple template processing: replace {{key}} with context[key]
      let output = this.content;
      for (const [key, value] of Object.entries(context)) {
        // Escape key to prevent regex injection
        const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const pattern = new RegExp(`{{\\s*${escapedKey}\\s*}}`, "g");
        output = output.replace(pattern, String(value));
      }
      return Result.ok(output);
    } catch (error) {
      return Result.err(new TemplateProcessingError("Error processing template", error));
    }
  }
}
