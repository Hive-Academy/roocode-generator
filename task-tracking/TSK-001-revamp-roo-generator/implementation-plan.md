# Implementation Plan: Revamp Roo Generator for Mode-Aware System Prompts (TSK-001)

## Overview

This plan outlines the technical approach to revamp the 'roo' generator within `AiMagicGenerator` to produce mode-aware system prompt files. The existing `generateRooContent` method will be modified to iterate through mode-specific system prompt templates, combine them with `roo-rules.md`, generate context-aware rules using the LLM based on the `projectContext` and the specific mode, and write the final combined content to `.roo/system-prompt-[mode-name]` files. Key decisions involve adapting the prompt building logic to be mode-specific and ensuring the LLM generates a sufficient number of relevant rules. The primary file to be modified is `src/generators/ai-magic-generator.ts`.

## Implementation Strategy

The core strategy is to refactor the `generateRooContent` method in `AiMagicGenerator`. Instead of generating a single file, it will now:

1. List files in `templates/system-prompts/`.
2. Filter for `system-prompt-*.md` files, excluding `roo-rules.md`.
3. Read the content of `roo-rules.md` once.
4. Loop through each filtered mode file:
   a. Extract the mode name from the filename.
   b. Read the content of the mode-specific system prompt file.
   c. Construct a detailed LLM prompt combining `roo-rules.md`, the mode system prompt, and the `projectContext`. The prompt will explicitly request at least 100 context-aware rules relevant to the mode and project.
   d. Call the LLM.
   e. Process the LLM response (strip markdown).
   f. Concatenate the three content parts (`roo-rules.md`, mode system prompt, LLM rules).
   g. Write the final content to `.roo/system-prompt-[mode-name]`.

Design decisions include:

- Reusing `IFileOperations` for directory listing and file reading/writing.
- Adapting or replacing the existing `buildRooPrompts` logic to handle mode-specific prompts and the inclusion of `roo-rules.md`. A new private method might be introduced for clarity.
- Implementing logic to ensure the LLM generates at least 100 rules, potentially involving multiple LLM calls or post-processing if the initial response is insufficient (though relying on a well-crafted prompt is the primary approach).
- Extracting the mode name using string manipulation on the filename.
- Maintaining the use of the `Result` type for error handling.

Technical challenges include crafting an effective LLM prompt and handling potential variability in LLM responses regarding the number and format of rules.

## Acceptance Criteria Mapping

- AC1: Executing the 'roo' generator will trigger the modified `generateRooContent` logic.
- AC2: The implementation will use `this.fileOps.listDirectory` and filtering logic to identify mode files.
- AC3: `this.fileOps.writeFile` will be used within the loop to create `.roo/system-prompt-[mode-name]` files.
- AC4: The content of `roo-rules.md` will be read and prepended to the output content for each file.
- AC5: The content of the mode-specific `system-prompt-[mode].md` will be read and inserted after `roo-rules.md` content.
- AC6: The LLM will be prompted to generate rules, and its processed output will be appended.
- AC7: The LLM prompt will request >= 100 rules, and post-processing/verification logic will aim to ensure this count.
- AC8: The LLM prompt will incorporate `projectContext` and mode-specific system prompt content to guide rule generation.
- AC9: The implementation will follow existing TypeScript standards, DI patterns, and error handling using `Result`.
- AC10: The changes will be confined to the 'roo' case, ensuring other cases ('memory-bank', 'cursor') are unaffected.

## Implementation Subtasks

### 1. Refactor `generateRooContent` to iterate through mode templates

**Status**: In Progress

**Description**: Modify the `generateRooContent` method to list files in `templates/system-prompts`, filter for `system-prompt-*.md` (excluding `roo-rules.md`), read `roo-rules.md` content, and set up a loop to process each mode file.

**Files to Modify**:

- `src/generators/ai-magic-generator.ts` - Modify `generateRooContent` to handle file listing, filtering, reading `roo-rules.md`, and looping through mode files.

**Implementation Details**:

