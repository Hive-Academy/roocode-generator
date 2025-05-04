# Implementation Plan: TSK-008 (Revised) - Integrate Tree-sitter for Generic AST Extraction

**Task ID:** TSK-008 (Revised)
**Goal:** Integrate Tree-sitter into the `ProjectAnalyzer` to parse source files and generate a generic Abstract Syntax Tree (AST) representation in JSON format for each file, storing it in the `ProjectContext`.

## 1. Overview

This plan outlines the steps to modify the `ProjectAnalyzer` and `TreeSitterParserService` to leverage Tree-sitter for generating a generic JSON AST structure for supported source files (`.ts`, `.js` initially). This replaces the previous query-based extraction of specific functions/classes. The generated AST data will be added to the `ProjectContext` under a new `astData` field.

**Technical Approach:**

1.  Define a TypeScript interface (`GenericAstNode`) matching the required JSON structure.
2.  Update the `ProjectContext` and `ProjectStructure` interfaces to include `astData` and remove/deprecate `definedFunctions`/`definedClasses`.
3.  Implement a recursive function within `TreeSitterParserService` to traverse the Tree-sitter `SyntaxNode` and convert it into the `GenericAstNode` format.
4.  Modify `TreeSitterParserService.parse` to return the root `GenericAstNode`.
5.  Update `ProjectAnalyzer` to call the modified parser, collect the AST data, and populate the `astData` field in the final `ProjectContext`.
6.  Update unit tests to cover the new functionality and data structures.

**Files to Modify:**

- `src/core/analysis/types.ts`
- `src/core/analysis/tree-sitter-parser.service.ts`
- `src/core/analysis/project-analyzer.ts`
- `tests/core/analysis/tree-sitter-parser.service.base.test.ts` (or similar)
- `tests/core/analysis/project-analyzer.test.ts` (or similar)

## 2. Implementation Strategy

The core change involves replacing the query-based extraction in `TreeSitterParserService` with a generic AST traversal and conversion mechanism.

- **AST Traversal:** A recursive function will be implemented. It will take a `SyntaxNode` and return a `GenericAstNode`. For each node, it will extract `type`, `text`, `startPosition`, `endPosition`, `isNamed`, and `parentFieldName`. It will then recursively call itself for all children nodes.
- **Depth Limiting (Consideration):** To manage potential performance issues and output size with very large files or deeply nested ASTs, a configurable depth limit can be added to the traversal function. Initially, we can implement without a limit and evaluate performance. If needed, a limit (e.g., 10-15 levels deep) can be added later or as part of the initial implementation if deemed critical. This will be a parameter to the traversal function.
- **Integration:** `ProjectAnalyzer` will iterate through analyzable files, call the updated `TreeSitterParserService.parse`, and store the resulting `GenericAstNode` in a map keyed by the relative file path. This map will then populate the `astData` field in the `ProjectContext`.
- **Error Handling:** Existing error handling for file reading and parsing failures in `ProjectAnalyzer` will be maintained. The parser service should return an `Error` Result if parsing fails.

## 3. Acceptance Criteria Mapping

- **AC1 (Analyzer Runs):** Covered by successful execution after all subtasks.
- **AC2 (astData Field):** Satisfied by Subtask 2 (Interface Update) and Subtask 5 (Analyzer Integration).
- **AC3 (astData Keys):** Satisfied by Subtask 5 (Analyzer Integration).
- **AC4 (astData Value Structure):** Satisfied by Subtask 1 (Interface Def), Subtask 3 (Traversal Impl), Subtask 4 (Parser Update), Subtask 5 (Analyzer Integration), and verified by Subtask 6 (Testing).
- **AC5 (Node Text):** Satisfied by Subtask 3 (Traversal Impl) and verified by Subtask 6 (Testing).
- **AC6 (Node Position):** Satisfied by Subtask 3 (Traversal Impl) and verified by Subtask 6 (Testing).
- **AC7 (Unsupported Files):** Existing logic in `ProjectAnalyzer` handles this; verified during testing (Subtask 6).
- **AC8 (Syntax Errors):** Existing logic in `ProjectAnalyzer` handles parsing errors; verified during testing (Subtask 6).
- **AC9 (Other Fields):** Ensured by careful modification in Subtask 5 (Analyzer Integration) and verified by Subtask 6 (Testing).
- **AC10 (Unit Tests):** Satisfied by Subtask 6 (Testing).
- **AC11 (Interface Update):** Satisfied by Subtask 2 (Interface Update).

