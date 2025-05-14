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

  async interactiveEditConfig(_config?: LLMConfig): Promise<Result<void, Error>> {
    try {
      const providerName = await this.promptForProvider();
      const apiKey = await this.promptForApiKey(providerName);

      let modelName = '';
      const modelsResult = await this.modelListerService.listModelsForProvider(
        providerName,
        apiKey
      );

      if (modelsResult.isOk() && modelsResult.value && modelsResult.value.length > 0) {
        const answer = await this.inquirer({
          type: 'list',
          name: 'model',
          message: 'Select model:',
          choices: modelsResult.value, // value is string[] here
          pageSize: 10,
        });
        modelName = answer.model as string;
      } else {
        if (modelsResult.isErr()) {
          this.logger.warn(`Could not fetch available models: ${modelsResult.error!.message}`); // Added !
        } else {
          this.logger.warn(`No models available for ${providerName}`);
        }
        modelName = await this.promptForModelName(providerName);
      }

      const advancedConfig = await this.promptForAdvancedConfig(providerName, modelName, apiKey);

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

  private async promptForApiKey(providerName: string): Promise<string> {
    const answer = await this.inquirer({
      type: 'password',
      name: 'apiKey',
      message: `Enter API key for ${providerName}:\n  (Will be stored in llm.config.json)`,
      validate: (input: string) => {
        if (!input) return 'API key is required';
        if (!/^[a-zA-Z0-9_\-.]+$/.test(input)) return 'Invalid API key format';
        return true;
      },
    });

    return answer.apiKey as string;
  }

  private async promptForModelName(providerName: string): Promise<string> {
    const answer = await this.inquirer({
      type: 'input',
      name: 'model',
      message: `Enter model name for ${providerName}:\n  (Check provider documentation for available models)`,
      validate: (input: string) => !!input || 'Model name is required',
    });

    return answer.model as string;
  }

  private async promptForAdvancedConfig(
    providerName: string,
    modelName: string,
    apiKey: string
  ): Promise<{ temperature: number; maxTokens: number }> {
    let suggestedMaxTokens = 4096;
    let contextWindow = 0;

    this.logger.trace(
      `Attempting to get context window size for model ${modelName} from provider ${providerName} via ModelListerService.`
    );
    const cwResult = await this.modelListerService.getContextWindowSize(
      providerName,
      apiKey,
      modelName
    );

    if (cwResult.isOk()) {
      // cwResult.value is number here
      if (cwResult.value! > 0) {
        // Added !
        contextWindow = cwResult.value!; // Added !
        suggestedMaxTokens = Math.floor(contextWindow * 0.25);
        this.logger.debug(
          `Successfully retrieved context window size ${contextWindow} for model ${modelName}. Suggested maxTokens: ${suggestedMaxTokens}.`
        );
      } else {
        this.logger.warn(
          `ModelListerService returned context window size 0 or less for model ${modelName}. Will prompt for maxTokens. Using default suggestion: ${suggestedMaxTokens}.`
        );
        contextWindow = 0;
      }
    } else {
      // cwResult.isErr()
      // cwResult.error is LLMProviderError here
      this.logger.warn(
        `Error getting context window size for model ${modelName} via ModelListerService: ${cwResult.error!.message}. Will prompt for maxTokens. Using default suggestion: ${suggestedMaxTokens}.` // Added !
      );
      contextWindow = 0;
    }

    const prompts: any[] = [
      {
        type: 'number',
        name: 'temperature',
        message:
          'Set temperature for response creativity (0-1):\n  0: focused/deterministic\n  0.5: balanced\n  1: more creative',
        default: 0.1,
        validate: (input: string | number) => {
          const num = parseFloat(String(input));
          if (isNaN(num)) {
            return 'Please enter a valid number.';
          }
          return (num >= 0 && num <= 1) || 'Temperature must be between 0 and 1';
        },
      },
    ];

    const promptForMaxTokens = contextWindow === 0;

    if (promptForMaxTokens) {
      prompts.push({
        type: 'number',
        name: 'maxTokens',
        message: `Set maximum tokens per response (e.g., ${suggestedMaxTokens}):`,
        default: suggestedMaxTokens,
        validate: (input: number) => input > 0 || 'Maximum tokens must be greater than 0',
      });
    } else {
      this.logger.info(
        `Automatically setting maxTokens to ${suggestedMaxTokens} (25% of context window ${contextWindow}) for model ${modelName}.`
      );
    }

    const answers = await this.inquirer(prompts);

    let finalMaxTokens: number;

    if (promptForMaxTokens) {
      finalMaxTokens = answers.maxTokens as number;
    } else {
      finalMaxTokens = suggestedMaxTokens;
    }

    return {
      temperature: answers.temperature as number,
      maxTokens: finalMaxTokens,
    };
  }
}