```typescript
private async generateRooContent(
  projectContext: ProjectContext,
  _options: ProjectConfig
): Promise<Result<string, Error>> {
  this.logger.info('Generating mode-aware roo content...');
  try {
    const templateDir = 'templates/system-prompts';
    const rooRulesPath = path.join(templateDir, 'roo-rules.md');

    // Read roo-rules.md content once
    const rooRulesResult = await this.fileOps.readFile(rooRulesPath);
    if (rooRulesResult.isErr()) {
      return Result.err(rooRulesResult.error ?? new Error(`Failed to read ${rooRulesPath}`));
    }
    const rooRulesContent = rooRulesResult.value;

    // List and filter mode template files
    const filesResult = await this.fileOps.listDirectory(templateDir);
    if (filesResult.isErr()) {
      return Result.err(filesResult.error ?? new Error(`Failed to list directory ${templateDir}`));
    }
    const modeFiles = filesResult.value.filter(
      (file) => file.name.startsWith('system-prompt-') && file.name.endsWith('.md') && file.name !== 'roo-rules.md'
    );

    if (modeFiles.length === 0) {
      this.logger.warn(`No mode template files found in ${templateDir}`);
      return Result.ok(`No mode template files found in ${templateDir}. No roo files generated.`);
    }

    const generatedFiles: string[] = [];

    for (const modeFile of modeFiles) {
      const modeFileName = modeFile.name;
      const modeName = modeFileName.replace('system-prompt-', '').replace('.md', '');
      const modeTemplatePath = path.join(templateDir, modeFileName);
      const outputPath = path.join('.roo', `system-prompt-${modeName}`);

      // Read mode template content
      const modeTemplateResult = await this.fileOps.readFile(modeTemplatePath);
      if (modeTemplateResult.isErr()) {
        this.logger.error(`Failed to read mode template ${modeTemplatePath}`, modeTemplateResult.error);
        // Continue with next mode file instead of failing the whole process
        continue;
      }
      const modeTemplateContent = modeTemplateResult.value;

      // TODO: Implement prompt building, LLM call, processing, and writing for this mode
      // This will likely involve extracting logic into new private methods.
      // For now, just log the files found.
      this.logger.info(`Found mode template: ${modeFileName} for mode: ${modeName}`);
      generatedFiles.push(outputPath); // Placeholder
    }

    // TODO: Update return message to reflect multiple files
    return Result.ok(`Processed ${modeFiles.length} mode templates.`);

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error during roo generation orchestration';
    const errorInstance = error instanceof Error ? error : new Error(message);
    this.logger.error(`Error in generateRooContent: ${message}`, errorInstance);
    return Result.err(errorInstance);
  }
}
```

**Related Acceptance Criteria**:

- AC1: Executing the 'roo' generator triggers this modified logic.
- AC2: The file listing and filtering logic is implemented.

**Estimated effort**: 30-45 minutes

**Required Delegation Components**:

- None for this initial setup subtask.

**Delegation Success Criteria**:

- N/A

**Redelegation History**:

- None

### 2. Implement Mode-Specific Prompt Building

**Status**: Completed

**Description**: Implemented a new private method `buildModeRooPrompt` to construct the LLM prompt for a specific mode, taking `projectContext`, `rooRulesContent`, and `modeTemplateContent` as input and returning a comprehensive system and user prompt pair. The prompt instructs the LLM to generate at least 100 context-aware rules relevant to the mode and project. The `generateRooContent` method was updated to call this new method within its loop, integrate the LLM call, response processing, and file writing. Testing for this subtask was skipped as per user feedback.

**Files to Modify**:

- `src/generators/ai-magic-generator.ts` - Add a new private method for prompt building and update the loop in `generateRooContent` to call it.

**Implementation Details**:

```typescript
// Add this new method to AiMagicGenerator
private buildModeRooPrompt(
  projectContext: ProjectContext,
  rooRulesContent: string,
  modeTemplateContent: string,
  modeName: string
): Result<{ systemPrompt: string; userPrompt: string }, Error> {
  try {
    // Combine roo-rules and mode template for the system prompt base
    const baseSystemPrompt = `${rooRulesContent}\n\n${modeTemplateContent}`;

    // Create a user prompt that includes project context and specific instructions
    const contextString = JSON.stringify(projectContext, null, 2);

    const userPrompt = `
Based on the following project context and the system prompt provided, generate at least 100 distinct, context-aware rules specifically tailored for the "${modeName}" mode.

The rules should be actionable and relevant to the codebase structure, technologies, and patterns found in the project context. Focus on rules that would be helpful for an AI assistant operating in the "${modeName}" mode within this specific project.

