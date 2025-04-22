import { Result } from "../core/result/result";

export type MessageContent = string;

export enum MemoryBankFileType {
  ProjectOverview = "ProjectOverview",
  TechnicalArchitecture = "TechnicalArchitecture",
  DeveloperGuide = "DeveloperGuide",
}

export enum TemplateType {
  CompletionReport = "completion-report",
  ImplementationPlan = "implementation-plan",
  ModeAcknowledgment = "mode-acknowledgment",
  TaskDescription = "task-description",
}

export interface MemoryBankConfig {
  requiredFiles: MemoryBankFileType[];
  templateFiles: TemplateType[];
  baseDir: string;
  templateDir: string;
}

// Memory bank file validation
export interface IMemoryBankValidator {
  validateRequiredFiles(baseDir: string): Promise<Result<void>>;
  validateTemplateFiles(baseDir: string): Promise<Result<void>>;
  validateFileContent(content: string, type: MemoryBankFileType): Result<void>;
}

// Memory bank file management
export interface IMemoryBankFileManager {
  createMemoryBankDirectory(baseDir: string): Promise<Result<void>>;
  writeMemoryBankFile(path: string, content: string): Promise<Result<void>>;
  readMemoryBankFile(path: string): Promise<Result<string>>;
}

// Template management
export interface IMemoryBankTemplateManager {
  loadTemplate(name: MemoryBankFileType): Promise<Result<string>>;
  validateTemplate(content: string, type: MemoryBankFileType): Result<boolean>;
}

// Content processing
export interface IContentProcessor {
  stripMarkdownCodeBlock(content: MessageContent): Result<string>;
  processTemplate(template: string, data: Record<string, unknown>): Promise<Result<string>>;
}

export interface IProjectContextService {
  /**
   * Gathers context from specified project files and directories.
   * @param paths - An array of file and directory paths to include in the context.
   * @returns A Result containing the gathered context as a string, or an error.
   */
  gatherContext(paths: string[]): Promise<Result<string, Error>>;
}

export interface IPromptBuilder {
  /**
   * Builds the complete prompt for the LLM.
   * @param baseInstruction - The base instruction for the LLM.
   * @param projectContext - The gathered context from the project.
   * @param templateContent - The content of the memory bank template.
   * @returns The complete prompt string.
   */
  buildPrompt(
    baseInstruction: string,
    projectContext: string,
    templateContent: string
  ): Result<string, Error>;
}