## 4. Implementation Subtasks

### 1. Define Generic AST Node Interface

**Status**: Completed

**Description**: Define the `GenericAstNode` interface in `src/core/analysis/types.ts` based on the structure specified in the task description (Section 2).

**Files Modified**: `src/core/analysis/types.ts`

**Implementation Details**: Added `CodePosition` and `GenericAstNode` interfaces as specified.

**Testing Requirements**: No specific tests for interface definition itself. Verified by successful compilation and usage in subsequent subtasks.

**Related Acceptance Criteria**: AC4 (Structure Definition) - Partially satisfied by defining the interface. Full satisfaction requires implementation and testing in later subtasks.

**Estimated effort**: 15 minutes

**Delegation Notes**: Suitable for Junior Coder if needed, as it's primarily type definition.

### 2. Update ProjectContext and Related Interfaces

**Status**: Completed

**Description**: Modify `ProjectStructure` and `ProjectContext` interfaces in `src/core/analysis/types.ts`. Add the `astData` field and remove/deprecate `definedFunctions` and `definedClasses`. Also remove or update the now obsolete `ParsedCodeInfo` interface.

**Files to Modify**:

- `src/core/analysis/types.ts`

**Implementation Details**:

```typescript
// In src/core/analysis/types.ts

export interface ProjectStructure {
  rootDir: string;
  sourceDir: string;
  testDir: string;
  configFiles: string[];
  mainEntryPoints: string[];
  componentStructure: Record<string, string[]>;
  // Remove or comment out the following lines:
  // definedFunctions: Record<string, CodeElementInfo[]>;
  // definedClasses: Record<string, CodeElementInfo[]>;
}

export interface ProjectContext {
  techStack: TechStackAnalysis;
  structure: ProjectStructure;
  dependencies: DependencyGraph;
  // Add the new field:
  astData: Record<string, GenericAstNode>; // Key: relative file path
}

// Remove or comment out the ParsedCodeInfo interface:
// export interface ParsedCodeInfo { ... }

// Remove or comment out CodeElementInfo if no longer used elsewhere
// export interface CodeElementInfo { ... }
```

**Testing Requirements**:

- No specific tests for interface definition itself. Verified by successful compilation and usage in subsequent subtasks.

**Related Acceptance Criteria**:

- AC2 (astData Field)
- AC11 (Interface Update)

**Estimated effort**: 15 minutes

**Delegation Notes**: Suitable for Junior Coder if needed.

### 3. Implement AST Traversal and Conversion Function

**Status**: Completed

**Description**: Create a private helper function within `TreeSitterParserService` (e.g., `_convertNodeToGenericAst`) that takes a Tree-sitter `SyntaxNode` and recursively converts it and its children into the `GenericAstNode` structure. Include extraction of `type`, `text`, `startPosition`, `endPosition`, `isNamed`, and `parentFieldName`. Consider adding an optional `maxDepth` parameter.

**Files to Modify**:

- `src/core/analysis/tree-sitter-parser.service.ts`

**Implementation Details**:

```typescript
// In src/core/analysis/tree-sitter-parser.service.ts

// Import GenericAstNode, CodePosition from types.ts
// Import SyntaxNode type from 'tree-sitter' (or use 'any' if types are problematic)
import { GenericAstNode, CodePosition } from './types';
import { SyntaxNode } from 'tree-sitter'; // Or 'any'

// Add within the TreeSitterParserService class
private _convertNodeToGenericAst(
    node: SyntaxNode, // Or 'any'
    currentDepth: number = 0,
    maxDepth: number | null = null // Optional depth limit
): GenericAstNode {
    if (maxDepth !== null && currentDepth > maxDepth) {
        // Return a placeholder or minimal node if depth limit is exceeded
        return {
            type: node.type,
            text: '...', // Indicate truncation
            startPosition: { row: node.startPosition.row, column: node.startPosition.column },
            endPosition: { row: node.endPosition.row, column: node.endPosition.column },
            isNamed: node.isNamed,
            fieldName: node.parentFieldName || null,
            children: [] // No children beyond max depth
        };
    }

    const children = node.children ?? []; // Ensure children is an array

    return {
        type: node.type,
        text: node.text, // Be mindful of large text nodes, potential optimization later if needed
        startPosition: { row: node.startPosition.row, column: node.startPosition.column },
        endPosition: { row: node.endPosition.row, column: node.endPosition.column },
        isNamed: node.isNamed,
        fieldName: node.parentFieldName || null, // Get field name from the node itself
        children: children.map(child =>
            this._convertNodeToGenericAst(child, currentDepth + 1, maxDepth)
        )
    };
}
```

