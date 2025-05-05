// tests/core/analysis/ast-analysis.service.test.ts
import { AstAnalysisService } from '../../../src/core/analysis/ast-analysis.service';
import { ILLMAgent } from '../../../src/core/llm/interfaces';
import { ILogger } from '../../../src/core/services/logger-service';
import { Result } from '../../../src/core/result/result';
import { GenericAstNode, CodePosition } from '../../../src/core/analysis/types'; // Added CodePosition
// Removed FunctionInfo, ClassInfo, ImportInfo as they are implicitly used via CodeInsights
import {
  CodeInsights,
  IAstAnalysisService,
} from '../../../src/core/analysis/ast-analysis.interfaces';
import { RooCodeError } from '../../../src/core/errors';

// --- Mocking Setup ---
const mockLLMAgent: jest.Mocked<ILLMAgent> = {
  // Implemented methods
  getCompletion: jest.fn(),
  // Added missing methods required by the interface
  analyzeProject: jest.fn(),
  getModelContextWindow: jest.fn().mockResolvedValue(8000),
  countTokens: jest.fn().mockResolvedValue(100),
  getProvider: jest.fn(),
};

const mockLogger: jest.Mocked<ILogger> = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Sample valid CodeInsights data - Corrected to match interface
const validCodeInsights: CodeInsights = {
  functions: [{ name: 'testFunc', parameters: ['a'] }],
  classes: [{ name: 'TestClass' }],
  imports: [{ source: './test' }],
};
const validJsonResponse = JSON.stringify(validCodeInsights);

// Sample AST data - Corrected to match GenericAstNode interface
const sampleStartPosition: CodePosition = { row: 0, column: 0 };
const sampleEndPosition: CodePosition = { row: 10, column: 0 };
const sampleAstData: GenericAstNode = {
  type: 'program',
  text: 'import { x } from "./test"; function testFunc(a) {}; class TestClass {}',
  startPosition: sampleStartPosition,
  endPosition: sampleEndPosition,
  isNamed: true,
  fieldName: null,
  children: [],
};
const sampleFilePath = 'src/test.ts';

