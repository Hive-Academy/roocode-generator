# Task Description: TSK-016 - Enhance Memory Bank Generator Content Quality

## 1. Task Overview

**Goal**: Significantly improve the quality and detail of automatically generated memory bank documents (`ProjectOverview.md`, `TechnicalArchitecture.md`, `DeveloperGuide.md`) by intelligently leveraging the structured `codeInsights` data available within the `ProjectContext`.

**Current State**: The `MemoryBankContentGenerator` currently passes the entire serialized `ProjectContext` (including `codeInsights`) as a raw JSON string within the LLM prompt. This leads to generic and often superficial documentation that doesn't fully utilize the rich analysis data.

**Desired State**: The generator should produce documentation comparable in quality to manually written examples by using targeted prompt engineering that specifically instructs the LLM on how to interpret and utilize the `codeInsights` (e.g., function summaries, component interactions, dependency analysis) for each specific memory bank file type.

**Business Context**: High-quality, up-to-date memory bank documentation is crucial for onboarding new developers, maintaining architectural consistency, and facilitating efficient development. Automating this with high fidelity saves significant manual effort.

**Task Categorization**: Enhancement / Refactoring
**Priority**: High (Directly impacts core value proposition of the generator)

## 2. Current Implementation Analysis

*   **Entry Point**: `AiMagicGenerator` (`src/generators/ai-magic-generator.ts`) receives the `--generatorType memory-bank` flag.
*   **Analysis**: It calls `ProjectAnalyzer` to get the `ProjectContext`.
*   **Delegation 1**: It calls `MemoryBankService.generateMemoryBank` (`src/memory-bank/memory-bank-service.ts`), passing the `ProjectContext`.
*   **Delegation 2**: `MemoryBankService` calls `MemoryBankOrchestrator.orchestrateGeneration` (`src/memory-bank/memory-bank-orchestrator.ts`), passing the `ProjectContext`.
*   **Orchestration**: `MemoryBankOrchestrator` iterates through `MemoryBankFileType` enum values.
    *   Loads the relevant template using `IMemoryBankTemplateProcessor`.
    *   Serializes the *entire* `ProjectContext` into a JSON string.
    *   **Delegation 3 (Core Logic)**: Calls `IMemoryBankContentGenerator.generateContent` (`src/memory-bank/memory-bank-content-generator.ts`), passing the file type, the serialized context string, and the template.
    *   Writes the result using `IMemoryBankFileManager`.
*   **Content Generation (`MemoryBankContentGenerator`)**:
    *   Builds a generic system prompt based on `fileType`.
    *   Builds a generic user instruction based on `fileType`.
    *   Uses `IPromptBuilder` to combine the instruction, the *entire serialized context string*, and the template into the final user prompt.
    *   Calls `LLMAgent.getCompletion`.
    *   Strips markdown from the response.

**Key Files to Modify**:

*   `src/memory-bank/memory-bank-content-generator.ts`: This is the primary file requiring refactoring. The `generateContent`, `buildSystemPrompt`, and `buildUserInstruction` methods need significant updates.
*   `src/memory-bank/interfaces/prompt-builder.interface.ts` & implementation (`src/memory-bank/prompt-builder.ts`): May need adjustments or new methods to support more sophisticated prompt construction using structured data instead of just strings.
*   Potentially `src/memory-bank/memory-bank-orchestrator.ts`: If the way context is passed to the content generator needs to change (e.g., passing the structured `ProjectContext` object instead of a string).

**Relevant `ProjectContext` Structure (Focus on `codeInsights`)**:
(Based on TSK-013 completion)
```typescript
interface ProjectContext {
  // ... other properties like fileList, dependencies ...
  codeInsights?: CodeInsights; // Added in TSK-013
}

interface CodeInsights {
  language: string;
  overallSummary: string; // High-level summary from LLM
  keyComponents: { // Identified key components/modules
    name: string;
    summary: string;
    dependencies: string[];
  }[];
  detailedAnalysis: { // File-level analysis
    filePath: string;
    summary: string;
    definedFunctions: { name: string; signature: string; summary: string }[];
    definedClasses: { name: string; methods: string[]; properties: string[]; summary: string }[];
    imports: string[];
    exports: string[];
  }[];
}
```

## 3. Component Structure (Conceptual)

The core change involves enhancing the `MemoryBankContentGenerator`'s interaction with the `ProjectContext` and `LLMAgent`.

*   **Input**: `ProjectContext` (structured object), `MemoryBankFileType`, Template Content (string).
*   **Processing**:
    *   Instead of serializing the whole context, extract relevant parts, especially from `codeInsights`.
    *   Construct highly specific system and user prompts for the given `fileType`, instructing the LLM on how to use the extracted `codeInsights` data (e.g., "Summarize the project's purpose using the `overallSummary` and `keyComponents`", "Describe the architecture using `keyComponents` and their `dependencies`", "Document functions listed in `detailedAnalysis.definedFunctions` for the Developer Guide").
*   **Output**: High-quality markdown content for the specific memory bank file.

## 4. Detailed Requirements

1.  **Refactor `MemoryBankContentGenerator`**: Modify the `generateContent` method and its helpers (`buildSystemPrompt`, `buildUserInstruction`).
2.  **Utilize Structured Context**: The generator must directly access and utilize the structured `ProjectContext` object, particularly the `codeInsights` data, rather than relying on a simple string serialization.
3.  **Enhanced Prompt Engineering**: Implement significantly improved prompt engineering techniques for each `MemoryBankFileType`:
    *   **ProjectOverview**: Prompts should guide the LLM to use `codeInsights.overallSummary`, `codeInsights.keyComponents` (names and summaries), and potentially high-level dependency information to generate a meaningful overview.
    *   **TechnicalArchitecture**: Prompts should guide the LLM to use `codeInsights.keyComponents` (dependencies), `codeInsights.detailedAnalysis` (imports/exports, class/function summaries) to describe components, interactions, and data flow.
    *   **DeveloperGuide**: Prompts should guide the LLM to use `codeInsights.detailedAnalysis` (function/class details, file summaries) to generate setup instructions, code structure explanations, and API documentation snippets.
