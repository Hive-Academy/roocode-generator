# Template Management System Technical Specification

## Overview

The template management system provides a robust, type-safe approach to handling templates across the RooCode Generator. It supports template loading, validation, processing, and caching while maintaining strict type safety and error handling per ADR-0001.

## Core Components

### 1. Template Types and Interfaces

```typescript
// Template metadata with strict typing
export interface TemplateMetadata {
  name: string;
  version: string;
  description: string;
  variables: TemplateVariable[];
  validationRules?: ValidationRule[];
}

export interface TemplateVariable {
  name: string;
  type: "string" | "number" | "boolean" | "array";
  description: string;
  required: boolean;
  defaultValue?: unknown;
  validation?: ValidationRule[];
}

export interface ValidationRule {
  type: "required" | "enum" | "regex" | "custom";
  value?: unknown;
  message: string;
}

// Enhanced template manager interface with Result type
export interface ITemplateManager {
  loadTemplate(name: string): Promise<Result<Template, TemplateError>>;
  validateTemplate(template: Template): Result<boolean, TemplateError>;
  processTemplate(template: Template, data: Record<string, unknown>): Result<string, TemplateError>;
  cacheTemplate(template: Template): void;
}

// Template model with enhanced error handling
export class Template {
  constructor(
    public readonly content: string,
    public readonly metadata: TemplateMetadata,
    public readonly path: string
  ) {}

  static fromFile(content: string, path: string): Result<Template, TemplateError> {
    try {
      const [metadataStr, templateContent] = content.split("---\n");
      const metadata = parseYaml(metadataStr);
      return Result.ok(new Template(templateContent.trim(), metadata, path));
    } catch (error) {
      return Result.err(
        new TemplateError(
          "Failed to parse template",
          path,
          error instanceof Error ? error : new Error(String(error))
        )
      );
    }
  }
}
```

### 2. Enhanced Template Manager Implementation

```typescript
@Injectable()
export class TemplateManager implements ITemplateManager {
  private readonly templateCache: Map<string, Template> = new Map();

  constructor(
    @Inject("IFileSystem") private readonly fs: IFileSystem,
    @Inject("IValidator") private readonly validator: IValidator,
    @Inject("ILogger") private readonly logger: ILogger
  ) {}

  async loadTemplate(name: string): Promise<Result<Template, TemplateError>> {
    // Check cache first
    const cached = this.templateCache.get(name);
    if (cached) {
      return Result.ok(cached);
    }

    // Load template file
    const templatePath = this.resolveTemplatePath(name);
    const contentResult = await this.fs.readFile(templatePath);
    if (contentResult.isErr()) {
      return Result.err(
        new TemplateError(`Failed to load template: ${name}`, templatePath, contentResult.error)
      );
    }

    // Parse and validate template
    return Template.fromFile(contentResult.unwrapOr(""), templatePath)
      .flatMap((template) => this.validateTemplate(template).map(() => template))
      .map((template) => {
        this.cacheTemplate(template);
        return template;
      });
  }

  validateTemplate(template: Template): Result<boolean, TemplateError> {
    return this.validator
      .validateObject(template.metadata, TemplateMetadataSchema)
      .flatMap(() => this.validateVariables(template.metadata.variables))
      .flatMap(() => this.validateTemplateSyntax(template.content))
      .map(() => true);
  }

  processTemplate(
    template: Template,
    data: Record<string, unknown>
  ): Result<string, TemplateError> {
    return this.validateTemplateData(template, data)
      .flatMap(() => this.processWithHandlebars(template.content, data))
      .mapErr(
        (error) => new TemplateError("Template processing failed", template.path, error, { data })
      );
  }

  cacheTemplate(template: Template): void {
    this.templateCache.set(template.metadata.name, template);
  }

  private validateVariables(variables: TemplateVariable[]): Result<boolean, TemplateError> {
    for (const variable of variables) {
      const result = this.validator.validateObject(variable, TemplateVariableSchema);
      if (result.isErr()) {
        return result;
      }
    }
    return Result.ok(true);
  }

  private validateTemplateData(
    template: Template,
    data: Record<string, unknown>
  ): Result<boolean, TemplateError> {
    for (const variable of template.metadata.variables) {
      if (variable.required && !(variable.name in data)) {
        return Result.err(
          new TemplateError(`Missing required variable: ${variable.name}`, template.path, null, {
            variable,
            data,
          })
        );
      }

      if (variable.name in data) {
        const result = this.validateVariableValue(data[variable.name], variable);
        if (result.isErr()) {
          return result;
        }
      }
    }
    return Result.ok(true);
  }
}
```

