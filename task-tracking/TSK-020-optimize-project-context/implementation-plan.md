# Implementation Plan: TSK-020 - Optimize ProjectContext Structure (Revised Approach)

## 1. Overview

This revised plan outlines the steps to refactor the `ProjectContext` object to achieve a more aggressive minimization of its structure, primarily for optimizing payloads sent to LLMs. The core idea is to rely heavily on `ProjectContext.codeInsights` and `ProjectContext.packageJson`, removing explicit `directoryTree` and `internalDependencyGraph` structures. The LLM or consumers will be expected to infer structural information and internal dependencies from `codeInsights`.

This refactoring will involve:

- Drastically simplifying `ProjectContext` type definitions in `src/core/analysis/types.ts`.
- Updating the `ProjectAnalyzer` service (`src/core/analysis/project-analyzer.ts`) to populate this minimal structure.
- Significantly updating all consumer components of `ProjectContext` to adapt to the absence of `directoryTree` and `internalDependencyGraph`, deriving necessary information primarily from `codeInsights`.
- Updating or removing helper functions in `src/core/analysis/project-context.utils.ts`.
- Performing manual CLI testing to verify core functionality. Unit and integration testing are deferred.

## 2. Implementation Strategy

The strategy will be to:

1.  **Define Minimal `ProjectContext` Types**: Modify `ProjectContext` and related interfaces in `src/core/analysis/types.ts` to remove `structure.directoryTree` and `internalDependencyGraph`. `ProjectStructure` might become very minimal or be removed if `rootDir` is the only remaining useful piece of general structure information.
2.  **Update `ProjectAnalyzer`**: Modify `src/core/analysis/project-analyzer.ts` and its helper services to:
    - Stop generating `directoryTree`. The `DirectoryNodeTagger` service will likely be removed or its logic re-purposed if specific file roles need to be identified from paths in `codeInsights`.
    - Stop generating and storing `internalDependencyGraph`.
    - Ensure `packageJson` (for external dependencies) and `codeInsights` (with accurate `ImportInfo.isExternal` and normalized `source`) are correctly populated.
3.  **Update All Consumers**: This is a critical step.
    - Identify all code locations that previously used `projectContext.structure.directoryTree` (e.g., to find config files, entry points, or iterate project files) or `projectContext.internalDependencyGraph`.
    - Refactor these consumers to:
      - Derive file lists and paths from `Object.keys(projectContext.codeInsights)`.
      - Identify special file roles (config, entry point) by pattern matching on file paths from `codeInsights` keys, or adapt prompts for LLMs to infer these roles.
      - Derive internal dependencies by processing `projectContext.codeInsights[filePath].imports` where `isExternal` is false.
    - Update helper functions in `project-context.utils.ts` or create new ones that operate solely on `codeInsights` and `packageJson`.
    - Review and potentially heavily revise prompt engineering for generators that relied on the explicit structure of `directoryTree` or `internalDependencyGraph`.
4.  **Manual CLI Testing**: Perform manual execution of key CLI commands to verify core functionality and output integrity with the radically refactored `ProjectContext`.

Unit and integration testing are deferred to a separate, subsequent task.

## 3. Acceptance Criteria Mapping (Revised Context)

- **AC1 (Dependency Duplication)**: Achieved by `packageJson` being SSoT for external dependencies. `internalDependencyGraph` is removed entirely, eliminating its potential for duplication with `codeInsights`.
- **AC2 (File Path Duplication)**: Achieved by removing `structure.directoryTree`. File paths are primarily sourced from `codeInsights` keys.
- **AC3 (CodeInsights Path Duplication)**: `codeInsights` becomes a primary source of path information. Its internal consistency (e.g., `ImportInfo` processing) remains key.
- **AC4 (Consumer Compatibility)**: All consumers updated to work with the minimal `ProjectContext`. This is a major focus.
- **AC5 (Existing Tests Pass/Updated)**: DEFERRED.
- **AC6 (New Tests Added)**: DEFERRED.
- **AC7 (CLI Functionality Intact)**: Verified by manual CLI testing.
- **AC8 (No Significant Performance Regression)**: Verified by qualitative assessment during manual CLI testing.
- **AC9 (Code Review Approval)**: Post-completion of all subtasks including manual testing.
- **AC10 (Documentation Update)**: REMOVED.

## 4. Implementation Subtasks

### Subtask 1: Define Minimal `ProjectContext` Types (Round 2 Refactor)

**Status**: Not Started

