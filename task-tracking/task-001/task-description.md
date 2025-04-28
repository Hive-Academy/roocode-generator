---
title: Update Rules Generator Output Format
taskId: task-001
status: open
assignedTo: Architect
---

# Task Description: Update Rules Generator Output Format

## 1. Overview

This task aims to refactor the `roocode-generator`'s rules generation functionality. Currently, the `RulesGenerator` produces multiple rules files (e.g., JSON files per mode/version) in the `.roo/rules/` directory. The goal is to update this generator to produce a single Markdown rules file in the `.roo/rules-code/` directory, similar in format and structure to the provided `.roo/rules-code/guidline-rules.md` example.

## 2. Functional Requirements

- The `RulesGenerator` must be updated to generate a single output file instead of multiple files based on modes or versions.
- The generated output file must be located at `.roo/rules-code/rules.md`.
- The output file format must be Markdown.
- The structure and style of the generated file should be similar to the provided `.roo/rules-code/guidline-rules.md`, utilizing Markdown headings to organize different categories of rules (e.g., Code Style, Project Structure, Naming Conventions, etc.).

## 3. Technical Requirements

- Identify and modify the relevant logic within the `RulesGenerator` (`src/generators/rules/rules-generator.ts`) to produce a single aggregated output.
- Identify and modify the `IRulesFileManager` (`src/generators/rules/rules-file-manager.ts`) and its implementation to handle writing a single Markdown file to the new location (`.roo/rules-code/rules.md`) instead of managing multiple versioned JSON files in `.roo/rules/`.
- Assess and potentially adjust how rule templates (`templates/rules/`) are loaded and processed by `RulesTemplateManager` and `TemplateProcessor` to facilitate the aggregation of content from different sources or modes into a single output file. This might involve changes to template structure or processing logic to combine information previously spread across multiple files.
- Update existing tests for `RulesGenerator` and `RulesFileManager` to reflect the new single-file output and file management logic.
- Add new tests as necessary to ensure comprehensive coverage of the refactored functionality, verifying the correct content, format, and location of the generated single rules file.
- Ensure all code changes adhere to the project's coding standards (TypeScript, ESLint, Prettier), utilize the Dependency Injection pattern, and consistently employ the Result pattern for error handling, as detailed in the Developer Guide.
- The version history tracking (`.roo/rules-versions.json`) and backup logic associated with the old multi-file format should be reviewed. If they are no longer relevant for a single, potentially overwritten file, they should be removed or adapted appropriately.

## 4. Memory Bank References

This task is informed by the following sections in the project's memory bank:

- **Project Overview (`memory-bank/ProjectOverview.md`):**
  - Mention of the `RulesGenerator` as a core component (line 41).
  - Identification of `.roo/` as the target directory for generated output (line 81).
- **Technical Architecture (`memory-bank/TechnicalArchitecture.md`):**
  - Details on the `RulesGenerator`'s components, including `IRulesFileManager`, `RulesTemplateManager`, and `TemplateProcessor` (lines 121, 128-129).
  - Confirmation that `FileOperations` is used for file system interactions (line 133).
  - Reinforcement of `.roo/` as the typical output location (line 233).
- **Developer Guide (`memory-bank/DeveloperGuide.md`):**
  - Location of the rules generator source code (`src/generators/rules/`) (line 113).
  - Description of the current `.roo/` structure for rules, including `rules/` and `rules-versions.json` (lines 131-134).
  - Comprehensive guidelines on coding standards, testing practices, DI, and error handling (lines 227-338).
  - Detailed information on working with rule templates and the associated components (`IRulesTemplateManager`, `TemplateProcessor`) (lines 415-494).
  - Specific details on the LLM-Based Rules Generator Implementation and the role of `IRulesFileManager` in saving and managing rules files (lines 495-558).

## 5. Success Criteria

- The `roocode-generator generate --generators rules` command (or equivalent) successfully runs without errors.
- A single file named `rules.md` (or similar appropriate name) is created or updated in the `.roo/rules-code/` directory.
- The content of `.roo/rules-code/rules.md` is valid Markdown and includes the expected rules and sections, formatted similarly to the `guidline-rules.md` example.
- The previous behavior of generating multiple files in `.roo/rules/` is discontinued (unless a specific flag or configuration is added to retain it, which is not part of the current requirement).
- All automated tests related to the `RulesGenerator` and file management pass.
- The project builds successfully after the changes.

## 6. Expected Document Locations

- Task Description: `task-tracking/task-001/task-description.md` (This file)
- Implementation Plan: `task-tracking/task-001/implementation-plan.md` (To be created by Architect)
- Completion Report: `task-tracking/task-001/completion-report.md` (To be created by Boomerang upon completion)
