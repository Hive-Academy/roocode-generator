import { ILLMProvider, LLMProviderFactory } from './interfaces';
import { Result } from '../result/result';
import { Injectable, Inject } from '../di/decorators';
import { LLMProviderError } from './llm-provider-errors'; // Import LLMProviderError
import { ILLMConfigService } from '../config/interfaces';

/**
 * Registry to manage LLM provider instantiation and caching.
 * Only instantiates the configured provider when needed.
 */
@Injectable()
export class LLMProviderRegistry {
  private cachedProvider: ILLMProvider | null = null;
  private readonly providerFactories: Map<string, LLMProviderFactory>;

  constructor(
    @Inject('ILLMConfigService') private readonly configService: ILLMConfigService,
    @Inject('ILLMProviderFactories') providerFactories: Record<string, LLMProviderFactory>
  ) {
    this.providerFactories = new Map(Object.entries(providerFactories));
  }

  /**
   * Gets the configured LLM provider instance.
   * Creates the instance on first access and caches it.
   * @returns Promise<Result> with provider or error
   */
  public async getProvider(): Promise<Result<ILLMProvider, LLMProviderError>> {
    // Changed Error to LLMProviderError
    try {
      // Return cached provider if available
      if (this.cachedProvider) {
        return Result.ok(this.cachedProvider);
      }

      // Get current configuration
      const configResult = await this.configService.loadConfig();
      if (configResult.isErr()) {
        // configResult.error is Error, wrap it
        return Result.err(LLMProviderError.fromError(configResult.error!, 'LLMProviderRegistry'));
      }

      const config = configResult.value;
      if (!config) {
        return Result.err(
          new LLMProviderError('No LLM configuration found', 'CONFIG_ERROR', 'LLMProviderRegistry')
        );
      }

      const providerName = config.provider.toLowerCase();

      // Get factory for configured provider
      const factory = this.providerFactories.get(providerName);
      if (!factory) {
        const message = `LLM provider '${providerName}' not found. Available providers: ${Array.from(this.providerFactories.keys()).join(', ')}`;
        return Result.err(
          new LLMProviderError(message, 'PROVIDER_NOT_FOUND', 'LLMProviderRegistry')
        );
      }

      // Create provider instance with config
      // factory returns Result<ILLMProvider, Error> as per LLMProviderFactory type.
      // This needs to be handled. LLMProviderFactory type itself might need update.
      // For now, assume factory returns Result<ILLMProvider, LLMProviderError> or we handle it.
      const providerResult = factory(config); // LLMProviderFactory returns Result<ILLMProvider, Error>
      if (providerResult.isErr()) {
        // providerResult.error is Error, wrap it
        return Result.err(LLMProviderError.fromError(providerResult.error!, 'LLMProviderRegistry'));
      }

      this.cachedProvider = providerResult.value!; // Value is ILLMProvider
      return Result.ok(this.cachedProvider); // Returns Result<ILLMProvider, never>
    } catch (error) {
      return Result.err(LLMProviderError.fromError(error, 'LLMProviderRegistry'));
    }
  }

  /**
   * Gets the factory function for a specific provider without loading config or instantiating.
   * Used for temporary provider creation during configuration.
   * @param providerName Name of the provider to get factory for
   * @returns Result with provider factory or error
   */
  public getProviderFactory(providerName: string): Result<LLMProviderFactory, LLMProviderError> {
    // Changed Error to LLMProviderError
    try {
      const factory = this.providerFactories.get(providerName.toLowerCase());
      if (!factory) {
        const message = `LLM provider factory '${providerName}' not found. Available providers: ${Array.from(this.providerFactories.keys()).join(', ')}`;
        return Result.err(
          new LLMProviderError(message, 'FACTORY_NOT_FOUND', 'LLMProviderRegistry')
        );
      }
      return Result.ok(factory);
    } catch (error) {
      return Result.err(LLMProviderError.fromError(error, 'LLMProviderRegistry'));
    }
  }
}
