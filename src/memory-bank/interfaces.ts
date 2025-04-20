import { Result } from "../core/result/result";

export type MessageContent = string;

export enum MemoryBankFileType {
  ProjectOverview = "ProjectOverview",
  TechnicalArchitecture = "TechnicalArchitecture",
  DevelopmentStatus = "DevelopmentStatus",
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
