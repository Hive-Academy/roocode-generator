// tests/core/analysis/tree-sitter-parser.service.base.test.ts
import { TreeSitterParserService } from '@core/analysis/tree-sitter-parser.service';
import { ILogger } from '@core/services/logger-service';
import { mock, MockProxy } from 'jest-mock-extended';
import { Result } from '@core/result/result'; // Add Result back
import { GenericAstNode } from '@core/analysis/types'; // Import new types
// Import the mock instance directly from the mock file path
import { mockParserInstance } from '../../__mocks__/tree-sitter'; // Adjust the path as needed

// Mock the node-tree-sitter library and language grammars
// We need to mock the default export for languages and the Parser class for node-tree-sitter
// mockJsLang and mockTsLang moved inside jest.mock calls below
// Define a reusable mock SyntaxNode structure
const mockSyntaxNode = {
  type: 'program',
  text: 'mock code',
  startPosition: { row: 0, column: 0 },
  endPosition: { row: 1, column: 0 },
  isNamed: true,
  parentFieldName: null,
  children: [
    {
      type: 'expression_statement',
      text: 'child code',
      startPosition: { row: 0, column: 0 },
      endPosition: { row: 0, column: 10 },
      isNamed: true,
      parentFieldName: null,
      children: [],
    },
  ],
  // Add other methods if needed by the service, e.g., walk() if used
};

// Using imported mockParserInstance for assertions

