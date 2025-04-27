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

    const generatorIdentifiers = {
      'memory-bank': 'memory-bank',
      rules: 'rules',
      'system-prompts': 'system-prompts',
      roomodes: 'roomodes',
      'vscode-copilot-rules': 'vscode-copilot-rules',
    };

    for (const generator of generators) {
      const name = generator.name;
      if (typeof name === 'string') {
        const cliId = Object.entries(generatorIdentifiers).find(
          ([_, className]) => className === name
        )?.[0];

        if (cliId) {
          this.generatorsMap.set(cliId, generator);
          this.generatorsMap.set(name, generator);
          this.logger.debug(`Registered generator ${name} with CLI identifier ${cliId}`);
        } else {
          this.generatorsMap.set(name, generator);
          this.logger.warn(`Generator ${name} has no CLI identifier mapping`);
        }
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

  async execute(selectedGenerators?: string[]): Promise<void> {
    const availableGenerators = Array.from(this.generatorsMap.keys()).filter(
      (name) => !name.includes('Generator')
    );

    const generatorsToRun =
      selectedGenerators && selectedGenerators.length > 0
        ? this.validateGenerators(selectedGenerators)
        : availableGenerators;

    if (generatorsToRun.length === 0) {
      this.logger.warn(
        `No valid generators selected. Available generators: ${availableGenerators.filter((g) => !g.includes('Generator')).join(', ')}`
      );
      return;
    }

    this.logger.info(`Executing generators: ${generatorsToRun.join(', ')}`);

    const configResult = await this.projectConfigService.loadConfig();
    if (configResult.isErr()) {
      this.logger.error(
        `Failed to load project config: ${configResult.error?.message}`,
        configResult.error
      );
      throw configResult.error ?? new Error('Failed to load project config');
    }
    const config = configResult.value;
    if (!config) {
      const err = new Error('Project config is undefined');
      this.logger.error(err.message, err);
      throw err;
    }

    const validGenerators = this.validateGenerators(generatorsToRun);
    const result = await this.executeGenerators(config, validGenerators);
    if (result.isErr()) {
      this.logger.error(`Execution failed: ${result.error?.message}`, result.error);
      throw result.error ?? new Error('Execution failed');
    }
  }
}
