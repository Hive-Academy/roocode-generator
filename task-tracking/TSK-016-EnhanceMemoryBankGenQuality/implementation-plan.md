---
title: Implementation Plan
type: template
category: implementation
status: active
taskId: TSK-016
---

## 1. Overview

This plan details the implementation steps to enhance the quality of generated memory bank documents (`ProjectOverview.md`, `TechnicalArchitecture.md`, `DeveloperGuide.md`) for **TSK-016**. The core goal is to refactor the `MemoryBankContentGenerator` to intelligently leverage structured `codeInsights` data from the `ProjectContext` and incorporate updated template structures based on the findings in `task-tracking/TSK-016-EnhanceMemoryBankGenQuality/research/research-report.md`. This will involve updating the base templates and refining prompt engineering techniques to produce more detailed, accurate, and context-aware documentation, moving away from passing the entire context as a raw JSON string.

See [[task-description#Detailed Requirements]] and [[task-description#Acceptance Criteria Checklist]] for detailed requirements and acceptance criteria.

# Implementation Plan: TSK-016/EnhanceMemoryBankGenQuality

## 2. Implementation Strategy

### 2.1. Approach

The implementation will follow a two-phase approach:

1.  **Template Update**: First, update the base memory bank templates (`templates/memory-bank/*.md`) according to the structures recommended in the research report. This includes adding standard documentation sections and embedding LLM guidance using `<!-- LLM: ... -->` comments that reference specific `codeInsights` fields.
2.  **Generator Refactoring & Prompt Engineering**: Second, refactor the `MemoryBankContentGenerator` and related components:
    - Modify `MemoryBankOrchestrator` to pass the structured `ProjectContext` object (instead of a serialized string) to the generator.
    - Update `MemoryBankContentGenerator` to accept the `ProjectContext` object.
    - Implement new prompt engineering logic within `MemoryBankContentGenerator` that utilizes the structured `codeInsights` data and the instructions embedded within the updated templates (`<!-- LLM: ... -->` comments) to generate content for each specific file type.
    - Ensure the generated content adheres strictly to the updated template structure.

### 2.2. Key Components

- **Affected Areas**:
  - `templates/memory-bank/ProjectOverview-template.md`
  - `templates/memory-bank/TechnicalArchitecture-template.md`
  - `templates/memory-bank/DeveloperGuide-template.md`
  - `src/memory-bank/memory-bank-content-generator.ts` (Primary logic change)
  - `src/memory-bank/memory-bank-orchestrator.ts` (Minor change to pass structured context)
  - `src/memory-bank/interfaces/content-generator.interface.ts` (Update method signature)
  - `src/memory-bank/prompt-builder.ts` & `src/memory-bank/interfaces/prompt-builder.interface.ts` (Potential extension if needed)
  - Unit tests for `MemoryBankContentGenerator`.
- **Dependencies**:
  - `ProjectAnalyzer` (Provides `ProjectContext` with `codeInsights`).
  - `LLMAgent` (Executes LLM calls).
  - `MemoryBankTemplateProcessor` (Loads templates).
- **Risk Areas**:
  - **LLM Reliability**: Ensuring the LLM consistently follows the embedded `<!-- LLM: ... -->` instructions and accurately uses the provided `codeInsights` data without hallucination or deviation. Requires careful prompt design and testing.
  - **Prompt Complexity**: More detailed prompts might increase token usage or latency.
  - **Template Adherence**: Ensuring the LLM output strictly maintains the Markdown structure of the updated templates.
  - **`codeInsights` Variability**: Handling cases where `codeInsights` might be incomplete or structured differently than expected.

## 3. Template Update Strategy (Based on Research Report)

Update the following templates based _exactly_ on the structures provided in the "Recommended Template Structures" section of the research report (`task-tracking/TSK-016-EnhanceMemoryBankGenQuality/research/research-report.md`).

- **`templates/memory-bank/ProjectOverview-template.md`**: Implement the structure covering Introduction, Goals, Scope, Target Users, Key Features, Stakeholders, and Glossary, using `<!-- LLM: ... -->` comments referencing `codeInsights.projectInfo` and `codeInsights.components`.
- **`templates/memory-bank/TechnicalArchitecture-template.md`**: Implement the structure covering Introduction, Goals/Constraints, System Overview (Logical View), Technology Stack, Data Design, Code Structure (Development View), ADRs, Interfaces, Security, and Deployment, using `<!-- LLM: ... -->` comments referencing various `codeInsights` fields (`architecture`, `dependencies`, `buildTools`, `components`, `directoryStructure`).
- **`templates/memory-bank/DeveloperGuide-template.md`**: Implement the structure covering Introduction, Getting Started (Setup, Install, Config, Verify), Project Structure, Development Workflow (Scripts, Branching, Changes, PRs, Debugging), Coding Standards, Testing, Build/Deployment, Key Libraries/Concepts, Troubleshooting, Contributions, and Resources/Contacts, using `<!-- LLM: ... -->` comments referencing `codeInsights`, `package.json` data, and general project knowledge.

**Verification**: Manually review updated templates against the research report specifications.

## 4. Generator Refactoring Strategy

1.  **Update Interface**: Modify `IMemoryBankContentGenerator` (`src/memory-bank/interfaces/content-generator.interface.ts`) `generateContent` method signature to accept `context: ProjectContext` instead of `contextStr: string`.
2.  **Update Orchestrator**: Modify `MemoryBankOrchestrator.orchestrateGeneration` (`src/memory-bank/memory-bank-orchestrator.ts`) to pass the `projectContext` object directly to `contentGenerator.generateContent`, removing the serialization step.
3.  **Refactor Content Generator**: Modify `MemoryBankContentGenerator.generateContent` (`src/memory-bank/memory-bank-content-generator.ts`) to:
    - Accept the `ProjectContext` object.
    - Remove internal parsing of a context string.
    - Call updated/new prompt building methods (`buildSystemPrompt`, `buildUserInstruction`) passing the structured `ProjectContext` and `templateContent`.
4.  **Refactor Prompt Building**: Modify `buildSystemPrompt` and `buildUserInstruction` (or create new helper methods):
    - These methods will now receive the `ProjectContext` object.
    - Construct prompts tailored to the `fileType`.
    - The user instruction prompt must clearly state the goal (populate the template), reference the use of `codeInsights`, and instruct the LLM to follow the `<!-- LLM: ... -->` comments within the provided `templateContent`.
    - Selectively include relevant parts of `codeInsights` (e.g., `overallSummary`, `keyComponents`, specific `detailedAnalysis` sections) formatted clearly within the prompt (e.g., as JSON snippets or key-value pairs) alongside the `templateContent`. Avoid sending the _entire_ `codeInsights` object if not needed for a specific file type.
5.  **Prompt Builder Enhancement (If Needed)**: Evaluate if the existing `IPromptBuilder` (`src/memory-bank/prompt-builder.ts`) needs new methods to facilitate embedding structured data alongside the template content in the final prompt. If the current `buildPrompt` (taking strings) is sufficient by pre-formatting the context data into the instruction string, no changes are needed. Otherwise, add a method like `buildPromptWithStructuredContext`.

## 5. Prompt Engineering Strategy

For each `MemoryBankFileType`, the `MemoryBankContentGenerator` will construct prompts as follows:

- **System Prompt**: Define the LLM's role (e.g., "You are an expert technical writer specializing in software documentation. Your task is to populate the provided Markdown template using the given project analysis data (`codeInsights`). Follow the instructions embedded in HTML comments (`<!-- LLM: ... -->`) precisely.").
- **User Prompt Structure**:

  1.  **Instruction**: Clearly state the goal for the specific file type (e.g., "Generate the Project Overview document."). Explain that `codeInsights` data is provided and must be used as directed by the `<!-- LLM: ... -->` comments in the template. Emphasize adherence to the template structure.
  2.  **`codeInsights` Data**: Include the relevant sections of the `codeInsights` object, formatted clearly (e.g., labeled JSON snippets). Only include data relevant to the specific `fileType` being generated.
      - _Example for ProjectOverview_: Include `overallSummary`, `keyComponents` (name, summary).
      - _Example for TechnicalArchitecture_: Include `keyComponents` (name, summary, dependencies), relevant `detailedAnalysis` summaries, `technologyStack`.
      - _Example for DeveloperGuide_: Include relevant `detailedAnalysis` (functions, classes), `packageJson` scripts, setup info.
  3.  **Template Content**: Include the full content of the updated template file (`ProjectOverview-template.md`, etc.) containing the `<!-- LLM: ... -->` comments.

- **LLM Guidance Example (within prompt)**: "Use the `keyComponents` array from the provided `codeInsights` data to populate the 'Key Components' section of the template, following the instructions in the `<!-- LLM: ... -->` comment within that section."

## 6. Subtask Breakdown & Delegation

The implementation will be broken down into the following sequenced subtasks:

### 1. Update Memory Bank Templates

**Status**: Completed

**Description**: Update the three core memory bank template files (`ProjectOverview-template.md`, `TechnicalArchitecture-template.md`, `DeveloperGuide-template.md`) based on the detailed structures and LLM guidance comments provided in the research report (`task-tracking/TSK-016-EnhanceMemoryBankGenQuality/research/research-report.md`).

**Files to Modify**:

- `templates/memory-bank/ProjectOverview-template.md`
- `templates/memory-bank/TechnicalArchitecture-template.md`
- `templates/memory-bank/DeveloperGuide-template.md`

**Implementation Details**:
Copy the exact Markdown content, including headings, sections, and `<!-- LLM: ... -->` comments, from the "Recommended Template Structures" section of the research report into the corresponding template files.

**Testing Requirements**:

- Manually inspect each updated template file to ensure it exactly matches the content provided in the research report.

**Related Acceptance Criteria**:

- AC5: Ensure the generated content adheres to the structure defined by the corresponding base template. (This subtask prepares the templates for AC5).

**Estimated effort**: 15-30 minutes

**Required Delegation Components**:

- Implementation components for Junior Coder:
  - Update `ProjectOverview-template.md` with content from research report.
  - Update `TechnicalArchitecture-template.md` with content from research report.
  - Update `DeveloperGuide-template.md` with content from research report.
- Testing components for Junior Tester:
  - Verify `ProjectOverview-template.md` matches research report content.
  - Verify `TechnicalArchitecture-template.md` matches research report content.
  - Verify `DeveloperGuide-template.md` matches research report content.

**Delegation Success Criteria**:

- Junior Coder components must result in the template files containing the exact content from the research report.
- Junior Tester components must confirm that the content of the updated template files is an exact match to the research report.
- Integration requirements: The updated template files must be correctly saved in the `templates/memory-bank/` directory.

### 2. Update Memory Bank Content Generator Interface and Orchestrator

**Status**: Completed

**Description**: Modify the `IMemoryBankContentGenerator` interface to accept the structured `ProjectContext` object and update the `MemoryBankOrchestrator` to pass this object directly to the generator, removing the old string serialization.

**Files to Modify**:

- `src/memory-bank/interfaces/content-generator.interface.ts`
- `src/memory-bank/memory-bank-orchestrator.ts`

**Implementation Details**:

- In `IMemoryBankContentGenerator`, change the `generateContent` method signature from `generateContent(fileType: MemoryBankFileType, contextStr: string, templateContent: string): Promise<string>;` to `generateContent(fileType: MemoryBankFileType, context: ProjectContext, templateContent: string): Promise<string>;`.
- In `MemoryBankOrchestrator.orchestrateGeneration`, locate the call to `contentGenerator.generateContent`. Remove the `JSON.stringify(projectContext)` step and pass the `projectContext` object directly.

**Testing Requirements**:

- Unit tests for `MemoryBankOrchestrator` should still pass, confirming the orchestrator correctly calls the generator with the updated signature.
- Code review to verify the interface and orchestrator changes.

**Related Acceptance Criteria**:

- AC1: The generator should _not_ serialize the entire `ProjectContext` into the LLM prompt string. (This subtask enables this by passing the object).

**Estimated effort**: 15-30 minutes

**Required Delegation Components**:

- Implementation components for Junior Coder:
  - Update `IMemoryBankContentGenerator` interface method signature.
  - Update `MemoryBankOrchestrator` to pass `ProjectContext` object.
- Testing components for Junior Tester:
  - Verify existing `MemoryBankOrchestrator` unit tests still pass after the change.

**Delegation Success Criteria**:

- Junior Coder components must result in the interface and orchestrator being updated as specified.
- Junior Tester components must confirm that the orchestrator still functions correctly by passing existing tests.
- Integration requirements: The interface change must be correctly reflected in the orchestrator's usage of the generator.

**Delegation Summary**:

- Interface update (`IMemoryBankContentGenerator`) delegated to Junior Coder: ✅ Completed.
- Orchestrator update (`MemoryBankOrchestrator`) delegated to Junior Coder: ✅ Completed after 1 redelegation.
  - Initial implementation failed tests due to incorrect path handling (using hardcoded path instead of configured `outputDir`).
  - Redelegated with specific instructions to fix path logic.
  - Revised implementation correctly uses configured `outputDir`.
- Test verification delegated to Junior Tester: ✅ Completed after 1 redelegation.
  - Initial verification correctly identified test failures due to path handling regression.
  - Re-verification confirmed tests passed after Junior Coder's revision.
- Integration: Changes integrated successfully, confirmed by passing unit tests.

**Acceptance Criteria Verification**:

- AC1 (No full context serialization): ✅ Satisfied by passing `ProjectContext` object directly. Verified by code review of `MemoryBankOrchestrator`.
- Testing Requirements (Orchestrator tests pass): ✅ Satisfied. Verified by Junior Tester confirming `tests/memory-bank/memory-bank-orchestrator.test.ts` passed after revision.

### 3. Refactor Memory Bank Content Generator Prompt Building Logic

**Status**: Completed

**Description**: Refactor the `MemoryBankContentGenerator` to accept the `ProjectContext` object and implement sophisticated prompt building logic that uses the structured `codeInsights` data and the `<!-- LLM: ... -->` comments in the template to construct targeted prompts for each file type.

**Files to Modify**:

- `src/memory-bank/memory-bank-content-generator.ts`
- `src/memory-bank/prompt-builder.ts` (Potentially, if new methods are needed)

**Implementation Details**:

- Update the `MemoryBankContentGenerator` class and its `generateContent` method to accept `ProjectContext`.
- Remove any code that previously parsed a context string.
- Modify or create new helper methods (e.g., `buildSystemPrompt`, `buildUserInstruction`, or dedicated methods per file type) that take `ProjectContext` and `templateContent` as input.
- Within these methods, implement logic to:
  - Construct a system prompt defining the LLM's role as a technical writer using `codeInsights` and templates.
  - Construct a user instruction that explains the task (populate template), references `codeInsights` usage, and emphasizes following `<!-- LLM: ... -->` comments.
  - Selectively extract relevant parts of `codeInsights` based on the `fileType` and format them clearly (e.g., as labeled JSON snippets) within the user prompt alongside the `templateContent`. Avoid sending the _entire_ `codeInsights` object if not needed for a specific file type.
  - Utilize the existing `IPromptBuilder` to combine the system prompt, user instruction (containing formatted `codeInsights` and template), into the final prompt for the LLM. If the existing `buildPrompt` is insufficient for embedding structured data effectively, add a new method to `PromptBuilder`.

**Testing Requirements**:

- Add new unit tests for `MemoryBankContentGenerator` specifically targeting the prompt building logic for each file type. These tests should verify that the generated prompts correctly include relevant `codeInsights` data and instructions based on the template comments.
- Manual inspection of generated prompts during development/testing.

**Related Acceptance Criteria**:

- AC1: The generator should _not_ serialize the entire `ProjectContext` into the LLM prompt string. (This subtask completes this by using the object and selective data inclusion).
- AC2, AC3, AC4: The generated content should reflect and incorporate `codeInsights` information relevant to each file type. (This subtask implements the prompt logic to achieve this).
- AC6: The generated content quality should be demonstrably higher. (This subtask implements the core logic for quality improvement).
- AC7: New tests covering the enhanced prompt logic should be added and pass.

**Estimated effort**: 1-2 hours

**Required Delegation Components**:

- Implementation components for Junior Coder:
  - Update `MemoryBankContentGenerator` to accept `ProjectContext`.
  - Implement prompt building logic for `ProjectOverview.md`.
  - Implement prompt building logic for `TechnicalArchitecture.md`.
  - Implement prompt building logic for `DeveloperGuide.md`.
  - (If necessary) Add new method to `PromptBuilder`.
- Testing components for Junior Tester:
  - Write unit tests for `ProjectOverview.md` prompt building.
  - Write unit tests for `TechnicalArchitecture.md` prompt building.
  - Write unit tests for `DeveloperGuide.md` prompt building.

**Delegation Success Criteria**:

- Junior Coder components must result in the generator correctly accepting `ProjectContext` and producing prompts that include relevant `codeInsights` and template instructions for each file type.
- Junior Tester components must result in comprehensive unit tests that verify the prompt building logic for all file types.
- Integration requirements: The refactored generator must correctly use the updated interface and the prompt builder (potentially with a new method).

**Delegation Summary**:

- Prompt building logic (`buildPrompts` method in `MemoryBankContentGenerator`) delegated to Junior Coder: ✅ Completed.
  - Initial implementation correctly handled prompt structure and context selection.
  - Addressed type discrepancies noted by Junior Coder (using `as any` for now, flagged for future type alignment).
  - Redelegation attempt #1 was unnecessary due to my review error; Junior Coder confirmed cleanup was already done.
- Unit testing (`buildPrompts` logic via `generateContent`) delegated to Junior Tester: ✅ Completed.
  - 5 tests implemented covering all file types and edge cases.
  - Tests verified system/user prompt structure, selective context inclusion/formatting, and exclusion of irrelevant data.
  - All tests passed.
- Integration: Changes integrated successfully. `MemoryBankContentGenerator` now uses `ProjectContext` and builds enhanced prompts. `IPromptBuilder` dependency removed.

**Acceptance Criteria Verification**:

- AC1 (No full context serialization): ✅ Satisfied by `buildPrompts` logic selectively formatting context. Verified by code review and Junior Tester's report on test assertions.
- AC2, AC3, AC4 (Content reflects context): ✅ Satisfied by `buildPrompts` including relevant, formatted context in the prompt for each file type. Verified by code review and Junior Tester's report on test assertions. (Final content check in Subtask 4).
- AC6 (Higher quality): ✅ Satisfied by implementing the core logic change (structured context, template comments) designed for quality improvement. Verified by code review. (Final quality check in Subtask 4).
- AC7 (New tests pass): ✅ Satisfied. Verified by Junior Tester's report confirming 5 new tests pass.

### 4. Verify End-to-End Generation and Content Quality

**Status**: In Progress

**Description**: Run the end-to-end memory bank generation process on a sample project and manually verify that the generated files are produced without errors, adhere to the updated template structures, and demonstrate significantly improved content quality based on the `codeInsights` data, satisfying all acceptance criteria.

**Files to Modify**: None (Verification step)

**Implementation Details**:

- Run the `AiMagicGenerator` with the `--generatorType memory-bank` flag on a project with generated `codeInsights`.
- Check for any errors during the generation process.
- Manually open and review the generated `ProjectOverview.md`, `TechnicalArchitecture.md`, and `DeveloperGuide.md` files.
- Compare the structure of the generated files against the updated templates to ensure adherence (AC5).
- Compare the content of the generated files against the input `codeInsights` data to verify that the relevant information has been incorporated accurately and in detail (AC2, AC3, AC4).
- Compare the quality of the generated content to output from the previous generator implementation (if available) to demonstrate improvement (AC6).
- Verify that all other acceptance criteria (AC1, AC7, AC8, AC9) have been met through code review and automated tests.

**Testing Requirements**:

- Manual execution of the generator CLI command.
- Manual inspection and comparison of generated output.

**Related Acceptance Criteria**:

- AC2, AC3, AC4: Verify content reflects `codeInsights`.
- AC5: Verify adherence to template structure.
- AC6: Verify demonstrable quality improvement.
- AC8: Verify end-to-end process completes without errors.

**Estimated effort**: 30-60 minutes

**Required Delegation Components**:

- Testing components for Junior Tester:
  - Execute the end-to-end generation command on a sample project.
  - Perform manual verification of generated files against updated templates and input `codeInsights` for all acceptance criteria (AC2, AC3, AC4, AC5, AC6, AC8).
  - Document findings and verification status for each criterion.

**Delegation Success Criteria**:

- Junior Tester components must result in a clear report confirming that the end-to-end generation process is successful and that the generated files meet the quality and structure requirements outlined in the acceptance criteria.
- Integration requirements: This step verifies the successful integration of all previous subtasks.

## 7. Testing Strategy

The testing strategy will involve a combination of unit tests and manual verification:

- **Unit Tests**:
  - Existing unit tests for `MemoryBankOrchestrator` will be run to ensure the change in passing `ProjectContext` does not break existing functionality.
  - New unit tests will be added for `MemoryBankContentGenerator` to specifically test the new prompt building logic for each memory bank file type. These tests will mock the `ProjectContext` with `codeInsights` data and verify that the generated prompts correctly incorporate this data and reference the template instructions. (Addresses AC7).
- **Manual Verification**:
  - Manual inspection of the updated template files to ensure they match the research report.
  - Manual execution of the end-to-end memory bank generation process on a sample project.
  - Manual inspection and comparison of the generated output files against the updated templates and the input `codeInsights` to verify content accuracy, structure adherence, and demonstrable quality improvement. (Addresses AC2, AC3, AC4, AC5, AC6, AC8).
- **Code Review**:
  - Code review will be used to verify adherence to coding standards and the correct implementation of the logic, including the interface changes and prompt building (Addresses AC1, AC9).

## 8. Implementation Sequence

1.  Update Memory Bank Templates (Subtask 1) - Prepare the target templates with the new structure and LLM guidance.
2.  Update Memory Bank Content Generator Interface and Orchestrator (Subtask 2) - Modify the data flow to pass the structured context object.
3.  Refactor Memory Bank Content Generator Prompt Building Logic (Subtask 3) - Implement the core logic to use the structured context and templates for prompt generation.
4.  Verify End-to-End Generation and Content Quality (Subtask 4) - Confirm the entire process works and the output meets quality standards and acceptance criteria.

## 9. Implementation Checklist

- [x] Requirements reviewed (TSK-016 Task Description)
- [x] Architecture reviewed (Implicit in understanding generator flow)
- [x] Dependencies checked (ProjectAnalyzer, LLMAgent, TemplateProcessor)
- [x] Research report findings incorporated into plan (Template structures, Prompt guidance)
- [x] Template Update Strategy defined
- [x] Generator Refactoring Strategy defined
- [x] Prompt Engineering Strategy defined
- [x] Subtask breakdown complete
- [x] Delegation components identified for subtasks
- [x] Testing Strategy defined
- [ ] Documentation planned (Implicit in memory bank generation itself)
