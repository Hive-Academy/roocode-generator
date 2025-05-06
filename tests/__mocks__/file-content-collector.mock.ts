import { jest } from '@jest/globals';
import { IFileContentCollector, FileContentResult } from '../../src/core/analysis/interfaces';
import { Result } from '../../src/core/result/result';

export const createMockFileContentCollector = (): jest.Mocked<IFileContentCollector> => {
  return {
    collectContent:
      jest.fn<
        (
          filePaths: string[],
          rootDir: string,
          tokenLimit: number
        ) => Promise<Result<FileContentResult, Error>>
      >(),
  } as jest.Mocked<IFileContentCollector>;
};
