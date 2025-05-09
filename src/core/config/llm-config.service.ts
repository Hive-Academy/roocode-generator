import { LLMConfig } from '../../../types/shared';
import type { IModelListerService } from '../llm/interfaces';
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
    private readonly inquirer: ReturnType<typeof import('inquirer').createPromptModule>,
    @Inject('IModelListerService') private readonly modelListerService: IModelListerService
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
   * Performs interactive editing of the LLM configuration with validation and real-time feedback.
   * @param config LLMConfig to edit
   * @returns Result indicating success or failure
   */
  /**
   * Interactively edits the LLM configuration through a series of prompts
   * @param _config Optional existing config (unused, kept for backward compatibility)
   * @returns Result indicating success or failure
   */
  async interactiveEditConfig(_config?: LLMConfig): Promise<Result<void, Error>> {
    try {
      // Get provider and API key
      const providerName = await this.promptForProvider();
      const apiKey = await this.promptForApiKey(providerName);

      // Try to list models or fallback to manual input
      let modelName = '';
      const modelsResult = await this.modelListerService.listModelsForProvider(
        providerName,
        apiKey
      );

      if (modelsResult.isOk() && modelsResult.value && modelsResult.value.length > 0) {
        // If models were successfully retrieved, prompt user to select one
        const answer = await this.inquirer({
          type: 'list',
          name: 'model',
          message: 'Select model:',
          choices: modelsResult.value,
          pageSize: 10,
        });

        modelName = answer.model as string;
      } else {
        // If model listing failed, log a warning and fall back to manual input
        if (modelsResult.isErr() && modelsResult.error) {
          this.logger.warn(`Could not fetch available models: ${modelsResult.error.message}`);
        } else {
          this.logger.warn(`No models available for ${providerName}`);
        }
        modelName = await this.promptForModelName(providerName);
      }

      // Get advanced configuration
      const advancedConfig = await this.promptForAdvancedConfig();

      // Create and save final config
      const updatedConfig: LLMConfig = {
        provider: providerName,
        apiKey: apiKey,
        model: modelName,
        temperature: advancedConfig.temperature,
        maxTokens: advancedConfig.maxTokens,
      };

      const saveResult = await this.saveConfig(updatedConfig);
      if (saveResult.isErr()) {
        return Result.err(saveResult.error ?? new Error('Failed to save LLM configuration'));
      }

      this.logger.info(`LLM configuration saved successfully to ${this.configPath}`);
      this.logger.debug(
        `Configuration details: provider=${updatedConfig.provider}, model=${updatedConfig.model}`
      );
      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('LLM configuration failed', error as Error);
      return Result.err(
        new Error(`Interactive LLM configuration failed: ${(error as Error).message}`)
      );
    }
  }

  /**
   * Prompts for provider selection from available options
   * @returns Selected provider name
   */
  private async promptForProvider(): Promise<string> {
    const providerChoices = [
      { name: 'OpenAI - GPT-3.5/4', value: 'openai', short: 'OpenAI' },
      { name: 'Anthropic - Claude', value: 'anthropic', short: 'Anthropic' },
      { name: 'Google - Gemini', value: 'google-genai', short: 'Google' },
      { name: 'OpenRouter - Multi-provider access', value: 'openrouter', short: 'OpenRouter' },
      { name: 'Other provider', value: 'other', short: 'Other' },
    ];

    const answer = await this.inquirer({
      type: 'list',
      name: 'provider',
      message: 'Select your LLM provider:',
      choices: providerChoices,
      validate: (input: string) => !!input || 'Provider selection is required',
    });

    return answer.provider as string;
  }

  /**
   * Prompts for and validates API key
   * @param providerName Selected provider name
   * @returns Validated API key
   */
  private async promptForApiKey(providerName: string): Promise<string> {
    const answer = await this.inquirer({
      type: 'password',
      name: 'apiKey',
      message: `Enter API key for ${providerName}:\n  (Will be stored in llm.config.json)`,
      validate: (input: string) => {
        if (!input) return 'API key is required';
        // Updated regex to allow for a wider range of valid API key formats
        if (!/^[a-zA-Z0-9_\-.]+$/.test(input)) return 'Invalid API key format';
        return true;
      },
    });

    return answer.apiKey as string;
  }

  /**
   * Prompts for manual model name input
   * @param providerName Provider to get model for
   * @returns Entered model name
   */
  private async promptForModelName(providerName: string): Promise<string> {
    const answer = await this.inquirer({
      type: 'input',
      name: 'model',
      message: `Enter model name for ${providerName}:\n  (Check provider documentation for available models)`,
      validate: (input: string) => !!input || 'Model name is required',
    });

    return answer.model as string;
  }

  /**
   * Prompts for advanced configuration options
   * @returns Advanced configuration values
   */
  private async promptForAdvancedConfig(): Promise<{ temperature: number; maxTokens: number }> {
    const answer = await this.inquirer([
      {
        type: 'number',
        name: 'temperature',
        message:
          'Set temperature for response creativity (0-2):\n  0: focused/deterministic\n  1: balanced\n  2: more creative',
        default: 0.1,
        validate: (input: number) =>
          (input >= 0 && input <= 2) || 'Temperature must be between 0 and 2',
      },
      {
        type: 'number',
        name: 'maxTokens',
        message: 'Set maximum tokens per response (1000-8192):',
        default: 80000,
        validate: (input: number) =>
          (input >= 10000 && input <= 1000000) ||
          'Maximum tokens must be between 10000 and 1000000',
      },
    ]);

    // Note: maxTokens is configurable here, but actual token limits may vary by provider and model
    return {
      temperature: answer.temperature as number,
      maxTokens: answer.maxTokens as number,
    };
  }
}
