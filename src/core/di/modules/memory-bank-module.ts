import { Container } from '../container';
import { resolveDependency } from '../utils';
import { assertIsDefined } from '../utils';
import { ILogger } from '@core/services/logger-service';
import { IFileOperations } from '@core/file-operations/interfaces';
import { LLMAgent } from '@core/llm/llm-agent';
import {
  IMemoryBankOrchestrator,
  IMemoryBankTemplateProcessor,
  IMemoryBankContentGenerator,
  IMemoryBankFileManager,
  IMemoryBankTemplateManager,
  IContentProcessor,
} from '@memory-bank/interfaces';
import { MemoryBankOrchestrator } from '@memory-bank/memory-bank-orchestrator';
import { MemoryBankTemplateProcessor } from '@memory-bank/memory-bank-template-processor';
import { MemoryBankContentGenerator } from '@memory-bank/memory-bank-content-generator';
import { MemoryBankFileManager } from '@memory-bank/memory-bank-file-manager';
import { MemoryBankTemplateManager } from '@memory-bank/memory-bank-template-manager';
import { ContentProcessor } from '@memory-bank/content-processor';
import { MemoryBankService } from '@memory-bank/memory-bank-service';

/**
 * Registers memory bank related services in the DI container
 */
export function registerMemoryBankModule(container: Container): void {
  // Register MemoryBank specific services
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
    const contentProcessor = resolveDependency<IContentProcessor>(container, 'IContentProcessor');
    assertIsDefined(contentProcessor, 'IContentProcessor dependency not found');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    assertIsDefined(logger, 'ILogger dependency not found');
    return new MemoryBankContentGenerator(llmAgent, contentProcessor, logger);
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
}
