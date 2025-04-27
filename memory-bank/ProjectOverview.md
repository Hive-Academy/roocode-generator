Okay, team. As Roo Architect, I've analyzed the provided context, including code snippets, configuration files, and existing documentation fragments. Based on this, here is a comprehensive Project Overview for `roocode-generator`. This document aims to provide a clear understanding of the project's purpose, scope, technical foundation, and development practices.

---

```markdown
---
title: Project Overview - roocode-generator
version: 1.0.1
lastUpdated: 2024-08-27 # Automatically set to current date
type: core-documentation
category: overview
status: active
---

# Project Overview: roocode-generator

## 1. Overview

`roocode-generator` is a Node.js command-line interface (CLI) tool built with TypeScript, designed to streamline and standardize the creation of configuration files and documentation for projects adopting the RooCode methodology. It leverages an interactive CLI, a modular generator architecture, and integrates with Large Language Models (LLMs) via Langchain to provide intelligent, context-aware generation capabilities.

## 2. Project Essentials

*   **Name**: roocode-generator
*   **Version**: 1.0.1 (as per `package.json`)
*   **Status**: Active Development
*   **License**: MIT (as per `LICENSE`)
*   **Repository**: `https://github.com/yourusername/roocode-generator.git` (placeholder from `package.json`)
*   **Author**: Abdallah Khalil <abdallah@nghive.tech> (as per `package.json`)

## 3. Purpose and Goals

The primary purpose of `roocode-generator` is to simplify and standardize the adoption and use of the RooCode workflow. Key goals include:

*   **Accelerate Setup:** Reduce the manual effort required to configure RooCode for new or existing projects by automating the generation of necessary files.
*   **Ensure Consistency:** Promote standardized configurations and documentation (like Memory Bank files) across different teams and projects using RooCode.
*   **Improve Developer Experience:** Provide an intuitive CLI tool (`commander`, `inquirer`, `ora`) for easy interaction and generation.
*   **Flexibility & Extensibility:** Support configuration generation for various technology stacks through a modular architecture.
*   **Innovation:** Leverage LLMs (via Langchain) for context-aware generation (e.g., rules, documentation) based on project analysis.

## 4. Core Features & Functionality

*   **Interactive CLI:** User-friendly command-line interface built with `commander` for parsing arguments and `inquirer` for interactive prompts. Provides commands like `generate` and `config`.
*   **Modular Generator Architecture:** The system utilizes a core `GeneratorOrchestrator` to manage and execute different `IGenerator` implementations. Key generators identified:
    *   `MemoryBankGenerator`: Generates core documentation (`ProjectOverview.md`, `TechnicalArchitecture.md`, `DeveloperGuide.md`) using LLM based on project context.
    *   `RulesGenerator`: Generates project-specific coding standards and rules, potentially using LLM analysis.
    *   `SystemPromptsGenerator`: Creates system prompt files for different RooCode modes.
    *   `RoomodesGenerator`: Generates the `.roomodes` file defining available workflow modes.
    *   `VSCodeCopilotRulesGenerator`: Configures VS Code settings for GitHub Copilot integration and rules.
*   **LLM Integration (Langchain):** Abstracted interaction with multiple LLM providers (OpenAI, Google GenAI, Anthropic) using the `langchain` library. Managed via `LLMConfigService` and `LLMProviderRegistry`. Configuration stored in `llm.config.json`.
*   **Project Context Analysis:** The `ProjectAnalyzer` service analyzes the target project's tech stack, directory structure, and dependencies to provide context for LLM-driven generation.
*   **Template System:** Uses a `TemplateManager` and `TemplateProcessor` for loading, merging (base + custom), and processing template files (primarily Markdown) used in generation. Includes a specialized `RulesTemplateManager` for rule generation.
*   **Configuration Management:** Manages project-specific settings (`roocode-config.json`) via `ProjectConfigService` and LLM settings (`llm.config.json`) via `LLMConfigService`. Includes a `config` command for interactive/CLI-based LLM setup.
*   **Dependency Injection:** Utilizes a custom, lightweight DI container (`src/core/di/container.ts`) with decorators (`@Injectable`, `@Inject`) and modular registration (`src/core/di/modules/`).
*   **Robust Error Handling:** Employs a custom `Result` type (`src/core/result/result.ts`) and specific error classes (`src/core/errors/`) for predictable error management.

## 5. Technology Stack & Architecture

*   **Primary Language:** TypeScript (`typescript`, `ts-jest`, `tseslint`)
*   **Runtime:** Node.js (`>=16` as per `package.json`)
*   **Architecture:** Modular CLI with LLM Integration (as per `TechnicalArchitecture.md`)
*   **Key Libraries:**
    *   **CLI:** `commander`, `inquirer`, `chalk`, `ora`
    *   **LLM:** `langchain`, `@langchain/core`, `@langchain/openai`, `@langchain/google-genai`, `@langchain/anthropic`
    *   **DI:** Custom Implementation (`reflect-metadata`)
    *   **Module Aliasing:** `module-alias`
    *   **Environment:** `dotenv`
    *   **Utilities:** `date-fns`
*   **Development Workflow:** Trunk-based Development (as per `DeveloperGuide.md`)
*   **Code Quality & Standards:** `eslint`, `prettier`, `@commitlint/cli`, `husky`
*   **Testing:** `jest`, `ts-jest` (with 80% coverage goal)
*   **Build:** `tsc`, `copyfiles`
*   **Release:** `semantic-release` (automated versioning and publishing)

## 6. Project Structure Highlights

*   **`src/`**: Main source code.
    *   **`core/`**: Foundational modules (DI, application, config, errors, file-operations, llm, result, services, templating, ui, analysis, types).
    *   **`generators/`**: Specific generator implementations (e.g., `rules/`, `roomodes-generator.ts`).
    *   **`memory-bank/`**: Logic specific to the MemoryBank feature.
    *   **`commands/`**: (Implied by structure, likely contains command handlers like `generate-memory-bank.command.ts`).
    *   **`cli/`**: Core CLI setup (`cli-interface.ts`).
*   **`bin/`**: Executable script entry point.
*   **`templates/`**: Source templates for generation.
*   **`tests/`**: Unit and integration tests (Note: Plan exists to co-locate tests).
*   **`.roo/`**: Target directory for generated RooCode rules and configuration.
*   **`memory-bank/`**: (In root) Target directory for generated core documentation (ProjectOverview, TechArchitecture, DeveloperGuide) and standard templates.
*   **Configuration Files:** `.eslintrc.js`, `jest.config.js`, `tsconfig.json`, `commitlint.config.js`, `package.json`, `.prettierrc.js`.

## 7. Key Documentation

*   **Technical Architecture:** Detailed system design, components, and patterns. [[TechnicalArchitecture]]
*   **Developer Guide:** Setup, workflow, coding standards, testing, deployment. [[DeveloperGuide]]
*   **README:** High-level project description and usage (this file). [[README]]
*   **Memory Bank Templates:** Standard templates for project processes. [[memory-bank/templates/]]

---

This overview should serve as a solid starting point for any team member joining or working on the `roocode-generator` project. Remember to refer to the linked detailed documentation for specifics.