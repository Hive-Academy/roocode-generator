# Implementation Plan: Fix AiMagicGenerator Roo Content Generation (TSK-027)

## 1. Overview

This plan details the modifications to `AiMagicGenerator` to correctly generate mode-aware roo files. The primary goal is to ensure that the final `.roo/system-prompt-[modeName].md` files contain the combined content of `templates/system-prompts/roo-rules.md`, the mode-specific system prompt (e.g., `templates/system-prompts/system-prompt-boomerang.md`), followed by an LLM-generated list of at least 100 new rules.

**Key Technical Decisions**:

- The `generateRooSystemPrompts` method in [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts) will be the main orchestrator for these changes.
- The `buildModeRooPrompt` method will be refactored to construct the LLM system prompt from the combined `roo-rules.md` and mode-specific template content. The user prompt will instruct the LLM to generate _only_ a list of new rules.
- The `processRooContent` method will be refactored to focus on cleaning and validating the LLM's rule list output, ensuring it's a markdown list and checking the rule count.
- The final output file path will be corrected to include the `.md` extension.

**Files to Modify**:

- [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts)

## 2. Implementation Strategy

The `generateRooSystemPrompts` method will be updated as follows:

1.  Read `roo-rules.md` and the current mode's specific system prompt file.
2.  Store this combined content (`baseCombinedContent`).
3.  Call a refactored `buildModeRooPrompt` method. This method will now:
    - Take `rooRulesContent` and `modeTemplateContent` as inputs.
    - Construct the LLM `systemPrompt` by concatenating `rooRulesContent` and `modeTemplateContent`.
    - Construct the LLM `userPrompt` with explicit instructions to generate _only_ a markdown list of 100+ new rules (including KISS, SOLID, OOP, and DRY principles) based on the provided system prompt (which is the `baseCombinedContent`).
4.  Invoke `getRooCompletion` with these new prompts. The response (`llmGeneratedRulesList`) is expected to be just the markdown list.
5.  Call a refactored `processRooContent` method. This method will:
    - Take `llmGeneratedRulesList` as input.
    - Clean the input (remove any extraneous text/code blocks if LLM fails to provide _only_ the list).
    - Validate that the output is a markdown list and contains at least 100 rules (log warning if not).
    - Return the cleaned list of rules.
6.  Concatenate `baseCombinedContent` with the cleaned `processedLLMRules`.
7.  Write this final combined content to `.roo/system-prompt-[modeName].md`.

Error handling will be ensured at each step (file I/O, LLM calls, content processing). Logging will be used to track progress and warnings.

## 3. Acceptance Criteria Mapping

- **AC1: Generated roo file exists at `.roo/system-prompt-[modeName].md`**:
  - Satisfied by: Modifying `outputPath` in `generateRooSystemPrompts` (around line 450 of the existing code) to `path.join('.roo', \`system-prompt-${modeName}.md\`);`and ensuring`writeRooFile` successfully writes.
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
  - Satisfied by: Implementing a check in the refactored `processRooContent` (or directly in `generateRooSystemPrompts` after LLM call) and logging a warning if not met. The task allows proceeding with fewer rules.
  - Subtasks: 1, 2.
- **AC6: Rules include KISS, SOLID, OOP, DRY**:
  - Satisfied by: Explicitly instructing the LLM in the `userPrompt` (via `buildModeRooPrompt`) to include these principles (KISS, SOLID, OOP, DRY). Verification is manual or via targeted LLM analysis as per task description.
  - Subtask: 1.
- **AC7: `processRooContent` modified/replaced**:
  - Satisfied by: Refactoring `processRooContent` to focus only on cleaning/validating the LLM's direct output (the rule list).
  - Subtask: 1.
- **AC8: `buildModeRooPrompt` updated/usage changed**:
  - Satisfied by: Refactoring `buildModeRooPrompt` to use `roo-rules.md` + mode-specific prompt as the LLM system prompt, and to use a new user prompt instructing the LLM to generate _only_ the rule list.
  - Subtask: 1.
- **AC9: Robust error handling**:
  - Satisfied by: Ensuring `Result` type is used consistently and errors are propagated/logged appropriately in all modified/new logic.
  - Subtasks: 1, 2.
