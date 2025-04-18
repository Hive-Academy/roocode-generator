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

### 3.2 System Prompts Generator

```typescript
@Injectable()
export class SystemPromptsGenerator extends ModeGenerator {
  protected readonly mode = "system-prompts";
  protected readonly templateName = "system-prompt.md";

  async generate(config: ProjectConfig): Promise<Result<void>> {
    const modes = [
      { slug: "boomerang", template: "system-prompt-boomerang.md" },
      { slug: "architect", template: "system-prompt-architect.md" },
      { slug: "code", template: "system-prompt-code.md" },
      { slug: "code-review", template: "system-prompt-code-review.md" },
    ];

    try {
      for (const { slug, template } of modes) {
        const templateResult = await this.templateManager.loadTemplate(template);
        if (templateResult.isFailure) {
          return templateResult;
        }

        const outDir = path.join(config.baseDir, ".roo");
        const dirResult = await this.fileOps.ensureDirectory(outDir);
        if (dirResult.isFailure) {
          return dirResult;
        }

        const outPath = path.join(outDir, `system-prompt-${slug}`);
        const writeResult = await this.fileOps.writeFile(outPath, templateResult.value);
        if (writeResult.isFailure) {
          return writeResult;
        }
      }

      return Result.success(void 0);
    } catch (error) {
      this.logger.error("Error generating system prompts", error);
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
```

## 4. Infrastructure Implementation

### 4.1 Template Manager

```typescript
@Injectable()
export class TemplateManager implements ITemplateManager {
  constructor(
    @Inject("IFileOperations") private readonly fileOps: IFileOperations,
    @Inject("ILogger") private readonly logger: ILogger
  ) {}

  async loadTemplate(name: string): Promise<Result<string>> {
    try {
      const templatePath = path.join(__dirname, "..", "templates", name);
      const result = await this.fileOps.readFile(templatePath);
      if (result.isFailure) {
        this.logger.error(`Failed to load template: ${name}`, result.error);
        return result;
      }
      return Result.success(result.value);
    } catch (error) {
      this.logger.error(`Error loading template: ${name}`, error);
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  validateTemplate(content: string): Result<boolean> {
    if (!content || typeof content !== "string") {
      return Result.failure(new Error("Invalid template content"));
    }
    return Result.success(true);
  }
}
```

## 5. Migration Steps

1. Create new interfaces and base classes
2. Implement infrastructure services (TemplateManager, FileOperations)
3. Create concrete generator implementations
4. Update dependency injection container
5. Refactor existing code to use new implementations
6. Add comprehensive error handling
7. Update tests for new architecture

## 6. Testing Strategy

```typescript
describe("RulesGenerator", () => {
  let generator: RulesGenerator;
  let mockTemplateManager: jest.Mocked<ITemplateManager>;
  let mockFileOps: jest.Mocked<IFileOperations>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockTemplateManager = {
      loadTemplate: jest.fn(),
      validateTemplate: jest.fn(),
    };
    mockFileOps = {
      ensureDirectory: jest.fn(),
      writeFile: jest.fn(),
      copyFile: jest.fn(),
    };
    mockLogger = {
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    };

    generator = new RulesGenerator(mockTemplateManager, mockFileOps, mockLogger);
  });

  it("should generate rules for all modes", async () => {
    mockTemplateManager.loadTemplate.mockResolvedValue(Result.success("template content"));
    mockFileOps.ensureDirectory.mockResolvedValue(Result.success(void 0));
    mockFileOps.writeFile.mockResolvedValue(Result.success(void 0));

    const result = await generator.generate(validConfig);
    expect(result.isSuccess).toBe(true);
    expect(mockTemplateManager.loadTemplate).toHaveBeenCalledTimes(4);
    expect(mockFileOps.writeFile).toHaveBeenCalledTimes(4);
  });
});
```

## 7. Implementation Checklist

- [ ] Create core interfaces (IGenerator, ITemplateManager, IFileOperations)
- [ ] Implement abstract base classes (BaseGenerator, ModeGenerator)
- [ ] Create TemplateManager implementation
- [ ] Implement FileOperations service
- [ ] Create concrete generator classes
- [ ] Update dependency injection configuration
- [ ] Add comprehensive error handling
- [ ] Implement unit tests
- [ ] Update documentation
- [ ] Perform integration testing
