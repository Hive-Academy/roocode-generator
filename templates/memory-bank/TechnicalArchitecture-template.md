# Technical Architecture: [Project Name]

<!-- LLM: Populate using ProjectContext, focusing on techStack, structure, dependencies, and codeInsights for component details and architectural patterns. -->

## 1. Introduction

<!-- LLM: Briefly explain the purpose of this document and how the architecture supports the project goals (link to Project Overview). Reference ProjectContext.codeInsights[filePath].summary or overall project goals if available. Reference AltexSoft SAD Overview, Atlassian SDD Intro. -->

This document outlines the technical architecture for [Project Name]. It details the system's structure, components, technologies, and design decisions.

## 2. Architectural Goals & Constraints

<!-- LLM: Describe key non-functional requirements (performance, scalability, security, maintainability) and limitations (budget, tech choices, compliance). Use ProjectContext.codeInsights[filePath].nonFunctionalRequirements or infer from project type/goals. Reference AltexSoft SAD Goals/Constraints, Atlassian SDD Assumptions/Dependencies. -->

- **Goals**: <!-- LLM: List goals like Scalability, Maintainability, Extensibility, LLM Agnosticism. Source from ProjectContext.codeInsights or infer. -->
- **Constraints**: <!-- LLM: List constraints like Technology choices (ProjectContext.techStack), Performance targets, Security requirements. Source from ProjectContext.codeInsights or infer. -->

## 3. System Overview (Logical View)

<!-- LLM: Provide a high-level diagram (e.g., Mermaid) or description of the main components and their interactions. Use data from ProjectContext.structure.componentStructure and ProjectContext.codeInsights[filePath].components. Reference AltexSoft SAD High-Level Arch, Atlassian SDD System Arch. -->

- **Diagram**: <!-- LLM: Optional: Suggest including a diagram (e.g., Mermaid describing component interactions based on ProjectContext.structure.componentStructure and ProjectContext.codeInsights) or describe the core flow. -->
- **Key Components**:
  <!-- LLM: List major components identified in ProjectContext.structure.componentStructure and detailed in ProjectContext.codeInsights[filePath].components. For each, provide a brief description of its responsibility. Reference Atlassian SDD Component Design. -->
  - `[Component Name (e.g., ProjectAnalyzer)]`: <!-- LLM: Extract component name and responsibility from ProjectContext.structure.componentStructure keys and ProjectContext.codeInsights[filePath].summary/description. -->
  - `[Component Name (e.g., MemoryBankContentGenerator)]`: <!-- LLM: Extract component name and responsibility from ProjectContext.structure.componentStructure keys and ProjectContext.codeInsights[filePath].summary/description. -->
  - `[Component Name (e.g., LLMAgent)]`: <!-- LLM: Extract component name and responsibility from ProjectContext.structure.componentStructure keys and ProjectContext.codeInsights[filePath].summary/description. -->
  - ...

## 4. Technology Stack

<!-- LLM: List the primary technologies used, drawing from ProjectContext.techStack (languages, frameworks, buildTools, packageManager) and ProjectContext.dependencies (dependencies, devDependencies). Reference AltexSoft SAD Tech Stack. -->

- **Programming Language**: <!-- LLM: Specify language from ProjectContext.techStack.languages (e.g., TypeScript). Mention version if known. -->
- **Runtime Environment**: <!-- LLM: Specify runtime from ProjectContext.techStack.frameworks or inferred (e.g., Node.js). Mention version range if known. -->
- **Package Manager**: <!-- LLM: Specify package manager from ProjectContext.techStack.packageManager (e.g., npm, yarn). -->
- **Core Frameworks/Libraries**:
  <!-- LLM: List key dependencies from ProjectContext.dependencies.dependencies and ProjectContext.dependencies.devDependencies. -->
  - `[Library Name (e.g., tree-sitter)]`: <!-- LLM: Extract library name from ProjectContext.dependencies keys and describe its purpose (e.g., tree-sitter for AST parsing, jest for testing). -->
  - `[Library Name (e.g., jest)]`: <!-- LLM: Extract library name from ProjectContext.dependencies keys and describe its purpose (e.g., tree-sitter for AST parsing, jest for testing). -->
  - `[Library Name (e.g., eslint)]`: <!-- LLM: Extract library name from ProjectContext.dependencies keys and describe its purpose (e.g., tree-sitter for AST parsing, jest for testing). -->
  - `[Library Name (e.g., prettier)]`: <!-- LLM: Extract library name from ProjectContext.dependencies keys and describe its purpose (e.g., tree-sitter for AST parsing, jest for testing). -->
  - `[Library Name (e.g., tsyringe)]`: <!-- LLM: Extract library name from ProjectContext.dependencies keys and describe its purpose (e.g., tree-sitter for AST parsing, jest for testing). -->
  - ...
- **Build Tools**:
  <!-- LLM: List build tools from ProjectContext.techStack.buildTools. -->
  - `[Tool Name (e.g., tsc)]`: <!-- LLM: Extract tool name from ProjectContext.techStack.buildTools and describe its purpose (e.g., tsc for TypeScript compilation). -->
  - ...
- **LLM Providers**: <!-- LLM: List integrated LLM providers mentioned in ProjectContext.dependencies or ProjectContext.codeInsights. -->

## 5. Data Design & Management

<!-- LLM: Describe how data flows through the system, focusing on key data structures identified in ProjectContext.codeInsights[filePath].dataStructures or interfaces. Reference AltexSoft SAD Detailed Design (Data), Atlassian SDD Data Design. -->