describe('AstAnalysisService', () => {
  let service: IAstAnalysisService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AstAnalysisService(mockLLMAgent, mockLogger);
  });

  // --- Test Cases ---

  it('should return Ok with CodeInsights on successful analysis and validation', async () => {
    // Setup mock
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok(validJsonResponse));

    // Execute
    const result = await service.analyzeAst(sampleAstData, sampleFilePath);

    // Assert
    expect(result.isOk()).toBe(true);
    expect(result.value).toEqual(validCodeInsights);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLLMAgent.getCompletion).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLLMAgent.getCompletion).toHaveBeenCalledWith(expect.any(String), '');
    const capturedSystemPrompt = mockLLMAgent.getCompletion.mock.calls[0][0];
    expect(capturedSystemPrompt).toContain('### Instruction ###');
    expect(capturedSystemPrompt).toContain('interface CodeInsights {');
    expect(capturedSystemPrompt).toContain("### Input 'astData' ###");
    expect(capturedSystemPrompt).toContain(JSON.stringify(sampleAstData));

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.debug).toHaveBeenCalledWith(`Analyzing AST for file: ${sampleFilePath}`);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.debug).toHaveBeenCalledWith(
      `Successfully analyzed and validated AST insights for ${sampleFilePath}`
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.warn).not.toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.error).not.toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.debug).toHaveBeenCalledTimes(2);
  });

  it('should return Err when LLMAgent returns an error', async () => {
    // Setup mock
    const llmError = new Error('LLM API Error');
    mockLLMAgent.getCompletion.mockResolvedValue(Result.err(llmError));

    // Execute
    const result = await service.analyzeAst(sampleAstData, sampleFilePath);

    // Assert
    expect(result.isErr()).toBe(true);
    expect(result.error).toBe(llmError);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLLMAgent.getCompletion).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.debug).toHaveBeenCalledWith(`Analyzing AST for file: ${sampleFilePath}`);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.error).toHaveBeenCalledWith(
      `LLM call failed for ${sampleFilePath}: ${llmError.message}`
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.warn).not.toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.debug).toHaveBeenCalledTimes(1);
  });

  it('should return Err with RooCodeError when LLM response is invalid JSON', async () => {
    // Setup mock
    const invalidJsonResponse = '{ "functions": [ { "name": "testFunc" ] ';
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok(invalidJsonResponse));

    // Execute
    const result = await service.analyzeAst(sampleAstData, sampleFilePath);

    // Assert
    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(RooCodeError);
    const error = result.error as RooCodeError;
    expect(error.message).toMatch(/Invalid JSON response from LLM.*Parse Error:/);
    expect(error.code).toBe('LLM_JSON_PARSE_ERROR');
    expect(error.cause).toBeDefined();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLLMAgent.getCompletion).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.debug).toHaveBeenCalledWith(`Analyzing AST for file: ${sampleFilePath}`);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`Failed to parse LLM JSON response for ${sampleFilePath}`)
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.debug).toHaveBeenCalledWith(
      `Raw response for ${sampleFilePath}:\n${invalidJsonResponse}`
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.error).not.toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.debug).toHaveBeenCalledTimes(2);
  });

  it('should return Err with RooCodeError when LLM response fails schema validation', async () => {
    // Setup mock
    const invalidSchemaData = {
      functions: [{ name: 'testFunc' }],
      classes: [{ name: 'TestClass' }],
      imports: [{ source: './test' }],
    };
    const invalidSchemaJson = JSON.stringify(invalidSchemaData);
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok(invalidSchemaJson));

    // Execute
    const result = await service.analyzeAst(sampleAstData, sampleFilePath);

    // Assert
    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(RooCodeError);
    const error = result.error as RooCodeError;
    expect(error.message).toContain('LLM response failed schema validation');
    expect(error.code).toBe('LLM_SCHEMA_VALIDATION_ERROR');
    expect(error.cause).toBeDefined();

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLLMAgent.getCompletion).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.debug).toHaveBeenCalledWith(`Analyzing AST for file: ${sampleFilePath}`);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`LLM response validation failed for ${sampleFilePath}`)
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining(`Validation issues for ${sampleFilePath}:`)
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining(
        `Parsed JSON for ${sampleFilePath} (failed validation):\n${JSON.stringify(invalidSchemaData, null, 2)}`
      )
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.error).not.toHaveBeenCalled();
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLogger.debug).toHaveBeenCalledTimes(3);
  });

  it('should build a prompt containing key elements', async () => {
    // Setup mock
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok(validJsonResponse));

    // Execute
    await service.analyzeAst(sampleAstData, sampleFilePath);

    // Assert
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockLLMAgent.getCompletion).toHaveBeenCalledTimes(1);
    const actualPrompt = mockLLMAgent.getCompletion.mock.calls[0][0];
    const userPrompt = mockLLMAgent.getCompletion.mock.calls[0][1];

    expect(userPrompt).toBe('');

    expect(actualPrompt).toContain('### Instruction ###');
    expect(actualPrompt).toContain('Analyze the provided JSON AST');
    expect(actualPrompt).toContain('Return the results ONLY as a valid JSON object');
    expect(actualPrompt).toContain('interface CodeInsights {');
    expect(actualPrompt).toContain("### Example Input ('astData' Snippet) ###");
    expect(actualPrompt).toContain('### Example Output (JSON only) ###');
    expect(actualPrompt).toContain("### Input 'astData' ###");
    expect(actualPrompt).toContain(JSON.stringify(sampleAstData));
    expect(actualPrompt).not.toContain('{{AST_DATA_JSON}}');
    expect(actualPrompt).toContain('### Output (JSON only) ###');
  });
});
