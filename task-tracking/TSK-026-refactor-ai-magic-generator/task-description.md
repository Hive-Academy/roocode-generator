# Task Description: Refactor AI Magic Generator Options and Flow (Revised Architecture)

## 0. Task Information

- **Task ID**: TSK-026
- **Task Name**: Refactor AI Magic Generator Options and Flow (Revised Architecture)
- **Branch**: `feature/TSK-026-refactor-ai-magic-generator`

## 1. Task Overview

The current AI Magic generator (`ai-magic`) supports three types of generation: `memory-bank`, `roo`, and `cursor`. This task aims to refactor this generator to simplify user options and streamline the generation process, incorporating a revised architectural approach.

The existing `RoomodesGenerator` will be removed. Its core functionality for generating Roo rules will be extracted into a new `RoomodesService`.

The `ai-magic` generator will be modified to offer only two types: `roo` and `cursor`.
When the `roo` type is selected:

1.  The `memory-bank` generation logic will be executed first.
2.  Following successful memory-bank generation, the new `RoomodesService` will be invoked to generate the roo rules.
3.  Crucially, the project context analysis (performed by `IProjectAnalyzer`) must only occur once within `AiMagicGenerator`, and the resulting `ProjectContext` object must be passed to both the memory-bank generation step and the `RoomodesService` for roo rules generation.

The CLI command options for invoking the `ai-magic` generator will be updated to reflect these changes, removing `memory-bank` as a direct option and adjusting descriptions. These CLI changes will be made directly, without any deprecation mechanisms.

A review of the project's Dependency Injection (DI) and service creation patterns should inform the implementation of the new `RoomodesService`.

**All forms of automated testing (unit, integration, E2E) are explicitly out of scope for this task.**

## 2. Current Implementation Analysis

- **CLI Options**: Defined in [`src/core/cli/cli-interface.ts`](src/core/cli/cli-interface.ts). The `generate` command has a `-g, --generators <type>` option, currently described as for "memory-bank, roo, cursor". Validation for these types occurs within the `action` handler.
- **Generator Orchestration**: [`src/core/application/generator-orchestrator.ts`](src/core/application/generator-orchestrator.ts) handles the `generate` command. It loads project configuration and invokes the `AiMagicGenerator` (registered as `"ai-magic"`), passing the `generatorType` from the CLI options.
- **AI Magic Generator**: [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts) is the core component.
  - Its `executeGeneration` method receives the `generatorType`.
  - It calls `this.analyzeProject()` once at the beginning to get the `ProjectContext`.
  - A `switch` statement then routes to specific internal methods based on `generatorType`:
    - `generateMemoryBankContent(projectContext, options)` for `'memory-bank'`.
    - `generateRooContent(projectContext, options)` for `'roo'`.
    - `handleCursorGenerationPlaceholder(projectContext, options)` for `'cursor'`.
- **Roomodes Generator**: An existing `RoomodesGenerator` likely exists (e.g., in `src/generators/roomodes-generator.ts`) which contains the current logic for generating roo rules. This generator will be removed.
- **Project Analysis**: The `AiMagicGenerator` correctly calls `this.projectAnalyzer.analyzeProject()` only once per execution and reuses the `projectContext`. This existing behavior aligns with the requirement.

## 3. Component Structure

The primary files/components to be modified or created are:

- [`src/core/cli/cli-interface.ts`](src/core/cli/cli-interface.ts) (for CLI option changes)
- [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts) (for generation logic changes and integration of new service)
- **Remove**: The existing `RoomodesGenerator` file (e.g., `src/generators/roomodes-generator.ts`).
- **Create**: A new `RoomodesService` file (e.g., `src/core/services/roomodes-service.ts` or similar, following DI patterns).

## 4. Detailed Requirements

### 4.1. CLI Option Changes (in [`src/core/cli/cli-interface.ts`](src/core/cli/cli-interface.ts))

1.  **Modify Option Description**:
    - The description for the `-g, --generators <type>` option of the `generate` command must be updated.
    - Old description: "Specify which type of content to generate within ai-magic (memory-bank, roo, cursor)"
    - New description: "Specify which type of content to generate within ai-magic (roo, cursor)"
2.  **Modify Option Validation**:
    - The `allowedGeneratorTypes` array within the `generate` command's `action` handler must be updated.
    - Old: `['memory-bank', 'roo', 'cursor']`
    - New: `['roo', 'cursor']`

### 4.2. Remove Existing Roomodes Generator

1.  Identify and **remove** the file containing the `RoomodesGenerator` implementation (e.g., `src/generators/roomodes-generator.ts`).
2.  Ensure any references to `RoomodesGenerator` in DI configuration or other parts of the codebase are removed or updated.

### 4.3. Create and Implement Roomodes Service

