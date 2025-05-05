import { Injectable, Inject } from '../di/decorators';
import { IFileOperations } from '../file-operations/interfaces';
import { ILogger } from '../services/logger-service';
import { Result } from '../result/result';
import { IProjectAnalyzer, ProjectContext, GenericAstNode } from './types'; // Import GenericAstNode
import { CodeInsights, IAstAnalysisService } from './ast-analysis.interfaces'; // Added CodeInsights, IAstAnalysisService
import { LLMAgent } from '../llm/llm-agent';
import { LLMProviderError } from '../llm/llm-provider-errors';
import { ResponseParser } from './response-parser';
import {
  BINARY_EXTENSIONS,
  SKIP_DIRECTORIES,
  ANALYZABLE_EXTENSIONS,
  ANALYZABLE_FILENAMES,
} from './constants';
import { ProgressIndicator } from '../ui/progress-indicator';
import { IFileContentCollector, FileMetadata, ITreeSitterParserService } from './interfaces'; // Import ITreeSitterParserService
import { IFilePrioritizer } from './interfaces';
import path from 'path';
import { EXTENSION_LANGUAGE_MAP } from './tree-sitter.config'; // Import language map

@Injectable()
export class ProjectAnalyzer implements IProjectAnalyzer {
  constructor(
    @Inject('IFileOperations') private readonly fileOps: IFileOperations,
    @Inject('ILogger') private readonly logger: ILogger,
    @Inject('LLMAgent') private readonly llmAgent: LLMAgent,
    @Inject('ResponseParser') private readonly responseParser: ResponseParser,
    @Inject('ProgressIndicator') private readonly progress: ProgressIndicator,
    @Inject('IFileContentCollector') private readonly contentCollector: IFileContentCollector,
    @Inject('IFilePrioritizer') private readonly filePrioritizer: IFilePrioritizer,
    @Inject('ITreeSitterParserService')
    private readonly treeSitterParserService: ITreeSitterParserService,
    /**
     * Service for analyzing AST data to extract code insights.
     */
    @Inject('IAstAnalysisService')
    private readonly astAnalysisService: IAstAnalysisService
  ) {
    this.logger.trace('ProjectAnalyzer initialized');
  }

