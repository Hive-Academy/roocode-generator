# Task Description: Integrate Tree-sitter for Generic AST Extraction in Project Analyzer (Revised)

**Task ID:** TSK-008 (Revised)
**Original Task:** Enhance Project Analyzer with Language-Agnostic Parsing (Tree-sitter)
**Reason for Revision:** Strategic pivot confirmed. Original goal of using Tree-sitter queries for specific element extraction (functions/classes) was invalidated by TSK-012, which removed problematic queries. New strategy focuses on generic AST extraction via Tree-sitter, deferring detailed analysis to LLMs.

## 1. Task Overview

Enhance the `project-analyzer` component to parse source files using **Tree-sitter** and generate a **generic Abstract Syntax Tree (AST) representation** in JSON format for each parsed file. This capability is crucial for providing rich, language-agnostic structural context for future LLM-based analysis, enabling better understanding of diverse codebases.

**Business Context:** The goal is a versatile analyzer that provides fundamental structural data for any language with a Tree-sitter grammar. This raw structural data will serve as input for LLMs to perform deeper, more flexible code analysis (e.g., identifying functions, classes, patterns, dependencies) across different technology stacks, ultimately improving the quality of generated memory bank documents.

## 2. Research Summary: Generic AST Representation

Research indicates that a common approach involves recursively traversing the Tree-sitter `SyntaxNode` objects. Key properties available for extraction include:

- **`type`**: The node's syntactic type (string).
- **`text`**: The corresponding source code text (string/bytes).
- **`startPosition` / `endPosition`**: Location in the source file (row, column).
- **`children`**: Array of child nodes.
- **`isNamed`**: Boolean indicating if it's a named grammar rule.
- **`fieldNameForChild(index)` / `childNode.parentFieldName`**: Identifies the role of a child within its parent (string | null).

Based on this, the proposed generic JSON structure for each node is:

```json
{
  "type": "string",
  "text": "string",
  "startPosition": { "row": number, "column": number },
  "endPosition": { "row": number, "column": number },
  "isNamed": boolean,
  "fieldName": "string | null",
  "children": [
    // ... recursive array of nodes with the same structure
  ]
}
```

This structure captures essential information while remaining relatively simple for downstream LLM processing.

## 3. Current Implementation Analysis

- Core analysis logic: `src/core/analysis/project-analyzer.ts`.
- Tree-sitter parsing service: `src/core/analysis/tree-sitter-parser.service.ts`.
- Tree-sitter configuration (grammars): `src/core/analysis/tree-sitter.config.ts`.
- TSK-012 removed complex queries but left basic grammar loading and parsing intact.
- `ProjectContext` output (`src/core/analysis/interfaces.ts` or `types.ts`) currently has empty `definedFunctions`, `definedClasses`.

## 4. Detailed Requirements

- **Modify `TreeSitterParserService`:** Update `src/core/analysis/tree-sitter-parser.service.ts` to include a method that takes source code text and a loaded Tree-sitter language grammar, parses the code, and returns the root node of the AST.
- **Implement AST Traversal:** Create a function (likely within `TreeSitterParserService` or a new helper) that recursively traverses a `SyntaxNode` (starting from the root).
- **Generate Generic JSON:** During traversal, convert each relevant `SyntaxNode` into the proposed generic JSON structure defined in Section 2.
  - Focus on capturing `type`, `text`, `startPosition`, `endPosition`, `isNamed`, `fieldName` (if available via `node.parentFieldName` or similar), and recursively process `children`.
  - Consider adding a depth limit or filtering criteria (e.g., only include `isNamed` nodes beyond a certain depth) to manage the size and complexity of the output JSON, if necessary. Discuss this during implementation planning.
- **Integrate into `ProjectAnalyzer`:**
  - Modify `src/core/analysis/project-analyzer.ts` to call the `TreeSitterParserService` for supported file types (`.ts`, `.js` initially).
  - For each successfully parsed file, invoke the traversal/conversion function to get the generic AST JSON.
  - Add a new field to the `ProjectContext` output, tentatively named `astData`, structured as an object mapping relative file paths to their corresponding generic AST JSON representation (the root node of the structure defined in Section 2).
  ```json
  // Example ProjectContext structure addition
  {
    // ... existing fields (techStack, structure, dependencies)
    "astData": {
      "src/some/file.ts": {
        /* Generic AST JSON root node */
      },
      "src/another.js": {
        /* Generic AST JSON root node */
      }
      // ... other parsed files
    }
    // definedFunctions/definedClasses can be removed or left empty
  }
  ```
- **Update `ProjectContext` Interface:** Modify the relevant interface in `src/core/analysis/interfaces.ts` or `types.ts` to include the new `astData` field and potentially remove/deprecate `definedFunctions` and `definedClasses`.
- **Grammar Management:** Ensure the existing mechanism for loading grammars based on file extension in `TreeSitterParserService` / `tree-sitter.config.ts` remains functional for supported languages (JS/TS initially).
- **Error Handling:**
  - Maintain robust error handling for parsing failures (log warning, skip file).
  - Handle unsupported file types gracefully (skip, optional info log).
