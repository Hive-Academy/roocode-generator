import { Injectable, Inject } from '../di/decorators';
import { IFileOperations } from '../file-operations/interfaces';
import { ILogger } from '../services/logger-service';
import { Result } from '../result/result';
import {
  IProjectAnalyzer,
  ProjectContext,
  GenericAstNode,
  TechStackAnalysis,
  ProjectStructure,
  DirectoryNode,
} from './types'; // Import GenericAstNode, TechStackAnalysis
import { CodeInsights, IAstAnalysisService } from './ast-analysis.interfaces'; // Added CodeInsights, IAstAnalysisService
import { ITechStackAnalyzerService } from './tech-stack-analyzer'; // Added TechStackAnalyzerService import
import * as StructureHelpers from './structure-helpers'; // Added import for structure helpers
import { TsConfigLike } from './structure-helpers'; // Import TsConfigLike
import {
  deriveInternalDependencies,
  TsConfigPathsInfo,
  CodeInsightsMap,
} from './dependency-helpers';
import { LLMAgent } from '../llm/llm-agent';
// BINARY_EXTENSIONS, SKIP_DIRECTORIES, ANALYZABLE_EXTENSIONS, ANALYZABLE_FILENAMES are now in helpers
import { ProgressIndicator } from '../ui/progress-indicator';
import { IFileContentCollector, FileMetadata, ITreeSitterParserService } from './interfaces'; // Import ITreeSitterParserService
import { IFilePrioritizer } from './interfaces';
import { parseRobustJson } from '../utils/json-utils'; // Added import
import path from 'path';
import { EXTENSION_LANGUAGE_MAP } from './tree-sitter.config'; // Import language map
import { ProjectAnalyzerHelpers } from './project-analyzer.helpers'; // Import the new helper class

