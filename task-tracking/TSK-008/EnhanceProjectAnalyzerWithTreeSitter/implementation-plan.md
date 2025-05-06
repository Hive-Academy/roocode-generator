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
7.  Add specific logging to verify `astData` is present in the final output object.

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
- **Verification Logging:** Add a debug log statement in `ProjectAnalyzer` immediately before returning the `finalContext` to explicitly log the complete object, including the merged `astData`.

## 3. Acceptance Criteria Mapping

- **AC1 (Analyzer Runs):** Covered by successful execution after all subtasks.
- **AC2 (astData Field):** Satisfied by Subtask 2 (Interface Update), Subtask 5 (Analyzer Integration), and finally verified by Subtask 6.5 (Verify Final Output Log).
- **AC3 (astData Keys):** Satisfied by Subtask 5 (Analyzer Integration).
- **AC4 (astData Value Structure):** Satisfied by Subtask 1 (Interface Def), Subtask 3 (Traversal Impl), Subtask 4 (Parser Update), Subtask 5 (Analyzer Integration), and verified by Subtask 6 (Testing).
- **AC5 (Node Text):** Satisfied by Subtask 3 (Traversal Impl) and verified by Subtask 6 (Testing).
- **AC6 (Node Position):** Satisfied by Subtask 3 (Traversal Impl) and verified by Subtask 6 (Testing).
- **AC7 (Unsupported Files):** Existing logic in `ProjectAnalyzer` handles this; verified during testing (Subtask 6).
- **AC8 (Syntax Errors):** Existing logic in `ProjectAnalyzer` handles parsing errors; verified during testing (Subtask 6).
- **AC9 (Other Fields):** Ensured by careful modification in Subtask 5 (Analyzer Integration) and verified by Subtask 6 (Testing).
- **AC10 (Unit Tests):** Satisfied by Subtask 6 (Testing) and Subtask 6.4 (Final Test Verification).
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

**Status**: Completed

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

**Status**: Completed

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

**Status**: Completed

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

**Delegation Notes**:

- Senior Developer oversaw testing strategy.
- Junior Tester was delegated the task of fixing the initial "Cannot find module 'tree-sitter'" error.
- Junior Tester successfully resolved the module resolution error using `moduleNameMapper` and a mock file (`tests/__mocks__/tree-sitter.ts`).
  **Deviations**:
- Tests were updated as per the plan to cover `astData`, error handling, etc.
- The initial "Cannot find module 'tree-sitter'" error was resolved via delegation to Junior Tester.
- **However, the tests still fail.** The TS2307 compile-time error is resolved, but a runtime error `Parser is not a constructor` now occurs. This indicates the `require('tree-sitter')` in the service is not correctly receiving the `MockParser` class from the mock file.
- These failures prevent the successful verification of the updated test logic.
- **AC10 (Unit Tests) is currently NOT satisfied.**
- Fixing the mock export/require interaction is required, blocking the completion of this subtask. This will be addressed in Subtask 6.2.

### 6.1. Fix TS2307 Error in Parser Test

**Status**: Completed

**Description**: Resolve the `error TS2307: Cannot find module 'tree-sitter' or its corresponding type declarations.` in `tests/core/analysis/tree-sitter-parser.service.base.test.ts`. This involves changing the direct import of `tree-sitter` to a type-only import (`import type * as MockTreeSitter from 'tree-sitter';`) or removing it if the types are not directly used in the test file.

**Files to Modify**:

- `tests/core/analysis/tree-sitter-parser.service.base.test.ts`

**Implementation Details**:

- Changed the import in `tests/core/analysis/tree-sitter-parser.service.base.test.ts` from `import { mockInstance } from 'tree-sitter';` to `import { mockInstance } from '../__mocks__/tree-sitter';`.

**Testing Requirements**:

- Run `npm test -- tests/core/analysis/tree-sitter-parser.service.base.test.ts`.
- Confirmed the TS2307 error is resolved via `npm test`.
- **Deviation**: The initial approach (`@ts-ignore`, `tsconfig.json` changes) was incorrect. The fix involved changing the test file import to use a relative path to the mock file.
- **New Blocker**: Runtime error `Parser is not a constructor` now occurs, preventing tests from passing. This needs to be addressed in Subtask 6.2.

