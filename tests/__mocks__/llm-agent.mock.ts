import { LLMAgent } from '../../src/core/llm/llm-agent';
import { Result } from '../../src/core/result/result';
import { ILLMProvider, LLMCompletionConfig } from '../../src/core/llm/interfaces';
import { LLMProviderError } from '../../src/core/llm/llm-provider-errors';
import type { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { z } from 'zod';

// Define the structure based on LLMAgent, mocking necessary methods
export const createMockLLMAgent = (): jest.Mocked<LLMAgent> => {
  const mockSuccessfulProvider: jest.Mocked<ILLMProvider> = {
    name: 'mockProvider',
    getCompletion: jest
      .fn<Promise<Result<string, LLMProviderError>>, [string, string]>()
      .mockResolvedValue(Result.ok('mock provider completion')),
    getStructuredCompletion: jest.fn().mockImplementation(
      <T extends z.ZodTypeAny>(
        _prompt: BaseLanguageModelInput, // Prefixed unused
        schema: T,
        _completionConfig?: LLMCompletionConfig // Prefixed unused
      ): Promise<Result<z.infer<T>, LLMProviderError>> => {
        try {
          if (schema instanceof z.ZodObject) {
            const mockData = Object.keys(schema.shape as object).reduce(
              (acc: Record<string, any>, key) => {
                // Typed acc
                const fieldSchema = schema.shape[key];
                if (fieldSchema instanceof z.ZodString) acc[key] = `mock ${key}`;
                else if (fieldSchema instanceof z.ZodNumber) acc[key] = 0;
                else if (fieldSchema instanceof z.ZodBoolean) acc[key] = false;
                else if (fieldSchema instanceof z.ZodArray) acc[key] = [];
                else if (fieldSchema instanceof z.ZodObject) acc[key] = {};
                else acc[key] = undefined;
                return acc;
              },
              {}
            ); // Initial value for reduce
            return Promise.resolve(Result.ok(mockData as z.infer<T>));
          }
        } catch {
          // Prefixed unused
          /* ignore, fallback to generic object */
        }
        return Promise.resolve(Result.ok({ mockKey: 'mockValue' } as any));
      }
    ),
    getContextWindowSize: jest.fn<Promise<number>, []>().mockResolvedValue(4096),
    countTokens: jest.fn<Promise<number>, [string]>().mockResolvedValue(10),
    listModels: jest
      .fn<Promise<Result<string[], LLMProviderError>>, []>()
      .mockResolvedValue(Result.ok(['mock-model-1', 'mock-model-2'])),
  };

  const mockAgent = {
    analyzeProject: jest.fn().mockResolvedValue(Result.ok({ mockAnalysis: true })),
    getCompletion: jest
      .fn<Promise<Result<string, LLMProviderError>>, [string, string]>()
      .mockResolvedValue(Result.ok('Default Mock LLM Content')),
    getStructuredCompletion: jest.fn().mockImplementation(
      <T extends z.ZodTypeAny>(
        _prompt: BaseLanguageModelInput, // Prefixed unused
        schema: T,
        _completionConfig?: LLMCompletionConfig // Prefixed unused
      ): Promise<Result<z.infer<T>, LLMProviderError>> => {
        try {
          if (schema instanceof z.ZodObject) {
            const mockData = Object.keys(schema.shape as object).reduce(
              (acc: Record<string, any>, key) => {
                // Typed acc
                const fieldSchema = schema.shape[key];
                if (fieldSchema instanceof z.ZodString) acc[key] = `mock agent ${key}`;
                else acc[key] = undefined;
                return acc;
              },
              {}
            ); // Initial value for reduce
            return Promise.resolve(Result.ok(mockData as z.infer<T>));
          }
        } catch {
          // Prefixed unused
          /* ignore */
        }
        return Promise.resolve(Result.ok({ mockAgentKey: 'mockAgentValue' } as any));
      }
    ),
    getModelContextWindow: jest.fn<Promise<number>, []>().mockResolvedValue(8000),
    getProvider: jest
      .fn<Promise<Result<ILLMProvider, LLMProviderError>>, []>()
      .mockResolvedValue(Result.ok(mockSuccessfulProvider)),
    countTokens: jest.fn<Promise<number>, [string]>().mockResolvedValue(100),
  } as unknown as jest.Mocked<LLMAgent>;

  return mockAgent;
};

export const mockLLMAgent = createMockLLMAgent();
