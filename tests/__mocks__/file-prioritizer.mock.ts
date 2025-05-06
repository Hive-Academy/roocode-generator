import { jest } from '@jest/globals';
import { IFilePrioritizer, FileMetadata } from '../../src/core/analysis/interfaces';

export const createMockFilePrioritizer = (): jest.Mocked<IFilePrioritizer> => {
  return {
    prioritizeFiles: jest.fn<(files: FileMetadata[], rootDir: string) => FileMetadata[]>(),
  } as jest.Mocked<IFilePrioritizer>;
};
