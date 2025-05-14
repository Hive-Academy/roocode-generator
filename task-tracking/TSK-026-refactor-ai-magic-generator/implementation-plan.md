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
- [`src/core/di/modules/generator-module.ts`](src/core/di/modules/generator-module.ts) (to remove RoomodesGenerator registration)

## Implementation Strategy

The implementation will proceed by first creating the new `RoomodesService` and migrating the relevant logic from the old generator. Then, the CLI interface will be updated to reflect the new valid generator types. Following that, the `AiMagicGenerator` will be modified to remove the direct `memory-bank` case, integrate the new `RoomodesService` for the `roo` flow, and ensure the `ProjectContext` is analyzed only once and shared. Finally, the old `RoomodesGenerator` file will be removed, along with its registration in the DI container.

Design decisions:

- The `RoomodesService` will be a standard service following the `@core/di` pattern, injected into the `AiMagicGenerator`.
- The `ProjectContext` will be generated at the beginning of the `AiMagicGenerator`'s `generate` method when the `roo` type is selected and passed explicitly to the memory bank content generation and the new `RoomodesService` method.

Technical challenges:

- Ensuring correct DI setup for the new service.
- Properly handling and propagating errors from the memory bank content generation step in the `roo` flow.
- Ensuring all references to the removed generator are correctly cleaned up in the DI container and generator orchestration.

## Acceptance Criteria Mapping

- AC1 (CLI Option Description): Modified in [`src/core/cli/cli-interface.ts`](src/core/cli/cli-interface.ts). Verified manually by checking the help output.
- AC2 (CLI Validation `generate -g roo` passes): Modified in [`src/core/cli/cli-interface.ts`](src/core/cli/cli-interface.ts). Verified manually by running the command.
- AC3 (CLI Validation `generate -g cursor` passes): Modified in [`src/core/cli/cli-interface.ts`](src/core/cli/cli-interface.ts). Verified manually by running the command.
- AC4 (CLI Validation `generate -g memory-bank` fails): Modified in [`src/core/cli/cli-interface.ts`](src/core/cli/cli-interface.ts). Verified manually by running the command and checking the error message.
- AC5 (`generateMemoryBankContent` called before new `RoomodesService` generation method for `roo` type): Modified in [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts). Verified by code review.
- AC6 (Shared `ProjectContext`): Modified in [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts). Verified by code review.
- AC7 (Error from `generateMemoryBankContent` halts `roo` flow and is returned): Modified in [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts). Verified by code review.
- AC8 (`cursor` type behavior unchanged): Verified by code review of [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts).
- AC9 (`case 'memory-bank':` removed): Modified in [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts). Verified by code review.
- AC10 (`RoomodesGenerator` removed): Verified by checking file system after removal and ensuring no references remain in DI or orchestration.
- AC11 (`RoomodesService` created and used): Verified by checking file system and code review of [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts) and the new service file.
- AC12 (No automated tests): Verified by checking the `tests/` directory for any new or modified files related to this task.

## Implementation Subtasks

### 1. Create RoomodesService and Migrate Logic

**Status**: Completed

**Description**: Create the new `RoomodesService` class and migrate the core roo generation logic from the existing `RoomodesGenerator`. Ensure the service follows the project's DI patterns and is injectable.

**Files to Modify**:

- `src/core/services/roomodes.service.ts` - Create new service file.
- `src/generators/roomodes.generator.ts` - Copy logic from here.
- `src/core/di/modules/roomodes-module.ts` - Create new DI module file.
- `src/core/di/registrations.ts` - Update to include the new module.

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

### 4. Remove RoomodesGenerator and Clean Up References

**Status**: Completed

**Description**: Delete the old `RoomodesGenerator` file as its logic has been migrated. Ensure all references to the `RoomodesGenerator` class and its registration in the DI container are removed.

**Files to Modify**:

- `src/generators/roomodes.generator.ts` - Delete this file.
- [`src/core/di/modules/generator-module.ts`](src/core/di/modules/generator-module.ts) - Remove `RoomodesGenerator` from the list of provided generators.
- [`src/core/di/registrations.ts`](src/core/di/registrations.ts) - Ensure no direct imports or references to `RoomodesGenerator` remain (it should be registered via `generator-module`).
- [`src/core/application/generator-orchestrator.ts`](src/core/application/generator-orchestrator.ts) - Ensure no direct imports or references to `RoomodesGenerator` remain (it receives generators via DI).
- [`src/core/cli/cli-interface.ts`](src/core/cli/cli-interface.ts) - Ensure no direct imports or references to `RoomodesGenerator` remain (it uses string names).

**Implementation Details**:

- Use a file system command to remove the file `src/generators/roomodes.generator.ts`.
- Edit `src/core/di/modules/app-module.ts` to remove the import, factory registration, and token list entry for `RoomodesGenerator`. (Note: Registration was found in `app-module.ts`, not `generator-module.ts` as initially presumed).
- Review `src/core/di/registrations.ts`, `src/core/application/generator-orchestrator.ts`, and `src/core/cli/cli-interface.ts` to confirm no direct references to the `RoomodesGenerator` class exist.

**Testing Requirements**:

- Manual verification by checking the file system to confirm `src/generators/roomodes.generator.ts` has been deleted.
- Manual verification by code review of the modified DI and orchestration files to confirm references are removed.
- Ensure the project still builds successfully after removing the file and references (this implicitly checks for any remaining references).

**Related Acceptance Criteria**:

- AC10 (`RoomodesGenerator` removed).

**Estimated effort**: 15-30 minutes

**Required Delegation Components**:

- None.

**Delegation Success Criteria**:

- N/A

**Redelegation History**: N/A

## Implementation Sequence

1.  **Create RoomodesService and Migrate Logic**: Establish the new service and move the core logic. This is a prerequisite for modifying the `AiMagicGenerator`.
2.  **Update CLI Interface**: Modify the CLI options and validation. This can be done independently of the service and generator changes but is a clear, self-contained step.
3.  **Modify AiMagicGenerator**: Integrate the new service and update the flow. This depends on the new service being created.
4.  **Remove RoomodesGenerator and Clean Up References**: Clean up the old file and its registration after its logic has been migrated and the new service is integrated.

## Testing Strategy

As per AC12, automated testing is out of scope. The testing strategy will rely entirely on manual verification steps for each acceptance criterion as outlined in the "Acceptance Criteria Mapping" section above. This will involve:

- Running CLI commands to verify option descriptions and validation.
- Code review to verify logic flow, service injection, `ProjectContext` sharing, and error handling within the `AiMagicGenerator`.
- File system checks to confirm file creation and removal.
- Code review of DI and orchestration files to confirm removal of generator references.
