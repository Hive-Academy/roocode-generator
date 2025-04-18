# Dependency Injection System Technical Specification

## Overview

The dependency injection (DI) system provides a centralized mechanism for managing dependencies and implementing inversion of control in the RooCode Generator. It supports constructor injection with enhanced type safety and lifecycle management per ADR-0001.

## Core Components

### 1. Enhanced Container

```typescript
// Enhanced container with better type safety and lifecycle management
export class Container {
  private static instance: Container;
  private readonly services: Map<string, ServiceDescriptor<any>>;
  private readonly singletons: Map<string, any>;
  private readonly resolutionStack: string[] = [];

  private constructor() {
    this.services = new Map();
    this.singletons = new Map();
  }

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }
}

// Type-safe service descriptor
interface ServiceDescriptor<T> {
  token: string;
  implementation: new (...args: any[]) => T;
  lifetime: ServiceLifetime;
  factory?: () => T;
}

enum ServiceLifetime {
  Singleton,
  Transient,
}
```

### 2. Type-Safe Registration

```typescript
export class Container {
  // Type-safe registration methods
  register<T>(
    token: string,
    implementation: new (...args: any[]) => T,
    lifetime = ServiceLifetime.Transient
  ): void {
    this.services.set(token, {
      token,
      implementation,
      lifetime,
    });
  }

  registerSingleton<T>(token: string, implementation: new (...args: any[]) => T): void {
    this.register(token, implementation, ServiceLifetime.Singleton);
  }

  registerFactory<T>(token: string, factory: () => T, lifetime = ServiceLifetime.Transient): void {
    this.services.set(token, {
      token,
      implementation: Object as any,
      lifetime,
      factory,
    });
  }
}
```

### 3. Enhanced Resolution

```typescript
export class Container {
  resolve<T>(token: string): T {
    // Check for circular dependencies
    if (this.resolutionStack.includes(token)) {
      throw new DependencyResolutionError(
        token,
        `Circular dependency detected: ${this.resolutionStack.join(" -> ")} -> ${token}`
      );
    }
    this.resolutionStack.push(token);

    try {
      const descriptor = this.services.get(token);
      if (!descriptor) {
        throw new DependencyResolutionError(token, "Service not registered");
      }

      // Return existing singleton instance if available
      if (descriptor.lifetime === ServiceLifetime.Singleton) {
        const existing = this.singletons.get(token);
        if (existing) {
          return existing;
        }
      }

      // Use factory if provided
      if (descriptor.factory) {
        const instance = descriptor.factory();
        if (descriptor.lifetime === ServiceLifetime.Singleton) {
          this.singletons.set(token, instance);
        }
        return instance;
      }

      // Create new instance with dependencies
      const instance = this.createInstance<T>(descriptor.implementation);
      if (descriptor.lifetime === ServiceLifetime.Singleton) {
        this.singletons.set(token, instance);
      }
      return instance;
    } finally {
      this.resolutionStack.pop();
    }
  }

  private createInstance<T>(implementation: new (...args: any[]) => T): T {
    const params = this.getInjectedParams(implementation);
    return new implementation(...params);
  }

  private getInjectedParams(implementation: new (...args: any[]) => any): any[] {
    const injections = Reflect.getMetadata("injections", implementation) || [];
    return injections.map((injection: { token: string }) => this.resolve(injection.token));
  }
}
```

### 4. Enhanced Decorators

```typescript
// Type-safe injectable decorator
export function Injectable() {
  return function <T extends new (...args: any[]) => any>(target: T) {
    Reflect.defineMetadata("injectable", true, target);
    return target;
  };
}

// Type-safe inject decorator
export function Inject(token: string) {
  return function (target: any, _: string | symbol | undefined, parameterIndex: number) {
    const injections = Reflect.getMetadata("injections", target) || [];
    injections.push({ token, index: parameterIndex });
    Reflect.defineMetadata("injections", injections, target);
  };
}
```

## Usage Examples

### 1. Service Registration

```typescript
const container = Container.getInstance();

// Register core services
container.registerSingleton<ILogger>("ILogger", ConsoleLogger);
container.registerSingleton<IFileSystem>("IFileSystem", NodeFileSystem);
container.register<IGenerator>("IGenerator", RulesGenerator);

// Register with configuration
container.registerFactory<IConfig>(
  "IConfig",
  () => {
    return new ConfigService(loadConfigFromFile());
  },
  ServiceLifetime.Singleton
);
```

### 2. Service Implementation

```typescript
@Injectable()
export class RulesGenerator implements IGenerator {
  constructor(
    @Inject("ILogger") private readonly logger: ILogger,
    @Inject("IFileSystem") private readonly fs: IFileSystem,
    @Inject("IConfig") private readonly config: IConfig
  ) {}

  async generate(config: ProjectConfig): Promise<Result<void, Error>> {
    this.logger.info("Generating rules...");
    // Implementation
  }
}
```

## Error Handling

```typescript
export class DependencyResolutionError extends Error {
  constructor(
    public readonly token: string,
    public readonly message: string,
    public readonly cause?: Error
  ) {
    super(`Failed to resolve dependency ${token}: ${message}`);
    this.name = "DependencyResolutionError";
  }
}
```

## Testing Support

```typescript
export class TestContainer extends Container {
  clear(): void {
    this.services.clear();
    this.singletons.clear();
  }

  mock<T>(token: string, mockImplementation: T): void {
    this.registerFactory(token, () => mockImplementation);
  }
}

describe("RulesGenerator", () => {
  let container: TestContainer;
  let mockLogger: jest.Mocked<ILogger>;
  let mockFs: jest.Mocked<IFileSystem>;

  beforeEach(() => {
    container = new TestContainer();
    mockLogger = createMockLogger();
    mockFs = createMockFileSystem();

    container.mock("ILogger", mockLogger);
    container.mock("IFileSystem", mockFs);
  });

  it("should handle successful generation", async () => {
    const generator = container.resolve<IGenerator>("IGenerator");
    const result = await generator.generate(config);
    expect(result.isOk()).toBe(true);
  });
});
```

## Implementation Guidelines

1. Service Registration

   - Use clear, consistent token naming
   - Choose appropriate service lifetime
   - Document dependencies and lifecycle
   - Consider using symbol tokens for better type safety

2. Dependency Declaration

   - Prefer constructor injection
   - Make dependencies explicit
   - Use interface types for dependencies
   - Avoid optional dependencies

3. Error Handling
   - Provide clear error messages
   - Include resolution context
   - Handle circular dependencies
   - Use type-safe error handling

## Migration Guide

1. Update Service Registration

```typescript
// Before
const logger = new Logger();
const service = new ExistingService(logger);

// After
const container = Container.getInstance();
container.registerSingleton<ILogger>("ILogger", Logger);
container.register<IExistingService>("IExistingService", ExistingService);
```

2. Update Service Implementation

```typescript
// Before
class ExistingService {
  constructor(private logger: Logger) {}
}

// After
@Injectable()
class ExistingService implements IExistingService {
  constructor(@Inject("ILogger") private readonly logger: ILogger) {}
}
```

3. Update Service Resolution

```typescript
// Before
const service = new ExistingService(new Logger());

// After
const service = container.resolve<IExistingService>("IExistingService");
```

## References

- ADR-0001: TypeScript OOP Refactoring
- TypeScript Decorators Documentation
- Dependency Injection Design Pattern
