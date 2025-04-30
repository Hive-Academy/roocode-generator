import { Result } from '../result/result';
import type { AnalysisResult, LLMConfig } from '../../../types/shared';
import { LLMProviderError } from './llm-provider-errors';

export interface ILLMProvider {
  readonly name: string;
  getCompletion(systemPrompt: string, userPrompt: string): Promise<Result<string, Error>>;
  listModels?(): Promise<Result<string[], LLMProviderError>>;
  getContextWindowSize(): Promise<number>;
  countTokens(text: string): Promise<number>;
}

export interface ILLMProviderRegistry {
  getProvider(): Promise<Result<ILLMProvider, Error>>;
  getProviderFactory(providerName: string): Result<LLMProviderFactory, Error>;
}

export interface ILLMAgent {
  analyzeProject(projectDir: string): Promise<Result<AnalysisResult, Error>>;
  getCompletion(systemPrompt: string, userPrompt: string): Promise<Result<string, Error>>;
  getModelContextWindow(): Promise<number>; // Updated to async
  countTokens(text: string): Promise<number>; // Updated to async
  getProvider(): Promise<Result<ILLMProvider, Error>>; // Updated to async
}

/**
 * Interface for services that can list available models for a specific LLM provider
 */
export interface IModelListerService {
  /**
   * Lists all available models for a given provider
   * @param providerName The name of the LLM provider
   * @param apiKey The API key to use for authentication
   * @returns A Result containing an array of model IDs or an Error
   */
  listModelsForProvider(providerName: string, apiKey: string): Promise<Result<string[], Error>>;
}

export type LLMProviderFactory = (config: LLMConfig) => Result<ILLMProvider, Error>;
