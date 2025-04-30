import { ICliInterface } from '../application/interfaces';
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { Injectable, Inject } from '../di/decorators';
import type { Question } from 'inquirer';
import type { createPromptModule as CreatePromptModule } from 'inquirer';

export interface ParsedArgs {
  command: string | null;
  options: Record<string, any>;
}

@Injectable()
export class CliInterface implements ICliInterface {
  private program: Command;
  private parsedArgs: ParsedArgs = { command: null, options: {} };

  constructor(
    @Inject('Inquirer') private readonly inquirer: ReturnType<typeof CreatePromptModule>
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
    generateCommand.option(
      '-g, --generators <type>', // Changed from <names...>
      'Specify which type of content to generate within ai-magic (memory-bank, roo, cursor)'
    ); // Removed .choices()

    // Adjust action handler to expect a single string or undefined and perform manual validation
    generateCommand.action((options: Record<string, any>) => {
      this.parsedArgs.command = 'generate';
      const generatorType = options.generators as string | undefined; // Expect single value
      const allowedGeneratorTypes = ['memory-bank', 'roo', 'cursor'];

      if (generatorType && !allowedGeneratorTypes.includes(generatorType)) {
        // Handle invalid generator type - log error and prevent further action
        console.error(
          `Error: Invalid generator type specified: ${generatorType}. Allowed types are: ${allowedGeneratorTypes.join(', ')}`
        );
        // Set command to null or an error state to prevent execution in ApplicationContainer
        this.parsedArgs.command = null;
        this.parsedArgs.options = {};
        return; // Stop further processing in this action handler
      }

      // Store the single type in parsedArgs.options
      this.parsedArgs.options = { ...options, generatorType };
      // Remove the old 'generators' array if it exists in options
      delete this.parsedArgs.options.generators;
    });

    // LLM Configuration command - interactive only
    this.program
      .command('config')
      .description('Configure LLM settings through an interactive setup process')
      .action(() => {
        this.parsedArgs.command = 'config';
        this.parsedArgs.options = {}; // No CLI options needed for interactive mode
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
