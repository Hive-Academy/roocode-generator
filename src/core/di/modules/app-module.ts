import { createPromptModule } from 'inquirer';

import { Container } from '@core/di/container';
import { resolveDependency } from '@core/di/utils';
import { ILogger } from '@core/services/logger-service';
import { IFileOperations } from '@core/file-operations/interfaces';
import { ILLMConfigService, IProjectConfigService } from '@core/config/interfaces';
import { ApplicationContainer } from '@core/application/application-container';
import {
  ICliInterface,
  IGeneratorOrchestrator,
  IProjectManager,
} from '@core/application/interfaces';
import { GeneratorOrchestrator } from '@core/application/generator-orchestrator';
import { CliInterface } from '@core/cli/cli-interface';
import { IGenerator } from '@core/generators/base-generator';
import { AiMagicGenerator } from '@generators/ai-magic-generator';
import { IRoomodesService } from '@core/services/roomodes.service';
import { MemoryBankService } from '@memory-bank/memory-bank-service';
import { LLMAgent } from '@core/llm/llm-agent';
import { Injectable } from '@core/di/decorators';
import { ProgressIndicator } from '@core/ui/progress-indicator';
import { IRulesPromptBuilder } from '@generators/rules/interfaces';
import { IContentProcessor } from '@memory-bank/interfaces';
import { RooFileOpsHelper } from '@generators/roo-file-ops-helper';
import { IProjectAnalyzer } from '@core/analysis/types';

@Injectable()
class ProjectManagerStub implements IProjectManager {
  async loadProjectConfig(): Promise<void> {}
  async saveProjectConfig(): Promise<void> {}
}

export function registerAppModule(container: Container): void {
  // Register AiMagicGenerator - the main and only active generator
  container.registerFactory<IGenerator<any>>('IGenerator.AiMagic', () => {
    const serviceContainer = container;
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    const fileOperations = resolveDependency<IFileOperations>(container, 'IFileOperations');
    const projectAnalyzer = resolveDependency<IProjectAnalyzer>(container, 'IProjectAnalyzer');
    const llmAgent = resolveDependency<LLMAgent>(container, 'LLMAgent');
    const memoryBankService = resolveDependency<MemoryBankService>(container, 'MemoryBankService');
    const rulesPromptBuilder = resolveDependency<IRulesPromptBuilder>(
      container,
      'IRulesPromptBuilder'
    );
    const contentProcessor = resolveDependency<IContentProcessor>(container, 'IContentProcessor');
    const rooFileOpsHelper = resolveDependency<RooFileOpsHelper>(container, 'RooFileOpsHelper');
    const roomodesService = resolveDependency<IRoomodesService>(container, 'IRoomodesService');

    return new AiMagicGenerator(
      serviceContainer,
      logger,
      fileOperations,
      projectAnalyzer,
      llmAgent,
      memoryBankService,
      rulesPromptBuilder,
      contentProcessor,
      rooFileOpsHelper,
      roomodesService
    );
  });

  // Register Generator Orchestrator
  container.registerFactory<IGeneratorOrchestrator>('IGeneratorOrchestrator', () => {
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    const generatorTokens = ['IGenerator.AiMagic'];

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
