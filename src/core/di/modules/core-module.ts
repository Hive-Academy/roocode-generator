// Fixed linting issues and addressed unsafe call and assignment warnings by adding type guards and assertions

import { createPromptModule } from 'inquirer';

import { Container } from '@core/di/container';
import { resolveDependency, assertIsDefined } from '@core/di/utils'; // Import helpers from new utils file

import { ILogger, LoggerService } from '@core/services/logger-service';
import { IFileOperations } from '@core/file-operations/interfaces';
import { FileOperations } from '@core/file-operations/file-operations';

import { ITemplateManager } from '@core/template-manager/interfaces';
import { TemplateManager } from '@core/template-manager/template-manager';

import { IProjectConfigService, ILLMConfigService } from '@core/config/interfaces';
import { ProjectConfigService } from '@core/config/project-config.service';
import { LLMConfigService } from '@core/config/llm-config.service';

import { ProgressIndicator } from '@core/ui/progress-indicator';

import { ResponseParser } from '@core/analysis/response-parser';
import { IProjectAnalyzer } from '@core/analysis/types';
import { ProjectAnalyzer } from '@core/analysis/project-analyzer';

import { LLMAgent } from '@core/llm/llm-agent';

import { IRulesTemplateManager } from 'src/types/rules-template-types'; // Corrected path
import { RulesTemplateManager } from '@core/templating/rules-template-manager';
import { TemplateProcessor } from '@core/templating/template-processor';

// assertIsDefined moved to src/core/di/utils.ts
export function registerCoreModule(container: Container): void {
  // Core Services
  container.registerSingleton<ILogger>('ILogger', LoggerService);
  container.registerFactory('Inquirer', () => createPromptModule());

  container.registerFactory<IFileOperations>('IFileOperations', () => {
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    assertIsDefined(logger, 'ILogger dependency not found');
    return new FileOperations(logger);
  });

  container.registerFactory<ITemplateManager>('ITemplateManager', () => {
    const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    assertIsDefined(fileOps, 'IFileOperations dependency not found');
    assertIsDefined(logger, 'ILogger dependency not found');
    return new TemplateManager(fileOps, logger, { templateExt: '' }); // No default extension
  });

  container.registerFactory<IProjectConfigService>('IProjectConfigService', () => {
    const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');
    assertIsDefined(fileOps, 'IFileOperations dependency not found');
    return new ProjectConfigService(fileOps);
  });

  container.registerFactory<ILLMConfigService>('ILLMConfigService', () => {
    const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    const inquirer = resolveDependency<ReturnType<typeof createPromptModule>>(
      container,
      'Inquirer'
    );
    assertIsDefined(fileOps, 'IFileOperations dependency not found');
    assertIsDefined(logger, 'ILogger dependency not found');
    assertIsDefined(inquirer, 'Inquirer dependency not found');

    return new LLMConfigService(fileOps, logger, inquirer);
  });

  container.registerFactory<ProgressIndicator>('ProgressIndicator', () => {
    return new ProgressIndicator();
  });

  container.registerFactory<ResponseParser>('ResponseParser', () => {
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    assertIsDefined(logger, 'ILogger dependency not found');
    return new ResponseParser(logger);
  });

  container.registerFactory<IProjectAnalyzer>('IProjectAnalyzer', () => {
    const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    const llmAgent = resolveDependency<LLMAgent>(container, 'LLMAgent'); // Assumes LLMAgent is registered elsewhere (llm-module)
    const responseParser = resolveDependency<ResponseParser>(container, 'ResponseParser');
    const progressIndicator = resolveDependency<ProgressIndicator>(container, 'ProgressIndicator');
    assertIsDefined(fileOps, 'IFileOperations dependency not found');
    assertIsDefined(logger, 'ILogger dependency not found');
    assertIsDefined(llmAgent, 'LLMAgent dependency not found');
    assertIsDefined(responseParser, 'ResponseParser dependency not found');
    assertIsDefined(progressIndicator, 'ProgressIndicator dependency not found');
    return new ProjectAnalyzer(fileOps, logger, llmAgent, responseParser, progressIndicator);
  });

  container.registerFactory<IRulesTemplateManager>('IRulesTemplateManager', () => {
    const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    const llmAgent = resolveDependency<LLMAgent>(container, 'LLMAgent'); // Assumes LLMAgent is registered elsewhere (llm-module)
    assertIsDefined(fileOps, 'IFileOperations dependency not found');
    assertIsDefined(logger, 'ILogger dependency not found');
    assertIsDefined(llmAgent, 'LLMAgent dependency not found');
    return new RulesTemplateManager(fileOps, logger, llmAgent);
  });

  container.registerFactory<TemplateProcessor>('TemplateProcessor', () => {
    const templateManager = resolveDependency<IRulesTemplateManager>(
      container,
      'IRulesTemplateManager'
    );
    const projectAnalyzer = resolveDependency<IProjectAnalyzer>(container, 'IProjectAnalyzer');
    const llmAgent = resolveDependency<LLMAgent>(container, 'LLMAgent'); // Assumes LLMAgent is registered elsewhere (llm-module)
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    assertIsDefined(templateManager, 'IRulesTemplateManager dependency not found');
    assertIsDefined(projectAnalyzer, 'IProjectAnalyzer dependency not found');
    assertIsDefined(llmAgent, 'LLMAgent dependency not found');
    assertIsDefined(logger, 'ILogger dependency not found');
    return new TemplateProcessor(templateManager, projectAnalyzer, llmAgent, logger);
  });
}
