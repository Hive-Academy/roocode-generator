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
 * Represents a minimal set of information from a package.json file.
 */
export interface PackageJsonMinimal {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  // Add other essential fields as needed, e.g., main, module, type
}

/**
 * Represents the overall context gathered about the project.
 * This will likely be used by the RulesGenerator.
 */
export interface ProjectContext {
  projectRootPath: string; // Explicit root path for the project
  techStack: TechStackAnalysis;
  packageJson: PackageJsonMinimal; // SSoT for external dependencies
  /**
   * Map containing structured code insights extracted via AST analysis.
   * The key is the relative file path (from projectRootPath),
   * and the value is the CodeInsights object for that file.
   * Populated by the AstAnalysisService.
   */
  codeInsights: { [filePath: string]: CodeInsights };
}
