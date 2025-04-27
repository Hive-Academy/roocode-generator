import type { ProjectConfig } from '../../../types/shared';
import { Inject, Injectable } from '../di/decorators';
import { IFileOperations } from '../file-operations/interfaces';
import { Result } from '../result/result';

/**
 * Service for managing project configuration.
 * Handles loading and saving project config from/to roocode-config.json.
 * Interactive editing is removed as it is now handled by LLMConfigService.
 */
@Injectable()
export class ProjectConfigService {
  constructor(@Inject('IFileOperations') private readonly fileOps: IFileOperations) {}

  /**
   * Loads the project configuration from file.
   * @returns Result wrapping ProjectConfig or error
   */
  async loadConfig(): Promise<Result<ProjectConfig, Error>> {
    const defaultConfig: ProjectConfig = {
      name: 'default-project', // Provide a default name
      baseDir: '.',
      rootDir: '.roo',
      generators: [], // Default to no generators
      description: 'Default project configuration.',
    };

    try {
      const configPath = `${process.cwd()}/roocode-config.json`;
      const readResult = await this.fileOps.readFile(configPath);

      // If file doesn't exist or can't be read, return default config
      if (readResult.isErr()) {
        return Result.ok(defaultConfig);
      }

      // File read successfully, proceed with parsing
      try {
        const parsedConfig = JSON.parse(readResult.value!) as ProjectConfig;

        // Validate parsed config
        const validationError = this.validateConfig(parsedConfig);
        if (validationError) {
          return Result.err(new Error(`Invalid config: ${validationError}`));
        }

        return Result.ok(parsedConfig);
      } catch (parseError) {
        return Result.err(
          new Error(
            `Failed to parse config: ${parseError instanceof Error ? parseError.message : String(parseError)}`
          )
        );
      }
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error('Failed to load config'));
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
