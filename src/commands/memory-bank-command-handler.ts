import { Injectable, Inject } from "../core/di/decorators";
import ora from "ora";
import chalk from "chalk";
import { MemoryBankGenerator } from "../memory-bank/MemoryBankGenerator";
import { IFileOperations } from "../core/file-operations/interfaces";
import { ILogger } from "../core/services/logger-service";
import { IProjectContextService } from "../memory-bank/interfaces";

/**
 * Command handler for the 'generate memory-bank' command.
 * Directly interfaces with the MemoryBankGenerator to generate all memory bank files.
 */
@Injectable()
export class MemoryBankCommandHandler {
  constructor(
    @Inject("MemoryBankGenerator") private memoryBankGenerator: MemoryBankGenerator,
    @Inject("IFileOperations") private fileOperations: IFileOperations,
    @Inject("ILogger") private logger: ILogger,
    @Inject("IProjectContextService") private projectContextService: IProjectContextService
  ) {}

  /**
   * Executes the memory bank generation command.
   *
   * @param args.context - Optional array of context paths to include in generation
   * @param args.output - Optional output path for the generated files
   * @returns Promise<void>
   *
   * @throws Error if file operations fail
   */
  async execute(args: { context?: string[]; output?: string }): Promise<void> {
    const { context, output } = args;

    // Initialize contextPaths with current directory and any provided paths
    let contextPaths = context || [];

    // If no context paths provided, use current directory
    if (contextPaths.length === 0) {
      contextPaths = ["."]; // ProjectContextService will handle recursive scanning and filtering
    }

    const outputDir = output || process.cwd();

    const spinner = ora(`Generating memory bank files...`).start();

    try {
      // Gather project context
      const contextResult = await this.projectContextService.gatherContext(contextPaths);
      if (contextResult.isErr()) {
        spinner.fail(
          chalk.red(
            `Failed to gather project context: ${contextResult.error?.message ?? "Unknown error"}`
          )
        );
        return;
      }

      // Call the MemoryBankGenerator to generate all memory bank files
      const result = await this.memoryBankGenerator.generateMemoryBankSuite({
        context: contextResult.value,
        output: outputDir,
      });

      if (result.isErr()) {
        spinner.fail(
          chalk.red(`Memory bank generation failed: ${result.error?.message ?? "Unknown error"}`)
        );
        return;
      }

      spinner.succeed(chalk.green(`Memory bank generation completed`));
    } catch (error) {
      spinner.fail(chalk.red(`Unexpected error: ${(error as Error).message}`));
      this.logger.error("Error in memory bank command execution", error as Error);
    }
  }
}
