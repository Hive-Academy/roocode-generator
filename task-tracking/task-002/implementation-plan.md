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

### Architectural Decisions

- Creating a new generator avoids risk of breaking existing Rules Generator and its tests.
- Dependency injection will register both Rules Generator and AiMagicGenerator.
- Data flow: ai-magic -> project analysis -> memory bank service -> file generation.
- Memory bank service focuses solely on generating files from project context.
- Preserve existing interfaces and modular separation.

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
|
Generates output files

## 4. Interface Definitions and Contracts

- `AiMagicGenerator` implements `IGenerator` interface.
- `MemoryBankService` exposes method `generateMemoryBank(projectContext: ProjectContext): Promise<Result<string, Error>>`.
- `ProjectAnalyzer` provides `analyzeProject(paths: string[]): Promise<Result<ProjectContext, Error>>`.
- Data passed between ai-magic and memory bank service is structured `ProjectContext`.

## 5. Implementation Subtasks with Progress Tracking

### 1. Create AiMagicGenerator by Copying RulesGenerator

**Status**: Completed

**Description**: Copy `RulesGenerator` class and related files to create `AiMagicGenerator`. Update class name, file name, and references. Prepare for enhancements.

**Files to Modify**:

- Copy `src/generators/rules/rules-generator.ts` to `src/generators/ai-magic-generator.ts`
- Update DI modules to register AiMagicGenerator

**Implementation Details**:

```typescript
@Injectable()
export class AiMagicGenerator extends BaseGenerator<ProjectConfig> {
  // copied logic from RulesGenerator, to be enhanced
}
```

**Testing Requirements**:

- Create new unit tests for AiMagicGenerator.
- Verify copied functionality works as expected.

**Acceptance Criteria**:

- [x] AiMagicGenerator created and registered.
- [x] Tests for AiMagicGenerator pass.

**Estimated effort**: 20 minutes

---

### 2. Refactor Memory Bank Generator into a Service

**Status**: Completed

**Description**: Refactor `MemoryBankGenerator` to expose a service interface callable by ai-magic. Adapt methods to accept structured project context.

**Files to Modify**:

- `src/memory-bank/memory-bank-generator.ts`
- `src/memory-bank/memory-bank-orchestrator.ts`

**Implementation Details**:

```typescript
@Injectable()
export class MemoryBankService {
  async generateMemoryBank(projectContext: ProjectContext): Promise<Result<string, Error>> {
    // generation logic adapted from MemoryBankGenerator
  }
}
```

**Testing Requirements**:

- Unit tests for MemoryBankService methods.
- Integration tests verifying generation from project context.

**Acceptance Criteria**:

- [x] MemoryBankGenerator refactored to service interface.
- [x] Methods accept structured project context.
- [x] Tests updated and passing.

**Estimated effort**: 20 minutes

---

### 3. Enhance AiMagicGenerator to Call Memory Bank Service

**Status**: Completed

**Description**: Modify ai-magic generator to perform project scanning and then call memory bank service to generate files.

**Files to Modify**:

- `src/generators/ai-magic-generator.ts`

**Implementation Details**:

```typescript
const projectContext = await this.analyzeProject(paths);
const result = await this.memoryBankService.generateMemoryBank(projectContext);
```

**Testing Requirements**:

- Integration tests verifying ai-magic calls memory bank service.
- End-to-end tests for generation workflow.

**Acceptance Criteria**:

- [x] ai-magic calls memory bank service correctly.
- [x] Generation outputs consistent or improved.
- [x] Tests pass.

**Estimated effort**: 15 minutes

---

### 4. Update Dependency Injection and Configuration

**Status**: Completed

**Description**: Update DI container and modules to register ai-magic generator and memory bank service.

**Files to Modify**:

- `src/core/di/modules/*`

**Implementation Details**:

- Register AiMagicGenerator and MemoryBankService with appropriate scopes.

**Testing Requirements**:

- Verify DI registrations via unit tests or integration tests.

**Acceptance Criteria**:

- [x] DI registrations updated.
- [x] No DI-related errors at runtime.

**Estimated effort**: 10 minutes

---

### 5. Enhance ProjectAnalyzer Service

**Status**: Completed

**Description**: Analyze and enhance the `ProjectAnalyzer` service to improve project scanning and analysis capabilities. Leverage the existing generalized scan in `ProjectContextService` and extend support for additional tech stacks and programming languages. Improve accuracy and completeness of the `ProjectContext` data used by ai-magic and memory bank service.

**Files to Modify**:

- `src/core/analysis/project-analyzer.ts`
- Possibly `src/memory-bank/project-context-service.ts`

**Implementation Details**:

- Review current scanning and analysis logic.
- Identify gaps or limitations in tech stack detection and project context gathering.
- Implement enhancements to support broader tech stacks and languages.
- Update or add unit and integration tests for enhanced analysis.

**Testing Requirements**:

- Unit tests for enhanced ProjectAnalyzer methods.
- Integration tests verifying improved project context accuracy.

**Acceptance Criteria**:

- [x] ProjectAnalyzer enhanced with improved scanning and analysis.
- [x] Tests updated and passing.
- [x] No regressions in existing functionality.

**Estimated effort**: 30 minutes

---

### 6. Update Documentation and Tests

**Status**: Not Started

**Description**: Update documentation files referencing generators and memory bank to reflect the new architecture and usage. Add or update tests for the new service interface and integration. Ensure documentation is clear on the new ai-magic generator and memory bank service interaction. Verify test coverage and documentation completeness.

**Files to Modify**:

- Documentation files referencing generators and memory bank.
- Test files under `tests/generators/` and `tests/memory-bank/`

**Implementation Details**:

- Update README, DeveloperGuide, and other docs.
- Add tests for new service interface and integration.

**Testing Requirements**:

- Documentation review.
- Test coverage verification.
- All tests passing.

**Acceptance Criteria**:

- [ ] Documentation updated.
- [ ] Tests comprehensive and passing.

**Estimated effort**: 15 minutes

---

## 6. Testing Strategy

- Unit tests for AiMagicGenerator, MemoryBankService, and enhanced ProjectAnalyzer classes.
- Integration tests for interaction between ai-magic, ProjectAnalyzer, and memory bank service.
- End-to-end tests for generation workflow.
- Regression tests to ensure no breaking changes.
- Performance tests to verify no degradation.

---

## Implementation Sequence

1. Create AiMagicGenerator by copying RulesGenerator.
2. Refactor Memory Bank Generator into a service.
3. Enhance AiMagicGenerator to call Memory Bank Service.
4. Update dependency injection and configuration.
5. Enhance ProjectAnalyzer service.
6. Update documentation and tests.

---

This plan ensures a modular, maintainable refactor with minimal disruption and comprehensive testing.
