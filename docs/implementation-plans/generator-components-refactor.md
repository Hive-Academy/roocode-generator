# Generator Components Refactoring Plan

## 1. Core Generator Interfaces

```typescript
// Base generator interface
export interface IGenerator {
  generate(config: ProjectConfig): Promise<Result<void>>;
  validate(config: ProjectConfig): Result<boolean>;
}

// Template management interface
export interface ITemplateManager {
  loadTemplate(name: string): Promise<Result<string>>;
  validateTemplate(content: string): Result<boolean>;
}

// File operations interface
export interface IFileOperations {
  ensureDirectory(path: string): Promise<Result<void>>;
  writeFile(path: string, content: string): Promise<Result<void>>;
  copyFile(src: string, dest: string): Promise<Result<void>>;
}
```

## 2. Abstract Base Classes

```typescript
// Base generator implementation
export abstract class BaseGenerator implements IGenerator {
  constructor(
    @Inject("ITemplateManager") protected readonly templateManager: ITemplateManager,
    @Inject("IFileOperations") protected readonly fileOps: IFileOperations,
    @Inject("ILogger") protected readonly logger: ILogger
  ) {}

  abstract generate(config: ProjectConfig): Promise<Result<void>>;

  protected async validateConfig(config: ProjectConfig): Result<boolean> {
    if (!TypeGuards.isProjectConfig(config)) {
      return Result.failure(new Error("Invalid project configuration"));
    }
    return Result.success(true);
  }
}

// Mode-specific generator base
export abstract class ModeGenerator extends BaseGenerator {
  protected abstract readonly mode: string;
  protected abstract readonly templateName: string;

  async generate(config: ProjectConfig): Promise<Result<void>> {
    try {
      const validationResult = await this.validateConfig(config);
      if (validationResult.isFailure) {
        return Result.failure(validationResult.error);
      }

      const templateResult = await this.templateManager.loadTemplate(this.templateName);
      if (templateResult.isFailure) {
        return Result.failure(templateResult.error);
      }

      const outDir = path.join(config.baseDir, ".roo");
      const dirResult = await this.fileOps.ensureDirectory(outDir);
      if (dirResult.isFailure) {
        return Result.failure(dirResult.error);
      }

      const outPath = path.join(outDir, `${this.mode}-${this.templateName}`);
      return await this.fileOps.writeFile(outPath, templateResult.value);
    } catch (error) {
      this.logger.error(`Error generating ${this.mode}`, error);
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
```

## 3. Concrete Generator Implementations

### 3.1 Rules Generator

```typescript
@Injectable()
export class RulesGenerator extends ModeGenerator {
  protected readonly mode = "rules";
  protected readonly templateName = "rules.md";

  async generate(config: ProjectConfig): Promise<Result<void>> {
    const modes = [
      { slug: "boomerang", template: "boomerang-rules.md" },
      { slug: "architect", template: "architect-rules.md" },
      { slug: "code", template: "code-rules.md" },
      { slug: "code-review", template: "code-review-rules.md" },
    ];

    try {
      for (const { slug, template } of modes) {
        const templateResult = await this.templateManager.loadTemplate(template);
        if (templateResult.isFailure) {
          return templateResult;
        }

        const outDir = path.join(config.baseDir, ".roo", `rules-${slug}`);
        const dirResult = await this.fileOps.ensureDirectory(outDir);
        if (dirResult.isFailure) {
          return dirResult;
        }

        const outPath = path.join(outDir, "rules.md");
        const writeResult = await this.fileOps.writeFile(outPath, templateResult.value);
        if (writeResult.isFailure) {
          return writeResult;
        }
      }

      return Result.success(void 0);
    } catch (error) {
      this.logger.error("Error generating rules", error);
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
```

## 4. Langchain and LLM Components Refactor

### 4.1 Overview

This section details the refactoring plan for the Langchain and LLM-related components (`llm-agent.ts`, `llm-provider.ts`, and `config-workflow.ts`) to align with the TypeScript OOP/SOLID architectural patterns, Dependency Injection system, and enhanced error handling using the Result type.

### 4.2 Multiple Model Providers Support and DI Integration

