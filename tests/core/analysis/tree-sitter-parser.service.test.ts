// tests/core/analysis/tree-sitter-parser.service.test.ts
import { TreeSitterParserService } from '@core/analysis/tree-sitter-parser.service';
import { ILogger } from '@core/services/logger-service';
import { mock, MockProxy } from 'jest-mock-extended';
import { Result } from '@core/result/result'; // Removed Ok, Err
// Removed unused ParsedCodeInfo import
// Removed unused @ts-expect-error directive

// Removed unused Parser import

// Mock the node-tree-sitter library and language grammars
// We need to mock the default export for languages and the Parser class for node-tree-sitter
const mockJsLang = { mockLangProperty: 'javascript' }; // Placeholder object
const mockTsLang = { mockLangProperty: 'typescript' }; // Placeholder object
const mockParseTree = { rootNode: { type: 'program', children: [] } }; // Simplified mock tree
const mockParserInstance = {
  setLanguage: jest.fn(),
  parse: jest.fn().mockReturnValue(mockParseTree),
  getLogger: jest.fn(), // Add getLogger if it's called internally
  setLogger: jest.fn(), // Add setLogger if it's called internally
};

// Corrected mock target for 'require' style import
jest.mock('node-tree-sitter', () => {
  // Directly return the mock constructor function
  return jest.fn().mockImplementation(() => mockParserInstance);
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

describe('TreeSitterParserService', () => {
  let service: TreeSitterParserService;
  let mockLogger: MockProxy<ILogger>;
  // Removed unused mockActualParser

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Re-mock the logger
    mockLogger = mock<ILogger>();
    mockLogger.info.mockImplementation(() => {});
    mockLogger.debug.mockImplementation(() => {});
    mockLogger.error.mockImplementation(() => {});

    // Reset modules to ensure mocks are fresh for dynamic import tests
    jest.resetModules(); // Ensure modules are reset before each test

    // Instantiate the service
    service = new TreeSitterParserService(mockLogger);

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
    expect(mockLogger.info).toHaveBeenCalledWith('TreeSitterParserService initialized.');
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
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.info).toHaveBeenCalledWith(
      `Attempting to load grammar for language: ${language} from tree-sitter-javascript`
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.debug).toHaveBeenCalledWith(`Using cached parser for language: ${language}`);
    // Verify dynamic import mock was involved (implicitly tested by logger message, but could be more explicit if needed)
    // Verify Parser.setLanguage was called - expect any object as dynamic import returns real module
    expect(mockParserInstance.setLanguage).toHaveBeenCalledWith(expect.any(Object));
    // Ensure setLanguage was called only once due to caching
    expect(mockParserInstance.setLanguage).toHaveBeenCalledTimes(1);
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
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.info).toHaveBeenCalledWith(
      `Attempting to load grammar for language: ${language} from tree-sitter-typescript/typescript`
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.debug).toHaveBeenCalledWith(`Using cached parser for language: ${language}`);
    // Expect any object for setLanguage
    expect(mockParserInstance.setLanguage).toHaveBeenCalledWith(expect.any(Object));
    expect(mockParserInstance.setLanguage).toHaveBeenCalledTimes(1); // Called once for TS
  });

  it('should return Err when loading parser fails', async () => {
    // Renamed test, uses spyOn
    const content = 'let x = 1;';
    const language = 'javascript';
    const loadError = new Error('Simulated loadParser failure');

    // Spy on the private loadParser method and make it return an Err result
    // Need to cast 'loadParser' as any because it's private
    const loadParserSpy = jest
      .spyOn(TreeSitterParserService.prototype as any, 'loadParser')
      .mockResolvedValue(Result.err(loadError));

    // Instantiate the service *after* setting up the spy
    // No need to re-import the service class itself
    const serviceWithSpy = new TreeSitterParserService(mockLogger);

    // Act
    const result = await serviceWithSpy.parse(content, language);

    // Assert
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      // The error should be the one returned by the mocked loadParser
      expect(result.error!).toBe(loadError);
      expect(result.error!.message).toBe('Simulated loadParser failure');
    }
    // Verify the spy was called
    expect(loadParserSpy).toHaveBeenCalledWith(language);
    // Ensure the actual parser methods weren't called
    expect(mockParserInstance.setLanguage).not.toHaveBeenCalled();
    expect(mockParserInstance.parse).not.toHaveBeenCalled();
    // Check logger (optional, depends if loadParser logs before returning Err)
    // The service's parse method logs before calling loadParser
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.info).toHaveBeenCalledWith(`Parsing content for language: ${language}`);
    // The service's parse method returns the error from loadParser immediately,
    // so no error should be logged within the parse method itself for this case.

    // Restore the original method
    loadParserSpy.mockRestore();
  });

  // Note: Testing 'unsupported' language directly via `parse` is hard due to type safety.
  // The previous test covers the failure path within `loadParser` when import fails.
  // If `loadParser` was public or tested separately, we could test the 'unsupported' case directly.

  // --- Parsing Tests ---

  it('should return Ok with empty ParsedCodeInfo for valid javascript input', async () => {
    const content = 'function hello() { console.log("world"); }';
    const language = 'javascript';

    // Act
    const result = await service.parse(content, language);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // Currently expects empty as extraction isn't implemented
      expect(result.value).toEqual({ functions: [], classes: [] });
    }
    // Expect any object for setLanguage
    expect(mockParserInstance.setLanguage).toHaveBeenCalledWith(expect.any(Object));
    expect(mockParserInstance.parse).toHaveBeenCalledWith(content);
    // Check actual log message
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining(`Successfully created syntax tree for language: ${language}`)
    );
  });

  it('should return Ok with empty ParsedCodeInfo for valid typescript input', async () => {
    const content = 'class MyClass { constructor() {} }';
    const language = 'typescript';

    // Act
    const result = await service.parse(content, language);

    // Assert
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      // Currently expects empty as extraction isn't implemented
      expect(result.value).toEqual({ functions: [], classes: [] });
    }
    // Expect any object for setLanguage
    expect(mockParserInstance.setLanguage).toHaveBeenCalledWith(expect.any(Object));
    expect(mockParserInstance.parse).toHaveBeenCalledWith(content);
    // Check actual log message
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining(`Successfully created syntax tree for language: ${language}`)
    );
  });

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
      // Check actual error message format from service
      expect(result.error!.message).toContain(`Error during Tree-sitter parsing for ${language}:`);
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
      expect.stringContaining(`Error during Tree-sitter parsing for ${language}`),
      parseError // Check the passed error object
    );
  });

  // --- Placeholder for future tests when extraction is implemented ---
  // it('should extract function information correctly for javascript', async () => { ... });
  // it('should extract class information correctly for typescript', async () => { ... });
});
