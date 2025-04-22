# Implementation Plan: Memory Bank Generator Refactoring

## Overview

This implementation plan outlines the steps necessary to refactor the memory bank generation command handling and logic in the roocode-generator project. The refactoring aims to improve the architecture by directly routing the `roocode generate memory-bank` command to the `MemoryBankGenerator`, consolidating the generation logic, and fixing several identified issues.

## Current Architecture

Currently, the memory bank generation flow works as follows:

1. The CLI interface (`src/core/cli/cli-interface.ts`) parses the `generate memory-bank` command
2. The application container (`src/core/application/application-container.ts`) routes this command to the `GeneratorOrchestrator`
3. The `GeneratorOrchestrator` executes the `MemoryBankGenerator` with the project configuration
4. The `GenerateMemoryBankCommand` class (`src/commands/generate-memory-bank.command.ts`) handles the actual orchestration of generating all memory bank file types
5. The `MemoryBankGenerator.executeGeneration` method is called for each file type, but has issues with variable references and context passing

## Target Architecture

After refactoring, the flow will be:

1. The CLI interface parses the `generate memory-bank` command
2. The application container directly routes this command to a dedicated handler that uses the `MemoryBankGenerator`
3. The `MemoryBankGenerator` contains all the orchestration logic (previously in `GenerateMemoryBankCommand`)
4. The `MemoryBankGenerator.executeGeneration` method focuses on generating a single memory bank file type
5. The `GenerateMemoryBankCommand` class is removed

## Technical Requirements

As specified in memory-bank/TechnicalArchitecture.md:11-14, the project implements a **Modular CLI with LLM Integration** architecture. The refactoring should maintain this architectural pattern while improving the command handling flow.

According to memory-bank/TechnicalArchitecture.md:101-113, the project follows these design patterns:

- Generator Pattern
- Configuration-Driven Development
- Template Engine (Custom Placeholders)
- LLM Abstraction
- Command Pattern

The refactoring should adhere to these patterns, particularly the Command Pattern for CLI command handling.

As per memory-bank/DeveloperGuide.md:152-158, the code should follow these standards:

- Use TypeScript for all new code
- Adhere to the rules defined in `.eslintrc.js` and `.prettierrc.js`
- Follow standard TypeScript/JavaScript naming conventions
- Design components to be modular and reusable
- Implement robust error handling
- Use meaningful error messages

## Implementation Steps

### 1. Refactor MemoryBankGenerator Class

#### 1.1 Fix the executeGeneration Method

