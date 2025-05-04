// tests/__mocks__/tree-sitter.ts
import { jest } from '@jest/globals';

// Define a reusable mock SyntaxNode structure (simplified)
// Use 'any' type to avoid self-reference issues during initialization
const mockSyntaxNode: any = {
  type: 'program',
  text: 'mock code',
  startPosition: { row: 0, column: 0 },
  endPosition: { row: 1, column: 0 },
  isNamed: true,
  parentFieldName: null, // Use parentFieldName to match GenericAstNode's fieldName
  children: [], // Initialize children array first
  // Add other properties if needed by the conversion function
  id: 1,
  tree: {
    /* mock tree if needed */
  }, // Add mock tree object if accessed
  typeId: 1,
  grammarId: 1,
  grammarType: 'program',
  isMissing: false,
  isExtra: false,
  hasChanges: false,
  hasError: false,
  isError: false,
  parseState: 0,
  nextParseState: 0,
  startIndex: 0,
  endIndex: 10, // Adjust if needed
  parent: null,
  namedChildren: [], // Assuming the root has no named children in this mock
  childCount: 1, // Will be updated after child is added
  namedChildCount: 0,
  firstChild: null, // Will be updated after child is added
  firstNamedChild: null,
  lastChild: null, // Will be updated after child is added
  lastNamedChild: null,
  nextSibling: null,
  nextNamedSibling: null,
  previousSibling: null,
  previousNamedSibling: null,
  descendantCount: 1, // Will be updated after child is added
  // Mock methods if they are called directly in the service (unlikely based on current code)
  toString: jest.fn(() => 'mock code'),
  child: jest.fn((index: number) => (index === 0 ? mockSyntaxNode.children[0] : null)),
  namedChild: jest.fn(() => null),
  childForFieldName: jest.fn(() => null),
  childForFieldId: jest.fn(() => null),
  fieldNameForChild: jest.fn(() => null),
  fieldNameForNamedChild: jest.fn(() => null),
  childrenForFieldName: jest.fn(() => []),
  childrenForFieldId: jest.fn(() => []),
  firstChildForIndex: jest.fn(() => mockSyntaxNode.children[0]),
  firstNamedChildForIndex: jest.fn(() => null),
  childWithDescendant: jest.fn(() => mockSyntaxNode.children[0]), // Simplified
  descendantForIndex: jest.fn(() => mockSyntaxNode), // Return self for simplicity
  namedDescendantForIndex: jest.fn(() => mockSyntaxNode),
  descendantForPosition: jest.fn(() => mockSyntaxNode),
  namedDescendantForPosition: jest.fn(() => mockSyntaxNode),
  descendantsOfType: jest.fn(() => []),
  closest: jest.fn(() => null),
  walk: jest.fn(() => ({
    /* mock cursor */
  })), // Provide a mock cursor if needed
};

// Define the child node separately
const mockChildNode: any = {
  type: 'expression_statement',
  text: 'child code',
  startPosition: { row: 0, column: 0 },
  endPosition: { row: 0, column: 10 },
  isNamed: true,
  parentFieldName: null,
  children: [],
  // Add other properties if needed by the conversion function
  id: 2,
  tree: mockSyntaxNode.tree, // Reference parent tree
  typeId: 2,
  grammarId: 2,
  grammarType: 'expression_statement',
  isMissing: false,
  isExtra: false,
  hasChanges: false,
  hasError: false,
  isError: false,
  parseState: 0,
  nextParseState: 0,
  startIndex: 0,
  endIndex: 10,
  parent: mockSyntaxNode, // Reference parent node
  namedChildren: [],
  childCount: 0,
  namedChildCount: 0,
  firstChild: null,
  firstNamedChild: null,
  lastChild: null,
  lastNamedChild: null,
  nextSibling: null,
  nextNamedSibling: null,
  previousSibling: null,
  previousNamedSibling: null,
  descendantCount: 1,
  // Mock methods if they are called directly in the service (unlikely based on current code)
  toString: jest.fn(() => 'child code'),
  child: jest.fn(() => null),
  namedChild: jest.fn(() => null),
  childForFieldName: jest.fn(() => null),
  childForFieldId: jest.fn(() => null),
  fieldNameForChild: jest.fn(() => null),
  fieldNameForNamedChild: jest.fn(() => null),
  childrenForFieldName: jest.fn(() => []),
  childrenForFieldId: jest.fn(() => []),
  firstChildForIndex: jest.fn(() => null),
  firstNamedChildForIndex: jest.fn(() => null),
  childWithDescendant: jest.fn(() => null),
  descendantForIndex: jest.fn(() => mockChildNode), // Return self for simplicity
  namedDescendantForIndex: jest.fn(() => mockChildNode),
  descendantForPosition: jest.fn(() => mockChildNode),
  namedDescendantForPosition: jest.fn(() => mockChildNode),
  descendantsOfType: jest.fn(() => []),
  closest: jest.fn(() => null),
  walk: jest.fn(() => ({
    /* mock cursor */
  })), // Provide a mock cursor if needed
};

// Now add the child to the parent and update relevant properties
mockSyntaxNode.children.push(mockChildNode);
mockSyntaxNode.firstChild = mockChildNode;
mockSyntaxNode.lastChild = mockChildNode;
mockSyntaxNode.childCount = 1;
mockSyntaxNode.descendantCount = 2; // Root + 1 child

// Create the shared mock instance and export it for tests
export const mockParserInstance = {
  setLanguage: jest.fn(),
  parse: jest.fn().mockReturnValue({ rootNode: mockSyntaxNode }), // Default implementation
  getLogger: jest.fn(),
  setLogger: jest.fn(),
  getIncludedRanges: jest.fn(() => []),
  getTimeoutMicros: jest.fn(() => 0),
  setTimeoutMicros: jest.fn(),
  reset: jest.fn(),
  getLanguage: jest.fn(),
  printDotGraphs: jest.fn(),
};

// Define the MockParser class
class MockParser {
  constructor() {
    // Return the singleton instance when the class is instantiated
    return mockParserInstance;
  }

  // Add static methods if needed
  static Language = {
    // Mock static properties/methods if used
    // Use 'as any' to resolve the TS2345 error
    load: jest.fn().mockResolvedValue({
      /* mock language object */
    } as never),
  };
}

// Export the class using module.exports for CommonJS compatibility
module.exports = MockParser;
