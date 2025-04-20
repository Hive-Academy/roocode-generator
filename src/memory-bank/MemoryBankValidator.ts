import path from "path";
import { Injectable, Inject } from "../core/di/decorators";
import { IMemoryBankValidator, MemoryBankFileType, TemplateType } from "./interfaces";
import { IFileOperations } from "../core/file-operations/interfaces";
import { ILogger } from "../core/services/logger-service";
import { Result } from "../core/result/result";

@Injectable()
export class MemoryBankValidator implements IMemoryBankValidator {
  constructor(
    @Inject("IFileOperations") private readonly fileOps: IFileOperations,
    @Inject("ILogger") private readonly logger: ILogger
  ) {}

  async validateRequiredFiles(baseDir: string): Promise<Result<void>> {
    try {
      const memoryBankDir = path.join(baseDir, "memory-bank");
      const templateDir = path.join(baseDir, "templates", "memory-bank", "templates");

      const missingFiles: string[] = [];

      // Check memory bank files
      for (const fileType of Object.values(MemoryBankFileType)) {
        const filePath = path.join(memoryBankDir, `${fileType}.md`);
        const readResult = await this.fileOps.readFile(filePath);
        if (readResult.isErr()) {
          missingFiles.push(`Missing required memory bank file: ${fileType}.md`);
        }
      }

      // Check template files
      for (const templateType of Object.values(TemplateType)) {
        const filePath = path.join(templateDir, `${templateType}-template.md`);
        const readResult = await this.fileOps.readFile(filePath);
        if (readResult.isErr()) {
          missingFiles.push(`Missing required template file: ${templateType}-template.md`);
        }
      }

      if (missingFiles.length > 0) {
        return Result.err(new Error(`Missing required files:\n${missingFiles.join("\n")}`));
      }

      return Result.ok(undefined);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("Error validating memory bank files", err);
      return Result.err(err);
    }
  }

  async validateTemplateFiles(_baseDir: string): Promise<Result<void>> {
    // For now, just return success. Can be extended later.
    await Promise.resolve();
    return Result.ok(undefined);
  }

  validateFileContent(content: string, type: MemoryBankFileType): Result<void> {
    // Basic validation example: check if content is non-empty
    if (!content || content.trim().length === 0) {
      return Result.err(new Error(`Content for ${type} is empty`));
    }
    return Result.ok(undefined);
  }
}