**Description**: Redefine `ProjectContext` and related interfaces in `src/core/analysis/types.ts` to remove `structure.directoryTree` and `internalDependencyGraph`.

**Files to Modify**:

- `src/core/analysis/types.ts`:
  - `ProjectContext`: Remove `structure.directoryTree` (this may lead to simplifying or removing `ProjectStructure` and `DirectoryNode` if `rootDir` is the only structural element kept, perhaps moved to top level of `ProjectContext`). Remove `internalDependencyGraph`.
  - `ProjectStructure`: May be heavily simplified (e.g., to only contain `rootDir`, `sourceDir`, `testDir`) or removed if these can be inferred or are less critical than `codeInsights`.
  - `DirectoryNode`: May be removed if `directoryTree` is removed.
  - `DependencyGraph`: May be removed if `internalDependencyGraph` is removed from `ProjectContext`.
- Ensure `PackageJsonMinimal` and `CodeInsights` (with its `ImportInfo` containing `isExternal`) remain as previously defined.

**Implementation Details**:
Focus on creating the leanest possible `ProjectContext` that still provides `techStack`, `packageJson` for external dependencies, and comprehensive `codeInsights`.

```typescript
// src/core/analysis/types.ts (Illustrative changes for extreme minimization)
export interface ProjectStructureMinimal {
  // Example if ProjectStructure is kept minimal
  rootDir: string; // This might be the only essential part of ProjectStructure
  // sourceDir and testDir might be derived or less emphasized if not easily available without full tree scan
}

export interface ProjectContext {
  projectRootPath: string; // Explicit root path, might replace ProjectStructure.rootDir
  techStack: TechStackAnalysis;
  packageJson: PackageJsonMinimal; // SSoT for external dependencies
  codeInsights: { [filePath: string]: CodeInsights }; // filePath is relative to projectRootPath; SSoT for file content summaries and internal import links
  // structure field might be removed or replaced by ProjectStructureMinimal if that's kept.
  // internalDependencyGraph field is removed.
}
```

**Testing Requirements**: (All automated testing deferred)

- N/A for this subtask directly.

**Related Acceptance Criteria**: AC1, AC2, AC3 (foundational changes for the new approach)

**Estimated effort**: 45 minutes

**Required Delegation Components**: N/A (Core architectural type change)

---

### Subtask 2: Update `ProjectAnalyzer` for Minimal Context (Round 2 Refactor)

**Status**: Not Started

**Description**: Modify `src/core/analysis/project-analyzer.ts` to populate only the minimal `ProjectContext` fields. Remove logic for building `directoryTree` and `internalDependencyGraph`.

**Files to Modify**:

- `src/core/analysis/project-analyzer.ts`:
  - Remove calls and logic related to `StructureHelpers.generateDirectoryTree`.
  - Remove calls and logic related to `DirectoryNodeTagger` (this service might be removed entirely).
  - Remove calls and logic related to `deriveInternalDependencies` for populating `internalDependencyGraph`.
  - Ensure `projectContext.projectRootPath` (or a similar top-level field if `ProjectStructure` is removed) is set.
  - Ensure `packageJson` and `codeInsights` are populated as before.
- `src/core/analysis/directory-node-tagger.ts`: Likely to be removed.
- `src/core/analysis/dependency-helpers.ts`: `deriveInternalDependencies` might be kept if it's to be used by consumers on-demand (e.g., via a helper in `project-context.utils.ts`), or removed if consumers/LLMs infer directly.

**Implementation Details**:
Streamline `ProjectAnalyzer` to focus only on `techStack`, `packageJson`, `codeInsights`, and basic root path information. The `ProjectStructure` field in `ProjectContext` might be removed or simplified to just `projectRootPath` at the top level of `ProjectContext`.

**Testing Requirements**: (All automated testing deferred)

- N/A for this subtask directly.

**Related Acceptance Criteria**: AC1, AC2, AC3

**Estimated effort**: 1.5 hours

**Required Delegation Components**:

- Implementation components for Junior Coder:
  - Removing `DirectoryNodeTagger` integration and `directoryTree` generation logic from `ProjectAnalyzer`.
  - Removing `internalDependencyGraph` population logic.
- Testing components for Junior Tester: DEFERRED.

**Delegation Success Criteria**:

- Junior Coder successfully removes the specified logic from `ProjectAnalyzer`.

---

### Subtask 3: Update Consumers for Minimal Context (Round 2 Refactor)

**Status**: Not Started

