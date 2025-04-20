# Memory Bank Generator Refactoring Plan

## 1. Core Interfaces

```typescript
// Memory bank file validation
export interface IMemoryBankValidator {
  validateRequiredFiles(baseDir: string): Result<void>;
  validateTemplateFiles(baseDir: string): Result<void>;
  validateFileContent(content: string, type: MemoryBankFileType): Result<void>;
}

// Memory bank file management
export interface IMemoryBankFileManager {
  createMemoryBankDirectory(baseDir: string): Promise<Result<void>>;
  writeMemoryBankFile(path: string, content: string): Promise<Result<void>>;
  readMemoryBankFile(path: string): Promise<Result<string>>;
}

// Template management
export interface IMemoryBankTemplateManager {
  loadTemplate(name: MemoryBankFileType): Promise<Result<string>>;
  validateTemplate(content: string, type: MemoryBankFileType): Result<boolean>;
}

// Content processing
export interface IContentProcessor {
  stripMarkdownCodeBlock(content: MessageContent): Result<string>;
  processTemplate(template: string, data: Record<string, unknown>): Result<string>;
}
```

## 2. Type Definitions

```typescript
export enum MemoryBankFileType {
  ProjectOverview = "ProjectOverview",
  TechnicalArchitecture = "TechnicalArchitecture",
  DevelopmentStatus = "DevelopmentStatus",
  DeveloperGuide = "DeveloperGuide",
}

export enum TemplateType {
  CompletionReport = "completion-report",
  ImplementationPlan = "implementation-plan",
  ModeAcknowledgment = "mode-acknowledgment",
  TaskDescription = "task-description",
}

export interface MemoryBankConfig {
  requiredFiles: MemoryBankFileType[];
  templateFiles: TemplateType[];
  baseDir: string;
  templateDir: string;
}
```

## 3. Core Implementation

### 3.1 Memory Bank Generator

```typescript
@Injectable()
export class MemoryBankGenerator extends BaseGenerator {
  constructor(
    @Inject("IMemoryBankValidator") private readonly validator: IMemoryBankValidator,
    @Inject("IMemoryBankFileManager") private readonly fileManager: IMemoryBankFileManager,
    @Inject("IMemoryBankTemplateManager")
    private readonly templateManager: IMemoryBankTemplateManager,
    @Inject("IContentProcessor") private readonly contentProcessor: IContentProcessor,
    @Inject("ILogger") private readonly logger: ILogger
  ) {
    super();
  }

  async generate(config: ProjectConfig): Promise<Result<void>> {
    try {
      // Validate configuration
      const configValidation = this.validateConfig(config);
      if (configValidation.isFailure) {
        return Result.failure(configValidation.error);
      }

      // Validate required files
      const filesValidation = await this.validator.validateRequiredFiles(config.baseDir);
      if (filesValidation.isFailure) {
        return Result.failure(filesValidation.error);
      }

      // Create memory bank directory
      const dirResult = await this.fileManager.createMemoryBankDirectory(config.baseDir);
      if (dirResult.isFailure) {
        return Result.failure(dirResult.error);
      }

      // Generate core files
      for (const fileType of Object.values(MemoryBankFileType)) {
        const result = await this.generateMemoryBankFile(config.baseDir, fileType);
        if (result.isFailure) {
          this.logger.error(`Failed to generate ${fileType}`, result.error);
          return result;
        }
      }

      return Result.success(void 0);
    } catch (error) {
      this.logger.error("Error in memory bank generation", error);
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async generateMemoryBankFile(
    baseDir: string,
    fileType: MemoryBankFileType
  ): Promise<Result<void>> {
    try {
      const templateResult = await this.templateManager.loadTemplate(fileType);
      if (templateResult.isFailure) {
        return templateResult;
      }

      const processedResult = await this.contentProcessor.processTemplate(templateResult.value, {
        fileType,
        baseDir,
      });
      if (processedResult.isFailure) {
        return processedResult;
      }

      const filePath = path.join(baseDir, "memory-bank", `${fileType}.md`);
      return await this.fileManager.writeMemoryBankFile(filePath, processedResult.value);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
```

### 3.2 Memory Bank Validator

