import path from "path";
import { Injectable, Inject } from "../core/di/decorators";
import { IMemoryBankFileManager } from "./interfaces";
import { IFileOperations } from "../core/file-operations/interfaces";
import { ILogger } from "../core/services/logger-service";
import { Result } from "../core/result/result";

@Injectable()
export class MemoryBankFileManager implements IMemoryBankFileManager {
  constructor(
    @Inject("IFileOperations") private readonly fileOps: IFileOperations,
    @Inject("ILogger") private readonly logger: ILogger
  ) {}

  async createMemoryBankDirectory(baseDir: string): Promise<Result<void>> {
    try {
      // Create memory-bank directory
      const memoryBankDir = path.join(baseDir, "memory-bank");
      this.logger.debug(`Creating memory bank directory: ${memoryBankDir}`);

      const dirResult = await this.fileOps.createDirectory(memoryBankDir);
      if (dirResult.isErr()) {
        // If directory already exists, that's fine
        if (dirResult.error?.message.includes("EEXIST")) {
          this.logger.debug(`Memory bank directory already exists: ${memoryBankDir}`);
        } else {
          this.logger.error(
            `Failed to create memory bank directory: ${memoryBankDir}`,
            dirResult.error ?? new Error("Unknown error")
          );
          return Result.err(dirResult.error ?? new Error("Unknown error"));
        }
      } else {
        this.logger.debug(`Created memory bank directory: ${memoryBankDir}`);
      }

      // Create templates subdirectory
      const templatesDir = path.join(memoryBankDir, "templates");
      this.logger.debug(`Creating templates directory: ${templatesDir}`);

      const templatesDirResult = await this.fileOps.createDirectory(templatesDir);
      if (templatesDirResult.isErr()) {
        // If directory already exists, that's fine
        if (templatesDirResult.error?.message.includes("EEXIST")) {
          this.logger.debug(`Templates directory already exists: ${templatesDir}`);
        } else {
          this.logger.error(
            `Failed to create templates directory: ${templatesDir}`,
            templatesDirResult.error ?? new Error("Unknown error")
          );
          return Result.err(templatesDirResult.error ?? new Error("Unknown error"));
        }
      } else {
        this.logger.debug(`Created templates directory: ${templatesDir}`);
      }

      return Result.ok(undefined);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("Error creating memory bank directory structure", err);
      return Result.err(err);
    }
  }

  async writeMemoryBankFile(filePath: string, content: string): Promise<Result<void>> {
    try {
      // Ensure the directory exists before writing the file
      const dirPath = path.dirname(filePath);
      const dirResult = await this.fileOps.createDirectory(dirPath);
      if (dirResult.isErr() && !dirResult.error?.message.includes("EEXIST")) {
        this.logger.error(
          `Failed to create directory for file: ${dirPath}`,
          dirResult.error ?? new Error("Unknown error")
        );
        return Result.err(dirResult.error ?? new Error("Unknown error"));
      }

      this.logger.debug(`Writing memory bank file: ${filePath}`);
      const result = await this.fileOps.writeFile(filePath, content);
      if (result.isErr()) {
        this.logger.error(
          `Failed to write memory bank file: ${filePath}`,
          result.error ?? new Error("Unknown error")
        );
        return Result.err(result.error ?? new Error("Unknown error"));
      }
      this.logger.debug(`Successfully wrote memory bank file: ${filePath}`);
      return Result.ok(undefined);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("Error writing memory bank file", err);
      return Result.err(err);
    }
  }

  async readMemoryBankFile(filePath: string): Promise<Result<string>> {
    try {
      this.logger.debug(`Reading memory bank file: ${filePath}`);
      const result = await this.fileOps.readFile(filePath);
      if (result.isErr()) {
        if (result.error?.message.includes("ENOENT")) {
          this.logger.debug(`Memory bank file does not exist: ${filePath}`);
        } else {
          this.logger.error(
            `Failed to read memory bank file: ${filePath}`,
            result.error ?? new Error("Unknown error")
          );
        }
        return Result.err(result.error ?? new Error("Unknown error"));
      }
      if (result.value === undefined) {
        const err = new Error(`File content is undefined for: ${filePath}`);
        this.logger.error(err.message);
        return Result.err(err);
      }
      this.logger.debug(`Successfully read memory bank file: ${filePath}`);
      return Result.ok(result.value);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("Error reading memory bank file", err);
      return Result.err(err);
    }
  }
}
