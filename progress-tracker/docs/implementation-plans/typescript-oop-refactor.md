# TypeScript Strict Mode and OOP/SOLID Principles Implementation Plan

## 1. Core Domain Model

### 1.1 Base Types and Interfaces

```typescript
// Result type for error handling (updated per ADR-0001)
export class Result<T, E = Error> {
  private constructor(
    private readonly value: T | null,
    private readonly error: E | null
  ) {}

  static ok<T>(value: T): Result<T, never> {
    return new Result(value, null);
  }

  static err<E>(error: E): Result<never, E> {
    return new Result(null, error);
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    return this.isOk() ? Result.ok(fn(this.value!)) : Result.err(this.error!);
  }

  unwrapOr(defaultValue: T): T {
    return this.isOk() ? this.value! : defaultValue;
  }

  isOk(): boolean {
    return this.error === null;
  }
  isErr(): boolean {
    return this.error !== null;
  }
}

// Core domain interfaces
export interface ILLMService {
  generateResponse(prompt: string): Promise<Result<string, Error>>;
  validateResponse(response: string): Result<boolean, Error>;
}

export interface IConfigService {
  loadConfig(): Promise<Result<ProjectConfig, Error>>;
  saveConfig(config: ProjectConfig): Promise<Result<void, Error>>;
  validateConfig(config: ProjectConfig): Result<boolean, Error>;
}

export interface IFileSystemService {
  readFile(path: string): Promise<Result<string, Error>>;
  writeFile(path: string, content: string): Promise<Result<void, Error>>;
  listFiles(dir: string, pattern?: string): Promise<Result<string[], Error>>;
}
```

### 1.2 Enhanced Type Safety

```typescript
// Strict type guards with improved error handling
export const TypeGuards = {
  isProjectConfig(value: unknown): value is ProjectConfig {
    const checks = {
      name: (v: any) => typeof v.name === "string",
      baseDir: (v: any) => typeof v.baseDir === "string",
      rootDir: (v: any) => typeof v.rootDir === "string",
      generators: (v: any) => Array.isArray(v.generators),
    };

    try {
      return Object.entries(checks).every(([key, check]) => check(value));
    } catch {
      return false;
    }
  },

  isLLMConfig(value: unknown): value is LLMConfig {
    const checks = {
      model: (v: any) => typeof v.model === "string",
      provider: (v: any) => typeof v.provider === "string",
      apiKey: (v: any) => typeof v.apiKey === "string",
    };

    try {
      return Object.entries(checks).every(([key, check]) => check(value));
    } catch {
      return false;
    }
  },
};

// Type-safe decorators with improved error context
export function ValidateInput<T>(guard: (value: unknown) => value is T) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: unknown[]) {
      if (!guard(args[0])) {
        return Result.err(
          new TypeError(`Invalid input for ${propertyKey}: expected ${guard.name}`)
        );
      }
      return originalMethod.apply(this, args);
    };
  };
}
```

## 2. Service Layer Implementation

### 2.1 LLM Service

```typescript
@Injectable()
export class LLMService implements ILLMService {
  constructor(
    @Inject("ILLMProvider") private readonly provider: ILLMProvider,
    @Inject("ILogger") private readonly logger: ILogger,
    @Inject("IConfigService") private readonly configService: IConfigService
  ) {}

  @ValidateInput(TypeGuards.isString)
  async generateResponse(prompt: string): Promise<Result<string, Error>> {
    try {
      const configResult = await this.configService.loadConfig();
      if (configResult.isErr()) {
        return Result.err(configResult.error);
      }

      const result = await this.provider.generate(prompt, configResult.unwrapOr({}));
      if (result.isErr()) {
        this.logger.error("LLM generation failed", result.error);
      }
      return result;
    } catch (error) {
      this.logger.error("Unexpected error in LLM generation", error);
      return Result.err(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
```

### 2.2 Config Service

```typescript
@Injectable()
export class ConfigService implements IConfigService {
  constructor(
    @Inject("IFileSystem") private readonly fs: IFileSystemService,
    @Inject("IValidator") private readonly validator: IConfigValidator,
    @Inject("ILogger") private readonly logger: ILogger
  ) {}

  @ValidateInput(TypeGuards.isProjectConfig)
  async saveConfig(config: ProjectConfig): Promise<Result<void, Error>> {
    const validationResult = await this.validator.validateConfig(config);
    if (validationResult.isErr()) {
      return validationResult;
    }

    const configPath = path.join(config.baseDir, "roocode.config.json");
    return this.fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }
}
```

## 3. Migration Strategy

### 3.1 Phase 1: Core Infrastructure (Week 1)

1. Enable TypeScript strict mode:

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
       "alwaysStrict": true
     }
   }
   ```

2. Implement core utilities:

   - Result type for error handling
   - Type guards for runtime validation
   - Validation decorators
   - Logger service with strict types

3. Create dependency injection container:
   - Service registration with types
   - Dependency resolution
   - Lifecycle management
   - Testing utilities

### 3.2 Phase 2: Service Layer Migration (Week 2)

1. LLM Integration:

   - Provider interfaces
   - Langchain adapters
   - Error handling
   - Type-safe configurations

2. Configuration Management:
   - Type-safe config loading
   - Validation pipeline
   - Migration utilities
   - Error handling

### 3.3 Phase 3: Client Code Updates (Week 3)

1. CLI Updates:

   - Type-safe command handling
   - Error propagation
   - User feedback improvements
   - Progress tracking

2. Generator Updates:
   - Template processing
   - File operations
   - Validation logic
   - Error handling

## 4. Testing Strategy

### 4.1 Unit Tests

```typescript
describe("LLMService", () => {
  let service: LLMService;
  let mockProvider: jest.Mocked<ILLMProvider>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockConfig: jest.Mocked<IConfigService>;

  beforeEach(() => {
    mockProvider = {
      generate: jest.fn(),
      validateResponse: jest.fn(),
    };
    mockLogger = {
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    };
    mockConfig = {
      loadConfig: jest.fn(),
      saveConfig: jest.fn(),
      validateConfig: jest.fn(),
    };

    service = new LLMService(mockProvider, mockLogger, mockConfig);
  });

  it("should handle successful response generation", async () => {
    mockConfig.loadConfig.mockResolvedValue(Result.ok(validConfig));
    mockProvider.generate.mockResolvedValue(Result.ok("response"));

    const result = await service.generateResponse("prompt");
    expect(result.isOk()).toBe(true);
    expect(result.unwrapOr("")).toBe("response");
  });

  it("should handle provider errors", async () => {
    mockConfig.loadConfig.mockResolvedValue(Result.ok(validConfig));
    mockProvider.generate.mockResolvedValue(Result.err(new Error("API Error")));

    const result = await service.generateResponse("prompt");
    expect(result.isErr()).toBe(true);
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
```

## 5. Implementation Checklist

- [ ] Enable TypeScript strict mode
- [ ] Implement Result type
- [ ] Create dependency injection container
- [ ] Define core interfaces
- [ ] Implement LLM service adaptations
- [ ] Update config management
- [ ] Add comprehensive tests
- [ ] Update documentation
- [ ] Create migration utilities
- [ ] Perform integration testing

## 6. Success Metrics

1. Code Quality:

   - TypeScript strict checks pass
   - No type assertions
   - Test coverage > 80%
   - Clean lint results

2. Runtime Behavior:

   - No unhandled errors
   - Clear error messages
   - Proper error recovery
   - Performance within targets

3. Developer Experience:
   - Clear type definitions
   - Intuitive interfaces
   - Comprehensive documentation
   - Effective testing utilities
