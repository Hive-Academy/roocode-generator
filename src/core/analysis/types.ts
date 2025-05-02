import { Result } from '../result/result'; // Use existing Result type

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
 * Represents basic information about a defined code element (function, class, etc.).
 */
export interface CodeElementInfo {
  name: string;
  startLine: number; // Add start line number
  endLine: number; // Add end line number
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
  definedFunctions: Record<string, CodeElementInfo[]>; // Key: relative file path -> List of functions defined in that file
  definedClasses: Record<string, CodeElementInfo[]>; // Key: relative file path -> List of classes defined in that file
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

import { CodeElementInfo } from './types'; // Add this if not already present at the top

/**
 * Represents the structured information extracted from parsed code.
 * Placeholder structure for now.
 */
export interface ParsedCodeInfo {
  functions: CodeElementInfo[];
  classes: CodeElementInfo[];
}