```typescript
protected async executeGeneration(
  fileType: MemoryBankFileType,
  contextPaths: string[]
): Promise<Result<string, Error>> {
  try {
    this.logger.debug(
      `DEBUG (Generator): Processing file type: ${String(fileType)}`
    );

    // Gather project context from provided paths
    const contextResult = await this.projectContextService.gatherContext(contextPaths);
    if (contextResult.isErr()) {
      return Result.err(contextResult.error ?? new Error("Failed to gather context"));
    }

    // Pass the fileType enum as a string to loadTemplate
    const templateResult = await this.templateManager.loadTemplate(fileType);
    if (templateResult.isErr()) {
      return Result.err(templateResult.error ?? new Error("Template content is undefined"));
    }

    // Ensure values are defined before using them
    const contextValue = contextResult.value || "";
    const templateValue = templateResult.value || "";

    // Build file-type specific instructions
    const instructions = this.getFileTypeInstructions(fileType);

    // Build the prompt with enhanced context and instructions
    const promptResult = this.promptBuilder.buildPrompt(
      instructions,
      contextValue,
      templateValue
    );
    if (promptResult.isErr()) {
      return Result.err(promptResult.error ?? new Error("Failed to build prompt"));
    }

    // Build system prompt with role-specific context
    const systemPromptResult = this.promptBuilder.buildPrompt(
      this.getSystemPrompt(fileType),
      contextValue,
      templateValue
    );
    if (systemPromptResult.isErr()) {
      return Result.err(systemPromptResult.error ?? new Error("Failed to build system prompt"));
    }

    if (!systemPromptResult.value || !promptResult.value) {
      return Result.err(new Error("Generated prompts are undefined"));
    }

    const llmResponse = await this.llmAgent.getCompletion(
      systemPromptResult.value,
      promptResult.value
    );
    if (llmResponse.isErr()) {
      return Result.err(llmResponse.error ?? new Error("LLM invocation failed"));
    }

    if (!llmResponse.value) {
      return Result.err(new Error("LLM response is undefined"));
    }

    // Get project config for metadata
    const configResult = await this.projectConfigService.loadConfig();
    if (configResult.isErr()) {
      return Result.err(configResult.error ?? new Error("Failed to load project config"));
    }
    const config = configResult.value;
    if (!config) {
      return Result.err(new Error("Project config is undefined after loading"));
    }

    // Process the template with enhanced metadata
    const processedContentResult = await this.contentProcessor.processTemplate(
      llmResponse.value,
      {
        fileType: fileType,
        baseDir: config.baseDir,
        projectName: config.name ?? "Unknown Project",
        projectContext: contextValue,
        taskId: this.generateTaskId(),
        taskName: `Generate ${String(fileType)}`,
        implementationSummary: `Generated ${String(fileType)} based on project context`,
        currentDate: new Date().toISOString().split("T")[0],
      }
    );
    if (processedContentResult.isErr()) {
      return Result.err(processedContentResult.error ?? new Error("Failed to process content"));
    }

    return Result.ok(processedContentResult.value as string);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    this.logger.error("Error in memory bank generation", err);
    return Result.err(err);
  }
}
```

#### 1.2 Add New Orchestration Method

Add a new method to `MemoryBankGenerator` that handles the orchestration of generating all memory bank file types:

```typescript
/**
 * Generates all memory bank files based on the provided context paths.
 * @param contextPaths Array of paths to gather context from
 * @param outputDir Output directory for the generated files
 * @returns Promise<Result<void, Error>> indicating success or failure
 */
public async generateAllMemoryBankFiles(
  contextPaths: string[],
  outputDir: string = process.cwd()
): Promise<Result<void, Error>> {
  try {
    // Generate all memory bank file types
    const fileTypesToGenerate = Object.values(MemoryBankFileType);

    // Create the memory-bank directory
    const memoryBankDir = path.join(outputDir, "memory-bank");
    const dirResult = await this.fileManager.createMemoryBankDirectory(outputDir);
    if (dirResult.isErr()) {
      return Result.err(
        new Error(`Failed to create memory-bank directory: ${dirResult.error?.message ?? "Unknown error"}`)
      );
    }

    // Create templates directory
    const templatesDir = path.join(memoryBankDir, "templates");
    const fileOps = this.container.resolve<IFileOperations>("IFileOperations");
    const templatesDirResult = await fileOps.createDirectory(templatesDir);
    if (templatesDirResult.isErr()) {
      return Result.err(
        new Error(`Failed to create templates directory: ${templatesDirResult.error?.message ?? "Unknown error"}`)
      );
    }

    // Generate memory bank files
    for (const fileType of fileTypesToGenerate) {
      // Call executeGeneration method for each file type
      const result = await this.generate(fileType, contextPaths);

      if (result.isErr()) {
        this.logger.error(
          `Generation failed for ${String(fileType)}: ${result.error?.message ?? "Unknown error"}`
        );
        continue;
      }

      if (!result.value) {
        this.logger.error(`Generation failed for ${String(fileType)}: No content generated`);
        continue;
      }

      // Write the generated content to the output file
      const outputFilePath = path.join(memoryBankDir, `${String(fileType)}.md`);
      const writeResult = await fileOps.writeFile(outputFilePath, result.value);

      if (writeResult.isErr()) {
        this.logger.error(
          `Failed to write ${String(fileType)}: ${writeResult.error?.message ?? "Unknown error"}`
        );
        continue;
      }

      this.logger.info(`Generated ${String(fileType)} at ${outputFilePath}`);
    }

    // Copy template files
    const templateFiles = [
      "completion-report-template.md",
      "implementation-plan-template.md",
      "mode-acknowledgment-template.md",
      "task-description-template.md",
    ];

    for (const templateFile of templateFiles) {
      const sourceTemplate = path.join("templates", "memory-bank", "templates", templateFile);
      const destTemplate = path.join(templatesDir, templateFile);

      const readResult = await fileOps.readFile(sourceTemplate);
      if (readResult.isErr()) {
        this.logger.error(
          `Failed to read template ${templateFile}: ${readResult.error?.message ?? "Unknown error"}`
        );
        continue;
      }

      // Ensure we have content before writing
      const templateContent = readResult.value;
      if (!templateContent) {
        this.logger.error(`Empty template content for ${templateFile}`);
        continue;
      }

      const writeResult = await fileOps.writeFile(destTemplate, templateContent);
      if (writeResult.isErr()) {
        this.logger.error(
          `Failed to write template ${templateFile}: ${writeResult.error?.message ?? "Unknown error"}`
        );
        continue;
      }
    }

    this.logger.info("Memory bank generation completed");
    return Result.ok(undefined);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    this.logger.error("Error in memory bank generation", err);
    return Result.err(err);
  }
}
```

