import type { DistinctQuestion } from 'inquirer';
import { LLMConfig } from '../../../types/shared';
import { Inject, Injectable } from '../di/decorators';
import { IFileOperations } from '../file-operations/interfaces';
import { Result } from '../result/result';
import { ILogger } from '../services/logger-service';
import { ILLMConfigService } from './interfaces';
/**
 * Service for managing LLM configuration.
 * Handles loading, saving, and interactive editing of LLM config from llm.config.json.
 */
@Injectable()
export class LLMConfigService implements ILLMConfigService {
  private readonly configPath = `${process.cwd()}/llm.config.json`;

  constructor(
    @Inject('IFileOperations') private readonly fileOps: IFileOperations,
    @Inject('ILogger') private readonly logger: ILogger,
    @Inject('Inquirer')
    private readonly inquirer: ReturnType<typeof import('inquirer').createPromptModule>
  ) {}

  /**
   * Loads the LLM configuration from file.
   * @returns Result wrapping LLMConfig or error
   */
  async loadConfig(): Promise<Result<LLMConfig, Error>> {
    try {
      const readResult = await this.fileOps.readFile(this.configPath);
      if (readResult.isErr()) {
        return Result.err(readResult.error!);
      }
      const rawContent = readResult.value!;
      const parsed = JSON.parse(rawContent) as LLMConfig;

      const validationError = this.validateConfig(parsed);
      if (validationError) {
        return Result.err(new Error(`Invalid LLM config: ${validationError}`));
      }

      return Result.ok(parsed);
    } catch (error) {
      this.logger.error(
        'Failed to load LLM config',
        error instanceof Error ? error : new Error(String(error))
      );
      return Result.err(error instanceof Error ? error : new Error('Failed to load LLM config'));
    }
  }

  /**
   * Validates the LLMConfig object.
   * @param config The config to validate
   * @returns string error message if invalid, or null if valid
   */
  public validateConfig(config: LLMConfig): string | null {
    if (!config.provider || typeof config.provider !== 'string' || config.provider.trim() === '') {
      return "Missing or invalid 'provider'";
    }
    if (!config.apiKey || typeof config.apiKey !== 'string' || config.apiKey.trim() === '') {
      return "Missing or invalid 'apiKey'";
    }
    if (!config.model || typeof config.model !== 'string' || config.model.trim() === '') {
      return "Missing or invalid 'model'";
    }
    return null;
  }

  /**
   * Saves the LLM configuration to file.
   * @param config LLMConfig to save
   * @returns Result indicating success or failure
   */
  async saveConfig(config: LLMConfig): Promise<Result<void, Error>> {
    try {
      const content = JSON.stringify(config, null, 2);
      const writeResult = await this.fileOps.writeFile(this.configPath, content);
      if (writeResult.isErr()) {
        return Result.err(writeResult.error!);
      }
      return Result.ok(undefined);
    } catch (error) {
      this.logger.error(
        'Failed to save LLM config',
        error instanceof Error ? error : new Error(String(error))
      );
      return Result.err(error instanceof Error ? error : new Error('Failed to save LLM config'));
    }
  }

  /**
   * Performs interactive editing of the LLM configuration.
   * @param config LLMConfig to edit
   * @returns Result indicating success or failure
   */
  async interactiveEditConfig(config: LLMConfig): Promise<Result<void, Error>> {
    try {
      // Clone config to avoid mutating original before save
      const editableConfig = { ...config };

      // Define questions for interactive editing
      const questions: DistinctQuestion[] = [
        {
          type: 'input',
          name: 'provider',
          message: 'Enter the LLM provider name (e.g., openai, anthropic, google):',
          default: editableConfig.provider || 'openai', // Provide a common default
          validate: (input: string) =>
            input.trim().length > 0 || 'Provider name is required and cannot be empty.',
        },
        {
          type: 'password',
          name: 'apiKey',
          message: 'Enter the API key for the selected provider:',
          default: editableConfig.apiKey,
          mask: '*',
          validate: (input: string) =>
            input.trim().length > 0 || 'API Key is required and cannot be empty.',
        },
        {
          type: 'input',
          name: 'model',
          message: 'Enter the specific model name to use (e.g., gpt-4, claude-3-opus, gemini-pro):',
          default: editableConfig.model || 'gpt-4', // Provide a common default
          validate: (input: string) =>
            input.trim().length > 0 || 'Model name is required and cannot be empty.',
        },
        // Optional: Add prompts for maxTokens and temperature if needed in interactive mode
        // {
        //   type: 'number',
        //   name: 'maxTokens',
        //   message: 'Enter the maximum number of tokens for responses (e.g., 2048):',
        //   default: editableConfig.maxTokens ?? 2048,
        //   validate: (input: number) => !isNaN(input) && input > 0 || 'Max tokens must be a positive number.',
        // },
        // {
        //   type: 'number',
        //   name: 'temperature',
        //   message: 'Enter the creativity level (0.0 to 1.0, e.g., 0.7):',
        //   default: editableConfig.temperature ?? 0.7,
        //   validate: (input: number) => !isNaN(input) && input >= 0 && input <= 1 || 'Temperature must be between 0.0 and 1.0.',
        // },
      ];

      // Prompt user for input
      const answers = await this.inquirer(questions);

      // Update editableConfig with answers
      editableConfig.provider = answers.provider;
      editableConfig.apiKey = answers.apiKey;
      editableConfig.model = answers.model;

      // Save updated config
      const saveResult = await this.saveConfig(editableConfig);
      if (saveResult.isErr()) {
        return Result.err(saveResult.error!);
      }

      return Result.ok(undefined);
    } catch (error) {
      this.logger.error(
        'Failed interactive edit of LLM config',
        error instanceof Error ? error : new Error(String(error))
      );
      return Result.err(
        error instanceof Error ? error : new Error('Failed interactive edit of LLM config')
      );
    }
  }
}
