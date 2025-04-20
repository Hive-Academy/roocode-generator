# Developer Quick Start Guide: TypeScript and OOP Refactoring

## Overview

This guide provides a quick start for developers working on the RooCode Generator TypeScript and OOP refactoring project. It covers essential concepts, setup instructions, and common patterns you'll need to implement.

## Getting Started

### 1. Environment Setup

```bash
# Update dependencies
npm install typescript@latest @types/node@latest
npm install --save-dev jest @types/jest ts-jest

# Install development tools
npm install --save-dev eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
```

### 2. TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "useUnknownInCatchVariables": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "allowUnusedLabels": false,
    "allowUnreachableCode": false,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

## Core Patterns

### 1. Error Handling with Result Type

```typescript
// Always return Result for operations that can fail
async function loadConfig(): Promise<Result<Config>> {
  try {
    const content = await fs.readFile("config.json", "utf8");
    return Result.success(JSON.parse(content));
  } catch (error) {
    return Result.failure(new ConfigError("Failed to load config", { error: String(error) }));
  }
}

// Using Results
const configResult = await loadConfig();
if (configResult.isFailure) {
  logger.error("Config load failed", configResult.error);
  return configResult;
}
const config = configResult.value;
```

### 2. Dependency Injection

```typescript
// Service registration
const container = Container.getInstance();
container.registerSingleton("ILogger", Logger);
container.registerSingleton("IFileSystem", FileSystem);
container.registerTransient("IGenerator", RulesGenerator);

// Service implementation
@Injectable()
class RulesGenerator implements IGenerator {
  constructor(
    @Inject("ILogger") private readonly logger: ILogger,
    @Inject("IFileSystem") private readonly fs: IFileSystem
  ) {}

  async generate(config: ProjectConfig): Promise<Result<void>> {
    // Implementation
  }
}

// Service usage
const generator = container.resolve<IGenerator>("IGenerator");
```

### 3. Interface Implementation

```typescript
// Define interface
export interface IFileSystem {
  readFile(path: string): Promise<Result<string>>;
  writeFile(path: string, content: string): Promise<Result<void>>;
  exists(path: string): Promise<boolean>;
}

// Implement interface
@Injectable()
export class FileSystem implements IFileSystem {
  async readFile(path: string): Promise<Result<string>> {
    try {
      const content = await fs.promises.readFile(path, "utf8");
      return Result.success(content);
    } catch (error) {
      return Result.failure(new FileSystemError("Read failed", path, { error: String(error) }));
    }
  }
}
```

## Testing Patterns

### 1. Unit Test Setup

```typescript
describe("RulesGenerator", () => {
  let generator: RulesGenerator;
  let mockLogger: jest.Mocked<ILogger>;
  let mockFs: jest.Mocked<IFileSystem>;

  beforeEach(() => {
    mockLogger = {
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    };
    mockFs = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      exists: jest.fn(),
    };

    generator = new RulesGenerator(mockLogger, mockFs);
  });

  it("should handle successful generation", async () => {
    mockFs.readFile.mockResolvedValue(Result.success("template content"));
    mockFs.writeFile.mockResolvedValue(Result.success(void 0));

    const result = await generator.generate(validConfig);
    expect(result.isSuccess).toBe(true);
  });

  it("should handle file read errors", async () => {
    const error = new Error("Read failed");
    mockFs.readFile.mockResolvedValue(Result.failure(error));

    const result = await generator.generate(validConfig);
    expect(result.isFailure).toBe(true);
    expect(result.error).toBe(error);
  });
});
```

### 2. Integration Test Setup

```typescript
describe("Integration Tests", () => {
  let container: Container;

  beforeEach(() => {
    container = Container.getInstance();
    container.registerSingleton("ILogger", TestLogger);
    container.registerSingleton("IFileSystem", TestFileSystem);
  });

  it("should execute complete workflow", async () => {
    const generator = container.resolve<IGenerator>("IGenerator");
    const result = await generator.generate(testConfig);
    expect(result.isSuccess).toBe(true);
    // Verify generated files
  });
});
```

## Common Tasks

### 1. Adding a New Generator

```typescript
@Injectable()
export class NewGenerator extends BaseGenerator {
  constructor(
    @Inject("ILogger") protected readonly logger: ILogger,
    @Inject("IFileSystem") protected readonly fs: IFileSystem,
    @Inject("ITemplateManager") protected readonly templates: ITemplateManager
  ) {
    super();
  }

  async generate(config: ProjectConfig): Promise<Result<void>> {
    // Implementation
  }

  protected validate(config: ProjectConfig): Result<boolean> {
    // Validation logic
  }
}

// Register generator
container.registerTransient("INewGenerator", NewGenerator);
```

### 2. Adding Template Support

```typescript
// Template definition (template.md)
---
name: new-template
version: 1.0.0
variables:
  - name: title
    type: string
    required: true
  - name: items
    type: array
    required: true
---
# {{title}}

{{#each items}}
- {{this}}
{{/each}}

// Template usage
const templateResult = await this.templates.loadTemplate('new-template');
if (templateResult.isFailure) {
  return templateResult;
}

const processedResult = await this.templates.processTemplate(
  templateResult.value,
  {
    title: 'My Title',
    items: ['Item 1', 'Item 2']
  }
);
```

### 3. Error Handling

```typescript
// Define specific error
export class GeneratorError extends RooCodeError {
  constructor(
    message: string,
    public readonly generatorName: string,
    context?: Record<string, unknown>
  ) {
    super(message, "GENERATOR_ERROR", { ...context, generatorName });
  }
}

// Error handling in generators
async function processFile(path: string): Promise<Result<void>> {
  const readResult = await this.fs.readFile(path);
  if (readResult.isFailure) {
    return Result.failure(
      new GeneratorError("File processing failed", this.name, { path, error: readResult.error })
    );
  }
  // Process content
}
```

## Development Workflow

1. **Start with Interfaces**

   - Define clear contracts
   - Document requirements
   - Consider error cases

2. **Implement Core Logic**

   - Use Result type
   - Handle all errors
   - Add logging

3. **Add Tests**

   - Unit tests first
   - Integration tests
   - Error cases
   - Edge cases

4. **Review and Refine**
   - Check type safety
   - Verify error handling
   - Ensure test coverage
   - Update documentation

## Common Issues and Solutions

### 1. Type Safety

```typescript
// ❌ Avoid
function process(data: any): any {
  // Implementation
}

// ✅ Use
function process(data: unknown): Result<ProcessedData> {
  if (!isValidData(data)) {
    return Result.failure(new ValidationError("Invalid data"));
  }
  // Implementation
}
```

### 2. Error Handling

```typescript
// ❌ Avoid
try {
  await processFile();
} catch (error) {
  console.error(error);
}

// ✅ Use
const result = await processFile();
if (result.isFailure) {
  logger.error("File processing failed", result.error, result.context);
  return result;
}
```

### 3. Dependency Management

```typescript
// ❌ Avoid
class Service {
  private logger = new Logger();
}

// ✅ Use
@Injectable()
class Service {
  constructor(@Inject("ILogger") private readonly logger: ILogger) {}
}
```

## Resources

- Technical Specifications: `/docs/specs/`
- Implementation Plans: `/docs/implementation-plans/`
- Architecture Decisions: `/docs/architecture/decisions/`
- Type Definitions: `/types/`

## Getting Help

- Review the technical specifications
- Check the implementation plans
- Consult the architecture decisions
- Ask for code review
- Update documentation
