# Research Report: Optimal Memory Bank Template Structure (TSK-016)

## Executive Summary

This research investigates best practices for structuring technical documentation templates (`ProjectOverview.md`, `TechnicalArchitecture.md`, `DeveloperGuide.md`) optimized for generation by Large Language Models (LLMs) using structured input (like `codeInsights` JSON) and for efficient use as LLM context later.

Key findings indicate that effective templates should combine standard technical documentation structures (drawing from sources like AltexSoft and Atlassian) with LLM-specific guidance. This includes using clear headings, detailed sections covering project specifics (goals, architecture, components, data flow, tech stack, setup, workflows, standards, testing, deployment), and explicit placeholders or comments (e.g., `<!-- LLM: Populate using codeInsights.components -->`) to direct the LLM during generation. The Developer Guide structure benefits from onboarding best practices (highlighted by the Microsoft template), focusing on quick setup and essential workflows.

For LLM consumption, conciseness, structured formatting (lists, tables), modularity, and clear summaries are crucial for token efficiency. Recommended template structures provided below incorporate these principles, tailored to the Roocode Generator project context (TypeScript, Node.js, Jest, Tree-sitter, `codeInsights`). Adopting these enhanced templates will significantly improve the quality and utility of the generated memory bank documentation.

## Research Methodology

- **Research focus**: Identify optimal structures for Project Overview, Technical Architecture, and Developer Guide documents, considering comprehensiveness, LLM generation friendliness (using JSON input), and LLM consumption token efficiency.
- **Sources consulted**: Web search results and scraped content from Brave Search focusing on technical documentation best practices (AltexSoft), software architecture/design documentation (AltexSoft, Atlassian), developer guides/onboarding (Microsoft Engineering Playbook template), and LLM interaction with structured data/templates.
- **Tools used**: Brave Search MCP tool, Firecrawl MCP tool.
- **Date of research**: May 6, 2025

## Key Findings

### 1. Best Practices in Technical Documentation Structure

Standard technical documents follow established structures to ensure clarity and completeness. Key sources like AltexSoft and Atlassian highlight common patterns:

- **Project Overview / Introduction**: Focuses on the _what_ and _why_. Key sections typically include Introduction/Overview (high-level summary, purpose), Goals/Objectives, Scope (In/Out), Stakeholders, Target Users, High-Level Requirements/Features. (Derived from AltexSoft PRD/SAD overview, Atlassian SDD Introduction).
- **Technical Architecture / Design Document**: Focuses on the _how_ at a system level. Key sections include Introduction (linking goals to architecture), Architectural Goals & Constraints (non-functional requirements), Architectural Views (Logical, Process, Development, Deployment), Key Components/Modules (responsibilities, interactions), Data Design/Management (models, flow, storage), Technology Stack (languages, frameworks, tools, rationale), Interface Design/Integration Points (APIs, external systems), Key Architectural Decisions (ADRs), Security Considerations, Deployment Strategy. (Derived from AltexSoft SAD, Atlassian SDD).
- **Developer Guide / Onboarding**: Focuses on enabling developers to contribute effectively. Key sections include Introduction (purpose, links to other docs), Getting Started/Setup (Prerequisites, Cloning, Installation, Configuration, Running Locally), Project Structure Overview (key directories/files), Development Workflow (Branching, Common Scripts/Commands, Debugging, PR Process, Code Review), Coding Standards & Conventions (Style Guides, Linting, Formatting, Naming), Testing (Strategy, Running Tests, Frameworks), Build & Deployment (Build process, CI/CD), Key Libraries/Frameworks/Concepts, Troubleshooting, Contribution Guidelines, Contacts/Team Processes. (Derived from Microsoft Onboarding Template, general best practices).
- **General Best Practices**: Write just enough documentation, consider the audience (clear language, avoid jargon where possible), use visuals (diagrams, screenshots), maintain consistency, keep documents updated, use cross-links, include glossaries, encourage collaboration, store docs accessibly (e.g., with code). (Derived from AltexSoft, Atlassian).

