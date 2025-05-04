// tests/core/analysis/tree-sitter-parser.service.extraction.test.ts
import { TreeSitterParserService } from '@core/analysis/tree-sitter-parser.service';
import { CodeElementInfo } from '@core/analysis/types';
import { ILogger } from '@core/services/logger-service';
import { mock, MockProxy } from 'jest-mock-extended';

// Mock the node-tree-sitter library and language grammars
// We need to mock the default export for languages and the Parser class for node-tree-sitter
// ADD query mock to language objects, as service calls language.query()
const mockQueryFn = jest.fn().mockImplementation(() => ({
  matches: jest.fn().mockReturnValue([]),
  captures: jest.fn().mockReturnValue([]),
}));
// Ensure query is correctly mocked on language objects
const mockJsLang = { mockLangProperty: 'javascript', query: mockQueryFn };
const mockTsLang = { mockLangProperty: 'typescript', query: mockQueryFn };

const mockParserInstance = {
  setLanguage: jest.fn(),
  parse: jest.fn(), // Basic mock, will be configured in beforeEach
  getLogger: jest.fn(),
  setLogger: jest.fn(),
  // REMOVED query mock from parser instance
  getLanguage: jest.fn(), // Add getLanguage mock as service calls it before query
};

// Corrected mock target for 'require' style import
jest.mock('node-tree-sitter', () => {
  // Directly return the mock constructor function
  return jest.fn().mockImplementation(() => mockParserInstance);
});

// Mock the dynamic imports for language grammars
jest.mock('tree-sitter-javascript', () => ({ default: mockJsLang }), { virtual: true });
jest.mock('tree-sitter-typescript/typescript', () => ({ default: mockTsLang }), { virtual: true });