@Injectable()
export class ProjectAnalyzer implements IProjectAnalyzer {
  constructor(
    @Inject('IFileOperations') private readonly fileOps: IFileOperations, // Kept for other methods
    @Inject('ILogger') private readonly logger: ILogger, // Kept for other methods
    @Inject('LLMAgent') private readonly llmAgent: LLMAgent,
    @Inject('ProgressIndicator') private readonly progress: ProgressIndicator,
    @Inject('IFileContentCollector') private readonly contentCollector: IFileContentCollector,
    @Inject('IFilePrioritizer') private readonly filePrioritizer: IFilePrioritizer,
    @Inject('ITreeSitterParserService')
    private readonly treeSitterParserService: ITreeSitterParserService,
    /**
     * Service for analyzing AST data to extract code insights.
     */
    @Inject('IAstAnalysisService')
    private readonly astAnalysisService: IAstAnalysisService,
    /**
     * Service for analyzing the technology stack locally.
     */
    @Inject('ITechStackAnalyzerService')
    private readonly techStackAnalyzerService: ITechStackAnalyzerService,
    @Inject('ProjectAnalyzerHelpers') private readonly helpers: ProjectAnalyzerHelpers // Inject the helper
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
      // Use the model's context window as the budget for file content collection.
      // This is a general budget, not tied to a specific LLM prompt within this method,
      // as the direct LLM call for context generation is being removed.
      const maxTokens = await this.llmAgent.getModelContextWindow();
      this.logger.info(
        `Using model context window as maxTokens budget for file content collection: ${maxTokens}`
      );

      // Collect all analyzable files
      const allFiles = await this.helpers.collectAnalyzableFiles(rootPath);
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

      // --- Read and parse package.json (Temporary for TSK-016) ---
      // TODO: Implement robust handling for various package managers/config files in a future task.

      let packageJsonData: any;
      const packageJsonPath = path.join(rootPath, 'package.json');
      this.logger.debug(`Attempting to read package.json from: ${packageJsonPath}`);
      const packageJsonReadResult = await this.fileOps.readFile(packageJsonPath);

      if (packageJsonReadResult.isOk() && packageJsonReadResult.value) {
        try {
          packageJsonData = JSON.parse(packageJsonReadResult.value);
          this.logger.debug('Successfully read and parsed package.json');
        } catch (parseError) {
          this.logger.warn(
            `Failed to parse package.json: ${parseError instanceof Error ? parseError.message : String(parseError)}`
          );
          // Continue without package.json data
        }
      } else if (packageJsonReadResult.isErr()) {
        // Log error if file read failed for reasons other than not found
        if (!packageJsonReadResult.error?.message.includes('ENOENT')) {
          this.logger.warn(
            `Failed to read package.json: ${packageJsonReadResult.error?.message ?? 'Unknown read error'}`
          );
        } else {
          this.logger.debug(
            `package.json not found at ${packageJsonPath}. Analysis will proceed without it.`
          );
        }
        // Continue without package.json data
      } else {
        // Handle case where read is ok but value is undefined (shouldn't happen with readFile)
        this.logger.warn('fileOps.readFile for package.json returned ok but value is undefined.');
      }
      // --- End package.json processing ---

      // --- Local Tech Stack Analysis ---
      this.progress.update('Analyzing tech stack...');
      this.logger.debug('Starting local tech stack analysis...');
      // Note: allFiles.value is guaranteed to exist here due to earlier checks

      const localTechStackResult: TechStackAnalysis = await this.techStackAnalyzerService.analyze(
        rootPath,
        allFiles.value,
        packageJsonData
      );
      this.logger.debug('Local tech stack analysis completed.');
      // --- End Local Tech Stack Analysis ---

      // --- Local Project Structure Analysis ---
      this.progress.update('Analyzing project structure...');
      this.logger.debug('Starting local project structure analysis...');

      const tsconfigPath = 'tsconfig.json'; // Assuming tsconfig.json is at the root
      let tsconfigContent: TsConfigLike | undefined; // Typed tsconfigContent
      const absoluteTsconfigPath = path.join(rootPath, tsconfigPath);
      const tsconfigExistsResult = await this.fileOps.exists(absoluteTsconfigPath);

      if (tsconfigExistsResult.isOk() && tsconfigExistsResult.value) {
        const tsconfigFileReadResult = await this.fileOps.readFile(absoluteTsconfigPath);
        if (tsconfigFileReadResult.isOk() && tsconfigFileReadResult.value) {
          const fileContentString = tsconfigFileReadResult.value;
          try {
            const cleanedFileContentString = this.helpers.stripJsonComments(fileContentString);
            tsconfigContent = await parseRobustJson(cleanedFileContentString, this.logger);
            this.logger.debug(
              `Successfully parsed tsconfig.json using parseRobustJson from: ${absoluteTsconfigPath}`
            );
          } catch (error) {
            // parseRobustJson already logs detailed errors, so just a general warning here.
            this.logger.warn(
              `Failed to robustly parse tsconfig.json from ${absoluteTsconfigPath}. Error: ${error instanceof Error ? error.message : String(error)}`
            );
            // tsconfigContent will remain undefined, and downstream logic should handle it.
          }
        } else if (tsconfigFileReadResult.isErr()) {
          this.logger.warn(
            `Failed to read tsconfig.json at ${absoluteTsconfigPath}: ${tsconfigFileReadResult.error?.message ?? 'Unknown read error'}`
          );
        }
      } else {
        this.logger.debug(
          `tsconfig.json not found at ${absoluteTsconfigPath} or could not check existence.`
        );
      }

      const sourceDir = await StructureHelpers.findSourceDir(
        rootPath,
        this.fileOps,
        tsconfigContent // Pass only the parsed content
      );
      this.logger.debug(`Determined sourceDir: ${sourceDir}`);
      const testDir = await StructureHelpers.findTestDir(
        rootPath,
        this.fileOps,
        tsconfigContent // Pass only the parsed content
      );
      this.logger.debug(`Determined testDir: ${testDir}`);
      const configFiles = await StructureHelpers.findConfigFiles(rootPath, this.fileOps);
      this.logger.debug(`Found configFiles: ${configFiles.join(', ')}`);

      const mainEntryPoints = await StructureHelpers.findMainEntryPoints(
        rootPath,
        packageJsonData,
        sourceDir,
        this.fileOps,
        tsconfigContent
      );
      this.logger.debug(`Determined mainEntryPoints: ${mainEntryPoints.join(', ')}`);

      const directoryTree: DirectoryNode[] = await StructureHelpers.generateDirectoryTree(
        rootPath,
        '.', // Start scanning from the root directory itself
        this.fileOps,
        this.helpers.shouldAnalyzeFile.bind(this.helpers) // Use helper method
      );
      this.logger.debug('Generated directoryTree.');

      const localProjectStructure: ProjectStructure = {
        rootDir: rootPath,
        sourceDir: sourceDir || '', // Default to empty string if undefined
        testDir: testDir || '', // Default to empty string if undefined
        configFiles: configFiles,
        mainEntryPoints: mainEntryPoints,
        directoryTree: directoryTree,
        componentStructure: {}, // Initialize as empty object
      };
      this.logger.debug('Local project structure analysis completed.');
      // --- End Local Project Structure Analysis ---

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
            this.logger.trace(`Successfully parsed and stored AST for ${relativePath}`); // Changed from trace
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
              this.logger.trace(`Successfully generated code insights for ${relativePath}`);
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

      // --- Local Internal Dependencies Analysis ---
      this.progress.update('Analyzing internal dependencies...');
      this.logger.debug('Starting local internal dependencies analysis...');
      let tsconfigPaths: TsConfigPathsInfo | undefined = undefined;
      if (
        tsconfigContent &&
        tsconfigContent.compilerOptions &&
        typeof tsconfigContent.compilerOptions.baseUrl === 'string'
      ) {
        const baseUrlString: string = tsconfigContent.compilerOptions.baseUrl;
        const absoluteBaseUrl = path.resolve(rootPath, baseUrlString);
        tsconfigPaths = {
          baseUrl: absoluteBaseUrl,
          paths: tsconfigContent.compilerOptions.paths,
        };
        this.logger.debug(
          `Prepared tsconfigPathsInfo for dependency analysis: baseUrl='${absoluteBaseUrl}', paths available: ${!!tsconfigContent.compilerOptions.paths}`
        );
      } else {
        this.logger.debug(
          'tsconfig.json baseUrl not found or tsconfigContent not available, proceeding without alias path info for dependency analysis.'
        );
      }

      this.logger.debug(
        'Transforming codeInsightsMap keys to absolute paths for internal dependency analysis...'
      );
      const absoluteCodeInsightsMap: CodeInsightsMap = {};
      for (const relativeKey in codeInsightsMap) {
        if (Object.prototype.hasOwnProperty.call(codeInsightsMap, relativeKey)) {
          const absoluteKey = path.resolve(rootPath, relativeKey);
          absoluteCodeInsightsMap[absoluteKey] = codeInsightsMap[relativeKey];
        }
      }
      this.logger.debug(
        `Transformed ${Object.keys(absoluteCodeInsightsMap).length} code insight keys to absolute paths.`
      );

      const localInternalDependencies = deriveInternalDependencies(
        absoluteCodeInsightsMap, // Use the new map with absolute keys
        rootPath,
        tsconfigPaths
      );
      this.logger.debug('Local internal dependencies analysis completed.');
      // --- End Local Internal Dependencies Analysis ---

      // LLM-based context generation, parsing, and merging has been removed.
      // All context components are now derived locally.
      this.progress.update('Assembling final project context from local data...');
      this.logger.debug('Assembling final ProjectContext from local data sources...');
      this.logger.trace(
        `Using localTechStackResult: ${JSON.stringify(localTechStackResult, null, 2)}`
      );
      this.logger.trace(
        `Using localProjectStructure: ${JSON.stringify(localProjectStructure, null, 2)}`
      );
      this.logger.trace(
        `Using packageJsonData for external dependencies: ${packageJsonData ? JSON.stringify(packageJsonData, null, 2) : 'not available'}`
      );
      this.logger.trace(
        `Using localInternalDependencies: ${JSON.stringify(localInternalDependencies, null, 2)}`
      );
      this.logger.trace(
        `Using codeInsightsMap: ${Object.keys(codeInsightsMap ?? {}).length} entries`
      );

      const finalContext: ProjectContext = {
        techStack: localTechStackResult,
        structure: localProjectStructure,
        dependencies: {
          dependencies: packageJsonData?.dependencies ?? {},
          devDependencies: packageJsonData?.devDependencies ?? {},
          peerDependencies: packageJsonData?.peerDependencies ?? {},
          internalDependencies: localInternalDependencies ?? {},
        },
        codeInsights: codeInsightsMap ?? {},
        packageJson: packageJsonData,
      };
      this.logger.debug('Successfully assembled final ProjectContext.');

      this.progress.succeed('Project context analysis completed successfully');

      // Enhanced logging for final ProjectContext
      const finalContextString = JSON.stringify(finalContext, null, 2);
      this.logger.debug(
        `Approximate size of final ProjectContext string: ${finalContextString.length} characters.`
      );
      this.logger.info(`--- BEGIN FINAL PROJECT CONTEXT ---`);
      // Log in chunks if too large for a single log entry, or consider writing to a temp file if essential for debugging large contexts.
      // For now, attempting to log directly. If this causes issues, will revise.
      if (finalContextString.length > 200000) {
        // Arbitrary limit for a single log, adjust as needed
        this.logger.info(
          'Final ProjectContext is very large, logging first 200KB. Full context logged at TRACE level if enabled and successful.'
        );
        this.logger.info(
          finalContextString.substring(0, 200000) + '\n... (TRUNCATED IN INFO LOG) ...'
        );
      } else {
        this.logger.info(finalContextString);
      }
      this.logger.info(`--- END FINAL PROJECT CONTEXT ---`);
      this.logger.trace(
        // Keep trace for potentially very verbose full output if stringify succeeds
        `Final ProjectContext (TRACE - full):\n${finalContextString}`
      );

      // --- TEMPORARY LOGGING REMOVED ---

      /**
       * Filter the assembled context to ensure it strictly adheres to the ProjectContext interface.
       * This prevents leaking intermediate data structures or properties used during analysis.
       * Creates a new object and explicitly copies only the defined properties.
       * Note: astData is intentionally excluded as per requirements.
       */
      const filteredContext: ProjectContext = {
        techStack: finalContext.techStack, // This will be localTechStackResult
        structure: finalContext.structure, // This will be localProjectStructure
        dependencies: {
          ...finalContext.dependencies,
          dependencies: finalContext.dependencies?.dependencies ?? {},
          devDependencies: finalContext.dependencies?.devDependencies ?? {},
          peerDependencies: finalContext.dependencies?.peerDependencies ?? {},
          internalDependencies: finalContext.dependencies?.internalDependencies ?? {},
        },
        codeInsights: finalContext.codeInsights ?? {}, // Always include codeInsights with default
        packageJson: finalContext.packageJson, // Include packageJson in filtered context
      };

      // Save the final context to a file for E2E verification
      // This operation handles its own errors and does not interrupt the main flow.
      await this.helpers.saveProjectContextToFile(filteredContext, rootPath); // Use helper method

      return Result.ok(filteredContext); // Return the filtered context
    } catch (error) {
      this.progress.fail('Project context analysis failed');
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCause = error instanceof Error ? error : undefined;
      this.logger.error(`Project context analysis failed: ${errorMessage}`, errorCause);
      return Result.err(new Error(`Project context analysis failed: ${errorMessage}`));
    }
  }

  // Removed collectAnalyzableFiles
  // Removed isDirectory
  // Removed shouldAnalyzeFile
  // Removed stripJsonComments
  // Removed _saveProjectContextToFile
}
