import { ICliInterface } from "../application/interfaces";
import { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { Injectable } from "../di/decorators"; // Import Injectable

export interface ParsedArgs {
  command: string | null;
  options: Record<string, any>;
}

@Injectable() // Add Injectable decorator
export class CliInterface implements ICliInterface {
  private program: Command;
  private parsedArgs: ParsedArgs = { command: null, options: {} };

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  private setupCommands(): void {
    this.program
      .name("roocode-generator")
      .description("CLI for the roocode-generator application")
      .version(this.getVersion(), "-v, --version", "Output the current version")
      .helpOption("-h, --help", "Display help for command");

    // Example command: generate
    this.program
      .command("generate")
      .description("Run code generators")
      .option(
        "-g, --generators <names...>",
        "Specify which generators to run (e.g., MemoryBank Rules)"
      )
      .option("-t, --template <template>", "Specify the template to use (if applicable)")
      .option("-o, --output <output>", "Specify the output directory (if applicable)")
      .action((options: Record<string, any>) => {
        // Add explicit type for options
        this.parsedArgs.command = "generate";
        // Ensure generators is always an array of strings
        let generators: string[] = [];
        if (options.generators) {
          if (Array.isArray(options.generators)) {
            generators = options.generators.map(String); // Ensure elements are strings
          } else {
            generators = [String(options.generators)]; // Handle single value case
          }
        }
        this.parsedArgs.options = { ...options, generators }; // Assign the typed array
      });

    // Example command: config
    this.program
      .command("config")
      .description("Configure LLM settings (interactively if no options provided)")
      .option("-p, --provider <provider>", "Set the LLM provider name")
      .option("-k, --api-key <key>", "Set the API key for the provider")
      .option("-m, --model <model_name>", "Set the specific model name")
      .action((options: Record<string, any>) => {
        this.parsedArgs.command = "config";
        this.parsedArgs.options = options;
      });
  }

  private getVersion(): string {
    try {
      const packageJsonPath = path.resolve(__dirname, "../../../package.json");
      const pkgRaw = fs.readFileSync(packageJsonPath, "utf-8");
      const pkg = JSON.parse(pkgRaw);
      return pkg.version || "unknown";
    } catch {
      return "unknown";
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
}
