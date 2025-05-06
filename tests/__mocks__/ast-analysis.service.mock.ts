import { jest } from '@jest/globals';
import { IAstAnalysisService, CodeInsights } from '../../src/core/analysis/ast-analysis.interfaces';
import { Result } from '../../src/core/result/result';
import { GenericAstNode } from '../../src/core/analysis/types';

export const createMockAstAnalysisService = (): jest.Mocked<IAstAnalysisService> => {
  return {
    analyzeAst:
      jest.fn<
        (astData: GenericAstNode, filePath: string) => Promise<Result<CodeInsights, Error>>
      >(),
  } as jest.Mocked<IAstAnalysisService>;
};
