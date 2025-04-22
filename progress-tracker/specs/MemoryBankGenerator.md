# Technical Specification: MemoryBankGenerator

## Overview

The `MemoryBankGenerator` is a core component responsible for generating memory bank files using LLM-driven content generation. This specification outlines the refactored structure and interfaces for the `MemoryBankGenerator` component.

## Component Diagram

```mermaid
classDiagram
    class MemoryBankGenerator {
        +name: string
        +generate(fileType: MemoryBankFileType, contextPaths: string[]): Promise<Result<string, Error>>
        +generateAllMemoryBankFiles(contextPaths: string[], outputDir: string): Promise<Result<void, Error>>
        -executeGeneration(fileType: MemoryBankFileType, contextPaths: string[]): Promise<Result<string, Error>>
        -validateConfig(config: any): Result<void>
        -getFileTypeInstructions(fileType: MemoryBankFileType): string
        -getSystemPrompt(fileType: MemoryBankFileType): string
        -generateTaskId(): string
        +validate(): Promise<Result<void, Error>>
    }

    class BaseGenerator {
        <<abstract>>
        +name: string
        +generate(fileType: T, contextPaths: string[]): Promise<Result<string, Error>>
        #executeGeneration(fileType: T, contextPaths: string[]): Promise<Result<string, Error>>
        +validate(): Promise<Result<void, Error>>
    }

    class MemoryBankCommandHandler {
        +execute(args: { context?: string[], output?: string }): Promise<void>
        -pathExists(path: string): Promise<boolean>
    }

    MemoryBankGenerator --|> BaseGenerator : extends
    MemoryBankCommandHandler --> MemoryBankGenerator : uses
```

## Dependencies

The `MemoryBankGenerator` depends on the following components:

- `IServiceContainer`: For resolving dependencies
- `IMemoryBankValidator`: For validating memory bank files
- `IMemoryBankFileManager`: For file operations specific to memory bank
- `IMemoryBankTemplateManager`: For loading and validating templates
- `IContentProcessor`: For processing content
- `ILogger`: For logging
- `IProjectConfigService`: For accessing project configuration
- `IProjectContextService`: For gathering project context
- `IPromptBuilder`: For building prompts
- `LLMAgent`: For interacting with LLM

## Interfaces

### IGenerator<T>

```typescript
export interface IGenerator<T> {
  readonly name: string;
  generate(fileType: T, contextPaths: string[]): Promise<Result<string, Error>>;
  validate(): Promise<Result<void, Error>>;
}
```

### MemoryBankFileType

```typescript
export enum MemoryBankFileType {
  ProjectOverview = "ProjectOverview",
  TechnicalArchitecture = "TechnicalArchitecture",
  DeveloperGuide = "DeveloperGuide",
}
```

## Class Definition

### MemoryBankGenerator

```typescript
@Injectable()
export class MemoryBankGenerator extends BaseGenerator<MemoryBankFileType> {
  readonly name = "MemoryBank";

  constructor(
    @Inject("IServiceContainer") protected container: IServiceContainer,
    @Inject("IMemoryBankValidator") private readonly validator: IMemoryBankValidator,
    @Inject("IMemoryBankFileManager") private readonly fileManager: IMemoryBankFileManager,
    @Inject("IMemoryBankTemplateManager")
    private readonly templateManager: IMemoryBankTemplateManager,
    @Inject("IContentProcessor") private readonly contentProcessor: IContentProcessor,
    @Inject("ILogger") private readonly logger: ILogger,
    @Inject("IProjectConfigService") private readonly projectConfigService: IProjectConfigService,
    @Inject("IProjectContextService")
    private readonly projectContextService: IProjectContextService,
    @Inject("IPromptBuilder") private readonly promptBuilder: IPromptBuilder,
    @Inject("LLMAgent") private readonly llmAgent: LLMAgent
  ) {
    super(container);
  }

  // ... methods as defined in the implementation plan
}
```

### MemoryBankCommandHandler

```typescript
@Injectable()
export class MemoryBankCommandHandler {
  constructor(
    @Inject("MemoryBankGenerator") private memoryBankGenerator: MemoryBankGenerator,
    @Inject("IFileOperations") private fileOperations: IFileOperations,
    @Inject("ILogger") private logger: ILogger
  ) {}

  // ... methods as defined in the implementation plan
}
```