  /**
   * Analyzes the overall project context based on the collected files.
   * This includes collecting file content, analyzing ASTs for code insights using an LLM,
   * and summarizing the project's tech stack, structure, and dependencies.
   * @param paths - An array containing the root path(s) of the project to analyze.
   * @returns A Promise resolving to a Result containing the comprehensive ProjectContext (including code insights) or an Error.
   */
  async analyzeProject(paths: string[]): Promise<Result<ProjectContext, Error>> {
    if (!paths || paths.length === 0) {
      return Result.err(new Error('No project paths provided for analysis.'));
    }
    const rootPath = paths[0]; // Assuming the first path is the primary root

    try {
      this.progress.start('Collecting project files for analysis...'); // Explicitly ignore promise

      // Calculate available tokens for file content
      const maxTokens =
        (await this.llmAgent.getModelContextWindow()) - (await this.getPromptOverheadTokens());

      // Collect all analyzable files
      const allFiles = await this.collectAnalyzableFiles(rootPath);
      if (allFiles.isErr()) {
        const error = allFiles.error || new Error('Unknown error collecting files');
        return Result.err(error);
      }

      if (!allFiles.value || allFiles.value.length === 0) {
        return Result.err(new Error('No analyzable files found'));
      }

      // Convert file paths to FileMetadata
      const fileMetadata: FileMetadata[] = allFiles.value.map((filePath) => ({
        path: filePath,
        size: 0, // Initial size, will be updated by collector
      }));

      // Prioritize files
      const prioritizedFiles = this.filePrioritizer.prioritizeFiles(fileMetadata, rootPath);

      // Collect content using the new collector
      const contentResult = await this.contentCollector.collectContent(
        prioritizedFiles.map((file) => file.path),
        rootPath,
        maxTokens
      );

      if (contentResult.isErr()) {
        this.progress.fail('Failed to collect file contents');
        const error = contentResult.error || new Error('Unknown error collecting content');
        return Result.err(error);
      }

      if (!contentResult.value) {
        this.progress.fail('No content result returned from collector');
        return Result.err(new Error('No content result returned from collector'));
      }

      const { content, metadata } = contentResult.value;

      // Check if any content was collected
      if (!content || content.length === 0) {
        this.progress.fail('No analyzable files found or collected within token limit');
        return Result.err(new Error('No analyzable files found or collected within token limit'));
      }

      this.logger.debug(`Collected ${metadata.length} files with metadata`);

      // --- Tree-sitter Parsing and Analysis Step ---
      this.progress.update('Parsing supported files for structure...');
      this.logger.debug('Starting AST generation and collection...'); // Corrected log

      /**
       * Collects valid AST data directly from synchronous parsing.
       */
      const validAstData: { relativePath: string; astData: GenericAstNode }[] = [];

      for (const filePath of allFiles.value) {
        const ext = path.extname(filePath).toLowerCase();
        const language = EXTENSION_LANGUAGE_MAP[ext];

        if (language) {
          const readFileResult = await this.fileOps.readFile(filePath);
          if (readFileResult.isErr()) {
            this.logger.warn(
              `Error reading file ${filePath} for parsing: ${readFileResult.error?.message ?? 'Unknown read error'}`
            );
            continue; // Skip this file if read fails
          }
          const fileContent = readFileResult.value!; // Renamed variable for clarity
          const relativePath = path.relative(rootPath, filePath).replace(/\\/g, '/');

          // Parse synchronously
          const parseResult: Result<GenericAstNode, Error> = this.treeSitterParserService.parse(
            fileContent, // Use fileContent here
            language
          ); // Returns Result<GenericAstNode, Error>

          if (parseResult.isOk()) {
            // Directly add valid AST data
            // Use non-null assertion as isOk() guarantees value exists
            validAstData.push({ relativePath, astData: parseResult.value! });
            this.logger.debug(`Successfully parsed and stored AST for ${relativePath}`); // Changed from trace
          } else {
            // Log warning for parsing errors (Result.err)
            // Use non-null assertion as else block implies isErr() which guarantees error exists
            this.logger.warn(
              `Tree-sitter parsing failed for ${relativePath}: ${parseResult.error!.message}` // Updated log message
            );
          }
        } else {
          this.logger.debug(`Skipping unsupported file type: ${filePath}`); // Changed from trace
        }
      }

      this.logger.debug(`Collected ${validAstData.length} valid ASTs.`);

      /**
       * Performs concurrent analysis on valid ASTs using AstAnalysisService.
       */
      const codeInsightsMap: { [filePath: string]: CodeInsights } = {};
      if (validAstData.length > 0) {
        this.progress.update(`Analyzing structure of ${validAstData.length} files...`);
        this.logger.debug(`Starting concurrent AST analysis for ${validAstData.length} files...`);

        /**
         * Concurrently analyze the collected valid ASTs using the AstAnalysisService.
         * Uses Promise.allSettled to ensure all analyses complete, even if some fail.
         */
        const analysisPromises = validAstData.map(
          ({ relativePath, astData }) => this.astAnalysisService.analyzeAst(astData, relativePath) // Returns Promise<Result<CodeInsights, Error>>
        );

        const analysisSettledResults = await Promise.allSettled(analysisPromises);

        /**
         * Processes the settled results of the concurrent AST analysis.
         * Populates the codeInsightsMap for successful analyses (Result.ok)
         * and logs warnings/errors for failed analyses (Result.err or promise rejection).
         */
        analysisSettledResults.forEach((result, index) => {
          const { relativePath } = validAstData[index];
          if (result.status === 'fulfilled') {
            // Explicitly type analysisResult
            const analysisResult: Result<CodeInsights, Error> = result.value;
            if (analysisResult.isOk()) {
              // Use non-null assertion as isOk() guarantees value exists
              codeInsightsMap[relativePath] = analysisResult.value!;
              this.logger.debug(`Successfully generated code insights for ${relativePath}`);
            } else {
              // Log warning for analysis errors (Result.err)
              // Use non-null assertion as else block implies isErr() which guarantees error exists
              this.logger.warn(
                `Failed to generate code insights for ${relativePath}: ${analysisResult.error!.message}`
              );
            }
          } else {
            // Log error for promise rejections during analysis
            this.logger.error(
              `AST analysis promise rejected for ${relativePath}: ${result.reason}`
            );
          }
        });
        this.logger.debug('Concurrent AST analysis step completed.');
      } else {
        this.logger.debug('No valid ASTs found to analyze. Skipping analysis step.');
      }
      // --- End Tree-sitter Parsing and Analysis Step ---

      const systemPrompt = this.buildSystemPrompt();
      const filePrompt = content; // Note: LLM still gets the prioritized content
      const filePromptTokenCount = await this.llmAgent.countTokens(filePrompt);
      const systemPromptTokenCount = await this.llmAgent.countTokens(systemPrompt);

      this.progress.update(
        `Collected file content (${filePromptTokenCount} tokens). Analyzing project context...`
      );

      this.logger.debug(`File prompt token count: ${filePromptTokenCount}`);
      this.logger.debug(`System prompt token count: ${systemPromptTokenCount}`);

      let llmResult: Result<string, Error> = Result.err(new Error('Initial error before LLM call')); // Renamed variable
      const maxRetries = 3;
      let currentAttempt = 0;

      while (currentAttempt < maxRetries) {
        currentAttempt++;
        this.logger.debug(`Attempt ${currentAttempt} of ${maxRetries} for LLM completion.`);
        llmResult = await this.llmAgent.getCompletion(systemPrompt, filePrompt); // Use renamed variable

        if (llmResult.isOk()) {
          // Use renamed variable
          break;
        }

        if (llmResult.isErr()) {
          // Use renamed variable
          const error = llmResult.error; // Use renamed variable
          if (error instanceof LLMProviderError && error.code === 'INVALID_RESPONSE_FORMAT') {
            this.logger.warn(
              `LLM returned invalid response format on attempt ${currentAttempt}. Retrying...`
            );
            if (currentAttempt < maxRetries) {
              const delay = Math.pow(2, currentAttempt) * 100;
              await new Promise((resolve) => setTimeout(resolve, delay));
            } else {
              this.logger.error(
                `LLM call failed after ${maxRetries} attempts due to invalid response format.`
              );
              break;
            }
          } else {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(
              `LLM call failed on attempt ${currentAttempt} with unexpected error: ${errorMessage}`
            );
            break;
          }
        }
      }

      if (llmResult.isErr()) {
        // Use renamed variable
        this.progress.fail('Project context analysis failed after multiple LLM attempts');
        return Result.err(llmResult.error as Error); // Use renamed variable
      }

      this.progress.update('Processing analysis results...');
      const parsedResult = this.responseParser.parseLlmResponse<ProjectContext>(
        llmResult.value as string // Use renamed variable
      );

      if (parsedResult.isErr()) {
        this.progress.fail('Failed to parse analysis results from LLM');
        this.logger.error(`Failed to parse LLM response: ${llmResult.value}`, parsedResult.error); // Use renamed variable
        return parsedResult;
      }

      if (!parsedResult.value) {
        this.progress.fail('Parsed analysis result value is undefined');
        this.logger.error(
          'Parsed analysis result value is undefined, though parsing was successful.'
        );
        return Result.err(new Error('Parsed analysis result value is undefined'));
      }

      // Log the generated ProjectContext for inspection
      this.logger.debug('Generated ProjectContext:');
      this.logger.debug(JSON.stringify(parsedResult.value, null, 2));

      const techStack = parsedResult.value.techStack ?? {
        languages: [],
        frameworks: [],
        buildTools: [],
        testingFrameworks: [],
        linters: [],
        packageManager: '',
      };
      // Create base structure with defaults
      const baseStructure = {
        rootDir: '',
        sourceDir: '',
        testDir: '',
        configFiles: [],
        mainEntryPoints: [],
        componentStructure: {},
      };

      // Merge with parsed result, ensuring componentStructure is never null
      const structure = {
        ...baseStructure,
        ...parsedResult.value.structure,
        componentStructure: parsedResult.value.structure?.componentStructure ?? {},
      };

      // Create base dependencies with empty objects
      const baseDependencies = {
        dependencies: {},
        devDependencies: {},
        peerDependencies: {},
        internalDependencies: {},
      };

      // Merge with parsed result, ensuring nested objects are never null
      const dependencies = {
        ...baseDependencies,
        ...parsedResult.value.dependencies,
        dependencies: parsedResult.value.dependencies?.dependencies ?? {},
        devDependencies: parsedResult.value.dependencies?.devDependencies ?? {},
        peerDependencies: parsedResult.value.dependencies?.peerDependencies ?? {},
        internalDependencies: parsedResult.value.dependencies?.internalDependencies ?? {},
      };

      // Assemble final context using results from LLM context analysis and code insights
      const finalContext: ProjectContext = {
        techStack,
        structure: {
          ...structure,
          rootDir: rootPath,
          componentStructure: structure.componentStructure ?? {},
        },
        dependencies: {
          ...dependencies,
          dependencies: dependencies.dependencies ?? {},
          devDependencies: dependencies.devDependencies ?? {},
          peerDependencies: dependencies.peerDependencies ?? {},
          internalDependencies: dependencies.internalDependencies ?? {},
        },
        codeInsights: codeInsightsMap ?? {}, // Ensure codeInsights is always included with default
      };

      this.progress.succeed('Project context analysis completed successfully');
      this.logger.debug(
        `Final ProjectContext (including codeInsights):\n${JSON.stringify(finalContext, null, 2)}`
      );

      // --- TEMPORARY LOGGING REMOVED ---

      /**
       * Filter the assembled context to ensure it strictly adheres to the ProjectContext interface.
       * This prevents leaking intermediate data structures or properties used during analysis.
       * Creates a new object and explicitly copies only the defined properties.
       * Note: astData is intentionally excluded as per requirements.
       */
      const filteredContext: ProjectContext = {
        techStack: finalContext.techStack,
        structure: {
          ...finalContext.structure,
          componentStructure: finalContext.structure?.componentStructure ?? {},
        },
        dependencies: {
          ...finalContext.dependencies,
          dependencies: finalContext.dependencies?.dependencies ?? {},
          devDependencies: finalContext.dependencies?.devDependencies ?? {},
          peerDependencies: finalContext.dependencies?.peerDependencies ?? {},
          internalDependencies: finalContext.dependencies?.internalDependencies ?? {},
        },
        codeInsights: finalContext.codeInsights ?? {}, // Always include codeInsights with default
      };

      return Result.ok(filteredContext); // Return the filtered context
    } catch (error) {
      this.progress.fail('Project context analysis failed');
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCause = error instanceof Error ? error : undefined;
      this.logger.error(`Project context analysis failed: ${errorMessage}`, errorCause);
      return Result.err(new Error(`Project context analysis failed: ${errorMessage}`));
    }
  }

