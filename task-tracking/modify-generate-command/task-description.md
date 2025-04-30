# Task Description: Modify `--generate` Command and `--generators` Flag

## Task ID: modify-generate-command

## Task Name: Modify Generate Command

## Description

Modify the `roocode-generator` CLI to change the behavior of the `--generate` command and the `--generators` flag.

The `--generate` command should now implicitly run the `ai-magic` command. The `--generators` flag will be used to specify which type of content to generate within the `ai-magic` context.

The `--generators` flag should accept the following values:

- `memory-bank`: Generate memory bank content.
- `roo`: Generate rules (renaming from `rules`).
- `cursor`: Generate cursor-related content (for future use, initial implementation can be a placeholder or simple output).

The implementation should be designed with extensibility in mind to easily add support for generating system prompts in the future.

## Functional Requirements

- When `--generate` is used, the `ai-magic` command is executed automatically.
- The `--generators` flag accepts `memory-bank`, `roo`, and `cursor` as valid values.
- The `--generators` flag determines which specific generation process is triggered within the `ai-magic` execution.
- The CLI help text and documentation should be updated to reflect these changes.

## Technical Requirements

- Identify and modify the CLI parsing logic to handle the new `--generate` and `--generators` behavior.
- Update the generator orchestration logic to correctly map `--generators` flag values to the appropriate generator execution paths.
- Ensure the code structure allows for easy addition of new generator types (e.g., system prompts) in the future.
- Rename internal references from 'rules' to 'roo' where applicable in the context of this flag and related logic.
- Implement basic placeholder logic for the `cursor` generator type.

## Constraints

- The core functionality of existing generators (`ai-magic`, `roomodes`, `system-prompts`, `vscode-copilot-rules`) should remain intact, although their invocation method might change for `ai-magic`.
- The changes should not introduce breaking changes for other existing CLI commands (if any).

## Acceptance Criteria

- Running `roocode-generator --generate --generators memory-bank` successfully triggers the memory bank generation process via `ai-magic`.
- Running `roocode-generator --generate --generators roo` successfully triggers the rules generation process via `ai-magic`.
- Running `roocode-generator --generate --generators cursor` executes the placeholder logic for cursor generation.
- The CLI help message reflects the updated `--generate` and `--generators` flag usage and options.
- The code structure is demonstrably extensible for adding new generator types.

## Related Documentation

- memory-bank/ProjectOverview.md
- memory-bank/TechnicalArchitecture.md
- memory-bank/DeveloperGuide.md
- src/core/cli/cli-main.ts (Likely entry point for CLI parsing)
- src/core/application/generator-orchestrator.ts (Likely handles generator execution)

## Timeline

Estimate: 2-3 days
