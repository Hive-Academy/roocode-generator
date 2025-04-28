import path from 'path';
import { Result } from '../../core/result/result';
import { IFileOperations } from '../../core/file-operations/interfaces';
import { ILogger } from '../../core/services/logger-service';
import { Inject, Injectable } from '../../core/di/decorators';
import { IRulesFileManager } from './interfaces';

/**
 * @class RulesFileManager
 * @implements {IRulesFileManager}
 * @description Manages the saving of generated rules files to a specified path.
 */
@Injectable()
export class RulesFileManager implements IRulesFileManager {
  /**
   * Creates an instance of RulesFileManager.
   * @constructor
   * @param {IFileOperations} fileOps - Service for file system operations.
   * @param {ILogger} logger - Service for logging.
   */
  constructor(
    @Inject('IFileOperations') private readonly fileOps: IFileOperations,
    @Inject('ILogger') private readonly logger: ILogger
  ) {
    this.logger.debug('RulesFileManager initialized.');
  }

  /**
   * Saves the provided content to the specified file path.
   * Ensures the directory exists before writing the file.
   * @async
   * @param {string} filePath - The absolute path where the file should be saved.
   * @param {string} content - The string content to write to the file.
   * @returns {Promise<Result<string, Error>>} A Promise resolving to a Result containing the absolute path to the saved file or an Error.
   */
  async saveRules(filePath: string, content: string): Promise<Result<string, Error>> {
    this.logger.info(`Attempting to save rules to: ${filePath}`);
    try {
      // 1. Ensure the directory exists
      const dirPath = path.dirname(filePath);
      const ensureDirResult = await this.fileOps.createDirectory(dirPath);
      if (ensureDirResult.isErr()) {
        this.logger.error(`Failed to ensure directory ${dirPath} exists`, ensureDirResult.error);
        return Result.err(ensureDirResult.error as Error); // Propagate error (assert type)
      }
      this.logger.debug(`Ensured directory exists: ${dirPath}`);

      // 2. Write the file
      const writeResult = await this.fileOps.writeFile(filePath, content);
      if (writeResult.isErr()) {
        this.logger.error(`Failed to write rules file to ${filePath}`, writeResult.error);
        return Result.err(writeResult.error as Error); // Propagate error (assert type)
      }
      this.logger.debug(`Successfully wrote rules file to ${filePath}`);

      this.logger.info(`Successfully saved rules to ${filePath}`);
      return Result.ok(filePath); // Return the absolute path
    } catch (error) {
      // General catch block for unexpected errors during path manipulation or other sync operations
      const err = new Error(
        `Failed to save rules to ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
      this.logger.error(err.message, err);
      return Result.err(err);
    }
  }
}