  private async collectAnalyzableFiles(rootDir: string): Promise<Result<string[], Error>> {
    try {
      const allFiles: string[] = [];
      // Modify scanDir to return a Result for better error propagation
      const scanDir = async (dirPath: string): Promise<Result<void, Error>> => {
        const readDirResult = await this.fileOps.readDir(dirPath); // Renamed variable
        if (readDirResult.isErr()) {
          // Use renamed variable
          // Return error Result instead of throwing
          return Result.err(
            new Error(
              `Read directory failed: ${readDirResult.error instanceof Error ? readDirResult.error.message : String(readDirResult.error)}` // Use renamed variable
            )
          );
        }
        if (!readDirResult.value) {
          // Use renamed variable
          // Handle case where readDir succeeds but returns no value (shouldn't happen with Dirent[])
          this.logger.warn(`readDir for ${dirPath} returned ok but no value.`);
          return Result.ok(undefined); // Return ok if just warning
        }

        const items = readDirResult.value; // Use renamed variable
        for (const item of items) {
          const itemName: string = typeof item === 'string' ? item : item.name;
          const fullPath: string = path.join(dirPath, itemName);

          if (SKIP_DIRECTORIES.has(itemName)) {
            this.logger.trace(`Skipping excluded directory: ${itemName}`);
            continue;
          }

          if (itemName.startsWith('.')) {
            this.logger.trace(`Skipping hidden item: ${itemName}`);
            continue;
          }

          const isDirResult = await this.isDirectory(fullPath);
          if (isDirResult.isErr()) {
            // Return error Result instead of throwing
            this.logger.warn(`Error checking directory status: ${fullPath} - ${isDirResult.error}`); // Keep warn log
            return Result.err(
              new Error(
                `Is directory check failed: ${isDirResult.error instanceof Error ? isDirResult.error.message : String(isDirResult.error)}`
              )
            );
          }

          if (isDirResult.value) {
            // Check result of recursive call
            const scanResult = await scanDir(fullPath);
            if (scanResult.isErr()) {
              return scanResult; // Propagate error up
            }
          } else if (this.shouldAnalyzeFile(fullPath)) {
            allFiles.push(fullPath);
          }
        }
        // If loop completes without error, return success
        return Result.ok(undefined);
      };

      const startTime = Date.now();
      // Check the result of the initial scanDir call
      const finalScanResult = await scanDir(rootDir);
      if (finalScanResult.isErr()) {
        // If scanDir returned an error, propagate it correctly typed
        return Result.err(finalScanResult.error as Error);
      }
      const elapsedTime = Date.now() - startTime;
      this.logger.info(
        `File path collection completed in ${elapsedTime} ms. Found ${allFiles.length} analyzable files.`
      );

      return Result.ok(allFiles);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error collecting analyzable files: ${errorMessage}`);
      return Result.err(new Error(`Error collecting analyzable files: ${errorMessage}`));
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

  private shouldAnalyzeFile(filePath: string): boolean {
    const fileName = path.basename(filePath);
    const ext = path.extname(fileName).toLowerCase();

    if (
      fileName.includes('.test.') ||
      fileName.includes('.spec.') ||
      fileName.endsWith('.d.ts') ||
      fileName.endsWith('.map') ||
      fileName === 'package-lock.json' ||
      fileName === 'yarn.lock' ||
      fileName.endsWith('.lock')
    ) {
      this.logger.trace(`Skipping test/generated/lock file: ${fileName}`);
      return false;
    }

    if (BINARY_EXTENSIONS.has(ext)) {
      this.logger.trace(`Skipping binary file: ${fileName}`);
      return false;
    }

    if (ANALYZABLE_FILENAMES.has(fileName)) {
      this.logger.trace(`Including known filename: ${fileName}`);
      return true;
    }

    if (ANALYZABLE_EXTENSIONS.has(ext)) {
      this.logger.trace(`Including file with known extension: ${fileName}`);
      return true;
    }

    if (!ext && ANALYZABLE_FILENAMES.has(fileName)) {
      this.logger.trace(`Including known filename without extension: ${fileName}`);
      return true;
    }

    this.logger.trace(`Skipping file by default: ${fileName}`);
    return false;
  }

  private readonly PROMPT_VERSION = 'v1.1.0'; // Incremented for TSK-007

  private buildSystemPrompt(): string {
    return `Prompt Version: ${this.PROMPT_VERSION}

IMPORTANT NOTICE:
- This analysis is based on a PARTIAL codebase view.
- Focus ONLY on the provided files. Do not make assumptions about files not shown.
- If uncertain about any aspect, return null or empty arrays/objects as appropriate.
- Keys for file-specific information (internalDependencies) MUST be relative paths from the project root.

Analyze the provided project files to determine its overall context.
Return a single JSON object containing the tech stack, project structure, and dependencies.

Instructions for specific fields:
- dependencies.internalDependencies: For each file provided, identify imported modules/files (both package imports like 'react' and relative project imports like './utils') and list them as strings under this field, keyed by the relative file path.

The response MUST strictly follow this JSON schema:
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
            "rootDir": string, // The absolute root path provided (already filled)
            "sourceDir": string, // Relative path(s) from rootDir to main source code (e.g., "src", "app")
            "testDir": string, // Relative path(s) from rootDir to main test code (e.g., "tests", "spec")
            "configFiles": string[], // Relative paths from rootDir to key config files (e.g., "tsconfig.json", "pyproject.toml")
            "mainEntryPoints": string[], // Relative paths from rootDir to main application entry points (e.g., "src/index.ts", "app/main.py")
            "componentStructure": Record<string, string[]> // Optional: Map of component types/locations if identifiable
          },
          "dependencies": {
            "dependencies": Record<string, string>, // { "react": "^18.0.0" }
            "devDependencies": Record<string, string>, // { "jest": "^29.0.0" }
            "peerDependencies": Record<string, string>, // { "react": ">=17.0.0" }
            "internalDependencies": Record<string, string[]> // Key: relative file path, Value: List of imported module/file paths (e.g., ["react", "./utils"])
          }
   
        }
        Important Reminders:
        - Analyze based *only* on the provided file contents.
        - Infer fields like 'sourceDir', 'testDir', 'mainEntryPoints' based on common conventions and file contents.
        - If a field cannot be determined, return an empty array [], empty object {}, or null as appropriate for the type.
        - Return ONLY the JSON object without any surrounding text, explanations, markdown formatting, or code fences.

        Provided file contents:
        [FILE CONTENTS GO HERE]`;
  }

  private async getPromptOverheadTokens(): Promise<number> {
    const basePromptTemplate = this.buildSystemPrompt();
    const providerResult = await this.llmAgent.getProvider();
    if (providerResult.isErr() || !providerResult.value) {
      this.logger.warn(
        'LLM Provider or countTokens method not available for prompt overhead token estimation. Using default overhead.'
      );
      return 1000; // Default overhead estimation for safety
    }

    // Include version, schema, and warnings in overhead calculation
    const templateWithoutContent = basePromptTemplate.replace('[FILE CONTENTS GO HERE]', '');
    const overhead: number = await providerResult.value.countTokens(templateWithoutContent);

    // Add safety margin for schema validation and version info
    return Math.ceil(overhead * 1.1);
  }
}
