import { Injectable, Inject } from "../di/decorators";
import { IFileOperations } from "../file-operations/interfaces";
import { ILogger } from "../services/logger-service";
import { Result } from "../result/result";
import { IProjectAnalyzer, TechStackAnalysis, ProjectStructure, DependencyGraph } from "./types";
import { LLMAgent } from "../llm/llm-agent";
import { ResponseParser } from "./response-parser";
import { ProgressIndicator } from "../ui/progress-indicator";
import path from "path";

@Injectable()
export class ProjectAnalyzer implements IProjectAnalyzer {
  constructor(
    @Inject("IFileOperations") private readonly fileOps: IFileOperations,
    @Inject("ILogger") private readonly logger: ILogger,
    @Inject("LLMAgent") private readonly llmAgent: LLMAgent,
    @Inject("ResponseParser") private readonly responseParser: ResponseParser,
    @Inject("ProgressIndicator") private readonly progress: ProgressIndicator
  ) {
    this.logger.debug("ProjectAnalyzer initialized");
  }

  async analyzeTechStack(paths: string[]): Promise<Result<TechStackAnalysis, Error>> {
    try {
      this.progress.start("Collecting project files...");
      const files = await this.collectProjectFiles(paths[0]);
      if (files.length === 0) {
        this.progress.fail("No files found for analysis");
        return Result.err(new Error("No files found for analysis"));
      }

      this.progress.update("Analyzing tech stack...");
      const systemPrompt = `Analyze the project's tech stack from the provided files.
        Return a JSON object with the following structure:
        {
          "languages": string[],
          "frameworks": string[],
          "buildTools": string[],
          "testingFrameworks": string[],
          "linters": string[],
          "packageManager": string
        }
        Important: Return ONLY the JSON object without any markdown formatting or code fences.`;

      const result = await this.llmAgent.getCompletion(systemPrompt, files.join("\n\n"));
      if (result.isErr()) {
        this.progress.fail("Tech stack analysis failed");
        return Result.err(result.error as Error);
      }

      this.progress.update("Processing analysis results...");
      const parsedResult = this.responseParser.parseJSON<TechStackAnalysis>(result.value as string);
      if (parsedResult.isOk()) {
        this.progress.succeed("Tech stack analysis completed");
      } else {
        this.progress.fail("Failed to parse analysis results");
      }
      return parsedResult;
    } catch (error: any) {
      this.progress.fail("Tech stack analysis failed");
      return Result.err(new Error(`Tech stack analysis failed: ${error}`));
    }
  }

  async analyzeProjectStructure(paths: string[]): Promise<Result<ProjectStructure, Error>> {
    try {
      this.progress.start("Collecting project files...");
      const files = await this.collectProjectFiles(paths[0]);
      if (files.length === 0) {
        this.progress.fail("No files found for analysis");
        return Result.err(new Error("No files found for analysis"));
      }

      this.progress.update("Analyzing project structure...");
      const systemPrompt = `Analyze the project structure from the provided files.
        Return a JSON object with the following structure:
        {
          "rootDir": string,
          "sourceDir": string,
          "testDir": string,
          "configFiles": string[],
          "mainEntryPoints": string[],
          "componentStructure": Record<string, string[]>
        }
        Important: Return ONLY the JSON object without any markdown formatting or code fences.`;

      const result = await this.llmAgent.getCompletion(systemPrompt, files.join("\n\n"));
      if (result.isErr()) {
        this.progress.fail("Project structure analysis failed");
        return Result.err(result.error as Error);
      }

      this.progress.update("Processing analysis results...");
      const parsedResult = this.responseParser.parseJSON<ProjectStructure>(result.value as string);
      if (parsedResult.isErr()) {
        this.progress.fail("Failed to parse analysis results");
        return parsedResult;
      }

      const finalResult = Result.ok({
        ...(parsedResult.value as ProjectStructure),
        rootDir: paths[0],
      });
      this.progress.succeed("Project structure analysis completed");
      return finalResult;
    } catch (error: any) {
      this.progress.fail("Project structure analysis failed");
      return Result.err(new Error(`Project structure analysis failed: ${error}`));
    }
  }

