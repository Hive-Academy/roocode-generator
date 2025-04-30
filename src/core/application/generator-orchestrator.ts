import { Injectable, Inject } from '../di/decorators';
import { IGeneratorOrchestrator } from './interfaces';
import { Result } from '../result/result';
import { IGenerator } from '../generators/base-generator';
import { IProjectConfigService } from '../config/interfaces';
import { ILogger } from '../services/logger-service';
import { ProjectConfig } from '../../../types/shared';

@Injectable()
export class GeneratorOrchestrator implements IGeneratorOrchestrator {
  private generatorsMap: Map<string, IGenerator<unknown>>;

  constructor(
    generators: Array<IGenerator<unknown>>,
    @Inject('IProjectConfigService') private readonly projectConfigService: IProjectConfigService,
    @Inject('ILogger') private readonly logger: ILogger
  ) {
    this.generatorsMap = new Map<string, IGenerator<unknown>>();

    // Simplified registration: Map generator names directly
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

  private validateGenerators(selectedGenerators: string[]): string[] {
    const validGenerators = selectedGenerators.filter((name) => {
      const isValid = this.generatorsMap.has(name);
      if (!isValid) {
        this.logger.warn(`Invalid generator name: ${name}`);
      }
      return isValid;
    });
    return validGenerators;
  }

  async executeGenerators(
    config: ProjectConfig,
    selectedGenerators: string[]
  ): Promise<Result<void, Error>> {
    this.logger.info(`Starting generator orchestration for: ${selectedGenerators.join(', ')}`);

    for (const genName of selectedGenerators) {
      const generator = this.generatorsMap.get(genName);
      if (!generator) {
        const availableGenerators = Array.from(this.generatorsMap.keys())
          .filter((g) => !g.includes('Generator'))
          .join(', ');
        const errorMsg = `Generator not found: ${genName}. Available generators: ${availableGenerators}`;
        this.logger.error(errorMsg);
        return Result.err(new Error(errorMsg));
      }

      this.logger.info(`Executing generator: ${genName}`);

      try {
        const result = await generator.generate(config, [process.cwd()]);
        if (result.isErr()) {
          const errorMsg = result.error?.message ?? `Unknown error in generator ${genName}`;
          this.logger.error(`Generator ${genName} failed: ${errorMsg}`);
          return Result.err(new Error(errorMsg));
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        this.logger.error(`Exception during generator ${genName} execution: ${errMsg}`);
        return Result.err(new Error(errMsg));
      }
    }

    this.logger.info('All selected generators executed successfully.');
    return Result.ok(undefined);
  }

  // Refactored execute method to handle commands and options

  async execute(command: string, options: Record<string, any>): Promise<Result<void, Error>> {
    this.logger.debug(`GeneratorOrchestrator executing command: ${command}`);
    this.logger.debug(`Options: ${JSON.stringify(options)}`);

    if (command === 'generate') {
      // Load ProjectConfig
      const configResult = this.projectConfigService.loadConfig();
      console.log('Loaded config:', configResult);
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
      // Assuming ProjectConfig can accept arbitrary properties or has defined properties for CLI options
      const mergedConfig: ProjectConfig = { ...config, ...options };

      // Access generatorType from merged config (assuming ProjectConfig will be updated to include it)
      const generatorType = (mergedConfig as any).generatorType as string | undefined;
      this.logger.debug(`Attempting to resolve AiMagicGenerator for type: ${generatorType}`);

      // Assuming 'ai-magic' is the registered name for AiMagicGenerator
      const aiMagicGenerator = this.generatorsMap.get('ai-magic') as IGenerator<ProjectConfig>; // Use 'ai-magic' name and specify ProjectConfig type
      if (!aiMagicGenerator) {
        const errorMsg = 'AiMagicGenerator not found in the registry with name "ai-magic".';
        this.logger.error(errorMsg);
        return Result.err(new Error(errorMsg));
      }

      // Use baseDir from loaded config as context path(s)
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
      // Call AiMagicGenerator's generate method with ProjectConfig and contextPaths
      // AiMagicGenerator.generate adheres to BaseGenerator signature: generate(fileType: ProjectConfig, contextPaths: string[])
      const result = await aiMagicGenerator.generate(mergedConfig, contextPaths);

      if (result.isErr()) {
        const errorMsg =
          result.error?.message ?? `Unknown error in AiMagicGenerator for type ${generatorType}`;
        this.logger.error(`AiMagicGenerator failed: ${errorMsg}`);
        return Result.err(new Error(errorMsg)); // Return Error instance
      }

      this.logger.info(
        `AiMagicGenerator executed successfully for type: ${generatorType}. Result: ${result.value}`
      ); // Log the result value
      return Result.ok(undefined); // Orchestrator execute returns void on success
    } else {
      // Keep existing executeGenerators logic for other commands if needed,
      // or remove if this orchestrator is only for 'generate' now.
      // For now, we'll throw an error for unsupported commands via this new execute method.
      const errorMsg = `Command '${command}' not supported by this GeneratorOrchestrator execution path.`;
      this.logger.error(errorMsg);
      return Result.err(new Error(errorMsg));
    }
  }
  // Keep executeGenerators for potential other uses or remove if no longer needed
  // based on future refactoring. For now, it remains as is.
  // The old execute method is removed as it's replaced by the new execute(command, options)
  // and executeGenerators(config, selectedGenerators)
}