// Describe block specifically for extraction tests
describe('TreeSitterParserService (Extraction Logic)', () => {
  let service: TreeSitterParserService;
  let mockLogger: MockProxy<ILogger>;
  // Removed mockGrammarLoader

  // Helper to mock query results for specific tests
  // Note: This mock setup assumes the service calls language.query(queryString).matches(tree.rootNode)
  // and then processes the captures from those matches.
  const mockQueryResults = (
    functionMatches: any[], // Separate array for function query results
    classMatches: any[], // Separate array for class query results
    language: 'javascript' | 'typescript'
  ) => {
    const langObj = language === 'javascript' ? mockJsLang : mockTsLang;
    langObj.query.mockReset();
    langObj.query.mockImplementation((queryString: string) => {
      // Determine which set of matches to use based on the query string content
      const isFunctionQuery =
        queryString.includes('function_declaration') || queryString.includes('method_definition');
      const isClassQuery = queryString.includes('class_declaration');
      const relevantMatches = isFunctionQuery ? functionMatches : isClassQuery ? classMatches : [];

      // console.log(`Mock query called for lang: ${language}. Query type: ${isFunctionQuery ? 'Function' : (isClassQuery ? 'Class' : 'Unknown')}. Returning ${relevantMatches.length} matches.`);

      return {
        matches: jest.fn().mockImplementation(() => {
          // console.log(`Mock matches called. Returning ${relevantMatches.length} matches.`);
          return relevantMatches;
        }),
        captures: jest.fn().mockImplementation((matchNode, matchIndex, captureIndex) => {
          // console.log(`Mock captures called for matchIndex: ${matchIndex}, captureIndex: ${captureIndex}. Using ${relevantMatches.length} matches.`);
          const match = relevantMatches[matchIndex]; // Use the correct match array
          if (match && match.captures && match.captures[captureIndex]) {
            // console.log(`Returning capture node: ${match.captures[captureIndex].node.text}`);
            return [match.captures[captureIndex].node];
          }
          // console.log(`No capture found for indices.`);
          return [];
        }),
      };
    });
  };

  // Helper to create mock nodes with start/end positions (0-based rows for tree-sitter)
  const createMockNode = (
    text: string,
    startLine: number, // 1-based line for easier test writing
    startCol: number,
    endLine: number, // 1-based line
    endCol: number,
    type: string = 'identifier',
    children: any[] = []
  ) => ({
    text,
    type,
    startPosition: { row: startLine - 1, column: startCol }, // 0-based row
    endPosition: { row: endLine - 1, column: endCol }, // 0-based row
    children: children,
    parent: null, // Simplified, adjust if parent traversal is used
    // Add other properties if needed by the service's logic (e.g., childForFieldName)
  });

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Re-mock the logger and grammar loader
    mockLogger = mock<ILogger>();
    mockLogger.info.mockImplementation(() => {});
    mockLogger.debug.mockImplementation(() => {});
    mockLogger.error.mockImplementation(() => {});

    // Reset modules to ensure mocks are fresh for dynamic import tests
    jest.resetModules(); // Ensure modules are reset before each test

    // Instantiate the service, passing only logger
    service = new TreeSitterParserService(mockLogger);

    // Ensure parse returns a mock tree
    const mockRootNode = createMockNode('root', 1, 0, 100, 0, 'program'); // Adjust end line as needed
    const mockTree = {
      rootNode: mockRootNode,
      // No query needed here, it's mocked on the language object
    };
    mockParserInstance.parse.mockReturnValue(mockTree);

    // Mock getLanguage to return the appropriate language object for the query call
    mockParserInstance.getLanguage.mockImplementation(() => {
      // This is a simplification; ideally, it should return based on what setLanguage was called with.
      // For these tests, we assume it returns the correct one based on the test context.
      // A more robust mock might track the language set via setLanguage.
      if (expect.getState().currentTestName?.includes('JavaScript')) return mockJsLang;
      if (expect.getState().currentTestName?.includes('TypeScript')) return mockTsLang;
      return undefined; // Default case
    });

    // Reset the language query mock before each test
    mockQueryFn.mockReset().mockImplementation(() => ({
      matches: jest.fn().mockReturnValue([]),
      captures: jest.fn().mockReturnValue([]),
    }));
  });

  describe('JavaScript', () => {
    const language = 'javascript';

    it('should extract basic function declarations, expressions, and arrows', async () => {
      const content = `
function func1() {} // line 2
const func2 = function() {}; // line 3
const func3 = () => {}; // line 4
      `;
      // Mock query results for this specific content
      // IMPORTANT: The structure (pattern index, capture names 'definition', 'name')
      // must match exactly what the service's queries and _processMatch expect.
      mockQueryResults(
        [
          // func1 (assuming function_declaration match)
          {
            pattern: 0,
            captures: [
              { name: 'name', node: createMockNode('func1', 2, 9, 2, 14) },
              {
                name: 'definition', // CORRECTED CAPTURE NAME
                node: createMockNode('function func1() {}', 2, 0, 2, 19),
              },
            ],
          },
          // func2 (assuming function assigned to const/let)
          {
            pattern: 1,
            captures: [
              { name: 'name', node: createMockNode('func2', 3, 6, 3, 11) },
              {
                name: 'definition', // CORRECTED CAPTURE NAME
                node: createMockNode('const func2 = function() {}', 3, 0, 3, 28),
              },
            ],
          },
          // func3 (assuming arrow function assigned to const/let)
          {
            pattern: 2,
            captures: [
              { name: 'name', node: createMockNode('func3', 4, 6, 4, 11) },
              {
                name: 'definition', // CORRECTED CAPTURE NAME
                node: createMockNode('const func3 = () => {}', 4, 0, 4, 24),
              },
            ],
          },
        ], // functionMatches
        [], // classMatches
        language
      );

      const expectedFunctions: CodeElementInfo[] = [
        { name: 'func1', startLine: 2, endLine: 2 },
        { name: 'func2', startLine: 3, endLine: 3 },
        { name: 'func3', startLine: 4, endLine: 4 },
      ];

      const result = await service.parse(content, language);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value!.functions).toEqual(expect.arrayContaining(expectedFunctions));
        expect(result.value!.functions.length).toBe(expectedFunctions.length);
        expect(result.value!.classes).toEqual([]);
      }
      // Verify query was called on the language object

      expect(mockJsLang.query).toHaveBeenCalled();
    });

    it('should extract exported and default functions', async () => {
      const content = `
export function func4() {} // line 2
export const func5 = async () => {}; // line 3
export default function func6() {} // line 4
export default () => {}; // line 5 (anonymous arrow)
        `;
      mockQueryResults(
        [
          // func4 (export function declaration)
          {
            pattern: 0,
            captures: [
              { name: 'name', node: createMockNode('func4', 2, 16, 2, 21) },
              {
                name: 'definition', // CORRECTED CAPTURE NAME
                node: createMockNode('export function func4() {}', 2, 0, 2, 26),
              },
            ],
          },
          // func5 (export const arrow function)
          {
            pattern: 1,
            captures: [
              { name: 'name', node: createMockNode('func5', 3, 13, 3, 18) },
              {
                name: 'definition', // CORRECTED CAPTURE NAME
                node: createMockNode('export const func5 = async () => {}', 3, 0, 3, 36),
              },
            ],
          },
          // func6 (export default function declaration)
          {
            pattern: 2,
            captures: [
              { name: 'name', node: createMockNode('func6', 4, 24, 4, 29) },
              {
                name: 'definition', // CORRECTED CAPTURE NAME
                node: createMockNode('export default function func6() {}', 4, 0, 4, 34),
              },
            ],
          },
          // anonymous default arrow (export default arrow function)
          {
            pattern: 3,
            captures: [
              // No 'name' capture expected for anonymous default
              {
                name: 'definition', // CORRECTED CAPTURE NAME
                node: createMockNode('export default () => {}', 5, 0, 5, 24),
              },
            ],
          },
        ], // functionMatches
        [], // classMatches
        language
      );

      const expectedFunctions: CodeElementInfo[] = [
        { name: 'func4', startLine: 2, endLine: 2 },
        { name: 'func5', startLine: 3, endLine: 3 },
        { name: 'func6', startLine: 4, endLine: 4 }, // Name is captured for default function declaration
        { name: '[anonymous_function]', startLine: 5, endLine: 5 }, // Expect anonymous for now
      ];

      const result = await service.parse(content, language);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value!.functions).toEqual(expectedFunctions); // Use direct toEqual
        expect(result.value!.functions.length).toBe(expectedFunctions.length);
        expect(result.value!.classes).toEqual([]);
      }

      expect(mockJsLang.query).toHaveBeenCalled();
    });

    it('should extract class declarations and methods', async () => {
      const content = `
class ClassA { // line 2
  method1() {} // line 3
  async method2() {} // line 4
} // line 5
export class ClassB {} // line 6
export default class ClassC {} // line 7
      `;
      // Mock query results for classes and methods
      // Separate matches for functions (methods) and classes
      const functionMatches = [
        // method1
        {
          pattern: 5, // Assuming pattern 5 is for methods in the function query
          captures: [
            { name: 'name', node: createMockNode('method1', 3, 2, 3, 9) },
            { name: 'definition', node: createMockNode('method1() {}', 3, 2, 3, 14) },
          ],
        },
        // method2
        {
          pattern: 5, // Assuming pattern 5 is for methods in the function query
          captures: [
            { name: 'name', node: createMockNode('method2', 4, 8, 4, 15) },
            { name: 'definition', node: createMockNode('async method2() {}', 4, 2, 4, 20) },
          ],
        },
      ];
      const classMatches = [
        // ClassA
        {
          pattern: 4, // Assuming pattern 4 is for classes in the class query
          captures: [
            { name: 'name', node: createMockNode('ClassA', 2, 6, 2, 12) },
            { name: 'definition', node: createMockNode('class ClassA { ... }', 2, 0, 5, 1) },
          ],
        },
        // ClassB
        {
          pattern: 6, // Assuming pattern 6 is for export class in the class query
          captures: [
            { name: 'name', node: createMockNode('ClassB', 6, 13, 6, 19) },
            { name: 'definition', node: createMockNode('export class ClassB {}', 6, 0, 6, 22) },
          ],
        },
        // ClassC
        {
          pattern: 7, // Assuming pattern 7 is for export default class in the class query
          captures: [
            { name: 'name', node: createMockNode('ClassC', 7, 21, 7, 27) },
            {
              name: 'definition',
              node: createMockNode('export default class ClassC {}', 7, 0, 7, 30),
            },
          ],
        },
      ];
      mockQueryResults(functionMatches, classMatches, language);

      const expectedClasses: CodeElementInfo[] = [
        { name: 'ClassA', startLine: 2, endLine: 5 },
        { name: 'ClassB', startLine: 6, endLine: 6 },
        { name: 'ClassC', startLine: 7, endLine: 7 }, // Name captured for default export class
      ];
      // Assuming methods are captured as functions by the query
      const expectedFunctions: CodeElementInfo[] = [
        { name: 'method1', startLine: 3, endLine: 3 },
        { name: 'method2', startLine: 4, endLine: 4 },
      ];

      const result = await service.parse(content, language);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        // Use toEqual for exact order and content check, or arrayContaining for subset check
        expect(result.value!.classes).toEqual(expectedClasses);
        expect(result.value!.functions).toEqual(expectedFunctions);
      }

      expect(mockJsLang.query).toHaveBeenCalled();
    });

    it('should extract functions defined within object literals', async () => {
      const content = `
 const obj = { // line 2
   methodA: function() {}, // line 3
   methodB: () => {} // line 4
 }; // line 5
       `;
      // Assuming object methods are captured via pair key_value where value is function/arrow
      mockQueryResults(
        [
          // methodA (pair with function expression)
          {
            pattern: 8,
            captures: [
              // Assuming pattern 8 for object methods
              { name: 'name', node: createMockNode('methodA', 3, 3, 3, 10) }, // Name is the key
              {
                name: 'definition', // CORRECTED CAPTURE NAME
                node: createMockNode('methodA: function() {}', 3, 3, 3, 25),
              }, // Body includes key and value
            ],
          },
          // methodB (pair with arrow function)
          {
            pattern: 8,
            captures: [
              { name: 'name', node: createMockNode('methodB', 4, 3, 4, 10) }, // Name is the key
              {
                name: 'definition', // CORRECTED CAPTURE NAME
                node: createMockNode('methodB: () => {}', 4, 3, 4, 20),
              }, // Body includes key and value
            ],
          },
        ], // functionMatches
        [], // classMatches
        language
      );

      const expectedFunctions: CodeElementInfo[] = [
        { name: 'methodA', startLine: 3, endLine: 3 },
        { name: 'methodB', startLine: 4, endLine: 4 },
      ];

      const result = await service.parse(content, language);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value!.functions).toEqual(expect.arrayContaining(expectedFunctions));
        expect(result.value!.functions.length).toBe(expectedFunctions.length);
        expect(result.value!.classes).toEqual([]);
      }

      expect(mockJsLang.query).toHaveBeenCalled();
    });
  }); // End JavaScript describe

  describe('TypeScript', () => {
    const language = 'typescript';

    it('should extract basic typed function declarations, expressions, and arrows', async () => {
      const content = `
function tsFunc1(): void {} // line 2
const tsFunc2 = function(): number { return 1; }; // line 3
const tsFunc3 = (): string => "hello"; // line 4
      `;
      // Use similar mock structure as JS, assuming TS queries are analogous
      mockQueryResults(
        [
          // tsFunc1
          {
            pattern: 0,
            captures: [
              { name: 'name', node: createMockNode('tsFunc1', 2, 9, 2, 16) },
              {
                name: 'definition', // CORRECTED CAPTURE NAME
                node: createMockNode('function tsFunc1(): void {}', 2, 0, 2, 27),
              },
            ],
          },
          // tsFunc2
          {
            pattern: 1,
            captures: [
              { name: 'name', node: createMockNode('tsFunc2', 3, 6, 3, 13) },
              {
                name: 'definition', // CORRECTED CAPTURE NAME
                node: createMockNode(
                  'const tsFunc2 = function(): number { return 1; }',
                  3,
                  0,
                  3,
                  50
                ),
              },
            ],
          },
          // tsFunc3
          {
            pattern: 2,
            captures: [
              { name: 'name', node: createMockNode('tsFunc3', 4, 6, 4, 13) },
              {
                name: 'definition', // CORRECTED CAPTURE NAME
                node: createMockNode('const tsFunc3 = (): string => "hello"', 4, 0, 4, 39),
              },
            ],
          },
        ], // functionMatches
        [], // classMatches
        language
      );

      const expectedFunctions: CodeElementInfo[] = [
        { name: 'tsFunc1', startLine: 2, endLine: 2 },
        { name: 'tsFunc2', startLine: 3, endLine: 3 },
        { name: 'tsFunc3', startLine: 4, endLine: 4 },
      ];

      const result = await service.parse(content, language);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value!.functions).toEqual(expect.arrayContaining(expectedFunctions));
        expect(result.value!.functions.length).toBe(expectedFunctions.length);
        expect(result.value!.classes).toEqual([]);
      }

      expect(mockTsLang.query).toHaveBeenCalled();
    });

    it('should extract exported and default typed functions', async () => {
      const content = `
export function tsFunc4(): void {} // line 2
export const tsFunc5 = async (): Promise<void> => {}; // line 3
export default function tsFunc6(): boolean { return true; } // line 4
export default async () => {}; // line 5 (anonymous async arrow)
      `;
      mockQueryResults(
        [
          // tsFunc4
          {
            pattern: 0,
            captures: [
              { name: 'name', node: createMockNode('tsFunc4', 2, 16, 2, 23) },
              {
                name: 'definition', // CORRECTED CAPTURE NAME
                node: createMockNode('export function tsFunc4(): void {}', 2, 0, 2, 34),
              },
            ],
          },
          // tsFunc5
          {
            pattern: 1,
            captures: [
              { name: 'name', node: createMockNode('tsFunc5', 3, 13, 3, 20) },
              {
                name: 'definition', // CORRECTED CAPTURE NAME
                node: createMockNode(
                  'export const tsFunc5 = async (): Promise<void> => {}',
                  3,
                  0,
                  3,
                  56
                ),
              },
            ],
          },
          // tsFunc6
          {
            pattern: 2,
            captures: [
              { name: 'name', node: createMockNode('tsFunc6', 4, 24, 4, 31) },
              {
                name: 'definition', // CORRECTED CAPTURE NAME
                node: createMockNode(
                  'export default function tsFunc6(): boolean { return true; }',
                  4,
                  0,
                  4,
                  60
                ),
              },
            ],
          },
          // anonymous default async arrow
          {
            pattern: 3,
            captures: [
              // No name capture
              {
                name: 'definition', // CORRECTED CAPTURE NAME
                node: createMockNode('export default async () => {}', 5, 0, 5, 30),
              },
            ],
          },
        ], // functionMatches
        [], // classMatches
        language
      );

      const expectedFunctions: CodeElementInfo[] = [
        { name: 'tsFunc4', startLine: 2, endLine: 2 },
        { name: 'tsFunc5', startLine: 3, endLine: 3 },
        { name: 'tsFunc6', startLine: 4, endLine: 4 },
        { name: '[anonymous_function]', startLine: 5, endLine: 5 }, // Expect anonymous for now
      ];

      const result = await service.parse(content, language);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value!.functions).toEqual(expectedFunctions); // Use direct toEqual
        expect(result.value!.functions.length).toBe(expectedFunctions.length);
        expect(result.value!.classes).toEqual([]);
      }

      expect(mockTsLang.query).toHaveBeenCalled();
    });

    it('should extract typed class declarations and methods, ignoring interfaces', async () => {
      const content = `
interface MyInterface {} // line 2 (Should not be captured)
class TsClassA { // line 3
  prop: string; // line 4
  constructor(p: string) { this.prop = p; } // line 5 (Constructor not captured)
  method1(): void {} // line 6
  private async method2(): Promise<number> { return 2; } // line 7
} // line 8
export class TsClassB {} // line 9
export default class TsClassC {} // line 10
      `;
      // Separate matches for functions (methods) and classes
      const functionMatches = [
        // method1
        {
          pattern: 5, // Assuming pattern 5 is for methods in the function query
          captures: [
            { name: 'name', node: createMockNode('method1', 6, 2, 6, 9) },
            { name: 'definition', node: createMockNode('method1(): void {}', 6, 2, 6, 20) },
          ],
        },
        // method2
        {
          pattern: 5, // Assuming pattern 5 is for methods in the function query
          captures: [
            { name: 'name', node: createMockNode('method2', 7, 16, 7, 23) },
            {
              name: 'definition',
              node: createMockNode(
                'private async method2(): Promise<number> { return 2; }',
                7,
                2,
                7,
                59
              ),
            },
          ],
        },
      ];
      const classMatches = [
        // TsClassA
        {
          pattern: 4, // Assuming pattern 4 is for classes in the class query
          captures: [
            { name: 'name', node: createMockNode('TsClassA', 3, 6, 3, 14) },
            { name: 'definition', node: createMockNode('class TsClassA { ... }', 3, 0, 8, 1) },
          ],
        },
        // TsClassB
        {
          pattern: 6, // Assuming pattern 6 is for export class in the class query
          captures: [
            { name: 'name', node: createMockNode('TsClassB', 9, 13, 9, 21) },
            { name: 'definition', node: createMockNode('export class TsClassB {}', 9, 0, 9, 24) },
          ],
        },
        // TsClassC
        {
          pattern: 7, // Assuming pattern 7 is for export default class in the class query
          captures: [
            { name: 'name', node: createMockNode('TsClassC', 10, 21, 10, 29) },
            {
              name: 'definition',
              node: createMockNode('export default class TsClassC {}', 10, 0, 10, 32),
            },
          ],
        },
      ];
      mockQueryResults(functionMatches, classMatches, language);

      const expectedClasses: CodeElementInfo[] = [
        { name: 'TsClassA', startLine: 3, endLine: 8 },
        { name: 'TsClassB', startLine: 9, endLine: 9 },
        { name: 'TsClassC', startLine: 10, endLine: 10 },
      ];
      const expectedFunctions: CodeElementInfo[] = [
        // Constructor not expected based on typical queries
        { name: 'method1', startLine: 6, endLine: 6 },
        { name: 'method2', startLine: 7, endLine: 7 },
      ];

      const result = await service.parse(content, language);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value!.classes).toEqual(expectedClasses);
        expect(result.value!.functions).toEqual(expectedFunctions);
      }

      expect(mockTsLang.query).toHaveBeenCalled();
    });

    it('should extract typed functions defined within object literals', async () => {
      const content = `
 const tsObj: { methodA: () => void; methodB: () => number } = { // line 2
   methodA: function() {}, // line 3
   methodB: () => 1 // line 4
 }; // line 5
       `;
      mockQueryResults(
        [
          // methodA
          {
            pattern: 8,
            captures: [
              // Object method pattern
              { name: 'name', node: createMockNode('methodA', 3, 3, 3, 10) },
              {
                name: 'definition', // CORRECTED CAPTURE NAME
                node: createMockNode('methodA: function() {}', 3, 3, 3, 25),
              },
            ],
          },
          // methodB
          {
            pattern: 8,
            captures: [
              { name: 'name', node: createMockNode('methodB', 4, 3, 4, 10) },
              {
                name: 'definition', // CORRECTED CAPTURE NAME
                node: createMockNode('methodB: () => 1', 4, 3, 4, 19),
              },
            ],
          },
        ], // functionMatches
        [], // classMatches
        language
      );

      const expectedFunctions: CodeElementInfo[] = [
        { name: 'methodA', startLine: 3, endLine: 3 },
        { name: 'methodB', startLine: 4, endLine: 4 },
      ];

      const result = await service.parse(content, language);

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value!.functions).toEqual(expect.arrayContaining(expectedFunctions));
        expect(result.value!.functions.length).toBe(expectedFunctions.length);
        expect(result.value!.classes).toEqual([]);
      }

      expect(mockTsLang.query).toHaveBeenCalled();
    });
  }); // End TypeScript describe
}); // End main describe
