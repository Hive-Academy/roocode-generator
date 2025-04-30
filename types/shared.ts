/**
 * @fileoverview Core shared types for the RooCode Generator
 *
 * This file contains common interfaces and types used throughout the application.
 * When adding new types, follow the guidelines in progress-tracker/typescript-migration-phase1-progress.md
 */

/**
 * Configuration for a project's code generation settings
 * @example
 * const config: ProjectConfig = {
 *   name: "my-project",
 *   baseDir: "./src",
 *   rootDir: "./dist",
 *   generators: ["system-prompts", "rules"],
 *   description: "My project description",
 *   dependencies: {
 *     runtime: ["typescript"],
 *     development: ["jest"]
 *   }
 * };
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
 * @example
 * const result: AnalysisResult = {
 *   success: true,
 *   files: ["file1.ts", "file2.ts"],
 *   fileList: ["src/index.ts", "src/utils.ts", "test/index.test.ts"],
 *   errors: [],
 *   summary: {
 *     name: "my-project",
 *     description: "Analysis complete",
 *     dependencies: ["typescript"],
 *     devDependencies: ["jest"]
 *   },
 *   llmPrompt: "Analyze the following TypeScript project...",
 *   metadata: {
 *     analysisTime: "2024-04-18T22:57:00Z"
 *   }
 * };
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

/**
 * Configuration for LLM (Language Learning Model) interactions
 * @example
 * const config: LLMConfig = {
 *   model: "claude-3",
 *   provider: "anthropic",
 *   apiKey: "sk-...",
 *   maxTokens: 2000,
 *   temperature: 0.7
 * };
 */
export interface LLMConfig {
  /** Model identifier */
  model: string;
  /** LLM provider (e.g., "anthropic", "openai") */
  provider: string;
  /** API key for authentication */
  apiKey: string;
  /** Maximum tokens for response */
  maxTokens: number;
  /** Temperature for response generation */
  temperature: number;
  /** Optional model-specific parameters */
  modelParams?: Record<string, unknown>;
  /** Optional API URL override */
  apiUrl?: string;
}

/**
 * Generic result type for operations that may fail
 * @template T The type of successful result data
 * @example
 * const result: Result<string> = {
 *   success: true,
 *   data: "Operation completed",
 *   error: undefined
 * };
 */
export interface Result<T> {
  /** Whether the operation was successful */
  success: boolean;
  /** Result data (present if success is true) */
  data?: T;
  /** Error message (present if success is false) */
  error?: string;
}

/**
 * Common handler function type for async operations
 * @template T Input type
 * @template R Result type
 * @example
 * const handler: Handler<string, number> = async (input) => {
 *   return input.length;
 * };
 */
export type Handler<T, R> = (input: T) => Promise<Result<R>>;

// Best Practices for Using Shared Types:
//
// 1. Type Guards
// Create type guards to safely narrow types:
// export function isProjectConfig(value: unknown): value is ProjectConfig {
//   return typeof value === 'object' && value !== null
//     && 'name' in value && typeof value.name === 'string'
//     && 'baseDir' in value && typeof value.baseDir === 'string'
//     && 'rootDir' in value && typeof value.rootDir === 'string'
//     && 'generators' in value && Array.isArray(value.generators);
// }
//
// 2. Type Assertions
// Avoid using type assertions (as) when possible.
// Instead, use type guards and validation functions.
//
// 3. Null Checking
// Always check for undefined/null when using optional properties:
// const options = config.options ?? {};
//
// 4. Generic Constraints
// Use constraints to ensure type safety:
// function processResult<T extends { id: string }>(result: Result<T>) { ... }
//
// 5. Documentation
// Always include JSDoc comments with examples for public types.
//
// 6. Migration Notes
// When modifying existing types, consider backward compatibility
// and document breaking changes.
