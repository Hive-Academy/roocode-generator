import { jest } from '@jest/globals';
import { ITreeSitterParserService } from '../../src/core/analysis/interfaces';
import { Result } from '../../src/core/result/result';
import { GenericAstNode } from '../../src/core/analysis/types';
import { SupportedLanguage } from '../../src/core/analysis/tree-sitter.config';

export const createMockTreeSitterParserService = (): jest.Mocked<ITreeSitterParserService> => {
  return {
    initialize: jest.fn<() => Result<void, Error>>(),
    parse:
      jest.fn<(content: string, language: SupportedLanguage) => Result<GenericAstNode, Error>>(),
  } as jest.Mocked<ITreeSitterParserService>;
};