- **Testing:** Update existing unit tests (`tests/core/analysis/*`) and potentially add new ones to verify the AST traversal, JSON conversion, and the structure of the `astData` field in the output.

## 5. Acceptance Criteria Checklist

- [ ] **AC1:** Running the project analyzer (e.g., via `node run-analyzer.js`) successfully completes and produces a `ProjectContext` JSON output.
  - _Verification:_ Execute the analyzer script. Check for successful completion and JSON output.
- [ ] **AC2:** The output JSON contains a new top-level field `astData` (or similar agreed-upon name).
  - _Verification:_ Inspect the generated JSON output.
- [ ] **AC3:** The `astData` field is an object where keys are relative paths to successfully parsed source files (e.g., `.ts`, `.js`).
  - _Verification:_ Inspect the keys within the `astData` object.
- [ ] **AC4:** The value for each file path in `astData` is a JSON object representing the root of the generic AST structure defined in Section 2 (containing `type`, `text`, `startPosition`, `endPosition`, `isNamed`, `fieldName`, and nested `children`).
  - _Verification:_ Inspect the structure of the value for a known source file (e.g., `src/core/analysis/project-analyzer.ts`). Verify the presence and basic correctness of the core properties and the recursive `children` array.
- [ ] **AC5:** The `text` property within the AST nodes accurately reflects the corresponding source code snippet.
  - _Verification:_ Spot-check the `text` property for a few nodes (e.g., an identifier, a function keyword) against the original source file.
- [ ] **AC6:** The `startPosition` and `endPosition` properties accurately reflect the location of the node in the original source file.
  - _Verification:_ Spot-check the positions for a few nodes against the original source file.
- [ ] **AC7:** The analyzer handles files with unsupported extensions (e.g., `.md`, `.json`) gracefully by skipping them without errors and not including them in `astData`.
  - _Verification:_ Run the analyzer. Check logs for errors related to non-source files. Ensure `astData` does not contain keys for these files.
- [ ] **AC8:** The analyzer completes without crashing when encountering a source file (of a supported type) with syntax errors. A warning message is logged, and the file is not included in `astData`.
  - _Verification:_ Introduce a syntax error into a `.ts` file. Run the analyzer. Check for completion, warning log, and absence of the erroneous file's key in `astData`. Remove the error afterward.
- [ ] **AC9:** All other existing fields (`techStack`, `structure`, `dependencies`) in the `ProjectContext` output are still populated correctly.
  - _Verification:_ Compare the content of these fields against the known project state or previous successful runs.
- [ ] **AC10:** Unit tests for `ProjectAnalyzer` and `TreeSitterParserService` are updated or added to cover the new AST traversal and JSON generation logic.
  - _Verification:_ Code review of test files and confirmation that tests pass (`npm test`).
- [ ] **AC11:** The `ProjectContext` interface definition is updated to reflect the addition of `astData` and potential removal/deprecation of `definedFunctions`/`definedClasses`.
  - _Verification:_ Code review of `src/core/analysis/interfaces.ts` or `types.ts`.

## 6. Implementation Guidance

- Focus modifications within `src/core/analysis/project-analyzer.ts` and `src/core/analysis/tree-sitter-parser.service.ts`.
- Create a dedicated, testable function for the recursive AST traversal and JSON conversion.
- Leverage the properties identified in Section 2 (from `py-tree-sitter` docs, assuming similar properties in `node-tree-sitter`). Use `node.type`, `node.text`, `node.startPosition`, `node.endPosition`, `node.isNamed`, `node.parentFieldName` (or equivalent).
- Prioritize clarity and correctness of the core properties (`type`, `text`, `position`, `children`) in the generated JSON.
- Consider performance implications of traversing large ASTs. Implement potential optimizations like depth limiting or node filtering during the implementation planning phase if deemed necessary.
- Ensure the `require('tree-sitter-<language>')` calls for loading grammars remain functional.

## 7. File and Component References

- **Primary Modification Targets:**
  - `src/core/analysis/project-analyzer.ts`
  - `src/core/analysis/tree-sitter-parser.service.ts`
- **Related Interfaces/Types:** `src/core/analysis/interfaces.ts`, `src/core/analysis/types.ts` (specifically the `ProjectContext` interface).
- **Testing:** `tests/core/analysis/*`
- **Input Files:** Source code files (`.ts`, `.js`, etc.) within the target project.
- **Output:** JSON data conforming to the updated `ProjectContext` interface, including the `astData` field.

## 8. Memory Bank References

- `memory-bank/TechnicalArchitecture.md`: Lines 129-132 (ProjectAnalyzer context), Lines 217-221 (Modularity, LLM Abstraction, Result Pattern).
- `memory-bank/DeveloperGuide.md`: Lines 98-126 (Project Structure), Lines 249-280 (Code Guidelines, Error Handling), Lines 335-360 (Testing Strategy).
- `task-tracking/TSK-012/Re-FixViteTreeSitterBuildIssue/completion-report.md`: Documents the removal of queries and the pivot to LLM analysis.
