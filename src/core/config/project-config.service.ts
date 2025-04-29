import type { ProjectConfig } from '../../../types/shared';
import { Inject, Injectable } from '@core/di/decorators';
import { IFileOperations } from '@core/file-operations/interfaces';
import { Result } from '@core/result/result';
import { ILogger } from '@core/services/logger-service'; // Added import

/**
 * Service for managing project configuration.
 * Always returns an in-memory default configuration.
 * File system operations for loading have been removed.
 */
@Injectable()
export class ProjectConfigService {
  // Injected LoggerService
  constructor(
    @Inject('IFileOperations') private readonly fileOps: IFileOperations,
    @Inject('ILogger') private readonly logger: ILogger // Added logger dependency
  ) {}

  // Default configuration object stored in memory
  private readonly defaultConfig: ProjectConfig = {
    name: 'default-project',
    baseDir: '.',
    rootDir: '.roo',
    generators: [],
    description: 'Default project configuration.',
  };

  /**
   * Loads the project configuration. Always returns the in-memory default config.
   * @returns Result wrapping the default ProjectConfig or an error (though errors are unlikely now).
   */
  loadConfig(): Result<ProjectConfig, Error> {
    // Removed async and updated return type
    try {
      // Log that the default config is being used
      this.logger.info('Using in-memory default roocode-config.json configuration.');
      // Always return the default configuration object
      return Result.ok(this.defaultConfig);
    } catch (error) {
      // Basic error handling in case something unexpected happens
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Unexpected error loading default config: ${errorMessage}`);
      return Result.err(
        error instanceof Error ? error : new Error('Failed to load default config')
      );
    }
  }

  /**
   * Validates the ProjectConfig object.
   * @param config The config to validate
   * @returns string error message if invalid, or null if valid
   */
  public validateConfig(config: ProjectConfig): string | null {
    if (!config.name || typeof config.name !== 'string' || config.name.trim() === '') {
      return "Missing or invalid 'name'";
    }
    if (!config.baseDir || typeof config.baseDir !== 'string' || config.baseDir.trim() === '') {
      return "Missing or invalid 'baseDir'";
    }
    if (!config.rootDir || typeof config.rootDir !== 'string' || config.rootDir.trim() === '') {
      return "Missing or invalid 'rootDir'";
    }
    if (!Array.isArray(config.generators)) {
      return "Missing or invalid 'generators'";
    }
    return null;
  }

  /**
   * Saves the project configuration to file.
   * @param config ProjectConfig to save
   * @returns Result indicating success or failure
   */
  async saveConfig(config: ProjectConfig): Promise<Result<void, Error>> {
    try {
      // Validate config before saving
      const validationError = this.validateConfig(config);
      if (validationError) {
        return Result.err(new Error(`Cannot save invalid config: ${validationError}`));
      }

      const configPath = `${process.cwd()}/roocode-config.json`;
      const content = JSON.stringify(config, null, 2);
      const writeResult = await this.fileOps.writeFile(configPath, content);

      if (writeResult.isErr()) {
        return Result.err(writeResult.error!);
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error('Failed to save config'));
    }
  }
}
