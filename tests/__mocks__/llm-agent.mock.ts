import { LLMAgent } from '../../src/core/llm/llm-agent';
import { Result } from '../../src/core/result/result';
import { ILLMProvider } from '../../src/core/llm/interfaces'; // Added import

// Define the structure based on LLMAgent, mocking necessary methods
export const createMockLLMAgent = (): jest.Mocked<LLMAgent> => {
  const mockAgent = {
    getCompletion: jest
      .fn<Promise<Result<string, Error>>, [string, string]>()
      .mockResolvedValue(Result.ok('Default Mock LLM Content')),

    getModelContextWindow: jest.fn<Promise<number>, []>().mockResolvedValue(8000),

    getProvider: jest.fn(() =>
      // Corrected: Provide implementation for getProvider
      Promise.resolve(
        // getProvider returns a Promise
        Result.ok({
          // The promise resolves to a Result
          name: 'mockProvider',
          // For methods of the returned ILLMProvider object:
          getCompletion: jest.fn().mockResolvedValue(Result.ok('mock provider completion')),
          getContextWindowSize: jest.fn().mockResolvedValue(4096),
          countTokens: jest.fn().mockResolvedValue(10),
          // listModels is optional, so not strictly needed for the mock to be valid
        } as ILLMProvider) // The Result.ok contains an ILLMProvider
      )
    ),

    countTokens: jest.fn<Promise<number>, [string]>().mockResolvedValue(100),
  } as unknown as jest.Mocked<LLMAgent>;

  return mockAgent;
};

export const mockLLMAgent = createMockLLMAgent();