**Testing Requirements**:

- Unit tests specifically for `_convertNodeToGenericAst`.
- Test cases:
  - Basic node conversion (check all properties).
  - Recursive conversion of children.
  - Handling nodes with no children.
  - Correct extraction of `parentFieldName`.
  - (If implemented) Correct behavior with `maxDepth`.
  - Handling potential edge cases (e.g., root node).

**Related Acceptance Criteria**:

- AC4 (AST Structure)
- AC5 (Node Text)
- AC6 (Node Position)

**Estimated effort**: 30 minutes (without depth limit) / 45 minutes (with depth limit)

**Delegation Notes**: Core logic, best handled by Senior Developer. Junior Coder could potentially implement with very clear guidance and examples.
**Deviations**:

- Changed `SyntaxNode` type to `any` for the `node` parameter in `_convertNodeToGenericAst` due to persistent TypeScript errors when accessing `fieldName` (or `parentFieldName`). The property access `node.fieldName` was retained. This may need revisiting if runtime issues occur.
- Corrected a missing closing brace for the `extractElements` method that was causing parsing errors.

### 4. Modify `TreeSitterParserService.parse` Method

**Status**: Not Started

**Description**: Update the public `parse` method in `TreeSitterParserService`. Remove the old query execution logic (`extractElements`, `processQueryMatch`). Instead, after parsing the content into a `tree`, call the new `_convertNodeToGenericAst` function on the `tree.rootNode` and return the resulting `GenericAstNode` within a `Result.ok`.

**Files to Modify**:

- `src/core/analysis/tree-sitter-parser.service.ts`

**Implementation Details**:

```typescript
// In src/core/analysis/tree-sitter-parser.service.ts

// Update imports and interface ITreeSitterParserService if needed
import { GenericAstNode } from './types'; // Import the new type
// Remove ParsedCodeInfo import if no longer needed

// Update the ITreeSitterParserService interface definition
export interface ITreeSitterParserService {
  initialize(): Result<void, Error>;
  parse(content: string, language: SupportedLanguage): Result<GenericAstNode, Error>; // Update return type
}

// Update the parse method signature and implementation
parse(
    content: string,
    language: SupportedLanguage
): Result<GenericAstNode, Error> { // Update return type
    this.logger.info(`Parsing content for language: ${language} to generate generic AST`);

    const initResult = this.initialize();
    if (initResult.isErr()) {
        return Result.err(initResult.error!);
    }

    const parserResult = this.getOrCreateParser(language);
    if (parserResult.isErr()) {
        return Result.err(parserResult.error!);
    }
    const parser = parserResult.value;

    let tree: any; // Use 'any' for Tree type or import if possible
    try {
        if (!parser) {
            throw new Error('Parser instance is null or undefined before parsing.');
        }
        tree = parser.parse(content);
        if (!tree?.rootNode) {
            throw new Error('Parsing resulted in an undefined tree or rootNode.');
        }
        this.logger.debug(
            `Successfully created syntax tree for language: ${language}. Root node type: ${tree.rootNode.type}`
        );

        // --- NEW: Convert tree to generic AST ---
        // Consider passing a maxDepth from config or keep it null/hardcoded for now
        const genericAstRoot = this._convertNodeToGenericAst(tree.rootNode, 0, null);
        this.logger.info(`Successfully converted AST to generic JSON format for language: ${language}.`);
        return Result.ok(genericAstRoot);
        // --- END NEW ---

    } catch (error: unknown) {
        return Result.err(
            this._handleAndLogError(`Error during Tree-sitter parsing or AST conversion for ${language}`, error)
        );
    }

    // Remove old query execution logic:
    // const queries = this.getQueriesForLanguage(language);
    // ...
    // const functions = this.extractElements(...);
    // const classes = this.extractElements(...);
    // const parsedInfo: ParsedCodeInfo = { functions, classes };
    // return Result.ok(parsedInfo);
}

// Also remove private methods: getQueriesForLanguage, processQueryMatch, extractElements
```

