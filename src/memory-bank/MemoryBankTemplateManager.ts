import path from "path";
import { Injectable, Inject } from "../core/di/decorators";
import { IMemoryBankTemplateManager, MemoryBankFileType } from "./interfaces";
import { IFileOperations } from "../core/file-operations/interfaces";
import { ILogger } from "../core/services/logger-service";
import { Result } from "../core/result/result";

@Injectable()
export class MemoryBankTemplateManager implements IMemoryBankTemplateManager {
  private cache: Map<MemoryBankFileType, string> = new Map();

  constructor(
    @Inject("IFileOperations") private readonly fileOps: IFileOperations,
    @Inject("ILogger") private readonly logger: ILogger
  ) {}

  async loadTemplate(name: MemoryBankFileType): Promise<Result<string>> {
    try {
      this.logger.debug(
        `DEBUG (TemplateManager): loadTemplate received name: ${JSON.stringify(name)}`
      );

      if (this.cache.has(name)) {
        this.logger.debug(`DEBUG (TemplateManager): Template cache hit for ${String(name)}`);
        return Result.ok(this.cache.get(name)!);
      }

      // Load memory bank template files from memory-bank/templates
      const filename = String(name) + "-template.md";
      const templatePath = `${process.cwd()}${path.sep}templates${path.sep}memory-bank${path.sep}${filename}`;
      this.logger.debug(
        `DEBUG (TemplateManager): Attempting to load template from: "${templatePath}"`
      );

      // If template not found, try loading from templates/memory-bank/templates (for migration)
      const readResult = await this.fileOps.readFile(templatePath);
      if (readResult.isErr()) {
        const legacyFilename = String(name) + "-template.md";
        const legacyTemplatePath = `${process.cwd()}${path.sep}templates${path.sep}memory-bank${path.sep}templates${path.sep}${legacyFilename}`;
        this.logger.debug(
          `DEBUG (TemplateManager): Attempting to load legacy template from: "${legacyTemplatePath}"`
        );

        const legacyResult = await this.fileOps.readFile(legacyTemplatePath);
        if (legacyResult.isErr()) {
          this.logger.error(
            `Failed to load template from both locations: ${templatePath} and ${legacyTemplatePath}`,
            legacyResult.error ?? new Error("Unknown error")
          );
          return Result.err(legacyResult.error ?? new Error("Unknown error"));
        }

        // Template found in legacy location - use it
        const content = legacyResult.value!;
        this.cache.set(name, content);
        return Result.ok(content);
      }

      // If we get here, the first read was successful
      const content = readResult.value!;
      this.cache.set(name, content);
      return Result.ok(content);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("Error loading template", err);
      return Result.err(err);
    }
  }

  validateTemplate(content: string, _type: MemoryBankFileType): Result<boolean> {
    // Basic validation: content should not be empty
    if (!content || content.trim().length === 0) {
      return Result.err(new Error("Template content is empty"));
    }
    return Result.ok(true);
  }
}
