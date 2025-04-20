# Memory Bank Generator Refactoring Plan

## 1. Introduction

This document outlines the plan to refactor the existing Memory Bank Generator into a more maintainable, testable, and extensible class-based structure. The refactoring will adhere to Object-Oriented Programming (OOP) principles, SOLID principles, Dependency Injection (DI), and utilize the `Result` type for robust error handling, as decided in `progress-tracker/docs/architecture/decisions/0001-typescript-oop-refactor.md:1-15` and specified in `progress-tracker/docs/specs/error-handling-system.md:1-20`.

The current implementation is procedural and tightly coupled, making it difficult to test and extend. The refactoring aims to improve code quality and prepare the generator for future enhancements, including LLM-driven content generation.

## 2. Goals

- Refactor the Memory Bank Generator into a TypeScript class.
- Implement Dependency Injection for external services (e.g., file operations, template management).
- Utilize the `Result<T, E>` type for all operations that may fail.
- Improve testability by allowing mocking of dependencies.
- Lay the groundwork for future features, specifically LLM integration.

## 3. Non-Goals

- Implementing the LLM-driven content generation logic itself (this is planned as a subsequent step, detailed in Section 6).
- Changing the core functionality of identifying and processing memory bank directives.

## 4. Architectural Approach

The refactored generator will be a class (`MemoryBankGenerator`) with dependencies injected via its constructor. Key dependencies will include:

- `IFileOperations`: For reading and writing files.
- `ITemplateManager`: For loading and processing templates.
- `ILLMAgent`: For interacting with the Language Model (detailed in Section 6).
- `IProjectContextService`: For gathering project context for the LLM (detailed in Section 6).
- `IPromptBuilder`: For constructing prompts for the LLM (detailed in Section 6).

The `generate` method will orchestrate the process, using the injected dependencies and handling errors via the `Result` type.

## 5. Implementation Plan

### Phase 1: Core Refactoring (Completed)

1.  Create a `MemoryBankGenerator` class in `src/generators/memory-bank-generator.ts`.
2.  Define the `IMemoryBankGenerator` interface in `src/core/memory-bank/interfaces.ts`.
3.  Move existing generator logic into the `MemoryBankGenerator` class methods.
4.  Identify external dependencies (file system, templates).
5.  Define interfaces for these dependencies (`IFileOperations`, `ITemplateManager` - assuming these exist or will be created separately).
6.  Inject dependencies via the constructor.
7.  Replace direct file system/template calls with dependency calls.
8.  Refactor error handling to use the `Result` type throughout the class methods.
9.  Add basic unit tests for the refactored class, mocking dependencies.

### Phase 2: LLM Integration Planning (Current Task)

This phase details the plan for adding LLM-driven content generation capabilities.

## 6. LLM-Driven Content Generation Integration Plan

This section outlines the design and steps to integrate LLM-driven content generation into the refactored `MemoryBankGenerator`. This functionality will allow the generator to use project context and LLMs to create rich memory bank content based on directives and templates.

### 6.1. Design

The LLM integration will involve the following components and interactions:

- **Project Context Gathering**: A new service (`IProjectContextService`) will be responsible for reading specified project files and folders to gather relevant context. This is an enhancement over the previous implementation which primarily used the `projectConfig` object for context. The gathered context will be provided to the LLM.
- **Prompt Building**: A component (`IPromptBuilder`) will construct the final prompt for the LLM by combining a base instruction, the gathered project context, and the content of the relevant memory bank template. This mirrors the structure used in the old implementation's prompt construction but is now encapsulated in a dedicated service.
- **LLM Invocation**: The generator will interact with the LLM using the `ILLMAgent` interface.
- **Integration into Generator Workflow**: The `generate` method will be updated to incorporate these steps when a memory bank directive requires LLM generation.

### 6.2. New/Updated Interfaces

To support this functionality, the following interfaces will be introduced or updated:

- `IProjectContextService`: Defines the contract for gathering project context.

  ```typescript
  // Defined in src/core/memory-bank/interfaces.ts
  export interface IProjectContextService {
    /**
     * Gathers context from specified project files and directories.
     * @param paths - An array of file and directory paths to include in the context.
     * @returns A Result containing the gathered context as a string, or an error.
     */
    gatherContext(paths: string[]): Promise<Result<string, Error>>;
  }
  ```

  _Rationale:_ Encapsulates the logic for reading and potentially summarizing project files, keeping the generator focused on its core responsibility. Depends on `IFileOperations`.

- `IPromptBuilder`: Defines the contract for building the LLM prompt.

  ```typescript
  // Defined in src/core/memory-bank/interfaces.ts
  export interface IPromptBuilder {
    /**
     * Builds the complete prompt for the LLM.
     * @param baseInstruction - The base instruction for the LLM.
     * @param projectContext - The gathered context from the project.
     * @param templateContent - The content of the memory bank template.
     * @returns The complete prompt string.
     */
    buildPrompt(
      baseInstruction: string,
      projectContext: string,
      templateContent: string
    ): Result<string, Error>;
  }
  ```

  _Rationale:_ Separates the prompt construction logic, making it testable and allowing for different prompt strategies. Depends on `ITemplateManager` (indirectly, via templateContent).

