import { Injectable, Inject } from "../di/decorators";
import { Result } from "../result/result";
import { IGeneratorOrchestrator, IProjectManager, ICliInterface } from "./interfaces";
import { ILogger } from "../services/logger-service";
import { ILLMConfigService } from "../config/interfaces";
import { LLMConfig } from "../../../types/shared";
import { resolveDependency } from "../di/registrations";
import { Container } from "../di/container";

@Injectable()
export class ApplicationContainer {
  constructor(
    @Inject("IGeneratorOrchestrator")
    private readonly generatorOrchestrator: IGeneratorOrchestrator,
    @Inject("IProjectManager") private readonly projectManager: IProjectManager,
    @Inject("ICliInterface") private readonly cliInterface: ICliInterface,
    @Inject("ILogger") private readonly logger: ILogger
  ) {}

  public async run(): Promise<Result<void, Error>> {
    try {
      this.logger.debug("Starting application run sequence.");

      await this.cliInterface.parseArgs();
      const parsedArgs = this.cliInterface.getParsedArgs();
      this.logger.debug(
        `CLI arguments parsed: Command='${parsedArgs.command}', Options=${JSON.stringify(parsedArgs.options)}`
      );

      await this.projectManager.loadProjectConfig();
      this.logger.debug("Project configuration loaded.");

      await this.generatorOrchestrator.initialize();
      this.logger.debug("Generator orchestrator initialized.");

      if (parsedArgs.command === "generate") {
        const selectedGenerators = parsedArgs.options.generators as string[];
        this.logger.info(
          `Executing 'generate' command with generators: ${selectedGenerators.join(", ") || "All (default)"}`
        );
        await this.generatorOrchestrator.execute(selectedGenerators);
        this.logger.debug("Generator orchestrator execution completed for 'generate' command.");
      } else if (parsedArgs.command === "config") {
        this.logger.info("Executing 'config' command.");
        const llmConfigService = resolveDependency<ILLMConfigService>(
          Container.getInstance(),
          "ILLMConfigService"
        );
        const options = parsedArgs.options;
        const cliInterface = resolveDependency<ICliInterface>(
          Container.getInstance(),
          "ICliInterface"
        );

        const hasCliOptions = options.provider || options.apiKey || options.model;

        const configResult = await llmConfigService.loadConfig();
        let currentConfig: LLMConfig | null = null;

        if (configResult.isOk() && configResult.value) {
          currentConfig = configResult.value;
          if (llmConfigService.validateConfig(currentConfig)) {
            this.logger.warn(
              "Existing LLM config is invalid. Will overwrite with provided/default values."
            );
            currentConfig = null;
          }
        } else if (configResult.isErr()) {
          const error = configResult.error;
          const isFileNotFound = error instanceof Error && (error as any).code === "ENOENT";
          if (isFileNotFound) {
            const answer = await cliInterface.prompt({
              type: "confirm",
              name: "createConfig",
              message: "LLM config file not found. Would you like to create it now?",
              default: true,
            });
            if (!answer.createConfig) {
              this.logger.info("LLM config creation declined by user. Exiting.");
              return Result.ok(undefined);
            }
            currentConfig = {
              provider: "",
              apiKey: "",
              model: "",
              maxTokens: 2048,
              temperature: 0.7,
            };
          } else {
            this.logger.error(
              `Error loading existing LLM config: ${error?.message}. Proceeding with defaults/CLI args.`
            );
          }
        }

        if (hasCliOptions) {
          this.logger.debug(
            "Config options provided via CLI flags. Merging with existing/default."
          );

          const baseConfig: LLMConfig = currentConfig ?? {
            provider: "",
            apiKey: "",
            model: "",
            maxTokens: 2048,
            temperature: 0.7,
          };

          const updatedConfig: LLMConfig = {
            ...baseConfig,
            provider: options.provider ? String(options.provider) : baseConfig.provider,
            apiKey: options.apiKey ? String(options.apiKey) : baseConfig.apiKey,
            model: options.model ? String(options.model) : baseConfig.model,
          };

          const validationError = llmConfigService.validateConfig(updatedConfig);
          if (validationError) {
            throw new Error(
              `Invalid LLM configuration after applying CLI options: ${validationError}`
            );
          }

          const saveResult = await llmConfigService.saveConfig(updatedConfig);
          if (saveResult.isErr()) {
            throw saveResult.error ?? new Error("Unknown error saving LLM config.");
          }
          this.logger.info("LLM configuration updated successfully via CLI flags.");
        } else {
          this.logger.debug("No config options provided via CLI flags, starting interactive edit.");

          const configForEdit: LLMConfig = currentConfig ?? {
            provider: "",
            apiKey: "",
            model: "",
            maxTokens: 2048,
            temperature: 0.7,
          };

          const editResult = await llmConfigService.interactiveEditConfig(configForEdit);
          if (editResult.isErr()) {
            throw (
              editResult.error ?? new Error("Unknown error during interactive LLM config edit.")
            );
          }
          this.logger.info("LLM configuration updated successfully via interactive mode.");
        }
      } else {
        this.logger.warn(
          "No command specified or command not recognized. Showing help might be appropriate here."
        );
      }

      this.logger.debug("Application run sequence completed successfully.");
      return Result.ok(undefined);
    } catch (error) {
      this.logger.error(
        "Application run sequence failed.",
        error instanceof Error ? error : undefined
      );
      this.logger.debug(error instanceof Error ? (error.stack ?? String(error)) : String(error));
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
