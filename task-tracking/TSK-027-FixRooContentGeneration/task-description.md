# Task Description: Fix AiMagicGenerator Roo Content Generation

## Task Overview

Fix the logic in `AiMagicGenerator` responsible for generating mode-aware roo files. The current implementation incorrectly replaces the entire file content with only the LLM-generated rule list. The fix should ensure the generated file includes the base roo rules, the mode-specific system prompt, and an appended list of new LLM-generated rules.

## Current Implementation Analysis

The `generateRooContent` method in [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts) orchestrates the roo file generation for each mode. It reads the base roo rules (`templates/system-prompts/roo-rules.md`) and the mode-specific system prompt (`templates/system-prompts/system-prompt-*.md`). It then calls `getRooCompletion` to get LLM output and `processRooContent` to process this output. The `processRooContent` method (lines 186-234) uses `MarkdownListParser.extractListItems` (line 202) which extracts _only_ markdown list items, effectively discarding all other content from the LLM response. The result of `processRooContent` (just the list) is then written to the output file (line 436). This deviates from the requirement to include the base rules and mode prompt content.

## Component Structure

- [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts): Contains the `generateRooContent` and `processRooContent` methods.
- [`templates/system-prompts/roo-rules.md`](templates/system-prompts/roo-rules.md): Base rules content.
- `templates/system-prompts/system-prompt-*.md`: Mode-specific system prompt content.
- `RooFileOpsHelper`: Used for reading template files.
- `LLMAgent`: Used for getting LLM completions.
- `IContentProcessor`: Used for stripping markdown code blocks (currently used in `processRooContent`).
- `MarkdownListParser`: Used for extracting list items (currently used in `processRooContent`, needs to be used differently or replaced).
- `IRulesPromptBuilder`: Used for building prompts (might need adjustment or its usage pattern changed).

## Detailed Requirements

1.  For each mode:
    a. Read the content of [`templates/system-prompts/roo-rules.md`](templates/system-prompts/roo-rules.md).
    b. Read the content of the corresponding mode-specific system prompt file (e.g., `templates/system-prompts/system-prompt-boomerang.md`).
    c. Combine the content from steps 1a and 1b. This combined content will serve as the _context_ for the LLM.
    d. Construct a user prompt that instructs the LLM to generate a _list_ of at least 100 new rules based on the provided context (combined content from 1c) and the project context. The new rules must include guidelines related to KISS, SOLID, and OOP principles. The LLM should be instructed to output _only_ the list of rules, formatted as a markdown list.
    e. Call the `LLMAgent` with the combined content (as system prompt or part of user prompt/context, depending on LLM agent capabilities and `IRulesPromptBuilder` usage) and the user prompt from 1d.
    f. Process the LLM response to extract _only_ the generated list of rules. Ensure any conversational text or markdown code blocks around the list are removed.
    g. Verify that the generated list contains at least 100 rules. Log a warning if the count is less than 100, but proceed with the available rules.
    h. Combine the original content from steps 1a and 1b with the extracted list of new rules from 1f. The new rules list should be appended to the end of the combined original content.
    i. Write the final combined content to the mode-specific roo file (e.g., `.roo/system-prompt-boomerang.md`).

## Acceptance Criteria Checklist

- [ ] The generated roo file for each processed mode exists at `.roo/system-prompt-[modeName].md`.
- [ ] The content of the generated roo file starts with the exact content of [`templates/system-prompts/roo-rules.md`](templates/system-prompts/roo-rules.md).
- [ ] Immediately following the `roo-rules.md` content, the generated file contains the exact content of the corresponding mode-specific system prompt file (`templates/system-prompts/system-prompt-[modeName].md`).
- [ ] The generated file contains a markdown list (`- ` or `* ` followed by text) appended after the combined content from `roo-rules.md` and the mode prompt.
- [ ] The appended markdown list contains at least 100 items (rules).
- [ ] The appended rules include guidelines related to KISS, SOLID, and OOP principles (verification by manual inspection or targeted LLM analysis if possible).
- [ ] The `processRooContent` function is either modified to support this new flow or replaced by new logic within `generateRooContent`.
- [ ] The `buildModeRooPrompt` function is updated or its usage pattern changed to correctly provide the combined context and the specific instruction to generate _only_ the rule list to the LLM.
- [ ] Error handling is robust for file reading, LLM calls, content processing, and file writing.
- [ ] Appropriate logging is present to indicate the progress and any warnings (e.g., rule count below 100).

## Implementation Guidance

- Modify `generateRooContent` to read both `roo-rules.md` and the mode template file content upfront.
- Adjust the prompt building logic, potentially within `generateRooContent` or by modifying `buildModeRooPrompt`, to send the combined content as context/system prompt and instruct the LLM to generate _only_ the list of new rules.
- Update or replace the logic currently in `processRooContent` to handle the LLM's response, extracting _only_ the list while discarding surrounding text.
- Concatenate the original combined content with the extracted rule list before writing the file.
- Ensure the minimum rule count check is performed on the extracted list.

## File and Component References

- [`src/generators/ai-magic-generator.ts`](src/generators/ai-magic-generator.ts) (primary file to modify)
- [`templates/system-prompts/roo-rules.md`](templates/system-prompts/roo-rules.md) (content to include)
- `templates/system-prompts/system-prompt-*.md` (content to include)
- `RooFileOpsHelper` (for reading files)
- `LLMAgent` (for LLM interaction)
- `IContentProcessor` (potentially useful for cleaning LLM output)
- `MarkdownListParser` (potentially useful for parsing the generated list)
- `IRulesPromptBuilder` (needs review/adjustment)
