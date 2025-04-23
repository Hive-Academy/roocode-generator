import { Result } from "../result/result"; // Use existing Result type

/**
 * Defines the contract for analyzing various aspects of a project.
 */
export interface IProjectAnalyzer {
  /**
   * Analyzes the technology stack used in the project based on specified paths.
   * @param paths - An array of file or directory paths to analyze.
   * @returns A Result containing the TechStackAnalysis or an Error.
   */
  analyzeTechStack(paths: string[]): Promise<Result<TechStackAnalysis, Error>>;

  /**
   * Analyzes the directory structure and key file locations of the project.
   * @param paths - An array of file or directory paths to analyze.
   * @returns A Promise resolving to a Result containing the ProjectStructure or an Error.
   */
  analyzeProjectStructure(paths: string[]): Promise<Result<ProjectStructure, Error>>; // Make return type Promise

  /**
   * Analyzes the project's dependencies, both external and internal.
   * @param paths - An array of file or directory paths to analyze (e.g., package.json, source files).
   * @returns A Result containing the DependencyGraph or an Error.
   */
  analyzeDependencies(paths: string[]): Promise<Result<DependencyGraph, Error>>;
}

/**
 * Represents the identified technology stack of a project.
 */
export interface TechStackAnalysis {
  languages: string[]; // e.g., ['TypeScript', 'JavaScript']
  frameworks: string[]; // e.g., ['React', 'Express']
  buildTools: string[]; // e.g., ['Webpack', 'tsc']
  testingFrameworks: string[]; // e.g., ['Jest', 'Mocha']
  linters: string[]; // e.g., ['ESLint', 'Prettier']
  packageManager: string; // e.g., 'npm', 'yarn', 'pnpm'
}

/**
 * Represents the identified structure of a project.
 */
export interface ProjectStructure {
  rootDir: string; // Absolute path to the project root
  sourceDir: string; // Relative path from rootDir to the main source code
  testDir: string; // Relative path from rootDir to the main test code
  configFiles: string[]; // Relative paths from rootDir to key config files (e.g., 'tsconfig.json', '.eslintrc.js')
  mainEntryPoints: string[]; // Relative paths from rootDir to main application entry points
  componentStructure: Record<string, string[]>; // Map of component types/locations to file paths (e.g., { 'ui': ['src/components/ui/Button.tsx'] }) - Structure might need refinement based on analysis capabilities
}

/**
 * Represents the dependency graph of a project.
 */
export interface DependencyGraph {
  dependencies: Record<string, string>; // { 'react': '^18.0.0' }
  devDependencies: Record<string, string>; // { 'jest': '^29.0.0' }
  peerDependencies: Record<string, string>; // { 'react': '>=17.0.0' }
  internalDependencies: Record<string, string[]>; // Map of internal modules to their dependencies { 'src/utils/helper.ts': ['src/core/types.ts'] } - Structure might need refinement
}

/**
 * Represents the overall context gathered about the project.
 * This will likely be used by the RulesGenerator.
 */
export interface ProjectContext {
  techStack: TechStackAnalysis;
  structure: ProjectStructure;
  dependencies: DependencyGraph;
}