1.  **Create a new service file** (e.g., `src/core/services/roomodes-service.ts`).
2.  **Define an interface** for the `RoomodesService` (e.g., `IRoomodesService`).
3.  **Move the core logic** for generating roo rules from the removed `RoomodesGenerator` into the new `RoomodesService`. This logic includes:
    - Reading mode template files.
    - Reading the `roo-rules.md` file.
    - Building mode-specific prompts (using `IRulesPromptBuilder`).
    - Interacting with the LLM (using `ILLMAgent`).
    - Processing LLM output (stripping markdown, parsing rules).
    - Writing the generated roo files (using `IFileOperations` or a helper like `RooFileOpsHelper`).
4.  Ensure the `RoomodesService` is designed to accept `ProjectContext` and `ProjectConfig` (or relevant parts of it) as input for its generation method(s).
5.  **Register the new `RoomodesService`** in the Dependency Injection container, following existing patterns.

### 4.4. AI Magic Generator Logic Changes (in [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts))

1.  **Inject the new `RoomodesService`** into the `AiMagicGenerator` constructor.
2.  **Modify `executeGeneration` method's `switch` statement**:
    - **`case 'roo'`**:
      - The logic for this case must be updated to first execute the memory bank generation.
      - Call `await this.generateMemoryBankContent(projectContext, options);`.
      - If the result of `generateMemoryBankContent` is an error, log the error and return `Result.err(error)`.
      - If successful, **invoke the new `RoomodesService`** to generate the roo content, passing the `projectContext` and `options`.
      - Return the result of the `RoomodesService` call.
    - **`case 'memory-bank'`**:
      - This case must be entirely removed from the `switch` statement. Direct generation of only memory-bank via the `ai-magic` generator's `generatorType` option will no longer be supported.
    - **`case 'cursor'`**:
      - This case should remain unchanged, continuing to call `this.handleCursorGenerationPlaceholder(projectContext, options);`.
    - **`default` case**:
      - This case should remain unchanged.
3.  **Remove the internal `generateRooContent` method** from `AiMagicGenerator` as its logic has been moved to `RoomodesService`.
4.  **Project Context Analysis**:
    - No change is needed here. The existing implementation in `executeGeneration` already calls `this.analyzeProject()` once and reuses the `projectContext`, which satisfies the requirement.

## 5. Acceptance Criteria Checklist

1.  **AC1 (CLI Option Description)**:
    - Given the CLI is invoked with `roocode-generator generate --help`.
    - When the help output is displayed.
    - Then the description for the `-g, --generators <type>` option must be "Specify which type of content to generate within ai-magic (roo, cursor)".
2.  **AC2 (CLI Option Validation - Valid 'roo')**:
    - Given the CLI is invoked with `roocode-generator generate -g roo`.
    - When the command is parsed.
    - Then the `generatorType` passed to `AiMagicGenerator` must be `'roo'`, and no validation error related to `generatorType` should occur in `CliInterface`.
3.  **AC3 (CLI Option Validation - Valid 'cursor')**:
    - Given the CLI is invoked with `roocode-generator generate -g cursor`.
    - When the command is parsed.
    - Then the `generatorType` passed to `AiMagicGenerator` must be `'cursor'`, and no validation error related to `generatorType` should occur in `CliInterface`.
4.  **AC4 (CLI Option Validation - Invalid 'memory-bank')**:
    - Given the CLI is invoked with `roocode-generator generate -g memory-bank`.
    - When the command is parsed.
    - Then an error message "Error: Invalid generator type specified: memory-bank. Allowed types are: roo, cursor" (or similar, reflecting the updated allowed types) must be displayed by `CliInterface`, and `AiMagicGenerator` execution should not proceed.
5.  **AC5 (Roo Generation Flow - Memory Bank First)**:
    - Given `generatorType` is `'roo'`.
    - When `AiMagicGenerator.executeGeneration()` is called.
    - Then the `generateMemoryBankContent` method must be called and awaited _before_ the new `RoomodesService`'s generation method is called.
6.  **AC6 (Roo Generation Flow - Shared Project Context)**:
    - Given `generatorType` is `'roo'`.
    - When `AiMagicGenerator.executeGeneration()` is called.
    - Then the `projectContext` object obtained from the single call to `this.analyzeProject()` must be the one passed as an argument to _both_ `generateMemoryBankContent` and the new `RoomodesService`'s generation method.
7.  **AC7 (Roo Generation Flow - Error Handling from Memory Bank)**:
    - Given `generatorType` is `'roo'`.
    - And `generateMemoryBankContent` returns an error.
    - When `AiMagicGenerator.executeGeneration()` is processed.
    - Then the new `RoomodesService`'s generation method must NOT be called, and `executeGeneration` must return the error from `generateMemoryBankContent`.
8.  **AC8 (Cursor Generation Flow - Unchanged)**:
    - Given `generatorType` is `'cursor'`.
    - When `AiMagicGenerator.executeGeneration()` is called.
    - Then the `handleCursorGenerationPlaceholder` method must be called, and the behavior should be consistent with the current placeholder implementation.
9.  **AC9 (No Direct Memory Bank Generation via AI Magic Type)**:
    - The `case 'memory-bank':` block must be removed from the `switch` statement in `AiMagicGenerator.executeGeneration()`.
