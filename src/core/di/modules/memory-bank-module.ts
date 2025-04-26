import { Container } from '@core/di/container';
import { resolveDependency } from '@core/di/registrations'; // Import helper
import { ILogger } from '@core/services/logger-service';
import { IFileOperations } from '@core/file-operations/interfaces';
import { IProjectConfigService } from '@core/config/interfaces';
import { LLMAgent } from '@core/llm/llm-agent';
import { MemoryBankCommandHandler } from '@commands/memory-bank-command-handler';
import { MemoryBankGenerator } from '@memory-bank/memory-bank-generator';
import { MemoryBankValidator } from '@memory-bank/memory-bank-validator';
import { MemoryBankFileManager } from '@memory-bank/memory-bank-file-manager';
import { MemoryBankTemplateManager } from '@memory-bank/memory-bank-template-manager';
import { ContentProcessor } from '@memory-bank/content-processor';
import { ProjectContextService } from '@memory-bank/project-context-service';
import { PromptBuilder } from '@memory-bank/prompt-builder';
import {
  IMemoryBankValidator,
  IMemoryBankFileManager,
  IMemoryBankTemplateManager,
  IContentProcessor,
  IProjectContextService,
  IPromptBuilder,
} from '@memory-bank/interfaces';
import { Factory } from '@core/di/types';

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

  container.registerFactory<IMemoryBankTemplateManager>('IMemoryBankTemplateManager', () => {
    const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    return new MemoryBankTemplateManager(fileOps, logger);
  });

  container.registerFactory<IContentProcessor>('IContentProcessor', () => {
    return new ContentProcessor();
  });

  // Register MemoryBankGenerator
  container.registerFactory<MemoryBankGenerator>('MemoryBankGenerator', () => {
    const validator = resolveDependency<IMemoryBankValidator>(container, 'IMemoryBankValidator');
    const fileManager = resolveDependency<IMemoryBankFileManager>(
      container,
      'IMemoryBankFileManager'
    );
    const templateManager = resolveDependency<IMemoryBankTemplateManager>(
      container,
      'IMemoryBankTemplateManager'
    );
    const contentProcessor = resolveDependency<IContentProcessor>(container, 'IContentProcessor');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    const projectConfigService = resolveDependency<IProjectConfigService>(
      container,
      'IProjectConfigService'
    );
    const projectContextService = resolveDependency<IProjectContextService>(
      container,
      'IProjectContextService'
    );
    const promptBuilder = resolveDependency<IPromptBuilder>(container, 'IPromptBuilder');
    const llmAgent = resolveDependency<LLMAgent>(container, 'LLMAgent');

    return new MemoryBankGenerator(
      container,
      validator,
      fileManager,
      templateManager,
      contentProcessor,
      logger,
      projectConfigService,
      projectContextService,
      promptBuilder,
      llmAgent
    );
  });

  // Register MemoryBankCommandHandler
  const memoryBankHandlerFactory: Factory<MemoryBankCommandHandler> = () => {
    const logger = resolveDependency<ILogger>(container, 'ILogger'); // Resolve logger first for error handling
    try {
      const generator = resolveDependency<MemoryBankGenerator>(container, 'MemoryBankGenerator');
      const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');
      const projectContextService = resolveDependency<IProjectContextService>(
        container,
        'IProjectContextService'
      );

      return new MemoryBankCommandHandler(generator, fileOps, logger, projectContextService);
    } catch (error) {
      logger.error('Error creating MemoryBankCommandHandler instance', error as Error);
      throw error; // Re-throw to indicate factory failure
    }
  };

  const registrationResult = container.registerFactory(
    'MemoryBankCommandHandler',
    memoryBankHandlerFactory
  );

  if (registrationResult.isErr()) {
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    logger.error(
      `Failed to register MemoryBankCommandHandler: ${registrationResult.error?.message}`,
      registrationResult.error
    );
    throw new Error(
      `Failed to register MemoryBankCommandHandler: ${registrationResult.error?.message}`
    );
  }
}
