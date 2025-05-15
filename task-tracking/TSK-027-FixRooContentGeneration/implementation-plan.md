# Implementation Plan: Fix AiMagicGenerator Roo Content Generation (TSK-027)

## 1. Overview

This plan details the modifications to `AiMagicGenerator` to correctly generate mode-aware roo files. The primary goal is to ensure that the final `.roo/system-prompt-[modeName].md` files contain the combined content of `templates/system-prompts/roo-rules.md`, the mode-specific system prompt (e.g., `templates/system-prompts/system-prompt-boomerang.md`), followed by an LLM-generated list of at least 100 new rules.

**Key Technical Decisions**:

- The `generateRooSystemPrompts` method in [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts) will be the main orchestrator for these changes.
- The `buildModeRooPrompt` method will be refactored to construct the LLM prompts based on `projectContext` and `modeName` for rule generation.
- The `processRooContent` method will be refactored to handle structured LLM output.
- The final output file path will be corrected to include the `.md` extension.

**Files to Modify**:

- [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts)

## 2. Implementation Strategy

The `generateRooSystemPrompts` method will be updated as follows:

1.  Read `roo-rules.md` and the current mode's specific system prompt file.
2.  Store this combined content (`baseCombinedContent`).
3.  Call a refactored `buildModeRooPrompt` method. This method will now:
    - Take `projectContext` and `modeName` as inputs.
    - Construct a generic LLM system prompt.
    - Construct the LLM user prompt with explicit instructions to generate a JSON object containing a list of 100+ new rules (including KISS, SOLID, OOP, and DRY principles) based on `projectContext` and `modeName`.
4.  Invoke `llmAgent.getStructuredCompletion` with these new prompts and a Zod schema for `{ rules: string[] }`.
5.  Call a refactored `processRooContent` method. This method will:
    - Take the structured LLM output (`{ rules: string[] }`) as input.
    - Validate the input structure.
    - Convert the `rules` array into a markdown list string.
6.  Concatenate `baseCombinedContent` with the markdown-formatted `processedLLMRules`.
7.  Write this final combined content to `.roo/system-prompt-[modeName].md`.

Error handling will be ensured at each step (file I/O, LLM calls, content processing). Logging will be used to track progress and warnings.

## 3. Acceptance Criteria Mapping

- **AC1: Generated roo file exists at `.roo/system-prompt-[modeName].md`**:
  - Satisfied by: Modifying `outputPath` in `generateRooSystemPrompts` to `path.join('.roo', \`system-prompt-${modeName}.md\`);`and ensuring`writeRooFile` successfully writes.
  - Subtasks: 1, 2.
- **AC2: Content starts with `roo-rules.md` content**:
  - Satisfied by: Prepending `roo-rules.md` content to the final string written to the file.
  - Subtasks: 1, 2.
- **AC3: Mode-specific prompt follows `roo-rules.md`**:
  - Satisfied by: Appending mode-specific prompt content immediately after `roo-rules.md` content in the `baseCombinedContent`.
  - Subtasks: 1, 2.
- **AC4: Markdown list appended after combined content**:
  - Satisfied by: Appending the LLM-generated (and processed) rule list to `baseCombinedContent`.
  - Subtasks: 1, 2.
- **AC5: Appended list contains at least 100 items**:
  - Satisfied by: Implementing a check in `generateRooSystemPrompts` after the LLM call (based on the length of the rules array) and logging a warning if not met. The task allows proceeding with fewer rules.
  - Subtasks: 1, 2.
- **AC6: Rules include KISS, SOLID, OOP, DRY**:
  - Satisfied by: Explicitly instructing the LLM in the `userPrompt` (via `buildModeRooPrompt`) to include these principles (KISS, SOLID, OOP, DRY) and including `projectContext` for relevance. Verification is manual or via targeted LLM analysis as per task description.
  - Subtask: 1.
- **AC7: `processRooContent` modified/replaced**:
  - Satisfied by: Refactoring `processRooContent` to handle the structured `{ rules: string[] }` input and format it into a markdown list.
  - Subtask: 1.
- **AC8: `buildModeRooPrompt` updated/usage changed**:
  - Satisfied by: Refactoring `buildModeRooPrompt` to accept only `projectContext` and `modeName`, construct a generic system prompt, and a user prompt asking for JSON rules based on context and principles.
  - Subtask: 1.