#### 1.3 Add Required Imports

Ensure the following imports are added to the `MemoryBankGenerator.ts` file:

```typescript
import path from "path";
import { IFileOperations } from "../core/file-operations/interfaces";
```

### 2. Create a New Command Handler

Create a new command handler class that will be directly triggered by the application container:

```typescript
// src/commands/memory-bank-command-handler.ts

import { Injectable, Inject } from "../core/di/decorators";
import inquirer from "inquirer";
import ora from "ora";
import chalk from "chalk";
import { MemoryBankGenerator } from "../memory-bank/MemoryBankGenerator";
import { IFileOperations } from "../core/file-operations/interfaces";
import { ILogger } from "../core/services/logger-service";

/**
 * Command handler for the 'generate memory-bank' command.
 * Directly interfaces with the MemoryBankGenerator to generate all memory bank files.
 */
@Injectable()
export class MemoryBankCommandHandler {
  constructor(
    @Inject("MemoryBankGenerator") private memoryBankGenerator: MemoryBankGenerator,
    @Inject("IFileOperations") private fileOperations: IFileOperations,
    @Inject("ILogger") private logger: ILogger
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

    // If no context paths provided, use current directory and common project paths
    if (contextPaths.length === 0) {
      const defaultPaths = [
        ".", // Current directory
        "./src",
        "./tests",
        "./docs",
        "./package.json",
        "./README.md",
        "./tsconfig.json",
      ];

      // Filter to only include paths that exist
      const existingPaths: string[] = [];
      for (const p of defaultPaths) {
        const normalizedPath = this.fileOperations.normalizePath(p);
        if (await this.pathExists(normalizedPath)) {
          existingPaths.push(normalizedPath);
        }
      }

      contextPaths = existingPaths;

      // Allow user to add additional paths
      const { addMore } = await inquirer.prompt([
        {
          type: "confirm",
          name: "addMore",
          message: "Would you like to add additional context paths?",
          default: false,
        },
      ]);

      if (addMore) {
        const answers = await inquirer.prompt([
          {
            type: "input",
            name: "additionalPaths",
            message: "Enter additional context paths (comma separated):",
            filter: (input: string) =>
              input
                .split(",")
                .map((p) => p.trim())
                .filter((p) => p.length > 0),
          },
        ]);
        contextPaths = [...contextPaths, ...answers.additionalPaths];
      }
    }

    const outputDir = output || process.cwd();

    const spinner = ora(`Generating memory bank files...`).start();

    try {
      // Call the MemoryBankGenerator to generate all memory bank files
      const result = await this.memoryBankGenerator.generateAllMemoryBankFiles(
        contextPaths,
        outputDir
      );

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

  /**
   * Helper method to check if a path exists
   */
  private async pathExists(path: string): Promise<boolean> {
    const result = await this.fileOperations.readDir(path).catch(() => Result.err(new Error()));
    return result.isOk();
  }
}
```

