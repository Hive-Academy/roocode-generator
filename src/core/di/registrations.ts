import { FileOperations } from "../file-operations/file-operations";
import { IFileOperations } from "../file-operations/interfaces";
import { ILogger, LoggerService } from "../services/logger-service";
import { ITemplateManager } from "../template-manager/interfaces";
import { TemplateManager } from "../template-manager/template-manager";
import { Container } from "./container";

import { ProjectConfigService } from "../config/project-config.service";
import { ILLMProvider, LLMProviderFactory } from "../llm/interfaces";
import { LLMAgent } from "../llm/llm-agent";
import {
  AnthropicLLMProvider,
  GoogleGenAILLMProvider,
  OpenAILLMProvider,
} from "../llm/llm-provider";
import { LLMProviderRegistry } from "../llm/provider-registry";

import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";

import inquirer, { createPromptModule } from "inquirer";
import { ILLMConfigService, IProjectConfigService } from "../config/interfaces";
import { LLMConfigService } from "../config/llm-config.service";

// Register ApplicationContainer and its dependencies (placeholders for now)
import { ApplicationContainer } from "../application/application-container";
import { ICliInterface, IGeneratorOrchestrator, IProjectManager } from "../application/interfaces";
import { Injectable } from "./decorators"; // Import Injectable

@Injectable() // Add Injectable decorator
class ProjectManagerStub implements IProjectManager {
  async loadProjectConfig(): Promise<void> {}
  async saveProjectConfig(): Promise<void> {}
}

import { GeneratorOrchestrator } from "../application/generator-orchestrator";
import { CliInterface } from "../cli/cli-interface";
import { IGenerator } from "../generators/base-generator";

import { RoomodesGenerator } from "../../generators/roomodes-generator";
import { RulesGenerator } from "../../generators/rules-generator";
import { SystemPromptsGenerator } from "../../generators/system-prompts-generator";
import { VSCodeCopilotRulesGenerator } from "../../generators/vscode-copilot-rules-generator";
import { ContentProcessor } from "../../memory-bank/ContentProcessor";
import {
  IContentProcessor,
  IMemoryBankFileManager,
  IMemoryBankTemplateManager,
  IMemoryBankValidator,
  IProjectContextService,
  IPromptBuilder,
} from "../../memory-bank/interfaces"; // Import MemoryBank dependencies
import { MemoryBankFileManager } from "../../memory-bank/MemoryBankFileManager";
import { MemoryBankGenerator } from "../../memory-bank/MemoryBankGenerator";
import { MemoryBankTemplateManager } from "../../memory-bank/MemoryBankTemplateManager";
import { MemoryBankValidator } from "../../memory-bank/MemoryBankValidator";
import { ProjectContextService } from "../../memory-bank/ProjectContextService";
import { PromptBuilder } from "../../memory-bank/PromptBuilder";
import { Result } from "../result/result";
import { MemoryBankCommandHandler } from "../../commands/memory-bank-command-handler";
import { Factory } from "./types";
import { LLMConfig } from "../../../types/shared";

/**
 *  @description Registers services with the DI container.
 *  This function should be called once at application startup to set up the DI container.
 * @returns {void}
 */
