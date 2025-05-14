# Implementation Plan: TSK-026 Refactor AI Magic Generator Options and Flow (Revised Architecture)

## Overview

This task involves refactoring the AI Magic Generator to streamline its options and internal flow, aligning with a revised architecture. The existing `RoomodesGenerator` will be removed, and its core logic will be extracted into a new `RoomodesService`. This new service will be integrated into the `AiMagicGenerator`'s `roo` generation path. The `AiMagicGenerator` will be updated to perform project analysis only once for the `roo` type, sharing the resulting `ProjectContext` between memory bank content generation and the new `RoomodesService`. The CLI interface will be updated to remove `memory-bank` as a direct option for the AI Magic generator and restrict options to `roo` and `cursor`. Automated testing is explicitly out of scope for this task.

Key implementation decisions will focus on the correct application of the project's Dependency Injection (DI) pattern for the new `RoomodesService` and ensuring the `ProjectContext` is correctly shared within the `AiMagicGenerator`.

Files to be modified:

- [`src/core/cli/cli-interface.ts`](src/core/cli/cli-interface.ts)
- [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts)
- [`src/generators/roomodes.generator.ts`](src/generators/roomodes.generator.ts) (to be removed)
- New file: `src/core/services/roomodes.service.ts`
- Potentially a new DI module file for the `RoomodesService`.

## Implementation Strategy

The implementation will proceed by first creating the new `RoomodesService` and migrating the relevant logic from the old generator. Then, the CLI interface will be updated to reflect the new valid generator types. Following that, the `AiMagicGenerator` will be modified to remove the direct `memory-bank` case, integrate the new `RoomodesService` for the `roo` flow, and ensure the `ProjectContext` is analyzed only once and shared. Finally, the old `RoomodesGenerator` file will be removed.

Design decisions:

- The `RoomodesService` will be a standard service following the `@core/di` pattern, injected into the `AiMagicGenerator`.
- The `ProjectContext` will be generated at the beginning of the `AiMagicGenerator`'s `generate` method when the `roo` type is selected and passed explicitly to the memory bank content generation and the new `RoomodesService` method.

Technical challenges:

- Ensuring correct DI setup for the new service.
- Properly handling and propagating errors from the memory bank content generation step in the `roo` flow.

## Acceptance Criteria Mapping

- AC1 (CLI Option Description): Modified in [`src/core/cli/cli-interface.ts`](src/core/cli/cli-interface.ts). Verified manually by checking the help output.
- AC2 (CLI Validation `generate -g roo`): Modified in [`src/core/cli/cli-interface.ts`](src/core/cli/cli-interface.ts). Verified manually by running the command.
- AC3 (CLI Validation `generate -g cursor`): Modified in [`src/core/cli/cli-interface.ts`](src/core/cli/cli-interface.ts). Verified manually by running the command.
- AC4 (CLI Validation `generate -g memory-bank` fails): Modified in [`src/core/cli/cli-interface.ts`](src/core/cli/cli-interface.ts). Verified manually by running the command and checking the error message.
- AC5 (`generateMemoryBankContent` called first): Modified in [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts). Verified by code review.
- AC6 (Shared `ProjectContext`): Modified in [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts). Verified by code review.
- AC7 (Error halts `roo` flow): Modified in [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts). Verified by code review.
- AC8 (`cursor` type unchanged): Verified by code review of [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts).
- AC9 (`case 'memory-bank':` removed): Modified in [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts). Verified by code review.
- AC10 (`RoomodesGenerator` removed): Verified by checking file system after removal.
- AC11 (`RoomodesService` created and used): Verified by checking file system and code review of [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts) and the new service file.
- AC12 (No automated tests): Verified by checking the `tests/` directory for any new or modified files related to this task.

## Implementation Subtasks

### 1. Create RoomodesService and Migrate Logic

**Status**: Completed

**Description**: Create the new `RoomodesService` class and migrate the core roo generation logic from the existing `RoomodesGenerator`. Ensure the service follows the project's DI patterns and is injectable.

**Files to Modify**:

- `src/core/services/roomodes.service.ts` - Create new service file.
- `src/generators/roomodes.generator.ts` - Copy logic from here.
- Potentially a new DI module file (e.g., `src/core/di/roomodes.module.ts`) and update `src/core/di/app.module.ts` to include it.

**Implementation Details**:

```typescript
// Example structure for the new service
import { Injectable } from '@core/di';
import { ProjectContext } from '@core/application/project-context';
import { LoggerService } from '@core/services/logger.service';
// Import other dependencies as needed

@Injectable()
export class RoomodesService {
  constructor(private readonly logger: LoggerService /* other dependencies */) {}

  public async generateRoo(context: ProjectContext): Promise<string> {
    this.logger.info('Generating roo content...');
    // Migrate logic from RoomodesGenerator here
    // Use the provided ProjectContext
    return 'Generated roo content'; // Replace with actual logic
  }
}
```

**Testing Requirements**:

- Manual verification of code structure and logic migration. (Automated testing is out of scope).

**Related Acceptance Criteria**:

- AC11 (`RoomodesService` created).

**Estimated effort**: 30-45 minutes

**Required Delegation Components**:

- None (Implementation is a single, cohesive unit).

**Delegation Success Criteria**:

- N/A

**Redelegation History**: N/A

### 2. Update CLI Interface

**Status**: Completed

**Description**: Modify the CLI interface definition to update the description for the `-g, --generators` option and update the validation logic to only accept `roo` and `cursor` as valid types for the `generate` command, causing `memory-bank` to fail validation.

**Files to Modify**:

- [`src/core/cli/cli-interface.ts`](src/core/cli/cli-interface.ts) - Update option description and validation.

**Implementation Details**:

```typescript
// Example changes in cli-interface.ts
// Update description for --generators option
.option('-g, --generators <type>', 'Specify the generator type (roo, cursor)', 'roo') // Update description

// Update validation logic for the 'generate' command
// Ensure only 'roo' and 'cursor' are allowed
// Add validation to throw an error for 'memory-bank'
```

**Testing Requirements**:

- Manual verification by running `node bin/cli.js generate --help` to check the description.
- Manual verification by running `node bin/cli.js generate -g roo`, `node bin/cli.js generate -g cursor`, and `node bin/cli.js generate -g memory-bank` to check validation success/failure and error messages.

**Related Acceptance Criteria**:

- AC1 (CLI Option Description updated).
- AC2 (CLI Validation `generate -g roo` passes).
- AC3 (CLI Validation `generate -g cursor` passes).
- AC4 (CLI Validation `generate -g memory-bank` fails).

**Estimated effort**: 15-30 minutes

**Required Delegation Components**:

- None.

**Delegation Success Criteria**:

- N/A

**Redelegation History**: N/A

**Progress Notes (2025-05-14)**:

- CLI option description (`-g, --generators`) updated in [`src/core/cli/cli-interface.ts`](src/core/cli/cli-interface.ts:1) to 'Specify the generator type (roo, cursor)' with default 'roo'.
- AC1 (CLI Option Description updated) verified via `node bin/roocode-generator.js generate --help`. The description correctly shows "(roo, cursor)".
- AC2 (CLI Validation `generate -g roo` passes) verified. The CLI accepts `roo` and attempts to run the generator.
- AC3 (CLI Validation `generate -g cursor` passes) verified. The CLI accepts `cursor` and attempts to run the generator.
- AC4 (CLI Validation `generate -g memory-bank` fails) verified. The CLI correctly rejects `memory-bank` with the error: "Error: Invalid generator type specified: memory-bank. Allowed types are: roo, cursor".
- All CLI-related acceptance criteria for this subtask are now fully verified.
- The previously noted runtime errors ("Failed to get LLM provider for token counting", "Project analysis failed") are separate from the CLI validation and will be addressed by Architect or in subsequent subtasks.
- The build error fix (TS2345 in `ai-magic-generator.ts` with `writeResult.value!`) remains relevant as a deviation made during the initial work on this subtask.

### 3. Modify AiMagicGenerator

**Status**: Completed

**Description**: Update the `AiMagicGenerator` to inject the new `RoomodesService`. Modify the `generate` method to handle the `roo` type by first generating memory bank content using the `ProjectContext` obtained from a single call to `projectAnalyzer.analyzeProject()`, then calling the new `RoomodesService` with the same `ProjectContext`. Remove the direct `case 'memory-bank':` handling. Ensure errors from memory bank generation halt the process.

**Files to Modify**:

- [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts) - Inject service, update `generate` method logic, remove `memory-bank` case.

**Implementation Details**:

```typescript
// Example changes in ai-magic-generator.ts
import { RoomodesService } from '@core/services/roomodes.service'; // Import new service

@Injectable()
export class AiMagicGenerator extends BaseGenerator {
  constructor(
    // ... other dependencies
    private readonly roomodesService: RoomodesService // Inject new service
  ) {
    super(/* ... */);
  }

  public async generate(options: AiMagicGeneratorOptions): Promise<Result<string, RooCodeError>> {
    const { generatorType } = options;

    let projectContext: ProjectContext | undefined;

    if (generatorType === 'roo') {
      // Analyze project only once for 'roo' type
      const contextResult = await this.projectAnalyzer.analyzeProject();
      if (contextResult.isFailure()) {
        return Result.failure(contextResult.error); // Propagate analysis errors
      }
      projectContext = contextResult.value;

      // Generate memory bank content first
      const memoryBankResult =
        await this.memoryBankContentGenerator.generateMemoryBankContent(projectContext);
      if (memoryBankResult.isFailure()) {
        return Result.failure(memoryBankResult.error); // Halt and return error if memory bank generation fails
      }
      // Memory bank content is generated, but not necessarily used directly here,
      // the important part is that it ran and didn't fail.

      // Call the new RoomodesService with the shared context
      const rooResult = await this.roomodesService.generateRoo(projectContext);
      // Handle rooResult success/failure and return
      return Result.success(rooResult); // Replace with actual result handling
    }

    // Handle 'cursor' type (existing logic)
    if (generatorType === 'cursor') {
      // Existing cursor logic...
      // This part should remain largely unchanged
      const cursorResult = await this.cursorGenerator.generate(options);
      return cursorResult;
    }

    // Remove the 'memory-bank' case
    // switch (generatorType) {
    //   case 'memory-bank':
    //     // REMOVE THIS CASE
    //     break;
    //   // ... other cases
    // }

    // Add a fallback or error for unexpected types, though CLI validation should prevent this
    return Result.failure(new RooCodeError('Invalid generator type', { generatorType }));
  }
}
```

**Testing Requirements**:

- Manual verification by code review to ensure:
  - `RoomodesService` is injected.
  - `projectAnalyzer.analyzeProject()` is called only once for `roo`.
  - `ProjectContext` is passed to both memory bank generation and `RoomodesService`.
  - Error handling for memory bank generation is correct.
  - `case 'memory-bank':` is removed.
  - `cursor` logic is unchanged.

**Related Acceptance Criteria**:

- AC5 (`generateMemoryBankContent` called first).
- AC6 (Shared `ProjectContext`).
- AC7 (Error halts `roo` flow).
- AC8 (`cursor` type behavior unchanged).
- AC9 (`case 'memory-bank':` removed).
- AC11 (`RoomodesService` used).

**Estimated effort**: 30-45 minutes

**Required Delegation Components**:

- None.

**Delegation Success Criteria**:

- N/A

**Redelegation History**: N/A

### 4. Remove RoomodesGenerator File

**Status**: Not Started

**Description**: Delete the old `RoomodesGenerator` file as its logic has been migrated.

**Files to Modify**:

- `src/generators/roomodes.generator.ts` - Delete this file.

**Implementation Details**:

- Use a file system command to remove the file.

**Testing Requirements**:

- Manual verification by checking the file system.

**Related Acceptance Criteria**:

- AC10 (`RoomodesGenerator` removed).

**Estimated effort**: 5 minutes

**Required Delegation Components**:

- None.

**Delegation Success Criteria**:

- N/A

**Redelegation History**: N/A

## Implementation Sequence

1.  **Create RoomodesService and Migrate Logic**: Establish the new service and move the core logic. This is a prerequisite for modifying the `AiMagicGenerator`.
2.  **Update CLI Interface**: Modify the CLI options and validation. This can be done independently of the service and generator changes but is a clear, self-contained step.
3.  **Modify AiMagicGenerator**: Integrate the new service and update the flow. This depends on the new service being created.
4.  **Remove RoomodesGenerator File**: Clean up the old file after its logic has been migrated and the new service is integrated.

## Testing Strategy

As per AC12, automated testing is out of scope. The testing strategy will rely entirely on manual verification steps for each acceptance criterion as outlined in the "Acceptance Criteria Mapping" section above. This will involve:

- Running CLI commands to verify option descriptions and validation.
- Code review to verify logic flow, service injection, `ProjectContext` sharing, and error handling within the `AiMagicGenerator`.
- File system checks to confirm file creation and removal.
