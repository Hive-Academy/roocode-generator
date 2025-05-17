import { execSync } from 'child_process';
import * as fs from 'fs';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Configuration for the E2E test environment
 */
interface E2ETestConfig {
  workingDirectory: string;
  configFile: string;
  llmConfigFile: string;
}

/**
 * Sets up the environment for E2E testing
 */
export class E2ETestSetup {
  private config: E2ETestConfig;

  constructor(config: E2ETestConfig) {
    this.config = config;
  }

  /**
   * Initializes the test environment
   */
  public async initialize(): Promise<void> {
    console.log('Setting up E2E test environment...');

    // Ensure working directory exists
    if (!existsSync(this.config.workingDirectory)) {
      throw new Error(`Working directory ${this.config.workingDirectory} does not exist`);
    }

    // Create initial configuration files
    await this.setupConfigFiles();

    // Run npm install to ensure dependencies
    this.runNpmInstall();

    console.log('E2E test environment setup complete');
  }

  /**
   * Sets up the configuration files needed for testing
   */
  private async setupConfigFiles(): Promise<void> {
    // Create base configuration
    const baseConfig = {
      projectRoot: this.config.workingDirectory,
      outputDir: join(this.config.workingDirectory, 'output'),
      verbose: true,
      debug: true,
    };

    // Create LLM configuration
    const llmConfig = {
      provider: 'openai',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
    };

    // Write configuration files
    await this.createConfigFile(this.config.configFile, baseConfig);
    await this.createConfigFile(this.config.llmConfigFile, llmConfig);

    console.log('Configuration files created');
  }

  /**
   * Runs npm install to ensure all dependencies are available
   */
  private runNpmInstall(): void {
    try {
      execSync('npm install', { stdio: 'inherit', cwd: this.config.workingDirectory });
      console.log('Dependencies installed successfully');
    } catch (error: any) {
      throw new Error(`Failed to install dependencies: ${error}`);
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return `Error during E2E test setup: ${error.message}`;
    }
    return 'Unknown error during E2E test setup';
  }

  private async createConfigFile(filePath: string, config: unknown): Promise<void> {
    await fs.promises.writeFile(filePath, JSON.stringify(config, null, 2));
  }
}

/**
 * Helper function to create a new test setup instance
 */
export function createE2ETestSetup(workingDir: string): E2ETestSetup {
  return new E2ETestSetup({
    workingDirectory: workingDir,
    configFile: join(workingDir, '.roocode.json'),
    llmConfigFile: join(workingDir, '.roocode-llm.json'),
  });
}
