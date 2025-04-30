import { Result } from '../result/result';
import type { AnalysisResult, LLMConfig } from '../../../types/shared';
import { LLMProviderError } from './llm-provider-errors';

export interface ILLMProvider {
  readonly name: string;
  getCompletion(systemPrompt: string, userPrompt: string): Promise<Result<string, Error>>;
  listModels?(): Promise<Result<string[], LLMProviderError>>;
}

export interface ILLMProviderRegistry {
  getProvider(): Promise<Result<ILLMProvider, Error>>;
}

export interface ILLMAgent {
  analyzeProject(projectDir: string): Promise<Result<AnalysisResult, Error>>;
  getCompletion(systemPrompt: string, userPrompt: string): Promise<Result<string, Error>>;
}

export type LLMProviderFactory = (config: LLMConfig) => Result<ILLMProvider, Error>;
