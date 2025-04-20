import path from "path";
import { Injectable, Inject } from "../core/di/decorators";
import {
  IMemoryBankValidator,
  IMemoryBankFileManager,
  IMemoryBankTemplateManager,
  IContentProcessor,
  MemoryBankFileType,
} from "./interfaces";
import { ILogger } from "../core/services/logger-service";
import { Result } from "../core/result/result";
import { IGenerator } from "../core/generators/base-generator";
import { IProjectConfigService } from "../core/config/interfaces"; // Import IProjectConfigService

interface ProjectConfig {
  baseDir: string;
}

@Injectable()
export class MemoryBankGenerator implements IGenerator {
  readonly name = "MemoryBank"; // Correct name to match CLI/config usage

  constructor(
    @Inject("IMemoryBankValidator") private readonly validator: IMemoryBankValidator,
    @Inject("IMemoryBankFileManager") private readonly fileManager: IMemoryBankFileManager,
    @Inject("IMemoryBankTemplateManager")
    private readonly templateManager: IMemoryBankTemplateManager,
    @Inject("IContentProcessor") private readonly contentProcessor: IContentProcessor,
    @Inject("ILogger") private readonly logger: ILogger,
    @Inject("IProjectConfigService") private readonly projectConfigService: IProjectConfigService // Inject config service
  ) {}

  async generate(): Promise<Result<void, Error>> {
    try {
      // Load project config using the injected service
      const configResult = await this.projectConfigService.loadConfig();
      if (configResult.isErr()) {
        this.logger.error(
          `Failed to load project config: ${configResult.error?.message}`,
          configResult.error
        );
        return Result.err(configResult.error ?? new Error("Failed to load project config"));
      }
      const config = configResult.value;
      if (!config) {
        return Result.err(new Error("Project config is undefined after loading"));
      }

      // Validate configuration
      const configValidation = this.validateConfig(config);
      if (configValidation.isErr()) {
        return Result.err(configValidation.error ?? new Error("Unknown error"));
      }

      // Validate required files
      const filesValidation = await this.validator.validateRequiredFiles(config.baseDir);
      if (filesValidation.isErr()) {
        return Result.err(filesValidation.error ?? new Error("Unknown error"));
      }

      // Create memory bank directory
      const dirResult = await this.fileManager.createMemoryBankDirectory(config.baseDir);
      if (dirResult.isErr()) {
        return Result.err(dirResult.error ?? new Error("Unknown error"));
      }

      // Generate core files
      for (const fileType of Object.values(MemoryBankFileType)) {
        const result = await this.generateMemoryBankFile(config.baseDir, fileType);
        if (result.isErr()) {
          this.logger.error(
            `Failed to generate ${fileType}`,
            result.error ?? new Error("Unknown error")
          );
          return result;
        }
      }

      return Result.ok(undefined);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("Error in memory bank generation", err);
      return Result.err(err);
    }
  }

  private validateConfig(config: ProjectConfig): Result<void> {
    if (!config.baseDir || config.baseDir.trim() === "") {
      return Result.err(new Error("Invalid baseDir in project config"));
    }
    return Result.ok(undefined);
  }

  private async generateMemoryBankFile(
    baseDir: string,
    fileType: MemoryBankFileType
  ): Promise<Result<void>> {
    try {
      const templateResult = await this.templateManager.loadTemplate(fileType);
      if (templateResult.isErr() || templateResult.value === undefined) {
        return Result.err(templateResult.error ?? new Error("Template content is undefined"));
      }

      const processedResult = await this.contentProcessor.processTemplate(templateResult.value, {
        fileType,
        baseDir,
      });
      if (processedResult.isErr()) {
        return Result.err(processedResult.error ?? new Error("Unknown error"));
      }

      const filePath = path.join(baseDir, "memory-bank", `${fileType}.md`);
      if (processedResult.value === undefined) {
        return Result.err(new Error("Processed template content is undefined"));
      }
      return await this.fileManager.writeMemoryBankFile(filePath, processedResult.value);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      return Result.err(err);
    }
  }

  validate(): Promise<Result<void, Error>> {
    // For now, always return success. Implement actual validation logic as needed.
    return Promise.resolve(Result.ok(undefined));
  }
}
