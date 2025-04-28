# Implementation Plan: Fix Inquirer Runtime Hang in Config Command

**Version**: 1.0
**Last Updated**: 2025-04-28
**Author**: Roo Architect

## 1. Overview

This plan addresses the critical issue where the `roocode-generator config` command hangs during interactive prompts when run in the actual CLI environment (`npm run start -- -- config`). The root cause identified is a conflict between the `ora` progress spinner (`ProgressIndicator`) and the `inquirer` library. The spinner is not stopped before `inquirer` attempts to take control of the terminal I/O, leading to the hang.

The fix involves modifying the `ApplicationContainer` to explicitly stop the `ProgressIndicator` immediately before invoking the interactive configuration method in `LLMConfigService`.

**Related Issue:** Follow-up to `fix-inquirer-config-error`.
**Review Report:** `progress-tracker/fix-inquirer-config-error/fix-inquirer-usage-review.md`

## 2. Architecture Decision Record

- **Context**: The `config` command uses `ProgressIndicator` (`ora`) for visual feedback and `LLMConfigService` (which uses `inquirer`) for interactive input. Running `ora` concurrently with `inquirer` causes terminal I/O conflicts, preventing `inquirer` from functioning.
- **Decision**: Explicitly stop the `ProgressIndicator` instance in `ApplicationContainer` _before_ calling the `LLMConfigService.interactiveEditConfig` method.
- **Consequences**:
  - **Positive**: Resolves the hanging issue, allowing interactive configuration to complete successfully. Correctly separates the lifecycle of the spinner and the interactive prompt.
  - **Negative**: The spinner will disappear just before the first prompt appears, which is the correct behavior but slightly changes the visual flow.
- **Alternatives Considered**:
  - **Injecting `ProgressIndicator` into `LLMConfigService`**: Rejected. This would tightly couple the config service to the UI element and violate separation of concerns. The orchestrator (`ApplicationContainer`) should manage the UI flow.
  - **Using a different spinner library**: Rejected. `ora` is already integrated, and the issue is lifecycle management, not the library itself.

## 3. Component Architecture

No changes to the overall component structure or interfaces. The change is localized to the command execution logic within `ApplicationContainer`.

**Relevant Components:**

- `ApplicationContainer` (`src/core/application/application-container.ts`): Orchestrates command execution.
- `ProgressIndicator` (`src/core/ui/progress-indicator.ts`): Wrapper for `ora`.
- `LLMConfigService` (`src/core/config/llm-config.service.ts`): Handles config logic and uses `inquirer`.
- `ICliInterface` (`src/core/cli/cli-interface.ts`): Provides `inquirer` instance via DI.

## 4. Interface Changes

None.

## 5. Data Flow

The data flow for the interactive `config` command remains the same, but the UI state management (spinner) is corrected:

1.  `ApplicationContainer.executeConfigCommand` is called.
2.  `ProgressIndicator.start()` is called.
3.  **NEW:** `ProgressIndicator.stop()` is called.
4.  `LLMConfigService.interactiveEditConfig()` is called (which uses `inquirer.prompt()`).
5.  User interacts with prompts.
6.  `LLMConfigService` saves the config.
7.  Control returns to `ApplicationContainer`.
8.  `ApplicationContainer` logs success/failure (spinner is already stopped).

## 6. Implementation Subtasks

### 1. Stop Spinner Before Interactive Prompt

**Description**: Modify `ApplicationContainer.ts` to stop the `ProgressIndicator` before calling `interactiveEditConfig`.

**Dependencies**: None.

**Implementation Details**:

In `src/core/application/application-container.ts`, within the `executeConfigCommand` method's `else` block:

```typescript
// src/core/application/application-container.ts

// ... inside executeConfigCommand method ...
      } else {
        progress.start('Starting interactive configuration...');
        // --- START CHANGE ---
        progress.stop(); // Stop the spinner BEFORE calling inquirer
        // --- END CHANGE ---
        const result = await this.llmConfigService.interactiveEditConfig(baseConfig);
        // Remove the commented-out progress.stop() below if it still exists

        if (result.isErr()) {
          const error = result.error ?? new Error('Unknown error during interactive configuration');
          this.logger.error(`Interactive config update failed: ${error.message}`);
          // Spinner is already stopped, so no need to call fail() here unless
          // we want to display a final error symbol, which might be complex
          // after inquirer has finished. Logging the error is sufficient.
          return Result.err(error);
        }

        // Spinner is already stopped. Log success.
        this.logger.info('Configuration updated successfully via interactive mode.');
        return Result.ok(undefined);
      }
// ... rest of the method ...

```

**Testing Requirements**:

- **Manual Testing**: Run `npm run start -- -- config` and verify:
  - The spinner "Starting interactive configuration..." appears briefly and then disappears.
  - The first `inquirer` prompt ("Enter the LLM provider name...") appears correctly.
  - All interactive prompts can be answered successfully.
  - The configuration is saved correctly to `llm.config.json`.
- **Unit Testing**: No changes needed to existing unit tests, as they mock `inquirer` and don't involve `ProgressIndicator`.

**Acceptance Criteria**:

- [ ] `ProgressIndicator.stop()` is called in `ApplicationContainer.executeConfigCommand` before `this.llmConfigService.interactiveEditConfig()`.
- [ ] Running `npm run start -- -- config` allows the user to successfully complete the interactive prompts.
- [ ] The `llm.config.json` file is updated correctly after the interactive session.

**Estimated effort**: 15 minutes

## 7. Implementation Sequence

1.  **Subtask 1: Stop Spinner Before Interactive Prompt**

## 8. Risk Assessment

- **Risk**: Minimal. The change is localized and addresses a known conflict pattern between `ora` and `inquirer`.
- **Mitigation**: Manual testing is crucial to confirm the fix in the actual CLI environment.

## 9. Testing Strategy

- Primary validation will be through manual end-to-end testing of the `config` command in interactive mode.
- Existing unit tests for `LLMConfigService` remain relevant for the core logic but do not cover this specific runtime interaction.

## 10. Memory Bank References

- `memory-bank/TechnicalArchitecture.md:116-166`: Describes `executeConfigCommand` flow.
- `memory-bank/TechnicalArchitecture.md:142`: Mentions `ProgressIndicator` (`ora`).
- `memory-bank/TechnicalArchitecture.md:99`: Mentions `CliInterface` using `inquirer`.
- `memory-bank/DeveloperGuide.md:80, 82`: Mentions `inquirer` and `ora`.

## 11. Verification Checklist

- [ ] Plan includes explicit memory bank references.
- [ ] Architecture decisions documented with rationales.
- [ ] Component diagrams included and accurate (No change needed).
- [ ] Interface definitions are complete (No change needed).
- [ ] Subtasks are fully detailed with acceptance criteria.
- [ ] Implementation sequence is clear with dependencies.
- [ ] Risk assessment included with mitigation strategies.
- [ ] Testing strategy is comprehensive (focus on manual testing).
- [ ] All diagrams and code examples render correctly.
