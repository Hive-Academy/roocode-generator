# Core Application Workflow Refactoring Plan

## 1. Core Application Interfaces

```typescript
// Generator orchestration
export interface IGeneratorOrchestrator {
  executeGenerators(config: ProjectConfig, options: GeneratorOptions): Promise<Result<void>>;
  validateGenerators(generators: string[]): Result<boolean>;
}

// Project configuration management
export interface IProjectManager {
  detectProjectType(): Promise<Result<ProjectType>>;
  initializeProject(type: ProjectType): Promise<Result<ProjectConfig>>;
  validateProject(config: ProjectConfig): Result<boolean>;
}

// CLI interaction
export interface ICliInterface {
  promptForProjectMode(): Promise<Result<ProjectMode>>;
  promptForGenerators(): Promise<Result<GeneratorOptions>>;
  displayProgress(message: string): void;
  displayError(error: Error): void;
}
```

## 2. Type Definitions

```typescript
export enum ProjectMode {
  Auto = "auto",
  Existing = "existing",
  New = "new",
}

export enum ProjectType {
  Node = "node",
  TypeScript = "typescript",
  JavaScript = "javascript",
}

export interface GeneratorOptions {
  memoryBank: boolean;
  rules: boolean;
  systemPrompts: boolean;
  roomodes: boolean;
  mode: "roo" | "vscode";
}

export interface GeneratorResult {
  success: boolean;
  generatedFiles: string[];
  errors: Error[];
}
```

## 3. Core Implementation

### 3.1 Application Container

```typescript
@Injectable()
export class ApplicationContainer {
  constructor(
    @Inject("IGeneratorOrchestrator") private readonly orchestrator: IGeneratorOrchestrator,
    @Inject("IProjectManager") private readonly projectManager: IProjectManager,
    @Inject("ICliInterface") private readonly cli: ICliInterface,
    @Inject("ILogger") private readonly logger: ILogger
  ) {}

  async run(): Promise<Result<void>> {
    try {
      // Get project mode
      const modeResult = await this.cli.promptForProjectMode();
      if (modeResult.isFailure) {
        return Result.failure(modeResult.error);
      }

      // Initialize project
      const configResult = await this.initializeProject(modeResult.value);
      if (configResult.isFailure) {
        return Result.failure(configResult.error);
      }

      // Get generator options
      const optionsResult = await this.cli.promptForGenerators();
      if (optionsResult.isFailure) {
        return Result.failure(optionsResult.error);
      }

      // Execute generators
      return await this.orchestrator.executeGenerators(configResult.value, optionsResult.value);
    } catch (error) {
      this.logger.error("Application execution failed", error);
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private async initializeProject(mode: ProjectMode): Promise<Result<ProjectConfig>> {
    switch (mode) {
      case ProjectMode.Auto:
        const typeResult = await this.projectManager.detectProjectType();
        if (typeResult.isFailure) {
          return Result.failure(typeResult.error);
        }
        return await this.projectManager.initializeProject(typeResult.value);

      case ProjectMode.Existing:
      case ProjectMode.New:
        return await this.projectManager.initializeProject(ProjectType.TypeScript);

      default:
        return Result.failure(new Error(`Unsupported project mode: ${mode}`));
    }
  }
}
```

### 3.2 Generator Orchestrator

```typescript
@Injectable()
export class GeneratorOrchestrator implements IGeneratorOrchestrator {
  constructor(
    @Inject("IMemoryBankGenerator") private readonly memoryBankGenerator: IGenerator,
    @Inject("IRulesGenerator") private readonly rulesGenerator: IGenerator,
    @Inject("ISystemPromptsGenerator") private readonly systemPromptsGenerator: IGenerator,
    @Inject("IRoomodesGenerator") private readonly roomodesGenerator: IGenerator,
    @Inject("ILogger") private readonly logger: ILogger
  ) {}

  async executeGenerators(config: ProjectConfig, options: GeneratorOptions): Promise<Result<void>> {
    try {
      if (options.memoryBank) {
        const result = await this.memoryBankGenerator.generate(config);
        if (result.isFailure) {
          return result;
        }
      }

      if (options.mode === "roo") {
        if (options.rules) {
          const result = await this.rulesGenerator.generate(config);
          if (result.isFailure) {
            return result;
          }
        }

        if (options.systemPrompts) {
          const result = await this.systemPromptsGenerator.generate(config);
          if (result.isFailure) {
            return result;
          }
        }

        if (options.roomodes) {
          const result = await this.roomodesGenerator.generate(config);
          if (result.isFailure) {
            return result;
          }
        }
      }

      return Result.success(void 0);
    } catch (error) {
      this.logger.error("Generator orchestration failed", error);
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
```

### 3.3 CLI Interface

