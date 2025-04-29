# Implementation Plan: CLI Bootstrap Fix and Vite Config Update

## Overview

This implementation addresses the CLI execution issue by introducing a dedicated bootstrap entry point for the CLI application. The new entry point ensures that the bundled CLI code executes properly when launched via the existing `bin/roocode-generator.js` script.

Key objectives:

- Create `src/core/cli/cli-main.ts` as the new CLI bootstrap file.
- Update `vite.config.ts` to set `build.lib.entry` to `src/core/cli/cli-main.ts`.
- Preserve existing build configuration and externalization.
- Verify that CLI commands, especially `generate --generators ai-magic`, execute and produce expected output.

Files to be modified:

- `src/core/cli/cli-main.ts` (new file)
- `vite.config.ts` (update build entry path)

## Implementation Context

Currently, the CLI interface is defined in `src/core/cli/cli-interface.ts`, which exports the `CliInterface` class responsible for parsing CLI arguments and handling commands. However, the build entry point is set directly to this interface file, which does not execute the CLI logic automatically when bundled.

The `bin/roocode-generator.ts` launcher script (source) compiles to `bin/roocode-generator.js` (executable). This script sets up dependency injection, initializes the application container, and runs the main application workflow. It depends on the bundled CLI code to provide executable logic.

## Architectural Decisions and Rationale

- **Role of `bin/roocode-generator.ts` and `bin/roocode-generator.js`**:  
  The `bin` directory contains the CLI launcher source (`.ts`) and compiled executable (`.js`). This is consistent with the current project structure. The launcher script runs the bundled CLI bootstrap code.

- **New CLI Bootstrap Entry Point (`cli-main.ts`)**:  
  Creating a dedicated bootstrap file aligns with best practices for CLI applications, separating interface definitions from execution logic. This file will:

  - Import `CliInterface` and `createPromptModule`.
  - Instantiate `CliInterface` with the prompt module.
  - Call `parseArgs()` asynchronously.
  - Retrieve parsed arguments and perform placeholder logic to confirm command recognition.
  - Handle errors gracefully.

- **Vite Build Entry Update**:  
  Updating `vite.config.ts` to point `build.lib.entry` to `cli-main.ts` ensures the bundled output includes the bootstrap logic and executes on launch.

- **Relationship Between `bin/roocode-generator.js` and Bundled Output**:  
  The `bin/roocode-generator.js` script runs the bundled CLI bootstrap code. The new `cli-main.ts` ensures the bundled code is executable and triggers CLI logic automatically, solving the issue where the bundled CLI code was present but not executed.

- **Preserving Existing Build Configuration**:  
  The build configuration, including externalization of Node built-ins and output formats, remains unchanged to maintain compatibility and build performance.

- **Note on `bin` Directory Structure**:  
  The presence of both `.ts` and `.js` files in `bin/` is intentional for source and compiled output. If restructuring or renaming is desired, it should be addressed separately from this task.

## Component Diagrams and Data Flow

```
[User runs CLI command] --> [bin/roocode-generator.js (launcher script)]
                                   |
                                   v
                          [bundled output from Vite (cli-main.ts)]
                                   |
                                   v
                      Instantiates CliInterface (with createPromptModule)
                                   |
                                   v
                          Calls parseArgs() to parse CLI args
                                   |
                                   v
                      Retrieves parsedArgs and executes logic
                                   |
                                   v
                      Placeholder: Logs recognized commands/options
```

## Interface Definitions and Contracts

- **CliInterface** (from `src/core/cli/cli-interface.ts`):

```typescript
interface ParsedArgs {
  command: string | null;
  options: Record<string, any>;
}

class CliInterface {
  constructor(inquirer: ReturnType<typeof createPromptModule>);
  async parseArgs(): Promise<void>;
  getParsedArgs(): ParsedArgs;
  // Other methods omitted for brevity
}
```

- **cli-main.ts** contract:

```typescript
import { CliInterface } from './cli-interface';
import { createPromptModule } from 'inquirer';

async function main() {
  const cli = new CliInterface(createPromptModule());
  await cli.parseArgs();
  const parsedArgs = cli.getParsedArgs();

  if (parsedArgs.command === 'generate' && parsedArgs.options.generators?.includes('ai-magic')) {
    console.log('Running generators: ai-magic');
  } else {
    console.log('Command recognized:', parsedArgs.command);
  }
}

main().catch((error) => {
  console.error('Error during CLI execution:', error);
  process.exit(1);
});
```

## Implementation Subtasks

### 1. Create `src/core/cli/cli-main.ts`

**Status**: Completed

**Description**: Implement the CLI bootstrap file with the async `main` function as specified, including error handling and placeholder logic.

**Files to Modify**:

- `src/core/cli/cli-main.ts` (new file)

**Testing Requirements**:

- Verify that running the CLI after build executes the `main` function.
- Confirm placeholder output for `generate --generators ai-magic`.

**Acceptance Criteria**:

- [ ] `cli-main.ts` contains the required bootstrap logic.
- [ ] Error handling is implemented.
- [ ] Placeholder command recognition logic is present.

**Estimated effort**: 20 minutes

**Deviations**:

- Based on user feedback, the content of `src/core/cli/cli-main.ts` was updated to replicate the full application bootstrap logic from `bin/roocode-generator.ts` (including DI setup and running `ApplicationContainer`) instead of the initially planned simpler logic involving direct `CliInterface` instantiation. This ensures the bundled entry point uses the established application startup process.

---

### 2. Update `vite.config.ts` build entry

**Status**: Not Started

**Description**: Change the `build.lib.entry` path from `src/core/cli/cli-interface.ts` to `src/core/cli/cli-main.ts` in `vite.config.ts`. Ensure no other build config changes.

**Files to Modify**:

- `vite.config.ts` (line 33)

**Testing Requirements**:

- Build completes without errors.
- Bundled output includes the bootstrap logic.

**Acceptance Criteria**:

- [ ] `vite.config.ts` updated correctly.
- [ ] Build succeeds and outputs expected files.

**Estimated effort**: 10 minutes

---

### 3. Integration Testing of CLI Execution

**Status**: Not Started

**Description**: Test the full CLI execution flow after build and launch via `npm start`. Verify that the CLI runs and outputs the expected placeholder message for the `generate --generators ai-magic` command.

**Files to Modify**:

- None (testing only)

**Testing Requirements**:

- Run `npm run build` successfully.
- Run `npm start -- generate -- --generators ai-magic`.
- Confirm console output: "Running generators: ai-magic".

**Acceptance Criteria**:

- [ ] CLI executes and outputs expected message.
- [ ] No runtime errors occur.

**Estimated effort**: 15 minutes

---

## Testing Strategy

- **Unit Testing**:  
  No direct unit tests needed for the bootstrap file as it mainly orchestrates existing components.

- **Integration Testing**:  
  Focus on verifying the CLI execution end-to-end:

  - Build the project using `npm run build`.
  - Run the CLI with the generate command and verify output.
  - Confirm error handling by simulating errors if feasible.

- **Manual Testing**:  
  Run the CLI commands manually to ensure expected behavior.

---

## Documentation Update Needs

- Update `memory-bank/TechnicalArchitecture.md` to document the creation of `cli-main.ts` and the update to `vite.config.ts` build entry.

---

# Implementation Sequence

1. Create `src/core/cli/cli-main.ts` with bootstrap logic.
2. Update `vite.config.ts` build entry path.
3. Perform integration testing of CLI execution.

---

# Progress Tracking

| Subtask | Status      |
| ------- | ----------- |
| 1       | Completed   |
| 2       | Not Started |
| 3       | Not Started |
