import { jest } from '@jest/globals';
import { ProjectAnalyzerHelpers } from '../../src/core/analysis/project-analyzer.helpers';
import { Result } from '../../src/core/result/result';
// ProjectContext import removed

export const createMockProjectAnalyzerHelpers = (): jest.Mocked<ProjectAnalyzerHelpers> => {
  return {
    stripJsonComments: jest.fn<ProjectAnalyzerHelpers['stripJsonComments']>(
      (jsonString: string) => jsonString
    ),
    shouldAnalyzeFile: jest.fn<ProjectAnalyzerHelpers['shouldAnalyzeFile']>(
      (_filePath: string) => true
    ),
    isDirectory: jest.fn<ProjectAnalyzerHelpers['isDirectory']>((_filePath: string) =>
      Promise.resolve(Result.ok(false))
    ),
    saveProjectContextToFile: jest.fn<ProjectAnalyzerHelpers['saveProjectContextToFile']>(() =>
      Promise.resolve()
    ),
    collectAnalyzableFiles: jest.fn<ProjectAnalyzerHelpers['collectAnalyzableFiles']>(
      (_rootDir: string) => Promise.resolve(Result.ok([]))
    ),
  } as unknown as jest.Mocked<ProjectAnalyzerHelpers>;
};

export const mockProjectAnalyzerHelpers = createMockProjectAnalyzerHelpers();