- **Maintain support for multiple LLM providers** by defining a common interface `ILLMProvider` and implementing each provider separately.
- Use a **provider registry or factory pattern** registered in the DI container to resolve the appropriate provider at runtime based on configuration or context.
- Ensure **dependency injection (DI)** is used consistently to inject providers and agents, avoiding static imports or direct instantiations.
- This approach allows **extensibility** to add new providers without modifying existing code, adhering to the Open/Closed Principle.
- The DI container should be configured to support **multiple named or tagged bindings** for different providers.

### 4.3 Proposed Interfaces

```typescript
import { Result } from "../../src/core/result/result";
import type { AnalysisResult } from "../../types/shared";

export interface ILLMProvider {
  getCompletion(systemPrompt: string, userPrompt: string): Promise<Result<string, Error>>;
}

export interface ILLMAgent {
  analyzeProject(projectDir: string): Promise<Result<AnalysisResult, Error>>;
  // Additional methods as needed for LLM workflows
}
```

### 4.4 Refactored Classes with Extensibility and Error Handling

- `LLMProvider` implementations must:
  - Implement `ILLMProvider` interface.
  - Use DI to receive configuration and dependencies.
  - Return results wrapped in `Result` to encapsulate success or failure.
  - Implement robust error handling and propagate errors with context.
  - Support configuration-driven selection of underlying LLM service.
- `LLMAgent` implementations must:
  - Implement `ILLMAgent` interface.
  - Use injected `ILLMProvider` instances.
  - Handle file system operations, prompt construction, and recursive file listing.
  - Return `Result` wrapped responses for all async operations.
  - Provide extension points for additional LLM workflows.
  - Log errors and provide meaningful diagnostics.

### 4.5 Task Progress Tracking and Refactoring Plan Adherence

- The implementation must **strictly follow the task progress tracking** as defined in the project rules.
- Refactoring should be **incremental and validated** at each step, avoiding large unreviewed changes.
- Maintain **backward compatibility** during migration phases.
- Use **feature flags or branch isolation** to control rollout of refactored components.
- Ensure **unit and integration tests** are updated and cover new interfaces and implementations.
- Avoid bypassing DI or static imports that break testability or flexibility.
- Document all changes in the **task-progress.md** file with clear status updates.

### 4.6 Migration Steps

1. Define interfaces in `src/core/llm/interfaces.ts`.
2. Implement multiple `ILLMProvider` classes for each model provider.
3. Implement `LLMAgent` class using injected `ILLMProvider`.
4. Register all providers and agents in the DI container with named bindings.
5. Refactor `config-workflow.ts` to use injected `ILLMAgent` and return `Result`.
6. Update unit and integration tests to use new interfaces and DI.
7. Remove static imports and direct instantiations.
8. Validate strict TypeScript compliance and run full test suite.
9. Update `task-progress.md` with detailed progress and issues.
10. Use feature flags or branches to control rollout.

### 4.7 Architectural Constraints and Decisions

- **No static imports or direct instantiations** of LLM providers or agents allowed.
- All dependencies must be resolved via DI container.
- Multiple providers must be supported simultaneously with clear selection logic.
- Error handling must use the `Result` type consistently.
- Refactoring must preserve existing functionality until fully validated.
- Task progress tracking is mandatory and must be updated continuously.

### 4.8 References

- ADR 0001: TypeScript OOP and DI principles (`docs/architecture/decisions/0001-typescript-oop-refactor.md`)
- ADR 0002: Multiple LLM Providers and DI Integration (`docs/architecture/decisions/0002-multiple-llm-providers.md`)
- Error Handling System Spec (`docs/specs/error-handling-system.md`)
- Dependency Injection System Spec (`docs/specs/dependency-injection-system.md`)
- Master Refactor Plan (`docs/implementation-plans/master-refactor-plan.md`)

---

This update explicitly addresses the need to maintain multiple model providers with proper DI integration, strict adherence to task progress tracking and refactoring plan, and clear guidance on implementing LLMProvider and LLMAgent with extensibility and error handling.

As specified in memory-bank/TechnicalArchitecture.md:120-135, the system uses a modular architecture with dependency injection to enable flexible provider management and error handling patterns.
