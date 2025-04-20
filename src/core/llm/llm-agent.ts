import path from "path";
import { Injectable, Inject } from "../di/decorators";
import { ILLMAgent } from "./interfaces";
import { Result } from "../result/result";
import { IFileOperations } from "../file-operations/interfaces";
import { ILogger } from "../services/logger-service"; // Corrected import path
import { Dirent } from "fs"; // Import Dirent
import { LLMProviderRegistry } from "./provider-registry";

@Injectable()
export class LLMAgent implements ILLMAgent {
  constructor(
    @Inject("LLMProviderRegistry") private readonly llmProviderRegistry: LLMProviderRegistry,
    @Inject("IFileOperations") private readonly fileOps: IFileOperations,
    @Inject("ILogger") private readonly logger: ILogger
  ) {}

  /**
   * Analyzes a project directory using the LLM.
   * @param projectDir Path to the project directory
   * @returns Result wrapping AnalysisResult or error
   */
  async analyzeProject(projectDir: string): Promise<Result<any, Error>> {
    try {
      const files = await this.collectProjectFiles(projectDir);
      const prompt = this.buildPromptFromFiles(files);

      // Use the default provider from the registry, e.g., from configuration
      const providerName = process.env.DEFAULT_LLM_PROVIDER || "openai";
      const providerResult = this.llmProviderRegistry.getProvider(providerName);
      if (providerResult.isErr()) {
        this.logger.error(`LLM Provider not found: ${providerResult.error?.message}`);
        return Result.err(providerResult.error ?? new Error("LLM Provider not found"));
      }
      const provider = providerResult.value;

      if (!provider) {
        this.logger.error("LLM Provider instance is undefined");
        return Result.err(new Error("LLM Provider instance is undefined"));
      }

      const completionResult = await provider.getCompletion(
        "System: Analyze the following project files.",
        prompt
      );

      if (completionResult.isErr()) {
        // Log the error message from the result
        this.logger.error(
          `LLM Provider returned an error: ${completionResult.error?.message ?? "Unknown error"}`
        );
        return Result.err(completionResult.error ?? new Error("Unknown error from LLM Provider"));
      }

      let analysis: any;
      try {
        analysis = JSON.parse(completionResult.value ?? "{}");
      } catch (jsonError) {
        // Log the JSON parsing error message
        this.logger.error(
          `Failed to parse LLM completion JSON: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`
        );
        return Result.err(new Error("Failed to parse LLM completion JSON"));
      }

      return Result.ok(analysis);
    } catch (error) {
      // Log the analysis error message
      this.logger.error(
        `LLMAgent analysis error: ${error instanceof Error ? error.message : String(error)}`
      );
      return Result.err(error instanceof Error ? error : new Error("LLMAgent analysis error"));
    }
  }

  /**
   * Reads file content safely, returning a Result.
   * Handles potential errors during file reading.
   * @param filePath Path to the file
   * @returns Result with file content as string on success, or an Error on failure.
   */
  private async readFileContent(filePath: string): Promise<Result<string, Error>> {
    const contentResult = await this.fileOps.readFile(filePath);
    if (contentResult.isErr()) {
      const errorToLog =
        contentResult.error ?? new Error(`Unknown file read error for ${filePath}`);
      this.logger.error(`Failed to read file: ${filePath}: ${errorToLog.message}`); // Log only message
      return Result.err(errorToLog);
    }
    // Although readFile should return string on success based on interface,
    // adding a defensive check for robustness.
    if (typeof contentResult.value !== "string") {
      const err = new Error(`File content is not a string or is undefined for: ${filePath}`);
      this.logger.error(err.message); // Log only message
      return Result.err(err);
    }
    return Result.ok(contentResult.value);
  }

  /**
   * Recursively collects all project files' content.
   * Reads directory entries and processes them.
   * @param dir Directory path to scan
   * @returns Promise resolving to an array of file contents as strings. Returns empty array on directory read error or invalid entries.
   */
  private async collectProjectFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entriesResult = await this.fileOps.readDir(dir); // Assuming IFileOperations now has readDir
    if (entriesResult.isErr()) {
      const errorToLog =
        entriesResult.error ?? new Error(`Unknown directory read error for ${dir}`);
      this.logger.error(`Failed to read directory: ${dir}: ${errorToLog.message}`); // Log only message
      return []; // Return empty array on directory read error
    }
    const entries = entriesResult.value;

    // Defensive check for entries being defined and an array before processing
    if (!Array.isArray(entries)) {
      this.logger.error(`Invalid directory entries received for: ${dir}`); // Log only message
      return []; // Return empty array if entries is not a valid array
    }

    // Process directory entries
    await this.processDirectoryEntries(dir, entries, files);

    return files;
  }

  /**
   * Processes directory entries, recursively collecting file contents.
   * Handles both directories and files by delegating to helper methods.
   * @param dir The current directory path.
   * @param entries The directory entries (Dirent objects).
   * @param files The array to accumulate file contents.
   */
  private async processDirectoryEntries(
    dir: string,
    entries: Dirent[],
    files: string[]
  ): Promise<void> {
    for (const entry of entries) {
      // Ensure entry.name is a string before processing
      if (typeof entry.name !== "string") {
        this.logger.error(`Invalid entry name type encountered in directory: ${dir}`); // Log only message
        continue;
      }
      const fullPath = path.join(dir, entry.name); // Type assertion for path.join

      if (entry.isDirectory()) {
        await this.handleDirectoryEntry(fullPath, files);
      } else if (entry.isFile()) {
        await this.handleFileEntry(fullPath, files);
      }
    }
  }

  /**
   * Handles a directory entry by recursively collecting files from the subdirectory.
   * @param dirPath The path to the subdirectory.
   * @param files The array to accumulate file contents.
   */
  private async handleDirectoryEntry(dirPath: string, files: string[]): Promise<void> {
    const subFiles = await this.collectProjectFiles(dirPath);
    files.push(...subFiles);
  }

  /**
   * Handles a file entry by reading its content and adding it to the files array if successful.
   * @param filePath The path to the file.
   * @param files The array to accumulate file contents.
   */
  private async handleFileEntry(filePath: string, files: string[]): Promise<void> {
    const contentResult = await this.readFileContent(filePath);
    if (contentResult.isOk()) {
      files.push(contentResult.value as string); // contentResult.value is guaranteed string by readFileContent
    }
    // Error handling for file reading is done within readFileContent, so we just skip if it's an error
  }

  /**
   * Builds a single prompt string from an array of file contents.
   * @param files Array of file contents.
   * @returns A concatenated string of file contents.
   */
  private buildPromptFromFiles(files: string[]): string {
    return files.join("\n\n");
  }
}
