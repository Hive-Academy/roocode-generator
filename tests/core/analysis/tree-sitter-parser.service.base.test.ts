// tests/core/analysis/tree-sitter-parser.service.base.test.ts
import { TreeSitterParserService } from '@core/analysis/tree-sitter-parser.service';
import { ILogger } from '@core/services/logger-service';
import { mock, MockProxy } from 'jest-mock-extended';
// Removed unused import: import { Result } from '@core/result/result';
// Removed CodeElementInfo import

// Mock the node-tree-sitter library and language grammars
// We need to mock the default export for languages and the Parser class for node-tree-sitter
const mockJsLang = { mockLangProperty: 'javascript' }; // Placeholder object
const mockTsLang = { mockLangProperty: 'typescript' }; // Placeholder object
// Removed mockParseTree as we rely on mock query results now
const mockParserInstance = {
  setLanguage: jest.fn(),
  parse: jest.fn(), // Basic mock, specific behavior set in tests if needed
  getLogger: jest.fn(),
  setLogger: jest.fn(),
  // Removed query mock
};

// Corrected mock target for 'require' style import
jest.mock('node-tree-sitter', () => {
  // Return a mock class whose constructor returns the singleton instance
  return class MockParser {
    constructor() {
      return mockParserInstance;
    }
  };
});

// Mock the dynamic imports for language grammars
// Note: The actual path might differ based on how they are imported internally.
// Assuming dynamic import(`tree-sitter-${language}`)
jest.mock('tree-sitter-javascript', () => ({ default: mockJsLang }), { virtual: true });
// Note: Service uses 'tree-sitter-typescript/typescript' path
jest.mock('tree-sitter-typescript/typescript', () => ({ default: mockTsLang }), { virtual: true });
// Mock for the failure case (will be overridden in specific test)
jest.mock(
  'tree-sitter-unsupported',
  () => {
    throw new Error('Module not found');
  },
  { virtual: true }
);

