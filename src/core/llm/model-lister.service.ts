import { Inject, Injectable } from '../di/decorators';
import { Result } from '../result/result';
import { IModelListerService, LLMProviderFactory, ILLMProvider } from './interfaces'; // Added ILLMProvider
import { ILogger } from '../services/logger-service';
import { LLMConfig } from '../../../types/shared';
import { LLMProviderError } from './llm-provider-errors';

/**
 * Service responsible for listing available models and providing other model-specific information
 * for a given LLM provider. This service breaks potential circular dependencies
 * by directly using provider factories to create temporary providers.
 */
@Injectable()
export class ModelListerService implements IModelListerService {
  constructor(
    @Inject('ILLMProviderFactories')
    private readonly providerFactories: Record<string, LLMProviderFactory>,
    @Inject('ILogger') private readonly logger: ILogger
  ) {}

  /**
   * Lists all available models for a given provider
   * @param providerName The name of the LLM provider
   * @param apiKey The API key to use for authentication
   * @returns A Result containing an array of model IDs or an Error
   */
  public async listModelsForProvider(
    providerName: string,
    apiKey: string
  ): Promise<Result<string[], LLMProviderError>> {
    try {
      const factory = this.providerFactories[providerName.toLowerCase()];
      if (!factory) {
        const message = `LLM provider '${providerName}' not found. Available providers: ${Object.keys(this.providerFactories).join(', ')}`;
        this.logger.warn(`Provider factory not found for ${providerName}: ${message}`);
        return Result.err(new LLMProviderError(message, 'FACTORY_NOT_FOUND', 'ModelListerService'));
      }

      const tempConfig: LLMConfig = {
        provider: providerName,
        apiKey: apiKey,
        model: 'temporary-for-listing', // Model name might not be strictly needed by all listModels impl.
        temperature: 0.1,
        maxTokens: 100,
      };

      const providerResult = factory(tempConfig);
      if (providerResult.isErr()) {
        this.logger.warn(
          `Failed to create provider instance for ${providerName} from factory for listing models.`
        );
        return Result.err(providerResult.error!);
      }
      const provider = providerResult.value!;

      if (typeof provider.listModels !== 'function') {
        const message = `Provider ${providerName} does not support listing models`;
        this.logger.warn(message);
        return Result.err(new LLMProviderError(message, 'NOT_IMPLEMENTED', providerName));
      }

      const modelsResult = await provider.listModels();
      if (modelsResult.isErr()) {
        this.logger.warn(
          `No models available or error listing models for ${providerName}: ${modelsResult.error!.message}`
        );
        return Result.err(modelsResult.error!);
      }

      if (!modelsResult.value || modelsResult.value.length === 0) {
        const message = `No models available for ${providerName} (empty list returned).`;
        this.logger.warn(message);
        return Result.err(new LLMProviderError(message, 'NO_MODELS_FOUND', providerName));
      }

      return Result.ok(modelsResult.value);
    } catch (error) {
      this.logger.warn(
        `Could not fetch available models: ${error instanceof Error ? error.message : String(error)}`
      );
      return Result.err(LLMProviderError.fromError(error, 'ModelListerService-ListModels'));
    }
  }

  /**
   * Gets the context window size for a specific model of a given provider.
   * @param providerName The name of the LLM provider
   * @param apiKey The API key for the provider.
   * @param modelName The specific model name.
   * @returns A Promise resolving to a Result containing the context window size (number) or an LLMProviderError.
   */
  public async getContextWindowSize(
    providerName: string,
    apiKey: string,
    modelName: string
  ): Promise<Result<number, LLMProviderError>> {
    try {
      const factory = this.providerFactories[providerName.toLowerCase()];
      if (!factory) {
        const message = `LLM provider factory for '${providerName}' not found. Cannot get context window size.`;
        this.logger.warn(message);
        return Result.err(
          new LLMProviderError(message, 'FACTORY_NOT_FOUND', 'ModelListerService-CtxWindow')
        );
      }

      // Create a temporary config, ensuring the specific modelName is used.
      const tempConfig: LLMConfig = {
        provider: providerName,
        apiKey: apiKey,
        model: modelName, // Crucial for getting context window of the correct model
        temperature: 0.1, // Default, not relevant for context window size
        maxTokens: 100, // Default, not relevant for context window size
      };

      this.logger.trace(
        `ModelListerService: Attempting to create temporary provider ${providerName} for model ${modelName} to get context window.`
      );
      const providerResult = factory(tempConfig);

      if (providerResult.isErr()) {
        this.logger.warn(
          `Failed to create temporary provider instance for ${providerName} (model: ${modelName}) to get context window: ${providerResult.error!.message}`
        );
        return Result.err(providerResult.error!);
      }
      const provider: ILLMProvider = providerResult.value!;

      if (typeof provider.getContextWindowSize !== 'function') {
        const message = `Provider ${providerName} (model: ${modelName}) does not implement getContextWindowSize.`;
        this.logger.warn(message);
        return Result.err(
          new LLMProviderError(
            message,
            'NOT_IMPLEMENTED',
            `ModelListerService-CtxWindow-${providerName}`
          )
        );
      }

      this.logger.trace(
        `ModelListerService: Calling getContextWindowSize on temporary provider ${providerName} for model ${modelName}.`
      );
      // The provider's getContextWindowSize itself returns Promise<number>, not Promise<Result<number, Error>>
      // So we wrap it in a Result here.
      const contextWindow = await provider.getContextWindowSize();
      if (contextWindow > 0) {
        return Result.ok(contextWindow);
      } else {
        // This case might indicate the provider couldn't determine it for the specific model, or model doesn't exist.
        const message = `Provider ${providerName} returned context window size 0 or less for model ${modelName}.`;
        this.logger.warn(message);
        return Result.err(
          new LLMProviderError(
            message,
            'CTX_WINDOW_UNAVAILABLE',
            `ModelListerService-CtxWindow-${providerName}`
          )
        );
      }
    } catch (error) {
      this.logger.error(
        `Error getting context window size for ${providerName} model ${modelName}: ${error instanceof Error ? error.message : String(error)}`,
        error as Error
      );
      return Result.err(
        LLMProviderError.fromError(error, `ModelListerService-CtxWindow-${providerName}`)
      );
    }
  }
}