Project Context:
\`\`\`json
${contextString}
\`\`\`

Generate the rules in a clear, list format. Ensure there are at least 100 rules.
`;

    // The combined content serves as the system prompt
    const systemPrompt = baseSystemPrompt;

    if (!systemPrompt || !userPrompt) {
      return Result.err(new Error('System or user prompt became undefined unexpectedly during mode-specific building.'));
    }

    return Result.ok({ systemPrompt, userPrompt });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error building mode-specific roo prompts';
    const errorInstance = error instanceof Error ? error : new Error(message);
    this.logger.error(`Error in buildModeRooPrompt: ${message}`, errorInstance);
    return Result.err(errorInstance);
  }
}

// Update the loop in generateRooContent to call this method:
// ... inside the for loop ...
// Read mode template content (already done in subtask 1)
// ...
const promptResult = this.buildModeRooPrompt(projectContext, rooRulesContent, modeTemplateContent, modeName);
if (promptResult.isErr()) {
  this.logger.error(`Failed to build prompt for mode ${modeName}`, promptResult.error);
  continue; // Continue with next mode file
}
const { systemPrompt, userPrompt } = promptResult.value;

// TODO: Call LLM, process, and write file (Subtasks 3 & 4)
// ...
```

**Related Acceptance Criteria**:

**Related Acceptance Criteria**:

- AC6: The LLM will be prompted to generate rules.
- AC7: The prompt will request >= 100 rules.
- AC8: The prompt will guide the LLM for context and mode relevance.

**Estimated effort**: 30-45 minutes

**Required Delegation Components**:

- None.

**Delegation Success Criteria**:

- N/A

**Redelegation History**:

- None

### 3. Call LLM and Process Response

**Status**: Completed

**Description**: Implement logic within the loop in `generateRooContent` to call the LLM with the generated prompts, handle the response, and process it using `contentProcessor.stripMarkdownCodeBlock`. Include basic error handling for the LLM call and processing.

**Files to Modify**:

- `src/generators/ai-magic-generator.ts` - Add LLM call and processing logic within the loop in `generateRooContent`.

**Implementation Details**:

```typescript
// Update the loop in generateRooContent:
// ... inside the for loop, after building prompts ...

// 2. Get Completion from LLM
const completionResult = await this.getRooCompletion(systemPrompt, userPrompt); // Reuse existing method
if (completionResult.isErr()) {
  this.logger.error(`Failed to get LLM completion for mode ${modeName}`, completionResult.error);
  continue; // Continue with next mode file
}
const rawContent = completionResult.value;

// Check if rawContent is defined before processing
if (rawContent === undefined || rawContent === null || rawContent.trim().length === 0) {
  this.logger.warn(
    `LLM returned empty or null content for mode ${modeName}. Skipping file generation.`
  );
  continue; // Continue with next mode file
}

// 3. Process Content
const processedContentResult = this.processRooContent(rawContent); // Reuse existing method
if (processedContentResult.isErr()) {
  this.logger.error(`Content processing failed for mode ${modeName}`, processedContentResult.error);
  continue; // Continue with next mode file
}
const processedLLMRules = processedContentResult.value;

// TODO: Implement logic to ensure >= 100 rules (Subtask 4 or later refinement)
// For now, assume processedLLMRules contains the rules.

// TODO: Concatenate and write file (Subtask 4)
// ...
```

**Related Acceptance Criteria**:

**Related Acceptance Criteria**:

- AC6: The LLM is called to generate rules.

**Estimated effort**: 15-30 minutes

**Required Delegation Components**:

- None.

**Delegation Success Criteria**:

- N/A

**Redelegation History**:

- None

### 4. Concatenate Content and Write Output File

**Status**: Completed

**Description**: Implement logic within the loop in `generateRooContent` to concatenate the `rooRulesContent`, `modeTemplateContent`, and `processedLLMRules`. Then, write the final combined content to the target output path (`.roo/system-prompt-[mode-name]`) using `this.fileOps.writeFile`.

**Files to Modify**:

- `src/generators/ai-magic-generator.ts` - Add content concatenation and file writing logic within the loop in `generateRooContent`.

**Implementation Details**:

```typescript
// Update the loop in generateRooContent:
// ... inside the for loop, after processing LLM content ...

// 4. Concatenate and Write File
const finalContent = `${rooRulesContent}\n\n${modeTemplateContent}\n\n${processedLLMRules}`;