### 3. Enhanced Error Types

```typescript
export class TemplateError extends Error {
  constructor(
    message: string,
    public readonly templatePath: string,
    public readonly cause: Error | null = null,
    public readonly context: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "TemplateError";
  }
}
```

## Usage Examples

### 1. Template Definition

```yaml
---
name: rules-template
version: 1.0.0
description: Template for generating rules files
variables:
  - name: mode
    type: string
    description: Mode name
    required: true
    validation:
      - type: enum
        value: ["boomerang", "architect", "code", "code-review"]
        message: Invalid mode specified
  - name: rules
    type: array
    description: List of rules
    required: true
    validation:
      - type: custom
        value: validateRules
        message: Invalid rules format
---
# {{capitalize mode}} Mode Rules

{{#each rules}}
## Rule {{@index}}: {{this.title}}

{{this.description}}

**Examples:**
{{#each this.examples}}
- {{this}}
{{/each}}

{{/each}}
```

### 2. Enhanced Template Usage

```typescript
@Injectable()
export class RulesGenerator extends BaseGenerator {
  constructor(
    @Inject("ITemplateManager") private readonly templates: ITemplateManager,
    @Inject("ILogger") private readonly logger: ILogger
  ) {
    super();
  }

  async generate(config: ProjectConfig): Promise<Result<void, Error>> {
    return await this.templates
      .loadTemplate("rules-template")
      .flatMap((template) =>
        this.templates.processTemplate(template, {
          mode: config.mode,
          rules: config.rules,
        })
      )
      .flatMap((content) => this.fs.writeFile("rules.md", content));
  }
}
```

## Testing Strategy

```typescript
describe("TemplateManager", () => {
  let manager: TemplateManager;
  let mockFs: jest.Mocked<IFileSystem>;
  let mockValidator: jest.Mocked<IValidator>;

  beforeEach(() => {
    mockFs = createMockFileSystem();
    mockValidator = createMockValidator();
    manager = new TemplateManager(mockFs, mockValidator, mockLogger);
  });

  it("should handle successful template processing", async () => {
    const template = createTestTemplate();
    const data = { name: "Test", description: "Description" };

    mockFs.readFile.mockResolvedValue(Result.ok(templateContent));
    mockValidator.validateObject.mockReturnValue(Result.ok(true));

    const result = await manager
      .loadTemplate("test")
      .flatMap((template) => manager.processTemplate(template, data));

    expect(result.isOk()).toBe(true);
    expect(result.unwrapOr("")).toBe("Test - Description");
  });

  it("should handle validation errors", async () => {
    mockFs.readFile.mockResolvedValue(Result.ok(invalidTemplate));

    const result = await manager.loadTemplate("invalid");

    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(TemplateError);
  });
});
```

## Implementation Guidelines

1. Template Structure

   - Use YAML front matter for metadata
   - Define strict validation rules
   - Include comprehensive variable definitions
   - Document template requirements

2. Error Handling

   - Use Result type consistently
   - Provide detailed error context
   - Implement proper error recovery
   - Log errors appropriately

3. Performance
   - Implement efficient caching
   - Optimize template processing
   - Minimize file system operations
   - Use lazy loading where appropriate

## References

- ADR-0001: TypeScript OOP Refactoring
- Error Handling System Specification
- Dependency Injection System Specification
