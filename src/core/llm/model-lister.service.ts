import { Inject, Injectable } from '../di/decorators';
import { Result } from '../result/result';
import { IModelListerService, LLMProviderFactory } from './interfaces';
import { ILogger } from '../services/logger-service';
import { LLMConfig } from '../../../types/shared';
import { LLMProviderError } from './llm-provider-errors'; // Added import

/**
 * Service responsible for listing available models for a given LLM provider.
 * This service breaks the circular dependency between LLMConfigService and LLMProviderRegistry
 * by directly using provider factories to create temporary providers for model listing.
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
    // Changed Error to LLMProviderError
    try {
      // Get factory for the specified provider
      const factory = this.providerFactories[providerName.toLowerCase()];
      if (!factory) {
        const message = `LLM provider '${providerName}' not found. Available providers: ${Object.keys(this.providerFactories).join(', ')}`;
        this.logger.warn(`Provider factory not found for ${providerName}: ${message}`);
        return Result.err(new LLMProviderError(message, 'FACTORY_NOT_FOUND', 'ModelListerService'));
      }

      // Create a temporary config for the provider
      const tempConfig: LLMConfig = {
        provider: providerName,
        apiKey: apiKey,
        model: 'temporary', // Placeholder model name
        temperature: 1,
        maxTokens: 80000,
      };

      // Create a temporary provider instance
      const providerResult = factory(tempConfig);
      if (providerResult.isErr()) {
        // Check isErr first
        this.logger.warn(`Failed to create provider instance for ${providerName} from factory.`);
        // providerResult.error is already LLMProviderError because LLMProviderFactory returns Result<ILLMProvider, LLMProviderError>
        return Result.err(providerResult.error!); // Use non-null assertion
      }
      // If isOk(), value must be present
      const provider = providerResult.value!; // Use non-null assertion

      // Check if the provider supports listing models
      if (typeof provider.listModels !== 'function') {
        const message = `Provider ${providerName} does not support listing models`;
        this.logger.warn(message);
        return Result.err(new LLMProviderError(message, 'NOT_IMPLEMENTED', providerName));
      }

      // Call the provider's listModels method
      const modelsResult = await provider.listModels(); // This returns Result<string[], LLMProviderError>
      if (modelsResult.isErr()) {
        this.logger.warn(
          `No models available or error listing models for ${providerName}: ${modelsResult.error!.message}`
        );
        return Result.err(modelsResult.error!); // modelsResult.error is LLMProviderError
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
      return Result.err(LLMProviderError.fromError(error, 'ModelListerService'));
    }
  }
}