### 3. Update Application Container

Modify the `src/core/application/application-container.ts` file to handle the `generate memory-bank` command directly:

```typescript
// Add import for the new command handler
import { MemoryBankCommandHandler } from "../../commands/memory-bank-command-handler";

// In the ApplicationContainer class, modify the executeCommand method:
private async executeCommand(parsedArgs: ParsedArgs): Promise<Result<void, Error>> {
  this.logger.debug(`DEBUG: Received command string: "${parsedArgs.command}"`);
  switch (parsedArgs.command) {
    case "generate":
      return await this.executeGenerateCommand(parsedArgs.options);

    case "generate memory-bank":
      // Directly use the MemoryBankCommandHandler instead of GeneratorOrchestrator
      try {
        const memoryBankCommandHandler = resolveDependency<MemoryBankCommandHandler>(
          Container.getInstance(),
          "MemoryBankCommandHandler"
        );
        await memoryBankCommandHandler.execute(parsedArgs.options);
        return Result.ok(undefined);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`Memory bank command execution failed: ${errorMessage}`);
        return Result.err(new Error(`Memory bank command execution failed: ${errorMessage}`));
      }

    case "config":
      return await this.executeConfigCommand(parsedArgs.options);

    default:
      this.logger.warn(
        "No command specified or command not recognized. Use --help for usage information."
      );
      return Result.err(
        new Error(
          "No command specified or command not recognized. Use --help for usage information."
        )
      );
  }
}
```

### 4. Update Dependency Registration

Update the dependency registration to include the new command handler:

```typescript
// src/core/di/registrations.ts (or wherever dependencies are registered)

// Add registration for MemoryBankCommandHandler
Container.getInstance().register("MemoryBankCommandHandler", () => {
  return new MemoryBankCommandHandler(
    resolveDependency(Container.getInstance(), "MemoryBankGenerator"),
    resolveDependency(Container.getInstance(), "IFileOperations"),
    resolveDependency(Container.getInstance(), "ILogger")
  );
});
```

### 5. Clean Up

After implementing and testing the above changes, remove the now-obsolete `GenerateMemoryBankCommand` class:

```bash
# Delete the file
rm src/commands/generate-memory-bank.command.ts
```

## Testing Plan

1. **Unit Testing**:

   - Test the refactored `MemoryBankGenerator.executeGeneration` method with different file types
   - Test the new `MemoryBankGenerator.generateAllMemoryBankFiles` method
   - Test the `MemoryBankCommandHandler.execute` method

2. **Integration Testing**:

   - Test the end-to-end flow by running the `roocode generate memory-bank` command
   - Verify that all memory bank files are generated correctly
   - Verify that template files are copied correctly

3. **Error Handling Testing**:
   - Test with invalid context paths
   - Test with invalid output directory
   - Test with missing template files

## Architecture Decision Record

### Context

The current implementation routes the `generate memory-bank` command through the `GeneratorOrchestrator`, which then calls the `MemoryBankGenerator`. This adds unnecessary complexity and has led to issues with variable references and context passing.

### Decision

We will refactor the command handling to directly route the `generate memory-bank` command to a dedicated command handler that uses the `MemoryBankGenerator`. The orchestration logic will be moved from `GenerateMemoryBankCommand` to `MemoryBankGenerator`.

### Consequences

**Positive**:

- Simplified command flow
- Improved separation of concerns
- Fixed issues with variable references and context passing
- More maintainable code structure

**Negative**:

- Requires changes to multiple files
- Temporary duplication of code during the transition

## Conclusion

This refactoring will improve the architecture of the memory bank generation feature by simplifying the command flow, consolidating the generation logic, and fixing several identified issues. The changes adhere to the project's architectural patterns and coding standards.