export function registerServices(): void {
  const container = Container.getInstance();

  container.registerSingleton<ILogger>("ILogger", LoggerService);
  container.registerFactory("Inquirer", () => createPromptModule());

  // Register IFileOperations using factory to avoid 'as any' cast and improve typing
  container.registerFactory<IFileOperations>("IFileOperations", () => {
    const logger = resolveDependency<ILogger>(container, "ILogger");
    return new FileOperations(logger);
  });

  // Register ITemplateManager using factory, configuring it to not use a default extension
  container.registerFactory<ITemplateManager>("ITemplateManager", () => {
    const fileOps = resolveDependency<IFileOperations>(container, "IFileOperations");
    const logger = resolveDependency<ILogger>(container, "ILogger");
    // Pass config to constructor to override default .tpl extension
    return new TemplateManager(fileOps, logger, { templateExt: "" });
  });

  // Register client factory functions for each provider
  container.registerFactory<(config: LLMConfig) => ChatOpenAI>("OpenAIClientFactory", () => {
    return (config: LLMConfig) =>
      new ChatOpenAI({
        modelName: config.model,
        temperature: config.temperature,
        openAIApiKey: config.apiKey,
      });
  });

  container.registerFactory<(config: LLMConfig) => ChatGoogleGenerativeAI>(
    "GoogleGenAIClientFactory",
    () => {
      return (config: LLMConfig) =>
        new ChatGoogleGenerativeAI({
          model: config.model,
          temperature: config.temperature,
          apiKey: config.apiKey,
        });
    }
  );

  container.registerFactory<(config: LLMConfig) => ChatAnthropic>("AnthropicClientFactory", () => {
    return (config: LLMConfig) =>
      new ChatAnthropic({
        modelName: config.model,
        anthropicApiKey: config.apiKey,
      });
  });

  // Register factories for LLM providers that instantiate with config and client factory
  // Register provider factories that return Results
  container.registerFactory<LLMProviderFactory>("ILLMProvider.OpenAI.Factory", () => {
    try {
      const clientFactory = resolveDependency<(config: LLMConfig) => ChatOpenAI>(
        container,
        "OpenAIClientFactory"
      );
      const logger = resolveDependency<ILogger>(container, "ILogger");

      return function factory(config: LLMConfig): Result<ILLMProvider, Error> {
        try {
          const client = clientFactory(config);
          return Result.ok(new OpenAILLMProvider(config, () => client));
        } catch (error) {
          logger.error(
            `Error creating OpenAI provider: ${error instanceof Error ? error.message : String(error)}`,
            error as Error
          );
          return Result.err(error instanceof Error ? error : new Error(String(error)));
        }
      };
    } catch (error) {
      const logger = resolveDependency<ILogger>(container, "ILogger");
      logger.error(
        `Failed to resolve dependencies for OpenAI provider factory: ${error instanceof Error ? error.message : String(error)}`,
        error as Error
      );
      return () => Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  });

  container.registerFactory<LLMProviderFactory>("ILLMProvider.GoogleGenAI.Factory", () => {
    try {
      const clientFactory = resolveDependency<(config: LLMConfig) => ChatGoogleGenerativeAI>(
        container,
        "GoogleGenAIClientFactory"
      );
      const logger = resolveDependency<ILogger>(container, "ILogger");

      return function factory(config: LLMConfig): Result<ILLMProvider, Error> {
        try {
          const client = clientFactory(config);
          return Result.ok(new GoogleGenAILLMProvider(config, () => client));
        } catch (error) {
          logger.error(
            `Error creating Google GenAI provider: ${error instanceof Error ? error.message : String(error)}`,
            error as Error
          );
          return Result.err(error instanceof Error ? error : new Error(String(error)));
        }
      };
    } catch (error) {
      const logger = resolveDependency<ILogger>(container, "ILogger");
      logger.error(
        `Failed to resolve dependencies for GoogleGenAI provider factory: ${error instanceof Error ? error.message : String(error)}`,
        error as Error
      );
      return () => Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  });

  container.registerFactory<LLMProviderFactory>("ILLMProvider.Anthropic.Factory", () => {
    try {
      const clientFactory = resolveDependency<(config: LLMConfig) => ChatAnthropic>(
        container,
        "AnthropicClientFactory"
      );
      const logger = resolveDependency<ILogger>(container, "ILogger");

      return function factory(config: LLMConfig): Result<ILLMProvider, Error> {
        try {
          const client = clientFactory(config);
          return Result.ok(new AnthropicLLMProvider(config, () => client));
        } catch (error) {
          logger.error(
            `Error creating Anthropic provider: ${error instanceof Error ? error.message : String(error)}`,
            error as Error
          );
          return Result.err(error instanceof Error ? error : new Error(String(error)));
        }
      };
    } catch (error) {
      const logger = resolveDependency<ILogger>(container, "ILogger");
      logger.error(
        `Failed to resolve dependencies for Anthropic provider factory: ${error instanceof Error ? error.message : String(error)}`,
        error as Error
      );
      return () => Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  });

  container.registerFactory<LLMProviderRegistry>("LLMProviderRegistry", () => {
    const configService = resolveDependency<ILLMConfigService>(container, "ILLMConfigService");
    const providerFactories = {
      openai: resolveDependency<LLMProviderFactory>(container, "ILLMProvider.OpenAI.Factory"),
      "google-genai": resolveDependency<LLMProviderFactory>(
        container,
        "ILLMProvider.GoogleGenAI.Factory"
      ),
      anthropic: resolveDependency<LLMProviderFactory>(container, "ILLMProvider.Anthropic.Factory"),
    };

    return new LLMProviderRegistry(configService, providerFactories);
  });

  container.registerFactory<LLMAgent>("LLMAgent", () => {
    const registry = resolveDependency<LLMProviderRegistry>(container, "LLMProviderRegistry");
    const fileOps = resolveDependency<IFileOperations>(container, "IFileOperations");
    const logger = resolveDependency<ILogger>(container, "ILogger");
    return new LLMAgent(registry, fileOps, logger);
  });

  container.registerFactory<ILLMConfigService>("ILLMConfigService", () => {
    const fileOps = resolveDependency<IFileOperations>(container, "IFileOperations");
    const logger = resolveDependency<ILogger>(container, "ILogger");
    return new LLMConfigService(fileOps, logger, inquirer);
  });

  // Remove old factory registration for ProjectConfigService
  container.registerFactory<IProjectConfigService>("IProjectConfigService", () => {
    const fileOps = resolveDependency<IFileOperations>(container, "IFileOperations");
    return new ProjectConfigService(fileOps);
  });

  // Register MemoryBank specific services
  container.registerFactory<IMemoryBankValidator>("IMemoryBankValidator", () => {
    const fileOps = resolveDependency<IFileOperations>(container, "IFileOperations");
    const logger = resolveDependency<ILogger>(container, "ILogger");
    return new MemoryBankValidator(fileOps, logger);
  });

  // Register ProjectContextService
  container.registerFactory<IProjectContextService>("IProjectContextService", () => {
    const fileOps = resolveDependency<IFileOperations>(container, "IFileOperations");
    const projectConfigService = resolveDependency<IProjectConfigService>(
      container,
      "IProjectConfigService"
    );
    const logger = resolveDependency<ILogger>(container, "ILogger");
    return new ProjectContextService(fileOps, projectConfigService, logger);
  });

  // Register PromptBuilder
  container.registerFactory<IPromptBuilder>("IPromptBuilder", () => {
    const logger = resolveDependency<ILogger>(container, "ILogger");
    return new PromptBuilder(logger);
  });

  container.registerFactory<IMemoryBankFileManager>("IMemoryBankFileManager", () => {
    const fileOps = resolveDependency<IFileOperations>(container, "IFileOperations");
    const logger = resolveDependency<ILogger>(container, "ILogger");
    return new MemoryBankFileManager(fileOps, logger);
  });

  container.registerFactory<IMemoryBankTemplateManager>("IMemoryBankTemplateManager", () => {
    const fileOps = resolveDependency<IFileOperations>(container, "IFileOperations");
    const logger = resolveDependency<ILogger>(container, "ILogger");
    return new MemoryBankTemplateManager(fileOps, logger);
  });

  container.registerFactory<IContentProcessor>("IContentProcessor", () => {
    return new ContentProcessor();
  });

  // Register MemoryBankGenerator as an IGenerator implementation

  container.registerFactory<MemoryBankGenerator>("MemoryBankGenerator", () => {
    const validator = resolveDependency<IMemoryBankValidator>(container, "IMemoryBankValidator");
    const fileManager = resolveDependency<IMemoryBankFileManager>(
      container,
      "IMemoryBankFileManager"
    );
    const templateManager = resolveDependency<IMemoryBankTemplateManager>(
      container,
      "IMemoryBankTemplateManager"
    );
    const contentProcessor = resolveDependency<IContentProcessor>(container, "IContentProcessor");
    const logger = resolveDependency<ILogger>(container, "ILogger");
    const projectConfigService = resolveDependency<IProjectConfigService>(
      container,
      "IProjectConfigService"
    );
    const projectContextService = resolveDependency<IProjectContextService>(
      container,
      "IProjectContextService"
    );
    const promptBuilder = resolveDependency<IPromptBuilder>(container, "IPromptBuilder");
    const llmAgent = resolveDependency<LLMAgent>(container, "LLMAgent");

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

  // Register RulesGenerator as an IGenerator implementation

  container.registerFactory<IGenerator<string>>("IGenerator.Rules", () => {
    const templateManager = resolveDependency<ITemplateManager>(container, "ITemplateManager");
    const fileOperations = resolveDependency<IFileOperations>(container, "IFileOperations");
    const logger = resolveDependency<ILogger>(container, "ILogger");
    const projectConfigService = resolveDependency<IProjectConfigService>(
      container,
      "IProjectConfigService"
    );
    // Resolve the container itself to pass to BaseService constructor
    const serviceContainer = container; // The container instance is already available
    return new RulesGenerator(
      templateManager,
      fileOperations,
      logger,
      projectConfigService,
      serviceContainer
    );
  });

  // Register SystemPromptsGenerator as an IGenerator implementation
  container.registerFactory<IGenerator<string>>("IGenerator.SystemPrompts", () => {
    const templateManager = resolveDependency<ITemplateManager>(container, "ITemplateManager");
    const fileOperations = resolveDependency<IFileOperations>(container, "IFileOperations");
    const logger = resolveDependency<ILogger>(container, "ILogger");
    const projectConfigService = resolveDependency<IProjectConfigService>(
      container,
      "IProjectConfigService"
    );
    const serviceContainer = container; // The container instance is already available
    return new SystemPromptsGenerator(
      templateManager,
      fileOperations,
      logger,
      projectConfigService,
      serviceContainer
    );
  });

  // Register RoomodesGenerator as an IGenerator implementation
  container.registerFactory<IGenerator<string>>("IGenerator.Roomodes", () => {
    const serviceContainer = container; // The container instance is already available
    const fileOperations = resolveDependency<IFileOperations>(container, "IFileOperations");
    const logger = resolveDependency<ILogger>(container, "ILogger");
    const projectConfigService = resolveDependency<IProjectConfigService>(
      container,
      "IProjectConfigService"
    );

    return new RoomodesGenerator(serviceContainer, fileOperations, logger, projectConfigService);
  });

  // Register VSCodeCopilotRulesGenerator as an IGenerator implementation
  container.registerFactory<IGenerator<string>>("IGenerator.VSCodeCopilotRules", () => {
    const serviceContainer = container; // The container instance is already available
    const fileOperations = resolveDependency<IFileOperations>(container, "IFileOperations");
    const logger = resolveDependency<ILogger>(container, "ILogger");
    const projectConfigService = resolveDependency<IProjectConfigService>(
      container,
      "IProjectConfigService"
    );
    return new VSCodeCopilotRulesGenerator(
      serviceContainer,
      fileOperations,
      logger,
      projectConfigService
    );
  });

  container.registerFactory<IGeneratorOrchestrator>("IGeneratorOrchestrator", () => {
    const container = Container.getInstance();

    // Define generator registration tokens
    const generatorTokens = [
      "IGenerator.Rules",
      "IGenerator.SystemPrompts",
      "IGenerator.Roomodes",
      "IGenerator.VSCodeCopilotRules",
    ];

    // Resolve all registered generators with error handling
    const generators: IGenerator<string>[] = [];
    for (const token of generatorTokens) {
      try {
        const generator = resolveDependency<IGenerator<string>>(container, token);
        generators.push(generator);
      } catch (error) {
        // Log warning but continue - allows partial generator availability
        const logger = resolveDependency<ILogger>(container, "ILogger");
        logger.warn(
          `Failed to resolve generator ${token}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    const projectConfigService = resolveDependency<IProjectConfigService>(
      container,
      "IProjectConfigService"
    );
    const logger = resolveDependency<ILogger>(container, "ILogger");
    return new GeneratorOrchestrator(generators, projectConfigService, logger);
  });
  container.registerSingleton<IProjectManager>("IProjectManager", ProjectManagerStub);

  container.registerFactory<ICliInterface>("ICliInterface", () => {
    const inquirerInstance = resolveDependency<ReturnType<typeof createPromptModule>>(
      container,
      "Inquirer"
    );
    return new CliInterface(inquirerInstance);
  });
  container.registerFactory<ApplicationContainer>("ApplicationContainer", () => {
    const container = Container.getInstance();
    const generatorOrchestrator = resolveDependency<IGeneratorOrchestrator>(
      container,
      "IGeneratorOrchestrator"
    );
    const projectManager = resolveDependency<IProjectManager>(container, "IProjectManager");
    const cliInterface = resolveDependency<ICliInterface>(container, "ICliInterface");
    const logger = resolveDependency<ILogger>(container, "ILogger");
    return new ApplicationContainer(generatorOrchestrator, projectManager, cliInterface, logger);
  });

  // Register MemoryBankCommandHandler factory
  const memoryBankHandlerFactory: Factory<MemoryBankCommandHandler> = () => {
    try {
      const generator = resolveDependency<MemoryBankGenerator>(container, "MemoryBankGenerator");
      const fileOps = resolveDependency<IFileOperations>(container, "IFileOperations");
      const logger = resolveDependency<ILogger>(container, "ILogger");
      const projectContextService = resolveDependency<IProjectContextService>(
        container,
        "IProjectContextService"
      );

      return new MemoryBankCommandHandler(generator, fileOps, logger, projectContextService);
    } catch (error) {
      // Log the error during factory execution
      const logger = resolveDependency<ILogger>(container, "ILogger");
      logger.error("Error creating MemoryBankCommandHandler instance", error as Error);
      throw error; // Re-throw to indicate factory failure
    }
  };

  // Register the factory with the container
  const registrationResult = container.registerFactory(
    "MemoryBankCommandHandler",
    memoryBankHandlerFactory
  );

  if (registrationResult.isErr()) {
    // Log the registration error
    const logger = resolveDependency<ILogger>(container, "ILogger");
    logger.error(
      `Failed to register MemoryBankCommandHandler: ${registrationResult.error?.message}`,
      registrationResult.error
    );
    throw new Error(
      `Failed to register MemoryBankCommandHandler: ${registrationResult.error?.message}`
    );
  }
}

/**
 * Helper function to resolve dependencies from the container with error handling.
 */
export function resolveDependency<T>(container: Container, token: string): T {
  const result = container.resolve<T>(token);
  if (result.isErr()) {
    const err = result.error;
    if (err instanceof Error) {
      throw err;
    } else {
      throw new Error(String(err));
    }
  }
  const value = result.value;
  if (!value) {
    // Include container state or token info for better debugging context
    throw new Error(
      `Dependency '${token}' could not be resolved. Container state: [Unavailable: 'getState' method not implemented]`
    );
  }
  return value;
}
