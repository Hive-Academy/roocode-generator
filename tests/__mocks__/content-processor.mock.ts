import { IContentProcessor } from '../../src/memory-bank/interfaces';
import { Result } from '../../src/core/result/result';

export const createMockContentProcessor = (): jest.Mocked<IContentProcessor> => {
  const mockProcessor = {
    stripMarkdownCodeBlock: jest
      .fn<Result<string, Error>, [string]>()
      .mockReturnValue(Result.ok('Default Mock Stripped Content')),

    stripHtmlComments: jest // Added missing mock method
      .fn<Result<string, Error>, [string]>()
      .mockReturnValue(Result.ok('Default Mock Stripped HTML Comments')),

    // Add processTemplate mock based on the interface definition
    // Assuming it takes template, context, and returns a Promise<Result<string, Error>>
    processTemplate: jest
      .fn<Promise<Result<string, Error>>, [string, any]>() // Using 'any' for context for simplicity in mock
      .mockResolvedValue(Result.ok('Default Mock Processed Template')),
  } as unknown as jest.Mocked<IContentProcessor>; // Cast to the mocked type

  return mockProcessor;
};

// Default export for convenience
export const mockContentProcessor = createMockContentProcessor();
