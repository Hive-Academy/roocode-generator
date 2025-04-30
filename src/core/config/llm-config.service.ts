/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { LLMConfig } from '../../../types/shared';
import type { ILLMProviderRegistry } from '../llm/interfaces';
import { Inject, Injectable } from '../di/decorators';
import { IFileOperations } from '../file-operations/interfaces';
import { Result } from '../result/result';
import { ILogger } from '../services/logger-service';
import { ILLMConfigService } from './interfaces'; // Added ILLMProviderRegistry import, assuming it's in interfaces.ts
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
    @Inject('ILLMProviderRegistry') private readonly providerRegistry: ILLMProviderRegistry
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
  async interactiveEditConfig(_config: LLMConfig): Promise<Result<void, Error>> {
    try {
      // Initial provider selection
      const providerAnswer = await this.inquirer({
        type: 'list',
        name: 'provider',
        message: 'Select your LLM provider:',
        choices: [
          { name: 'OpenAI - GPT-3.5/4', value: 'openai', short: 'OpenAI' },
          { name: 'Anthropic - Claude', value: 'anthropic', short: 'Anthropic' },
          { name: 'Google - Gemini', value: 'google-genai', short: 'Google' },
          { name: 'OpenRouter - Multi-provider access', value: 'openrouter', short: 'OpenRouter' },
          { name: 'Other provider', value: 'other', short: 'Other' },
        ],
        validate: (input: string) => !!input || 'Provider selection is required',
      });

      // API key input with validation
      const apiKeyAnswer = await this.inquirer({
        type: 'password',
        name: 'apiKey',
        message: `Enter API key for ${providerAnswer.provider}:\n  (Will be stored in llm.config.json)`,
        validate: (input: string) => {
          if (!input) return 'API key is required';
          if (!/^[a-zA-Z0-9_.-]+$/.test(input)) return 'Invalid API key format';
          return true;
        },
      });

      // Try to list models if provider supports it
      let modelName = '';
      try {
        // Get default provider from registry
        const providerResult = await this.providerRegistry.getProvider();
        if (providerResult.isOk() && providerResult.value) {
          const provider = providerResult.value;
          // Only show models if provider matches selection and supports listing
          if (
            provider.name === providerAnswer.provider &&
            typeof provider.listModels === 'function'
          ) {
            const modelsResult = await provider.listModels();
            if (modelsResult.isOk() && modelsResult.value && modelsResult.value.length > 0) {
              const modelAnswer = await this.inquirer({
                type: 'list',
                name: 'model',
                message: 'Select model:',
                choices: modelsResult.value,
                pageSize: 10,
              });
              modelName = modelAnswer.model;
            }
          }
        }
      } catch (error) {
        this.logger.warn(
          `Could not fetch models list: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Fallback to manual model input if no models were listed
      if (!modelName) {
        const modelAnswer = await this.inquirer({
          type: 'input',
          name: 'model',
          message: `Enter model name for ${providerAnswer.provider}:\n  (Check provider documentation for available models)`,
          validate: (input: string) => !!input || 'Model name is required',
        });
        modelName = modelAnswer.model;
      }

      // Temperature configuration
      const tempAnswer = await this.inquirer({
        type: 'number',
        name: 'temperature',
        message:
          'Set temperature for response creativity (0-2):\n  0: focused/deterministic\n  1: balanced\n  2: more creative',
        default: 0.1,
        validate: (input: number) =>
          (input >= 0 && input <= 2) || 'Temperature must be between 0 and 2',
      });

      // Create and save final config
      const updatedConfig: LLMConfig = {
        provider: providerAnswer.provider,
        apiKey: apiKeyAnswer.apiKey,
        model: modelName,
        temperature: tempAnswer.temperature,
        maxTokens: 2048,
      };

      const saveResult = await this.saveConfig(updatedConfig);
      if (saveResult.isErr()) {
        return Result.err(saveResult.error ?? new Error('Failed to save config'));
      }

      this.logger.info(`LLM configuration saved successfully to ${this.configPath}`);
      this.logger.debug(
        `Configuration details: provider=${updatedConfig.provider}, model=${updatedConfig.model}`
      );
      return Result.ok(undefined);
    } catch (error) {
      this.logger.error('Configuration failed', error as Error);
      return Result.err(new Error('Interactive configuration failed'));
    }
  }
}
