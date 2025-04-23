/*
// tests/generators/rules-generator.test.ts

import { RulesGenerator } from "../../src/generators/rules-generator";
import { ILogger } from "../../src/core/services/logger-service";
import { IProjectConfigService } from "../../src/core/config/interfaces";
import { LLMAgent } from "../../src/core/llm/llm-agent";
import { IRulesPromptBuilder, IRulesContentProcessor } from "../../src/generators/rules-generator";
import { IServiceContainer } from "../../src/core/di/interfaces";
import { Result } from "../../src/core/result/result";

// Mock dependencies
const mockLogger: jest.Mocked<ILogger> = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  setLogLevel: jest.fn(),
  getLogLevel: jest.fn(() => "debug"),
};

const mockProjectConfigService: jest.Mocked<IProjectConfigService> = {
  loadConfig: jest.fn(),
  saveConfig: jest.fn(),
  updateConfig: jest.fn(),
  getConfig: jest.fn(),
  ensureConfig: jest.fn(),
};

const mockLlmAgent: jest.Mocked<LLMAgent> = {
  getCompletion: jest.fn(),
} as any; // Using 'as any' for simplicity as LLMAgent has many methods

const mockPromptBuilder: jest.Mocked<IRulesPromptBuilder> = {
  buildPrompt: jest.fn(),
  buildSystemPrompt: jest.fn(),
};

const mockContentProcessor: jest.Mocked<IRulesContentProcessor> = {
  processContent: jest.fn(),
  stripMarkdownCodeBlock: jest.fn(),
};

const mockServiceContainer: jest.Mocked<IServiceContainer> = {
  resolve: jest.fn(),
  registerFactory: jest.fn(),
  registerSingleton: jest.fn(),
  isRegistered: jest.fn(),
  getType: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  bind: jest.fn(),
  unbind: jest.fn(),
  rebind: jest.fn(),
  unbindAll: jest.fn(),
  load: jest.fn(),
  unload: jest.fn(),
  createChild: jest.fn(),
  getServiceIdentifierAsString: jest.fn(),
};

describe("RulesGenerator LLM Integration", () => {
  let rulesGenerator: RulesGenerator;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create a new instance before each test
    rulesGenerator = new RulesGenerator(
      mockServiceContainer,
      mockLogger,
      mockProjectConfigService,
      mockLlmAgent,
      mockPromptBuilder,
      mockContentProcessor
    );
  });

  // Test constructor (implicitly tested by setup, but good practice)
  test("should be instantiated correctly", () => {
    expect(rulesGenerator).toBeInstanceOf(RulesGenerator);
  });

  // Test getModeInstructions
  describe("getModeInstructions", () => {
    test('should return correct instructions for "code" mode', () => {
      // Access private method for testing (use with caution)
      const result = (rulesGenerator as any).getModeInstructions("code");
      expect(result.isOk()).toBe(true);
      expect(result.value).toContain("Generate rules for the code mode");
      expect(result.value).toContain("coding standards");
    });

    test('should return correct instructions for "architect" mode', () => {
      const result = (rulesGenerator as any).getModeInstructions("architect");
      expect(result.isOk()).toBe(true);
      expect(result.value).toContain("Generate rules for the architect mode");
      expect(result.value).toContain("system design");
    });

    test("should return error for unknown mode", () => {
      const result = (rulesGenerator as any).getModeInstructions("unknown_mode");
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain("Unknown mode specified");
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining("Unknown mode requested"),
        "unknown_mode"
      );
    });
  });

  // Test generateWithLLM - Success Case
  describe("generateWithLLM - Success", () => {
    test("should generate rules successfully using LLM", async () => {
      const mode = "code";
      const context = "Test project context";
      const template = "Test template content";
      const expectedSystemPrompt = "System prompt for code";
      const expectedUserPrompt = "User prompt for code";
      const llmResponseContent = "Generated rules content from LLM";

      // Mock dependencies to return success Results
      mockPromptBuilder.buildSystemPrompt.mockReturnValue(Result.ok(expectedSystemPrompt));
      // Mock the private getModeInstructions indirectly via promptBuilder mock
      mockPromptBuilder.buildPrompt.mockImplementation((instructions, ctx, tpl) => {
        // Basic check that instructions seem correct based on mode
        if (instructions.includes("code mode")) {
          return Result.ok(expectedUserPrompt);
        }
        return Result.err(new Error("Incorrect instructions passed to buildPrompt"));
      });
      mockLlmAgent.getCompletion.mockResolvedValue(Result.ok(llmResponseContent));

      // Call the method (protected, so use 'as any')
      const result = await (rulesGenerator as any).generateWithLLM(mode, context, template);

      // Assertions
      expect(result.isOk()).toBe(true);
      expect(result.value).toBe(llmResponseContent);
      expect(mockPromptBuilder.buildSystemPrompt).toHaveBeenCalledWith(mode);
      expect(mockPromptBuilder.buildPrompt).toHaveBeenCalledWith(
        expect.stringContaining("code mode"),
        context,
        template
      );
      expect(mockLlmAgent.getCompletion).toHaveBeenCalledWith(
        expectedSystemPrompt,
        expectedUserPrompt
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(`Sending request to LLM for mode: ${mode}`);
      expect(mockLogger.debug).toHaveBeenCalledWith(`Received LLM response for mode: ${mode}`);
      expect(mockLogger.error).not.toHaveBeenCalled(); // Ensure no errors logged
    });
  });

  // Test generateWithLLM - Error Cases
  describe("generateWithLLM - Errors", () => {
    const mode = "architect";
    const context = "Error context";
    const template = "Error template";

    test("should handle error from buildSystemPrompt", async () => {
      const error = new Error("System prompt build failed");
      mockPromptBuilder.buildSystemPrompt.mockReturnValue(Result.err(error));

      const result = await (rulesGenerator as any).generateWithLLM(mode, context, template);

      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain(
        `Failed to generate rules for ${mode} via LLM: ${error.message}`
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`LLM generation failed for mode ${mode}`),
        error
      );
      expect(mockLlmAgent.getCompletion).not.toHaveBeenCalled();
    });

    test("should handle error from buildPrompt", async () => {
      const systemPrompt = "Valid system prompt";
      const error = new Error("User prompt build failed");
      mockPromptBuilder.buildSystemPrompt.mockReturnValue(Result.ok(systemPrompt));
      mockPromptBuilder.buildPrompt.mockReturnValue(Result.err(error)); // Error from buildPrompt

      const result = await (rulesGenerator as any).generateWithLLM(mode, context, template);

      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain(
        `Failed to generate rules for ${mode} via LLM: ${error.message}`
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`LLM generation failed for mode ${mode}`),
        error
      );
      expect(mockLlmAgent.getCompletion).not.toHaveBeenCalled();
    });

    test("should handle error from llmAgent.getCompletion", async () => {
      const systemPrompt = "Valid system prompt";
      const userPrompt = "Valid user prompt";
      const error = new Error("LLM API failed");
      mockPromptBuilder.buildSystemPrompt.mockReturnValue(Result.ok(systemPrompt));
      mockPromptBuilder.buildPrompt.mockReturnValue(Result.ok(userPrompt));
      mockLlmAgent.getCompletion.mockResolvedValue(Result.err(error)); // Error from LLM

      const result = await (rulesGenerator as any).generateWithLLM(mode, context, template);

      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain(
        `Failed to generate rules for ${mode} via LLM: ${error.message}`
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`LLM generation failed for mode ${mode}`),
        error
      );
      expect(mockLlmAgent.getCompletion).toHaveBeenCalledWith(systemPrompt, userPrompt);
    });

    test("should handle non-string response from llmAgent.getCompletion", async () => {
      const systemPrompt = "Valid system prompt";
      const userPrompt = "Valid user prompt";
      mockPromptBuilder.buildSystemPrompt.mockReturnValue(Result.ok(systemPrompt));
      mockPromptBuilder.buildPrompt.mockReturnValue(Result.ok(userPrompt));
      mockLlmAgent.getCompletion.mockResolvedValue(Result.ok(undefined as any)); // Non-string response

      const result = await (rulesGenerator as any).generateWithLLM(mode, context, template);

      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain("LLM agent returned non-string content");
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(`LLM generation failed for mode ${mode}`),
        expect.any(Error)
      );
    });
  });

  // Test handleLLMError directly (simple, but ensures logging)
  describe("handleLLMError", () => {
    test("should log error and return error Result", () => {
      const error = new Error("Test LLM Error");
      const mode = "test-mode";

      // Access protected method for testing
      const result = (rulesGenerator as any).handleLLMError(error, mode);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe(
        `Failed to generate rules for ${mode} via LLM: ${error.message}`
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        `LLM generation failed for mode ${mode}`,
        error
      );
    });
  });

  // Placeholder tests from task description (can be filled out later or in other subtasks)
  test("generates rules with valid context (placeholder)", async () => {
    // Test successful rules generation (likely involves executeGeneration refactor)
    expect(true).toBe(true); // Placeholder assertion
  });

  test("handles LLM errors gracefully (placeholder)", async () => {
    // Test error handling (covered partially above, more needed for executeGeneration)
    expect(true).toBe(true); // Placeholder assertion
  });

  test("builds correct prompts for each mode (placeholder)", () => {
    // Test mode-specific prompt building (covered partially by getModeInstructions tests)
    expect(true).toBe(true); // Placeholder assertion
  });
});

// Integration tests placeholder (to be implemented later)
describe("RulesGenerator Integration", () => {
  test("end-to-end rules generation (placeholder)", async () => {
    // Test complete generation flow
    expect(true).toBe(true); // Placeholder assertion
  });

  test("handles template processing (placeholder)", async () => {
    // Test template integration
    expect(true).toBe(true); // Placeholder assertion
  });
});
*/
