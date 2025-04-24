import path from 'path';
import { format } from 'date-fns'; // For timestamp generation
import { Result } from '../../core/result/result';
import { IFileOperations } from '../../core/file-operations/interfaces';
import { ILogger } from '../../core/services/logger-service'; // Corrected import path
import { Inject, Injectable } from '../../core/di/decorators'; // Corrected import path for custom DI
import {
  GeneratedRules,
  IRulesFileManager,
  RulesFileStructure,
  RuleVersion,
  // RulesMetadata, // Removed as it's part of RuleVersion/GeneratedRules
} from './interfaces';

// Define a type for the version history file content
type VersionHistory = {
  [mode: string]: RuleVersion[];
};

/**
 * @class RulesFileManager
 * @implements {IRulesFileManager}
 * @description Manages the storage, retrieval, versioning, and backup of generated rules files.
 * Adheres to the file structure defined in TechnicalArchitecture.md:150-165.
 * Uses a JSON file (`.roo/rules-versions.json`) to track versions.
 * Saves rules content as JSON files within mode-specific directories (`.roo/rules/[mode]/[version].json`).
 * Creates backups in `.roo/rules-backup/[mode]/[timestamp]_[version].json`.
 */
@Injectable() // Use custom DI decorator
export class RulesFileManager implements IRulesFileManager {
  /** @private @readonly The defined structure for rules files and directories. */
  private readonly fileStructure: RulesFileStructure;
  /** @private @readonly Absolute path to the base directory (e.g., /path/to/project/.roo). */
  private readonly baseDirPath: string;
  /** @private @readonly Absolute path to the directory containing mode-specific rules (e.g., /path/to/project/.roo/rules). */
  private readonly modesDirPath: string;
  /** @private @readonly Absolute path to the directory for rule backups (e.g., /path/to/project/.roo/rules-backup). */
  private readonly backupDirPath: string;
  /** @private @readonly Absolute path to the version history JSON file (e.g., /path/to/project/.roo/rules-versions.json). */
  private readonly versionFilePath: string;

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
    this.fileStructure = {
      baseDir: '.roo',
      modesDir: 'rules',
      backupDir: 'rules-backup',
      versionFile: 'rules-versions.json',
    };

    this.baseDirPath = path.resolve(this.fileStructure.baseDir);
    this.modesDirPath = path.join(this.baseDirPath, this.fileStructure.modesDir);
    this.backupDirPath = path.join(this.baseDirPath, this.fileStructure.backupDir);
    this.versionFilePath = path.join(this.baseDirPath, this.fileStructure.versionFile);

