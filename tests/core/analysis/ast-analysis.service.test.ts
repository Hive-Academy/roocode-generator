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
  describe('_condenseAst method', () => {
    let service: AstAnalysisService;
    let mockLLMAgent: jest.Mocked<ILLMAgent>;
    let mockLogger: jest.Mocked<ILogger>;

    beforeEach(() => {
      mockLLMAgent = {
        analyzeProject: jest.fn(),
        getCompletion: jest.fn(),
        getModelContextWindow: jest.fn().mockResolvedValue(1000),
        countTokens: jest.fn().mockResolvedValue(10),
        getProvider: jest.fn(),
      } as jest.Mocked<ILLMAgent>;

      mockLogger = {
        trace: jest.fn(),
        debug: jest.fn(),
        verbose: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
      } as jest.Mocked<ILogger>;

      service = new AstAnalysisService(mockLLMAgent, mockLogger);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });
    it('should correctly handle method definitions with modifiers', () => {
      const mockMethodAst: GenericAstNode = {
        type: 'program',
        children: [
          {
            type: 'method_definition',
            children: [
              {
                type: 'decorator',
                text: '@Injectable',
                children: [],
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 0 },
                isNamed: true,
                fieldName: null,
              },
              {
                type: 'property_identifier',
                text: 'processData',
                children: [],
                startPosition: { row: 1, column: 0 },
                endPosition: { row: 1, column: 0 },
                isNamed: true,
                fieldName: null,
              },
              {
                text: '',
                type: 'formal_parameters',

                children: [
                  {
                    text: '',
                    type: 'required_parameter',
                    children: [
                      {
                        type: 'identifier',
                        text: 'input',
                        children: [],
                        startPosition: { row: 1, column: 0 },
                        endPosition: { row: 1, column: 0 },
                        isNamed: true,
                        fieldName: null,
                      },
                    ],
                    startPosition: { row: 1, column: 0 },
                    endPosition: { row: 1, column: 0 },
                    isNamed: true,
                    fieldName: null,
                  },
                ],
                startPosition: { row: 1, column: 0 },
                endPosition: { row: 1, column: 0 },
                isNamed: true,
                fieldName: null,
              },
            ],
            startPosition: { row: 0, column: 0 },
            endPosition: { row: 2, column: 0 },
            isNamed: true,
            fieldName: null,
            text: '',
          },
        ],
        startPosition: { row: 0, column: 0 },
        endPosition: { row: 3, column: 0 },
        isNamed: true,
        fieldName: null,
        text: '',
      };

      const result = (service as any)._condenseAst(mockMethodAst);

      expect(result.functions).toHaveLength(1);
      expect(result.functions[0]).toEqual({
        name: 'processData',
        params: ['input'],
      });
    });

    it('should handle multiple decorated parameters', () => {
      const mockMethodAst: GenericAstNode = {
        type: 'program',
        children: [
          {
            type: 'method_definition',
            children: [
              {
                type: 'property_identifier',
                text: 'handleRequest',
                children: [],
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 0 },
                isNamed: true,
                fieldName: null,
              },
              {
                type: 'formal_parameters',
                text: '',
                children: [
                  {
                    text: '',
                    type: 'required_parameter',
                    children: [
                      {
                        type: 'decorator',
                        text: '@Inject',
                        children: [],
                        startPosition: { row: 0, column: 0 },
                        endPosition: { row: 0, column: 0 },
                        isNamed: true,
                        fieldName: null,
                      },
                      {
                        type: 'identifier',
                        text: 'request',
                        children: [],
                        startPosition: { row: 0, column: 0 },
                        endPosition: { row: 0, column: 0 },
                        isNamed: true,
                        fieldName: null,
                      },
                    ],
                    startPosition: { row: 0, column: 0 },
                    endPosition: { row: 0, column: 0 },
                    isNamed: true,
                    fieldName: null,
                  },
                  {
                    text: '',
                    type: 'required_parameter',
                    children: [
                      {
                        type: 'decorator',
                        text: '@Optional',
                        children: [],
                        startPosition: { row: 0, column: 0 },
                        endPosition: { row: 0, column: 0 },
                        isNamed: true,
                        fieldName: null,
                      },
                      {
                        type: 'identifier',
                        text: 'config',
                        children: [],
                        startPosition: { row: 0, column: 0 },
                        endPosition: { row: 0, column: 0 },
                        isNamed: true,
                        fieldName: null,
                      },
                    ],
                    startPosition: { row: 0, column: 0 },
                    endPosition: { row: 0, column: 0 },
                    isNamed: true,
                    fieldName: null,
                  },
                ],
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 0 },
                isNamed: true,
                fieldName: null,
              },
            ],
            startPosition: { row: 0, column: 0 },
            endPosition: { row: 1, column: 0 },
            isNamed: true,
            fieldName: null,
            text: '',
          },
        ],
        startPosition: { row: 0, column: 0 },
        endPosition: { row: 2, column: 0 },
        isNamed: true,
        fieldName: null,
        text: '',
      };

      const result = (service as any)._condenseAst(mockMethodAst);

      expect(result.functions).toHaveLength(1);
      expect(result.functions[0]).toEqual({
        name: 'handleRequest',
        params: ['request', 'config'],
      });
    });

    it('should skip self and cls parameters in methods', () => {
      const mockMethodAst: GenericAstNode = {
        type: 'program',
        children: [
          {
            type: 'method_definition',
            children: [
              {
                type: 'property_identifier',
                text: 'process',
                children: [],
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 0 },
                isNamed: true,
                fieldName: null,
              },
              {
                text: '',
                type: 'formal_parameters',
                children: [
                  {
                    type: 'identifier',
                    text: 'self',
                    children: [],
                    startPosition: { row: 0, column: 0 },
                    endPosition: { row: 0, column: 0 },
                    isNamed: true,
                    fieldName: null,
                  },
                  {
                    type: 'identifier',
                    text: 'data',
                    children: [],
                    startPosition: { row: 0, column: 0 },
                    endPosition: { row: 0, column: 0 },
                    isNamed: true,
                    fieldName: null,
                  },
                ],
                startPosition: { row: 0, column: 0 },
                endPosition: { row: 0, column: 0 },
                isNamed: true,
                fieldName: null,
              },
            ],
            startPosition: { row: 0, column: 0 },
            endPosition: { row: 1, column: 0 },
            isNamed: true,
            fieldName: null,
            text: '',
          },
        ],
        startPosition: { row: 0, column: 0 },
        endPosition: { row: 2, column: 0 },
        isNamed: true,
        fieldName: null,
        text: '',
      };

      const result = (service as any)._condenseAst(mockMethodAst);

      expect(result.functions).toHaveLength(1);
      expect(result.functions[0]).toEqual({
        name: 'process',
        params: ['data'], // self should be excluded
      });
    });
  });
});

describe('analyzeAst method', () => {
  let service: AstAnalysisService;
  let mockLLMAgent: jest.Mocked<ILLMAgent>;
  let mockLogger: jest.Mocked<ILogger>;
  let condenseAstSpy: jest.SpyInstance;

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
      analyzeProject: jest.fn(),
      getCompletion: jest.fn(),
      getModelContextWindow: jest.fn().mockResolvedValue(1000),
      countTokens: jest.fn().mockResolvedValue(10),
      getProvider: jest.fn(),
    } as jest.Mocked<ILLMAgent>;

    mockLogger = {
      trace: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as jest.Mocked<ILogger>;

    service = new AstAnalysisService(mockLLMAgent, mockLogger);

    // Spy on the private method and control its return value
    condenseAstSpy = jest
      .spyOn(AstAnalysisService.prototype as any, '_condenseAst')
      .mockReturnValue(mockCondensedAst);
  });

  afterEach(() => {
    jest.restoreAllMocks();
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
