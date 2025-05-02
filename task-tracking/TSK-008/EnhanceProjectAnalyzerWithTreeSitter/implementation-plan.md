---
title: Implementation Plan
type: template
category: implementation
status: active
taskId: TSK-008
---

# Implementation Plan: TSK-008/EnhanceProjectAnalyzerWithTreeSitter

## Overview

This plan outlines the steps to enhance the `ProjectAnalyzer` (`src/core/analysis/project-analyzer.ts`) by integrating the **Tree-sitter** parsing library. The goal is to replace the current LLM-based (or non-existent) extraction of function and class definitions with a deterministic, language-agnostic approach using Tree-sitter. This will populate the `definedFunctions` and `definedClasses` fields in the `ProjectContext` output with accurate structural information ({ name: string, startLine: number, endLine: number }) for supported languages (initially JavaScript and TypeScript), improving the context generated for memory bank creation.

See [[task-description.md]] for detailed requirements and acceptance criteria.

## Implementation Strategy

### Approach

1.  **Introduce Tree-sitter Service:** Create a new injectable service, `TreeSitterParserService` (`src/core/analysis/tree-sitter-parser.service.ts`), to encapsulate all Tree-sitter related logic:
    - Loading language grammars dynamically based on file extensions.
    - Managing Tree-sitter parser instances.
    - Parsing file content into Abstract Syntax Trees (ASTs).
    - Executing Tree-sitter queries against ASTs to find function and class nodes.
    - Extracting required information (name, start/end lines) from matched nodes.
    - Handling parsing and querying errors gracefully.
2.  **Update Data Structure:** Modify the `CodeElementInfo` interface in `src/core/analysis/types.ts` to include `startLine` and `endLine` properties.
3.  **Integrate into ProjectAnalyzer:**
    - Inject `TreeSitterParserService` into `ProjectAnalyzer`.
    - After collecting the list of analyzable file paths (`allFiles.value`), iterate through them.
    - For each file, determine its language based on extension.
    - If a supported grammar exists, read the file content and pass it to `TreeSitterParserService` for parsing.
    - Collect the extracted function and class information from the service, storing it in temporary maps keyed by relative file paths.
    - Handle errors from the parser service (e.g., syntax errors in the file, unsupported language) by logging warnings and skipping the file's structural analysis.
4.  **Merge Results:** After the LLM analysis completes (if still used for other fields), merge the function/class information gathered by Tree-sitter into the final `ProjectContext` object before returning it. Ensure data from Tree-sitter takes precedence for `definedFunctions` and `definedClasses`.
5.  **Add Dependencies:** Update `package.json` to include `node-tree-sitter` and the initial grammar packages (`tree-sitter-javascript`, `tree-sitter-typescript`).

### Key Components

- **Affected Areas**:
  - `src/core/analysis/project-analyzer.ts` (Integration logic)
  - `src/core/analysis/types.ts` (Update `CodeElementInfo`)
  - `package.json` (Add dependencies)
  - `src/core/di/registrations.ts` (Register new service)
  - Potentially `src/core/analysis/constants.ts` (If language mapping is stored there)
- **New Components**:
  - `src/core/analysis/tree-sitter-parser.service.ts` (Core Tree-sitter logic)
  - Associated tests for the new service.
- **Dependencies**:
  - `node-tree-sitter` (Core library)
  - `tree-sitter-javascript` (JS grammar)
  - `tree-sitter-typescript` (TS grammar - likely `tree-sitter-typescript/typescript` and `tree-sitter-typescript/tsx`)
- **Risk Areas**:
  - Complexity of Tree-sitter queries to accurately capture various function/class declaration syntaxes.
  * Performance impact of parsing many files (mitigated by doing it after file collection/prioritization).
  * Correctly handling different TypeScript/JavaScript syntax variations (ES modules, CommonJS, different function syntaxes).
  * Ensuring native C++ bindings for Tree-sitter grammars build correctly across different environments (may require `node-gyp` setup).

## Implementation Subtasks

_(Note: Status tracking will be updated as tasks are delegated and completed)_

