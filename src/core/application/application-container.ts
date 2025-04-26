import { LLMConfig } from '../../../types/shared';
import { ILLMConfigService } from '../config/interfaces';
import { Container } from '../di/container';
import { Inject, Injectable } from '../di/decorators';
import { Result } from '../result/result';
import { ILogger } from '../services/logger-service';
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
    @Inject('ILogger') private readonly logger: ILogger
  ) {}

  private async executeGenerateCommand(options: Record<string, any>): Promise<Result<void, Error>> {
    try {
      const selectedGenerators = options.generators as string[];
      if (!selectedGenerators || selectedGenerators.length === 0) {
        return Result.err(
          new Error(
            "No generators specified. Use 'generate memory-bank' for memory bank generation."
          )
        );
      }
      const modes = (options.modes as string[]) || [
        'architect',
        'boomerang',
        'code',
        'code-review',
      ];
      this.logger.info(
        `Executing 'generate' command with generators: ${selectedGenerators?.join(', ') || 'All (default)'}`
      );
      await this.generatorOrchestrator.execute(selectedGenerators, { modes });
      this.logger.debug("Generator orchestrator execution completed for 'generate' command.");
      return Result.ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Generator execution failed: ${errorMessage}`);
      return Result.err(new Error(`Generator execution failed: ${errorMessage}`));
    }
  }

  private async handleConfigCreation(): Promise<Result<LLMConfig | null, Error>> {
    try {
      const answer = await this.cliInterface.prompt<{ createConfig: boolean }>({
        type: 'confirm',
        name: 'createConfig',
        message: 'LLM config file not found. Would you like to create it now?',
        default: true,
      });

      if (!answer.createConfig) {
        this.logger.info('LLM config creation declined by user. Exiting.');
        return Result.ok(null);
      }

      return Result.ok({
        provider: '',
        apiKey: '',
        model: '',
        maxTokens: 2048,
        temperature: 0.7,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.err(new Error(`Config creation failed: ${errorMessage}`));
    }
  }

  private async handleCliConfigUpdate(
    llmConfigService: ILLMConfigService,
    options: Record<string, any>,
    baseConfig: LLMConfig
  ): Promise<Result<void, Error>> {
    try {
      const updatedConfig: LLMConfig = {
        ...baseConfig,
        provider: options.provider ? String(options.provider) : baseConfig.provider,
        apiKey: options.apiKey ? String(options.apiKey) : baseConfig.apiKey,
        model: options.model ? String(options.model) : baseConfig.model,
      };

      const validationError = llmConfigService.validateConfig(updatedConfig);
      if (validationError) {
        return Result.err(
          new Error(`Invalid LLM configuration after applying CLI options: ${validationError}`)
        );
      }

      const saveResult = await llmConfigService.saveConfig(updatedConfig);
      if (saveResult.isErr()) {
        return Result.err(saveResult.error ?? new Error('Unknown error saving LLM config.'));
      }

      this.logger.info('LLM configuration updated successfully via CLI flags.');
      return Result.ok(undefined);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return Result.err(new Error(`CLI config update failed: ${errorMessage}`));
    }
  }

  private async executeConfigCommand(options: Record<string, any>): Promise<Result<void, Error>> {
    try {
      this.logger.info("Executing 'config' command.");
      const llmConfigResult =
        Container.getInstance().resolve<ILLMConfigService>('ILLMConfigService');
      if (llmConfigResult.isErr()) {
        return Result.err(
          new Error(`Failed to resolve ILLMConfigService: ${llmConfigResult.error?.message}`)
        );
      }
      const llmConfigService = llmConfigResult.value;
      if (!llmConfigService) {
        return Result.err(new Error('ILLMConfigService is undefined after resolution'));
      }

      const hasCliOptions = options.provider || options.apiKey || options.model;
      const configResult = await llmConfigService.loadConfig();
      let currentConfig: LLMConfig | null = null;

      if (configResult.isOk() && configResult.value) {
        currentConfig = configResult.value;
        if (llmConfigService.validateConfig(currentConfig)) {
          this.logger.warn(
            'Existing LLM config is invalid. Will overwrite with provided/default values.'
          );
          currentConfig = null;
        }
      } else if (configResult.isErr()) {
        const error = configResult.error;
        const isFileNotFound = error instanceof Error && (error as any).code === 'ENOENT';
        if (isFileNotFound) {
          const createResult = await this.handleConfigCreation();
          if (createResult.isErr()) {
            return Result.err(createResult.error ?? new Error('Config creation failed'));
          }
          if (createResult.value === null) {
            return Result.ok(undefined);
          }
          currentConfig = createResult.value as LLMConfig;
        } else {
          this.logger.error(
            `Error loading existing LLM config: ${error?.message}. Proceeding with defaults/CLI args.`
          );
        }
      }

      const baseConfig: LLMConfig = currentConfig ?? {
        provider: '',
        apiKey: '',
        model: '',
        maxTokens: 2048,
        temperature: 0.7,
      };

      if (hasCliOptions) {
        return await this.handleCliConfigUpdate(llmConfigService, options, baseConfig);
      } else {
        this.logger.debug('No config options provided via CLI flags, starting interactive edit.');
        const editResult = await llmConfigService.interactiveEditConfig(baseConfig);
        if (editResult.isErr()) {
          const error =
            editResult.error ?? new Error('Unknown error during interactive LLM config edit.');
          this.logger.error(`Config edit failed: ${error.message}`);
          return Result.err(error);
        }
        this.logger.info('LLM configuration updated successfully via interactive mode.');
        return Result.ok(undefined);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
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