- **`codeInsights` Structure & Generation**: <!-- LLM: Explain the structure of key data objects (e.g., codeInsights - link to interface definition if found via ProjectContext.codeInsights) and how they are generated (e.g., by ProjectAnalyzer using AST analysis - check ProjectContext.codeInsights for details). -->
- **`codeInsights` Consumption**: <!-- LLM: Explain how modules consume key data structures (e.g., how MemoryBankContentGenerator uses codeInsights data, identified via ProjectContext.codeInsights[filePath].dependencies). -->
- **Data Persistence**: <!-- LLM: Describe if/how data (e.g., configuration from ProjectContext.structure.configFiles, memory banks) is stored, based on file analysis in ProjectContext.codeInsights. -->

## 6. Code Structure (Development View)

<!-- LLM: Describe the high-level directory structure using ProjectContext.structure (rootDir, sourceDir, testDir, componentStructure) and the purpose of key folders. Reference AltexSoft SAD (part of detailed design), Atlassian SDD (implied). -->

- `src/`: Core source code. <!-- LLM: Use ProjectContext.structure.sourceDir -->
  - `core/`: Framework and shared utilities. <!-- LLM: Identify key subdirectories from ProjectContext.structure.componentStructure or file paths in ProjectContext.codeInsights -->
  - `generators/`: Specific code/doc generators. <!-- LLM: Identify key subdirectories from ProjectContext.structure.componentStructure or file paths in ProjectContext.codeInsights -->
  - `memory-bank/`: Memory bank generation and management. <!-- LLM: Identify key subdirectories from ProjectContext.structure.componentStructure or file paths in ProjectContext.codeInsights -->
- `tests/`: Automated tests. <!-- LLM: Use ProjectContext.structure.testDir -->
- `templates/`: Template files used for generation. <!-- LLM: Identify key subdirectories from ProjectContext.structure.componentStructure or file paths in ProjectContext.codeInsights -->
- `bin/`: Executable scripts. <!-- LLM: Identify key subdirectories from ProjectContext.structure.componentStructure or file paths in ProjectContext.codeInsights -->
- `task-tracking/`: Project management and task documentation. <!-- LLM: Identify key subdirectories from ProjectContext.structure.componentStructure or file paths in ProjectContext.codeInsights -->
- ... <!-- LLM: List other important directories identified in ProjectContext.structure or ProjectContext.codeInsights -->

## 7. Key Architectural Decisions (ADRs)

<!-- LLM: List significant architectural choices made, potentially inferred from ProjectContext.codeInsights (e.g., library choices, patterns used). If ADR files exist (check ProjectContext.structure), link to them. Otherwise, summarize key decisions. Reference AltexSoft SAD Decisions, Atlassian SDD Arch Decisions. -->

- **Decision 1**: [e.g., Choice of Tree-sitter for AST analysis] - **Rationale**: [Brief justification]
- **Decision 2**: [e.g., Use of specific LLM prompting strategy] - **Rationale**: [Brief justification]
- ...

## 8. Interface Design / Integration Points

<!-- LLM: Describe interactions with external systems (e.g., LLM APIs identified in ProjectContext.codeInsights) or between internal components (using ProjectContext.structure.componentStructure and ProjectContext.codeInsights[filePath].dependencies). Reference AltexSoft SAD Detailed Design (APIs), Atlassian SDD Interface Design. -->

- **LLM APIs**: Interaction patterns with providers like OpenAI, OpenRouter. <!-- LLM: Identify specific providers/patterns from ProjectContext.codeInsights -->
- **Filesystem**: Reading source code, writing generated files/memory banks. <!-- LLM: Describe file I/O patterns identified in ProjectContext.codeInsights -->
- **Internal Component APIs**: <!-- LLM: Describe key interfaces between major internal modules identified in ProjectContext.codeInsights[filePath].interfaces or inferred from dependencies. -->
- **(Future) Version Control**: Potential integration points.

## 9. Security Considerations

<!-- LLM: Outline security aspects. Check ProjectContext.dependencies for known vulnerabilities. Look for security patterns (API key handling, input validation) in ProjectContext.codeInsights. Reference AltexSoft SAD Security, Atlassian SDD Interface Design (Security). -->

- **API Keys**: Secure handling of LLM API keys (e.g., via environment variables, configuration). <!-- LLM: Identify API key handling patterns from ProjectContext.codeInsights (e.g., usage of process.env). -->
- **Input Sanitization**: Considerations for handling potentially malicious code inputs during analysis (if applicable). <!-- LLM: Identify input handling patterns from ProjectContext.codeInsights -->
- **Dependency Security**: Process for managing vulnerabilities in third-party packages. <!-- LLM: Mention dependency vulnerability management process if known, or check ProjectContext.dependencies for audit tools. -->

## 10. Deployment Strategy (Physical View)

<!-- LLM: Describe how the application is packaged (check ProjectContext.dependencies for packaging tools) and deployed/run (check ProjectContext.structure.mainEntryPoints, package.json scripts via ProjectContext.codeInsights). Reference AltexSoft SAD Infrastructure/Deployment, Atlassian SDD (implied). -->

- **Packaging**: <!-- LLM: Infer packaging method (e.g., npm package) from ProjectContext.structure and ProjectContext.codeInsights (e.g., presence of package.json). -->
- **Execution**: <!-- LLM: Identify execution method (e.g., Node.js CLI) from ProjectContext.structure.mainEntryPoints or package.json scripts. -->
- **CI/CD**: <!-- LLM: Identify CI/CD setup (e.g., GitHub Actions workflows in .github/workflows) from ProjectContext.structure or ProjectContext.codeInsights. -->