### 2. LLM Interaction with Templates

Guiding LLMs to populate templates effectively involves:

- **Explicit Prompting**: Clearly instruct the LLM on the task, input data (JSON `codeInsights`), and desired output (Markdown template population).
- **Clear Placeholders/Instructions**: Use distinct markers within the template (e.g., HTML comments `<!-- LLM: ... -->` or custom syntax `[FILL: ...]`) to indicate insertion points and specify the source data (e.g., `codeInsights.projectInfo.goals`). HTML comments are often preferred as they don't render in standard viewers.
- **Structured Input Reference**: The prompt must explicitly tell the LLM _how_ to map specific JSON keys/paths to the template placeholders.
- **Examples (Few-Shot)**: Providing examples in the prompt demonstrating the JSON-to-Markdown transformation for a section can improve accuracy.
- **Section-by-Section Generation**: For complex templates, generating content section by section can improve focus and reliability.
- **Output Format Specification**: Reinforce that the output must be well-formed Markdown adhering to the template structure.

### 3. Token Optimization Strategies (for LLM Consumption)

Structuring documentation for efficient use as LLM context involves:

- **Conciseness**: Use direct language, avoid redundancy. Write "just enough" documentation.
- **Structured Formatting**: Leverage Markdown headings, lists, and tables for better LLM parsing compared to dense text.
- **Summaries**: Include brief summaries at the start of documents/sections.
- **Modularity**: Keep documents focused (Overview, Architecture, Guide). Use clear sections.
- **Keywords**: Use consistent, meaningful keywords.
- **Data Representation**: Use lists/tables for items like dependencies, configuration.
- **Minimize Noise**: Remove boilerplate, non-essential comments (except LLM instructions), or overly verbose examples.
- **Cross-Linking**: Link between related documents/sections instead of repeating information.

### 4. Specific Content Recommendations (Roocode Generator Context)

Templates should be tailored to include sections relevant to the project:

- **General**: Emphasize the LLM-based nature, `codeInsights` usage.
- **Tech Stack**: Node.js, TypeScript, Jest, ESLint, Prettier, Tree-sitter, LLM Providers.
- **Key Components**: `ProjectAnalyzer`, `MemoryBank*` modules, `GeneratorOrchestrator`, `LLMAgent`, `codeInsights` structure itself.
- **Processes**: `tsc` build, testing with Jest, common `npm` scripts, `codeInsights` generation/consumption flow.
- **Developer specifics**: Environment setup (API keys), debugging, contribution guidelines for new generators.

## Recommended Template Structures

Below are proposed Markdown structures incorporating best practices and LLM considerations. Placeholders use HTML comments for LLM guidance.

**`ProjectOverview-template.md`**

```markdown
# Project Overview: [Project Name]

<!-- LLM: Populate using codeInsights.projectInfo -->

## 1. Introduction

<!-- LLM: Provide a brief (1-2 sentence) high-level summary of the project's purpose. Reference Atlassian SDD Intro section. -->

- **Purpose**: <!-- LLM: Describe the main goal, e.g., \"To automatically generate code/documentation using LLMs based on project analysis.\" -->
- **Core Functionality**: <!-- LLM: Briefly list 1-3 key features, e.g., \"Code analysis via AST, Memory Bank generation, Task-specific code generation.\" -->

## 2. Goals

<!-- LLM: List the primary objectives of this project using codeInsights.projectInfo.goals if available, otherwise describe general goals. Reference AltexSoft PRD/SAD Goals. -->

- Goal 1: ...
- Goal 2: ...

## 3. Scope

<!-- LLM: Define the boundaries of the project. Reference AltexSoft PRD Scope. -->

### 3.1. In Scope

<!-- LLM: List functionalities/features included in the project, drawing from codeInsights.projectInfo.scope.inScope if available. -->

- ...
- ...

### 3.2. Out of Scope

<!-- LLM: List functionalities/features explicitly excluded, drawing from codeInsights.projectInfo.scope.outOfScope if available. -->

- ...
- ...

## 4. Target Users / Audience

<!-- LLM: Describe the intended users of this project/tool. -->

- ...

## 5. Key Features / Modules (High-Level)

<!-- LLM: Briefly list the main features or high-level modules identified in codeInsights.components or codeInsights.projectInfo.features. -->

- [Feature/Module 1 Name]: <!-- LLM: Brief description -->
- [Feature/Module 2 Name]: <!-- LLM: Brief description -->

## 6. Stakeholders / Contacts

<!-- LLM: List key individuals or teams involved (Stakeholders - AltexSoft PRD) or main contacts (Contacts - Microsoft Onboarding). Include roles if known. -->

- [Name/Team]: [Role]
- ...

## 7. Glossary (Optional)

<!-- LLM: Define any project-specific terms or acronyms. Reference Atlassian SDD Glossary. -->

- **Term**: Definition
```

