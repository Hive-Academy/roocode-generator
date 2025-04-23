---
title: Testing
version: 1.0.0
lastUpdated: 2025-04-23T12:01:36.768Z
sectionId: 5
applicableLanguages: [TypeScript, JavaScript]
relatedSections: []
---

Okay, here are comprehensive coding rules and standards for the "testing" section of your `roocode-generator` project, tailored to your specific context (TypeScript, Jest, Langchain, Commander.js, Inquirer.js, custom DI, co-located tests).

```markdown
# Testing Rules and Standards - Roocode Generator

## 1. Philosophy and Goals

1.1. **Reliability:** Tests are crucial for ensuring the `roocode-generator` functions correctly, especially given its interaction with external systems (LLMs) and complex internal logic (DI, file operations, generation).
1.2. **Maintainability:** Well-written tests act as documentation and make refactoring safer and easier.
1.3. **Confidence:** A comprehensive test suite provides confidence in releases and reduces the likelihood of regressions.
1.4. **Focus:** Tests should verify the *behavior* and *contracts* of modules, not just their implementation details.

## 2. General Guidelines

2.1. **Framework:** All tests MUST be written using **Jest** (`jest`) and **ts-jest**.
2.2. **Language:** All tests MUST be written in **TypeScript**.
2.3. **Scope:** Aim for a healthy mix of:
    *   **Unit Tests:** Test individual classes or functions in isolation. Mock dependencies heavily. This should form the bulk of the tests.
    *   **Integration Tests:** Test the interaction between several units (e.g., a command handler interacting with its services, but potentially mocking external systems like LLMs or the file system).
    *   **(Optional) End-to-End (E2E) Tests:** Test the entire application flow (e.g., running the CLI command with specific arguments and verifying output files). These are valuable but can be slower and more brittle; use sparingly for critical paths.
2.4. **Isolation:** Tests MUST be independent. The outcome of one test MUST NOT affect another. Use Jest's setup (`beforeEach`, `afterEach`) and teardown (`afterAll`, `beforeAll`) mechanisms correctly.
2.5. **Determinism:** Tests MUST be deterministic. They should produce the same result every time they are run, regardless of environment (local, CI) or execution order. Avoid dependencies on real time, network availability (mock them!), or random data where possible.
2.6. **Speed:** Keep tests fast. Slow tests hinder development flow. Profile and optimize slow tests, often by improving mocking strategies or breaking down large integration tests.
2.7. **Readability:** Tests should be easy to understand. Use clear naming, the AAA pattern, and avoid overly complex logic within tests.

## 3. Test Structure and Naming Conventions

3.1. **File Location:** Test files MUST be co-located with the source file they are testing within the `src` directory.
    *   Example: The test for `src/core/llm/llm-agent.ts` MUST be `src/core/llm/llm-agent.test.ts`.
3.2. **File Naming:** Test files MUST use the suffix `.test.ts`.
3.3. **`describe` Blocks:**
    *   Use `describe` to group tests for a specific class, module, or function.
    *   The top-level `describe` block name SHOULD match the name of the component being tested.
    *   Nested `describe` blocks CAN be used to group tests for specific methods or scenarios (e.g., "when user provides valid input", "when LLM call fails").
    *   Example:
        ```typescript
        // In src/core/config/project-config.service.test.ts
        import { ProjectConfigService } from './project-config.service';

        describe('ProjectConfigService', () => {
          // ... tests ...

          describe('loadConfig', () => {
            // ... tests for the loadConfig method ...
          });

          describe('getConfigFilePath', () => {
             // ... tests for getConfigFilePath ...
          });
        });
        ```
3.4. **`it` or `test` Blocks:**
    *   Use `it` (or `test`) for individual test cases.
    *   The description SHOULD clearly state the condition being tested and the expected outcome, often using "should".
    *   Example:
        ```typescript
        it('should return a successful Result with the loaded config when the config file exists and is valid', async () => {
          // ... test logic ...
        });

        it('should return a failure Result when the config file does not exist', async () => {
          // ... test logic ...
        });

        it('should throw an error if required dependencies are not injected', () => {
           // ... test logic ...
        });
        ```
3.5. **Arrange-Act-Assert (AAA) Pattern:** Structure tests logically using the AAA pattern.
    *   **Arrange:** Set up preconditions, initialize objects, prepare mocks.
    *   **Act:** Execute the code under test.
    *   **Assert:** Verify the outcome using Jest matchers.
    *   Example:
        ```typescript
        it('should call the LLM provider with the correct prompt', async () => {
          // Arrange
          const mockLlmProvider = { generate: jest.fn().mockResolvedValue('Mock LLM response') };
          const llmAgent = new LlmAgent(/* dependencies including mockLlmProvider */);
          const testPrompt = 'Generate code for a button.';

          // Act
          await llmAgent.generateResponse(testPrompt);

          // Assert
          expect(mockLlmProvider.generate).toHaveBeenCalledTimes(1);
          expect(mockLlmProvider.generate).toHaveBeenCalledWith(testPrompt, expect.anything()); // Or more specific options
        });
        ```

## 4. Assertions

4.1. **Use Jest Matchers:** Utilize Jest's rich set of matchers (`expect(...)`) for clear and expressive assertions.
    *   Common Matchers: `.toBe()`, `.toEqual()`, `.toBeTruthy()`, `.toBeFalsy()`, `.toContain()`, `.toHaveLength()`, `.toMatchObject()`, `.toHaveBeenCalled()`, `.toHaveBeenCalledWith()`, `.toThrow()`, `.resolves`, `.rejects`.
4.2. **Specificity:** Assertions should be specific. Avoid overly broad checks. `toEqual` is generally preferred over `toBe` for objects and arrays as it performs deep equality checks.
4.3. **Multiple Asserts:** It's acceptable to have multiple `expect` statements in a single `it` block *if* they all relate to the same logical outcome of the *Act* step. If assertions test different aspects or outcomes, consider separate `it` blocks.
4.4. **Error Testing:** Explicitly test error conditions and expected exceptions using `.toThrow()`, `.toThrowError(SpecificErrorClass)`, or `expect(async () => await func()).rejects.toThrow(...)`.
    *   Example (Testing Custom Errors):
        ```typescript
        import { FileNotFoundError } from '../core/file-operations/errors';
        // ... arrange ...

        it('should return a failure Result wrapping FileNotFoundError if file does not exist', async () => {
            // Arrange: Mock FileOperations to simulate file not found
            mockFileOperations.readFile.mockResolvedValue(Result.failure(new FileNotFoundError('config.json')));
            const service = new ProjectConfigService(mockFileOperations, /* ... */);

            // Act
            const result = await service.loadConfig();

            // Assert
            expect(result.isFailure).toBe(true);
            expect(result.error).toBeInstanceOf(FileNotFoundError);
            expect(result.error?.message).toContain('config.json');
        });
        ```
4.5. **Asynchronous Assertions:** Use `async/await` with `expect(...).resolves` or `expect(...).rejects` for testing promises.
    *   Example:
        ```typescript
        // Act & Assert combined for async
        await expect(service.loadConfig()).resolves.toEqual(Result.success({ /* expected config */ }));

        // Or separate
        const result = await service.loadConfig();
        expect(result.isSuccess).toBe(true);
        expect(result.value).toEqual({ /* expected config */ });

        await expect(service.loadNonExistentConfig()).rejects.toThrow(FileNotFoundError);
        ```

## 5. Mocking, Stubbing, and Spying

5.1. **Purpose:** Isolate the unit under test by replacing its dependencies with controlled substitutes (mocks, stubs, spies). This is critical for testing components interacting with the file system, LLMs, CLI prompts, configuration, or other services.
5.2. **Jest Mocks:** Use Jest's built-in mocking capabilities:
    *   `jest.fn()`: Create generic mock functions.
    *   `jest.spyOn(object, 'methodName')`: Spy on existing methods (useful for checking if methods were called without fully replacing them, or for partially mocking a class). Remember to restore spies using `jest.restoreAllMocks()` in `afterEach`.
    *   `jest.mock('moduleName')` / `jest.mock('./path/to/module')`: Automatically mock entire modules. Useful for mocking external libraries (like `fs`, `inquirer`, `ora`) or internal modules.
5.3. **Dependency Injection (DI) Mocking:**
    *   Since the project uses a custom DI container (`src/core/di/container.ts`) likely leveraging `Reflect-metadata`, the primary way to test components is by providing mock implementations of their dependencies during instantiation in the test setup (`beforeEach`).
    *   **Do NOT rely on the global container instance in unit tests.** Instantiate the class under test directly, passing mocks for its constructor dependencies.
    *   Example (Testing `GeneratorOrchestrator`):
        ```typescript
        import { GeneratorOrchestrator } from '../core/application/generator-orchestrator';
        import { IProjectConfigService, ILoggerService, IGenerator } from '../core/interfaces'; // Assuming interfaces exist
        import { Result } from '../core/result/result';
        import { jest } from '@jest/globals'; // Use Jest global types

        // --- Mock Dependencies ---
        const mockConfigService: jest.Mocked<IProjectConfigService> = {
          loadConfig: jest.fn(),
          // ... other methods mocked as needed
        };
        const mockLoggerService: jest.Mocked<ILoggerService> = {
          log: jest.fn(),
          error: jest.fn(),
          // ... other methods mocked as needed
        };
        const mockGenerator: jest.Mocked<IGenerator> = {
          generate: jest.fn(),
          // ... other properties/methods
        };
        const mockGeneratorRegistry = { // Mock the registry or lookup mechanism if used
            getGenerator: jest.fn().mockReturnValue(mockGenerator)
        };

        describe('GeneratorOrchestrator', () => {
          let orchestrator: GeneratorOrchestrator;

          beforeEach(() => {
            // Clear mocks before each test
            jest.clearAllMocks();

            // Arrange: Instantiate the class under test with MOCKS
            // Adjust constructor params based on actual implementation
            orchestrator = new GeneratorOrchestrator(
              mockConfigService,
              mockLoggerService,
              mockGeneratorRegistry // Or pass individual generators if injected directly
              /* other mocked dependencies */
            );

            // Setup default mock behaviors
            mockConfigService.loadConfig.mockResolvedValue(Result.success({ /* mock config data */ }));
            mockGenerator.generate.mockResolvedValue(Result.success(undefined)); // Assuming generate returns Result<void>
          });

          it('should load config on initialization or run', async () => {
            // Act
            await orchestrator.run(['rules']); // Assuming run takes generator names

            // Assert
            expect(mockConfigService.loadConfig).toHaveBeenCalledTimes(1);
          });

          it('should call the correct generator based on input', async () => {
             // Arrange
             const generatorName = 'rules';

             // Act
             await orchestrator.run([generatorName]);

             // Assert
             expect(mockGeneratorRegistry.getGenerator).toHaveBeenCalledWith(generatorName);
             expect(mockGenerator.generate).toHaveBeenCalledTimes(1);
          });

           it('should log an error if generator fails', async () => {
             // Arrange
             const error = new Error('Generator failed');
             mockGenerator.generate.mockResolvedValue(Result.failure(error));

             // Act
             const result = await orchestrator.run(['rules']);

             // Assert
             expect(result.isFailure).toBe(true);
             expect(mockLoggerService.error).toHaveBeenCalledWith(expect.stringContaining('Error running generator'), error);
          });
        });
        ```
5.4. **Mocking Langchain / LLM Calls:**
    *   LLM calls MUST be mocked in unit and integration tests. Never make real API calls.
    *   Mock the specific method used to interact with the LLM provider (e.g., `.invoke()`, `.generate()`, `.call()`) on the Langchain client instance or your `LlmAgent` wrapper.
    *   Focus tests on:
        *   Correct prompt construction.
        *   Correct arguments passed to the LLM client (model name, temperature, etc.).
        *   Handling of successful LLM responses (parsing, processing).
        *   Handling of LLM errors or unexpected responses.
    *   Example (Mocking `LlmAgent` dependency):
        ```typescript
        // In a test for a service that USES LlmAgent
        import { LlmAgent } from '../core/llm/llm-agent'; // The actual class
        import { RulesPromptBuilder } from './rules-prompt-builder'; // Class under test

        // --- Mock LlmAgent ---
        // Option 1: Mock the entire class if needed elsewhere
        // jest.mock('../core/llm/llm-agent');
        // const MockLlmAgent = LlmAgent as jest.MockedClass<typeof LlmAgent>;

        // Option 2: Create a mock instance (more common for dependency injection)
        const mockLlmAgent: jest.Mocked<LlmAgent> = {
            generateResponse: jest.fn(),
            // Add other methods/properties of LlmAgent if needed, potentially using jest.fn()
        } as jest.Mocked<LlmAgent>; // Cast to satisfy type checking if needed


        describe('RulesPromptBuilder', () => {
            let promptBuilder: RulesPromptBuilder;

            beforeEach(() => {
                jest.clearAllMocks();
                // Assume RulesPromptBuilder takes LlmAgent as a dependency
                promptBuilder = new RulesPromptBuilder(mockLlmAgent, /* other deps */);

                // Default mock behavior
                mockLlmAgent.generateResponse.mockResolvedValue(Result.success("Generated rule content"));
            });

            it('should call llmAgent.generateResponse with the constructed prompt', async () => {
                // Arrange
                const context = { /* ... project context data ... */ };
                const expectedPrompt = "/* Expected constructed prompt based on context */";

                // Act
                await promptBuilder.buildPromptAndGenerate(context);

                // Assert
                expect(mockLlmAgent.generateResponse).toHaveBeenCalledTimes(1);
                // Check the actual prompt string passed
                expect(mockLlmAgent.generateResponse).toHaveBeenCalledWith(
                    expect.stringContaining("instruction for rules generation"), // Or match the exact expectedPrompt
                    expect.any(Object) // Or verify specific LLM options if passed
                );
            });
        });
        ```
5.5. **Mocking File System Operations:**
    *   Mock the custom `FileOperations` service (`src/core/file-operations/file-operations.ts`) instead of mocking the `fs` module directly, as this tests against your application's abstraction.
    *   Provide mock implementations for `readFile`, `writeFile`, `exists`, `glob`, etc., within your tests.
    *   Example (Testing a service using `FileOperations`):
        ```typescript
        import { FileOperations } from '../core/file-operations/file-operations';
        import { RulesFileManager } from './rules-file-manager'; // Class under test

        const mockFileOperations: jest.Mocked<FileOperations> = {
          readFile: jest.fn(),
          writeFile: jest.fn(),
          exists: jest.fn(),
          ensureDir: jest.fn(),
          // ... mock other methods as needed
        };

        describe('RulesFileManager', () => {
          let fileManager: RulesFileManager;

          beforeEach(() => {
            jest.clearAllMocks();
            // Assuming RulesFileManager depends on FileOperations
            fileManager = new RulesFileManager(mockFileOperations, /* other deps */);

            // Default mock behavior
            mockFileOperations.exists.mockResolvedValue(Result.success(true));
            mockFileOperations.readFile.mockResolvedValue(Result.success("Existing file content"));
          });

          it('should read existing rules file', async () => {
            // Arrange
            const filePath = 'src/rules/existing.rules.md';
            mockFileOperations.exists.mockResolvedValue(Result.success(true)); // Ensure exists returns true
            mockFileOperations.readFile.mockResolvedValue(Result.success("Rule content"));

            // Act
            const result = await fileManager.loadRuleFile(filePath);

            // Assert
            expect(mockFileOperations.readFile).toHaveBeenCalledWith(filePath);
            expect(result.isSuccess).toBe(true);
            expect(result.value).toBe("Rule content");
          });

          it('should write new rules file', async () => {
             // Arrange
             const filePath = 'src/rules/new.rules.md';
             const content = "New rule content";
             mockFileOperations.writeFile.mockResolvedValue(Result.success(undefined)); // Assume success is void
             mockFileOperations.ensureDir.mockResolvedValue(Result.success(undefined)); // Assume success is void

             // Act
             await fileManager.saveRuleFile(filePath, content);

             // Assert
             expect(mockFileOperations.ensureDir).toHaveBeenCalledWith(expect.stringContaining('src/rules')); // Check directory
             expect(mockFileOperations.writeFile).toHaveBeenCalledWith(filePath, content);
          });
        });
        ```
5.6. **Mocking CLI (Commander/Inquirer):**
    *   **Commander.js:** Test command *handlers* directly (the functions executed by Commander actions) rather than testing Commander's argument parsing itself (trust the library). Pass mocked arguments/options to your handler functions.
    *   **Inquirer.js:** Mock the `inquirer.prompt` function using `jest.mock('inquirer')`. Set up the mock to return predefined answers for specific prompts.
    *   Example (Mocking Inquirer):
        ```typescript
        import inquirer from 'inquirer';
        import { CliInterface } from '../core/cli/cli-interface'; // Adjust path

        // Mock the entire inquirer module
        jest.mock('inquirer');

        describe('CliInterface', () => {
          let cliInterface: CliInterface;
          // Mock dependencies needed by CliInterface (e.g., ApplicationContainer)
          const mockAppContainer = { /* ... */ };

          beforeEach(() => {
            jest.clearAllMocks();
            cliInterface = new CliInterface(mockAppContainer);

            // Setup default mock for inquirer.prompt
            (inquirer.prompt as jest.Mock).mockResolvedValue({ /* default answers */ });
          });

          it('should ask for confirmation and proceed if user confirms', async () => {
            // Arrange: Mock prompt to return 'yes'
            (inquirer.prompt as jest.Mock).mockResolvedValueOnce({ confirm: true });

            // Act
            const shouldProceed = await cliInterface.confirmAction("Proceed?"); // Assuming such a method exists

            // Assert
            expect(inquirer.prompt).toHaveBeenCalledWith([expect.objectContaining({ name: 'confirm', message: 'Proceed?' })]);
            expect(shouldProceed).toBe(true);
          });

           it('should ask for confirmation and not proceed if user denies', async () => {
            // Arrange: Mock prompt to return 'no'
            (inquirer.prompt as jest.Mock).mockResolvedValueOnce({ confirm: false });

            // Act
            const shouldProceed = await cliInterface.confirmAction("Proceed?");

            // Assert
            expect(inquirer.prompt).toHaveBeenCalledTimes(1);
            expect(shouldProceed).toBe(false);
          });
        });
        ```
5.7. **Cleanup:** Use `beforeEach` or `afterEach` to reset mocks (`jest.clearAllMocks()`) or restore spies (`jest.restoreAllMocks()`) to prevent interference between tests. Prefer `beforeEach` for resetting state.

## 6. Asynchronous Code Testing

6.1. **`async/await`:** Use `async/await` in your `it` blocks when testing asynchronous functions.
6.2. **Promise Handling:** Ensure Promises returned by the code under test are handled correctly using `await`, `.resolves`, or `.rejects`.
6.3. **Timers:** If testing code involving `setTimeout` or `setInterval`, use Jest's Timer Mocks (`jest.useFakeTimers()`, `jest.advanceTimersByTime()`) for deterministic control over time.

## 7. Code Coverage

7.1. **Goal:** Aim for high, *meaningful* code coverage (e.g., >80% lines, branches, functions) as reported by Jest (`npm test -- --coverage`).
7.2. **Meaningful Coverage:** Coverage percentage alone is not enough. Ensure tests cover different logical paths, edge cases, and error conditions, not just easily reachable lines. Review coverage reports (`coverage/lcov-report/index.html`) to identify untested code paths.
7.3. **Thresholds:** Configure coverage thresholds in `jest.config.js` to enforce minimum coverage levels in CI builds.
    ```javascript
    // jest.config.js
    module.exports = {
      // ... other config
      collectCoverage: true,
      coverageDirectory: "coverage",
      coverageProvider: "v8", // Or 'babel'
      coverageThreshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80, // Often similar to lines
        },
        // Optional: Per-file thresholds
        // './src/core/critical-module/': {
        //   branches: 90,
        //   // ...
        // },
      },
      collectCoverageFrom: [ // Ensure coverage is collected from relevant files
        "src/**/*.ts",
        "!src/**/*.d.ts",
        "!src/**/index.ts", // Often just exports
        "!src/bin/**", // Entry points might be hard to unit test directly
        "!src/core/di/container.ts", // DI container might be tested differently or have lower coverage target
        "!src/core/di/registrations.ts", // Usually just configuration
        "!src/types/**", // Type definitions
        "!src/**/interfaces.ts", // Interfaces
        "!src/**/types.ts", // Type definitions
        "!**/node_modules/**",
        "!**/dist/**",
      ],
    };
    ```
7.4. **Ignoring Code:** Use coverage ignore comments (`/* istanbul ignore next */`, `/* istanbul ignore if */`, `/* istanbul ignore else */`) sparingly for code that is genuinely difficult or impractical to test (e.g., certain error logging branches in bootstrap code). Document the reason for ignoring.

## 8. Test Execution and CI

8.1. **Running Tests:** Tests MUST be runnable via a single command: `npm test`.
8.2. **CI Integration:** Tests MUST run automatically as part of the CI pipeline (e.g., GitHub Actions defined in `.github/workflows/nodejs.yml`).
8.3. **Build Status:** The CI build MUST fail if any tests fail or if coverage thresholds are not met. Merging to main branches SHOULD be blocked on successful test runs.

## 9. Best Practices and Anti-Patterns

9.1. **Test Behavior, Not Implementation:** Focus on *what* the code does (its public API and observable behavior), not *how* it does it internally. This makes tests less brittle to refactoring.
9.2. **Avoid Testing Private Methods:** Test private/protected methods indirectly through the public methods that use them. If a private method is complex enough to warrant direct testing, it might be a sign it should be extracted into its own testable unit.
9.3. **Don't Test Third-Party Code:** Assume external libraries (Node.js built-ins, npm packages like Langchain, Commander) work correctly. Test *your* integration with them (e.g., did you call the library function correctly?), not the library's internal logic. Mock the boundary.
9.4. **Keep Tests Focused:** Each test (`it` block) should ideally verify one specific aspect or scenario.
9.5. **Avoid Logic in Tests:** Minimize conditional logic (`if`/`else`, `switch`) or loops (`for`, `while`) within test blocks. If setup or assertions become complex, consider helper functions within the test file or refactoring the code under test.
9.6. **Use Clear Data:** Use simple, representative data for inputs and mock responses. Avoid overly complex or "magic" values where possible. Name variables clearly.
9.7. **DRY Principle (Carefully):** Avoid excessive repetition in tests using `beforeEach`, helper functions, or factory functions for test data/mocks. However, don't abstract so much that tests become hard to understand individually. Some repetition is okay for clarity.
9.8. **No Flaky Tests:** Eliminate tests that sometimes pass and sometimes fail without code changes. This usually points to issues with asynchronicity, unmocked external state (time, network, randomness), or test inter-dependency.

By adhering to these rules, the `roocode-generator` project can maintain a high-quality, reliable, and maintainable codebase. Remember to regularly review and update these standards as the project evolves.
```