- **AC9: Robust error handling**:
  - Satisfied by: Ensuring `Result` type is used consistently and errors are propagated/logged appropriately in all modified/new logic, including handling errors from `getStructuredCompletion` and `_validateInputTokens`.
  - Subtasks: 1, 2.
- **AC10: Appropriate logging**:
  - Satisfied by: Adding/updating `this.logger` calls for key steps, warnings (e.g., rule count), and errors, including logs related to structured LLM calls and token validation.
  - Subtasks: 1, 2.

## 4. Implementation Subtasks

### Subtask 1: Refactor Core Roo Generation Logic

**Status**: Completed

**Description**: Modify `generateRooSystemPrompts`, `buildModeRooPrompt`, and `processRooContent` in [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts) to implement the new roo file generation flow. This includes updating prompt construction, LLM interaction, content processing, and final content assembly.
**REVISION FOCUS**: Corrected LLM prompting strategy. `roo-rules.md` and mode-specific templates are NO LONGER sent to the LLM as part of its direct context for rule generation. The LLM now generates 100+ rules based ONLY on `modeName` and `projectContext`. These generated rules are then appended to the combined static content of `roo-rules.md` and the mode-specific template. This uses `llmAgent.getStructuredCompletion` with a Zod schema, and `processRooContent` has been simplified to handle this structured LLM output.

**Files to Modify**:

- [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts):
  - `generateRooSystemPrompts`:
    - Reads `rulesContent` (from `templates/system-prompts/roo-rules.md`).
    - For each mode:
      - Reads `templateContent` (the mode-specific template, e.g., `templates/system-prompts/system-prompt-architect.md`).
      - Creates `baseCombinedContent = rulesContent + "\n" + templateContent`. This `baseCombinedContent` is the static prefix for the final output file and is NOT sent to the LLM for rule generation.
      - Calls `buildModeRooPrompt` passing only `projectContext` and `modeName`.
      - Calls `llmAgent.getStructuredCompletion` with the prompts from `buildModeRooPrompt` (which are based only on `projectContext` and `modeName`) and a Zod schema for `{ rules: string[] }`.
      - Passes the structured LLM output (e.g., `{ rules: ["rule1", ...] }`) to `processRooContent`.
      - `processRooContent` validates the structure and converts the `rules` array into a markdown list string (`processedLLMRules`).
      - Concatenates `finalContent = baseCombinedContent + "\n\n" + processedLLMRules`.
      - Writes `finalContent` to `.roo/system-prompt-[modeName].md`.
  - `buildModeRooPrompt`:
    - Accepts `projectContext` and `modeName` as parameters.
    - Does NOT accept or use `rooRulesContent` or `modeTemplateContent`.
    - Constructs a generic LLM `SystemMessage` (e.g., "You are an AI assistant. Your task is to generate a list of specific, actionable rules relevant to a software development project and a particular operational mode. Ensure the rules are distinct and follow best practices.").
    - Constructs LLM `HumanMessage` (user prompt) instructing the LLM to:
      - Generate 100+ new rules specifically for the given `modeName`.
      - Base these rules on the provided stringified `projectContext`.
      - Incorporate principles like KISS, SOLID, OOP, DRY.
      - Return the output as a JSON object: `{ "rules": ["rule1", "rule2", ...] }`.
    - Returns `BaseLanguageModelInput` (an array containing the SystemMessage and HumanMessage).
  - `processRooContent`:
    - Input is ` { rules: string[] } | undefined` (the structured JSON object from `getStructuredCompletion`).
    - Validates that the input is an object with a `rules` property that is an array of strings.
    - Converts the `rules` string array into a single multi-line string, with each rule prefixed by `- ` (markdown list format).
    - Rule count check is performed in `generateRooSystemPrompts` based on the length of the `rules` array received from the LLM (before formatting by `processRooContent`).

**Implementation Details**:
The code snippets previously in this section are outdated due to the significant shift in prompting strategy. The descriptions in the "Files to Modify" section above reflect the current (corrected) approach.

**Testing Requirements**:

- Unit tests for `buildModeRooPrompt` to verify correct (new) system and user prompt construction (generic system prompt, user prompt with `projectContext` and `modeName` asking for JSON).
- Unit tests for `processRooContent` to verify correct handling of the `{ rules: string[] }` input and markdown list formatting.
- Unit tests for `generateRooSystemPrompts` (mocking dependencies) to verify:
  - Correct reading of `roo-rules.md` and mode-specific templates for `baseCombinedContent`.
  - Correct parameters (only `projectContext`, `modeName`) passed to `buildModeRooPrompt`.
  - Correct call to `llmAgent.getStructuredCompletion`.
  - Correct parameters passed to `processRooContent`.
  - Correct final content concatenation (`baseCombinedContent` + LLM rules).
  - Rule count warning logic (based on array length from LLM).

**Related Acceptance Criteria**: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10.

**Estimated effort**: (Effort already expended during revisions)

**Required Delegation Components**:

- Implementation components for Junior Coder: Not applicable (Senior Developer handled the refactoring).
- Testing components for Junior Tester:
  - Unit tests for the refactored `buildModeRooPrompt` method (as per new strategy).
  - Unit tests for the refactored `processRooContent` method (as per new strategy).

**Delegation Success Criteria**:

- Junior Coder components (if any): N/A.
- Junior Tester components: Test suites must achieve high coverage for the specified methods and scenarios, verifying all logic paths and edge cases according to the _new_ prompting and data handling strategy. Tests should be well-documented.

### Subtask 2: Integration Testing and Final Adjustments

**Status**: Blocked

**Description**: Perform integration testing of the `AiMagicGenerator`'s roo generation feature. This involves running the generator for various modes and verifying the output files against all acceptance criteria. Make any necessary final adjustments to logic, logging, or error handling based on test results. This subtask depends on the successful fix and completion of Subtask 1.
**BLOCKING ISSUE**: Integration testing by Junior Tester revealed that the input prompts (now composed _only_ of `modeName` and stringified `projectContext` for the LLM rule generation step) are _still_ exceeding the token limits for the `gpt-4.1-mini` model when using `getStructuredCompletion`. This is due to the large size of `projectContext` itself and client-side validation in `OpenRouterProvider`. This prevents file generation for several modes. Addressing this requires a new subtask within TSK-027 to implement a strategy to reduce `projectContext` size or use a model with a larger context window.

**Files to Modify**:

- [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts) (if adjustments are needed based on testing, or for context summarization strategies).
- Potentially test setup files or mock configurations.
- Potentially [`src/core/llm/providers/open-router-provider.ts`](src/core/llm/providers/open-router-provider.ts) if client-side validation needs adjustment (requires careful consideration).
- Potentially configuration files if model selection is changed.

**Implementation Details**:

- (Blocked until token limit strategy is defined and implemented)
- Manually trigger the `AiMagicGenerator` for a few representative modes (e.g., `boomerang`, `architect`, `junior-coder`).
- Inspect the generated `.roo/system-prompt-[modeName].md` files.
- Verify:
  - File existence and correct naming (AC1).
  - Presence and correctness of `roo-rules.md` content at the start (AC2).
  - Presence and correctness of mode-specific prompt content following `roo-rules.md` (AC3).
  - Appended markdown list of rules (generated by LLM based on `modeName` and `projectContext`) (AC4).
  - Rule count (at least 100 from LLM's rule array, or warning logged) (AC5).
  - (Manual check) Presence of KISS, SOLID, OOP, and DRY guidelines in the generated rules, and relevance to `projectContext` (AC6).
- Check logs for correct information, warnings, and any errors (AC9, AC10).

**Testing Requirements**:

- (Blocked) End-to-end testing scenarios for the roo generation flow.
- (Blocked) Verification of all acceptance criteria on actual generated files.

**Related Acceptance Criteria**: All (currently blocked).

**Estimated effort**: 1-2 hours (after unblocking).

**Required Delegation Components**:

- Implementation components for Junior Coder: Not applicable for current state. May be relevant if context summarization logic is delegated.
- Testing components for Junior Tester:
  - (Blocked) Execution of pre-defined integration test scenarios for modes like `boomerang`, `architect`, `junior-coder`.
  - (Blocked) Documenting results and comparing against acceptance criteria.
  - (Blocked) Creating new integration test cases if gaps are found.

**Delegation Success Criteria**:

- Junior Tester components: (Blocked) Thorough execution of tests, detailed reporting of any discrepancies or failures, and clear verification of each acceptance criterion.

### Subtask 3: Address ProjectContext Token Limit for Structured LLM Calls

**Status**: In Progress

**Description**: Develop and implement a strategy to mitigate the token limit issue caused by the large size of `projectContext` when calling `llmAgent.getStructuredCompletion` for Roo rule generation. This is currently blocking Subtask 2 (Integration Testing).

**Key Investigation Point (User Feedback & Findings)**:

- Both `AiMagicGenerator.buildModeRooPrompt` (for Roo rules) and `MemoryBankContentGenerator.buildPrompts` (for memory bank) stringify the _entire_ `projectContext` (`JSON.stringify(projectContext, null, 2)`) and include it in their respective user prompts.
- However, Roo rule generation (using `llmAgent.getStructuredCompletion` with `gpt-4.1-mini`) hits token limits, while memory bank generation (using `llmAgent.getCompletion`) reportedly does not.
- This strongly suggests the discrepancy lies in the differences between `llmAgent.getStructuredCompletion` and `llmAgent.getCompletion`, their default model configurations, or how `OpenRouterProvider` handles token validation for them, rather than `MemoryBankService` having a special summarization technique for `projectContext` that `AiMagicGenerator` lacks.

**Revised Investigation Focus**:

1.  **`LLMAgent` Analysis**: Examine [`src/core/llm/llm-agent.ts`](src/core/llm/llm-agent.ts) to compare `getCompletion` and `getStructuredCompletion`.
    - How do they select/configure LLM models?
    - Are there different default models or parameters affecting context limits?
2.  **`OpenRouterProvider` Analysis**: Examine [`src/core/llm/providers/open-router-provider.ts`](src/core/llm/providers/open-router-provider.ts) (or other relevant provider).
    - How is token validation implemented for `getCompletion` vs. `getStructuredCompletion` calls?
    - Are there specific constraints for `gpt-4.1-mini` when used with `getStructuredCompletion`?

**Possible Strategies (Refined)**:

1.  **Align LLM Call/Model for Roo Rules**:
    - If `llmAgent.getCompletion` uses a model with a larger context window by default, investigate if `llmAgent.getStructuredCompletion` can be configured to use a similar model for Roo rule generation, provided it supports reliable structured output.
    - This might involve changes to how models are specified or selected in `LLMAgent` or its configuration.
2.  **Adjust Token Validation (with caution)**:
    - If the client-side validation in `OpenRouterProvider` for `gpt-4.1-mini` (used by `getStructuredCompletion`) is overly conservative and the model can actually handle slightly more tokens, explore adjusting this. This requires careful verification against actual model limits.
3.  **Context Summarization/Pruning for Roo Rules (Fallback)**:
    - If `gpt-4.1-mini` is a strict requirement for `getStructuredCompletion` for Roo rules (due to cost, performance, or specific structured output quality) and its context limit cannot be overcome by the above, then implementing context summarization or selective field inclusion within `AiMagicGenerator.buildModeRooPrompt` becomes necessary. This would involve:
      - Identifying and stringifying only essential parts of `projectContext`.
      - Potentially using a separate, quick LLM call to summarize `projectContext` (though this adds complexity and cost).
4.  **Model Evaluation for Roo Rules**: If `gpt-4.1-mini` is too restrictive, evaluate alternative models compatible with `getStructuredCompletion` that offer a larger context window and meet quality/cost criteria.

**Files to Modify (Potential)**:

- [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts) (if context summarization is chosen for `buildModeRooPrompt`).
- [`src/core/llm/llm-agent.ts`](src/core/llm/llm-agent.ts) (if model selection logic for `getStructuredCompletion` needs changes).
- [`src/core/llm/providers/open-router-provider.ts`](src/core/llm/providers/open-router-provider.ts) (if token validation logic needs adjustment).
- LLM configuration files (if model selection is changed globally or for specific functions).
- Potentially [`src/core/analysis/types.ts`](src/core/analysis/types.ts) if `ProjectContext` structure is adapted for easier summarization.

**Implementation Details**:

- **Current Focus (TSK-027.1)**: Implementing strategy 'Adjust Token Validation' in [`src/core/llm/providers/open-router-provider.ts`](src/core/llm/providers/open-router-provider.ts:1) as per initial subtask request. This corresponds to the specific instructions for the first part of TSK-027.
- **Investigate `LLMAgent` and `OpenRouterProvider`**: Perform the analysis outlined in "Revised Investigation Focus".
- Based on these findings, select the most direct and effective strategy from "Possible Strategies (Refined)".
- Implement the chosen strategy.
- If context summarization is chosen:
  - Analyze `projectContext` structure to identify key elements for Roo rule generation.
  - Implement logic in `buildModeRooPrompt` to create a reduced `projectContextString`.
- Add unit tests for any new or modified logic (e.g., context processing, model selection changes).
- Document the chosen strategy and rationale.

**Testing Requirements**:

- Unit tests for any new context summarization/pruning logic.
- Verification that the modified context significantly reduces token count for Roo rule generation while preserving essential information.
- If a new model is used, basic tests to ensure it integrates correctly.
- Confirmation that LLM calls for Roo rule generation succeed without token-related errors.

**Related Acceptance Criteria**:

- **NEW AC3.1**: The token count for the `projectContext` (or its processed version) input to `getStructuredCompletion` for Roo rule generation is consistently within the limits of the chosen LLM model (currently `gpt-4.1-mini`, unless changed as part of the solution).
- **NEW AC3.2**: LLM calls for Roo rule generation succeed without token-related errors.
- **NEW AC3.3**: The chosen strategy for token limit mitigation is documented in this implementation plan.
- Indirectly impacts all original ACs by unblocking Subtask 2.

**Estimated effort**: 2-4 hours (depending on chosen strategy and findings from `LLMAgent`/`OpenRouterProvider`).

**Required Delegation Components**:

- Implementation components for Junior Coder:
  - If context summarization is chosen: Implementation of the summarization/selection logic in `buildModeRooPrompt`.
  - If model configuration changes are needed: Modifying relevant configuration files or `LLMAgent` model selection logic under guidance.
- Testing components for Junior Tester:
  - Unit tests for any new context processing logic.
  - Unit tests for changes to `LLMAgent` or provider interactions.
  - Verification tests confirming successful LLM calls post-fix.

**Delegation Success Criteria**:

- Junior Coder: Accurate implementation of the chosen strategy, adhering to existing patterns. Code must be clean, well-documented, and include basic error handling.
- Junior Tester: Comprehensive unit tests achieving high coverage for new/modified logic. Test cases should cover successful scenarios and potential failure points (e.g., context still too large after summarization if that path is taken).

### Subtask 5. Implementation Sequence

1.  **Subtask 1: Refactor Core Roo Generation Logic** - Completed.
2.  **Subtask 3: Address ProjectContext Token Limit for Structured LLM Calls** - This new subtask must be completed next to unblock testing.
3.  **Subtask 2: Integration Testing and Final Adjustments** - This task verifies the changes from Subtask 1 and Subtask 3, ensuring all ACs are met.

## 6. Testing Strategy

- **Unit Testing**:
  - `buildModeRooPrompt`: Verify correct (new) system and user prompt construction (generic system prompt, user prompt with `projectContext` and `modeName` asking for JSON).
  - `processRooContent`: Test with various LLM response formats (perfect list, list with noise, malformed list, empty response) to ensure robust parsing and cleaning.
  - `generateRooSystemPrompts` (mocking dependencies): Verify orchestration logic, including:
    - Correct reading of `roo-rules.md` and mode-specific templates for `baseCombinedContent`.
    - Correct parameters (only `projectContext`, `modeName`) passed to `buildModeRooPrompt`.
    - Correct call to `llmAgent.getStructuredCompletion`.
    - Correct parameters passed to `processRooContent`.
    - Correct final content concatenation (`baseCombinedContent` + LLM rules).
    - Rule count warning logic (based on array length from LLM).
- **Integration Testing**:
  - (Blocked until token limit issue is resolved)
  - Run `AiMagicGenerator` for `roo` generation for modes like `boomerang`, `architect`, `junior-coder`.
  - Manually inspect the generated `.roo/system-prompt-[modeName].md` files to confirm:
    - `roo-rules.md` content is first.
    - Mode-specific prompt content is second.
    - LLM-generated rules list is appended.
    - List has >= 100 items (or warning logged).
    - Rules appear to follow KISS, SOLID, OOP, and DRY (manual spot check) and are relevant to the mode and project context.
  - Check application logs for correct flow, warnings, and errors.
- **Manual Verification**:
  - The AC regarding KISS, SOLID, OOP, and DRY principles and relevance to context in generated rules will primarily rely on manual inspection of the output, guided by the LLM prompt.

This strategy ensures that individual components behave as expected and that the overall feature works correctly from end-to-end, satisfying all acceptance criteria, once the blocking token limit issue is resolved.
