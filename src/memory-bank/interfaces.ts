import { ITemplate, ITemplateManager } from '@core/template-manager/interfaces';
import { Result } from '../core/result/result';
import { TemplateError } from '@core/template-manager/errors';

export type MessageContent = string;

export enum MemoryBankFileType {
  ProjectOverview = 'ProjectOverview',
  TechnicalArchitecture = 'TechnicalArchitecture',
  DeveloperGuide = 'DeveloperGuide',
}

export enum TemplateType {
  CompletionReport = 'completion-report',
  ImplementationPlan = 'implementation-plan',
  ModeAcknowledgment = 'mode-acknowledgment',
  TaskDescription = 'task-description',
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
export interface IMemoryBankTemplateManager extends ITemplateManager {
  /**
   * Load a memory bank template by type
   * @param type - The type of memory bank template to load
   * @returns Result<ITemplate, TemplateError>
   */
  loadTemplate(type: MemoryBankFileType): Promise<Result<ITemplate, TemplateError>>;

  /**
   * Validate a memory bank template
   * @param type - The type of memory bank template to validate
   * @returns Result<void, TemplateError>
   */
  validateTemplate(type: MemoryBankFileType): Promise<Result<void, TemplateError>>;

  /**
   * Process a memory bank template with context data
   * @param type - The type of memory bank template to process
   * @param context - Data for processing
   * @returns Result<string, TemplateError>
   */
  processTemplate(
    type: MemoryBankFileType,
    context: Record<string, unknown>
  ): Promise<Result<string, TemplateError>>;
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
