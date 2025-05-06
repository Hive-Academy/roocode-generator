import { LLMConfig } from '../../../types/shared';
import { ILLMConfigService } from '../config/interfaces';
import { Inject, Injectable } from '../di/decorators';
import { Result } from '../result/result';
import { ILogger } from '../services/logger-service';
import { ProgressIndicator } from '../ui/progress-indicator';
import { ICliInterface, IGeneratorOrchestrator, IProjectManager } from './interfaces';

type ParsedArgs = {
  command: string | null;
  options: Record<string, any>;
};

@Injectable()
export class ApplicationContainer {
  constructor(
    @Inject('IGeneratorOrchestrator')
    private readonly generatorOrchestrator: IGeneratorOrchestrator,
    @Inject('IProjectManager') private readonly projectManager: IProjectManager,
    @Inject('ICliInterface') private readonly cliInterface: ICliInterface,
    @Inject('ILogger') private readonly logger: ILogger,
    @Inject('ProgressIndicator') private readonly progressIndicator: ProgressIndicator,
    @Inject('ILLMConfigService') private readonly llmConfigService: ILLMConfigService // Inject service
  ) {}

  private async executeGenerateCommand(options: Record<string, any>): Promise<Result<void, Error>> {
    const progress = this.progressIndicator;
    progress.start('Generating...');

    try {
      // The generator type will be in options.generatorType after CLI parsing refactoring (Subtask 2)
      // The GeneratorOrchestrator will now handle routing to AiMagicGenerator based on command and options
      this.logger.info(`Executing 'generate' command via GeneratorOrchestrator.`);
      const result = await this.generatorOrchestrator.execute('generate', options); // Pass command and options

      if (result.isErr()) {
        const errorMessage = result.error?.message ?? 'Unknown generator execution error.';
        this.logger.error(`Generator execution failed: ${errorMessage}`);
        progress.fail(`Generator execution failed: ${errorMessage}`);
        return Result.err(result.error ?? new Error(errorMessage));
      }

      this.logger.debug("Generator orchestrator execution completed for 'generate' command.");
      progress.succeed('Generation completed successfully.');
      return Result.ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Generator execution failed: ${errorMessage}`);
      progress.fail(`Generator execution failed: ${errorMessage}`);
      return Result.err(new Error(`Generator execution failed: ${errorMessage}`));
    }
  }

  private async handleCliConfigUpdate(
    llmConfigService: ILLMConfigService,
    options: Record<string, any>,
    baseConfig: LLMConfig
  ): Promise<Result<void, Error>> {
    // Progress is started before calling this method
    const progress = this.progressIndicator;
    try {
      const updatedConfig: LLMConfig = {
        ...baseConfig,
        provider: options.provider ? String(options.provider) : baseConfig.provider,
        apiKey: options.apiKey ? String(options.apiKey) : baseConfig.apiKey,
        model: options.model ? String(options.model) : baseConfig.model,
        // Retain default maxTokens and temperature if not provided
        maxTokens: baseConfig.maxTokens,
        temperature: baseConfig.temperature,
      };

      const validationError = llmConfigService.validateConfig(updatedConfig);
      if (validationError) {
        const errorMsg = `Invalid LLM configuration via CLI options: ${validationError}`;
        this.logger.error(errorMsg);
        progress.fail(errorMsg);
        return Result.err(new Error(errorMsg));
      }

      const saveResult = await llmConfigService.saveConfig(updatedConfig);
      if (saveResult.isErr()) {
        const error = saveResult.error ?? new Error('Unknown error saving LLM config via CLI.');
        this.logger.error(`CLI config save failed: ${error.message}`);
        progress.fail(`CLI config save failed: ${error.message}`);
        return Result.err(error);
      }

      progress.succeed('LLM configuration updated successfully via CLI flags.');
      this.logger.info('LLM configuration updated successfully via CLI flags.');
      return Result.ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `CLI config update failed unexpectedly: ${errorMessage}`,
        error instanceof Error ? error : undefined
      );
      progress.fail(`CLI config update failed unexpectedly: ${errorMessage}`);
      return Result.err(new Error(`CLI config update failed: ${errorMessage}`));
    } finally {
      // Ensure progress stops even if an unexpected error occurred before succeed/fail
      // stop() is safe to call even if not active
      progress.stop();
    }
  }

  private async executeConfigCommand(options: Record<string, any>): Promise<Result<void, Error>> {
    const progress = this.progressIndicator;
    try {
      this.logger.info("Executing 'config' command.");

      const hasCliOptions = options.provider || options.apiKey || options.model;
      // Always start with default config, removing the load/check logic
      const baseConfig: LLMConfig = {
        provider: '',
        apiKey: '',
        model: '',
        maxTokens: 80000, // Default value
        temperature: 0.1, // Default value
      };

      if (hasCliOptions) {
        progress.start('Updating configuration with CLI options...');
        const result = await this.handleCliConfigUpdate(this.llmConfigService, options, baseConfig);
        // Progress handled within handleCliConfigUpdate
        return result;
      } else {
        progress.start('Starting interactive configuration...');
        progress.stop(); // Stop spinner before interactive prompt
        const result = await this.llmConfigService.interactiveEditConfig(baseConfig);

        if (result.isErr()) {
          const error = result.error ?? new Error('Unknown error during interactive configuration');
          this.logger.error(`Interactive config update failed: ${error.message}`);
          // Ensure progress stops if interactiveEditConfig failed before stopping it
          // fail() is safe to call even if not active
          progress.fail(`Interactive config update failed: ${error.message}`);
          return Result.err(error);
        }

        // Success message and progress handled within interactiveEditConfig
        // progress.succeed('Configuration updated successfully via interactive mode.');
        this.logger.info('Configuration updated successfully via interactive mode.');
        return Result.ok(undefined);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Ensure progress stops on unexpected errors
      // fail() is safe to call even if not active
      progress.fail(`Config command failed unexpectedly: ${errorMessage}`);
      this.logger.error(
        `Config command failed: ${errorMessage}`,
        error instanceof Error ? error : undefined
      );
      return Result.err(new Error(`Config command failed: ${errorMessage}`));
    }
  }

  private async executeCommand(parsedArgs: ParsedArgs): Promise<Result<void, Error>> {
    this.logger.debug(`DEBUG: Received command string: "${parsedArgs.command}"`);
    switch (parsedArgs.command) {
      case 'generate':
        return await this.executeGenerateCommand(parsedArgs.options);
      case 'config':
        return await this.executeConfigCommand(parsedArgs.options);

      default:
        this.logger.warn(
          'No command specified or command not recognized. Use --help for usage information.'
        );
        return Result.err(
          new Error(
            'No command specified or command not recognized. Use --help for usage information.'
          )
        );
    }
  }

  public async run(): Promise<Result<void, Error>> {
    try {
      const parsedArgs = await this.getParsedArgs();
      const result = await this.executeCommand(parsedArgs);

      if (result.isErr()) {
        return result;
      }

      this.logger.debug('Application run sequence completed successfully.');
      return Result.ok(undefined);
    } catch (error) {
      this.logger.error(
        'Application run sequence failed.',
        error instanceof Error ? error : undefined
      );
      this.logger.debug(error instanceof Error ? (error.stack ?? String(error)) : String(error));
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async getParsedArgs(): Promise<ParsedArgs> {
    this.logger.debug('Starting application run sequence.');

    await this.cliInterface.parseArgs();
    const parsedArgs = this.cliInterface.getParsedArgs();
    this.logger.debug(
      `CLI arguments parsed: Command='${parsedArgs.command}', Options=${JSON.stringify(parsedArgs.options)}`
    );

    await this.projectManager.loadProjectConfig();
    this.logger.debug('Project configuration loaded.');

    await this.generatorOrchestrator.initialize();
    this.logger.debug('Generator orchestrator initialized.');
    return parsedArgs;
  }
}