```typescript
@Injectable()
export class MemoryBankValidator implements IMemoryBankValidator {
  constructor(
    @Inject("IFileOperations") private readonly fileOps: IFileOperations,
    @Inject("ILogger") private readonly logger: ILogger
  ) {}

  async validateRequiredFiles(baseDir: string): Promise<Result<void>> {
    try {
      const memoryBankDir = path.join(baseDir, "memory-bank");
      const templateDir = path.join(baseDir, "templates", "memory-bank", "templates");

      const missingFiles: string[] = [];

      // Check memory bank files
      for (const fileType of Object.values(MemoryBankFileType)) {
        const filePath = path.join(memoryBankDir, `${fileType}.md`);
        const exists = await this.fileOps.exists(filePath);
        if (!exists) {
          missingFiles.push(`Missing required memory bank file: ${fileType}.md`);
        }
      }

      // Check template files
      for (const templateType of Object.values(TemplateType)) {
        const filePath = path.join(templateDir, `${templateType}-template.md`);
        const exists = await this.fileOps.exists(filePath);
        if (!exists) {
          missingFiles.push(`Missing required template file: ${templateType}-template.md`);
        }
      }

      if (missingFiles.length > 0) {
        return Result.failure(new Error(`Missing required files:\n${missingFiles.join("\n")}`));
      }

      return Result.success(void 0);
    } catch (error) {
      this.logger.error("Error validating memory bank files", error);
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
```

### 3.3 Content Processor

