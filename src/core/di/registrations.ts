import { Container } from "./container";
import { ILogger, LoggerService } from "../services/logger-service";
import { IFileOperations } from "../file-operations/interfaces";
import { FileOperations } from "../file-operations/file-operations";
import { TemplateManager } from "../template-manager/template-manager";
import { ITemplateManager } from "../template-manager/interfaces";

import { ILLMProvider } from "../llm/interfaces";
import {
  OpenAILLMProvider,
  GoogleGenAILLMProvider,
  AnthropicLLMProvider,
} from "../llm/llm-provider";
import { LLMProviderRegistry } from "../llm/provider-registry";
import { LLMAgent } from "../llm/llm-agent";
import { ProjectConfigService } from "../config/project-config.service";

import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatAnthropic } from "@langchain/anthropic";

import { OpenAIConfig, GoogleGenAIConfig, AnthropicConfig } from "../llm/llm-provider-configs";
import { ILLMConfigService, IProjectConfigService } from "../config/interfaces";
import { LLMConfigService } from "../config/llm-config.service";
import inquirer from "inquirer";

// Register ApplicationContainer and its dependencies (placeholders for now)
import { ApplicationContainer } from "../application/application-container";
import { IGeneratorOrchestrator, IProjectManager, ICliInterface } from "../application/interfaces";
import { Injectable } from "./decorators"; // Import Injectable

@Injectable() // Add Injectable decorator
class ProjectManagerStub implements IProjectManager {
  async loadProjectConfig(): Promise<void> {}
  async saveProjectConfig(): Promise<void> {}
}

import { CliInterface } from "../cli/cli-interface";
import { GeneratorOrchestrator } from "../application/generator-orchestrator";
import { IGenerator } from "../generators/base-generator";
import { MemoryBankGenerator } from "../../memory-bank/MemoryBankGenerator";
import { RulesGenerator } from "../../generators/rules-generator"; // Correct path relative to src/core/di
import { SystemPromptsGenerator } from "../../generators/system-prompts-generator"; // Correct path relative to src/core/di

import { RoomodesGenerator } from "../../generators/roomodes-generator"; // Correct path relative to src/core/di
import { VSCodeCopilotRulesGenerator } from "../../generators/vscode-copilot-rules-generator"; // Correct path relative to src/core/di
import {
  IMemoryBankValidator,
  IMemoryBankFileManager,
  IMemoryBankTemplateManager,
  IContentProcessor,
} from "../../memory-bank/interfaces"; // Import MemoryBank dependencies
import { MemoryBankTemplateManager } from "../../memory-bank/MemoryBankTemplateManager";
import { MemoryBankFileManager } from "../../memory-bank/MemoryBankFileManager";
import { MemoryBankValidator } from "../../memory-bank/MemoryBankValidator";
import { ContentProcessor } from "../../memory-bank/ContentProcessor";

/**
 *  @description Registers services with the DI container.
 *  This function should be called once at application startup to set up the DI container.
 * @returns {void}
 */
