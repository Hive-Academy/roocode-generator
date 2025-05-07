/* eslint-disable @typescript-eslint/unbound-method */
// tests/core/analysis/ast-analysis.service.test.ts
import { AstAnalysisService } from '../../../src/core/analysis/ast-analysis.service';
import { ILLMAgent, LLMCompletionConfig } from '../../../src/core/llm/interfaces';
import { ILogger } from '../../../src/core/services/logger-service';
import { Result } from '../../../src/core/result/result';
import { LLMProviderError } from '../../../src/core/llm/llm-provider-errors';
import type { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { z } from 'zod';
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
        getCompletion: jest.fn<Promise<Result<string, LLMProviderError>>, [string, string]>(),
        getStructuredCompletion: jest.fn().mockImplementation(
          <T extends z.ZodTypeAny>(
            _prompt: BaseLanguageModelInput,
            _schema: T,
            _completionConfig?: LLMCompletionConfig
          ): Promise<Result<z.infer<T>, LLMProviderError>> =>
            Promise.resolve(Result.ok({} as z.infer<T>)) // Default mock
        ),
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
      getCompletion: jest.fn<Promise<Result<string, LLMProviderError>>, [string, string]>(),
      getStructuredCompletion: jest
        .fn()
        .mockImplementation(
          <T extends z.ZodTypeAny>(
            _prompt: BaseLanguageModelInput,
            schema: T,
            _completionConfig?: LLMCompletionConfig
          ): Promise<Result<z.infer<T>, LLMProviderError>> => {
            if (schema.description === 'CodeInsightsSchema') {
              return Promise.resolve(
                Result.ok({
                  // Corrected mock CodeInsights
                  imports: [],
                  functions: [],
                  classes: [],
                } as z.infer<T>)
              );
            }
            return Promise.resolve(Result.ok({} as z.infer<T>));
          }
        ),
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

    condenseAstSpy = jest
      .spyOn(AstAnalysisService.prototype as any, '_condenseAst')
      .mockReturnValue(mockCondensedAst);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should call _condenseAst with the provided astData', async () => {
    const mockLLMResponse: CodeInsights = {
      // Corrected mock CodeInsights
      imports: [{ source: 'fs' }],
      functions: [{ name: 'readFile', parameters: ['path'] }],
      classes: [{ name: 'MyClass' }],
    };
    mockLLMAgent.getStructuredCompletion.mockResolvedValue(Result.ok(mockLLMResponse));

    await service.analyzeAst(mockAstData, mockFilePath);

    expect(condenseAstSpy).toHaveBeenCalledTimes(1);
    expect(condenseAstSpy).toHaveBeenCalledWith(mockAstData);
  });

  it('should analyze AST successfully, return CodeInsights, and verify prompt', async () => {
    const mockLLMResponse: CodeInsights = {
      // Corrected mock CodeInsights
      imports: [{ source: 'fs' }],
      functions: [{ name: 'readFile', parameters: ['path'] }],
      classes: [{ name: 'MyClass' }],
    };
    mockLLMAgent.getStructuredCompletion.mockResolvedValue(Result.ok(mockLLMResponse));

    const result = await service.analyzeAst(mockAstData, mockFilePath);

    expect(result.isOk()).toBe(true);
    expect(result.value).toEqual(mockLLMResponse);

    expect(condenseAstSpy).toHaveBeenCalledWith(mockAstData);
    expect(mockLLMAgent.getStructuredCompletion).toHaveBeenCalledTimes(1);

    const structuredCompletionCallArgs = mockLLMAgent.getStructuredCompletion.mock.calls[0];
    const promptArg = structuredCompletionCallArgs[0];
    const schemaArg = structuredCompletionCallArgs[1];

    expect(typeof promptArg).toBe('string'); // AstAnalysisService passes the system prompt string
    const systemPromptContent = promptArg as string;

    expect(systemPromptContent).toContain('CONDENSED');
    expect(systemPromptContent).toContain('### Target Output Schema (CodeInsights) ###');
    expect(systemPromptContent).toContain(mockCondensedAstJson);
    expect(schemaArg).toBeDefined();
    expect(schemaArg.description).toBe('CodeInsightsSchema');

    expect(mockLogger.debug).toHaveBeenCalledWith(`Analyzing AST for file: ${mockFilePath}`);
    expect(mockLogger.debug).toHaveBeenCalledWith(
      `Successfully received and validated structured AST insights for ${mockFilePath}`
    );
    expect(mockLogger.warn).not.toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should return error if LLM agent fails', async () => {
    const llmError = new LLMProviderError('LLM API Error', 'API_ERROR', 'mockProvider');
    mockLLMAgent.getStructuredCompletion.mockResolvedValue(Result.err(llmError));

    const result = await service.analyzeAst(mockAstData, mockFilePath);

    expect(result.isErr()).toBe(true);
    expect(result.error).toBe(llmError);

    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      `Structured LLM call failed for ${mockFilePath}: ${llmError.message}`,
      llmError
    );
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('should return LLMProviderError if LLM response cannot be parsed by schema (simulated by provider error)', async () => {
    const schemaValidationError = new LLMProviderError(
      'Simulated parsing failure in LLM response',
      'SCHEMA_VALIDATION_ERROR',
      'mockProvider'
    );
    mockLLMAgent.getStructuredCompletion.mockResolvedValue(Result.err(schemaValidationError));

    const result = await service.analyzeAst(mockAstData, mockFilePath);

    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(LLMProviderError);
    expect(result.error).toBe(schemaValidationError);

    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      `Structured LLM call failed for ${mockFilePath}: Simulated parsing failure in LLM response`,
      schemaValidationError
    );
  });

  it('should return LLMProviderError if LLM response is empty or unparsable (simulated by provider error)', async () => {
    const emptyContentError = new LLMProviderError(
      'LLM returned empty or unparsable content for schema',
      'SCHEMA_VALIDATION_ERROR',
      'mockProvider'
    );
    mockLLMAgent.getStructuredCompletion.mockResolvedValue(Result.err(emptyContentError));

    const result = await service.analyzeAst(mockAstData, mockFilePath);

    expect(result.isErr()).toBe(true);
    expect(result.error).toBeInstanceOf(LLMProviderError);
    expect(result.error).toBe(emptyContentError);

    expect(mockLogger.error).toHaveBeenCalledWith(
      `Structured LLM call failed for ${mockFilePath}: LLM returned empty or unparsable content for schema`,
      emptyContentError
    );
  });

  it('should return LLMProviderError (wrapping RooCodeError) if insights are null/undefined after successful LLM call', async () => {
    mockLLMAgent.getStructuredCompletion.mockResolvedValue(Result.ok(null as any)); // Simulate null insights

    const result = await service.analyzeAst(mockAstData, mockFilePath);

    expect(result.isErr()).toBe(true);
    const err = result.error as LLMProviderError;
    expect(err).toBeInstanceOf(LLMProviderError);
    expect(err.provider).toBe('AstAnalysisService');
    expect(err.code).toBe('UNKNOWN_ERROR'); // fromError default
    expect(err.message).toContain('Structured LLM call succeeded but returned null or undefined');
    expect(err.details?.cause).toBeInstanceOf(RooCodeError);
    expect((err.details?.cause as RooCodeError).code).toBe('UNEXPECTED_ANALYSIS_ERROR');
  });

  it('should return LLMProviderError (wrapping RooCodeError) if _condenseAst throws an error', async () => {
    const condensationError = new Error('Condensation failed');
    condenseAstSpy.mockImplementation(() => {
      throw condensationError;
    });

    const result = await service.analyzeAst(mockAstData, mockFilePath);

    expect(result.isErr()).toBe(true);
    const err = result.error as LLMProviderError;
    expect(err).toBeInstanceOf(LLMProviderError);
    expect(err.provider).toBe('AstAnalysisService');
    expect(err.code).toBe('UNKNOWN_ERROR');
    expect(err.message).toContain(
      'Unexpected error during AST analysis for src/test.ts: Condensation failed'
    );
    expect(err.details?.cause).toBeInstanceOf(RooCodeError);
    expect((err.details?.cause as RooCodeError).cause).toBe(condensationError);

    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining(
        'Unexpected error during AST analysis for src/test.ts: Condensation failed'
      ),
      condensationError
    );
    expect(mockLogger.warn).not.toHaveBeenCalled();
    expect(mockLLMAgent.getStructuredCompletion).not.toHaveBeenCalled();
  });
});
