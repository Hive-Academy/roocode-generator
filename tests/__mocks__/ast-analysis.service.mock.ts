import { jest } from '@jest/globals';
import { IAstAnalysisService, CodeInsights } from '../../src/core/analysis/ast-analysis.interfaces';
import { Result } from '../../src/core/result/result';
import { GenericAstNode } from '../../src/core/analysis/types';
import { LLMProviderError } from '../../src/core/llm/llm-provider-errors'; // Added import

export const createMockAstAnalysisService = (): jest.Mocked<IAstAnalysisService> => {
  return {
    analyzeAst: jest.fn<
      (astData: GenericAstNode, filePath: string) => Promise<Result<CodeInsights, LLMProviderError>> // Changed Error to LLMProviderError
    >(),
  } as jest.Mocked<IAstAnalysisService>;
};
