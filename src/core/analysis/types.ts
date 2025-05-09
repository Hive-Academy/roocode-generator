import { Result } from '../result/result'; // Use existing Result type
import { CodeInsights } from './ast-analysis.interfaces';

/**
 * Defines the contract for analyzing various aspects of a project.
 */
export interface IProjectAnalyzer {
  /**
   * Analyzes the overall project context, including tech stack, structure, and dependencies.
   * @param paths - An array of file or directory paths to analyze (typically the project root).
   * @returns A Promise resolving to a Result containing the comprehensive ProjectContext or an Error.
   */
  analyzeProject(paths: string[]): Promise<Result<ProjectContext, Error>>;
}

/**
 * Represents a position in the source code.
 */
export interface CodePosition {
  row: number;
  column: number;
}

/**
 * Represents a generic node in the Abstract Syntax Tree (AST).
 */
export interface GenericAstNode {
  type: string;
  text: string;
  startPosition: CodePosition;
  endPosition: CodePosition;
  isNamed: boolean;
  fieldName: string | null; // Field name in the parent node
  children: GenericAstNode[];
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
 * Represents a node in the directory tree structure.
 */
export interface DirectoryNode {
  name: string;
  path: string; // Relative path from rootDir
  type: 'directory' | 'file';
  children?: DirectoryNode[]; // Only for type 'directory'
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
  directoryTree: DirectoryNode[]; // Represents the root level nodes of the project's directory structure
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
  /**
   * Optional map containing structured code insights extracted via AST analysis.
   * The key is the relative file path, and the value is the CodeInsights object for that file.
   * Populated by the AstAnalysisService.
   */
  codeInsights: { [filePath: string]: CodeInsights }; // Made required as per new requirements

  /**
   * Optional property to hold the parsed content of the project's package.json file.
   */
  packageJson?: any;
}