4.  **Contextual Relevance**: Ensure the generated content for each file type is relevant and directly derived from the provided `codeInsights` and other relevant `ProjectContext` fields.
5.  **Maintain Template Structure**: The generated content must still adhere to the structure defined by the input templates. The LLM should fill in the template sections using the context.
6.  **Configuration**: Consider if any new configuration options are needed in `ProjectConfig` (e.g., controlling the depth of analysis used in prompts), though initially aim for automatic improvement.
7.  **Error Handling**: Maintain robust error handling for LLM failures or unexpected context data.
8.  **Testing**: Add/update unit tests for `MemoryBankContentGenerator` focusing on the new prompt generation logic. Integration tests might be needed to verify the end-to-end flow with realistic `codeInsights`.

## 5. Acceptance Criteria Checklist

| #   | Criterion                                                                                                                                                              | Verification Method                                                                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | **Given** the `AiMagicGenerator` is run with `--generatorType memory-bank` <br> **When** the `MemoryBankContentGenerator` receives `ProjectContext` with `codeInsights` <br> **Then** it should *not* serialize the entire `ProjectContext` into the LLM prompt string. | Code Review: Verify `MemoryBankContentGenerator` and `PromptBuilder` usage; check LLM call inputs.                                                |
| AC2 | **Given** `MemoryBankContentGenerator` is generating `ProjectOverview.md` <br> **When** `codeInsights` contains `overallSummary` and `keyComponents` <br> **Then** the generated overview content should clearly reflect and incorporate this information. | Manual Inspection: Generate `ProjectOverview.md` for a sample project and compare content against the input `codeInsights`.                       |
| AC3 | **Given** `MemoryBankContentGenerator` is generating `TechnicalArchitecture.md` <br> **When** `codeInsights` contains `keyComponents` with dependencies and `detailedAnalysis` <br> **Then** the generated architecture description should detail components and their relationships based on this data. | Manual Inspection: Generate `TechnicalArchitecture.md` and verify component descriptions and interactions align with `codeInsights`.            |
| AC4 | **Given** `MemoryBankContentGenerator` is generating `DeveloperGuide.md` <br> **When** `codeInsights` contains `detailedAnalysis` with function/class summaries <br> **Then** the generated guide should include relevant setup/structure info and code summaries derived from this data. | Manual Inspection: Generate `DeveloperGuide.md` and verify content (e.g., function list, setup steps) reflects `codeInsights`.                 |
| AC5 | **Given** any memory bank file generation <br> **When** the LLM generates content <br> **Then** the final output file should still adhere to the structure defined by the corresponding base template (`templates/memory-bank/...-template.md`). | Manual Inspection: Compare the structure (headings, sections) of generated files against the base templates.                                    |
| AC6 | **Given** the refactored `MemoryBankContentGenerator` <br> **When** generating any memory bank file <br> **Then** the generated content quality should be demonstrably higher (more detailed, specific, and accurate) compared to the previous implementation using the same `ProjectContext`. | Manual Comparison: Generate files using both old (pre-TSK-016) and new code for the same project context and compare quality side-by-side. |
| AC7 | **Given** the changes in `MemoryBankContentGenerator` <br> **When** running unit tests <br> **Then** all existing relevant tests should pass, and new tests covering the enhanced prompt logic should be added and pass. | Automated Testing: Run `npm test` (or equivalent) and verify test results for `memory-bank-content-generator.test.ts`.                          |
| AC8 | **Given** the end-to-end memory bank generation process <br> **When** run on a sample project <br> **Then** the process should complete without errors and produce all three memory bank files. | Manual Execution: Run the generator CLI command for `memory-bank` on a test project and check for errors and output files.                    |
| AC9 | **Given** the refactoring <br> **When** reviewing the code <br> **Then** the code should follow existing project coding standards (ESLint, Prettier) and include necessary comments for the new logic. | Code Review: Static analysis tools pass; manual review confirms clarity and adherence to standards.                                           |

## 6. Implementation Guidance

*   Focus modifications primarily within `src/memory-bank/memory-bank-content-generator.ts`.
*   Decide whether to pass the structured `ProjectContext` object to `generateContent` or keep the string and parse it inside. Passing the object is likely cleaner. This might require a minor change in `MemoryBankOrchestrator`.
*   Develop specific prompt strategies for each file type (`ProjectOverview`, `TechnicalArchitecture`, `DeveloperGuide`) that explicitly reference and instruct the LLM on using fields within `codeInsights`.
*   Consider using few-shot prompting (providing examples within the prompt) if simple instructions are insufficient, although this increases prompt size.
*   Leverage the existing `IPromptBuilder` if possible, potentially extending it if new prompt structures are needed.
*   Ensure the prompts clearly instruct the LLM to use the provided template structure.
*   Test with diverse `ProjectContext` examples (small/large projects, different languages if applicable) to ensure robustness.

## 7. File and Component References

*   `src/memory-bank/memory-bank-content-generator.ts` (Primary target)
*   `src/memory-bank/memory-bank-orchestrator.ts` (Potential minor change)
*   `src/memory-bank/prompt-builder.ts` (Potential extension)
*   `src/memory-bank/interfaces/*.interface.ts` (Interface changes if needed)
*   `src/core/analysis/types.ts` (Reference for `ProjectContext` and `CodeInsights` structure)
*   `templates/memory-bank/*-template.md` (Reference for output structure)