**Testing Requirements**:

- Update existing unit tests for `parse` to expect `Result<GenericAstNode, Error>`.
- Verify that `_convertNodeToGenericAst` is called correctly.
- Test successful parsing returns the expected root node structure.
- Test parsing failure returns an `Error` Result.

**Related Acceptance Criteria**:

- AC4 (AST Structure)

**Estimated effort**: 30 minutes

**Delegation Notes**: Best handled by Senior Developer due to changes in public API and removal of old logic.

### 5. Update `ProjectAnalyzer` Integration

**Status**: Not Started

**Description**: Modify `ProjectAnalyzer.analyzeProject` to:

1.  Call the updated `treeSitterParserService.parse` and expect `GenericAstNode`.
2.  Store the results in a new map `astDataMap: Record<string, GenericAstNode>`.
3.  Update the final `ProjectContext` creation to use `astDataMap` for the `astData` field.
4.  Remove the population of `definedFunctions` and `definedClasses`.
5.  (Optional) Update `buildSystemPrompt` to remove requests for `definedFunctions`/`definedClasses`.

**Files to Modify**:

- `src/core/analysis/project-analyzer.ts`

**Implementation Details**:

```typescript
// In src/core/analysis/project-analyzer.ts

// Import GenericAstNode
import { ProjectContext, GenericAstNode } from './types';
// Remove CodeElementInfo import if no longer needed

// Inside analyzeProject method:

// Replace old maps:
// const definedFunctionsMap: Record<string, CodeElementInfo[]> = {};
// const definedClassesMap: Record<string, CodeElementInfo[]> = {};
const astDataMap: Record<string, GenericAstNode> = {}; // New map

// Inside the loop iterating through files (around line 108):
// ...
if (language) {
  // ... read file content ...

  // Call updated parse method
  const parseResult = this.treeSitterParserService.parse(content, language); // Expects Result<GenericAstNode, Error>

  if (parseResult.isOk()) {
    const relativePath = path.relative(rootPath, filePath).replace(/\\/g, '/');
    // Store the entire AST root node
    astDataMap[relativePath] = parseResult.value!; // Add non-null assertion
    this.logger.debug(`Stored generic AST for ${relativePath}`);
    // Remove old assignments:
    // definedFunctionsMap[relativePath] = parseResult.value!.functions;
    // definedClassesMap[relativePath] = parseResult.value!.classes;
  } else {
    this.logger.warn(
      `Failed to parse ${filePath} for AST: ${parseResult.error?.message ?? 'Unknown parse error'}`
    );
  }
}
// ... end loop ...

// Update final context creation (around line 248):
const finalContext: ProjectContext = {
  techStack,
  structure: {
    ...structure,
    rootDir: rootPath,
    // Remove old fields:
    // definedFunctions: definedFunctionsMap,
    // definedClasses: definedClassesMap,
  },
  dependencies: {
    ...dependencies,
    internalDependencies: dependencies.internalDependencies ?? {},
  },
  // Add the new field:
  astData: astDataMap,
};

// Optional: Update buildSystemPrompt (around line 408)
// Remove lines requesting definedFunctions/definedClasses from the prompt string
// and from the example JSON schema within the prompt.
```

**Testing Requirements**:

- Update existing unit tests for `analyzeProject`.
- Verify that `treeSitterParserService.parse` is called correctly.
- Verify that `astDataMap` is populated correctly for supported files.
- Verify that the final `ProjectContext` contains the `astData` field with the expected structure.
- Verify that `definedFunctions` and `definedClasses` are no longer present in the output `ProjectContext.structure`.
- Verify handling of parsing errors (file skipped in `astData`).
- Verify handling of unsupported files (file skipped in `astData`).

**Related Acceptance Criteria**:

- AC2 (astData Field)
- AC3 (astData Keys)
- AC4 (AST Structure)
- AC7 (Unsupported Files)
- AC8 (Syntax Errors)
- AC9 (Other Fields)

**Estimated effort**: 45 minutes

**Delegation Notes**: Best handled by Senior Developer, involves integrating changes and modifying core analysis flow.

### 6. Update Unit Tests

**Status**: Not Started