**`TechnicalArchitecture-template.md`**

```markdown
# Technical Architecture: [Project Name]

<!-- LLM: Populate using codeInsights.architecture, codeInsights.dependencies, codeInsights.buildTools, codeInsights.components -->

## 1. Introduction

<!-- LLM: Briefly explain the purpose of this document and how the architecture supports the project goals (link to Project Overview). Reference AltexSoft SAD Overview, Atlassian SDD Intro. -->

This document outlines the technical architecture for [Project Name]. It details the system's structure, components, technologies, and design decisions.

## 2. Architectural Goals & Constraints

<!-- LLM: Describe key non-functional requirements (performance, scalability, security, maintainability) and limitations (budget, tech choices, compliance). Reference AltexSoft SAD Goals/Constraints, Atlassian SDD Assumptions/Dependencies. -->

- **Goals**: <!-- LLM: e.g., Scalability, Maintainability, Extensibility, LLM Agnosticism -->
- **Constraints**: <!-- LLM: e.g., Technology choices, Performance targets, Security requirements -->

## 3. System Overview (Logical View)

<!-- LLM: Provide a high-level diagram or description of the main components and their interactions. Use data from codeInsights.components. Reference AltexSoft SAD High-Level Arch, Atlassian SDD System Arch. -->

- **Diagram**: <!-- LLM: Optional: Suggest including a diagram (e.g., Mermaid) or describe the core flow. -->
- **Key Components**:
  <!-- LLM: List major components identified in codeInsights.components. For each, provide a brief description of its responsibility. Reference Atlassian SDD Component Design. -->
  - `[Component Name (e.g., ProjectAnalyzer)]`: [Responsibility]
  - `[Component Name (e.g., MemoryBankContentGenerator)]`: [Responsibility]
  - `[Component Name (e.g., LLMAgent)]`: [Responsibility]
  - ...

## 4. Technology Stack

<!-- LLM: List the primary technologies used, drawing from codeInsights.dependencies, codeInsights.buildTools, and general project knowledge. Reference AltexSoft SAD Tech Stack. -->

- **Programming Language**: <!-- LLM: e.g., TypeScript (mention version if known) -->
- **Runtime Environment**: <!-- LLM: e.g., Node.js (mention version range if known) -->
- **Package Manager**: <!-- LLM: e.g., npm -->
- **Core Frameworks/Libraries**:
  <!-- LLM: List key dependencies from codeInsights.dependencies. -->
  - `[Library Name (e.g., tree-sitter)]`: [Purpose]
  - `[Library Name (e.g., jest)]`: [Purpose - Testing Framework]
  - `[Library Name (e.g., eslint)]`: [Purpose - Linting]
  - `[Library Name (e.g., prettier)]`: [Purpose - Formatting]
  - `[Library Name (e.g., tsyringe)]`: [Purpose - Dependency Injection, if applicable]
  - ...
- **Build Tools**:
  <!-- LLM: List build tools from codeInsights.buildTools. -->
  - `[Tool Name (e.g., tsc)]`: [Purpose - TypeScript Compiler]
  - ...
- **LLM Providers**: <!-- LLM: List integrated LLM providers (e.g., OpenAI, OpenRouter). -->

## 5. Data Design & Management

<!-- LLM: Describe how data flows through the system, focusing on key data structures like codeInsights. Reference AltexSoft SAD Detailed Design (Data), Atlassian SDD Data Design. -->

- **`codeInsights` Structure & Generation**: <!-- LLM: Explain the structure (link to interface?) and how ProjectAnalyzer generates it (AST analysis, etc.). -->
- **`codeInsights` Consumption**: <!-- LLM: Explain how modules like MemoryBankContentGenerator use codeInsights. -->
- **Data Persistence**: <!-- LLM: Describe if/how data (e.g., configuration, memory banks) is stored. -->

## 6. Code Structure (Development View)

<!-- LLM: Describe the high-level directory structure and the purpose of key folders (e.g., src, tests, templates, bin, task-tracking). Use codeInsights.directoryStructure if helpful. Reference AltexSoft SAD (part of detailed design), Atlassian SDD (implied). -->

- `src/`: Core source code.
  - `core/`: Framework and shared utilities.
  - `generators/`: Specific code/doc generators.
  - `memory-bank/`: Memory bank generation and management.
- `tests/`: Automated tests.
- `templates/`: Template files used for generation.
- `bin/`: Executable scripts.
- `task-tracking/`: Project management and task documentation.
- ...

## 7. Key Architectural Decisions (ADRs)

<!-- LLM: List significant architectural choices made. If ADR files exist, link to them. Otherwise, summarize key decisions. Reference AltexSoft SAD Decisions, Atlassian SDD Arch Decisions. -->

- **Decision 1**: [e.g., Choice of Tree-sitter for AST analysis] - **Rationale**: [Brief justification]
- **Decision 2**: [e.g., Use of specific LLM prompting strategy] - **Rationale**: [Brief justification]
- ...

## 8. Interface Design / Integration Points

<!-- LLM: Describe interactions with external systems or between internal components. Reference AltexSoft SAD Detailed Design (APIs), Atlassian SDD Interface Design. -->

- **LLM APIs**: Interaction patterns with providers like OpenAI, OpenRouter.
- **Filesystem**: Reading source code, writing generated files/memory banks.
- **Internal Component APIs**: <!-- LLM: Describe key interfaces between major internal modules if complex. -->
- **(Future) Version Control**: Potential integration points.

## 9. Security Considerations

<!-- LLM: Outline security aspects. Reference AltexSoft SAD Security, Atlassian SDD Interface Design (Security). -->

- **API Keys**: Secure handling of LLM API keys (e.g., via environment variables, configuration).
- **Input Sanitization**: Considerations for handling potentially malicious code inputs during analysis (if applicable).
- **Dependency Security**: Process for managing vulnerabilities in third-party packages.

## 10. Deployment Strategy (Physical View)

<!-- LLM: Describe how the application is packaged and deployed/run. Reference AltexSoft SAD Infrastructure/Deployment, Atlassian SDD (implied). -->

- **Packaging**: <!-- LLM: e.g., npm package -->
- **Execution**: <!-- LLM: e.g., Run via Node.js CLI -->
- **CI/CD**: <!-- LLM: Briefly mention CI/CD pipeline if it exists (e.g., GitHub Actions for linting/testing). -->
```