    this.logger.debug(`RulesFileManager initialized. Base path: ${this.baseDirPath}`);
  }

  /**
   * Ensures the base directories for rules and backups exist.
   * @private
   * @async
   * @returns {Promise<Result<void, Error>>} A Result indicating success or an error.
   */
  private async ensureBaseDirectories(): Promise<Result<void, Error>> {
    try {
      let result = await this.fileOps.createDirectory(this.modesDirPath);
      if (result.isErr()) return result;
      result = await this.fileOps.createDirectory(this.backupDirPath);
      if (result.isErr()) return result;

      this.logger.debug(
        `Ensured base directories exist: ${this.modesDirPath}, ${this.backupDirPath}`
      );
      return Result.ok(undefined);
    } catch (error) {
      const err = new Error(
        `Failed to ensure base directories: ${error instanceof Error ? error.message : String(error)}`
      );
      // Use correct logger signature
      this.logger.error(err.message, err);
      return Result.err(err);
    }
  }

  /**
   * Ensures the mode-specific subdirectory exists within modesDir or backupDir.
   * @private
   * @async
   * @param {string} mode - The mode (e.g., 'architect', 'code').
   * @param {'rules' | 'backup'} type - The type of directory to ensure ('rules' or 'backup').
   * @returns {Promise<Result<void, Error>>} A Result indicating success or an error.
   */
  private async ensureModeDirectory(
    mode: string,
    type: 'rules' | 'backup'
  ): Promise<Result<void, Error>> {
    const dirPath =
      type === 'rules' ? path.join(this.modesDirPath, mode) : path.join(this.backupDirPath, mode);
    try {
      const result = await this.fileOps.createDirectory(dirPath);
      if (result.isErr()) return result;
      this.logger.debug(`Ensured directory exists: ${dirPath}`);
      return Result.ok(undefined);
    } catch (error) {
      const err = new Error(
        `Failed to ensure directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`
      );
      this.logger.error(err.message, err);
      return Result.err(err);
    }
  }

  /**
   * Generates a unique version identifier based on the current timestamp.
   * Format: YYYYMMDDHHmmss
   * @private
   * @returns {string} The generated version string.
   */
  private generateVersionId(): string {
    return format(new Date(), 'yyyyMMddHHmmss');
  }

  /**
   * Reads the version history JSON file (`.roo/rules-versions.json`).
   * Returns an empty history object if the file doesn't exist or is empty/invalid.
   * @private
   * @async
   * @returns {Promise<Result<VersionHistory, Error>>} A Result containing the parsed VersionHistory or an error.
   */
  private async readVersionHistory(): Promise<Result<VersionHistory, Error>> {
    try {
      const existsResult = await this.fileOps.exists(this.versionFilePath);
      if (existsResult.isErr()) {
        this.logger.error(
          `Error checking existence of version file ${this.versionFilePath}`,
          existsResult.error
        );
        return Result.err(existsResult.error as Error);
      }
      if (!existsResult.value) {
        this.logger.debug(
          `Version history file not found (${this.versionFilePath}), returning empty history.`
        );
        return Result.ok({}); // Return empty history
      }

      const readResult = await this.fileOps.readFile(this.versionFilePath);
      if (readResult.isErr()) {
        this.logger.error(`Error reading version file ${this.versionFilePath}`, readResult.error);
        return Result.err(readResult.error as Error);
      }

      const history: VersionHistory = JSON.parse(readResult.value as string);
      this.logger.debug(`Successfully read version history from ${this.versionFilePath}`);
      return Result.ok(history);
    } catch (error) {
      // Catch JSON parsing errors specifically
      const err = new Error(
        `Failed to read or parse version history file ${this.versionFilePath}: ${error instanceof Error ? error.message : String(error)}`
      );
      this.logger.error(err.message, err);
      return Result.err(err);
    }
  }

  /**
   * Writes the provided version history object to the JSON file (`.roo/rules-versions.json`).
   * Ensures the base directory exists before writing.
   * @private
   * @async
   * @param {VersionHistory} history - The version history object to write.
   * @returns {Promise<Result<void, Error>>} A Result indicating success or an error.
   */
  private async writeVersionHistory(history: VersionHistory): Promise<Result<void, Error>> {
    try {
      const ensureResult = await this.ensureBaseDirectories();
      if (ensureResult.isErr()) return ensureResult; // Propagate error

      const content = JSON.stringify(history, null, 2);
      const writeResult = await this.fileOps.writeFile(this.versionFilePath, content);
      if (writeResult.isErr()) {
        this.logger.error(
          `Failed to write version history file ${this.versionFilePath}`,
          writeResult.error
        );
        return writeResult; // Propagate error
      }

      this.logger.debug(`Successfully wrote version history to ${this.versionFilePath}`);
      return Result.ok(undefined);
    } catch (error) {
      // This catch block might be redundant if writeFile handles its errors, but keep for safety.
      const err = new Error(
        `Failed to write version history file ${this.versionFilePath}: ${error instanceof Error ? error.message : String(error)}`
      );
      this.logger.error(err.message, err);
      return Result.err(err);
    }
  }

  /**
   * Constructs the absolute path for a specific rules file version.
   * @private
   * @param {string} mode - The mode (e.g., 'architect').
   * @param {string} version - The version identifier (e.g., '20230101120000').
   * @returns {string} The absolute path to the rules file (e.g., '/path/to/project/.roo/rules/architect/20230101120000.json').
   */
  private getRulesFilePath(mode: string, version: string): string {
    const filename = `${version}.json`; // Assuming JSON format
    return path.join(this.modesDirPath, mode, filename);
  }

  /**
   * Constructs the absolute path for a backup file.
   * @private
   * @param {string} mode - The mode (e.g., 'architect').
   * @param {string} version - The original version identifier being backed up.
   * @param {string} timestamp - The timestamp for the backup operation.
   * @returns {string} The absolute path to the backup file (e.g., '/path/to/project/.roo/rules-backup/architect/20230101120500_20230101120000.json').
   */
  private getBackupFilePath(mode: string, version: string, timestamp: string): string {
    const safeTimestamp = String(timestamp); // Ensure timestamp is string for path joining
    const filename = `${safeTimestamp}_${version}.json`;
    return path.join(this.backupDirPath, mode, filename);
  }

  // --- IRulesFileManager Implementation ---

  /**
   * Saves the provided generated rules.
   * - Generates a new version ID.
   * - Writes the `GeneratedRules` object as JSON to `.roo/rules/[mode]/[version].json`.
   * - Updates the `.roo/rules-versions.json` file with the new version entry.
   * @async
   * @param {GeneratedRules} rules - The generated rules object to save.
   * @returns {Promise<Result<string, Error>>} A Result containing the absolute path to the saved file or an error.
   */
  async saveRules(rules: GeneratedRules): Promise<Result<string, Error>> {
    this.logger.info(`Attempting to save rules for mode: ${rules.mode}`);
    try {
      const ensureBaseResult = await this.ensureBaseDirectories();
      if (ensureBaseResult.isErr()) return Result.err(ensureBaseResult.error as Error); // Return specific error type

      // 2. Generate version ID and timestamp
      const version = this.generateVersionId();
      const timestamp = new Date().toISOString();
      const mode = rules.mode;
      const filePath = this.getRulesFilePath(mode, version);
      const relativePath = path.relative(this.baseDirPath, filePath);

      // 3. Ensure mode-specific directory exists
      const ensureModeResult = await this.ensureModeDirectory(mode, 'rules');
      if (ensureModeResult.isErr()) return Result.err(ensureModeResult.error as Error); // Return specific error type

      // 4. Prepare content to save
      const contentToSave = JSON.stringify(rules, null, 2);

      // 5. Write the rules file
      const writeResult = await this.fileOps.writeFile(filePath, contentToSave);
      if (writeResult.isErr()) {
        this.logger.error(`Failed to write rules file to ${filePath}`, writeResult.error);
        return Result.err(writeResult.error as Error); // Return specific error type
      }
      this.logger.debug(`Successfully wrote rules file to ${filePath}`);

      // 6. Update version history
      const historyResult = await this.readVersionHistory();
      if (historyResult.isErr()) return Result.err(historyResult.error as Error); // Return specific error type
      const history: VersionHistory = historyResult.value as VersionHistory;

      // Ensure mode array exists in history
      if (!history[mode]) {
        history[mode] = [];
      }

      const newVersionEntry: RuleVersion = {
        version: version,
        timestamp: timestamp,
        mode: mode,
        path: relativePath,
        metadata: rules.metadata,
      };
      history[mode].push(newVersionEntry);

      const writeHistoryResult = await this.writeVersionHistory(history);
      if (writeHistoryResult.isErr()) {
        // Log inconsistency but don't attempt cleanup for now
        this.logger.error(
          `Failed to update version history after saving ${filePath}. File saved, but history is inconsistent.`,
          writeHistoryResult.error
        );
        // Return the history writing error
        return Result.err(writeHistoryResult.error as Error); // Return specific error type
      }

      this.logger.info(
        `Successfully saved rules for mode ${mode} version ${version} to ${filePath}`
      );
      return Result.ok(filePath); // Return the absolute path
    } catch (error) {
      // General catch block for unexpected errors
      const err = new Error(
        `Failed to save rules for mode ${rules.mode}: ${error instanceof Error ? error.message : String(error)}`
      );
      this.logger.error(err.message, err);
      return Result.err(err);
    }
  }

  /**
   * Loads rules for a specific mode and optional version.
   * - Reads the version history.
   * - Identifies the correct version (latest if `version` is omitted).
   * - Reads the corresponding rules JSON file.
   * - Parses and returns the `GeneratedRules` object.
   * @async
   * @param {string} mode - The mode for which to load rules.
   * @param {string} [version] - The specific version ID to load. If omitted, loads the latest version.
   * @returns {Promise<Result<GeneratedRules, Error>>} A Result containing the loaded rules object or an error.
   */
  async loadRules(mode: string, version?: string): Promise<Result<GeneratedRules, Error>> {
    this.logger.info(
      `Attempting to load rules for mode: ${mode}${version ? `, version: ${version}` : ' (latest)'}`
    );
    try {
      const historyResult = await this.readVersionHistory();
      if (historyResult.isErr()) return Result.err(historyResult.error as Error); // Correct error propagation
      const history = historyResult.value;

      // Check if mode exists and has versions
      if (!history || !history[mode] || history[mode].length === 0) {
        const errMsg = `No rules found for mode: ${mode}`;
        this.logger.warn(errMsg);
        return Result.err(new Error(errMsg));
      }

      let versionInfo: RuleVersion | undefined;
      if (version) {
        versionInfo = history[mode].find((v) => v.version === version);
        if (!versionInfo) {
          const errMsg = `Version ${version} not found for mode: ${mode}`;
          this.logger.warn(errMsg);
          return Result.err(new Error(errMsg));
        }
      } else {
        // Get the latest version (last entry)
        versionInfo = history[mode][history[mode].length - 1];
      }

      // This check should be redundant due to earlier checks, but good practice
      if (!versionInfo) {
        const errMsg = `Could not determine version to load for mode: ${mode}`;
        this.logger.error(errMsg);
        return Result.err(new Error(errMsg));
      }

      const filePath = path.join(this.baseDirPath, versionInfo.path);
      this.logger.debug(`Loading rules from path: ${filePath}`);

      // Check existence using the correct method and handle Result
      const existsResult = await this.fileOps.exists(filePath);
      if (existsResult.isErr()) {
        this.logger.error(`Error checking existence of rules file ${filePath}`, existsResult.error);
        return Result.err(existsResult.error as Error);
      }
      if (!existsResult.value) {
        const errMsg = `Rules file not found at expected path: ${filePath}. History might be inconsistent.`;
        this.logger.error(errMsg);
        return Result.err(new Error(errMsg));
      }

      // Read file and handle Result
      const readResult = await this.fileOps.readFile(filePath);
      if (readResult.isErr()) {
        this.logger.error(`Error reading rules file ${filePath}`, readResult.error);
        return Result.err(readResult.error as Error);
      }

      // Validate JSON parsing
      let rules: GeneratedRules;
      try {
        rules = JSON.parse(readResult.value as string) as GeneratedRules;
      } catch (parseError) {
        const err = new Error(
          `Failed to parse rules file content from ${filePath}: ${parseError instanceof Error ? parseError.message : String(parseError)}`
        );
        this.logger.error(err.message, err);
        return Result.err(err);
      }

      // Optional: Add more validation via validateRulesFile if needed later
      // const validationResult = await this.validateRulesFile(filePath);
      // if (validationResult.isErr()) return Result.err(validationResult.error);

      this.logger.info(
        `Successfully loaded rules for mode ${mode}, version ${versionInfo.version}`
      );
      return Result.ok(rules);
    } catch (error) {
      // General catch block
      const err = new Error(
        `Failed to load rules for mode ${mode}${version ? ` (version ${version})` : ''}: ${error instanceof Error ? error.message : String(error)}`
      );
      this.logger.error(err.message, err);
      return Result.err(err);
    }
  }

  /**
   * Creates a backup of the latest rules file for a given mode.
   * - Finds the latest version from the history.
   * - Copies the corresponding rules file to the backup directory with a timestamp.
   *   (Workaround: Uses readFile/writeFile as copyFile is not available in IFileOperations).
   * @async
   * @param {string} mode - The mode for which to back up rules.
   * @returns {Promise<Result<void, Error>>} A Result indicating success or an error.
   */
  async backupRules(mode: string): Promise<Result<void, Error>> {
    this.logger.info(`Attempting to back up latest rules for mode: ${mode}`);
    try {
      const historyResult = await this.readVersionHistory();
      if (historyResult.isErr()) return Result.err(historyResult.error as Error); // Extract and return only the error
      const history = historyResult.value;

      if (!history || !history[mode] || history[mode].length === 0) {
        this.logger.warn(`No rules found for mode ${mode}, nothing to back up.`);
        return Result.ok(undefined);
      }

      const latestVersionInfo = history[mode][history[mode].length - 1];
      const sourceFilePath = path.join(this.baseDirPath, latestVersionInfo.path);

      // 2. Check if source file exists
      const existsResult = await this.fileOps.exists(sourceFilePath);
      if (existsResult.isErr()) {
        this.logger.error(
          `Error checking existence of source file ${sourceFilePath} for backup`,
          existsResult.error
        );
        return Result.err(existsResult.error as Error);
      }
      if (!existsResult.value) {
        const errMsg = `Latest rules file not found at ${sourceFilePath}. Cannot create backup.`;
        this.logger.error(errMsg);
        return Result.err(new Error(errMsg));
      }

      // 3. Determine backup path
      const backupTimestamp = format(new Date(), 'yyyyMMddHHmmssSSS');
      const backupFilePath = this.getBackupFilePath(
        mode,
        latestVersionInfo.version,
        backupTimestamp
      );

      // 4. Ensure backup directory exists
      const ensureDirResult = await this.ensureModeDirectory(mode, 'backup');
      if (ensureDirResult.isErr()) return ensureDirResult; // Propagate error

      // 5. Copy the file (Workaround: read source, write destination)
      this.logger.debug(
        `Performing backup by reading ${sourceFilePath} and writing to ${backupFilePath}`
      );
      const readResult = await this.fileOps.readFile(sourceFilePath);
      if (readResult.isErr()) {
        this.logger.error(
          `Failed to read source file ${sourceFilePath} during backup`,
          readResult.error
        );
        return Result.err(readResult.error as Error);
      }

      const writeResult = await this.fileOps.writeFile(backupFilePath, readResult.value as string);
      if (writeResult.isErr()) {
        this.logger.error(`Failed to write backup file ${backupFilePath}`, writeResult.error);
        return writeResult; // Propagate error
      }

      this.logger.info(
        `Successfully backed up rules for mode ${mode} (version ${latestVersionInfo.version}) to ${backupFilePath}`
      );
      return Result.ok(undefined);
    } catch (error) {
      // General catch block
      const err = new Error(
        `Failed to backup rules for mode ${mode}: ${error instanceof Error ? error.message : String(error)}`
      );
      this.logger.error(err.message, err);
      return Result.err(err);
    }
  }

  /**
   * Performs basic validation on a rules file.
   * - Checks if the file exists.
   * - Checks if the file content is valid JSON.
   * TODO: Implement more sophisticated validation (e.g., schema validation) if needed.
   * @async
   * @param {string} filePath - The absolute path to the rules file to validate.
   * @returns {Promise<Result<void, Error>>} A Result indicating success (void) or an error if validation fails.
   */
  async validateRulesFile(filePath: string): Promise<Result<void, Error>> {
    this.logger.debug(`Validating rules file: ${filePath}`);
    try {
      const existsResult = await this.fileOps.exists(filePath);
      if (existsResult.isErr()) {
        this.logger.error(
          `Validation failed: Error checking existence of ${filePath}`,
          existsResult.error
        );
        return Result.err(existsResult.error as Error);
      }
      if (!existsResult.value) {
        const errMsg = `Validation failed: File not found at ${filePath}`;
        this.logger.warn(errMsg);
        return Result.err(new Error(errMsg));
      }

      // Check if valid JSON
      const readResult = await this.fileOps.readFile(filePath);
      if (readResult.isErr()) {
        this.logger.error(`Validation failed: Error reading file ${filePath}`, readResult.error);
        return Result.err(readResult.error as Error);
      }
      try {
        JSON.parse(readResult.value as string);
      } catch (parseError) {
        const err = new Error(
          `Validation failed: Invalid JSON in file ${filePath}: ${parseError instanceof Error ? parseError.message : String(parseError)}`
        );
        this.logger.error(err.message, err);
        return Result.err(err);
      }

      // TODO: Implement more sophisticated validation (e.g., schema) if needed
      this.logger.debug(`Basic JSON validation passed for ${filePath}`);
      return Result.ok(undefined);
    } catch (error) {
      // General catch block
      const err = new Error(
        `Validation failed for file ${filePath}: ${error instanceof Error ? error.message : String(error)}`
      );
      this.logger.error(err.message, err);
      return Result.err(err);
    }
  }

  /**
   * Lists all available rule versions for a specific mode based on the version history.
   * @async
   * @param {string} mode - The mode for which to list versions.
   * @returns {Promise<Result<RuleVersion[], Error>>} A Result containing an array of RuleVersion objects or an error.
   */
  async listRuleVersions(mode: string): Promise<Result<RuleVersion[], Error>> {
    this.logger.debug(`Listing rule versions for mode: ${mode}`);
    try {
      const historyResult = await this.readVersionHistory();
      if (historyResult.isErr()) return Result.err(historyResult.error as Error); // Correct error propagation
      const history = historyResult.value;

      const versions = history && history[mode] ? history[mode] : [];
      this.logger.debug(`Found ${versions.length} versions for mode ${mode}`);
      return Result.ok(versions);
    } catch (error) {
      // General catch block
      const err = new Error(
        `Failed to list rule versions for mode ${mode}: ${error instanceof Error ? error.message : String(error)}`
      );
      this.logger.error(err.message, err);
      return Result.err(err);
    }
  }
}
