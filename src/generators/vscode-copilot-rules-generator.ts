/**
 * @fileoverview Generator for VSCode Copilot rules configuration.
 */

import path from 'path';

import { BaseGenerator, IGenerator } from '../core/generators/base-generator';
import { IFileOperations } from '../core/file-operations/interfaces';
import { ILogger } from '../core/services/logger-service';
import { IProjectConfigService } from '../core/config/interfaces';
import { Result } from '../core/result/result';
import { Container } from '../core/di/container'; // Import Container
import { Inject, Injectable } from '../core/di';

/**
 * Generates VSCode settings to configure Copilot behavior (e.g., enabling/disabling for specific languages).
 */
@Injectable()
export class VSCodeCopilotRulesGenerator
  extends BaseGenerator<string>
  implements IGenerator<string>
{
  /**
   * Unique name of the generator.
   */
  readonly name = 'vscode-copilot-rules';

  private readonly projectConfigService: IProjectConfigService;
  private readonly fileOperations: IFileOperations;
  private readonly logger: ILogger; // Declare logger property

  /**
   * Constructs a new instance of VSCodeCopilotRulesGenerator.
   * @param serviceContainer - The DI container instance.
   * @param fileOperations - Service for file system operations.
   * @param logger - Service for logging.
   * @param projectConfigService - Service for accessing project configuration.
   */
  constructor(
    @Inject('Container') serviceContainer: Container, // Inject Container
    @Inject('IFileOperations') fileOperations: IFileOperations,
    @Inject('ILogger') logger: ILogger,
    @Inject('IProjectConfigService') projectConfigService: IProjectConfigService
  ) {
    // Pass container to BaseService constructor.
    super(serviceContainer); // Corrected super call
    this.fileOperations = fileOperations;
    this.projectConfigService = projectConfigService;
    this.logger = logger; // Assign injected logger to the local property
    this.logger.debug(`VSCodeCopilotRulesGenerator initialized`);
  }

  /**
   * Validates that essential dependencies are resolved.
   * @returns Result indicating success or failure.
   */
  protected validateDependencies(): Result<void, Error> {
    // Validate logger dependency
    if (!this.logger) {
      return Result.err(new Error('Logger dependency not resolved.'));
    }
    if (!this.fileOperations) {
      return Result.err(new Error('FileOperations dependency not resolved.'));
    }
    if (!this.projectConfigService) {
      return Result.err(new Error('ProjectConfigService dependency not resolved.'));
    }
    return Result.ok(undefined);
  }

  /**
   * Validates generator requirements. Currently checks if project config can be loaded.
   * @returns Promise<Result<void, Error>> indicating validation success or failure.
   */
  async validate(): Promise<Result<void, Error>> {
    this.logger.debug('Validating VSCodeCopilotRulesGenerator...');
    const configResult = await Promise.resolve(this.projectConfigService.loadConfig());
    if (configResult.isErr()) {
      // Added check for error existence before accessing message
      const errorMessage = configResult.error?.message ?? 'Unknown error';
      return Result.err(new Error(`Failed to load project config: ${errorMessage}`));
    }
    this.logger.debug('VSCodeCopilotRulesGenerator validation successful.');
    return Result.ok(undefined);
  }

  /**
   * Executes the VSCode Copilot rules generation.
   * Creates or updates `.vscode/settings.json` with Copilot rules.
   * @returns Promise<Result<void, Error>> indicating generation success or failure.
   */
  protected async executeGeneration(): Promise<Result<string, Error>> {
    this.logger.info('Executing VSCode Copilot Rules generation...');

    const configResult = await Promise.resolve(this.projectConfigService.loadConfig());
    if (configResult.isErr()) {
      const errorMessage = configResult.error?.message ?? 'Unknown error';
      return Result.err(
        new Error(`Failed to load project config during execution: ${errorMessage}`)
      );
    }

    const projectConfig = configResult.value;
    if (!projectConfig?.baseDir) {
      return Result.err(new Error('Project base directory is not defined in the configuration.'));
    }

    // 1. Ensure .vscode directory exists
    const vscodeDir = path.join(projectConfig.baseDir, '.vscode');
    const createDirResult = await this.fileOperations.createDirectory(vscodeDir);
    if (createDirResult.isErr()) {
      const errorMessage = createDirResult.error?.message ?? 'Unknown error';
      return Result.err(new Error(`Failed to create .vscode directory: ${errorMessage}`));
    }

    // 2. Copy rule files
    const ruleFilesCopyResult = await this.copyRuleFiles(projectConfig.baseDir, vscodeDir);
    if (ruleFilesCopyResult.isErr()) {
      return Result.err(
        new Error(ruleFilesCopyResult.error?.message ?? 'Failed to copy rule files')
      );
    }

    // 3. Copy and modify MCP usage guide
    const mcpGuideResult = await this.copyAndModifyMcpGuide(projectConfig.baseDir, vscodeDir);
    if (mcpGuideResult.isErr()) {
      return Result.err(
        new Error(mcpGuideResult.error?.message ?? 'Failed to copy and modify MCP guide')
      );
    }

    // 4. Update settings.json
    const settingsUpdateResult = await this.updateSettingsJson(vscodeDir);
    if (settingsUpdateResult.isErr()) {
      return Result.err(
        new Error(settingsUpdateResult.error?.message ?? 'Failed to update settings.json')
      );
    }

    this.logger.info(`Successfully generated/updated VSCode Copilot rules in ${vscodeDir}`);
    return Result.ok('VSCode Copilot rules generated successfully.');
  }

  /**
   * Copies rule files from templates/rules to .vscode directory
   */
  private async copyRuleFiles(baseDir: string, vscodeDir: string): Promise<Result<void, Error>> {
    this.logger.debug('Copying rule files to .vscode directory...');

    const ruleFiles = ['architect-rule.md', 'code-rule.md', 'code-review-rule.md'];

    for (const ruleFile of ruleFiles) {
      const sourcePath = path.join(baseDir, 'templates', 'rules', ruleFile);
      const destPath = path.join(vscodeDir, ruleFile);

      // Read source file
      const readResult = await this.fileOperations.readFile(sourcePath);
      if (readResult.isErr()) {
        return Result.err(
          new Error(
            `Failed to read rule file ${ruleFile}: ${readResult.error?.message ?? 'Unknown error'}`
          )
        );
      }

      // Write to destination
      const writeResult = await this.fileOperations.writeFile(destPath, readResult.value ?? '');
      if (writeResult.isErr()) {
        return Result.err(
          new Error(`Failed to write rule file ${ruleFile}: ${writeResult.error?.message}`)
        );
      }
    }

    return Result.ok(undefined);
  }

  /**
   * Copies and modifies the MCP usage guide to create mcp-usage-rule.md
   */
  private async copyAndModifyMcpGuide(
    baseDir: string,
    vscodeDir: string
  ): Promise<Result<void, Error>> {
    this.logger.debug('Copying and modifying MCP usage guide...');

    const sourcePath = path.join(baseDir, 'templates', 'guide', 'vscode-mcp-usage-guide.md');
    const destPath = path.join(vscodeDir, 'mcp-usage-rule.md');

    // Read source file
    const readResult = await this.fileOperations.readFile(sourcePath);
    if (readResult.isErr()) {
      return Result.err(new Error(`Failed to read MCP usage guide: ${readResult.error?.message}`));
    }

    // Modify content
    const modifiedContent =
      readResult.value +
      '\n\n**Rule:** Always use tools from the defined MCP servers whenever possible.**';

    // Write to destination
    const writeResult = await this.fileOperations.writeFile(destPath, modifiedContent);
    if (writeResult.isErr()) {
      return Result.err(new Error(`Failed to write MCP usage rule: ${writeResult.error?.message}`));
    }

    return Result.ok(undefined);
  }

  /**
   * Updates settings.json with rule file references
   */
  private async updateSettingsJson(vscodeDir: string): Promise<Result<void, Error>> {
    this.logger.debug('Updating settings.json with rule file references...');

    const settingsPath = path.join(vscodeDir, 'settings.json');
    let currentSettings: Record<string, unknown> = {};

    // Check if settings file exists
    const readFileResult = await this.fileOperations.exists(settingsPath);

    if (readFileResult.value !== true) {
      // File doesn't exist, create it with empty object
      this.logger.debug('settings.json does not exist. Creating with empty object.');
      const createResult = await this.fileOperations.writeFile(settingsPath, '{}');
      if (createResult.isErr()) {
        return Result.err(
          new Error(`Failed to create settings.json: ${createResult.error?.message}`)
        );
      }
    } else if (readFileResult.isOk() && readFileResult.value !== undefined) {
      try {
        const settingsContent = await this.fileOperations.readFile(settingsPath);
        currentSettings = JSON.parse(settingsContent.value as string);
        if (typeof currentSettings !== 'object' || currentSettings === null) {
          this.logger.warn('Existing settings.json is not a valid JSON object. Overwriting.');
          currentSettings = {};
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to parse existing settings.json: ${errorMessage}. Overwriting.`);
        currentSettings = {};
      }
    } else if (readFileResult.isOk()) {
      this.logger.warn('settings.json content is undefined. Creating new file.');
    } else if (!readFileResult.error?.message.includes('ENOENT')) {
      // Different error reading the file, return it
      return Result.err(
        new Error(`Failed to read settings.json: ${readFileResult.error?.message}`)
      );
    }

    // Define the Copilot rules structure
    const copilotRules = {
      'github.copilot.enable': {
        '*': true,
        plaintext: false,
        markdown: false,
        scminput: false,
      },
    };

    // Update settings with rule file references and existing Copilot rules
    currentSettings = {
      ...currentSettings,
      ...copilotRules,
      'github.copilot.chat.codeGeneration.instructions': [
        { file: 'mcp-usage-rule.md' },
        { file: 'boomerang-rule.md' },
        { file: 'architect-rule.md' },
        { file: 'code-rule.md' },
      ],
      'github.copilot.chat.reviewSelection.instructions': [
        { file: 'mcp-usage-rule.md' },
        { file: 'code-review-rule.md' },
      ],
    };

    // Write updated settings back to file
    const settingsContent = JSON.stringify(currentSettings, null, 2);
    const writeFileResult = await this.fileOperations.writeFile(settingsPath, settingsContent);

    if (writeFileResult.isErr()) {
      return Result.err(
        new Error(`Failed to write settings.json: ${writeFileResult.error?.message}`)
      );
    }

    return Result.ok(undefined);
  }
}