- `IMemoryBankGenerator`: The existing interface will need to reflect the new dependencies in its constructor signature (though the interface itself defines the public methods, the _implementation_ will have the updated constructor).

### 6.3. Dependencies

The `MemoryBankGenerator` class will gain the following dependencies injected via its constructor:

- `IProjectContextService`
- `IPromptBuilder`
- `ILLMAgent` (assuming an instance of this interface is available, potentially provided by a higher-level orchestrator or factory).

The constructor signature will conceptually change from:

```typescript
constructor(fileOperations: IFileOperations, templateManager: ITemplateManager)
```

To:

```typescript
constructor(
    fileOperations: IFileOperations,
    templateManager: ITemplateManager,
    projectContextService: IProjectContextService,
    promptBuilder: IPromptBuilder,
    llmAgent: ILLMAgent
)
```

### 6.4. Integration Steps into `MemoryBankGenerator.generate`

The `generate` method will be modified to include the following steps when processing a directive that requires LLM generation (e.g., a new directive type or a flag on an existing one):

1.  **Parse Directive**: Identify if the directive requires LLM generation and extract any parameters (e.g., list of files/folders for context, specific prompt instruction).
2.  **Gather Context**: If LLM generation is required, call `this.projectContextService.gatherContext(contextPaths)`.
    - Handle the `Result`: If an error occurs, return an error `Result` from `generate`.
    - Extract the context string on success.
3.  **Load Template**: Load the relevant memory bank template using `this.templateManager.loadTemplate(templateName)`. - Handle the `Result`: If an error occurs, return an error `Result` from `generate`. - Extract the template content on success.
    :start_line:146

---

4.  **Build Prompt**: Call `this.promptBuilder.buildPrompt(baseInstruction, projectContext, templateContent)`. This step combines the base instruction for the LLM, the context gathered from project files, and the content of the memory bank template, similar to the approach in the old implementation but using the dedicated `IPromptBuilder` service.
    - Handle the `Result`: If an error occurs, return an error `Result` from `generate`.
    - Extract the final prompt string on success.
5.  **Invoke LLM**: Call `this.llmAgent.generateContent(prompt)`.
    - Handle the `Result`: If an error occurs, return an error `Result` from `generate`.
    - Extract the generated content string on success.
6.  **Generate Final Content**: Use the generated content from the LLM (instead of just the template) to construct the final memory bank entry.
7.  **Write File**: Proceed with writing the file using `this.fileOperations.writeFile()`, as in the original plan.

### 6.5. Error Handling

All new operations (`gatherContext`, `buildPrompt`, `llmAgent.generateContent`) will return `Result` types. The `generate` method will use monadic operations (like `andThen` or pattern matching) on the `Result` to chain these operations and propagate any errors that occur at any step. This ensures that if context gathering fails, the LLM is not called, and if the LLM call fails, the file is not written with incomplete or erroneous content.

## 7. Testing Strategy

- **Unit Tests**: Add unit tests for the new `ProjectContextService` and `PromptBuilder` implementations, mocking their dependencies (`IFileOperations`, `ITemplateManager`).
- **MemoryBankGenerator Unit Tests**: Update existing unit tests for `MemoryBankGenerator` to include test cases for the LLM generation flow. Mock `IProjectContextService`, `IPromptBuilder`, and `ILLMAgent` to control their behavior and verify the generator's logic and error handling.
- **Integration Tests**: Add integration tests that use concrete implementations of the new services and a mock or test double for `ILLMAgent` to verify the interaction between components.

## 8. Risks and Mitigation

- **Risk**: LLM API latency or failures impact generation time.
  - **Mitigation**: Implement timeouts and retry mechanisms within the `ILLMAgent` implementation. Provide clear error reporting via the `Result` type. Consider asynchronous processing if generation becomes a bottleneck.
- **Risk**: LLM context window limitations.
  - **Mitigation**: The `IProjectContextService` should implement strategies to select the most relevant files or summarize content if the total context size exceeds a predefined limit. Document these strategies.
- **Risk**: Poor quality or irrelevant content from the LLM.
  - **Mitigation**: Refine prompts (`IPromptBuilder`). Allow users to specify which files/folders are most relevant for context. Consider post-processing or validation of LLM output.
- **Risk**: Increased complexity in `MemoryBankGenerator`.
  - **Mitigation**: Ensure the new services (`IProjectContextService`, `IPromptBuilder`) encapsulate their logic effectively, keeping the generator's role as an orchestrator.

## 9. Future Extensions (Beyond this Plan)

- Implementing concrete classes for `ProjectContextService` and `PromptBuilder`.
- Adding configuration options for context files/folders and base prompts.
- Exploring different prompt building strategies.
- Implementing a mechanism to define LLM generation directives within memory bank files.
- Adding streaming support for LLM output.
