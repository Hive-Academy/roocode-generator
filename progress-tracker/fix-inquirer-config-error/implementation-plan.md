# Implementation Plan: Fix Inquirer TypeError in Config Command

**Version**: 1.0.0
**Date**: 2025-04-28
**Author**: Roo Architect

## 1. Overview

This plan addresses the `TypeError: this.inquirer.prompt is not a function` occurring when running the `config` command in the `roocode-generator` CLI. The error originates in the `LLMConfigService` during interactive configuration.

**Goal**: Correct the usage of the injected `inquirer` dependency in `LLMConfigService` to resolve the TypeError.

**Memory Bank References**:

- memory-bank/TechnicalArchitecture.md:99 (CliInterface uses inquirer)
- memory-bank/TechnicalArchitecture.md:101 (LLMConfigService uses inquirer)
- memory-bank/TechnicalArchitecture.md:209 (DI uses factories)
- memory-bank/DeveloperGuide.md (General coding standards)

## 2. Architecture Decision Record

- **Context**: The DI container registers the `inquirer` `prompt` function directly (via `createPromptModule()`) for the token `'Inquirer'`. Both `CliInterface` and `LLMConfigService` inject this token and expect the `prompt` function type. `CliInterface` uses it correctly (`this.inquirer(...)`), but `LLMConfigService` incorrectly attempts `this.inquirer.prompt(...)`.
- **Decision**: Modify the call site in `LLMConfigService.interactiveEditConfig` to use the injected `prompt` function directly: `await this.inquirer(questions);`.
- **Consequences**:
  - (+) Resolves the `TypeError`.
  - (+) Makes `LLMConfigService` usage consistent with the DI registration, type annotation, and usage in `CliInterface`.
  - (-) None anticipated.
- **Alternatives Considered**:
  - Change DI registration to provide the full `inquirer` object: Rejected, as the current registration matches the explicit type annotations and `CliInterface` usage. Changing it would require modifying `CliInterface` as well and deviate from the apparent original intent.

## 3. Component Architecture

No changes to the overall component architecture. This is a bug fix within an existing method.

## 4. Interface Changes

No interface changes required.

## 5. Data Flow

No changes to the overall data flow. The interactive prompt mechanism will now function correctly within the existing flow.

## 6. Implementation Subtasks

### 1. Correct Inquirer Usage in LLMConfigService

**Description**: Modify the `interactiveEditConfig` method in `LLMConfigService` to correctly call the injected `inquirer` prompt function.

**Dependencies**: None

**Implementation Details**:

```typescript
// File: src/core/config/llm-config.service.ts

// Inside the interactiveEditConfig method...

// Find this line (around line 146):
const answers = await this.inquirer.prompt(questions);

// Change it to:
const answers = await this.inquirer(questions);
```

**Testing Requirements**:

- Run `npm run start -- -- config` and verify that the interactive prompts appear without the `TypeError`.
- Manually test the interactive configuration flow to ensure it saves the updated values correctly.
- Ensure existing unit tests for `LLMConfigService` still pass (or update them if they incorrectly mocked the previous behavior). Run `npm test tests/core/config/llm-config.service.test.ts`.

**Acceptance Criteria**:

- [ ] The line `await this.inquirer.prompt(questions);` in `src/core/config/llm-config.service.ts` is changed to `await this.inquirer(questions);`.
- [ ] Running `npm run start -- -- config` no longer throws the `TypeError`.
- [ ] Interactive configuration prompts are displayed correctly.
- [ ] Relevant unit tests pass.

**Estimated effort**: 15 minutes

## 7. Implementation Sequence

1.  Correct Inquirer Usage in LLMConfigService

## 8. Risk Assessment

- **Risk**: Low. This is a targeted fix to a clear bug.
- **Mitigation**: Verify with manual testing and unit tests.

## 9. Testing Strategy

- **Unit Testing**: Ensure `llm-config.service.test.ts` passes.
- **Manual Testing**: Run the `config` command interactively.

## 10. Verification Checklist

- [x] Plan includes explicit memory bank references
- [x] Architecture decisions documented with rationales
- [ ] Component diagrams included and accurate (N/A - No change)
- [ ] Interface definitions are complete (N/A - No change)
- [x] Subtasks are fully detailed with acceptance criteria
- [x] Implementation sequence is clear with dependencies
- [x] Risk assessment included with mitigation strategies
- [x] Testing strategy is comprehensive
- [x] All diagrams and code examples render correctly
