/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { createPromptModule } from 'inquirer';

import { Container } from '@core/di/container';
import { resolveDependency } from '@core/di/utils'; // Import helpers from utils
import { ILogger } from '@core/services/logger-service';
import { IFileOperations } from '@core/file-operations/interfaces';
import { ILLMConfigService, IProjectConfigService } from '@core/config/interfaces';
import { ITemplateManager } from '@core/template-manager/interfaces';
import { ApplicationContainer } from '@core/application/application-container';
import {
  ICliInterface,
  IGeneratorOrchestrator,
  IProjectManager,
} from '@core/application/interfaces';
import { GeneratorOrchestrator } from '@core/application/generator-orchestrator';
import { CliInterface } from '@core/cli/cli-interface';
import { IGenerator } from '@core/generators/base-generator';
import { RoomodesGenerator } from '@generators/roomodes-generator';
import { SystemPromptsGenerator } from '@generators/system-prompts-generator';
import { VSCodeCopilotRulesGenerator } from '@generators/vscode-copilot-rules-generator';
import { AiMagicGenerator } from '@generators/ai-magic-generator';
import { IProjectAnalyzer } from '@core/analysis/types';
// Corrected import for MemoryBankService and added LLMAgent
import { MemoryBankService } from '@memory-bank/memory-bank-service';
import { LLMAgent } from '@core/llm/llm-agent'; // Added LLMAgent import
import { Injectable } from '@core/di/decorators'; // Import Injectable
import { ProgressIndicator } from '@core/ui/progress-indicator';
// Import necessary interfaces for AiMagicGenerator dependencies
import { IRulesPromptBuilder } from '@generators/rules/interfaces';
import { IContentProcessor } from '@memory-bank/interfaces';

// Stub for IProjectManager as it was in registrations.ts
@Injectable()
class ProjectManagerStub implements IProjectManager {
  async loadProjectConfig(): Promise<void> {}
  async saveProjectConfig(): Promise<void> {}
}

export function registerAppModule(container: Container): void {
  // Register Generators (ensure RulesGenerator and MemoryBankGenerator are registered in their respective modules)
  container.registerFactory<IGenerator<string>>('IGenerator.SystemPrompts', () => {
    const templateManager = resolveDependency<ITemplateManager>(container, 'ITemplateManager');
    const fileOperations = resolveDependency<IFileOperations>(container, 'IFileOperations');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    const projectConfigService = resolveDependency<IProjectConfigService>(
      container,
      'IProjectConfigService'
    );
    const serviceContainer = container;
    return new SystemPromptsGenerator(
      templateManager,
      fileOperations,
      logger,
      projectConfigService,
      serviceContainer
    );
  });

  container.registerFactory<IGenerator<string>>('IGenerator.Roomodes', () => {
    const serviceContainer = container;
    const fileOperations = resolveDependency<IFileOperations>(container, 'IFileOperations');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    const projectConfigService = resolveDependency<IProjectConfigService>(
      container,
      'IProjectConfigService'
    );
    return new RoomodesGenerator(serviceContainer, fileOperations, logger, projectConfigService);
  });

  container.registerFactory<IGenerator<string>>('IGenerator.VSCodeCopilotRules', () => {
    const serviceContainer = container;
    const fileOperations = resolveDependency<IFileOperations>(container, 'IFileOperations');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    const projectConfigService = resolveDependency<IProjectConfigService>(
      container,
      'IProjectConfigService'
    );
    return new VSCodeCopilotRulesGenerator(
      serviceContainer,
      fileOperations,
      logger,
      projectConfigService
    );
  });

  // Register AiMagicGenerator
  container.registerFactory<IGenerator<any>>('IGenerator.AiMagic', () => {
    const serviceContainer = container; // For super()
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    const fileOperations = resolveDependency<IFileOperations>(container, 'IFileOperations');
    const projectAnalyzer = resolveDependency<IProjectAnalyzer>(container, 'IProjectAnalyzer');
    const llmAgent = resolveDependency<LLMAgent>(container, 'LLMAgent'); // Resolve LLMAgent
    const memoryBankService = resolveDependency<MemoryBankService>(container, 'MemoryBankService'); // Use concrete class
    // Resolve the new dependencies using specific interfaces
    const rulesPromptBuilder = resolveDependency<IRulesPromptBuilder>(
      container,
      'IRulesPromptBuilder'
    ); // Use specific interface
    const contentProcessor = resolveDependency<IContentProcessor>(container, 'IContentProcessor'); // Use specific interface

    // Pass dependencies in the correct constructor order (now 8 arguments)
    return new AiMagicGenerator(
      serviceContainer, // For super(container)
      logger,
      fileOperations,
      projectAnalyzer,
      llmAgent, // Pass LLMAgent
      memoryBankService,
      rulesPromptBuilder, // Pass RulesPromptBuilder
      contentProcessor // Pass ContentProcessor
    );
  });

  // Register Generator Orchestrator
  container.registerFactory<IGeneratorOrchestrator>('IGeneratorOrchestrator', () => {
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    const generatorTokens = [
      // 'IGenerator.Rules', // Removed deprecated RulesGenerator token
      'IGenerator.SystemPrompts',
      'IGenerator.Roomodes',
      'IGenerator.VSCodeCopilotRules',
      // 'MemoryBankGenerator', // Removed old generator token
      'IGenerator.AiMagic', // Added new generator token
    ];

    const generators: IGenerator<any>[] = [];
    for (const token of generatorTokens) {
      try {
        const generator = resolveDependency<IGenerator<any>>(container, token);
        generators.push(generator);
      } catch (error) {
        logger.warn(
          `Failed to resolve generator ${token} for Orchestrator: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    const projectConfigService = resolveDependency<IProjectConfigService>(
      container,
      'IProjectConfigService'
    );
    return new GeneratorOrchestrator(generators, projectConfigService, logger);
  });

  // Register Project Manager Stub
  container.registerSingleton<IProjectManager>('IProjectManager', ProjectManagerStub);

  // Register CLI Interface
  container.registerFactory<ICliInterface>('ICliInterface', () => {
    const inquirerInstance = resolveDependency<ReturnType<typeof createPromptModule>>(
      container,
      'Inquirer'
    );
    return new CliInterface(inquirerInstance);
  });

  // Register Main Application Container
  container.registerFactory<ApplicationContainer>('ApplicationContainer', () => {
    const generatorOrchestrator = resolveDependency<IGeneratorOrchestrator>(
      container,
      'IGeneratorOrchestrator'
    );
    const projectManager = resolveDependency<IProjectManager>(container, 'IProjectManager');
    const cliInterface = resolveDependency<ICliInterface>(container, 'ICliInterface');
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    const progressIndicator = resolveDependency<ProgressIndicator>(container, 'ProgressIndicator');
    const llmConfigService = resolveDependency<ILLMConfigService>(container, 'ILLMConfigService');
    return new ApplicationContainer(
      generatorOrchestrator,
      projectManager,
      cliInterface,
      logger,
      progressIndicator,
      llmConfigService
    );
  });
}
