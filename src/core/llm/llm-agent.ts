import path from 'path';
import { Injectable, Inject } from '../di/decorators';
import { ILLMAgent } from './interfaces';
import { Result } from '../result/result';
import { IFileOperations } from '../file-operations/interfaces';
import { ILogger } from '../services/logger-service';
import { Dirent } from 'fs';
import { LLMProviderRegistry } from './provider-registry';
import { ILLMProvider } from './interfaces';

@Injectable()
export class LLMAgent implements ILLMAgent {
  constructor(
    @Inject('LLMProviderRegistry') private readonly llmProviderRegistry: LLMProviderRegistry,
    @Inject('IFileOperations') private readonly fileOps: IFileOperations,
    @Inject('ILogger') private readonly logger: ILogger
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

      const providerResult = await this.llmProviderRegistry.getProvider();
      if (providerResult.isErr()) {
        this.logger.error(`LLM Provider not found: ${providerResult.error?.message}`);
        return Result.err(providerResult.error ?? new Error('LLM Provider not found'));
      }

      const provider = providerResult.value;
      if (!provider) {
        this.logger.error('LLM Provider instance is undefined');
        return Result.err(new Error('LLM Provider instance is undefined'));
      }

      const completionResult = await provider.getCompletion(
        'System: Analyze the following project files.',
        prompt
      );
      if (completionResult.isOk()) {
        this.logger.debug(
          `Temporary Logging: Raw LLM response token count: ${
            completionResult.value!.split(/\s+/).length
          }, Response: ${completionResult.value}`
        );
      }

      if (completionResult.isErr()) {
        this.logger.error(
          `LLM Provider returned an error: ${completionResult.error?.message ?? 'Unknown error'}`
        );
        return Result.err(completionResult.error ?? new Error('Unknown error from LLM Provider'));
      }

      let analysis: any;
      try {
        analysis = JSON.parse(completionResult.value ?? '{}');
      } catch (jsonError) {
        this.logger.error(
          `Failed to parse LLM completion JSON: ${
            jsonError instanceof Error ? jsonError.message : String(jsonError)
          }`
        );
        return Result.err(new Error('Failed to parse LLM completion JSON'));
      }

      return Result.ok(analysis);
    } catch (error) {
      this.logger.error(
        `LLMAgent analysis error: ${error instanceof Error ? error.message : String(error)}`
      );
      return Result.err(error instanceof Error ? error : new Error('LLMAgent analysis error'));
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
      this.logger.error(`Failed to read file: ${filePath}: ${errorToLog.message}`);
      return Result.err(errorToLog);
    }
    if (typeof contentResult.value !== 'string') {
      const err = new Error(`File content is not a string or is undefined for: ${filePath}`);
      this.logger.error(err.message);
      return Result.err(err);
    }
    return Result.ok(contentResult.value);
  }

  /**
   * Recursively collects all project files' content.
   * Reads directory entries and processes them.
   * @param dir Directory path to scan
   * @returns Promise resolving to an array of file contents as strings.
   */
  private async collectProjectFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entriesResult = await this.fileOps.readDir(dir);
    if (entriesResult.isErr()) {
      const errorToLog =
        entriesResult.error ?? new Error(`Unknown directory read error for ${dir}`);
      this.logger.error(`Failed to read directory: ${dir}: ${errorToLog.message}`);
      return [];
    }
    const entries = entriesResult.value;

    if (!Array.isArray(entries)) {
      this.logger.error(`Invalid directory entries received for: ${dir}`);
      return [];
    }

    await this.processDirectoryEntries(dir, entries, files);
    return files;
  }

  private async processDirectoryEntries(
    dir: string,
    entries: Dirent[],
    files: string[]
  ): Promise<void> {
    for (const entry of entries) {
      if (typeof entry.name !== 'string') {
        this.logger.error(`Invalid entry name type encountered in directory: ${dir}`);
        continue;
      }
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await this.handleDirectoryEntry(fullPath, files);
      } else if (entry.isFile()) {
        await this.handleFileEntry(fullPath, files);
      }
    }
  }

  private async handleDirectoryEntry(dirPath: string, files: string[]): Promise<void> {
    const subFiles = await this.collectProjectFiles(dirPath);
    files.push(...subFiles);
  }

  private async handleFileEntry(filePath: string, files: string[]): Promise<void> {
    const contentResult = await this.readFileContent(filePath);
    if (contentResult.isOk()) {
      files.push(contentResult.value as string);
    }
  }

  private buildPromptFromFiles(files: string[]): string {
    return files.join('\n\n');
  }

  /**
   * Gets a completion from the configured LLM provider.
   * @param systemPrompt The system prompt to use
   * @param userPrompt The user prompt to use
   * @returns Result containing the completion string or an error
   */
  async getCompletion(systemPrompt: string, userPrompt: string): Promise<Result<string, Error>> {
    try {
      const providerResult = await this.llmProviderRegistry.getProvider();
      if (providerResult.isErr()) {
        this.logger.error(`Failed to get LLM provider: ${providerResult.error?.message}`);
        return Result.err(providerResult.error ?? new Error('Failed to get LLM provider'));
      }

      const provider = providerResult.value;
      if (!provider) {
        return Result.err(new Error('LLM provider is undefined'));
      }

      return await provider.getCompletion(systemPrompt, userPrompt);
    } catch (error) {
      this.logger.error(
        `Error getting completion: ${error instanceof Error ? error.message : String(error)}`
      );
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Returns the model's context window size.
   * @returns A Promise resolving to the context window size as a number.
   */
  async getModelContextWindow(): Promise<number> {
    const providerResult = await this.llmProviderRegistry.getProvider();
    if (providerResult.isErr() || !providerResult.value) {
      this.logger.error('Failed to get LLM provider for context window size.');
      return 0; // Default to 0 if provider is unavailable
    }
    return providerResult.value.getContextWindowSize();
  }

  /**
   * Counts the number of tokens in the given text.
   * @param text The text to count tokens for
   * @returns A Promise resolving to the number of tokens in the text
   */
  async countTokens(text: string): Promise<number> {
    const providerResult = await this.llmProviderRegistry.getProvider();
    if (providerResult.isErr() || !providerResult.value) {
      this.logger.error('Failed to get LLM provider for token counting.');
      return 0; // Default to 0 if provider is unavailable
    }
    return providerResult.value.countTokens(text);
  }

  /**
   * Returns the underlying LLM provider instance.
   * @returns A Promise resolving to the LLM provider instance
   */
  async getProvider(): Promise<Result<ILLMProvider, Error>> {
    return await this.llmProviderRegistry.getProvider();
  }
}
