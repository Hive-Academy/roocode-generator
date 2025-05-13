import { ILLMProvider, LLMProviderFactory } from './interfaces';
import { Result } from '../result/result';
import { Injectable, Inject } from '../di/decorators';
import { LLMProviderError } from './llm-provider-errors';
import { LLMConfig } from 'types/shared';

/**
 * Registry to manage LLM provider instantiation and caching.
 * Only instantiates the configured provider when needed.
 */
@Injectable()
export class LLMProviderRegistry {
  private cachedProvider: ILLMProvider | null = null;
  private readonly providerFactories: Map<string, LLMProviderFactory>;

  constructor(
    @Inject('ILLMProviderFactories') providerFactories: Record<string, LLMProviderFactory>
  ) {
    this.providerFactories = new Map(Object.entries(providerFactories));
  }

  /**
   * Gets the cached LLM provider instance.
   * Returns error if no provider has been initialized.
   * @returns Promise<Result> with provider or error
   */
  public getProvider(): Result<ILLMProvider, LLMProviderError> {
    if (!this.cachedProvider) {
      return Result.err(
        new LLMProviderError(
          'No provider initialized. Call initializeProvider first.',
          'PROVIDER_NOT_INITIALIZED',
          'LLMProviderRegistry'
        )
      );
    }
    return Result.ok(this.cachedProvider);
  }

  /**
   * Initializes a new LLM provider instance with the given configuration.
   * Caches the provider for future use.
   * @param config The LLM configuration to use
   * @returns Result with the initialized provider or error
   */
  public initializeProvider(config: LLMConfig): Result<ILLMProvider, LLMProviderError> {
    try {
      const providerName = config.provider.toLowerCase();
      const factory = this.providerFactories.get(providerName);

      if (!factory) {
        const message = `LLM provider '${providerName}' not found. Available providers: ${Array.from(this.providerFactories.keys()).join(', ')}`;
        return Result.err(
          new LLMProviderError(message, 'PROVIDER_NOT_FOUND', 'LLMProviderRegistry')
        );
      }

      const providerResult = factory(config);
      if (providerResult.isErr()) {
        return Result.err(LLMProviderError.fromError(providerResult.error!, 'LLMProviderRegistry'));
      }

      this.cachedProvider = providerResult.value!;
      return Result.ok(this.cachedProvider);
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