## Method Specifications

### generate

```typescript
async generate(fileType: MemoryBankFileType, contextPaths: string[]): Promise<Result<string, Error>>
```

This method is inherited from `BaseGenerator` and serves as the public API for generating a single memory bank file. It performs validation and then calls `executeGeneration`.

**Parameters:**

- `fileType`: The type of memory bank file to generate (ProjectOverview, TechnicalArchitecture, DeveloperGuide)
- `contextPaths`: Array of paths to gather context from

**Returns:**

- `Promise<Result<string, Error>>`: A promise that resolves to a Result containing the generated content or an error

### generateAllMemoryBankFiles

```typescript
async generateAllMemoryBankFiles(contextPaths: string[], outputDir: string = process.cwd()): Promise<Result<void, Error>>
```

This new method orchestrates the generation of all memory bank file types and handles the creation of directories and copying of template files.

**Parameters:**

- `contextPaths`: Array of paths to gather context from
- `outputDir`: Output directory for the generated files (defaults to current working directory)

**Returns:**

- `Promise<Result<void, Error>>`: A promise that resolves to a Result indicating success or failure

### executeGeneration

```typescript
protected async executeGeneration(fileType: MemoryBankFileType, contextPaths: string[]): Promise<Result<string, Error>>
```

This protected method is responsible for generating the content for a single memory bank file type. It gathers context, loads templates, builds prompts, interacts with the LLM, and processes the response.

**Parameters:**

- `fileType`: The type of memory bank file to generate
- `contextPaths`: Array of paths to gather context from

**Returns:**

- `Promise<Result<string, Error>>`: A promise that resolves to a Result containing the generated content or an error

## Data Flow

1. The CLI interface parses the `generate memory-bank` command
2. The application container routes this command to the `MemoryBankCommandHandler`
3. The `MemoryBankCommandHandler` gathers context paths and calls `MemoryBankGenerator.generateAllMemoryBankFiles`
4. The `generateAllMemoryBankFiles` method:
   - Creates the necessary directories
   - Iterates through all memory bank file types
   - Calls `generate` for each file type
   - Writes the generated content to files
   - Copies template files
5. The `generate` method:
   - Performs validation
   - Calls `executeGeneration`
6. The `executeGeneration` method:
   - Gathers context from the provided paths
   - Loads the template for the specified file type
   - Builds prompts using the gathered context
   - Interacts with the LLM to generate content
   - Processes the generated content
   - Returns the processed content

## Error Handling

The `MemoryBankGenerator` uses the `Result<T, E>` pattern for error handling. Each operation returns a `Result` that can be either a success (`Ok`) with a value or a failure (`Err`) with an error. This allows for robust error handling and propagation.

Key error handling points:

- Context gathering failures
- Template loading failures
- Prompt building failures
- LLM interaction failures
- Content processing failures
- File operation failures

## Testing Strategy

1. **Unit Testing**:

   - Test `executeGeneration` with different file types
   - Test `generateAllMemoryBankFiles` with various context paths
   - Test error handling for each failure point

2. **Integration Testing**:

   - Test the end-to-end flow from command handling to file generation
   - Verify correct file content and structure

3. **Mock Testing**:
   - Use mocks for dependencies to test specific scenarios
   - Test error handling with mocked failures

## Implementation Notes

1. The refactored `executeGeneration` method should focus solely on generating content for a single memory bank file type.
2. The new `generateAllMemoryBankFiles` method should handle the orchestration of generating all file types.
3. Ensure proper string conversion when passing `MemoryBankFileType` values to avoid `[object Object]` errors.
4. Ensure the correct project context is passed to the LLM prompt building logic.
5. Avoid variable shadowing by using distinct variable names.

## References

- [Implementation Plan](../implementation-plans/memory-bank-generator-refactoring.md)
- [Architecture Decision Record](../architecture/decisions/2025-04-21-memory-bank-command-refactoring.md)
- [Technical Architecture](../../memory-bank/TechnicalArchitecture.md)
- [Developer Guide](../../memory-bank/DeveloperGuide.md)
