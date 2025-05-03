// Fixed linting issues and addressed unsafe call and assignment warnings by adding type guards and assertions

import { createPromptModule } from 'inquirer';

import { Container } from '@core/di/container';
import { assertIsDefined, resolveDependency } from '@core/di/utils';

import { FileOperations } from '@core/file-operations/file-operations';
import { IFileOperations } from '@core/file-operations/interfaces';
import { ILogger, LoggerService } from '@core/services/logger-service';

import { ITemplateManager } from '@core/template-manager/interfaces';
import { TemplateManager } from '@core/template-manager/template-manager';

import { IProjectConfigService } from '@core/config/interfaces';
import { ProjectConfigService } from '@core/config/project-config.service';

import { ProgressIndicator } from '@core/ui/progress-indicator';

import { ProjectAnalyzer } from '@core/analysis/project-analyzer';
import { ResponseParser } from '@core/analysis/response-parser';
import { IProjectAnalyzer } from '@core/analysis/types';
import { IJsonSchemaHelper, JsonSchemaHelper } from '@core/analysis/json-schema-helper';
import { FileContentCollector } from '@core/analysis/file-content-collector';
import { FilePrioritizer } from '@core/analysis/file-prioritizer';
import { IFileContentCollector, IFilePrioritizer, ITokenCounter } from '@core/analysis/interfaces';
import { LLMTokenCounter } from '@core/analysis/token-counter';
import { ITreeSitterParserService } from '@core/analysis/interfaces';
import { TreeSitterParserService } from '@core/analysis/tree-sitter-parser.service';

import { LLMAgent } from '@core/llm/llm-agent';

import { RulesTemplateManager } from '@core/templating/rules-template-manager';
import { TemplateProcessor } from '@core/templating/template-processor';
import { IRulesTemplateManager } from 'src/types/rules-template-types';

// assertIsDefined moved to src/core/di/utils.ts
export function registerCoreModule(container: Container): void {
  // Core Services
  container.registerSingleton<ILogger>('ILogger', LoggerService);
  container.registerFactory('Inquirer', () => createPromptModule());

  // Analysis Services
  container.registerSingleton<IJsonSchemaHelper>('IJsonSchemaHelper', JsonSchemaHelper);

  container.registerFactory<ITreeSitterParserService>('ITreeSitterParserService', () => {
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    assertIsDefined(logger, 'ILogger dependency not found for TreeSitterParserService');
    // Instance is created here, but initialize() must be called elsewhere (e.g., cli-main.ts)
    return new TreeSitterParserService(logger);
  });

  container.registerFactory<ITokenCounter>('ITokenCounter', () => {
    const llmAgent = resolveDependency<LLMAgent>(container, 'LLMAgent');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    assertIsDefined(llmAgent, 'LLMAgent dependency not found');
    assertIsDefined(logger, 'ILogger dependency not found');
    return new LLMTokenCounter(llmAgent, logger);
  });

  container.registerFactory<IFileContentCollector>('IFileContentCollector', () => {
    const tokenCounter = resolveDependency<ITokenCounter>(container, 'ITokenCounter');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    assertIsDefined(tokenCounter, 'ITokenCounter dependency not found');
    assertIsDefined(logger, 'ILogger dependency not found');
    return new FileContentCollector(tokenCounter, logger);
  });

  container.registerFactory<IFilePrioritizer>('IFilePrioritizer', () => {
    return new FilePrioritizer();
  });

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
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    assertIsDefined(fileOps, 'IFileOperations dependency not found');
    assertIsDefined(logger, 'ILogger dependency not found');
    return new ProjectConfigService(fileOps, logger);
  });

  container.registerFactory<ProgressIndicator>('ProgressIndicator', () => {
    return new ProgressIndicator();
  });

  container.registerFactory<ResponseParser>('ResponseParser', () => {
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    const jsonSchemaHelper = resolveDependency<IJsonSchemaHelper>(container, 'IJsonSchemaHelper');
    assertIsDefined(logger, 'ILogger dependency not found');
    assertIsDefined(jsonSchemaHelper, 'IJsonSchemaHelper dependency not found');
    return new ResponseParser(logger, jsonSchemaHelper);
  });

  container.registerFactory<IProjectAnalyzer>('IProjectAnalyzer', () => {
    const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    const llmAgent = resolveDependency<LLMAgent>(container, 'LLMAgent');
    const responseParser = resolveDependency<ResponseParser>(container, 'ResponseParser');
    const progressIndicator = resolveDependency<ProgressIndicator>(container, 'ProgressIndicator');
    const fileContentCollector = resolveDependency<IFileContentCollector>(
      container,
      'IFileContentCollector'
    );
    const filePrioritizer = resolveDependency<IFilePrioritizer>(container, 'IFilePrioritizer');
    const treeSitterParserService = resolveDependency<ITreeSitterParserService>(
      container,
      'ITreeSitterParserService'
    );

    assertIsDefined(fileOps, 'IFileOperations dependency not found');
    assertIsDefined(logger, 'ILogger dependency not found');
    assertIsDefined(llmAgent, 'LLMAgent dependency not found');
    assertIsDefined(responseParser, 'ResponseParser dependency not found');
    assertIsDefined(progressIndicator, 'ProgressIndicator dependency not found');
    assertIsDefined(fileContentCollector, 'IFileContentCollector dependency not found');
    assertIsDefined(filePrioritizer, 'IFilePrioritizer dependency not found');
    assertIsDefined(treeSitterParserService, 'ITreeSitterParserService dependency not found');

    return new ProjectAnalyzer(
      fileOps,
      logger,
      llmAgent,
      responseParser,
      progressIndicator,
      fileContentCollector,
      filePrioritizer,
      treeSitterParserService // Pass the resolved dependency
    );
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
