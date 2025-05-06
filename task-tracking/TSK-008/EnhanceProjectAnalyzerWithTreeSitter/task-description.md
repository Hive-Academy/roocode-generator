# Task Description: Enhance Project Analyzer with Language-Agnostic Parsing (Tree-sitter)

**Task ID:** TSK-008

## 1. Task Overview

Enhance the `project-analyzer` component to extract structural code information (functions, classes) from source files across **multiple programming languages**. This involves integrating the **Tree-sitter** parsing library to populate currently empty fields (`definedFunctions`, `definedClasses`) in the `ProjectContext` JSON output in a language-agnostic manner. This capability is crucial for generating accurate, project-specific context for memory bank creation, regardless of the project's tech stack.

**Business Context:** The goal is a versatile analyzer that provides structural insights for diverse projects. This detailed, language-agnostic context will enable LLMs to generate much richer and more accurate memory bank documents (like `TechnicalArchitecture.md`, `DeveloperGuide.md`) tailored to the specific codebase being analyzed.

## 2. Current Implementation Analysis

- The core analysis logic is in `src/core/analysis/project-analyzer.ts`.
- The analyzer currently identifies `techStack`, `structure` (files), and `dependencies`.
- The `ProjectContext` output (defined in `src/core/analysis/interfaces.ts` or `types.ts`) has `definedFunctions`, `definedClasses`, and `componentStructure` fields that are currently empty objects `{}`.
- The project is built with Node.js/TypeScript.

## 3. Detailed Requirements

- **Integrate Tree-sitter:** Add `node-tree-sitter` as a dependency. Modify `src/core/analysis/project-analyzer.ts` to use Tree-sitter for parsing source files.
- **Grammar Management:**
  - Add initial Tree-sitter grammar dependencies (e.g., `tree-sitter-javascript`, `tree-sitter-typescript`). Consider adding others like `tree-sitter-python` if feasible within scope.
  - Implement logic to dynamically select and load the appropriate Tree-sitter grammar based on the file extension of the source file being analyzed.
- **Parsing and Querying:**
  - For each supported source file type found within the project (initially focusing on `.ts`, `.js`), read its content.
  - Parse the content using the corresponding Tree-sitter grammar to generate an Abstract Syntax Tree (AST).
  - Use Tree-sitter's query capabilities or tree traversal methods to identify nodes representing function definitions/declarations and class definitions/declarations.
- **Populate `definedFunctions`:** Update the logic to populate this field with an object where keys are relative file paths and values are arrays of identified function details in a language-agnostic format, e.g., `{ name: string, startLine: number, endLine: number }`.
- **Populate `definedClasses`:** Update the logic similarly for classes, using the same language-agnostic format: `{ name: string, startLine: number, endLine: number }`.
- **`componentStructure` Field:** For this iteration, this field can remain empty or be populated identically to `definedClasses` as a starting point. Defining a truly language-agnostic component concept is complex and deferred.
- **Maintain Existing Functionality:** Ensure the analyzer continues to correctly identify and populate all other existing fields (`techStack`, `structure`, `dependencies`).
- **Error Handling:**
  - Implement robust error handling for parsing. If a file fails to parse with its corresponding grammar, log a warning (including the file path and error) and skip the file.
  - Handle unsupported file types gracefully (e.g., skip files with extensions that don't have a corresponding grammar loaded, log an informational message).
- **Dependency Management:** Add `node-tree-sitter` and the chosen initial set of language grammars (e.g., `tree-sitter-javascript`, `tree-sitter-typescript`) to `package.json`.

## 4. Acceptance Criteria Checklist

- [ ] **AC1:** Running the project analyzer (e.g., via `node run-analyzer.js`) successfully completes and produces a `ProjectContext` JSON output.
  - _Verification:_ Execute the analyzer script. Check for successful completion and JSON output.
- [ ] **AC2:** The `definedFunctions` field in the output JSON is populated with an object mapping relevant source file paths (e.g., `.ts`, `.js`) to non-empty arrays containing `{ name: string, startLine: number, endLine: number }` objects for identified functions.
  - _Verification:_ Run the analyzer on the `roocode-generator` project. Inspect the `definedFunctions` field. Verify entries for known `.ts` and `.js` files (like `src/core/analysis/project-analyzer.ts`, `bin/roocode-generator.js`) list function names and line numbers.
- [ ] **AC3:** The `definedClasses` field in the output JSON is populated similarly for identified classes in supported file types.
  - _Verification:_ Run the analyzer. Inspect the `definedClasses` field. Verify entries for known files list class names and line numbers.
- [ ] **AC4:** The analyzer handles files with unsupported extensions (e.g., `.md`, `.json`) gracefully by skipping them without errors (optionally logging an info message).
  - _Verification:_ Run the analyzer on the project. Check logs for errors related to non-source files. Ensure the process completes.
- [ ] **AC5:** The analyzer completes without crashing when encountering a source file (of a supported type) with syntax errors. A warning message identifying the problematic file and the parsing error is logged.
  - _Verification:_ Temporarily introduce a syntax error into a `.ts` or `.js` file. Run the analyzer. Check that it completes, logs a specific warning about the file/error, and the output JSON is still generated (excluding data from the erroneous file). Remove the syntax error afterward.
- [ ] **AC6:** All other existing fields (`techStack`, `structure`, `dependencies`) in the `ProjectContext` output are still populated correctly.
  - _Verification:_ Run the analyzer. Compare the content of `techStack`, `structure`, and `dependencies` fields against the known project state or previous successful runs.
- [ ] **AC7:** The implementation clearly utilizes `node-tree-sitter` for parsing and querying syntax trees.
  - _Verification:_ Code review of the modified `src/core/analysis/project-analyzer.ts` and any new helper modules.
- [ ] **AC8:** The `package.json` file includes `node-tree-sitter` and the required `tree-sitter-*` language grammar packages as dependencies.
  - _Verification:_ Inspect `package.json` and `package-lock.json`.

## 5. Implementation Guidance

- Focus modifications within `src/core/analysis/project-analyzer.ts`.
- Create helper functions or a dedicated service (e.g., `TreeSitterParserService`) to encapsulate grammar loading, parsing, and querying logic.
- Map file extensions (e.g., `.js`, `.ts`, `.py`) to their corresponding Tree-sitter grammar packages/objects.
- Consult the `node-tree-sitter` documentation and examples for API usage (loading grammars, parsing text, querying trees).
- Start with supporting JavaScript and TypeScript, as grammars are readily available and relevant to the host project. Add other languages like Python if time permits.
- Tree-sitter queries are powerful; invest time in crafting queries that reliably capture function and class definitions across common language patterns.

## 6. File and Component References

- **Primary Modification Target:** `src/core/analysis/project-analyzer.ts`
- **Potential New Modules:** Helper service for Tree-sitter parsing/querying.
- **Related Interfaces/Types:** `src/core/analysis/interfaces.ts`, `src/core/analysis/types.ts` (specifically the `ProjectContext` interface structure for functions/classes).
- **Configuration:** `package.json` (for new dependencies).
- **Input Files:** Source code files with supported extensions (e.g., `.ts`, `.js`) within the target project.
- **Output:** JSON data conforming to the `ProjectContext` interface.

## 7. Memory Bank References

- `memory-bank/TechnicalArchitecture.md`: Lines 7, 40-52 (Project is Node.js/TypeScript based, relevant for integrating `node-tree-sitter`).
- `memory-bank/ProjectOverview.md`: Lines 5, 8-13 (Goal is code generation, improved context helps).