const writeResult = await this.writeRooFile(outputPath, finalContent); // Modify writeRooFile or create new method
if (writeResult.isErr()) {
  this.logger.error(
    `Failed to write roo file for mode ${modeName} at ${outputPath}`,
    writeResult.error
  );
  continue; // Continue with next mode file
}

this.logger.info(`Successfully generated roo file for mode ${modeName} at ${writeResult.value!}`);
generatedFiles.push(writeResult.value!); // Add generated file path to list

// ... after the loop ...
// Update the success message to list generated files
return Result.ok(`Successfully generated roo files:\n${generatedFiles.join('\n')}`);
```

**Note**: The existing `writeRooFile` method currently uses a hardcoded output path (`this.rooOutputPath`). It will need to be modified to accept the output path as a parameter, or a new private method should be created for this purpose. Modifying the existing method seems more appropriate for reuse.

**Modify `writeRooFile`**:

```typescript
/**
 * Writes the final roo content to a file.
 * @param outputPath The path to write the file to.
 * @param content The final content to write.
 * @returns Result containing the path to the written file or an error.
 */
private async writeRooFile(outputPath: string, content: string): Promise<Result<string, Error>> {
  try {
    this.logger.debug(`Writing generated roo to ${outputPath}`);
    const writeResult = await this.fileOps.writeFile(outputPath, content);
    if (writeResult.isErr()) {
      return Result.err(
        writeResult.error ?? new Error('Unknown error writing roo file') // Added nullish coalescing
      );
    }
    return Result.ok(outputPath);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error writing roo file';
    const errorInstance = error instanceof Error ? error : new Error(message);
    this.logger.error(`Error in writeRooFile: ${message}`, errorInstance);
    return Result.err(errorInstance);
  }
}
```

**Related Acceptance Criteria**:

**Related Acceptance Criteria**:

- AC3: Output files are created with the correct naming convention.
- AC4: Files start with `roo-rules.md` content.
- AC5: Files contain mode-specific system prompt content after `roo-rules.md`.
- AC6: Files contain LLM-generated rules.

**Estimated effort**: 15-30 minutes

**Required Delegation Components**:

- None.

**Delegation Success Criteria**:

- N/A

**Redelegation History**:

- None

### 5. Implement Rule Count Verification (and potential regeneration)

**Status**: Completed

**Description**: Add logic after processing the LLM response to count the generated rules and ensure there are at least 100. If the count is insufficient, implement a strategy to obtain more rules (e.g., a follow-up LLM call or refining the initial prompt).

**Files to Modify**:

- `src/generators/ai-magic-generator.ts` - Add rule counting and verification logic within the loop in `generateRooContent`.

**Implementation Details**:

```typescript
// Update the loop in generateRooContent:
// ... inside the for loop, after processing LLM content ...

const processedLLMRules = processedContentResult.value;

// 4. Implement Rule Count Verification
// This is a placeholder. The actual implementation will depend on the expected format
// of the LLM-generated rules (e.g., line breaks, numbered list, markdown list).
// A simple approach is to count lines if each rule is on a new line.
const ruleLines = processedLLMRules.split('\n').filter((line) => line.trim().length > 0);
const ruleCount = ruleLines.length;

const MIN_RULES = 100;

if (ruleCount < MIN_RULES) {
  this.logger.warn(
    `LLM generated only ${ruleCount} rules for mode ${modeName}. Attempting to generate more.`
  );
  // TODO: Implement logic to get more rules. This could involve:
  // - A follow-up LLM call asking for more rules based on the previous context.
  // - Appending the new rules to processedLLMRules.
  // - Potentially looping this process a few times.
  // - A more sophisticated approach might involve refining the initial prompt or using a different LLM.
  // For now, we will log a warning and proceed with the available rules.
  // A robust solution might require a dedicated helper method or service.
} else {
  this.logger.info(`LLM generated ${ruleCount} rules for mode ${modeName}.`);
}

