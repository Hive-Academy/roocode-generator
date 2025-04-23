---
title: Testing
version: 1.0.0
lastUpdated: 2025-04-23T18:20:13.953Z
sectionId: 5
applicableLanguages: [TypeScript, JavaScript]
relatedSections: []
---

# Testing Rules and Standards

## 1. General Principles

*   **Colocation:** Place test files (`*.spec.ts`) next to the source files they test within the `src` directory.
*   **Focus:** Each test case should verify a single logical concept or behavior.
*   **Isolation:** Tests must be independent and runnable in any order. Avoid dependencies between tests.
*   **Readability:** Write clear, descriptive test names using `describe`, `context`, and `it` blocks.
*   **AAA Pattern:** Structure tests using Arrange, Act, Assert.
*   **Coverage:** Aim for high code coverage, focusing on critical paths and logic. Use `jest --coverage`.
*   **CI Integration:** Ensure all tests pass in the CI pipeline (`.github/workflows/nodejs.yml`).

## 2. Test Structure & Naming

*   **Filename:** Use `<filename>.spec.ts` (e.g., `project-analyzer.spec.ts`).
*   **Suite Naming (`describe`):** Name after the class or module being tested.
    ```typescript
    describe('ProjectAnalyzer', () => { ... });
    ```
*   **Context Naming (`context`/`describe`):** Describe the specific scenario or state being tested.
    ```typescript
    describe('analyzeProject', () => {
      context('when valid configuration is provided', () => { ... });
      context('when file operations fail', () => { ... });
    });
    ```
*   **Test Case Naming (`it`):** Describe the expected outcome or behavior.
    ```typescript
    it('should return a successful result with project details', () => { ... });
    it('should return a failure result if config file is missing', () => { ... });
    ```

## 3. Test Types

*   **Unit Tests:** Test individual classes or functions in isolation. Mock all external dependencies (file system, network, other services).
*   **Integration Tests:** Test the interaction between multiple components (e.g., a command handler calling a generator service). Mock external systems (LLMs, APIs) but allow internal components to interact.

## 4. Mocking & Stubbing (Jest)

*   **Use Jest Mocks:** Prefer `jest.fn()`, `jest.spyOn()`, and `jest.mock()` for mocking dependencies.
*   **Mock Interfaces/Dependencies:** Mock dependencies injected via DI. Provide mock implementations for interfaces (`IFileOperations`, `ILLMProvider`, etc.).
    ```typescript
    const mockFileOps: jest.Mocked<IFileOperations> = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      // ... other methods mocked
    };
    ```
*   **Module Mocking:** Use `jest.mock('<module-path>')` for mocking entire modules, especially external libraries (e.g., `fs`, `inquirer`, Langchain clients).
    ```typescript
    jest.mock('fs');
    jest.mock('inquirer');
    jest.mock('@langchain/openai');
    ```
*   **Clear Mocks:** Use `beforeEach(() => { jest.clearAllMocks(); });` to reset mocks between tests within a suite.

## 5. Assertions (Jest)

*   **Be Specific:** Use the most specific matcher possible (e.g., `toBe`, `toEqual`, `toHaveProperty`, `toHaveBeenCalledWith`).
*   **Assert Outcomes:** Verify the return value, state changes, or side effects (like function calls).
*   **Error Handling:** Test error paths using `expect(...).toThrow()` or `expect(...).rejects.toThrow()`.
    ```typescript
    await expect(service.operationThatFails()).rejects.toThrow(SpecificError);
    ```
*   **Result Type:** For functions returning `Result<T, E>`, assert the success/failure state and the contained value/error.
    ```typescript
    const result = await service.doSomething();
    expect(result.isSuccess()).toBe(true);
    expect(result.value).toEqual(/* expected value */);
    // or
    expect(result.isFailure()).toBe(true);
    expect(result.error).toBeInstanceOf(ExpectedErrorType);
    ```

## 6. Asynchronous Testing

*   **Use `async/await`:** Write async tests using `async` functions and `await` for promises.
    ```typescript
    it('should perform async operation', async () => {
      await expect(asyncFunction()).resolves.toBeDefined();
    });
    ```
*   **Promise Matchers:** Use `.resolves` and `.rejects` matchers for cleaner promise assertions.

## 7. Dependency Injection (reflect-metadata) & Testing

*   **Unit Test Instantiation:** For unit tests, instantiate the class under test directly, providing mock implementations for its dependencies.
    ```typescript
    // Arrange
    const mockLogger = { log: jest.fn(), error: jest.fn(), ... };
    const mockFileOps = { readFile: jest.fn().mockResolvedValue(Result.success('content')) };
    const service = new MyService(mockLogger, mockFileOps); // Manual injection

    // Act & Assert...
    ```
*   **Integration Test Container:** For integration tests requiring the DI container, consider setting up a separate test container instance or selectively overriding bindings in the main container for external mocks. Avoid relying heavily on the full container for unit tests.

## 8. CLI Testing (Commander.js / Inquirer.js)

*   **Command Handlers:** Test command handler functions directly by invoking them with mock arguments/options, rather than simulating `process.argv`.
*   **Mock Prompts:** Mock `inquirer.prompt` to return predefined answers without requiring user interaction.
    ```typescript
    import inquirer from 'inquirer';
    jest.mock('inquirer');

    it('should handle user confirmation', async () => {
      (inquirer.prompt as jest.Mock).mockResolvedValue({ confirm: true });
      // ... test command logic
    });
    ```

## 9. LLM / Langchain Testing

*   **Mock LLM Providers:** Mock `LLMProvider` or specific Langchain client classes (`ChatOpenAI`, etc.) entirely. Do not make real API calls in tests.
*   **Focus on Logic:** Test the logic *around* the LLM interaction: prompt construction, response parsing, error handling, data flow.
*   **Mock Responses:** Mock methods like `generate` or `invoke` on LLM interfaces/classes to return predefined successful or error responses.
    ```typescript
    const mockLLMAgent: jest.Mocked<ILLMAgent> = {
        generateResponse: jest.fn().mockResolvedValue(Result.success("Mocked LLM response")),
        // ... other methods
    };
    ```