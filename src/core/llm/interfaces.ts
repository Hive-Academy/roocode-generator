import { Result } from '../result/result';
import type { AnalysisResult, LLMConfig } from '../../../types/shared';
import { LLMProviderError } from './llm-provider-errors';
import { z } from 'zod'; // Added import for Zod
import type { BaseLanguageModelInput } from '@langchain/core/language_models/base'; // Added import

// TODO: This should ideally be moved to a shared types file (e.g., types/shared.d.ts)
export interface LLMCompletionConfig {
  temperature?: number;
  maxTokens?: number; // Max tokens for the completion/output
  stopSequences?: string[]; // Will be mapped to 'stop' in runtimeCallOptions
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  // Other parameters from ChatOpenAIParameters can be added here
}

export interface ILLMProvider {
  readonly name: string;
  getCompletion(
    systemPrompt: string,
    userPrompt: string
  ): Promise<Result<string, LLMProviderError>>; // Changed Error to LLMProviderError
  getStructuredCompletion<T extends z.ZodTypeAny>(
    prompt: BaseLanguageModelInput,
    schema: T,
    completionConfig?: LLMCompletionConfig
  ): Promise<Result<z.infer<T>, LLMProviderError>>; // Return LLMProviderError
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
  getCompletion(
    systemPrompt: string,
    userPrompt: string
  ): Promise<Result<string, LLMProviderError>>; // Changed Error to LLMProviderError
  getStructuredCompletion<T extends z.ZodTypeAny>(
    prompt: BaseLanguageModelInput,
    schema: T,
    completionConfig?: LLMCompletionConfig
  ): Promise<Result<z.infer<T>, LLMProviderError>>; // Return LLMProviderError
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
  listModelsForProvider(
    providerName: string,
    apiKey: string
  ): Promise<Result<string[], LLMProviderError>>; // Changed Error to LLMProviderError

  /**
   * Gets the context window size for a specific model of a given provider.
   * This method may create a temporary, isolated instance of the provider.
   *
   * @param providerName The name of the LLM provider (e.g., 'openai', 'anthropic').
   * @param apiKey The API key for the provider.
   * @param modelName The specific model name.
   * @returns A Promise resolving to a Result containing the context window size (number) or an LLMProviderError.
   */
  getContextWindowSize(
    providerName: string,
    apiKey: string,
    modelName: string
  ): Promise<Result<number, LLMProviderError>>;
}

export type LLMProviderFactory = (config: LLMConfig) => Result<ILLMProvider, LLMProviderError>; // Changed Error to LLMProviderError
