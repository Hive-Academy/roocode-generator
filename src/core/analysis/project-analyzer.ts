import { Injectable, Inject } from '../di/decorators';
import { IFileOperations } from '../file-operations/interfaces';
import { ILogger } from '../services/logger-service';
import { Result } from '../result/result';
import { IProjectAnalyzer, ProjectContext } from './types'; // Ensure specific types are removed if unused
import { LLMAgent } from '../llm/llm-agent';
import { ResponseParser } from './response-parser';
import {
  BINARY_EXTENSIONS,
  SKIP_DIRECTORIES,
  ANALYZABLE_EXTENSIONS,
  ANALYZABLE_FILENAMES,
} from './constants'; // Import constants
import { ProgressIndicator } from '../ui/progress-indicator';
import path from 'path';

@Injectable()
export class ProjectAnalyzer implements IProjectAnalyzer {
  constructor(
    @Inject('IFileOperations') private readonly fileOps: IFileOperations,
    @Inject('ILogger') private readonly logger: ILogger,
    @Inject('LLMAgent') private readonly llmAgent: LLMAgent,
    @Inject('ResponseParser') private readonly responseParser: ResponseParser,
    @Inject('ProgressIndicator') private readonly progress: ProgressIndicator
  ) {
    this.logger.debug('ProjectAnalyzer initialized');
  }
  /**
   * Analyzes the overall project context based on the collected files.
   * @param paths - An array containing the root path(s) of the project to analyze.
   * @returns A Promise resolving to a Result containing the comprehensive ProjectContext or an Error.
   */
  async analyzeProject(paths: string[]): Promise<Result<ProjectContext, Error>> {
    if (!paths || paths.length === 0) {
      return Result.err(new Error('No project paths provided for analysis.'));
    }
    const rootPath = paths[0]; // Assuming the first path is the primary root

    try {
      this.progress.start('Collecting project files for analysis...');
      const files = await this.collectProjectFiles(rootPath);
      if (files.length === 0) {
        this.progress.fail('No analyzable files found in the project');
        return Result.err(new Error('No analyzable files found for analysis'));
      }
      this.progress.update(`Collected ${files.length} files. Analyzing project context...`);

      // Consolidated prompt for comprehensive analysis
      const systemPrompt = `Analyze the provided project files to determine its overall context.
        Return a single JSON object containing the tech stack, project structure, and dependencies.
        The JSON object must strictly adhere to the following structure:
        {
          "techStack": {
            "languages": string[], // e.g., ["TypeScript", "JavaScript", "Python"]
            "frameworks": string[], // e.g., ["React", "Express", "FastAPI"]
            "buildTools": string[], // e.g., ["Webpack", "tsc", "pip"]
            "testingFrameworks": string[], // e.g., ["Jest", "pytest"]
            "linters": string[], // e.g., ["ESLint", "Prettier", "Flake8"]
            "packageManager": string // e.g., "npm", "yarn", "pip", "maven", "gradle", "cargo"
          },
          "structure": {
            "rootDir": string, // The absolute root path provided
            "sourceDir": string, // Relative path(s) from rootDir to main source code (e.g., "src", "app")
            "testDir": string, // Relative path(s) from rootDir to main test code (e.g., "tests", "spec")
            "configFiles": string[], // Relative paths from rootDir to key config files (e.g., "tsconfig.json", "pyproject.toml")
            "mainEntryPoints": string[], // Relative paths from rootDir to main application entry points (e.g., "src/index.ts", "app/main.py")
            "componentStructure": Record<string, string[]> // Optional: Map of component types/locations if identifiable (e.g., { "ui": ["src/components/ui/Button.tsx"] })
          },
          "dependencies": {
            "dependencies": Record<string, string>, // { "react": "^18.0.0" }
            "devDependencies": Record<string, string>, // { "jest": "^29.0.0" }
            "peerDependencies": Record<string, string>, // { "react": ">=17.0.0" }
            "internalDependencies": Record<string, string[]> // Optional: Map of internal modules to their dependencies { "src/utils/helper.ts": ["src/core/types.ts"] }
          }
        }
        Important:
        - Analyze based *only* on the provided file contents.
        - Infer fields like 'sourceDir', 'testDir', 'mainEntryPoints' based on common conventions and file contents.
        - If a field cannot be determined (e.g., no clear package manager), return an empty array [] or empty object {} or null as appropriate for the type.
        - Return ONLY the JSON object without any surrounding text, explanations, markdown formatting, or code fences.`;

      const result = await this.llmAgent.getCompletion(systemPrompt, files.join('\n\n---\n\n')); // Use separator for clarity
      if (result.isErr()) {
        this.progress.fail('Project context analysis failed during LLM call');
        return Result.err(result.error as Error);
      }

      this.progress.update('Processing analysis results...');
      const parsedResult = this.responseParser.parseJSON<ProjectContext>(result.value as string);

      if (parsedResult.isErr()) {
        this.progress.fail('Failed to parse analysis results from LLM');
        this.logger.error(`Failed to parse LLM response: ${result.value}`, parsedResult.error);
        return parsedResult; // Return the error Result
      }

      // Add check for undefined value after isOk() check
      if (!parsedResult.value) {
        this.progress.fail('Parsed analysis result value is undefined');
        this.logger.error(
          'Parsed analysis result value is undefined, though parsing was successful.'
        );
        return Result.err(new Error('Parsed analysis result value is undefined'));
      }

      // Ensure rootDir is correctly set from the input path
      // Also handle cases where LLM might return null/undefined for nested objects
      const techStack = parsedResult.value.techStack ?? {
        languages: [],
        frameworks: [],
        buildTools: [],
        testingFrameworks: [],
        linters: [],
        packageManager: '',
      };
      const structure = parsedResult.value.structure ?? {
        rootDir: '',
        sourceDir: '',
        testDir: '',
        configFiles: [],
        mainEntryPoints: [],
        componentStructure: {},
      };
      const dependencies = parsedResult.value.dependencies ?? {
        dependencies: {},
        devDependencies: {},
        peerDependencies: {},
        internalDependencies: {},
      };

      const finalContext: ProjectContext = {
        techStack,
        structure: {
          ...structure,
          rootDir: rootPath, // Override rootDir with the actual input path
        },
        dependencies,
      };

      this.progress.succeed('Project context analysis completed successfully');
      return Result.ok(finalContext);
    } catch (error) {
      // Keep 'any' removed
      this.progress.fail('Project context analysis failed');
      // Safer error handling for logging
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCause = error instanceof Error ? error : undefined; // Keep this check
      this.logger.error(`Project context analysis failed: ${errorMessage}`, errorCause);
      return Result.err(new Error(`Project context analysis failed: ${errorMessage}`));
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
      // Use the more comprehensive SKIP_DIRECTORIES set
      // const excludedDirs = new Set<string>(['node_modules', 'dist', '.git', 'coverage']); // Old version

      const scanDir = async (dirPath: string): Promise<void> => {
        const result = await this.fileOps.readDir(dirPath);
        if (!result.isOk() || !result.value) {
          this.logger.debug(`Failed to read directory: ${dirPath}`);
          return;
        }

        const items = result.value;
        for (const item of items) {
          const itemName: string = typeof item === 'string' ? item : item.name;
          const fullPath: string = path.join(dirPath, itemName);

          // Use the imported SKIP_DIRECTORIES set
          if (SKIP_DIRECTORIES.has(itemName)) {
            this.logger.debug(`Skipping excluded directory: ${itemName}`);
            continue;
          }

          // Skip hidden files/directories (starting with '.')
          if (itemName.startsWith('.')) {
            this.logger.debug(`Skipping hidden item: ${itemName}`);
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
            if (contentResult.isOk() && typeof contentResult.value === 'string') {
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

  private shouldAnalyzeFile(filePath: string): boolean {
    const fileName = path.basename(filePath);
    const ext = path.extname(fileName).toLowerCase();

    // 1. Skip specific test/generated files
    if (
      fileName.includes('.test.') ||
      fileName.includes('.spec.') ||
      fileName.endsWith('.d.ts') ||
      fileName.endsWith('.map') ||
      fileName === 'package-lock.json' || // Explicitly skip lock files
      fileName === 'yarn.lock' ||
      fileName.endsWith('.lock') // e.g., Cargo.lock
    ) {
      this.logger.debug(`Skipping test/generated/lock file: ${fileName}`);
      return false;
    }

    // 2. Skip binary files based on extension (using imported constant)
    if (BINARY_EXTENSIONS.has(ext)) {
      this.logger.debug(`Skipping binary file: ${fileName}`);
      return false;
    }

    // 3. Check against known analyzable filenames (using imported constant)
    if (ANALYZABLE_FILENAMES.has(fileName)) {
      this.logger.debug(`Including known filename: ${fileName}`);
      return true;
    }

    // 4. Check against known analyzable extensions (using imported constant)
    if (ANALYZABLE_EXTENSIONS.has(ext)) {
      this.logger.debug(`Including file with known extension: ${fileName}`);
      return true;
    }

    // 5. Fallback for files without extensions but potentially analyzable (using imported constant)
    if (!ext && ANALYZABLE_FILENAMES.has(fileName)) {
      this.logger.debug(`Including known filename without extension: ${fileName}`);
      return true;
    }

    this.logger.debug(`Skipping file by default: ${fileName}`);
    return false; // Default to false if none of the above conditions match
  }
}
