import { IProjectConfigService } from '@core/config/interfaces';
import { Container } from '@core/di/container';
import { resolveDependency } from '@core/di/registrations'; // Import helper
import { IFileOperations } from '@core/file-operations/interfaces';
import { LLMAgent } from '@core/llm/llm-agent';
import { ILogger } from '@core/services/logger-service';
import { ContentProcessor } from '@memory-bank/content-processor';
import {
  IContentProcessor,
  IMemoryBankContentGenerator,
  IMemoryBankFileManager,
  IMemoryBankOrchestrator,
  IMemoryBankTemplateManager,
  IMemoryBankTemplateProcessor,
  IMemoryBankValidator,
  IProjectContextService,
  IPromptBuilder,
} from '@memory-bank/interfaces';
import { MemoryBankContentGenerator } from '@memory-bank/memory-bank-content-generator';
import { MemoryBankFileManager } from '@memory-bank/memory-bank-file-manager';
import { MemoryBankGenerator } from '@memory-bank/memory-bank-generator';
import { MemoryBankOrchestrator } from '@memory-bank/memory-bank-orchestrator';
import { MemoryBankTemplateManager } from '@memory-bank/memory-bank-template-manager';
import { MemoryBankTemplateProcessor } from '@memory-bank/memory-bank-template-processor';
import { MemoryBankValidator } from '@memory-bank/memory-bank-validator';
import { ProjectContextService } from '@memory-bank/project-context-service';
import { PromptBuilder } from '@memory-bank/prompt-builder';

export function registerMemoryBankModule(container: Container): void {
  // Register MemoryBank specific services
  container.registerFactory<IMemoryBankValidator>('IMemoryBankValidator', () => {
    const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    return new MemoryBankValidator(fileOps, logger);
  });

  container.registerFactory<IProjectContextService>('IProjectContextService', () => {
    const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');
    const projectConfigService = resolveDependency<IProjectConfigService>(
      container,
      'IProjectConfigService'
    );
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    return new ProjectContextService(fileOps, projectConfigService, logger);
  });

  container.registerFactory<IPromptBuilder>('IPromptBuilder', () => {
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    return new PromptBuilder(logger);
  });

  container.registerFactory<IMemoryBankFileManager>('IMemoryBankFileManager', () => {
    const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    return new MemoryBankFileManager(fileOps, logger);
  });

  container.registerFactory<IContentProcessor>('IContentProcessor', () => {
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    return new ContentProcessor(logger);
  });

  // Register MemoryBankTemplateManager
  container.registerFactory<IMemoryBankTemplateManager>('IMemoryBankTemplateManager', () => {
    const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    return new MemoryBankTemplateManager(fileOps, logger);
  });

  // Register MemoryBankTemplateProcessor
  container.registerFactory<IMemoryBankTemplateProcessor>('IMemoryBankTemplateProcessor', () => {
    const templateManager = resolveDependency<IMemoryBankTemplateManager>(
      container,
      'IMemoryBankTemplateManager'
    );
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    return new MemoryBankTemplateProcessor(templateManager, logger);
  });

  // Register MemoryBankContentGenerator
  container.registerFactory<IMemoryBankContentGenerator>('IMemoryBankContentGenerator', () => {
    const llmAgent = resolveDependency<LLMAgent>(container, 'LLMAgent');
    const promptBuilder = resolveDependency<IPromptBuilder>(container, 'IPromptBuilder');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    return new MemoryBankContentGenerator(llmAgent, promptBuilder, logger);
  });

  // Register MemoryBankOrchestrator
  container.registerFactory<IMemoryBankOrchestrator>('IMemoryBankOrchestrator', () => {
    const templateProcessor = resolveDependency<IMemoryBankTemplateProcessor>(
      container,
      'IMemoryBankTemplateProcessor'
    );
    const contentGenerator = resolveDependency<IMemoryBankContentGenerator>(
      container,
      'IMemoryBankContentGenerator'
    );
    const fileManager = resolveDependency<IMemoryBankFileManager>(
      container,
      'IMemoryBankFileManager'
    );
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    return new MemoryBankOrchestrator(templateProcessor, contentGenerator, fileManager, logger);
  });

  // Register MemoryBankGenerator
  container.registerFactory<MemoryBankGenerator>('MemoryBankGenerator', () => {
    const validator = resolveDependency<IMemoryBankValidator>(container, 'IMemoryBankValidator');
    const orchestrator = resolveDependency<IMemoryBankOrchestrator>(
      container,
      'IMemoryBankOrchestrator'
    );
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    const projectConfigService = resolveDependency<IProjectConfigService>(
      container,
      'IProjectConfigService'
    );
    const projectContextService = resolveDependency<IProjectContextService>(
      container,
      'IProjectContextService'
    );

    return new MemoryBankGenerator(
      container,
      validator,
      orchestrator,
      logger,
      projectConfigService,
      projectContextService
    );
  });
}