```typescript
@Injectable()
export class CliInterface implements ICliInterface {
  constructor(@Inject("ILogger") private readonly logger: ILogger) {}

  async promptForProjectMode(): Promise<Result<ProjectMode>> {
    try {
      const { projectMode } = await inquirer.prompt([
        {
          type: "list",
          name: "projectMode",
          message: "What would you like to do?",
          choices: [
            { name: "Auto-detect project (LLM-powered)", value: ProjectMode.Auto },
            { name: "Integrate RooCode manually", value: ProjectMode.Existing },
            { name: "Start a new project", value: ProjectMode.New },
          ],
        },
      ]);

      return Result.success(projectMode);
    } catch (error) {
      this.logger.error("Project mode prompt failed", error);
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  async promptForGenerators(): Promise<Result<GeneratorOptions>> {
    try {
      const { generators } = await inquirer.prompt([
        {
          type: "checkbox",
          name: "generators",
          message: "Select generators to run:",
          choices: [
            { name: "Memory Bank", value: "memoryBank", checked: true },
            { name: "Rules", value: "rules", checked: true },
            { name: "System Prompts", value: "systemPrompts", checked: true },
            { name: "Roomodes", value: "roomodes", checked: true },
          ],
        },
      ]);

      return Result.success({
        memoryBank: generators.includes("memoryBank"),
        rules: generators.includes("rules"),
        systemPrompts: generators.includes("systemPrompts"),
        roomodes: generators.includes("roomodes"),
        mode: "roo",
      });
    } catch (error) {
      this.logger.error("Generator options prompt failed", error);
      return Result.failure(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
```

## 4. Entry Point Refactoring

```typescript
// bin/roocode-generator.ts
async function main() {
  try {
    const container = new Container();

    // Register dependencies
    container.register("ILogger", new Logger());
    container.register("ICliInterface", new CliInterface(container.resolve("ILogger")));
    container.register("IProjectManager", new ProjectManager(container.resolve("ILogger")));
    container.register(
      "IGeneratorOrchestrator",
      new GeneratorOrchestrator(
        container.resolve("IMemoryBankGenerator"),
        container.resolve("IRulesGenerator"),
        container.resolve("ISystemPromptsGenerator"),
        container.resolve("IRoomodesGenerator"),
        container.resolve("ILogger")
      )
    );

    const app = new ApplicationContainer(
      container.resolve("IGeneratorOrchestrator"),
      container.resolve("IProjectManager"),
      container.resolve("ICliInterface"),
      container.resolve("ILogger")
    );

    const result = await app.run();
    if (result.isFailure) {
      console.error("Application failed:", result.error.message);
      process.exit(1);
    }
  } catch (error) {
    console.error("Fatal error:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
```

## 5. Migration Strategy

1. Create core interfaces and types
2. Implement dependency injection container
3. Create ApplicationContainer class
4. Implement GeneratorOrchestrator
5. Create CLI interface implementation
6. Update main entry point
7. Migrate existing generators to new architecture
8. Add comprehensive error handling
9. Implement logging throughout the application

## 6. Testing Strategy

```typescript
describe("ApplicationContainer", () => {
  let app: ApplicationContainer;
  let mockOrchestrator: jest.Mocked<IGeneratorOrchestrator>;
  let mockProjectManager: jest.Mocked<IProjectManager>;
  let mockCli: jest.Mocked<ICliInterface>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockOrchestrator = {
      executeGenerators: jest.fn(),
      validateGenerators: jest.fn(),
    };
    mockProjectManager = {
      detectProjectType: jest.fn(),
      initializeProject: jest.fn(),
      validateProject: jest.fn(),
    };
    mockCli = {
      promptForProjectMode: jest.fn(),
      promptForGenerators: jest.fn(),
      displayProgress: jest.fn(),
      displayError: jest.fn(),
    };
    mockLogger = {
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    };

    app = new ApplicationContainer(mockOrchestrator, mockProjectManager, mockCli, mockLogger);
  });

  it("should execute workflow successfully", async () => {
    mockCli.promptForProjectMode.mockResolvedValue(Result.success(ProjectMode.Auto));
    mockProjectManager.detectProjectType.mockResolvedValue(Result.success(ProjectType.TypeScript));
    mockProjectManager.initializeProject.mockResolvedValue(Result.success(validConfig));
    mockCli.promptForGenerators.mockResolvedValue(Result.success(defaultOptions));
    mockOrchestrator.executeGenerators.mockResolvedValue(Result.success(void 0));

    const result = await app.run();
    expect(result.isSuccess).toBe(true);
  });
});
```

## 7. Implementation Checklist

- [ ] Create core interfaces and types
- [ ] Implement Container class
- [ ] Create ApplicationContainer
- [ ] Implement GeneratorOrchestrator
- [ ] Create CliInterface implementation
- [ ] Update main entry point
- [ ] Add error handling with Result type
- [ ] Implement logging system
- [ ] Add unit tests
- [ ] Update documentation
- [ ] Perform integration testing
