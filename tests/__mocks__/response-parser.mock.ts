import { jest } from '@jest/globals';
import { ResponseParser } from '../../src/core/analysis/response-parser';
import { Result } from '../../src/core/result/result';
import { ProjectContext } from '../../src/core/analysis/types'; // Use ProjectContext
import { createMockLogger } from './logger.mock'; // Import existing logger mock
import { IJsonSchemaHelper } from '../../src/core/analysis/json-schema-helper'; // Import the actual interface
import { z } from 'zod'; // Import zod for schema types

// Mock factory for IJsonSchemaHelper interface
export const createMockJsonSchemaHelper = (): jest.Mocked<IJsonSchemaHelper> => {
  return {
    getProjectContextSchema: jest.fn<() => z.ZodSchema>(),
    validateJson: jest.fn<(json: string, schema: z.ZodSchema) => Result<boolean, Error>>(),
    repairJson: jest.fn<(jsonString: string) => Result<string, Error>>(), // Added
    getLlmResponseSchema: jest.fn<() => z.ZodSchema>(), // Added
  } as jest.Mocked<IJsonSchemaHelper>; // Cast might still be needed depending on Zod types
};

export const createMockResponseParser = (): jest.Mocked<ResponseParser> => {
  const mock = {
    // Mock public method with correct signature
    parseLlmResponse: jest.fn<() => Promise<Result<ProjectContext, Error>>>(),

    // Use existing mock factories
    logger: createMockLogger(),
    jsonSchemaHelper: createMockJsonSchemaHelper(), // Use the updated factory
    // Mock private methods to satisfy the type
    cleanResponse: jest.fn(),
    applyProjectContextDefaults: jest.fn(),
  };
  // Cast necessary to handle private/readonly members for the Mocked type
  return mock as any as jest.Mocked<ResponseParser>;
};
