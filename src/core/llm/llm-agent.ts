import type { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { Dirent } from 'fs';
import path from 'path';
import { z } from 'zod';
import { Inject, Injectable } from '../di/decorators';
import { IFileOperations } from '../file-operations/interfaces';
import { Result } from '../result/result';
import { ILogger } from '../services/logger-service';
import { ILLMAgent, ILLMProvider, LLMCompletionConfig } from './interfaces';
import { LLMProviderError } from './llm-provider-errors';
import { LLMProviderRegistry } from './provider-registry';

@Injectable()
export class LLMAgent implements ILLMAgent {
  constructor(
    @Inject('LLMProviderRegistry') private readonly llmProviderRegistry: LLMProviderRegistry,
    @Inject('IFileOperations') private readonly fileOps: IFileOperations,
    @Inject('ILogger') private readonly logger: ILogger
  ) {}

  async analyzeProject(projectDir: string): Promise<Result<any, LLMProviderError>> {
    try {
      const files = await this.collectProjectFiles(projectDir);
      const prompt = this.buildPromptFromFiles(files);

      const providerResult = await this.getProvider();
      if (providerResult.isErr()) {
        this.logger.error(
          `LLM Provider not found for analyzeProject: ${providerResult.error!.message}`
        );
        return Result.err<LLMProviderError>(providerResult.error!);
      }

      // If isErr() is false, then isOk() is true, and value should be present.
      const provider = providerResult.value!; // Added ! for non-null assertion

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
          `LLM Provider returned an error during analyzeProject: ${completionResult.error!.message}`
        );
        return Result.err<LLMProviderError>(completionResult.error!);
      }

      let analysis: any;
      try {
        // If completionResult.isOk() is true, value is present.
        analysis = JSON.parse(completionResult.value! ?? '{}'); // Added !
      } catch (jsonError) {
        this.logger.error(
          `Failed to parse LLM completion JSON during analyzeProject: ${
            jsonError instanceof Error ? jsonError.message : String(jsonError)
          }`
        );
        return Result.err(
          new LLMProviderError(
            'Failed to parse LLM completion JSON for analyzeProject',
            'PARSING_ERROR',
            'LLMAgent'
          )
        );
      }

      return Result.ok(analysis);
    } catch (error) {
      this.logger.error(
        `LLMAgent analyzeProject error: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
      if (error instanceof LLMProviderError) return Result.err(error);
      return Result.err(LLMProviderError.fromError(error, 'LLMAgent'));
    }
  }

  private async readFileContent(filePath: string): Promise<Result<string, Error>> {
    const contentResult = await this.fileOps.readFile(filePath);
    if (contentResult.isErr()) {
      const errorToLog =
        contentResult.error ?? new Error(`Unknown file read error for ${filePath}`);
      this.logger.error(`Failed to read file: ${filePath}: ${errorToLog.message}`);
      return Result.err(errorToLog);
    }
    // If isErr() is false, value should be present.
    if (typeof contentResult.value !== 'string') {
      const err = new Error(`File content is not a string or is undefined for: ${filePath}`);
      this.logger.error(err.message);
      return Result.err(err);
    }
    return Result.ok(contentResult.value); // value is string here
  }

  private async collectProjectFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    const entriesResult = await this.fileOps.readDir(dir);
    if (entriesResult.isErr()) {
      const errorToLog =
        entriesResult.error ?? new Error(`Unknown directory read error for ${dir}`);
      this.logger.error(`Failed to read directory: ${dir}: ${errorToLog.message}`);
      return [];
    }
    const entries = entriesResult.value; // value is Dirent[] if not err

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
      files.push(contentResult.value!); // Added !
    }
  }

  private buildPromptFromFiles(files: string[]): string {
    return files.join('\n\n');
  }

  async getCompletion(
    systemPrompt: string,
    userPrompt: string
  ): Promise<Result<string, LLMProviderError>> {
    try {
      const providerResult = await this.getProvider();
      if (providerResult.isErr()) {
        this.logger.error(`Failed to get LLM provider: ${providerResult.error!.message}`);
        return Result.err<LLMProviderError>(providerResult.error!);
      }

      const provider = providerResult.value!; // Added !

      const completionResult = await provider.getCompletion(systemPrompt, userPrompt);
      if (completionResult.isErr()) {
        return Result.err<LLMProviderError>(completionResult.error!);
      }
      return completionResult;
    } catch (error) {
      this.logger.error(
        `Error getting completion: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
      if (error instanceof LLMProviderError) return Result.err(error);
      return Result.err(LLMProviderError.fromError(error, 'LLMAgent'));
    }
  }

  async getStructuredCompletion<T extends z.ZodTypeAny>(
    prompt: BaseLanguageModelInput,
    schema: T,
    completionConfig?: LLMCompletionConfig
  ): Promise<Result<z.infer<T>, LLMProviderError>> {
    try {
      const providerResult = await this.getProvider();
      if (providerResult.isErr()) {
        this.logger.error(
          `Failed to get LLM provider for structured completion: ${providerResult.error!.message}`
        );
        return Result.err<LLMProviderError>(providerResult.error!);
      }

      const provider = providerResult.value!; // Added !

      return await provider.getStructuredCompletion(prompt, schema, completionConfig);
    } catch (error) {
      this.logger.error(
        `Error getting structured completion: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
      if (error instanceof LLMProviderError) return Result.err(error);
      return Result.err(LLMProviderError.fromError(error, 'LLMAgent'));
    }
  }

  async getModelContextWindow(): Promise<number> {
    const providerResult = await this.getProvider();
    if (providerResult.isErr()) {
      this.logger.error(
        `Failed to get LLM provider for context window size: ${providerResult.error!.message}`
      );
      return 0;
    }
    return providerResult.value!.getContextWindowSize(); // Added !
  }

  async countTokens(text: string): Promise<number> {
    const providerResult = await this.getProvider();
    if (providerResult.isErr()) {
      this.logger.error(
        `Failed to get LLM provider for token counting: ${providerResult.error!.message}`
      );
      return 0;
    }
    return Promise.resolve(providerResult.value!.countTokens(text)); // Added !
  }

  async getProvider(): Promise<Result<ILLMProvider, LLMProviderError>> {
    const providerResult = this.llmProviderRegistry.getProvider();
    if (providerResult.isErr()) {
      return Result.err<LLMProviderError>(providerResult.error!);
    }
    return Promise.resolve(providerResult);
  }
}
