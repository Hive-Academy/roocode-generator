import { Dirent } from 'fs';
import { Injectable, Inject } from '@core/di/decorators';
import { Result } from '@core/result/result';
import { ILogger } from '@core/services/logger-service';
import { IFileOperations } from '@core/file-operations/interfaces';

@Injectable()
export class RooFileOpsHelper {
  constructor(
    @Inject('IFileOperations') private readonly fileOps: IFileOperations,
    @Inject('ILogger') private readonly logger: ILogger
  ) {}

  /**
   * Reads the content of the roo-rules.md file.
   * @param filePath The path to the roo-rules.md file.
   * @returns Result containing the file content as a string or an error.
   */
  public async readRooRulesFile(filePath: string): Promise<Result<string, Error>> {
    this.logger.debug(`Attempting to read roo-rules file: ${filePath}`);
    try {
      const fileReadResult = await this.fileOps.readFile(filePath);
      if (fileReadResult.isErr()) {
        this.logger.error(`Failed to read roo-rules file ${filePath}`, fileReadResult.error);
        return Result.err(fileReadResult.error ?? new Error(`Failed to read ${filePath}`));
      }
      const content = fileReadResult.value;
      if (!content) {
        return Result.err(new Error(`Content from ${filePath} is undefined or empty`));
      }
      this.logger.info(`Successfully read roo-rules file: ${filePath}`);
      return Result.ok(content);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Unknown error reading ${filePath}`;
      const errorInstance = error instanceof Error ? error : new Error(message);
      this.logger.error(`Exception in readRooRulesFile for ${filePath}: ${message}`, errorInstance);
      return Result.err(errorInstance);
    }
  }

  /**
   * Lists and filters mode-specific template files in a directory.
   * @param templateDir The directory to search for mode template files.
   * @returns Result containing filtered FileInfo array or error.
   */
  public async listAndFilterModeFiles(templateDir: string): Promise<Result<Dirent[], Error>> {
    try {
      this.logger.debug(`Listing and filtering mode files in directory: ${templateDir}`);
      const listResult = await this.fileOps.readDir(templateDir);
      if (listResult.isErr()) {
        this.logger.error(`Failed to list directory ${templateDir}`, listResult.error);
        return Result.err(listResult.error ?? new Error(`Failed to list directory ${templateDir}`));
      }

      const files = listResult.value;
      if (!files) {
        return Result.err(new Error(`Directory listing returned undefined for ${templateDir}`));
      }

      const modeFiles = files.filter(
        (file) =>
          file.name.startsWith('system-prompt-') &&
          file.name.endsWith('.md') &&
          file.name !== 'roo-rules.md'
      );

      this.logger.info(`Found ${modeFiles.length} mode template files in ${templateDir}.`);
      return Result.ok(modeFiles);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : `Unknown error listing directory ${templateDir}`;
      const errorInstance = error instanceof Error ? error : new Error(message);
      this.logger.error(
        `Exception in listAndFilterModeFiles for ${templateDir}: ${message}`,
        errorInstance
      );
      return Result.err(errorInstance);
    }
  }

  /**
   * Reads the content of a mode-specific system prompt file.
   * @param filePath The path to the mode template file.
   * @returns Result containing the file content as a string or an error.
   */
  public async readModeTemplateFile(filePath: string): Promise<Result<string, Error>> {
    try {
      this.logger.debug(`Attempting to read mode template file: ${filePath}`);
      const fileReadResult = await this.fileOps.readFile(filePath);
      if (fileReadResult.isErr()) {
        this.logger.error(`Failed to read mode template file ${filePath}`, fileReadResult.error);
        return Result.err(fileReadResult.error ?? new Error(`Failed to read ${filePath}`));
      }
      const content = fileReadResult.value;
      if (!content) {
        return Result.err(new Error(`Content from ${filePath} is undefined or empty`));
      }
      this.logger.info(`Successfully read mode template file: ${filePath}`);
      return Result.ok(content);
    } catch (error) {
      const message = error instanceof Error ? error.message : `Unknown error reading ${filePath}`;
      const errorInstance = error instanceof Error ? error : new Error(message);
      this.logger.error(
        `Exception in readModeTemplateFile for ${filePath}: ${message}`,
        errorInstance
      );
      return Result.err(errorInstance);
    }
  }
}