### 1. Setup Dependencies and Update Interface

**Status**: Completed

**Description**: Add necessary Tree-sitter dependencies to the project and update the core data structure for code elements.
**Files Modified**:

- `package.json`: Added `node-tree-sitter`, `tree-sitter-javascript`, `tree-sitter-typescript`.
- `src/core/analysis/types.ts`: Modified `CodeElementInfo` interface to include `startLine` and `endLine`.
- `package-lock.json`: Updated by npm install.
  **Implementation Details**:
- Ran `npm install node-tree-sitter tree-sitter-javascript tree-sitter-typescript`.
- Updated `CodeElementInfo` interface in `src/core/analysis/types.ts` to include `startLine: number;` and `endLine: number;`.
  **Testing Verification**:
- ✅ Verified dependencies `node-tree-sitter`, `tree-sitter-javascript`, `tree-sitter-typescript` are present in `package.json`.
- ✅ Verified `package-lock.json` was updated.
- ✅ Ensured the project still builds successfully by running `npm run type-check` (exit code 0).
  **Related Acceptance Criteria**:
- ✅ AC8 (partially): Dependencies added to `package.json`.
- ✅ Prerequisite for AC2, AC3: `CodeElementInfo` interface updated.
  **Estimated effort**: 15 minutes
  **Delegation Notes**: Suitable for Junior Coder. Focus on dependency management and interface update.

### 2. Create TreeSitterParserService Core

**Status**: Completed

**Description**: Create the basic structure for the `TreeSitterParserService`, including grammar loading and basic parsing logic.
**Files Modified**:

- `src/core/analysis/interfaces.ts`: Added `ITreeSitterParserService` interface.
- `src/core/analysis/types.ts`: Added `ParsedCodeInfo` type.
- `src/core/analysis/tree-sitter-parser.service.ts`: Created the service implementation.
- `src/core/di/modules/core-module.ts`: Registered the service using a factory.
- `tests/core/analysis/tree-sitter-parser.service.test.ts`: Added unit tests (delegated).
- `package.json`, `package-lock.json`: Updated dependencies (removed inversify).
  **Implementation Details**:
- Defined `ITreeSitterParserService` interface in `interfaces.ts`.
- Defined placeholder `ParsedCodeInfo` type in `types.ts`.
- Created `TreeSitterParserService` implementing the interface, using custom `@Injectable` decorator.
- Injected `ILogger` using custom `@Inject('ILogger')` decorator.
- Implemented dynamic grammar loading using `import()` for 'javascript' (`tree-sitter-javascript`) and 'typescript' (`tree-sitter-typescript/typescript`).
- Added caching for loaded parsers.
- Added mapping from file extensions (`.js`, `.jsx`, `.ts`, `.tsx`) to language strings.
- Implemented basic `parse` method: loads/retrieves parser, calls `parser.parse()`, returns placeholder `Result.ok({ functions: [], classes: [] })`.
- Added error handling for grammar loading failures and internal parsing errors.
- Registered the service in `core-module.ts` using `registerFactory` to handle dependency resolution.
- Addressed TypeScript and ESLint issues, including using `@ts-expect-error` and `eslint-disable-next-line` for the `node-tree-sitter` import due to type definition limitations.
  **Testing Verification**:
- Unit tests created and verified by Senior Developer. Tests cover instantiation, grammar loading (success/failure/caching), and basic parse success/failure. Coverage: Statements: 83.33%, Branches: 38.46%, Functions: 80%, Lines: 82.22%.
  **Related Acceptance Criteria**: Prerequisite for AC7.
  **Estimated effort**: 45 minutes (including debugging type issues)
  **Delegation Notes**:
- Unit test creation (`tests/core/analysis/tree-sitter-parser.service.test.ts`) delegated to Junior Tester. ✅ Completed.

### 3. Implement Tree-sitter Querying Logic

**Status**: Completed

**Description**: Implement the Tree-sitter queries and logic within `TreeSitterParserService` to extract function and class details.
**Files Modified**:

- `src/core/analysis/tree-sitter-parser.service.ts`: Implemented query execution and element extraction logic within the `parse` method and helper methods (`extractElements`, `_processMatch`/`processQueryMatch`). Refactored by Junior Coder for SOLID principles and readability.
- `src/core/analysis/tree-sitter.config.ts`: **New file** created by Junior Coder to hold queries and language configuration.
- `src/core/analysis/types.ts`: Minor type fix by Junior Coder.
- `tests/core/analysis/tree-sitter-parser.service.test.ts`: Split into `*.base.test.ts` and `*.extraction.test.ts` by Junior Tester.
- `tests/core/analysis/tree-sitter-parser.service.base.test.ts`: Updated by Junior Coder to align with refactoring.
- `tests/core/analysis/tree-sitter-parser.service.extraction.test.ts`: Implemented detailed extraction tests (delegated to Junior Tester, fixed by Senior Developer, updated by Junior Coder).
  **Implementation Details**:
- Defined Tree-sitter queries for JS/TS functions (declarations, expressions, arrows, methods, exports) and classes (declarations, exports). Queries moved to `tree-sitter.config.ts` during refactoring.
- Added `@default_definition` capture to queries for anonymous default exports.
- Implemented `extractElements` and `processQueryMatch` (refactored from `_processMatch`) to execute queries and process matches.
- Logic correctly extracts name, 1-based start line, and 1-based end line.
- Handles anonymous functions/classes, using `[anonymous_...]` as the placeholder name.
- Refactored service by Junior Coder to improve structure (SRP) and readability.
  **Testing Verification**:
- Unit tests updated/created by Junior Tester, fixed by Senior Developer, and verified passing after refactoring by Junior Coder.
- Tests cover various JS/TS function and class syntaxes, including exports and anonymous cases.
- Tests assert correct name, 1-based start/end lines.
- All 13 tests in `tree-sitter-parser.service.base.test.ts` and `tree-sitter-parser.service.extraction.test.ts` pass.
  **Related Acceptance Criteria**: AC7, Prerequisite for AC2, AC3.
  **Estimated effort**: 60 minutes (including test debugging and refactoring coordination)
  **Delegation Notes**:
- Test implementation delegated to Junior Tester. ✅ Completed (with fixes).
- Code refactoring (SOLID, best practices) delegated to Junior Coder. ✅ Completed.

### 4. Integrate TreeSitterParserService into ProjectAnalyzer

**Status**: Not Started

**Description**: Modify `ProjectAnalyzer` to use the new service to parse files and collect structural data.
**Files to Modify**: - `src/core/analysis/project-analyzer.ts`
**Implementation Details**: - Inject `ITreeSitterParserService` into `ProjectAnalyzer`. - In `analyzeProject`, after `collectAnalyzableFiles` returns `allFiles.value`: - Initialize empty maps: `definedFunctionsMap: Record<string, CodeElementInfo[]> = {}`, `definedClassesMap: Record<string, CodeElementInfo[]> = {}`. - Iterate through `allFiles.value`. - For each `filePath`: - Determine language from extension (e.g., `.ts` -> 'typescript', `.js` -> 'javascript'). - If language is supported by `TreeSitterParserService`: - Read file content using `fileOps.readFile`. Handle read errors. - Call `treeSitterParserService.parse(content, language)`. - If parse result is Ok: - Get relative path: `path.relative(rootPath, filePath)`. - Store `result.value.functions` in `definedFunctionsMap[relativePath]`. - Store `result.value.classes` in `definedClassesMap[relativePath]`. - If parse result is Err (e.g., syntax error): - Log a warning using `logger.warn` including the file path and error message (AC5). - If language is not supported: - Log an informational message (optional, AC4). - Pass `definedFunctionsMap` and `definedClassesMap` down to where the final `ProjectContext` is assembled.
**Testing Requirements**: - Integration tests (modify existing `ProjectAnalyzer` tests): Verify that `analyzeProject` calls the mock `TreeSitterParserService` for supported files. Verify warning logs for parsing errors. Verify unsupported files are skipped.
**Related Acceptance Criteria**: AC4, AC5, AC7.
**Estimated effort**: 30 minutes
**Delegation Notes**: Suitable for Senior Developer. Involves modifying core analysis flow and error handling.