````typescript
@Injectable()
export class ContentProcessor implements IContentProcessor {
  stripMarkdownCodeBlock(content: MessageContent): Result<string> {
    try {
      const processed = JSON.stringify(content)
        .replace(/^```markdown\s*([\s\S]*?)\s*```$/im, "$1")
        .replace(/^```\s*([\s\S]*?)\s*```$/im, "$1");
      return Result.success(processed);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  processTemplate(template: string, data: Record<string, unknown>): Result<string> {
    try {
      // Implement template processing logic
      let processed = template;
      for (const [key, value] of Object.entries(data)) {
        processed = processed.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), String(value));
      }
      return Result.success(processed);
    } catch (error) {
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
````

## 4. Testing Strategy

```typescript
describe("MemoryBankGenerator", () => {
  let generator: MemoryBankGenerator;
  let mockValidator: jest.Mocked<IMemoryBankValidator>;
  let mockFileManager: jest.Mocked<IMemoryBankFileManager>;
  let mockTemplateManager: jest.Mocked<IMemoryBankTemplateManager>;
  let mockContentProcessor: jest.Mocked<IContentProcessor>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockValidator = {
      validateRequiredFiles: jest.fn(),
      validateTemplateFiles: jest.fn(),
      validateFileContent: jest.fn(),
    };
    mockFileManager = {
      createMemoryBankDirectory: jest.fn(),
      writeMemoryBankFile: jest.fn(),
      readMemoryBankFile: jest.fn(),
    };
    mockTemplateManager = {
      loadTemplate: jest.fn(),
      validateTemplate: jest.fn(),
    };
    mockContentProcessor = {
      stripMarkdownCodeBlock: jest.fn(),
      processTemplate: jest.fn(),
    };
    mockLogger = {
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    };

    generator = new MemoryBankGenerator(
      mockValidator,
      mockFileManager,
      mockTemplateManager,
      mockContentProcessor,
      mockLogger
    );
  });

  it("should generate memory bank files successfully", async () => {
    mockValidator.validateRequiredFiles.mockResolvedValue(Result.success(void 0));
    mockFileManager.createMemoryBankDirectory.mockResolvedValue(Result.success(void 0));
    mockTemplateManager.loadTemplate.mockResolvedValue(Result.success("template content"));
    mockContentProcessor.processTemplate.mockResolvedValue(Result.success("processed content"));
    mockFileManager.writeMemoryBankFile.mockResolvedValue(Result.success(void 0));

    const result = await generator.generate(validConfig);
    expect(result.isSuccess).toBe(true);
  });
});
```

## 5. Migration Steps

1. Create new interfaces and type definitions
2. Implement core services:
   - MemoryBankValidator
   - MemoryBankFileManager
   - MemoryBankTemplateManager
   - ContentProcessor
3. Create MemoryBankGenerator implementation
4. Update dependency injection container
5. Migrate existing code to new implementation
6. Add comprehensive error handling
7. Implement unit tests
8. Update documentation

## 6. Implementation Checklist

- [ ] Define core interfaces and types
- [ ] Implement MemoryBankValidator
- [ ] Implement MemoryBankFileManager
- [ ] Implement MemoryBankTemplateManager
- [ ] Implement ContentProcessor
- [ ] Create MemoryBankGenerator
- [ ] Add error handling with Result type
- [ ] Implement unit tests
- [ ] Update documentation
- [ ] Perform integration testing

---

## 7. Refined Implementation Strategy and Task Breakdown

This section refines the existing plan to provide a clear, actionable implementation strategy for the Code mode, aligned with the overall project architecture and development standards.

### 7.1 Goals

- Implement core interfaces and services for the Memory Bank Generator.
- Ensure robust integration with existing components such as `ProjectConfigService`, `LLMConfigService`, and `FileOperations`.
- Provide comprehensive error handling and logging.
- Develop unit and integration tests to validate functionality.
- Maintain adherence to project coding standards and architectural principles.

### 7.2 Detailed Task Breakdown

#### 7.2.1 Define Core Interfaces and Types

- Implement interfaces:
  - `IMemoryBankValidator`
  - `IMemoryBankFileManager`
  - `IMemoryBankTemplateManager`
  - `IContentProcessor`
- Define enums and types for file and template management.
- Reference: `docs/implementation-plans/memory-bank-refactor.md:3-56`

#### 7.2.2 Implement Core Services

##### MemoryBankValidator

- Validate presence of required memory bank files and templates.
- Use `FileOperations` for filesystem checks.
- Log errors using the project logger.
- Reference: `docs/implementation-plans/memory-bank-refactor.md:139-185`

##### MemoryBankFileManager

- Manage creation of memory bank directories.
- Handle reading and writing of memory bank files.
- Ensure async operations with proper error handling.

##### MemoryBankTemplateManager

- Load and validate templates for memory bank files.
- Support template caching for performance optimization.

##### ContentProcessor

- Implement markdown code block stripping.
- Process templates by replacing placeholders with dynamic data.
- Reference: `docs/implementation-plans/memory-bank-refactor.md:187-216`

#### 7.2.3 Create MemoryBankGenerator

- Inject core services via dependency injection.
- Implement `generate` method to:
  - Validate configuration.
  - Validate required files.
  - Create memory bank directory.
  - Generate each memory bank file by processing templates.
- Handle errors gracefully and log appropriately.
- Reference: `docs/implementation-plans/memory-bank-refactor.md:58-137`

#### 7.2.4 Integration Points

- Integrate with `ProjectConfigService` to obtain project base directory and configuration.
- Use `LLMConfigService` if AI-generated content is needed in templates (future extension).
- Utilize `FileOperations` for all filesystem interactions.
- Ensure all services follow the modular CLI architecture and dependency injection patterns (`memory-bank/TechnicalArchitecture.md:40-70`).

#### 7.2.5 Error Handling and Logging

- Use the `Result` type for method return values to encapsulate success/failure.
- Log errors with detailed context using the project logger.
- Provide user-friendly error messages for CLI output.

#### 7.2.6 Testing Strategy

- Implement unit tests for each core service using Jest.
- Mock dependencies to isolate test cases.
- Validate:
  - File and template validation logic.
  - Template processing correctness.
  - Memory bank file generation flow.
- Reference existing test examples in `docs/implementation-plans/memory-bank-refactor.md:218-274`.

#### 7.2.7 Documentation and Migration

- Update dependency injection container to register new services.
- Migrate existing code to use the new Memory Bank Generator services.
- Update project documentation to reflect new architecture.
- Follow migration steps outlined in `docs/implementation-plans/memory-bank-refactor.md:276-289`.

### 7.3 Implementation Checklist

- [ ] Define core interfaces and types.
- [ ] Implement `MemoryBankValidator`.
- [ ] Implement `MemoryBankFileManager`.
- [ ] Implement `MemoryBankTemplateManager`.
- [ ] Implement `ContentProcessor`.
- [ ] Create `MemoryBankGenerator`.
- [ ] Add comprehensive error handling with `Result` type.
- [ ] Implement unit tests for all components.
- [ ] Update dependency injection container.
- [ ] Migrate existing code to new implementation.
- [ ] Update documentation.
- [ ] Perform integration testing.

### 7.4 Architectural Alignment

This implementation strategy adheres to the modular CLI architecture, configuration-driven development, and dependency injection patterns described in `memory-bank/TechnicalArchitecture.md`. It ensures separation of concerns, testability, and maintainability consistent with project standards.

---
