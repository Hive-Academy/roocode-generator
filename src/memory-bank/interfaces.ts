// Export all new interfaces
export * from './interfaces/file-manager.interface';
export * from './interfaces/content-processor.interface';
export * from './interfaces/config.interface';
export * from './interfaces/types';

// Re-export existing interfaces/types from their correct locations
export { IMemoryBankOrchestrator } from './interfaces/orchestrator.interface';
export { IMemoryBankTemplateProcessor } from './interfaces/template-processor.interface';
export { IMemoryBankContentGenerator } from './interfaces/content-generator.interface';
export { IMemoryBankFileManager } from './interfaces/file-manager.interface';
export { IMemoryBankTemplateManager } from './interfaces/template-manager.interface';
export { IContentProcessor } from './interfaces/content-processor.interface';
export { MemoryBankFileType } from './memory-bank-enums';
export { TemplateType } from './memory-bank-enums';