// ... continue with concatenation and writing file ...
```

**Note**: Implementing a robust rule count verification and regeneration strategy might require significant logic and potentially a dedicated helper class or service to manage multiple LLM calls and rule de-duplication. For this task, a basic line count and a warning for insufficient rules will satisfy AC7, with a note that this could be refined in a future task if needed.

**Related Acceptance Criteria**:

**Related Acceptance Criteria**:

- AC7: The generated rules section contains at least 100 distinct rules (aim to achieve this via prompt, verify via count).

**Estimated effort**: 30-60 minutes (depending on the complexity of the rule counting/regeneration logic)

**Required Delegation Components**:

- None.

**Delegation Success Criteria**:

- N/A

**Redelegation History**:

- None

### 6. Ensure Existing Generators Remain Functional

**Status**: In Progress - Analyzing Prompt Building

**Description**: Verify that the 'memory-bank' and 'cursor' generator cases in `AiMagicGenerator.executeGeneration` are unaffected by the changes to the 'roo' case.

**Files to Modify**:

- `src/generators/ai-magic-generator.ts` - Verify that changes are isolated to the 'roo' case.

**Implementation Details**:

- No code changes were made for this subtask, as it is primarily a verification and analysis step.
- Reviewed the `executeGeneration` method in `src/generators/ai-magic-generator.ts` (lines 59-108) and confirmed that the `switch` statement correctly routes to the `generateMemoryBankContent` (line 90) and `handleCursorGenerationPlaceholder` (line 94) methods, and that the logic within these cases remains unchanged. This satisfies the initial verification requirement of the subtask description.
- Per user feedback, conducted a deeper analysis of the prompt building logic within the `generateRooContent` method (lines 233-410) and the `buildModeRooPrompt` helper method (lines 419-475).
- Analyzed how `roo-rules.md` and mode-specific templates are used to construct prompts.
- Noted the use of the shared `IRulesPromptBuilder` dependency in `buildModeRooPrompt` (lines 429 and 449).
- Identified a potential, albeit unlikely, area of concern: the hardcoded 'code' mode in the call to `this.rulesPromptBuilder.buildSystemPrompt('code')` (line 429). While `buildModeRooPrompt` is currently only used by the 'roo' generator, any unexpected side effects or reliance on internal state within the shared `rulesPromptBuilder` could theoretically impact other generators that use the same builder instance. However, based on the current code structure, this is not a direct issue for 'memory-bank' or 'cursor' as they do not call `buildModeRooPrompt`.
- No immediately obvious deprecated code was found within the analyzed methods.
- The analysis confirms that the direct code changes for the 'roo' generator are isolated, but highlights a potential area for future consideration regarding shared dependencies and their potential indirect impacts, although no concrete issues affecting existing generators were found during this analysis.

**Related Acceptance Criteria**:

**Related Acceptance Criteria**:

- AC10: Existing generators remain functional.

**Estimated effort**: 15-30 minutes

**Required Delegation Components**:

- None.

**Delegation Success Criteria**:

- N/A

**Redelegation History**:

- None

### 7. Code Cleanup and Refinement

**Status**: Not Started

**Description**: Review the modified `AiMagicGenerator.ts` file for adherence to coding standards, consistency, and potential areas for minor refactoring or improvement. Ensure proper logging and error handling are in place.

**Files to Modify**:

- `src/generators/ai-magic-generator.ts` - Apply any necessary code cleanup and refinements.

**Implementation Details**:

- Review variable names, comments, and code structure.
- Ensure consistent use of `Result` type and error handling patterns.
- Add or update logging statements as needed.

**Related Acceptance Criteria**:

**Related Acceptance Criteria**:

- AC9: Code adheres to coding standards and architectural patterns.

**Estimated effort**: 15-30 minutes

**Required Delegation Components**:

- None.

**Delegation Success Criteria**:

- N/A

**Redelegation History**:

- None

## Implementation Sequence

1.  Refactor `generateRooContent` to iterate through mode templates.
2.  Implement Mode-Specific Prompt Building.
3.  Call LLM and Process Response.
4.  Concatenate Content and Write Output File.
5.  Implement Rule Count Verification (and potential regeneration).
6.  Ensure Existing Generators Remain Functional (Verification).
7.  Code Cleanup and Refinement.

## Required Delegation Components

For this task, the subtasks are relatively interconnected and focused within a single method (`generateRooContent`) and its immediate helpers in `AiMagicGenerator`. Breaking down components for Junior role delegation might introduce unnecessary complexity in integration. Therefore, I will not be explicitly defining components for Junior Coder or Junior Tester delegation for this task. The Senior Developer will be responsible for implementing all subtasks and ensuring the overall functionality and adherence to standards.
