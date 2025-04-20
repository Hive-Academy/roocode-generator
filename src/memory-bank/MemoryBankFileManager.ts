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
      const memoryBankDir = path.join(baseDir, "memory-bank");
      const result = await this.fileOps.createDirectory(memoryBankDir);
      if (result.isErr()) {
        this.logger.error(
          `Failed to create memory bank directory: ${memoryBankDir}`,
          result.error ?? new Error("Unknown error")
        );
        return Result.err(result.error ?? new Error("Unknown error"));
      }
      return Result.ok(undefined);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("Error creating memory bank directory", err);
      return Result.err(err);
    }
  }

  async writeMemoryBankFile(filePath: string, content: string): Promise<Result<void>> {
    try {
      const result = await this.fileOps.writeFile(filePath, content);
      if (result.isErr()) {
        this.logger.error(
          `Failed to write memory bank file: ${filePath}`,
          result.error ?? new Error("Unknown error")
        );
        return Result.err(result.error ?? new Error("Unknown error"));
      }
      return Result.ok(undefined);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("Error writing memory bank file", err);
      return Result.err(err);
    }
  }

  async readMemoryBankFile(filePath: string): Promise<Result<string>> {
    try {
      const result = await this.fileOps.readFile(filePath);
      if (result.isErr()) {
        this.logger.error(
          `Failed to read memory bank file: ${filePath}`,
          result.error ?? new Error("Unknown error")
        );
        return Result.err(result.error ?? new Error("Unknown error"));
      }
      if (result.value === undefined) {
        const err = new Error(`File content is undefined for: ${filePath}`);
        this.logger.error(err.message);
        return Result.err(err);
      }
      return Result.ok(result.value);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error("Error reading memory bank file", err);
      return Result.err(err);
    }
  }
}