**`DeveloperGuide-template.md`**

````markdown
# Developer Guide: [Project Name]

<!-- LLM: Populate using codeInsights, package.json scripts, and general project knowledge. Structure based on Microsoft Onboarding Template and general best practices. -->

## 1. Introduction

<!-- LLM: Purpose of the guide, target audience (developers). Link to Project Overview and Technical Architecture. Reference Microsoft Onboarding Overview. -->

Welcome, developer! This guide provides instructions for setting up the development environment, running the project, understanding the codebase, and contributing effectively to [Project Name].

- **Prerequisites**: Please read the [Project Overview](ProjectOverview.md) and [Technical Architecture](TechnicalArchitecture.md) documents first.

## 2. Getting Started: Setup & Installation

<!-- LLM: Provide step-by-step instructions. Reference Microsoft Onboarding Dev Env Setup. -->

### 2.1. Prerequisites

- **Node.js**: <!-- LLM: Specify required version range (e.g., >=18.x). Check package.json engines field if available. -->
- **npm**: <!-- LLM: Specify required version (usually comes with Node.js). -->
- **Git**: Standard Git installation.
- **(Optional) Specific Tools**: <!-- LLM: e.g., Docker, specific build tools if not installed via npm. -->

### 2.2. Cloning the Repository

```bash
git clone [repository-url]
cd [repository-directory]
```
````

