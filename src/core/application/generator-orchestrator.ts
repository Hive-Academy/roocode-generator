import { Injectable, Inject } from '../di/decorators';
import { IGeneratorOrchestrator } from './interfaces';
import { Result } from '../result/result';
import { IGenerator } from '../generators/base-generator';
import { IProjectConfigService } from '../config/interfaces';
import { ILogger } from '../services/logger-service';
import { ProjectConfig } from '@types';

@Injectable()
export class GeneratorOrchestrator implements IGeneratorOrchestrator {
  private generatorsMap: Map<string, IGenerator<unknown>>;

  constructor(
    generators: Array<IGenerator<unknown>>,
    @Inject('IProjectConfigService') private readonly projectConfigService: IProjectConfigService,
    @Inject('ILogger') private readonly logger: ILogger
  ) {
    this.generatorsMap = new Map<string, IGenerator<unknown>>();

    // Register generators
    for (const generator of generators) {
      const name = generator.name;
      if (typeof name === 'string') {
        this.generatorsMap.set(name, generator);
        this.logger.debug(`Registered generator: ${name}`);
      } else {
        this.logger.warn(`Warning: Generator missing 'name' property, skipping registration`);
      }
    }
  }

  async initialize(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * @deprecated Use execute('generate', options) instead.
   * This method is kept for backward compatibility and will be removed in a future version.
   */
  async executeGenerators(
    config: ProjectConfig,
    selectedGenerators: string[]
  ): Promise<Result<void, Error>> {
    this.logger.warn('executeGenerators is deprecated. Use execute("generate", options) instead.');

    // Convert to new format and delegate to execute
    const options: Record<string, any> = {
      ...config,
      generatorType: selectedGenerators[0] || 'roo', // Take first generator or default to 'roo'
    };

    return this.execute('generate', options);
  }

  async execute(command: string, options: Record<string, any>): Promise<Result<void, Error>> {
    this.logger.debug(`GeneratorOrchestrator executing command: ${command}`);
    this.logger.debug(`Options: ${JSON.stringify(options)}`);

    if (command === 'generate') {
      // Load ProjectConfig
      const configResult = this.projectConfigService.loadConfig();
      if (configResult.isErr()) {
        const errorMsg = `Failed to load project config: ${configResult.error?.message}`;
        this.logger.error(errorMsg, configResult.error);
        return Result.err(new Error(errorMsg));
      }
      const config = configResult.value;
      if (!config) {
        const errorMsg = 'Project config is undefined after loading.';
        this.logger.error(errorMsg);
        return Result.err(new Error(errorMsg));
      }

      // Merge CLI options into config
      const mergedConfig: ProjectConfig = { ...config, ...options };
      const generatorType = (mergedConfig as any).generatorType as string | undefined;
      this.logger.debug(`Attempting to resolve AiMagicGenerator for type: ${generatorType}`);

      // Get the AI Magic generator
      const aiMagicGenerator = this.generatorsMap.get('ai-magic') as IGenerator<ProjectConfig>;
      if (!aiMagicGenerator) {
        const errorMsg = 'AiMagicGenerator not found in the registry with name "ai-magic".';
        this.logger.error(errorMsg);
        return Result.err(new Error(errorMsg));
      }

      // Get context paths from config
      let contextPaths: string[] = [];
      if (typeof config.baseDir === 'string' && config.baseDir.trim().length > 0) {
        contextPaths = [config.baseDir];
      } else if (Array.isArray(config.baseDir) && config.baseDir.length > 0) {
        contextPaths = config.baseDir;
      } else {
        return Result.err(
          new Error('No context path provided for analysis in project config baseDir')
        );
      }

      this.logger.info(
        `Executing AiMagicGenerator for type: ${generatorType} with contextPaths: ${contextPaths.join(', ')}`
      );

      // Execute the generator
      const result = await aiMagicGenerator.generate(mergedConfig, contextPaths);
      if (result.isErr()) {
        const errorMsg =
          result.error?.message ?? `Unknown error in AiMagicGenerator for type ${generatorType}`;
        this.logger.error(`AiMagicGenerator failed: ${errorMsg}`);
        return Result.err(new Error(errorMsg));
      }

      this.logger.info(
        `AiMagicGenerator executed successfully for type: ${generatorType}. Result: ${result.value}`
      );
      return Result.ok(undefined);
    }

    const errorMsg = `Command '${command}' not supported by GeneratorOrchestrator.`;
    this.logger.error(errorMsg);
    return Result.err(new Error(errorMsg));
  }
}
