# Task Description: Update README.md

**Task ID:** TSK-010
**Task Name:** Update README.md
**Status:** In Progress
**Assigned To:** Architect
**Date Created:** 2025-05-02
**Dependencies:** TSK-009 (Refine Memory Bank Documentation)

## 1. Overview

The main `README.md` file contains outdated information regarding project setup, command usage, and the release process. It needs to be updated to align with the current project state and the recently refined memory bank documentation (`ProjectOverview.md`, `TechnicalArchitecture.md`, `DeveloperGuide.md` from TSK-009).

**Affected File:**

- `README.md`

## 2. Requirements

Update `README.md` to accurately reflect the current project information based on the refined memory bank documents:

1.  **Project Overview Section:** Ensure this section accurately summarizes the key goals, purpose, and core features as described in the refined `memory-bank/ProjectOverview.md`.
2.  **How it Works Section:** Update this section to accurately describe the current command execution flow, emphasizing the roles of `ApplicationContainer`, `GeneratorOrchestrator`, and the central `AiMagicGenerator` as detailed in the refined `memory-bank/TechnicalArchitecture.md`.
3.  **Building/Setup Section:** Rewrite this section based on the refined `memory-bank/DeveloperGuide.md`:
    - Use the correct repository URL: `https://github.com/Hive-Academy/roocode-generator.git`.
    - Remove all references to `yarn`; standardize on `npm` commands only.
    - Add the step for creating and configuring the `.env` file for API keys.
    - Focus the instructions on local development setup (`npm install`, `npm run prepare`) rather than global installation (`npm install -g .`). Remove the global installation and verification steps (`which roocode`, `./bin/verify-installation.sh`).
    - Ensure prerequisites listed match `DeveloperGuide.md`.
    - Structure the section logically (e.g., Prerequisites, Setup Steps).
4.  **Running Tests Section:** Rewrite this section based on the refined `memory-bank/DeveloperGuide.md`:
    - Remove all references to `yarn`.
    - Ensure script names (`npm test`, `npm run test:watch`, `npm run test:coverage`) match `package.json` and `DeveloperGuide.md`.
    - Place this section appropriately within the README (e.g., after Setup, or in a dedicated Development section).
5.  **Commands Section:** Update command descriptions:
    - Clarify the default behavior of `roocode generate` when run without arguments (it likely defaults to `ai-magic`). Verify this behavior if possible.
    - Ensure the description of the `ai-magic` generator accurately reflects its role in handling rules and memory bank generation (via `MemoryBankService`) as per `ProjectOverview.md`.
    - Keep the `roocode generate memory-bank` command marked as deprecated, but ensure the explanation for using `ai-magic` instead is clear and concise. Remove the outdated options (`--context`, `--output`) specific to the deprecated command.
    - Ensure the `roocode config` description is accurate.
6.  **Release Process Section:** Rewrite this section entirely. Remove the outdated manual `npm version` steps. Describe the automated release process using `semantic-release` triggered by commits to the `main` branch in CI, as detailed in `DeveloperGuide.md` and `TechnicalArchitecture.md`.
7.  **Vite Integration Section:** Remove the "Vite Integration Update" section (lines 288-302) as it is inaccurate (Vite is not currently used for the build process according to `DeveloperGuide.md`).
8.  **Links:** Ensure all links to memory bank files (`ProjectOverview.md`, `TechnicalArchitecture.md`, `DeveloperGuide.md`) use correct relative paths from the `README.md` file (e.g., `./memory-bank/ProjectOverview.md`).
9.  **Overall:** Review the entire README for clarity, accuracy, and consistency with the refined memory bank documentation. Ensure good Markdown formatting.

## 3. Acceptance Criteria

The task is complete when all the following criteria are met:

- [ ] **AC1:** The "Project Overview" section in README accurately summarizes the refined `memory-bank/ProjectOverview.md`.
- [ ] **AC2:** The "How it Works" section accurately describes the command flow involving `AiMagicGenerator` based on the refined `memory-bank/TechnicalArchitecture.md`.
- [ ] **AC3:** The "Setup" section uses the correct repository URL, only `npm` commands, includes the `.env` step, and focuses on local setup as per the refined `memory-bank/DeveloperGuide.md`. Global install steps are removed.
- [ ] **AC4:** The "Running Tests" section uses only `npm` commands and correct script names, matching the refined `memory-bank/DeveloperGuide.md`.
- [ ] **AC5:** The "Commands" section accurately describes `roocode config`, `roocode generate` (including `ai-magic`'s role and default behavior clarification), and the deprecation of `generate memory-bank` (with outdated options removed).
- [ ] **AC6:** The "Release Process" section accurately describes the automated `semantic-release` workflow, removing manual versioning steps.
- [ ] **AC7:** The inaccurate "Vite Integration Update" section is completely removed from README.
- [ ] **AC8:** All links to memory bank files within README use correct relative paths.
- [ ] **AC9:** The entire `README.md` is well-formatted, clear, and consistent with the refined memory bank documentation.

## 4. Implementation Guidance

- Refer heavily to the refined versions of `memory-bank/ProjectOverview.md`, `memory-bank/TechnicalArchitecture.md`, and `memory-bank/DeveloperGuide.md` created in TSK-009.
- Focus on making the README clear and useful for new users/contributors.
- Use standard Markdown formatting.
- Verify the default behavior of `roocode generate` if feasible.

## 5. Memory Bank References

- `memory-bank/ProjectOverview.md` (Refined in TSK-009)
- `memory-bank/TechnicalArchitecture.md` (Refined in TSK-009)
- `memory-bank/DeveloperGuide.md` (Refined in TSK-009)
- `README.md` (Current state)
- `package.json` (For script names)
