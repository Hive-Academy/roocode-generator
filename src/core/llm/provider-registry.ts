import { ILLMProvider, LLMProviderFactory } from './interfaces';
import { Result } from '../result/result';
import { Injectable, Inject } from '../di/decorators';
import { LLMProviderError } from './llm-provider-errors';
import { LLMConfig } from 'types/shared';
import { ILogger } from '../services/logger-service';
import { ILLMConfigService } from '../config/interfaces';

/**
 * Registry to manage LLM provider instantiation and caching.
 * Only instantiates the configured provider when needed.
 */
@Injectable()
export class LLMProviderRegistry {
  private cachedProvider: ILLMProvider | null = null;
  private readonly providerFactories: Map<string, LLMProviderFactory>;
  private readonly initializationPromise: Promise<Result<ILLMProvider, LLMProviderError>>;

  constructor(
    @Inject('ILLMProviderFactories') providerFactories: Record<string, LLMProviderFactory>,
    @Inject('ILogger') private readonly logger: ILogger,
    @Inject('ILLMConfigService') configService: ILLMConfigService
  ) {
    this.providerFactories = new Map(Object.entries(providerFactories));
    this.logger.debug(
      '[INVESTIGATION] LLMProviderRegistry constructor: Kicking off initialization.'
    );
    this.initializationPromise = this._loadConfigAndInitializeProvider(configService);
  }

  private async _loadConfigAndInitializeProvider(
    configService: ILLMConfigService
  ): Promise<Result<ILLMProvider, LLMProviderError>> {
    try {
      this.logger.debug('[INVESTIGATION] _loadConfigAndInitializeProvider: Loading config...');
      const configResult = await configService.loadConfig();

      if (configResult.isErr()) {
        const configLoadError = configResult.error!;
        this.logger.error(
          `[INVESTIGATION] _loadConfigAndInitializeProvider: Failed to load config: ${configLoadError.message}`,
          configLoadError
        );
        // Wrap the generic Error from configService into an LLMProviderError
        // LLMProviderError.fromError typically takes (error: any, context: string)
        return Result.err(
          LLMProviderError.fromError(configLoadError, 'LLMProviderRegistry-ConfigLoad')
        );
      }
      if (!configResult.value) {
        const noConfigValError = new LLMProviderError(
          'Config loaded but value is missing.',
          'CONFIG_ERROR',
          'LLMProviderRegistry'
        );
        this.logger.error(
          `[INVESTIGATION] _loadConfigAndInitializeProvider: ${noConfigValError.message}`
        );
        return Result.err(noConfigValError);
      }

      this.logger.debug(
        '[INVESTIGATION] _loadConfigAndInitializeProvider: Config loaded, initializing provider with config.'
      );
      return this._initializeProviderWithConfig(configResult.value);
    } catch (error) {
      const catchAllError = LLMProviderError.fromError(error, 'LLMProviderRegistry-LoadAndInit');
      this.logger.error(
        `[INVESTIGATION] _loadConfigAndInitializeProvider: Unhandled error: ${catchAllError.message}`,
        catchAllError
      );
      return Result.err(catchAllError);
    }
  }

  /**
   * Gets the initialized LLM provider instance.
   * Awaits initialization if it's in progress.
   * @returns Promise<Result> with provider or error
   */
  public async getProvider(): Promise<Result<ILLMProvider, LLMProviderError>> {
    this.logger.debug(
      '[INVESTIGATION] LLMProviderRegistry.getProvider CALLED. Awaiting initializationPromise.'
    );
    const result = await this.initializationPromise;

    if (result.isOk()) {
      this.logger.debug('[INVESTIGATION] getProvider: initializationPromise resolved Ok.');
    } else if (result.isErr()) {
      this.logger.error(
        `[INVESTIGATION] getProvider: initializationPromise resolved with Error: ${result.error!.message}`,
        result.error
      );
    }
    return result;
  }

  /**
   * Internal method to initialize a new LLM provider instance with the given configuration.
   * Caches the provider for future use.
   * @param config The LLM configuration to use
   * @returns Result with the initialized provider or error
   */
  private _initializeProviderWithConfig(config: LLMConfig): Result<ILLMProvider, LLMProviderError> {
    this.logger.debug(
      `[INVESTIGATION] LLMProviderRegistry._initializeProviderWithConfig CALLED. Config provider: ${config?.provider}`
    );
    this.cachedProvider = null;

    try {
      const providerName = config.provider?.toLowerCase();
      if (!providerName) {
        const errMsg = `Provider name is undefined in LLMConfig. Cannot initialize provider.`;
        this.logger.error(`[INVESTIGATION] _initializeProviderWithConfig: ${errMsg}`);
        return Result.err(new LLMProviderError(errMsg, 'CONFIG_ERROR', 'LLMProviderRegistry'));
      }

      const factory = this.providerFactories.get(providerName);
      if (!factory) {
        const message = `LLM provider '${providerName}' not found. Available: ${Array.from(this.providerFactories.keys()).join(', ')}`;
        this.logger.error(`[INVESTIGATION] _initializeProviderWithConfig: ${message}`);
        return Result.err(
          new LLMProviderError(message, 'PROVIDER_NOT_FOUND', 'LLMProviderRegistry')
        );
      }

      this.logger.debug(
        `[INVESTIGATION] _initializeProviderWithConfig: Found factory for '${providerName}'. Invoking factory.`
      );
      const providerResult = factory(config);

      if (providerResult.isOk()) {
        const provider: ILLMProvider = providerResult.value!;
        this.cachedProvider = provider;
        this.logger.debug(
          `[INVESTIGATION] _initializeProviderWithConfig: Provider '${provider.name}' initialized and cached successfully.`
        );
        return Result.ok(provider);
      } else if (providerResult.isErr()) {
        const errorFromResult: LLMProviderError = providerResult.error!;
        this.logger.error(
          `[INVESTIGATION] _initializeProviderWithConfig: Factory for '${providerName}' failed. Error: ${errorFromResult.message}`,
          errorFromResult
        );
        return Result.err(errorFromResult);
      } else {
        const unknownError = new LLMProviderError(
          'Unknown result state from factory after isOk/isErr checks.',
          'INTERNAL_ERROR',
          'LLMProviderRegistry'
        );
        this.logger.error(
          `[INVESTIGATION] _initializeProviderWithConfig: Unknown result state from factory for '${providerName}'.`,
          unknownError
        );
        return Result.err(unknownError);
      }
    } catch (error) {
      const err = LLMProviderError.fromError(error, 'LLMProviderRegistry-InitializeCatchAll');
      this.logger.error(
        `[INVESTIGATION] _initializeProviderWithConfig: Critical error during initialization. Error: ${err.message}`,
        err
      );
      return Result.err(err);
    }
  }

  /**
   * Gets the factory function for a specific provider without loading config or instantiating.
   * Used for temporary provider creation during configuration.
   * @param providerName Name of the provider to get factory for
   * @returns Result with provider factory or error
   */
  public getProviderFactory(providerName: string): Result<LLMProviderFactory, LLMProviderError> {
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
