/* eslint-disable @typescript-eslint/unbound-method */
// tests/core/analysis/ast-analysis.service.test.ts
import { AstAnalysisService } from '../../../src/core/analysis/ast-analysis.service';
import { ILLMAgent } from '../../../src/core/llm/interfaces';
import { ILogger } from '../../../src/core/services/logger-service';
import { Result } from '../../../src/core/result/result';
import { GenericAstNode } from '../../../src/core/analysis/types';
import { CodeInsights } from '../../../src/core/analysis/ast-analysis.interfaces';
import { RooCodeError } from '../../../src/core/errors';

describe('AstAnalysisService', () => {
  let service: AstAnalysisService;
  let mockLLMAgent: jest.Mocked<ILLMAgent>;
  let mockLogger: jest.Mocked<ILogger>;
  let condenseAstSpy: jest.SpyInstance;

  // Mock AST data (minimal structure for input, with required properties)
  const mockAstData: GenericAstNode = {
    type: 'program',
    children: [],
    text: '',
    startPosition: { row: 0, column: 0 },
    endPosition: { row: 0, column: 0 },
    isNamed: true,
    fieldName: null,
  };
  const mockCondensedAst = {
    imports: [{ source: 'fs' }],
    functions: [{ name: 'readFile', params: ['path'] }],
    classes: [{ name: 'MyClass' }],
  };
  const mockCondensedAstJson = JSON.stringify(mockCondensedAst, null, 2);
  const mockFilePath = 'src/test.ts';

  beforeEach(() => {
    mockLLMAgent = {
      analyzeProject: jest.fn(), // Added missing method
      getCompletion: jest.fn(),
      getModelContextWindow: jest.fn().mockResolvedValue(1000), // Added missing method with mock value
      countTokens: jest.fn().mockResolvedValue(10), // Added missing method with mock value
      getProvider: jest.fn(), // Added missing method
    } as jest.Mocked<ILLMAgent>;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as jest.Mocked<ILogger>;

    service = new AstAnalysisService(mockLLMAgent, mockLogger);

    // --- Mocking _condenseAst ---
    // Spy on the private method and control its return value
    condenseAstSpy = jest
      .spyOn(AstAnalysisService.prototype as any, '_condenseAst')
      .mockReturnValue(mockCondensedAst);
    // --------------------------
  });

  afterEach(() => {
    jest.restoreAllMocks(); // Clean up spies
  });

  it('should call _condenseAst with the provided astData', async () => {
    // Arrange: Mock LLM to return success to allow the flow to reach completion call
    const mockLLMResponse: CodeInsights = {
      imports: [{ source: 'fs' }],
      functions: [{ name: 'readFile', parameters: ['path'] }],
      classes: [{ name: 'MyClass' }],
    };
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok(JSON.stringify(mockLLMResponse)));

    // Act
    await service.analyzeAst(mockAstData, mockFilePath);

    // Assert
    expect(condenseAstSpy).toHaveBeenCalledTimes(1);
    expect(condenseAstSpy).toHaveBeenCalledWith(mockAstData);
  });

  it('should analyze AST successfully, return CodeInsights, and verify prompt', async () => {
    // Arrange
    const mockLLMResponse: CodeInsights = {
      imports: [{ source: 'fs' }],
      functions: [{ name: 'readFile', parameters: ['path'] }], // Note 'parameters'
      classes: [{ name: 'MyClass' }],
    };
    const mockLLMResponseJson = JSON.stringify(mockLLMResponse);
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok(mockLLMResponseJson));

    // Act
    const result = await service.analyzeAst(mockAstData, mockFilePath);

    // Assert: Result
    expect(result.isOk()).toBe(true);
    expect(result.value).toEqual(mockLLMResponse);

    // Assert: Dependencies called
    expect(condenseAstSpy).toHaveBeenCalledWith(mockAstData);
    expect(mockLLMAgent.getCompletion).toHaveBeenCalledTimes(1);

    // Assert: Prompt Verification

    const systemPromptArg = mockLLMAgent.getCompletion.mock.calls[0][0];
    expect(systemPromptArg).toContain('CONDENSED');
    expect(systemPromptArg).toContain('### Target Output Schema (CodeInsights) ###');
    expect(systemPromptArg).toContain(mockCondensedAstJson); // Verify condensed data is in prompt

    // Assert: Logging

    expect(mockLogger.debug).toHaveBeenCalledWith(`Analyzing AST for file: ${mockFilePath}`);

    expect(mockLogger.debug).toHaveBeenCalledWith(
      `Successfully analyzed and validated AST insights for ${mockFilePath}`
    );

    expect(mockLogger.warn).not.toHaveBeenCalled();

    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should return error if LLM agent fails', async () => {
    // Arrange
    const llmError = new Error('LLM API Error');
    mockLLMAgent.getCompletion.mockResolvedValue(Result.err(llmError));

    // Act
    const result = await service.analyzeAst(mockAstData, mockFilePath);

    // Assert: Result
    expect(result.isErr()).toBe(true);
    expect(result.error).toBe(llmError);

    // Assert: Logging

    expect(mockLogger.error).toHaveBeenCalledTimes(1);

    expect(mockLogger.error).toHaveBeenCalledWith(
      `LLM call failed for ${mockFilePath}: ${llmError.message}`
    );

    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('should return error if LLM response is invalid JSON', async () => {
    // Arrange
    const invalidJson = '{"imports": [';
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok(invalidJson));

    // Act
    const result = await service.analyzeAst(mockAstData, mockFilePath);

    // Assert: Result
    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(RooCodeError);
    expect((result.error as RooCodeError).code).toBe('LLM_JSON_PARSE_ERROR');
    expect((result.error as RooCodeError).message).toContain('Invalid JSON response from LLM');

    // Assert: Logging
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse LLM JSON response')
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(
      `Raw response for ${mockFilePath}:\n${invalidJson}`
    );
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should return error if LLM response is empty or whitespace after cleaning', async () => {
    // Arrange
    const emptyResponses = ['', '   ', '```json\n\n```'];
    for (const emptyJson of emptyResponses) {
      mockLLMAgent.getCompletion.mockResolvedValue(Result.ok(emptyJson));
      mockLogger.warn.mockClear(); // Clear mocks for loop iteration
      mockLogger.debug.mockClear();

      // Act
      const result = await service.analyzeAst(mockAstData, mockFilePath);

      // Assert: Result
      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(RooCodeError);
      expect((result.error as RooCodeError).code).toBe('LLM_JSON_PARSE_ERROR');
      expect((result.error as RooCodeError).message).toContain('LLM returned an empty response');

      // Assert: Logging
      expect(mockLogger.warn).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse LLM JSON response')
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        `Raw response for ${mockFilePath}:\n${emptyJson}`
      );
      expect(mockLogger.error).not.toHaveBeenCalled();
    }
  });

  it('should return error if LLM response fails schema validation', async () => {
    // Arrange
    const invalidSchemaResponse = JSON.stringify({
      imports: [{ source: 123 }], // Invalid type
      functions: [{ name: 'testFunc' }], // Missing 'parameters'
      classes: [],
    });
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok(invalidSchemaResponse));

    // Act
    const result = await service.analyzeAst(mockAstData, mockFilePath);

    // Assert: Result
    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(RooCodeError);
    expect((result.error as RooCodeError).code).toBe('LLM_SCHEMA_VALIDATION_ERROR');
    expect((result.error as RooCodeError).message).toContain(
      'LLM response failed schema validation'
    );

    // Assert: Logging
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('LLM response validation failed')
    );
    expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Validation issues for'));
    expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('Parsed JSON for'));
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should return error if _condenseAst throws an error', async () => {
    // Arrange
    const condensationError = new Error('Condensation failed');
    condenseAstSpy.mockImplementation(() => {
      throw condensationError;
    });

    // Act
    const result = await service.analyzeAst(mockAstData, mockFilePath);

    // Assert: Result
    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(RooCodeError);
    expect((result.error as RooCodeError).code).toBe('UNEXPECTED_ANALYSIS_ERROR');
    expect((result.error as RooCodeError).message).toContain(
      'Unexpected error during AST analysis'
    );
    expect((result.error as RooCodeError).cause).toBe(condensationError);

    // Assert: Logging

    expect(mockLogger.error).toHaveBeenCalledTimes(1);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Unexpected error during AST analysis'),
      condensationError
    );

    expect(mockLogger.warn).not.toHaveBeenCalled();

    expect(mockLLMAgent.getCompletion).not.toHaveBeenCalled(); // Should fail before LLM call
  });
});
