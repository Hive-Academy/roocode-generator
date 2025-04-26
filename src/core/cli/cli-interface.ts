import { ICliInterface } from '../application/interfaces';
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { Injectable, Inject } from '../di/decorators';
import { createPromptModule, Question } from 'inquirer';

export interface ParsedArgs {
  command: string | null;
  options: Record<string, any>;
}

@Injectable()
export class CliInterface implements ICliInterface {
  private program: Command;
  private parsedArgs: ParsedArgs = { command: null, options: {} };

  constructor(
    @Inject('Inquirer') private readonly inquirer: ReturnType<typeof createPromptModule>
  ) {
    this.program = new Command();
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .name('roocode-generator')
      .description('CLI for the roocode-generator application')
      .version(this.getVersion(), '-v, --version', 'Output the current version')
      .helpOption('-h, --help', 'Display help for command');

    // Example command: generate
    const generateCommand = this.program.command('generate').description('Run code generators');

    // Add existing options for generate command
    generateCommand
      .option(
        '-g, --generators <names...>',
        'Specify which generators to run (e.g., MemoryBank Rules)'
      )
      .option('-t, --template <template>', 'Specify the template to use (if applicable)')
      .option('-o, --output <output>', 'Specify the output directory (if applicable)');

    // Remove memory-bank subcommand and adjust generate command
    // to accept --generators memory-bank
    // generateCommand
    //   .command('memory-bank')
    //   .description(
    //     'Generate all memory bank files (ProjectOverview, TechnicalArchitecture, DeveloperGuide)'
    //   )
    //   .option('-c, --context <paths...>', 'Specify context paths')
    //   .option('-o, --output <path>', 'Specify output directory')
    //   .action((options: Record<string, any>) => {
    //     this.parsedArgs.command = 'memory-bank-suite';
    //     this.parsedArgs.options = options;
    //   });

    // Existing generate command action handler for other generators
    generateCommand.action((options: Record<string, any>) => {
      this.parsedArgs.command = 'generate';

      let generators: string[] = [];
      if (options.generators) {
        if (Array.isArray(options.generators)) {
          generators = options.generators.map(String);
        } else {
          generators = [String(options.generators)];
        }
      }

      const context = options.context
        ? Array.isArray(options.context)
          ? options.context
          : [String(options.context)]
        : [];
      const output = options.output ? String(options.output) : undefined;

      this.parsedArgs.options = { ...options, generators, context, output };
    });

    // Example command: config
    this.program
      .command('config')
      .description('Configure LLM settings (interactively if no options provided)')
      .option('-p, --provider <provider>', 'Set the LLM provider name')
      .option('-k, --api-key <key>', 'Set the API key for the provider')
      .option('-m, --model <model_name>', 'Set the specific model name')
      .action((options: Record<string, any>) => {
        this.parsedArgs.command = 'config';
        this.parsedArgs.options = options;
      });
  }

  private getVersion(): string {
    try {
      const packageJsonPath = path.resolve(__dirname, '../../../package.json');
      const pkgRaw = fs.readFileSync(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(pkgRaw);
      return pkg.version || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  public async parseArgs(): Promise<void> {
    this.program.parse(process.argv);

    // If no command was matched, commander does not call action handlers
    // So we manually set command to null and options to empty
    if (!this.parsedArgs.command) {
      this.parsedArgs.command = null;
      this.parsedArgs.options = {};
    }
    return Promise.resolve();
  }

  public getParsedArgs(): ParsedArgs {
    return this.parsedArgs;
  }

  public output(message: string): void {
    console.log(message);
  }

  public async prompt<T extends Record<string, any>>(options: Question): Promise<T> {
    const result = await this.inquirer([options]);
    return result as T;
  }
}
