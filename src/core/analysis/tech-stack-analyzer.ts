import { Injectable, Inject } from '../di/decorators';
import { IFileOperations } from '../file-operations/interfaces';
import { ILogger } from '../services/logger-service';
import { TechStackAnalysis } from './types'; // Removed PackageJsonData
import {
  deriveLanguages,
  inferTechnologiesFromDependencies,
  detectPackageManager,
} from './tech-stack-helpers';
// Removed unused path import

/**
 * Interface for the TechStackAnalyzerService.
 * Provides methods to analyze and determine the technology stack of a project.
 */
export interface ITechStackAnalyzerService {
  /**
   * Analyzes the project's files and configuration to determine its technology stack.
   * @param rootDir - The root directory of the project.
   * @param filePaths - An array of all analyzable file paths within the project.
   * @param packageJsonData - Optional parsed content of the project's package.json.
   * @returns A Promise resolving to a TechStackAnalysis object.
   */
  analyze(
    rootDir: string,
    filePaths: string[],
    packageJsonData?: any // Changed PackageJsonData to any
  ): Promise<TechStackAnalysis>;
}

@Injectable()
export class TechStackAnalyzerService implements ITechStackAnalyzerService {
  constructor(
    @Inject('IFileOperations') private readonly fileOps: IFileOperations,
    @Inject('ILogger') private readonly logger: ILogger
  ) {
    this.logger.trace('TechStackAnalyzerService initialized');
  }

  /**
   * Analyzes the project's files and configuration to determine its technology stack.
   * @param rootDir - The root directory of the project.
   * @param filePaths - An array of all analyzable file paths within the project.
   * @param packageJsonData - Optional parsed content of the project's package.json.
   * @returns A Promise resolving to a TechStackAnalysis object.
   */
  public async analyze(
    rootDir: string,
    filePaths: string[],
    packageJsonData?: any // Changed PackageJsonData to any
  ): Promise<TechStackAnalysis> {
    this.logger.debug(`Starting tech stack analysis for rootDir: ${rootDir}`);

    const languages = deriveLanguages(filePaths);
    this.logger.debug(`Derived languages: ${languages.join(', ')}`);

    const inferredTech = inferTechnologiesFromDependencies(packageJsonData || {});
    this.logger.debug(`Inferred frameworks: ${inferredTech.frameworks.join(', ')}`);
    this.logger.debug(`Inferred build tools: ${inferredTech.buildTools.join(', ')}`);
    this.logger.debug(`Inferred testing frameworks: ${inferredTech.testingFrameworks.join(', ')}`);
    this.logger.debug(`Inferred linters: ${inferredTech.linters.join(', ')}`);

    const packageManager = await detectPackageManager(rootDir, this.fileOps);
    this.logger.debug(`Detected package manager: ${packageManager}`);

    const techStack: TechStackAnalysis = {
      languages,
      frameworks: inferredTech.frameworks,
      buildTools: inferredTech.buildTools,
      testingFrameworks: inferredTech.testingFrameworks,
      linters: inferredTech.linters,
      packageManager,
    };

    this.logger.info('Tech stack analysis completed.');
    this.logger.trace(`Final TechStackAnalysis: ${JSON.stringify(techStack, null, 2)}`);

    return techStack;
  }
}
