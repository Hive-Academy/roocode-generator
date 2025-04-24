import { ILLMProvider, LLMProviderFactory } from './interfaces';
import { Result } from '../result/result';
import { Injectable, Inject } from '../di/decorators';
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
  public async getProvider(): Promise<Result<ILLMProvider, Error>> {
    try {
      // Return cached provider if available
      if (this.cachedProvider) {
        return Result.ok(this.cachedProvider);
      }

      // Get current configuration
      const configResult = await this.configService.loadConfig();
      if (configResult.isErr()) {
        return Result.err(configResult.error!);
      }

      const config = configResult.value;
      if (!config) {
        return Result.err(new Error('No LLM configuration found'));
      }

      const providerName = config.provider.toLowerCase();

      // Get factory for configured provider
      const factory = this.providerFactories.get(providerName);
      if (!factory) {
        return Result.err(
          new Error(
            `LLM provider '${providerName}' not found. Available providers: ${Array.from(
              this.providerFactories.keys()
            ).join(', ')}`
          )
        );
      }

      // Create provider instance with config
      const providerResult = factory(config);
      if (providerResult.isErr()) {
        return Result.err(providerResult.error!);
      }

      this.cachedProvider = providerResult.value!;
      return Result.ok(this.cachedProvider);
    } catch (error) {
      return Result.err(
        new Error(
          `Failed to initialize LLM provider: ${
            error instanceof Error ? error.message : String(error)
          }`
        )
      );
    }
  }
}
