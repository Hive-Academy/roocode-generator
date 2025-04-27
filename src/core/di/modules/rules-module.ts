import { Container } from '@core/di/container';
import { resolveDependency } from '@core/di/registrations'; // Import helper
import { IGenerator } from '@core/generators/base-generator';
import { RulesGenerator } from '@generators/rules/rules-generator';
import {
  IRulesContentProcessor,
  IRulesFileManager,
  IRulesPromptBuilder,
  RulesConfig,
} from '@generators/rules/interfaces';
import { RulesContentProcessor } from '@generators/rules/rules-content-processor';
import { RulesPromptBuilder } from '@generators/rules/rules-prompt-builder';
import { RulesFileManager } from '@generators/rules/rules-file-manager';
import { ILogger } from '@core/services/logger-service';
import { IFileOperations } from '@core/file-operations/interfaces';
import { IProjectAnalyzer } from '@core/analysis/types';
import { LLMAgent } from '@core/llm/llm-agent';

export function registerRulesModule(container: Container): void {
  // Register Rules specific services
  container.registerFactory<IRulesFileManager>('IRulesFileManager', () => {
    const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    return new RulesFileManager(fileOps, logger);
  });

  container.registerFactory<IRulesPromptBuilder>('IRulesPromptBuilder', () => {
    // Resolve dependencies if RulesPromptBuilder needs any (currently none)
    return new RulesPromptBuilder();
  });

  container.registerFactory<IRulesContentProcessor>('IRulesContentProcessor', () => {
    // Resolve dependencies if RulesContentProcessor needs any (currently none)
    return new RulesContentProcessor();
  });

  // Register RulesGenerator
  container.registerFactory<IGenerator<RulesConfig>>('IGenerator.Rules', () => {
    const serviceContainer = container; // The container instance itself
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    const fileOps = resolveDependency<IFileOperations>(container, 'IFileOperations');
    const projectAnalyzer = resolveDependency<IProjectAnalyzer>(container, 'IProjectAnalyzer');
    const llmAgent = resolveDependency<LLMAgent>(container, 'LLMAgent');
    const contentProcessor = resolveDependency<IRulesContentProcessor>(
      container,
      'IRulesContentProcessor'
    );

    return new RulesGenerator(
      serviceContainer,
      logger,
      fileOps,
      projectAnalyzer,
      llmAgent,
      contentProcessor
    );
  });
}
