/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { createPromptModule } from 'inquirer';

import { Container } from '@core/di/container';
import { resolveDependency } from '@core/di/registrations'; // Import helper
import { ILogger } from '@core/services/logger-service';
import { IFileOperations } from '@core/file-operations/interfaces';
import { IProjectConfigService } from '@core/config/interfaces';
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
import { Injectable } from '@core/di/decorators'; // Import Injectable

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

  // Register Generator Orchestrator
  container.registerFactory<IGeneratorOrchestrator>('IGeneratorOrchestrator', () => {
    const logger = resolveDependency<ILogger>(container, 'ILogger');
    const generatorTokens = [
      'IGenerator.Rules', // Assumes registered in rules-module
      'IGenerator.SystemPrompts',
      'IGenerator.Roomodes',
      'IGenerator.VSCodeCopilotRules',
      // Add 'MemoryBankGenerator' token if it should be orchestrated
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
    return new ApplicationContainer(generatorOrchestrator, projectManager, cliInterface, logger);
  });
}
