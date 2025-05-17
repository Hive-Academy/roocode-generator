/**
 * @fileoverview Project configuration and analysis types
 * @module types/project
 */

/**
 * Configuration for a project's code generation settings
 */
export interface ProjectConfig {
  /** Project name used for file generation */
  name: string;
  /** Base directory for source files */
  baseDir: string;
  /** Root directory for generated files */
  rootDir: string;
  /** List of generators to run */
  generators: string[];
  /** Project description */
  description?: string;
  /** Project dependencies */
  dependencies?: {
    runtime: string[];
    development: string[];
  };
  /** Memory bank specific configuration */
  memoryBank?: {
    outputDir: string;
    useTemplates?: boolean;
    templatesDir?: string;
    generateProjectOverview?: boolean;
    generateTechnicalArchitecture?: boolean;
    generateDeveloperGuide?: boolean;
    exclusions?: string[];
    fileTypes?: { include?: string[]; exclude?: string[] };
  };
  /** Optional custom configuration */
  options?: Record<string, unknown>;
}

/**
 * Result of code analysis operations
 */
export interface AnalysisResult {
  /** Whether the analysis completed successfully */
  success: boolean;
  /** List of files processed */
  files: string[];
  /** Complete list of project files with paths */
  fileList: string[];
  /** Any errors encountered during analysis */
  errors: string[];
  /** Summary of analysis results */
  summary?: {
    /** Project name */
    name: string;
    /** Project description */
    description: string;
    /** Runtime dependencies */
    dependencies: string[];
    /** Development dependencies */
    devDependencies: string[];
  };
  /** Generated prompt for LLM analysis */
  llmPrompt: string;
  /** Optional metadata about the analysis */
  metadata?: Record<string, unknown>;
}