  async analyzeDependencies(paths: string[]): Promise<Result<DependencyGraph, Error>> {
    try {
      this.progress.start("Collecting project files...");
      const files = await this.collectProjectFiles(paths[0]);
      if (files.length === 0) {
        this.progress.fail("No files found for analysis");
        return Result.err(new Error("No files found for analysis"));
      }

      this.progress.update("Analyzing project dependencies...");
      const systemPrompt = `Analyze the project dependencies from the provided files.
        Return a JSON object with the following structure:
        {
          "dependencies": Record<string, string>,
          "devDependencies": Record<string, string>,
          "peerDependencies": Record<string, string>,
          "internalDependencies": Record<string, string[]>
        }
        Important: Return ONLY the JSON object without any markdown formatting or code fences.`;

      const result = await this.llmAgent.getCompletion(systemPrompt, files.join("\n\n"));
      if (result.isErr()) {
        this.progress.fail("Dependencies analysis failed");
        return Result.err(result.error as Error);
      }

      this.progress.update("Processing analysis results...");
      const parsedResult = this.responseParser.parseJSON<DependencyGraph>(result.value as string);
      if (parsedResult.isOk()) {
        this.progress.succeed("Dependencies analysis completed");
      } else {
        this.progress.fail("Failed to parse analysis results");
      }
      return parsedResult;
    } catch (error: any) {
      this.progress.fail("Dependencies analysis failed");
      return Result.err(new Error(`Dependencies analysis failed: ${error}`));
    }
  }

  private async isDirectory(filePath: string): Promise<Result<boolean, Error>> {
    const result = await this.fileOps.isDirectory(filePath);
    if (result.isErr()) {
      this.logger.warn(`Error checking if path is directory: ${filePath} - ${result.error}`);
      return Result.err(result.error as Error);
    }
    return Result.ok(result.value as boolean);
  }

  private async collectProjectFiles(rootDir: string): Promise<string[]> {
    try {
      const files: string[] = [];
      const excludedDirs = new Set<string>(["node_modules", "dist", ".git", "coverage"]);

      const scanDir = async (dirPath: string): Promise<void> => {
        const result = await this.fileOps.readDir(dirPath);
        if (!result.isOk() || !result.value) {
          this.logger.debug(`Failed to read directory: ${dirPath}`);
          return;
        }

        const items = result.value;
        for (const item of items) {
          const itemName: string = typeof item === "string" ? item : item.name;
          const fullPath: string = path.join(dirPath, itemName);

          if (excludedDirs.has(itemName)) {
            this.logger.debug(`Skipping excluded directory: ${itemName}`);
            continue;
          }

          const isDirResult = await this.isDirectory(fullPath);
          if (isDirResult.isErr()) {
            this.logger.warn(`Error checking directory status: ${fullPath} - ${isDirResult.error}`);
            continue;
          }

          if (isDirResult.value) {
            await scanDir(fullPath);
          } else if (this.shouldAnalyzeFile(itemName)) {
            const contentResult = await this.fileOps.readFile(fullPath);
            if (contentResult.isOk() && typeof contentResult.value === "string") {
              files.push(`File: ${path.relative(rootDir, fullPath)}\n${contentResult.value}`);
            }
          }
        }
      };

      await scanDir(rootDir);
      return files;
    } catch (error: any) {
      this.logger.error(`Error collecting project files: ${error}`);
      return [];
    }
  }

  private shouldAnalyzeFile(fileName: string): boolean {
    const commonExtensions = [".js", ".jsx", ".ts", ".tsx", ".json", ".yml", ".yaml", ".md"];

    if (
      fileName.includes(".test.") ||
      fileName.includes(".spec.") ||
      fileName.endsWith(".d.ts") ||
      fileName.endsWith(".map")
    ) {
      return false;
    }

    return commonExtensions.some((ext) => fileName.endsWith(ext));
  }
}
