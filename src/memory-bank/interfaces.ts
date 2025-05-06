// Export all new interfaces
export * from './interfaces/validator.interface';
export * from './interfaces/file-manager.interface';
export * from './interfaces/content-processor.interface';
export * from './interfaces/project-context.interface';
export * from './interfaces/prompt-builder.interface';
export * from './interfaces/config.interface';
export * from './interfaces/types';

// Re-export existing interfaces/types from their correct locations
export { IMemoryBankTemplateManager } from './interfaces/template-manager.interface';
export { IMemoryBankTemplateProcessor } from './interfaces/template-processor.interface';
export { IMemoryBankContentGenerator } from './interfaces/content-generator.interface';
export { IMemoryBankOrchestrator } from './interfaces/orchestrator.interface';
export { MemoryBankFileType, TemplateType } from './memory-bank-enums';