**Description**: Update all services, generators, and helper functions that consume `ProjectContext` to work with the minimal structure, deriving information from `codeInsights` and `packageJson` as needed.

**Files to Modify**:

- `src/core/analysis/json-schema-helper.ts`: Update Zod schema for `ProjectContext`.
- `src/core/analysis/response-parser.ts`: Update defaulting logic.
- `src/core/analysis/project-context.utils.ts`: Rewrite or remove helper functions.
  - `getAllFilesWithTag`, `getConfigFiles`, `getEntryPointFiles` will need to operate on `Object.keys(projectContext.codeInsights)` and use path pattern matching for tags (if this tagging concept is preserved outside `DirectoryNode`).
  - `getInternalDependenciesForFile` will need to process `projectContext.codeInsights[filePath].imports`.
- `src/generators/*`: All generator files.
- `src/memory-bank/*`: All memory bank files.
- Any other identified consumers.

**Implementation Details**:
This is the most extensive part. Each consumer needs to be analyzed.

- For lists of files (e.g., config, entry points): Iterate `Object.keys(projectContext.codeInsights)` and apply path/name patterns. The concept of 'tags' might need to be re-thought if not on `DirectoryNode`.
- For internal dependencies: Process `projectContext.codeInsights[filePath].imports`.
- Prompt Engineering: Review prompts for LLMs. If they relied on `directoryTree` or `internalDependencyGraph` structure, update them to guide the LLM to infer this from `codeInsights` and file paths. This might involve providing clearer instructions or examples to the LLM.

**Testing Requirements**: (All automated testing deferred)

- N/A for this subtask directly.

**Related Acceptance Criteria**: AC4

**Estimated effort**: 4-6 hours (high due to broad impact)

**Required Delegation Components**:

- Implementation components for Junior Coder:
  - Rewriting specific helper functions in `project-context.utils.ts` based on new specifications (to use `codeInsights`).
  - Updating specific, well-defined consumers if the adaptation logic is straightforward (e.g., changing a field access to call a new helper).
- Testing components for Junior Tester: DEFERRED.

**Delegation Success Criteria**:

- Junior Coder successfully implements new helper logic and updates simpler consumers.

---

### Subtask 4: Manual CLI Testing and Verification (Round 2 Refactor)

**Status**: Not Started

**Description**: Perform manual end-to-end testing of key CLI commands with the radically minimized `ProjectContext`.

**Files to Modify**: None, unless minor fixes identified.

**Implementation Details**:

- Build the application: `npm run build`.
- Execute key CLI commands (e.g., `npm start -- generate -- -g memory-bank`).
- Focus on whether the LLM, provided with the leaner context (primarily `codeInsights`), can still generate coherent and correct outputs for Memory Bank, etc.
- Verify that information previously explicit (like full directory structure or explicit internal dependency lists) is either correctly inferred by the LLM or that its absence does not critically degrade output quality for the tested generators.
- Document findings, especially regarding the quality of LLM-generated content.

**Testing Requirements**:

- Manual execution and verification.
- Close scrutiny of LLM-generated outputs for fidelity.

**Related Acceptance Criteria**: AC4, AC7, AC8

**Estimated effort**: 2.5 hours

**Required Delegation Components**:

- Testing components for Junior Tester:
  - Assist in executing commands and meticulously documenting outputs, especially LLM-generated content.

**Delegation Success Criteria**:

- Junior Tester provides detailed and accurate records of CLI outputs.

## 5. Implementation Sequence (Revised)

1.  **Subtask 1: Define Minimal `ProjectContext` Types (Round 2 Refactor)**
2.  **Subtask 2: Update `ProjectAnalyzer` for Minimal Context (Round 2 Refactor)**
3.  **Subtask 3: Update Consumers for Minimal Context (Round 2 Refactor)**
4.  **Subtask 4: Manual CLI Testing and Verification (Round 2 Refactor)**

## 6. Testing Strategy (Revised Focus)

- **Manual CLI Testing (Primary Verification for this Task)**:
  - Focus on the ability of LLMs to work effectively with the minimized `ProjectContext` (primarily `codeInsights` and `packageJson`).
  - Assess the quality and correctness of generated outputs.
- **Unit and Integration Tests (DEFERRED)**:
  - All automated testing is deferred to a subsequent dedicated task. This includes tests for any new/modified helper functions and updates to existing consumer tests.

This revised plan aims for a significantly leaner `ProjectContext`, placing more reliance on `codeInsights` and LLM inference.