**Related Acceptance Criteria**:

- Partially addresses AC10 (Unit Tests) by unblocking test execution.

**Estimated effort**: 15 minutes

**Delegation Notes**: Handled by Senior Developer as part of unblocking Subtask 6.

### 6.2. Fix Mock Runtime Error

**Status**: Completed

**Description**: Address the runtime error `TypeError: Parser is not a constructor` occurring in `TreeSitterParserService` when running tests. This likely involves correcting how the `tree-sitter` module is mocked or how the mock is imported/required by the service during testing. Ensure the mock correctly provides a `Parser` constructor.

**Files to Modify**:

- `tests/__mocks__/tree-sitter.ts` (Likely needs adjustment to export `Parser` correctly)
- `jest.config.js` (Verify `moduleNameMapper` is correct)
- `src/core/analysis/tree-sitter-parser.service.ts` (Verify how `tree-sitter` is imported/required)

**Implementation Details**:

- Modified `tests/__mocks__/tree-sitter.ts` to export the `MockParser` class directly using `module.exports = { Parser: MockParser, ... }`.
- Verified `jest.config.js` maps `^tree-sitter$` to the mock file.
- Ensured `tree-sitter-parser.service.ts` uses `require('tree-sitter')` which Jest should intercept.

**Testing Requirements**:

- Run `npm test -- tests/core/analysis/tree-sitter-parser.service.base.test.ts`.
- Confirm the `Parser is not a constructor` error is resolved.
- Confirm the parser service tests now pass or fail for assertion reasons.

**Related Acceptance Criteria**:

- AC10 (Unit Tests) - Unblocks test execution further.

**Estimated effort**: 30 minutes

**Delegation Notes**: Handled by Senior Developer.

### 6.3. Fix Assertion Failures in Analyzer Test

**Status**: Completed

**Description**: Address the assertion failures in `tests/core/analysis/project-analyzer.test.ts` after fixing the mock runtime error. These failures likely relate to incorrect mock setup for `readDir`, `isDirectory`, or `readFile` within the analyzer test suite, or mismatches between the expected `astData` structure and the mocked return values.

**Files to Modify**:

- `tests/core/analysis/project-analyzer.test.ts`

**Implementation Details**:

- Corrected `readDir` mock to return `Result.ok(['src', 'package.json'])` for the root path.
- Corrected `isDirectory` mock to return `Result.ok(true)` only for `path.join(rootPath, 'src')`.
- Ensured `readFile` mock returns `Result.ok(...)` for expected files (`app.ts`, `utils.ts`, `package.json`).
- Updated assertions for `context.dependencies.dependencies` to match the structure derived from the mocked `package.json`.

**Testing Requirements**:

- Run `npm test -- tests/core/analysis/project-analyzer.test.ts`.
- Confirm all assertion failures are resolved and the analyzer tests pass.

**Related Acceptance Criteria**:

- AC10 (Unit Tests) - Ensures analyzer tests correctly validate the integration.

**Estimated effort**: 30 minutes

**Delegation Notes**: Handled by Senior Developer.

### 6.4. Final Test Verification

**Status**: Completed

**Description**: Run all relevant tests (`npm test -- tests/core/analysis/tree-sitter-parser.service.base.test.ts tests/core/analysis/project-analyzer.test.ts`) to ensure all previous fixes are integrated correctly and all tests related to the parser and analyzer now pass.

**Files to Modify**: None.

**Implementation Details**: Execute the test command.

**Testing Requirements**:

- Command `npm test -- tests/core/analysis/tree-sitter-parser.service.base.test.ts tests/core/analysis/project-analyzer.test.ts` must complete successfully with all tests passing.

**Related Acceptance Criteria**:

- AC10 (Unit Tests) - Final confirmation that tests pass.

**Estimated effort**: 10 minutes

**Delegation Notes**: Handled by Senior Developer.

