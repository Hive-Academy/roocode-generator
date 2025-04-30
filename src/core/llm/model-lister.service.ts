import { Inject, Injectable } from '../di/decorators';
import { Result } from '../result/result';
import { IModelListerService, LLMProviderFactory } from './interfaces';
import { ILogger } from '../services/logger-service';
import { LLMConfig } from '../../../types/shared';

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
  ): Promise<Result<string[], Error>> {
    try {
      // Get factory for the specified provider
      const factory = this.providerFactories[providerName.toLowerCase()];
      if (!factory) {
        this.logger.warn(`Provider factory not found for ${providerName}`);
        return Result.err(
          new Error(
            `LLM provider '${providerName}' not found. Available providers: ${Object.keys(
              this.providerFactories
            ).join(', ')}`
          )
        );
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
      if (!providerResult.isOk() || !providerResult.value) {
        this.logger.warn(`Failed to create provider instance for ${providerName}`);
        return Result.err(
          providerResult.error ||
            new Error(`Failed to create provider instance for ${providerName}`)
        );
      }

      const provider = providerResult.value;

      // Check if the provider supports listing models
      if (typeof provider.listModels !== 'function') {
        this.logger.warn(`Provider ${providerName} does not support listing models`);
        return Result.err(new Error(`Provider ${providerName} does not support listing models`));
      }

      // Call the provider's listModels method
      const modelsResult = await provider.listModels();
      if (!modelsResult.isOk() || !modelsResult.value || modelsResult.value.length === 0) {
        this.logger.warn(`No models available for ${providerName}`);
        return Result.err(
          modelsResult.error || new Error(`No models available for ${providerName}`)
        );
      }

      return Result.ok(modelsResult.value);
    } catch (error) {
      this.logger.warn(
        `Could not fetch available models: ${error instanceof Error ? error.message : String(error)}`
      );
      return Result.err(
        new Error(
          `Failed to list models for ${providerName}: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }
  }
}