10. **AC10 (RoomodesGenerator Removed)**:
    - The file containing the `RoomodesGenerator` implementation must be removed from the project.
11. **AC11 (RoomodesService Created and Used)**:
    - A new `RoomodesService` must be created containing the roo generation logic.
    - `AiMagicGenerator` must be updated to inject and use this new `RoomodesService` for the `roo` generation flow.
12. **AC12 (Testing Exclusion)**:
    - No new or modified automated tests (unit, integration, E2E) are required or implemented as part of this task. Verification will be through manual checks and code review.

## 6. Implementation Guidance

- **In [`src/core/cli/cli-interface.ts`](src/core/cli/cli-interface.ts)**:
  - Locate the `generateCommand.option(...)` call for `-g, --generators`. Update its description string.
  - Locate the `allowedGeneratorTypes` array in the `action` handler. Modify it to `['roo', 'cursor']`.
- **Remove `RoomodesGenerator`**:
  - Identify the file (likely `src/generators/roomodes-generator.ts`) and delete it.
  - Check DI configuration (e.g., in `src/core/di/container.ts` or similar) and remove the registration for `RoomodesGenerator`.
- **Create `RoomodesService`**:
  - Create a new file (e.g., `src/core/services/roomodes-service.ts`).
  - Create an interface (e.g., `src/core/services/interfaces.ts` or a new file like `src/core/services/roomodes-service.interfaces.ts`).
  - Move the logic from the old `RoomodesGenerator.generateRooContent` method into a method in the new `RoomodesService` (e.g., `generateRooRules(projectContext: ProjectContext, options: ProjectConfig): Promise<Result<string, Error>>`).
  - Inject necessary dependencies into `RoomodesService` (e.g., `ILLMAgent`, `IRulesPromptBuilder`, `IFileOperations`, `IContentProcessor`, `RooFileOpsHelper`, `ILogger`).
  - Register `RoomodesService` in the DI container.
- **In [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts)**:
  - Add injection for the new `IRoomodesService` in the constructor.
  - Remove the internal `generateRooContent` method.
  - Modify the `case 'roo':` block in `executeGeneration`:
    ```typescript
    // Inside case 'roo':
    const memoryBankResult = await this.generateMemoryBankContent(projectContext, options);
    if (memoryBankResult.isErr()) {
      this.logger.error('Memory bank generation failed during roo flow', memoryBankResult.error);
      return Result.err(memoryBankResult.error);
    }
    this.logger.info(
      'Memory bank generation successful during roo flow. Proceeding to Roo content generation via RoomodesService.'
    );
    // Call the new RoomodesService
    return this.roomodesService.generateRooRules(projectContext, options);
    ```
  - Delete the entire `case 'memory-bank':` block.

## 7. File and Component References

- **CLI Interface**: [`src/core/cli/cli-interface.ts`](src/core/cli/cli-interface.ts)
  - Option definition: Around line 37-40.
  - Option validation (`allowedGeneratorTypes`): Around line 46.
- **AI Magic Generator**: [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts)
  - `executeGeneration` method: Starts around line 60.
  - `analyzeProject` call: Around line 80.
  - `switch (generatorType)`: Around line 89.
  - Constructor (for injecting `IRoomodesService`).
- **Roomodes Generator (to be removed)**: Likely `src/generators/roomodes-generator.ts`.
- **Roomodes Service (to be created)**: E.g., `src/core/services/roomodes-service.ts`.
- **Roomodes Service Interface (to be created)**: E.g., `src/core/services/interfaces.ts` or `src/core/services/roomodes-service.interfaces.ts`.
- **Dependency Injection Container**: E.g., `src/core/di/container.ts` (for registering `RoomodesService` and removing `RoomodesGenerator`).
- **Generator Orchestrator**: [`src/core/application/generator-orchestrator.ts`](src/core/application/generator-orchestrator.ts) (for context on how `AiMagicGenerator` is called, but no changes expected here).
- **Memory Bank Service**: [`src/memory-bank/memory-bank-service.ts`](src/memory-bank/memory-bank-service.ts) (used by `AiMagicGenerator`, no changes expected here).
- **Project Analyzer Interface**: [`src/core/analysis/types.ts`](src/core/analysis/types.ts) (defines `IProjectAnalyzer` and `ProjectContext`, no changes expected here).
- **Rules Prompt Builder Interface**: `src/generators/rules/interfaces.ts` (used by the new `RoomodesService`).
- **LLM Agent**: `src/core/llm/llm-agent.ts` (used by the new `RoomodesService`).
- **File Operations Interface**: `src/core/file-operations/interfaces.ts` (used by the new `RoomodesService`).
- **Content Processor Interface**: `src/memory-bank/interfaces.ts` (used by the new `RoomodesService`).
- **Roo File Ops Helper**: `src/generators/roo-file-ops-helper.ts` (used by the new `RoomodesService`).
- **Logger Interface**: `src/core/services/logger-service.ts` (used by the new `RoomodesService`).
