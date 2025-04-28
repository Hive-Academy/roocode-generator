# Implementation Plan: Refactor Rules Generator to "ai-magic" and Convert Memory Bank Generator to Service

## 1. Overview

This task involves creating a new generator named "ai-magic" by copying and extending the existing Rules Generator. The Memory Bank Generator will be refactored into a service callable by the ai-magic generator. The data flow will be adapted so the memory bank service consumes the analyzed project context from ai-magic. The refactor must maintain modular separation, backward compatibility, and include comprehensive testing and documentation updates.

### Files to Modify

- `src/generators/rules/rules-generator.ts` (reference for copying)
- `src/generators/ai-magic-generator.ts` (new generator created by copying rules-generator)
- `src/memory-bank/memory-bank-generator.ts` (refactor to service)
- `src/memory-bank/memory-bank-orchestrator.ts` (adapt for service usage)
- `src/core/analysis/project-analyzer.ts` (used by ai-magic)
- Dependency injection modules under `src/core/di/modules/*`
- Tests under `tests/generators/ai-magic-generator.test.ts` (new tests)
- Tests under `tests/memory-bank/`
- Documentation files referencing generators and memory bank

## 2. Implementation Context

The current architecture uses a modular generator system orchestrated by `GeneratorOrchestrator`. The Rules Generator performs project analysis and generates rules content. The Memory Bank Generator generates documentation files based on project context. The ProjectAnalyzer service provides project scanning and analysis capabilities.

The new ai-magic generator will be created by copying the Rules Generator and then enhanced to perform project scanning using ProjectAnalyzer and call the memory bank service to generate files.

## 3. Implementation Approach

- Create a new generator class `AiMagicGenerator` by copying `RulesGenerator`.
- Refactor Memory Bank Generator to expose a service interface accepting structured project context.
- Modify ai-magic generator to call the memory bank service during generation.
- Update dependency injection to register ai-magic generator and memory bank service.
- Maintain backward compatibility by preserving existing Rules Generator and Memory Bank Generator.
- Develop new tests for ai-magic generator and update memory bank tests as needed.
- Update documentation to reflect new architecture and usage.
- Enhance rules system prompts to generate a well-structured, well-written set of rules matching the style and content of `.roo/rules-code/rules.md`.

### Architectural Decisions

- Creating a new generator avoids risk of breaking existing Rules Generator and its tests.
- Dependency injection will register both Rules Generator and AiMagicGenerator.
- Data flow: ai-magic -> project analysis -> memory bank service -> file generation.
- Memory bank service focuses solely on generating files from project context.
- Preserve existing interfaces and modular separation.
- Rules prompts will be enhanced to produce output consistent with `.roo/rules-code/rules.md` standards.

### Component Diagram (Conceptual)

User CLI
|
v
ApplicationContainer
|
GeneratorOrchestrator
|
AiMagicGenerator (new generator)
|-- uses --> ProjectAnalyzer
|-- calls --> MemoryBankService (refactored MemoryBankGenerator)
|-- uses --> Enhanced Rules Prompt System
|
Generates output files

## 4. Interface Definitions and Contracts

- `AiMagicGenerator` implements `IGenerator` interface.
- `MemoryBankService` exposes method `generateMemoryBank(projectContext: ProjectContext): Promise<Result<string, Error>>`.
- `ProjectAnalyzer` provides `analyzeProject(paths: string[]): Promise<Result<ProjectContext, Error>>`.
- Data passed between ai-magic and memory bank service is structured `ProjectContext`.
- Rules prompt system will have defined templates and prompt builders to generate rules files matching `.roo/rules-code/rules.md`.

## 5. Implementation Subtasks with Progress Tracking

### 1. Create AiMagicGenerator by Copying RulesGenerator

**Status**: Completed

### 2. Refactor Memory Bank Generator into a Service

**Status**: Completed

### 3. Enhance AiMagicGenerator to Call Memory Bank Service

**Status**: Completed

### 4. Update Dependency Injection and Configuration

**Status**: Completed

### 5. Enhance ProjectAnalyzer Service

**Status**: Completed

### 6. Enhance Rules Prompts for Structured, Well-Written Rules Generation

**Status**: Completed

**Description**: Enhance the rules system prompts used by the ai-magic generator to produce a well-structured, well-written set of rules. The output should match the style, clarity, and content quality of the existing `.roo/rules-code/rules.md` file.

**Files to Modify**:

- Rules prompt templates and builders under `src/generators/rules/` or `src/generators/ai-magic/`
- Possibly update `rules-prompt-builder.ts` or create new prompt builder for ai-magic
- Update or add tests for prompt generation correctness and output formatting

**Implementation Details**:

- Analyze `.roo/rules-code/rules.md` content and structure.
- Define prompt templates that instruct the LLM to generate rules in the same style.
- Implement prompt builder methods to assemble these prompts.
- Integrate enhanced prompts into AiMagicGenerator generation flow.
- Add tests to verify prompt correctness and output format.

**Testing Requirements**:

- Unit tests for prompt builder methods.
- Integration tests verifying generated rules match expected structure.
- Manual review of generated rules file for quality assurance.

**Acceptance Criteria**:

- [ ] Rules prompts generate output consistent with `.roo/rules-code/rules.md`.
- [ ] Tests cover prompt generation logic.
- [ ] AiMagicGenerator uses enhanced prompts successfully.

**Estimated effort**: 30 minutes

**Deviations**:

- Initial prompt implementation was too focused on replicating the example file content. Revised prompts based on feedback to generate context-specific rules _inspired_ by the example's structure and tone.
- Corrected the placement of rules generation logic; it resides within `AiMagicGenerator`, not `MemoryBankService` as initially misinterpreted from comments.

### 7. Update Documentation and Tests

**Status**: Completed

## 6. Testing Strategy

- Unit tests for AiMagicGenerator, MemoryBankService, enhanced ProjectAnalyzer, and rules prompt builders.
- Integration tests for interaction between ai-magic, ProjectAnalyzer, memory bank service, and prompt system.
- End-to-end tests for generation workflow.
- Regression tests to ensure no breaking changes.
- Performance tests to verify no degradation.

## Implementation Sequence

1. Create AiMagicGenerator by copying RulesGenerator.
2. Refactor Memory Bank Generator into a service.
3. Enhance AiMagicGenerator to call Memory Bank Service.
4. Update dependency injection and configuration.
5. Enhance ProjectAnalyzer service.
6. Enhance rules prompts for structured, well-written rules generation.
7. Update documentation and tests.

---

This plan ensures a modular, maintainable refactor with minimal disruption and comprehensive testing, including improved rules generation quality.
