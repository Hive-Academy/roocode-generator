import { IProjectConfigService } from "../core/config/interfaces";
import { IFileOperations } from "../core/file-operations/interfaces";
import { Result } from "../core/result/result";
import { ILogger } from "../core/services/logger-service";
import { IProjectContextService } from "./interfaces";
import { Injectable, Inject } from "../core/di/decorators";
import { Dirent } from "fs";
import path from "path";

@Injectable()
export class ProjectContextService implements IProjectContextService {
  // Common binary file extensions to skip
  private readonly BINARY_EXTENSIONS = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".ico",
    ".pdf",
    ".zip",
    ".tar",
    ".gz",
    ".7z",
    ".rar",
    ".exe",
    ".dll",
    ".so",
    ".dylib",
  ]);

  // Directories to skip
  private readonly SKIP_DIRECTORIES = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    "coverage",
  ]);

  constructor(
    @Inject("IFileOperations") private readonly fileOperations: IFileOperations,
    @Inject("IProjectConfigService") private readonly projectConfigService: IProjectConfigService,
    @Inject("ILogger") private readonly logger: ILogger
  ) {}

  async gatherContext(paths: string[]): Promise<Result<string, Error>> {
    try {
      const contextData: string[] = [];

      for (const basePath of paths) {
        const result = await this.processPath(basePath, contextData);
        if (result.isErr()) {
          this.logger.warn(`Error processing path ${basePath}: ${result.error?.message}`);
          // Continue processing other paths even if one fails
          continue;
        }
      }

      if (contextData.length === 0) {
        return Result.err(new Error("No valid content found in the provided paths"));
      }

      return Result.ok(contextData.join("\n"));
    } catch (error) {
      return Result.err(
        new Error(
          `Error gathering context: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }
  }

  private async processPath(
    currentPath: string,
    contextData: string[]
  ): Promise<Result<void, Error>> {
    try {
      // Normalize the path to handle any undefined cases
      const normalizedPath = this.fileOperations.normalizePath(currentPath);

      // Check if path is a directory
      const dirResult = await this.fileOperations.readDir(normalizedPath);

      if (dirResult.isErr()) {
        // If we can't read as directory, try reading as file
        const fileResult = await this.fileOperations.readFile(normalizedPath);
        if (fileResult.isErr()) {
          return Result.err(
            new Error(`Failed to process path ${normalizedPath}: ${fileResult.error?.message}`)
          );
        }

        if (this.shouldProcessFile(normalizedPath)) {
          contextData.push(fileResult.value as string);
        }
        return Result.ok(void 0);
      }

      // Process directory contents
      const entries = dirResult.value as Dirent[];
      for (const entry of entries) {
        if (!entry.name || this.shouldSkipEntry(entry)) {
          continue;
        }

        const fullPath = path.join(normalizedPath, entry.name);
        if (entry.isDirectory()) {
          const result = await this.processPath(fullPath, contextData);
          if (result.isErr()) {
            this.logger.warn(
              `Skipping directory ${fullPath} due to error: ${result.error?.message}`
            );
            continue;
          }
        } else if (entry.isFile() && this.shouldProcessFile(entry.name)) {
          const fileResult = await this.fileOperations.readFile(fullPath);
          if (fileResult.isErr()) {
            this.logger.warn(
              `Skipping file ${fullPath} due to error: ${fileResult.error?.message}`
            );
            continue;
          }
          contextData.push(fileResult.value as string);
        }
      }

      return Result.ok(void 0);
    } catch (error) {
      return Result.err(
        new Error(
          `Error processing path ${currentPath}: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }
  }

  private shouldProcessFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return !this.BINARY_EXTENSIONS.has(ext);
  }

  private shouldSkipEntry(entry: Dirent): boolean {
    return (
      !entry.name || // Skip entries with no name
      entry.name.startsWith(".") || // Skip hidden files/directories
      (entry.isDirectory() && this.SKIP_DIRECTORIES.has(entry.name))
    );
  }
}