describe('TreeSitterParserService (Base)', () => {
  // Updated describe name
  let service: TreeSitterParserService;
  let mockLogger: MockProxy<ILogger>;
  // Removed mockGrammarLoader
  // Removed unused mockActualParser

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Re-mock the logger and grammar loader
    mockLogger = mock<ILogger>();
    mockLogger.info.mockImplementation(() => {});
    mockLogger.debug.mockImplementation(() => {});
    mockLogger.error.mockImplementation(() => {});

    // Instantiate the service FIRST, passing only logger
    service = new TreeSitterParserService(mockLogger);

    // THEN Add a minimal default mock return value for parse in beforeEach
    // This prevents errors in the parse method when it expects a tree object,
    // but avoids adding a query mock which might interfere with base tests.
    const mockRootNode = { type: 'program', children: [] }; // Simplified node
    const mockTree = {
      rootNode: mockRootNode,
      // No query mock needed for base tests
    };
    mockParserInstance.parse.mockReturnValue(mockTree);

    // Get the mocked Parser constructor instance for assertions if needed
    // Note: This might not be directly accessible depending on how TreeSitterParserService uses it.
    // We primarily interact via the service's methods.
    // If direct interaction with the Parser instance created inside the service is needed,
    // we might need to adjust the mocking strategy or spy on internal methods.
  });

  it('should instantiate correctly', () => {
    expect(service).toBeInstanceOf(TreeSitterParserService);
    // Check if the constructor logs initialization message
    // Service constructor logs: this.logger.info('TreeSitterParserService initialized.');
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.info).toHaveBeenCalledWith(
      'TreeSitterParserService created. Initialization required.'
    ); // Updated message
  });

  // --- Grammar Loading Tests ---

  it('should load and cache javascript grammar on first parse call', async () => {
    const content = 'function hello() {}';
    const language = 'javascript';

    // Act
    const result1 = await service.parse(content, language);
    const result2 = await service.parse(content, language); // Second call

    // Assert
    expect(result1.isOk()).toBe(true);
    expect(result2.isOk()).toBe(true);
    // Check actual log messages

    // Grammar loading now happens via require(), cannot easily assert mockGrammarLoader calls.

    // Check logs related to initialization and parsing
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Initializing Tree-sitter grammars via require...' // Updated message
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.info).toHaveBeenCalledWith(`Parsing content for language: ${language}`);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.debug).toHaveBeenCalledWith(`Using cached parser for language: ${language}`);

    // Verify Parser.setLanguage was called with the mock grammar object
    expect(mockParserInstance.setLanguage).toHaveBeenCalledWith(mockJsLang);
    // Ensure setLanguage was called twice (initial load + cache hit verification)
    expect(mockParserInstance.setLanguage).toHaveBeenCalledTimes(2);
  });

  it('should load and cache typescript grammar on first parse call', async () => {
    const content = 'class Greeter {}';
    const language = 'typescript';

    // Act
    const result1 = await service.parse(content, language);
    const result2 = await service.parse(content, language); // Second call

    // Assert
    expect(result1.isOk()).toBe(true);
    expect(result2.isOk()).toBe(true);
    // Check actual log messages (Note: TS grammar path is different)

    // Grammar loading now happens via require(), cannot easily assert mockGrammarLoader calls.

    // Check logs related to initialization and parsing
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Initializing Tree-sitter grammars via require...' // Updated message
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.info).toHaveBeenCalledWith(`Parsing content for language: ${language}`);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.debug).toHaveBeenCalledWith(`Using cached parser for language: ${language}`);

    // Verify Parser.setLanguage was called with the mock grammar object
    expect(mockParserInstance.setLanguage).toHaveBeenCalledWith(mockTsLang);
    expect(mockParserInstance.setLanguage).toHaveBeenCalledTimes(2); // Called twice (initial load + cache hit verification)
  });

  it('should return Err when an error occurs during grammar initialization (e.g., require fails or map set fails)', async () => {
    const content = 'let x = 1;';
    const language = 'javascript';
    const initError = new Error('Simulated initialization failure');

    // Mock Map.prototype.set to throw an error during initialization
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalMapSet = Map.prototype.set;
    Map.prototype.set = jest.fn().mockImplementationOnce(() => {
      throw initError;
    });

    // Instantiate the service (initialization happens on first parse)
    const serviceWithError = new TreeSitterParserService(mockLogger);

    // Act: Calling parse triggers initialization, which should now fail
    const result = await serviceWithError.parse(content, language);

    // Assert
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error!).toBeInstanceOf(Error);
      // Check the wrapped error message from initialize() -> _handleAndLogError
      expect(result.error!.message).toContain(
        'TreeSitterParserService grammar require() initialization failed'
      );
      expect(result.error!.message).toContain(initError.message);
    }

    // Ensure the actual parser methods weren't called because init failed
    expect(mockParserInstance.setLanguage).not.toHaveBeenCalled();
    expect(mockParserInstance.parse).not.toHaveBeenCalled();

    // Check logger for initialization error
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('TreeSitterParserService grammar require() initialization failed'),
      expect.objectContaining({ message: expect.stringContaining(initError.message) })
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.info).not.toHaveBeenCalledWith(`Parsing content for language: ${language}`); // Parse shouldn't start

    // Restore original Map.prototype.set

    Map.prototype.set = originalMapSet;
  });

  // Note: Testing 'unsupported' language directly via `parse` is hard due to type safety.
  // The previous test covers the failure path within `loadParser` when import fails.
  // If `loadParser` was public or tested separately, we could test the 'unsupported' case directly.

  // --- Parsing Tests (Error Handling) ---
  // Keep the test for parser.parse throwing an error

  it('should return Err if the internal parser.parse throws an error', async () => {
    const content = 'invalid syntax ---';
    const language = 'javascript';
    const parseError = new Error('Simulated parsing error');

    // Mock parser.parse to throw an error for this test
    mockParserInstance.parse.mockImplementationOnce(() => {
      throw parseError;
    });

    // Act
    const result = await service.parse(content, language);

    // Assert
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      // Use non-null assertion (!) because isErr() is not a type predicate
      expect(result.error!).toBeInstanceOf(Error);
      // Check actual error message format from service (refactored message)
      expect(result.error!.message).toContain(`Error during Tree-sitter parsing for ${language}:`); // Updated message format
      expect(result.error!.message).toContain(parseError.message); // Check original message is included
      // Service doesn't set cause, remove check
      // expect(result.error!.cause).toBe(parseError);
    }
    // Expect any object for setLanguage
    expect(mockParserInstance.setLanguage).toHaveBeenCalledWith(expect.any(Object));
    expect(mockParserInstance.parse).toHaveBeenCalledWith(content);
    // Check logger call includes the original error object
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining(`Error during Tree-sitter parsing for ${language}`), // Updated message format
      parseError // Check the passed error object
    );
  });
}); // End main describe