- **AC10: Appropriate logging**:
  - Satisfied by: Adding/updating `this.logger` calls for key steps, warnings (e.g., rule count), and errors.
  - Subtasks: 1, 2.

## 4. Implementation Subtasks

### Subtask 1: Refactor Core Roo Generation Logic

**Status**: In Progress

**Description**: Modify `generateRooSystemPrompts`, `buildModeRooPrompt`, and `processRooContent` in [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts) to implement the new roo file generation flow. This includes updating prompt construction, LLM interaction, content processing, and final content assembly.

**Files to Modify**:

- [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts):
  - `generateRooSystemPrompts`:
    - Store combined `rooRulesContent` and `modeTemplateContent` as `baseCombinedContent`.
    - Adjust calls to `buildModeRooPrompt` and `processRooContent`.
    - Concatenate `baseCombinedContent` with processed LLM rules.
    - Correct the output file path to `system-prompt-[modeName].md`.
  - `buildModeRooPrompt`:
    - Accept `rooRulesContent` and `modeTemplateContent`.
    - Set LLM `systemPrompt = rooRulesContent + "\n" + modeTemplateContent`.
    - Set LLM `userPrompt` to: "Based on the context provided in the system prompt, generate a markdown list of at least 100 new rules. These rules should incorporate KISS, SOLID, OOP, and DRY principles. Your response should consist _only_ of this markdown list, with each rule starting with '- ' or '\* '."
  - `processRooContent`:
    - Input is now the direct LLM response (expected to be a list of rules).
    - Clean this response (remove extraneous text, ensure it's a valid markdown list).
    - The existing `MarkdownListParser.extractListItems` might still be useful if the LLM output is not perfectly clean.
    - The rule count check should be consolidated and performed on the LLM's direct output after basic cleaning.
    - Return the cleaned list of rules as a string.

**Implementation Details**:

```typescript
// In generateRooSystemPrompts method:
// ...
const baseCombinedContent = rulesContent + "\n" + templateContent; // Store this

// ... call buildModeRooPrompt, passing rulesContent and templateContent
const promptResult = this.buildModeRooPrompt(
  projectContext,
  rulesContent, // Pass directly
  templateContent, // Pass directly
  modeName
);
// ...

// ... after getRooCompletion
const llmGeneratedRulesList = completionResult.value;

// ... call processRooContent with llmGeneratedRulesList
const processedResult = this.processRooContent(llmGeneratedRulesList); // This will also handle rule count logging internally or return data for it
// ...
const processedLLMRules = processedResult.value; // This is the string of rules

// Rule count check (can be inside processRooContent or here based on its return)
// Assuming processRooContent returns the rule string, and we count here:
const ruleLines = processedLLMRules.split('\n').filter((line: string) => line.trim().startsWith('- ') || line.trim().startsWith('* '));
const ruleCount = ruleLines.length;
const MIN_RULES = 100;
if (ruleCount < MIN_RULES && processedLLMRules.trim().length > 0) { // only warn if rules were expected but count is low
  this.logger.warn(
    `LLM generated only ${ruleCount} rules for mode "${modeName}". Minimum required is ${MIN_RULES}. Proceeding with available rules.`
  );
} else if (processedLLMRules.trim().length === 0) {
    this.logger.warn(`No rules generated by LLM or processed for mode "${modeName}".`);
}


// ... Concatenate for final output
const finalContent = baseCombinedContent + "\n" + processedLLMRules; // Append LLM rules

// ... Correct outputPath
const outputPath = path.join('.roo', \`system-prompt-${modeName}.md\`); // Ensure .md extension

// In buildModeRooPrompt method:
private buildModeRooPrompt(
  projectContext: ProjectContext, // Keep for potential future use in user prompt
  rooRulesContent: string,
  modeTemplateContent: string,
  modeName: string // Keep for logging or minor prompt adjustments
): Result<{ systemPrompt: string; userPrompt: string }, Error> {
  try {
    this.logger.debug(\`Building prompts for mode "${modeName}" with combined base content.\`);
    const systemPrompt = rooRulesContent + "\n" + modeTemplateContent;

    // User prompt instructing LLM to generate ONLY the list
    const userPrompt = \`Based on the context provided in the system prompt (which includes general rules and mode-specific guidelines for "${modeName}"), generate an additional markdown list of AT LEAST 100 new, distinct, actionable rules. These new rules should expand upon the provided context, incorporating principles like KISS (Keep It Simple, Stupid), SOLID, OOP (Object-Oriented Programming), and DRY (Don't Repeat Yourself). Your response MUST consist *only* of this new markdown list. Each rule in the list should start with '- ' or '* '. Do not include any introductory text, concluding remarks, or code blocks.\`;

    this.logger.debug(\`System prompt for mode "${modeName}" is the combined base content.\`);
    this.logger.debug(\`User prompt for mode "${modeName}" instructs generation of rule list only.\`);

    return Result.ok({ systemPrompt, userPrompt });
  } catch (error: unknown) { // Ensure 'error' is typed
    const message =
        error instanceof Error ? error.message : 'Unknown error building mode-specific prompts';
    const errorInstance = error instanceof Error ? error : new Error(message);
    this.logger.error(\`Error in buildModeRooPrompt for mode "${modeName}": ${message}\`, errorInstance);
    return Result.err(errorInstance);
  }
}

// In processRooContent method:
private processRooContent(llmOutput: string): Result<string, Error> {
  try {
    let cleanedContent = llmOutput.trim();

    const stripResult = this.contentProcessor.stripMarkdownCodeBlock(cleanedContent);
    if (stripResult.isOk()) {
      cleanedContent = stripResult.value.trim(); // trim again after stripping
    } else {
      this.logger.warn('Failed to strip markdown from LLM output, proceeding with potentially uncleaned content for list extraction.');
    }

    // If after stripping, content is empty, no rules.
    if (cleanedContent.length === 0) {
        this.logger.warn('LLM output for rules is empty after initial cleaning.');
        return Result.ok(""); // Return empty string, rule count check in caller will handle logging.
    }

    // Attempt to extract list items. If LLM behaves, cleanedContent *is* the list.
    const rulesResult = MarkdownListParser.extractListItems(cleanedContent);
    let finalRulesString: string;

    if (rulesResult.isOk() && rulesResult.value.length > 0) {
      finalRulesString = rulesResult.value.map((rule: string) => rule.trim()).join('\n');
    } else {
      // If extraction fails or returns empty, check if cleanedContent itself is a list.
      const lines = cleanedContent.split('\n').map(line => line.trim());
      const isList = lines.every(line => line.startsWith('- ') || line.startsWith('* ') || line.length === 0);
      if (isList) {
        finalRulesString = lines.filter(line => line.length > 0).join('\n');
        if (rulesResult.isErr()) {
             this.logger.warn(\`MarkdownListParser failed to extract list items, but content appears to be a list. Using raw cleaned content. Error: ${rulesResult.error.message}\`);
        }
      } else {
        this.logger.warn(\`Could not extract a markdown list from LLM output, and content does not appear to be a list. LLM output (first 100 chars): "${cleanedContent.substring(0,100)}..."\`);
        finalRulesString = ""; // No valid list found
      }
    }

    if (finalRulesString.trim().length === 0) {
      this.logger.warn('Processed LLM rules content is effectively empty.');
    }

    return Result.ok(finalRulesString);
  } catch (error: unknown) { // Ensure 'error' is typed
    const message =
        error instanceof Error ? error.message : 'Unknown error processing roo content';
    const errorInstance = error instanceof Error ? error : new Error(message);
    this.logger.error(\`Error in processRooContent: ${message}\`, errorInstance);
    return Result.err(errorInstance);
  }
}
```

**Testing Requirements**:

- Unit tests for `buildModeRooPrompt` to verify correct system and user prompt construction.
- Unit tests for `processRooContent` with various LLM outputs (clean list, list with surrounding text, list with code blocks, empty/invalid output).
- Unit tests for `generateRooSystemPrompts` (mocking dependencies like `RooFileOpsHelper`, `LLMAgent`) to verify:
  - Correct file reading and content aggregation.
  - Correct calls to `buildModeRooPrompt` and `processRooContent`.
  - Correct final content concatenation.
  - Correct output path including `.md` extension.
  - Rule count warning logic.
  - Error handling for each step.

**Related Acceptance Criteria**: AC1, AC2, AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10.

**Estimated effort**: 2-3 hours (for a Senior Developer familiar with the codebase).

**Required Delegation Components**:

- Implementation components for Junior Coder:
  - Given the interconnected nature of changes within `AiMagicGenerator.ts`, direct delegation of implementation components within this subtask is challenging. The Senior Developer should handle the primary refactoring.
- Testing components for Junior Tester:
  - Unit tests for the refactored `buildModeRooPrompt` method.
  - Unit tests for the refactored `processRooContent` method, covering various LLM response scenarios.

**Delegation Success Criteria**:

- Junior Coder components (if any): Must be fully unit-tested, adhere to coding standards, and integrate seamlessly.
- Junior Tester components: Test suites must achieve high coverage for the specified methods and scenarios, verifying all logic paths and edge cases. Tests should be well-documented.

### Subtask 2: Integration Testing and Final Adjustments

**Status**: Not Started

**Description**: Perform integration testing of the `AiMagicGenerator`'s roo generation feature. This involves running the generator for various modes and verifying the output files against all acceptance criteria. Make any necessary final adjustments to logic, logging, or error handling based on test results.

**Files to Modify**:

- [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts) (if adjustments are needed).
- Potentially test setup files or mock configurations.

**Implementation Details**:

- Manually trigger the `AiMagicGenerator` for a few representative modes (e.g., `boomerang`, `architect`).
- Inspect the generated `.roo/system-prompt-[modeName].md` files.
- Verify:
  - File existence and correct naming.
  - Presence and correctness of `roo-rules.md` content at the start.
  - Presence and correctness of mode-specific prompt content following `roo-rules.md`.
  - Appended markdown list of rules.
  - Rule count (at least 100, or warning logged).
  - (Manual check) Presence of KISS, SOLID, OOP, and DRY guidelines in the generated rules.
- Check logs for correct information, warnings, and any errors.

**Testing Requirements**:

- End-to-end testing scenarios for the roo generation flow.
- Verification of all acceptance criteria on actual generated files.

**Related Acceptance Criteria**: All.

**Estimated effort**: 1-2 hours.

**Required Delegation Components**:

- Implementation components for Junior Coder: Not applicable for this subtask (focus is on integration and minor adjustments by Senior Dev).
- Testing components for Junior Tester:
  - Execution of pre-defined integration test scenarios.
  - Documenting results and comparing against acceptance criteria.
  - Creating new integration test cases if gaps are found.

**Delegation Success Criteria**:

- Junior Tester components: Thorough execution of tests, detailed reporting of any discrepancies or failures, and clear verification of each acceptance criterion.

## 5. Implementation Sequence

1.  **Subtask 1: Refactor Core Roo Generation Logic** - This is the primary development task and must be completed first.
2.  **Subtask 2: Integration Testing and Final Adjustments** - This task verifies the changes from Subtask 1 and ensures all ACs are met.

## 6. Testing Strategy

- **Unit Testing**:
  - `buildModeRooPrompt`: Verify correct prompt assembly based on inputs.
  - `processRooContent`: Test with various LLM response formats (perfect list, list with noise, malformed list, empty response) to ensure robust parsing and cleaning.
  - `generateRooSystemPrompts`: Mock dependencies to test the orchestration logic:
    - Correct reading of `roo-rules.md` and mode-specific templates.
    - Correct formation of `baseCombinedContent`.
    - Correct parameters passed to `buildModeRooPrompt` and `processRooContent`.
    - Correct assembly of `finalContent` (`baseCombinedContent` + LLM rules).
    - Verification of rule count warning.
    - Correct output file path generation (including `.md`).
- **Integration Testing**:
  - Run `AiMagicGenerator` for `roo` generation.
  - Select 2-3 modes for testing.
  - Manually inspect the generated `.roo/system-prompt-[modeName].md` files to confirm:
    - `roo-rules.md` content is first.
    - Mode-specific prompt content is second.
    - LLM-generated rules list is appended.
    - List has >= 100 items (or warning logged).
    - Rules appear to follow KISS, SOLID, OOP, and DRY (manual spot check).
  - Check application logs for correct flow, warnings, and errors.
- **Manual Verification**:
  - The AC regarding KISS, SOLID, OOP, and DRY principles in generated rules will primarily rely on manual inspection of the output, guided by the LLM prompt.

This strategy ensures that individual components behave as expected and that the overall feature works correctly from end-to-end, satisfying all acceptance criteria.
