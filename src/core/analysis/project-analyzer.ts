import { Injectable, Inject } from '../di/decorators';
import { IFileOperations } from '../file-operations/interfaces';
import { ILogger } from '../services/logger-service';
import { Result } from '../result/result';
import { IProjectAnalyzer, ProjectContext, GenericAstNode, TechStackAnalysis } from './types';
import { CodeInsights, IAstAnalysisService } from './ast-analysis.interfaces';
import { ITechStackAnalyzerService } from './tech-stack-analyzer';

import { LLMAgent } from '../llm/llm-agent';
import { ProgressIndicator } from '../ui/progress-indicator';
import { IFileContentCollector, FileMetadata, ITreeSitterParserService } from './interfaces';
import { IFilePrioritizer } from './interfaces';
import path from 'path';
import { EXTENSION_LANGUAGE_MAP } from './tree-sitter.config';
import { ProjectAnalyzerHelpers } from './project-analyzer.helpers';

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
    @Inject('IAstAnalysisService')
    private readonly astAnalysisService: IAstAnalysisService,
    @Inject('ITechStackAnalyzerService')
    private readonly techStackAnalyzerService: ITechStackAnalyzerService,
    @Inject('ProjectAnalyzerHelpers') private readonly helpers: ProjectAnalyzerHelpers
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

      let packageJsonData: any; // This will be cast to PackageJsonMinimal later
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
      } else {
        this.logger.warn('fileOps.readFile for package.json returned ok but value is undefined.');
      }

      this.progress.update('Analyzing tech stack...');
      this.logger.debug('Starting local tech stack analysis...');

      const localTechStackResult: TechStackAnalysis = await this.techStackAnalyzerService.analyze(
        rootPath,
        allFiles.value,
        packageJsonData
      );
      this.logger.debug('Local tech stack analysis completed.');

      this.progress.update('Analyzing project structure...');
      this.logger.debug('Starting local project structure analysis (minimal)...'); // Updated log

      this.logger.debug('Local project structure analysis (now minimal) completed.'); // Updated log

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
            continue;
          }
          const fileContent = readFileResult.value!;
          const relativePath = path.relative(rootPath, filePath).replace(/\\/g, '/');

          const parseResult: Result<GenericAstNode, Error> = this.treeSitterParserService.parse(
            fileContent,
            language
          );

          if (parseResult.isOk()) {
            validAstData.push({ relativePath, astData: parseResult.value! });
            this.logger.trace(`Successfully parsed and stored AST for ${relativePath}`); // Changed from trace
          } else {
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

      this.progress.update('Assembling final project context from local data...');
      this.logger.debug('Assembling final ProjectContext from local data sources...');
      this.logger.trace(
        `Using localTechStackResult: ${JSON.stringify(localTechStackResult, null, 2)}`
      );

      this.logger.trace(
        `Using packageJsonData: ${packageJsonData ? JSON.stringify(packageJsonData, null, 2) : 'not available'}`
      );

      this.logger.trace(
        `Using codeInsightsMap: ${Object.keys(codeInsightsMap ?? {}).length} entries`
      );

      const finalContext: ProjectContext = {
        projectRootPath: rootPath,
        techStack: localTechStackResult,
        packageJson: packageJsonData, // This should conform to PackageJsonMinimal
        codeInsights: codeInsightsMap ?? {},
      };
      this.logger.debug('Successfully assembled final ProjectContext.');

      this.progress.succeed('Project context analysis completed successfully');

      // Enhanced logging for final ProjectContext
      const finalContextString = JSON.stringify(finalContext, null, 2);
      this.logger.debug(
        `Approximate size of final ProjectContext string: ${finalContextString.length} characters.`
      );
      this.logger.info(`--- BEGIN FINAL PROJECT CONTEXT ---`);
      if (finalContextString.length > 200000) {
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
      this.logger.trace(`Final ProjectContext (TRACE - full):\n${finalContextString}`);

      const filteredContext: ProjectContext = {
        projectRootPath: finalContext.projectRootPath,
        techStack: finalContext.techStack,
        packageJson: finalContext.packageJson, // This should conform to PackageJsonMinimal
        codeInsights: finalContext.codeInsights ?? {},
      };

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
}
