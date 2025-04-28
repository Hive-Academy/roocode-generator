import { IProjectConfigService } from '@core/config/interfaces';
import { Container } from '@core/di/container';
import { resolveDependency, assertIsDefined } from '@core/di/utils'; // Import helpers from utils
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
import { MemoryBankService } from '@memory-bank/memory-bank-service'; // Add import

export function registerMemoryBankModule(container: Container): void {
  // Register MemoryBank specific services
  container.registerFactory<IMemoryBankValidator>('IMemoryBankValidator', () => {
    const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');
    assertIsDefined(fileOps, 'IFileOperations dependency not found');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    assertIsDefined(logger, 'ILogger dependency not found');
    return new MemoryBankValidator(fileOps, logger);
  });

  container.registerFactory<IProjectContextService>('IProjectContextService', () => {
    const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');
    assertIsDefined(fileOps, 'IFileOperations dependency not found');
    const projectConfigService = resolveDependency<IProjectConfigService>(
      container,
      'IProjectConfigService'
    );
    assertIsDefined(projectConfigService, 'IProjectConfigService dependency not found');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    assertIsDefined(logger, 'ILogger dependency not found');
    return new ProjectContextService(fileOps, projectConfigService, logger);
  });

  container.registerFactory<IPromptBuilder>('IPromptBuilder', () => {
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    assertIsDefined(logger, 'ILogger dependency not found');
    return new PromptBuilder(logger);
  });

  container.registerFactory<IMemoryBankFileManager>('IMemoryBankFileManager', () => {
    const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');
    assertIsDefined(fileOps, 'IFileOperations dependency not found');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    assertIsDefined(logger, 'ILogger dependency not found');
    return new MemoryBankFileManager(fileOps, logger);
  });

  container.registerFactory<IContentProcessor>('IContentProcessor', () => {
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    assertIsDefined(logger, 'ILogger dependency not found');
    return new ContentProcessor(logger);
  });

  // Register MemoryBankTemplateManager
  container.registerFactory<IMemoryBankTemplateManager>('IMemoryBankTemplateManager', () => {
    const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');
    assertIsDefined(fileOps, 'IFileOperations dependency not found');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    assertIsDefined(logger, 'ILogger dependency not found');
    return new MemoryBankTemplateManager(fileOps, logger);
  });

  // Register MemoryBankTemplateProcessor
  container.registerFactory<IMemoryBankTemplateProcessor>('IMemoryBankTemplateProcessor', () => {
    const templateManager = resolveDependency<IMemoryBankTemplateManager>(
      container,
      'IMemoryBankTemplateManager'
    );
    assertIsDefined(templateManager, 'IMemoryBankTemplateManager dependency not found');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    assertIsDefined(logger, 'ILogger dependency not found');
    return new MemoryBankTemplateProcessor(templateManager, logger);
  });

  // Register MemoryBankContentGenerator
  container.registerFactory<IMemoryBankContentGenerator>('IMemoryBankContentGenerator', () => {
    const llmAgent = resolveDependency<LLMAgent>(container, 'LLMAgent');
    assertIsDefined(llmAgent, 'LLMAgent dependency not found');
    const promptBuilder = resolveDependency<IPromptBuilder>(container, 'IPromptBuilder');
    assertIsDefined(promptBuilder, 'IPromptBuilder dependency not found');
    const contentProcessor = resolveDependency<IContentProcessor>(container, 'IContentProcessor'); // Resolve new dependency
    assertIsDefined(contentProcessor, 'IContentProcessor dependency not found');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    assertIsDefined(logger, 'ILogger dependency not found');
    return new MemoryBankContentGenerator(llmAgent, promptBuilder, contentProcessor, logger); // Pass new dependency
  });

  // Register MemoryBankOrchestrator
  container.registerFactory<IMemoryBankOrchestrator>('IMemoryBankOrchestrator', () => {
    const templateProcessor = resolveDependency<IMemoryBankTemplateProcessor>(
      container,
      'IMemoryBankTemplateProcessor'
    );
    assertIsDefined(templateProcessor, 'IMemoryBankTemplateProcessor dependency not found');
    const contentGenerator = resolveDependency<IMemoryBankContentGenerator>(
      container,
      'IMemoryBankContentGenerator'
    );
    assertIsDefined(contentGenerator, 'IMemoryBankContentGenerator dependency not found');
    const fileManager = resolveDependency<IMemoryBankFileManager>(
      container,
      'IMemoryBankFileManager'
    );
    assertIsDefined(fileManager, 'IMemoryBankFileManager dependency not found');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    assertIsDefined(logger, 'ILogger dependency not found');
    return new MemoryBankOrchestrator(templateProcessor, contentGenerator, fileManager, logger);
  });

  // Register MemoryBankService
  container.registerFactory<MemoryBankService>('MemoryBankService', () => {
    const orchestrator = resolveDependency<IMemoryBankOrchestrator>(
      container,
      'IMemoryBankOrchestrator'
    );
    assertIsDefined(
      orchestrator,
      'IMemoryBankOrchestrator dependency not found for MemoryBankService'
    );
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    assertIsDefined(logger, 'ILogger dependency not found for MemoryBankService');
    return new MemoryBankService(orchestrator, logger);
  });

  // Register MemoryBankGenerator (Keep for backward compatibility)
  container.registerFactory<MemoryBankGenerator>('MemoryBankGenerator', () => {
    const validator = resolveDependency<IMemoryBankValidator>(container, 'IMemoryBankValidator');
    assertIsDefined(validator, 'IMemoryBankValidator dependency not found');
    const orchestrator = resolveDependency<IMemoryBankOrchestrator>(
      container,
      'IMemoryBankOrchestrator'
    );
    assertIsDefined(orchestrator, 'IMemoryBankOrchestrator dependency not found');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    assertIsDefined(logger, 'ILogger dependency not found');
    const projectConfigService = resolveDependency<IProjectConfigService>(
      container,
      'IProjectConfigService'
    );
    assertIsDefined(projectConfigService, 'IProjectConfigService dependency not found');
    const projectContextService = resolveDependency<IProjectContextService>(
      container,
      'IProjectContextService'
    );
    assertIsDefined(projectContextService, 'IProjectContextService dependency not found');

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
