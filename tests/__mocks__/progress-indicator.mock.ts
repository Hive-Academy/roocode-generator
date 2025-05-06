// tests/__mocks__/progress-indicator.mock.ts
// Mock factory for the ProgressIndicator class
import { jest } from '@jest/globals';
import { ProgressIndicator } from '../../src/core/ui/progress-indicator'; // Import real type
import { Ora } from 'ora'; // Import Ora type for spinner property

export const createMockProgressIndicator = (): jest.Mocked<ProgressIndicator> => {
  const mock = {
    // Correct jest.fn syntax: jest.fn<(args) => returnType>()
    start: jest.fn<(message: string) => void>(),
    update: jest.fn<(message: string) => void>(),
    succeed: jest.fn<(message?: string) => void>(),
    fail: jest.fn<(message?: string) => void>(),
    stop: jest.fn<() => void>(),
    // Add spinner property to satisfy the type, initialize as null
    spinner: null as Ora | null,
  };

  // Use 'as any' first to bypass strict type checking for private members, then cast to Mocked
  return mock as any as jest.Mocked<ProgressIndicator>;
};