// Mock the dynamic imports for language grammars
// Note: The actual path might differ based on how they are imported internally.
// Assuming dynamic import(`tree-sitter-${language}`)
jest.mock(
  'tree-sitter-javascript',
  () => {
    const mockJsLangInline = { mockLangProperty: 'javascript' }; // Define inside factory
    return { default: mockJsLangInline };
  },
  { virtual: true }
);
// Note: Service uses 'tree-sitter-typescript/typescript' path
jest.mock(
  'tree-sitter-typescript/typescript',
  () => {
    const mockTsLangInline = { mockLangProperty: 'typescript' }; // Define inside factory
    return { default: mockTsLangInline };
  },
  { virtual: true }
);
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
    // Reset mock implementations on the shared instance before each test
    mockParserInstance.setLanguage.mockClear(); // Use mockClear or mockReset as appropriate
    mockParserInstance.parse.mockClear();
    mockParserInstance.getLogger.mockClear();
    mockParserInstance.setLogger.mockClear();
    // Re-mock the logger and grammar loader
    mockLogger = mock<ILogger>();
    mockLogger.info.mockImplementation(() => {});
    mockLogger.debug.mockImplementation(() => {});
    mockLogger.error.mockImplementation(() => {});

    // Instantiate the service FIRST, passing only logger
    service = new TreeSitterParserService(mockLogger);

    // THEN Add a minimal default mock return value for parse in beforeEach
    // The default mock for parse is now set above in mockParserInstance definition
    // Ensure it returns the structure expected by the updated parse method
    // Re-apply default mock implementation for parse after clearing
    mockParserInstance.parse.mockReturnValue({ rootNode: mockSyntaxNode });

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

  it('should load and cache javascript grammar on first parse call', () => {
    const content = 'function hello() {}';
    const language = 'javascript';

    // Act
    const result1 = service.parse(content, language);
    const result2: Result<GenericAstNode, Error> = service.parse(content, language); // Second call

    // Assert
    expect(result1.isOk()).toBe(true);
    expect(result2.isOk()).toBe(true);

    // Verify the structure of the returned GenericAstNode (basic check)
    if (result1.isOk()) {
      const astNode: GenericAstNode = result1.value!; // Add type and non-null assertion
      expect(astNode).toBeDefined();
      expect(astNode.type).toBe(mockSyntaxNode.type); // Check root type
      expect(astNode.text).toBe(mockSyntaxNode.text); // Check root text
      expect(astNode.children).toBeInstanceOf(Array); // Check children array exists
      expect(astNode.children.length).toBeGreaterThan(0); // Check children exist based on mock
    }
    // Check actual log messages

    // Grammar loading now happens via require(), cannot easily assert mockGrammarLoader calls.

    // Check logs related to initialization and parsing
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Initializing Tree-sitter grammars via require...' // Updated message
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.info).toHaveBeenCalledWith(
      `Parsing content for language: ${language} to generate generic AST`
    ); // Updated log message
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.debug).toHaveBeenCalledWith(`Using cached parser for language: ${language}`);

    // Verify Parser.setLanguage was called with the mock grammar object
    expect(mockParserInstance.setLanguage).toHaveBeenCalledWith(expect.any(Object)); // Check for any object
    // Ensure setLanguage was called twice (initial load + cache hit verification)
    expect(mockParserInstance.setLanguage).toHaveBeenCalledTimes(2);
  });

  it('should load and cache typescript grammar on first parse call', () => {
    const content = 'class Greeter {}';
    const language = 'typescript';

    // Act
    const result1: Result<GenericAstNode, Error> = service.parse(content, language);
    const result2: Result<GenericAstNode, Error> = service.parse(content, language); // Second call

    // Assert
    expect(result1.isOk()).toBe(true);
    expect(result2.isOk()).toBe(true);

    // Verify the structure of the returned GenericAstNode (basic check)
    if (result1.isOk()) {
      const astNode: GenericAstNode = result1.value!; // Add type and non-null assertion
      expect(astNode).toBeDefined();
      expect(astNode.type).toBe(mockSyntaxNode.type); // Check root type
      expect(astNode.text).toBe(mockSyntaxNode.text); // Check root text
      expect(astNode.children).toBeInstanceOf(Array); // Check children array exists
      expect(astNode.children.length).toBeGreaterThan(0); // Check children exist based on mock
    }
    // Check actual log messages (Note: TS grammar path is different)

    // Grammar loading now happens via require(), cannot easily assert mockGrammarLoader calls.

    // Check logs related to initialization and parsing
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.info).toHaveBeenCalledWith(
      'Initializing Tree-sitter grammars via require...' // Updated message
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.info).toHaveBeenCalledWith(
      `Parsing content for language: ${language} to generate generic AST`
    ); // Updated log message
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.debug).toHaveBeenCalledWith(`Using cached parser for language: ${language}`);

    // Verify Parser.setLanguage was called with the mock grammar object
    expect(mockParserInstance.setLanguage).toHaveBeenCalledWith(expect.any(Object)); // Check for any object
    expect(mockParserInstance.setLanguage).toHaveBeenCalledTimes(2); // Called twice (initial load + cache hit verification)
  });

  it('should return Err when an error occurs during grammar initialization (e.g., require fails or map set fails)', () => {
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
    const result = serviceWithError.parse(content, language);

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

  it('should return Err if the internal parser.parse throws an error', () => {
    const content = 'invalid syntax ---';
    const language = 'javascript';
    const parseError = new Error('Simulated parsing error');

    // Mock parser.parse to throw an error for this test using the imported instance
    mockParserInstance.parse.mockImplementationOnce(() => {
      throw parseError;
    });

    // Act
    const result = service.parse(content, language);

    // Assert
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      // Use non-null assertion (!) because isErr() is not a type predicate
      expect(result.error!).toBeInstanceOf(Error);
      // Check actual error message format from service (updated in service implementation)
      expect(result.error!.message).toContain(
        `Error during Tree-sitter parsing or AST conversion for ${language}` // Check updated message
      );
      expect(result.error!.message).toContain(parseError.message); // Check original message is included
    }
    // Assert using the imported instance
    expect(mockParserInstance.setLanguage).toHaveBeenCalledWith(expect.any(Object));
    expect(mockParserInstance.parse).toHaveBeenCalledWith(content);
    // Check logger call includes the original error object
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining(`Error during Tree-sitter parsing or AST conversion for ${language}`), // Check updated message
      parseError // Check the passed error object
    );
  });

  // --- New Test: Successful Parsing and AST Conversion ---
  it('should return Ok with a correctly structured GenericAstNode on successful parse', () => {
    const content = 'const x = 1;';
    const language = 'javascript';

    // Ensure the mock parse returns the expected structure
    // (It should have been reset and set in beforeEach)
    // No need to modify instance here, beforeEach handles the default return value.

    // Act
    const result: Result<GenericAstNode, Error> = service.parse(content, language);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      const astNode: GenericAstNode = result.value!; // Add type and non-null assertion
      // Verify root node properties (AC4, AC5, AC6)
      expect(astNode.type).toBe(mockSyntaxNode.type);
      expect(astNode.text).toBe(mockSyntaxNode.text);
      expect(astNode.startPosition).toEqual(mockSyntaxNode.startPosition);
      expect(astNode.endPosition).toEqual(mockSyntaxNode.endPosition);
      expect(astNode.isNamed).toBe(mockSyntaxNode.isNamed);
      expect(astNode.fieldName).toBe(mockSyntaxNode.parentFieldName);

      // Verify children structure (recursive check)
      expect(astNode.children).toBeInstanceOf(Array);
      expect(astNode.children.length).toBe(mockSyntaxNode.children.length);

      if (astNode.children.length > 0 && mockSyntaxNode.children.length > 0) {
        const firstChild: GenericAstNode = astNode.children[0]; // Add type
        const mockFirstChild = mockSyntaxNode.children[0];
        expect(firstChild.type).toBe(mockFirstChild.type);
        expect(firstChild.text).toBe(mockFirstChild.text);
        expect(firstChild.startPosition).toEqual(mockFirstChild.startPosition);
        expect(firstChild.endPosition).toEqual(mockFirstChild.endPosition);
        expect(firstChild.isNamed).toBe(mockFirstChild.isNamed);
        expect(firstChild.fieldName).toBe(mockFirstChild.parentFieldName);
        expect(firstChild.children).toBeInstanceOf(Array);
        expect(firstChild.children.length).toBe(mockFirstChild.children.length);
      }
    }

    // Verify logs
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.info).toHaveBeenCalledWith(
      `Successfully converted AST to generic JSON format for language: ${language}.`
    );
  });
}); // End main describe