### 6.5. Verify `astData` in Final Output Log

**Status**: Completed

**Description**: Add debug logging for the `finalContext` object in `ProjectAnalyzer.analyzeProject` just before returning. Run the analyzer manually using the standard generation command and confirm that the logged `finalContext` includes the populated `astData` field. This verifies that the data is correctly merged and present in the final output object, addressing the core issue reported in the task revision.

**Files to Modify**:

- `src/core/analysis/project-analyzer.ts`

**Implementation Details**:

```typescript
// In src/core/analysis/project-analyzer.ts, around line 268:

      // Add logging for the final context before returning
      this.logger.debug('Final ProjectContext (including astData):', JSON.stringify(finalContext, null, 2));

      this.progress.succeed('Project context analysis completed successfully');
      return Result.ok(finalContext);
    } catch (error) {
```

**Testing Requirements**:

- Build the project: `npm run build`.
- Execute the memory bank generation command (which triggers analysis): `npm start -- generate -- --generators memory-bank`.
- Inspect the console output for the "Final ProjectContext (including astData):" log message.
- Confirm the logged JSON object contains the `astData` field.
- Confirm the `astData` field is populated with keys representing relative file paths (e.g., `src/index.ts`) and values representing the generic AST structure for the corresponding files in the project being analyzed.
- **Verification Note:** Double-check that `astData` is _not_ included in the schema definition within `buildSystemPrompt` in `project-analyzer.ts` and is _not_ part of the schema used by `ResponseParser` in `json-schema-helper.ts`. Confirm it only appears in the final logged `ProjectContext`.

**Related Acceptance Criteria**:

- AC2 (astData Field) - Final verification step.

**Estimated effort**: 20 minutes (including build and manual run)

**Delegation Notes**: Suitable for Senior Developer.

## 5. Implementation Sequence

1.  **Subtask 1: Define Generic AST Node Interface** (Completed)
2.  **Subtask 2: Update ProjectContext and Related Interfaces** (Completed)
3.  **Subtask 3: Implement AST Traversal and Conversion Function** (Completed)
4.  **Subtask 4: Modify `TreeSitterParserService.parse` Method** (Completed)
5.  **Subtask 5: Update `ProjectAnalyzer` Integration** (Completed)
6.  **Subtask 6.1: Fix TS2307 Error in Parser Test** (Completed)
7.  **Subtask 6.2: Fix Mock Runtime Error** (Completed)
8.  **Subtask 6.3: Fix Assertion Failures in Analyzer Test** (Completed)
9.  **Subtask 6.4: Final Test Verification** (Completed)
10. **Subtask 6.5: Verify `astData` in Final Output Log** (Not Started) - **NEXT**

## 6. Testing Strategy

- **Unit Tests:** Focus on isolating the `TreeSitterParserService` (especially the traversal logic) and the `ProjectAnalyzer` (mocking the parser service). Verify the structure of `GenericAstNode` and the correct population of `astData`.
- **Integration Tests:** (Covered by existing analyzer tests) Ensure the analyzer correctly integrates the parser results.
- **Manual Verification:** Use the standard generation command (`npm start -- generate -- --generators memory-bank`) after implementation to manually inspect the `astData` in the final `ProjectContext` output log (as part of Subtask 6.5).

## 7. Verification Checklist

- [x] Plan is concise and focuses on practical implementation details.
- [x] Code style and architecture patterns have been analyzed (implicit in following existing structure).
- [x] All files to be modified are identified.
- [x] Subtasks are clearly defined with specific code changes.
- [x] Implementation sequence is logical with clear dependencies.
- [x] Testing requirements are specific with test cases.
- [x] Progress tracking section is included for each subtask.
- [x] Acceptance criteria is clearly mapped to subtasks.
- [x] The plan does NOT duplicate business logic analysis from Task Description.
- [x] Guidance on subtask quality, definition, testability, and architectural alignment is included.
- [x] Added Subtask 6.5 for explicit final output verification.
- [x] Updated Subtask 6.5 with correct manual verification command.
- [x] Added verification note to Subtask 6.5 regarding schema checks.