### 5. Merge Results and Finalize

**Status**: Not Started

**Description**: Merge the data collected by Tree-sitter into the final `ProjectContext` object and update tests.
**Files to Modify**: - `src/core/analysis/project-analyzer.ts` - `tests/core/analysis/project-analyzer.test.ts` (and potentially other related test files)
**Implementation Details**: - In `analyzeProject`, locate where the final `ProjectContext` is constructed (currently around line 201). - Replace the default/LLM-derived `definedFunctions: {}` and `definedClasses: {}` with the maps populated in the previous step (`definedFunctionsMap`, `definedClassesMap`). - Ensure all other fields (`techStack`, other `structure` fields, `dependencies`) are still populated correctly from the LLM response or other sources. - Update existing `ProjectAnalyzer` tests to: - Mock `TreeSitterParserService` effectively. - Assert that `definedFunctions` and `definedClasses` in the final `ProjectContext` contain the expected data (based on mock service return values) for specific files. - Verify that files with mock parsing errors don't appear in the output maps. - Verify that existing assertions for other fields still pass.
**Testing Requirements**: - Pass all existing and updated unit/integration tests for `ProjectAnalyzer`. - Manually run `node run-analyzer.js` on the `roocode-generator` project itself and inspect the output JSON to verify AC1, AC2, AC3, AC6. - Manually introduce a syntax error and verify AC5.
**Related Acceptance Criteria**: AC1, AC2, AC3, AC6.
**Estimated effort**: 30 minutes
**Delegation Notes**: Suitable for Senior Developer. Requires careful merging of data and thorough testing. Junior Tester could assist with manual verification steps.

## Implementation Sequence

1.  **Subtask 1: Setup Dependencies and Update Interface** - Foundational step.
2.  **Subtask 2: Create TreeSitterParserService Core** - Build the service structure.
3.  **Subtask 3: Implement Tree-sitter Querying Logic** - Add the core parsing intelligence.
4.  **Subtask 4: Integrate TreeSitterParserService into ProjectAnalyzer** - Connect the service to the main workflow.
5.  **Subtask 5: Merge Results and Finalize** - Combine data and ensure correctness through testing.

## Technical Considerations

### Architecture Impact

- Introduces a new service (`TreeSitterParserService`) responsible for code parsing, decoupling this logic from the main `ProjectAnalyzer`.
- Reduces reliance on the LLM for specific structural analysis, potentially improving accuracy and reducing token usage/cost for this aspect in the future (though the LLM is still used for other analysis).
- Requires careful management of Tree-sitter grammar dependencies.

See [[TechnicalArchitecture.md]] for component details.

### Dependencies

- `node-tree-sitter`: Core library. Requires Node.js native addon compilation (potential build environment issues).
- `tree-sitter-javascript`, `tree-sitter-typescript`: Language grammars (also native addons).

### Testing Approach

- **Unit Tests:** Focus on `TreeSitterParserService` to validate grammar loading, parsing logic, query correctness, and error handling for various code snippets and languages.
- **Integration Tests:** Update `ProjectAnalyzer` tests to mock `TreeSitterParserService` and verify the integration points, data flow, merging logic, and handling of supported/unsupported/erroring files.
- **Manual Verification:** Run the analyzer on the host project (`roocode-generator`) and manually inspect the output JSON against known source files to confirm AC1, AC2, AC3, AC6. Introduce temporary syntax errors to verify AC5.

See [[DeveloperGuide.md#Quality-and-Testing]] for testing guidelines.

## Implementation Checklist

- [x] Requirements reviewed (from task description)
- [x] Architecture reviewed (current `ProjectAnalyzer` and plan for new service)
- [x] Dependencies checked (`package.json` analyzed, new ones identified)
- [x] Tests planned (Unit, Integration, Manual steps outlined)
- [ ] Documentation planned (JSDoc for new service/methods)
