import { LLMConfig, ProjectConfig } from '../../../types/shared';
import { Result } from '../result/result';

export interface ILLMConfigService {
  loadConfig(): Promise<Result<LLMConfig>>;
  saveConfig(config: LLMConfig): Promise<Result<void>>;
  interactiveEditConfig(config: LLMConfig): Promise<Result<void>>;
  validateConfig(config: LLMConfig): string | null;
}

export interface IProjectConfigService {
  loadConfig(): Promise<Result<ProjectConfig, Error>>;
  saveConfig(config: ProjectConfig): Promise<Result<void, Error>>;
  validateConfig(config: ProjectConfig): string | null;
}
