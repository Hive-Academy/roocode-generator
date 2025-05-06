import { ILogger } from '../../src/core/services/logger-service';

export const createMockLogger = (): jest.Mocked<ILogger> => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  trace: jest.fn(),
});

// Default export for convenience if needed, or just use the factory
export const mockLogger = createMockLogger();