### 2.3. Installing Dependencies

```bash
npm install
```

<!-- LLM: Mention if any post-install steps are needed, e.g., for Tree-sitter grammars. -->

### 2.4. Environment Configuration

<!-- LLM: Explain how to set up necessary environment variables. -->

- Create a `.env` file in the root directory (this file is ignored by Git).
- Add necessary API keys:

  ```dotenv
  # Example for OpenAI
  OPENAI_API_KEY=your_openai_api_key_here

  # Example for OpenRouter
  OPENROUTER_API_KEY=your_openrouter_api_key_here
  ```

- <!-- LLM: List any other required environment variables. -->

### 2.5. Initial Build

<!-- LLM: Include command to compile TypeScript if necessary before first run. Check package.json scripts. -->

```bash
npm run build
```

### 2.6. Verifying Installation

<!-- LLM: Suggest a simple command to confirm setup is working. -->

```bash
# Example: Run help command
node dist/bin/roocode-generator.js --help

# Example: Run tests
npm test
```

## 3. Project Structure Overview

<!-- LLM: Briefly explain key directories. Refer to Technical Architecture doc for more detail. Reference Microsoft Onboarding Project Building Blocks. -->

- `src/`: Core TypeScript source code.
- `dist/`: Compiled JavaScript output (after `npm run build`).
- `tests/`: Unit and integration tests (using Jest).
- `templates/`: Templates for code/documentation generation.
- `bin/`: CLI entry points.
- `memory-bank/`: Generated documentation output.
- `task-tracking/`: Task descriptions, plans, reports.

## 4. Development Workflow

### 4.1. Common Scripts

<!-- LLM: List and explain key scripts from package.json. -->

- `npm run build`: Compiles TypeScript to JavaScript (`dist/` folder).
- `npm run build:watch`: Continuously watches for changes and recompiles.
- `npm run lint`: Runs ESLint to check for code style issues.
- `npm run format`: Runs Prettier to automatically format code.
- `npm test`: Runs all tests using Jest.
- `npm run test:watch`: Runs tests in watch mode.
- `npm start`: <!-- LLM: Define the primary way to run the tool, e.g., node dist/bin/roocode-generator.js [args] -->

### 4.2. Branching Strategy

<!-- LLM: Describe the Git branching model used (e.g., Gitflow - feature branches off develop). -->

- Main branches: `main`, `develop`.
- Feature branches: `feature/your-feature-name` (branched from `develop`).
- Bugfix branches: `fix/your-bug-fix` (branched from `develop` or `main` for hotfixes).

### 4.3. Making Changes

1.  Create a feature/fix branch from `develop`.
2.  Implement changes.
3.  Ensure code compiles (`npm run build`).
4.  Write/update tests.
5.  Run linters and formatters (`npm run lint`, `npm run format`).
6.  Ensure all tests pass (`npm test`).
7.  Commit changes following conventional commit guidelines (see Coding Standards).
8.  Push branch and create a Pull Request (PR) targeting `develop`.

### 4.4. Pull Request (PR) Process

<!-- LLM: Describe PR requirements. -->

- Target branch: `develop`.
- Title/Description: Clear explanation of changes.
- Link to relevant task/issue.
- Requires at least one approval.
- CI checks (linting, testing, build) must pass.

