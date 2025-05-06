import { LLMAgent } from '../../src/core/llm/llm-agent';
import { Result } from '../../src/core/result/result';
// Removed unused import

// Define the structure based on LLMAgent, mocking necessary methods
export const createMockLLMAgent = (): jest.Mocked<LLMAgent> => {
  // We need to cast to 'any' first because the constructor is private/complex
  // and we are only mocking the public interface methods we need.
  const mockAgent = {
    // Mock getCompletion as a Jest mock function
    getCompletion: jest
      .fn<Promise<Result<string, Error>>, [string, string]>()
      .mockResolvedValue(Result.ok('Default Mock LLM Content')),

    // Mock other methods used in the tests
    getModelContextWindow: jest.fn<Promise<number>, []>().mockResolvedValue(8000), // Default mock value

    getProvider: jest
      .fn<Promise<Result<any, Error>>, []>()
      .mockResolvedValue(Result.ok({ countTokens: jest.fn().mockResolvedValue(10) } as any)), // Default mock value

    countTokens: jest.fn<Promise<number>, [string]>().mockResolvedValue(100), // Default mock value

    // Add other methods if they were needed, mocking their signatures
    // e.g., getChatCompletion: jest.fn<Promise<Result<ChatCompletionResponse, Error>>, [any]>()
    //         .mockResolvedValue(Result.ok({ choices: [{ message: { content: 'Default Chat Mock' } }] })),
  } as unknown as jest.Mocked<LLMAgent>; // Cast to the mocked type

  // Ensure 'this' context if necessary, though usually not needed for simple mocks
  // mockAgent.getCompletion = mockAgent.getCompletion.bind(mockAgent);

  return mockAgent;
};

// Default export for convenience if needed
export const mockLLMAgent = createMockLLMAgent();
