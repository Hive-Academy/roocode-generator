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
      if (this.cache.has(name)) {
        this.logger.debug(`Template cache hit for ${name}`);
        return Result.ok(this.cache.get(name)!);
      }

      const templatePath = path.join(
        process.cwd(),
        "templates",
        "memory-bank",
        "templates",
        `${name}-template.md`
      );

      const readResult = await this.fileOps.readFile(templatePath);
      if (readResult.isErr()) {
        this.logger.error(
          `Failed to load template: ${templatePath}`,
          readResult.error ?? new Error("Unknown error")
        );
        return Result.err(readResult.error ?? new Error("Unknown error"));
      }

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