### 4.5. Debugging

<!-- LLM: Provide tips for debugging. -->

- Use `console.log` statements.
- Utilize the Node.js debugger (e.g., via VS Code launch configurations - check `.vscode/launch.json` if it exists).

## 5. Coding Standards & Conventions

<!-- LLM: Reference AltexSoft Process Docs (Standards), Microsoft Onboarding (implied). -->

- **Language**: TypeScript.
- **Style Guide**: Follow standard TypeScript best practices.
- **Linting**: ESLint (configuration in `eslint.config.mjs`). Run `npm run lint`.
- **Formatting**: Prettier (configuration likely in `package.json` or `.prettierrc`). Run `npm run format`.
- **Naming Conventions**: Use camelCase for variables/functions, PascalCase for classes/interfaces.
- **Commit Messages**: Follow Conventional Commits specification (e.g., `feat: add new generator`, `fix: resolve analysis bug`, `docs: update developer guide`). See `commitlint.config.js`.
- **Team Agreement**: <!-- LLM: Link to or summarize team working agreements. Reference Microsoft Onboarding Team Agreement. -->

## 6. Testing

<!-- LLM: Describe the testing approach. Reference AltexSoft QA Docs (Test Plan/Cases), Microsoft Onboarding Project Building Blocks (Testing). -->

- **Framework**: Jest (configuration in `jest.config.js`).
- **Location**: Tests are located in the `tests/` directory, mirroring the `src/` structure.
- **Running Tests**:
  - All tests: `npm test`
  - Watch mode: `npm test -- --watch`
  - Specific file: `npm test -- tests/core/analysis/project-analyzer.test.ts`
- **Types of Tests**: Unit tests, Integration tests.
- **Writing Tests**: Create test files (`*.test.ts`) alongside the code being tested or within the `tests/` directory. Follow Jest best practices.

## 7. Build & Deployment

<!-- LLM: Reference AltexSoft SAD Deployment, Microsoft Onboarding Project Building Blocks (Deployment). -->

- **Build Process**: `npm run build` uses `tsc` (TypeScript Compiler) based on `tsconfig.json` to compile code into the `dist/` directory.
- **Deployment**: This project is primarily a CLI tool run locally or potentially published as an npm package. No complex deployment process currently defined.

## 8. Key Libraries & Concepts

<!-- LLM: Briefly explain important libraries/concepts specific to this project. -->

- **Tree-sitter**: Used for generating Abstract Syntax Trees (ASTs) from source code. See `TreeSitterParserService`.
- **`codeInsights`**: The core JSON structure representing analyzed project data. See `ast-analysis.interfaces.ts`.
- **LLM Interaction**: Handled via `LLMAgent` and specific providers (`OpenAIProvider`, `OpenRouterProvider`).
- **Generators**: Modular components responsible for specific generation tasks (e.g., `RoomodesGenerator`, `MemoryBankContentGenerator`). See `src/generators/`.
- **Memory Bank**: The collection of generated documentation (`ProjectOverview.md`, etc.) used for context.
- **(Dependency Injection)**: <!-- LLM: Mention DI container if used (e.g., tsyringe) and how services are registered/resolved. -->

## 9. Troubleshooting

<!-- LLM: List common issues and solutions. Reference AltexSoft User Docs (Troubleshooting). -->

- **Issue**: API Key errors.
  - **Solution**: Ensure correct API keys are set in the `.env` file and the file is loaded correctly.
- **Issue**: Build failures (`tsc` errors).
  - **Solution**: Check TypeScript syntax, ensure types are correct.
- **Issue**: Test failures.
  - **Solution**: Debug the specific test using Jest's tools or `console.log`.

## 10. Contribution Guidelines

- Follow the Development Workflow outlined above.
- Ensure code is well-documented (TSDoc comments).
- Write appropriate tests for new features or bug fixes.
- For significant changes, consider discussing the approach in an issue first.
- **Adding New Generators**: Follow the pattern in `src/generators/`, implement the `BaseGenerator` interface, and register it appropriately (details TBD based on DI/orchestration).

