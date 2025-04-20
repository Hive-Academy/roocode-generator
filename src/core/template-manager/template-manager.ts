import { Result } from "../result/result";
import { ITemplateManager, ITemplate } from "./interfaces";
import { Template } from "./template";
import { TemplateError, TemplateNotFoundError } from "./errors";
import { Injectable, Inject } from "../di/decorators";
import { ILogger } from "../services/logger-service";
import { IFileOperations } from "../file-operations/interfaces";
/**
 * TemplateManager class implementing ITemplateManager interface.
 * Responsible for loading, validating, processing, and caching templates.
 */

@Injectable()
export class TemplateManager implements ITemplateManager {
  private cache: Map<string, Template> = new Map();
  private templateDir: string;
  private templateExt: string;

  constructor(
    @Inject("IFileOperations")
    private fileOperations: IFileOperations,
    @Inject("ILogger") private logger: ILogger,
    config?: { templateDir?: string; templateExt?: string }
  ) {
    this.templateDir = config?.templateDir ?? "templates";
    this.templateExt = config?.templateExt ?? ".tpl";
  }

  /**
   * Loads a template by name, using cache if available.
   * @param name Template name
   * @returns Result<ITemplate, TemplateError>
   */
  public async loadTemplate(name: string): Promise<Result<ITemplate, TemplateError>> {
    if (this.cache.has(name)) {
      this.logger.debug(`TemplateManager: Cache hit for template '${name}'`);
      return Result.ok(this.cache.get(name)!);
    }

    try {
      this.logger.debug(`TemplateManager: Loading template '${name}' from file system`);
      const templatePath = this.getTemplatePath(name);
      const contentResult = await this.fileOperations.readFile(templatePath);
      if (contentResult.isErr()) {
        return Result.err(new TemplateNotFoundError(name));
      }
      const content = contentResult.unwrap();

      // For simplicity, assume metadata is parsed from content header or separate file
      // Implement basic metadata extraction from content front matter (YAML-like)
      let metadata = { name, version: "1.0.0" };
      const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (frontMatterMatch) {
        try {
          const yaml = frontMatterMatch[1];
          // Simple YAML parsing: key: value per line
          const lines = yaml.split("\n");
          metadata = lines.reduce(
            (acc: { [key: string]: string } & { name: string; version: string }, line) => {
              const [key, ...rest] = line.split(":");
              if (key && rest.length > 0) {
                acc[key.trim()] = rest.join(":").trim();
              }
              return acc;
            },
            { name, version: "1.0.0" }
          );
        } catch {
          // Ignore parse errors, fallback to default metadata
        }
      }

      const template = new Template(metadata, content);
      const validation = template.validate();
      if (validation.isErr()) {
        return Result.err(validation.error ?? new TemplateError("Unknown validation error"));
      }

      this.cache.set(name, template);
      return Result.ok(template);
    } catch (error) {
      this.logger.error(`TemplateManager: Error loading template '${name}': ${String(error)}`);
      return Result.err(
        new TemplateError(
          `Failed to load template '${name}'`,
          error instanceof Error ? error : new Error(String(error))
        )
      );
    }
  }

  /**
   * Validates a template by name.
   * @param name Template name
   * @returns Result<void, TemplateError>
   */
  public async validateTemplate(name: string): Promise<Result<void, TemplateError>> {
    const templateResult = await this.loadTemplate(name);
    if (templateResult.isErr()) {
      return Result.err(templateResult.error ?? new TemplateError("Unknown error"));
    }
    return templateResult.unwrap().validate();
  }

  /**
   * Processes a template by name with context data.
   * @param name Template name
   * @param context Data for processing
   * @returns Result<string, TemplateError>
   */
  public async processTemplate(
    name: string,
    context: Record<string, unknown>
  ): Promise<Result<string, TemplateError>> {
    const templateResult = await this.loadTemplate(name);
    if (templateResult.isErr()) {
      return Result.err(templateResult.error ?? new TemplateError("Unknown error"));
    }
    return templateResult.unwrap().process(context);
  }

  /**
   * Helper to get the file path for a template by name.
   * @param name Template name
   * @returns string File path
   */
  /**
   * Helper to get the file path for a template by name.
   *
   * This method constructs the file path for a given template name using the
   * configurable `templateDir` and `templateExt` properties of the TemplateManager.
   * By default, it returns a path combining the directory, template name, and extension.
   *
   * Usage:
   * ```ts
   * const path = this.getTemplatePath('myTemplate');
   * // returns something like 'templates/myTemplate.tpl' depending on config
   * ```
   *
   * Override or extend this method in subclasses to customize template path resolution,
   * for example, to support different directory structures or file naming conventions.
   *
   * @param name - The name of the template
   * @returns The full file path to the template
   */
  protected getTemplatePath(name: string): string {
    return `${this.templateDir}/${name}${this.templateExt}`;
  }
}