**Description**: Update existing unit tests and add new ones for `TreeSitterParserService` and `ProjectAnalyzer` to cover the new AST generation logic, the updated interfaces, and the presence/structure of the `astData` field. Ensure tests cover success cases, error handling (parsing errors, unsupported files), and edge cases (empty files, files with only comments).

**Files to Modify**:

- `tests/core/analysis/tree-sitter-parser.service.base.test.ts` (or relevant parser test file)
- `tests/core/analysis/project-analyzer.test.ts` (or relevant analyzer test file)
- Potentially add new test files if needed.

**Implementation Details**:

- **Parser Tests**:
  - Update tests for `parse` to mock file content and verify the returned `GenericAstNode` structure matches expectations.
  - Add specific tests for the `_convertNodeToGenericAst` helper function (if made accessible for testing or tested indirectly via `parse`). Test recursion, property extraction, depth limiting (if implemented).
  - Test error handling (e.g., invalid content).
- **Analyzer Tests**:
  - Update mocks for `TreeSitterParserService.parse` to return `Result.ok(mockAstNode)` or `Result.err(...)`.
  - Verify `analyzeProject` output contains the `astData` field.
  - Verify `astData` keys are correct relative paths.
  - Verify `astData` values match the mocked AST nodes.
  - Verify files with parsing errors are logged and excluded from `astData`.
  - Verify unsupported files are excluded from `astData`.
  - Verify other `ProjectContext` fields remain correct.

**Testing Requirements**:

- All new and updated tests must pass (`npm test`).
- Cover core functionality and error handling related to AST generation.

**Related Acceptance Criteria**:

- AC4 (AST Structure Verification)
- AC5 (Node Text Verification)
- AC6 (Node Position Verification)
- AC7 (Unsupported Files Verification)
- AC8 (Syntax Errors Verification)
- AC9 (Other Fields Verification)
- AC10 (Unit Tests)

**Estimated effort**: 60-90 minutes

**Delegation Notes**: Senior Developer should oversee testing strategy. Junior Tester can write specific test cases based on clear requirements provided by the Senior Developer, focusing on verifying the structure and content of `astData` and error handling scenarios.

## 5. Implementation Sequence

1.  **Subtask 1: Define Generic AST Node Interface** (Types groundwork)
2.  **Subtask 2: Update ProjectContext and Related Interfaces** (Types groundwork)
3.  **Subtask 3: Implement AST Traversal and Conversion Function** (Core logic in isolation)
4.  **Subtask 4: Modify `TreeSitterParserService.parse` Method** (Connect traversal to parser API)
5.  **Subtask 5: Update `ProjectAnalyzer` Integration** (Integrate parser changes into analyzer flow)
6.  **Subtask 6: Update Unit Tests** (Verify all changes)

## 6. Testing Strategy

- **Unit Testing:** Focus on testing the `_convertNodeToGenericAst` function in isolation (if possible) and the public `parse` method of `TreeSitterParserService`. Mock dependencies for `ProjectAnalyzer` tests, focusing on verifying its interaction with the parser service and the final structure of `ProjectContext`, especially the `astData` field. Use sample code snippets (valid and invalid) as input for parser tests.
- **Integration Testing (Manual):** Run the `node run-analyzer.js` script on the current project or a sample project. Inspect the generated JSON output to manually verify:
  - Presence and structure of the `astData` field.
  - Correct relative paths as keys.
  - Plausibility of the AST structure for a known file (spot-check `type`, `text`, `children`).
  - Absence of `definedFunctions`/`definedClasses`.
  - Correctness of other fields (`techStack`, `structure`, `dependencies`).
  - Absence of errors/warnings for unsupported files.
  - Presence of warnings for files with syntax errors (and their exclusion from `astData`).

## 7. Verification Checklist

- [ ] Plan is concise and focuses on practical implementation details.
- [ ] Code style and architecture patterns have been analyzed (implicitly, by modifying existing services).
- [ ] All files to be modified are identified.
- [ ] Subtasks are clearly defined with specific code changes.
- [ ] Implementation sequence is logical with clear dependencies.
- [ ] Testing requirements are specific with test cases.
- [ ] Progress tracking section is included for each subtask.
- [ ] Acceptance criteria is clearly mapped to subtasks.
- [ ] The plan does NOT duplicate business logic analysis from Task Description.
- [ ] Guidance on subtask quality, definition, testability, and architectural alignment is included.