export function registerServices(): void {
  const container = Container.getInstance();

  container.registerSingleton<ILogger>("ILogger", LoggerService);
  container.registerFactory("Inquirer", () => inquirer);

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

  // Register config classes as singletons
  container.registerSingleton<OpenAIConfig>("OpenAIConfig", OpenAIConfig);
  container.registerSingleton<GoogleGenAIConfig>("GoogleGenAIConfig", GoogleGenAIConfig);
  container.registerSingleton<AnthropicConfig>("AnthropicConfig", AnthropicConfig);

  // Register client factory functions for each provider
  container.registerFactory<() => ChatOpenAI>("OpenAIClientFactory", () => {
    return () =>
      new ChatOpenAI({
        modelName: process.env.LLM_MODEL || "gpt-4",
        temperature: 0.2,
        openAIApiKey: process.env.OPENAI_API_KEY || "",
      });
  });

  container.registerFactory<() => ChatGoogleGenerativeAI>("GoogleGenAIClientFactory", () => {
    return () =>
      new ChatGoogleGenerativeAI({
        model: process.env.LLM_MODEL || "models/chat-bison-001",
        temperature: 0.2,
      });
  });

  container.registerFactory<() => ChatAnthropic>("AnthropicClientFactory", () => {
    return () =>
      new ChatAnthropic({
        modelName: process.env.LLM_MODEL || "claude-v1",
      });
  });

  // Register factories for LLM providers that instantiate with config and client factory
  container.registerFactory<ILLMProvider>("ILLMProvider.OpenAI", () => {
    const config = resolveDependency<OpenAIConfig>(container, "OpenAIConfig");
    const clientFactory = resolveDependency<() => ChatOpenAI>(container, "OpenAIClientFactory");
    return new OpenAILLMProvider(config, clientFactory);
  });

  container.registerFactory<ILLMProvider>("ILLMProvider.GoogleGenAI", () => {
    const config = resolveDependency<GoogleGenAIConfig>(container, "GoogleGenAIConfig");
    const clientFactory = resolveDependency<() => ChatGoogleGenerativeAI>(
      container,
      "GoogleGenAIClientFactory"
    );
    return new GoogleGenAILLMProvider(config, clientFactory);
  });

  container.registerFactory<ILLMProvider>("ILLMProvider.Anthropic", () => {
    const config = resolveDependency<AnthropicConfig>(container, "AnthropicConfig");
    const clientFactory = resolveDependency<() => ChatAnthropic>(
      container,
      "AnthropicClientFactory"
    );
    return new AnthropicLLMProvider(config, clientFactory);
  });

  // Register the LLMProviderRegistry using a factory that resolves providers internally
  container.registerFactory<LLMProviderRegistry>("LLMProviderRegistry", () => {
    // Resolve providers *inside* the factory, only when the registry is needed
    const openAIProvider = resolveDependency<ILLMProvider>(container, "ILLMProvider.OpenAI");
    const googleGenAIProvider = resolveDependency<ILLMProvider>(
      container,
      "ILLMProvider.GoogleGenAI"
    );
    const anthropicProvider = resolveDependency<ILLMProvider>(container, "ILLMProvider.Anthropic");

    // Instantiate and return the registry
    return new LLMProviderRegistry([openAIProvider, googleGenAIProvider, anthropicProvider]);
  });
  // Note: We assume LLMProviderRegistry should be transient unless explicitly needed as singleton.
  // If singleton is needed, manage the instance within the factory or use registerSingleton with a factory.

  // Register LLMAgent with factory resolving dependencies manually
  container.registerFactory<LLMAgent>("LLMAgent", () => {
    const registry = resolveDependency<LLMProviderRegistry>(container, "LLMProviderRegistry");
    const fileOps = resolveDependency<IFileOperations>(container, "IFileOperations");
    const logger = resolveDependency<ILogger>(container, "ILogger");
    // Use configuration-driven provider name
    const providerName = process.env.DEFAULT_LLM_PROVIDER || "openai";
    const defaultProviderResult = registry.getProvider(providerName);

    if (defaultProviderResult.isErr()) {
      throw (
        defaultProviderResult.error ?? new Error("Unknown error resolving default LLM provider")
      );
    }
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
  container.registerFactory<IGenerator>("IGenerator.MemoryBank", () => {
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
    return new MemoryBankGenerator(
      validator,
      fileManager,
      templateManager,
      contentProcessor,
      logger,
      projectConfigService
    );
  });

  // Register RulesGenerator as an IGenerator implementation
  container.registerFactory<IGenerator>("IGenerator.Rules", () => {
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
  container.registerFactory<IGenerator>("IGenerator.SystemPrompts", () => {
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
  container.registerFactory<IGenerator>("IGenerator.Roomodes", () => {
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
  container.registerFactory<IGenerator>("IGenerator.VSCodeCopilotRules", () => {
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
    // Resolve all registered generators.
    // TODO: Implement a mechanism to resolve all instances tagged as 'IGenerator'
    // For now, manually resolve the known generator(s).
    const memoryBankGenerator = resolveDependency<IGenerator>(container, "IGenerator.MemoryBank");
    const rulesGenerator = resolveDependency<IGenerator>(container, "IGenerator.Rules");
    const systemPromptsGenerator = resolveDependency<IGenerator>(
      container,
      "IGenerator.SystemPrompts"
    );

    const roomodesGenerator = resolveDependency<IGenerator>(container, "IGenerator.Roomodes"); // Resolve RoomodesGenerator
    const vscodeCopilotRulesGenerator = resolveDependency<IGenerator>(
      container,
      "IGenerator.VSCodeCopilotRules"
    ); // Resolve VSCodeCopilotRulesGenerator
    const generators: IGenerator[] = [
      memoryBankGenerator,
      rulesGenerator,
      systemPromptsGenerator,
      roomodesGenerator,
      vscodeCopilotRulesGenerator, // Add VSCodeCopilotRulesGenerator to the array
    ];

    const projectConfigService = resolveDependency<IProjectConfigService>(
      container,
      "IProjectConfigService"
    );
    const logger = resolveDependency<ILogger>(container, "ILogger");
    return new GeneratorOrchestrator(generators, projectConfigService, logger);
  });
  container.registerSingleton<IProjectManager>("IProjectManager", ProjectManagerStub);
  container.registerSingleton<ICliInterface>("ICliInterface", CliInterface);
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
