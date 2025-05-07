import { Injectable } from '../di/decorators';
import { ILLMProvider, LLMCompletionConfig } from './interfaces';
import { Result } from '../result/result';
import { LLMProviderError } from './llm-provider-errors';
import { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { ZodTypeAny, TypeOf } from 'zod';

/**
 * Base class for LLM providers.
 * Each provider implementation should extend this class and implement getCompletion.
 */
@Injectable()
export abstract class BaseLLMProvider implements ILLMProvider {
  abstract readonly name: string;
  protected defaultContextSize: number = 4096;

  /**
   * Get a completion from the LLM provider
   * @param systemPrompt The system prompt to use
   * @param userPrompt The user prompt to use
   * @returns Promise resolving to a Result containing either the completion or an error
   */
  abstract getCompletion(
    systemPrompt: string,
    userPrompt: string
  ): Promise<Result<string, LLMProviderError>>;

  /**
   * Get the maximum context window size for the model
   * @returns Promise resolving to the context window size in tokens
   */
  async getContextWindowSize(): Promise<number> {
    return Promise.resolve(this.defaultContextSize);
  }

  /**
   * Count the number of tokens in a text string
   * @param text The text to count tokens for
   * @returns Promise resolving to the token count
   */
  async countTokens(text: string): Promise<number> {
    // Default implementation uses simple approximation
    return Promise.resolve(Math.ceil(text.length / 4));
  }

  abstract getStructuredCompletion<T extends ZodTypeAny>(
    prompt: BaseLanguageModelInput,
    schema: T,
    completionConfig?: LLMCompletionConfig
  ): Promise<Result<TypeOf<T>, LLMProviderError>>;

  async listModels?(): Promise<Result<string[], LLMProviderError>>;
}