## 11. Resources & Contacts

<!-- LLM: Link to relevant project resources and list key contacts. Reference Microsoft Onboarding Resources/Contacts. -->

- **Project Board / Backlog**: [Link]
- **Repository**: [Link]
- **Key Contacts**:
  - [Name]: [Role / Area of Expertise]
  - ...

```

## Rationale

The proposed structures are based on:

1.  **Standard Practices**: Aligning with common sections found in high-quality technical documentation ensures familiarity and covers essential information (Synthesized from AltexSoft, Atlassian, Microsoft examples).
2.  **Comprehensiveness**: Including detailed sections for setup, architecture, technology stack, workflows, testing, etc., provides a complete picture for both humans and LLMs.
3.  **LLM Generation Friendliness**: Using explicit HTML comments (`<!-- LLM: ... -->`) provides clear instructions for the LLM on *what* content to generate and *where* to place it, referencing the `codeInsights` structure where applicable. This is more robust than relying solely on headings.
4.  **LLM Consumption Optimization**: Structured formatting (headings, lists), modular documents, and clear summaries aid future LLM context processing by improving parseability and reducing token count compared to unstructured prose.
5.  **Project Context**: Sections are tailored to include specifics relevant to Roocode Generator, such as `codeInsights`, Tree-sitter, LLM providers, and the generator architecture.

## References (Summarized)

1.  **AltexSoft - Technical Documentation in Software Development**: Provides a comprehensive overview of documentation types (Product vs. Process, System vs. User). Details common sections for Product Requirements Documents (PRD - goals, scope, user stories, acceptance criteria), Software Architecture Documents (SAD - overview, goals, constraints, architecture views, tech stack, decisions), User Documentation (quick start, manuals, troubleshooting), and Process Documentation (roadmaps, backlogs, standards). Emphasizes best practices like writing "just enough," knowing the audience, using visuals, keeping docs updated, and collaboration.

2.  **Atlassian - How to Create a Software Design Document**: Describes the Software Design Document (SDD) as a blueprint covering project goals, architecture, and specifications. Key elements include Introduction/Overview, System Architecture (diagrams, components, patterns), Data Design (DB structure, flow), Interface Design (APIs, protocols), Component Design (responsibilities, I/O, logic), UI Design (wireframes, workflows), Assumptions/Dependencies, and Glossary. Stresses benefits like improved communication, planning, maintenance, and scalability. Recommends best practices like clarity, visuals, consistency, keeping current, accessibility, and collaboration.

3.  **Microsoft - Onboarding Guide Template (GitHub)**: Offers a practical template structure for developer onboarding. Key sections include Overview/Goals (summary, scope, value prop), Contacts (roles), Team Agreement/Code of Conduct, Dev Environment Setup (steps, software/versions), Project Building Blocks (components, deployment, testing, repos), and Resources (links to backlog, wiki, history). Emphasizes linking to existing detailed documentation to keep the onboarding guide concise.

4.  **LLM Interaction & Structured Output (General Research)**: Findings suggest effective LLM guidance involves explicit prompting about the task and data, clear placeholders/instructions within templates (e.g., HTML comments referencing JSON paths), providing examples (few-shot learning), potentially generating section-by-section for complex documents, and specifying the desired output format (Markdown).

## Questions/Areas for Further Research

*   Experimentation with different placeholder syntaxes (`<!-- LLM: -->` vs. `[FILL: ...]` vs. others) to see which yields the most reliable results with the target LLMs.
*   Refining the prompts used to instruct the LLM to populate these templates based on `codeInsights`.
*   Developing a strategy for automatically generating diagrams (e.g., Mermaid) within the architecture document based on `codeInsights` data.

This research report provides a comprehensive analysis and recommendations for structuring memory bank templates to enhance quality and utility for both LLM generation and consumption.
```
