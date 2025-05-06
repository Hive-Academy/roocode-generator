import { jest } from '@jest/globals';
import { IFileOperations } from '../../src/core/file-operations/interfaces';
import { Result } from '../../src/core/result/result';
import { Dirent } from 'fs';

export const createMockFileOperations = (): jest.Mocked<IFileOperations> => {
  // Note: Adding methods based on task description, even if not all were in the read interface file.
  return {
    // Existing methods from interface file
    readFile: jest.fn<() => Promise<Result<string, Error>>>(),
    writeFile: jest.fn<() => Promise<Result<void, Error>>>(),
    createDirectory: jest.fn<() => Promise<Result<void, Error>>>(),
    validatePath: jest.fn<() => boolean>(),
    normalizePath: jest.fn<() => string>(),
    readDir: jest.fn<() => Promise<Result<Dirent[], Error>>>(), // Interface has Dirent[], task mentioned string[]
    exists: jest.fn<() => Promise<Result<boolean, Error>>>(), // From interface
    isDirectory: jest.fn<() => Promise<Result<boolean, Error>>>(),
    copyDirectoryRecursive: jest.fn<() => Promise<Result<void, Error>>>(),

    // Adding methods specifically requested in the task description TSK-017
    copyFile: jest.fn<() => Promise<Result<void, Error>>>(),
    deleteFile: jest.fn<() => Promise<Result<void, Error>>>(),
    joinPaths: jest.fn<(...paths: string[]) => string>((...paths: string[]) => paths.join('/')), // Added default implementation
    pathExists: jest.fn<() => Promise<Result<boolean, Error>>>(), // Added as per task (distinct from 'exists'?)
    ensureDir: jest.fn<() => Promise<Result<void, Error>>>(),
  } as jest.Mocked<IFileOperations>; // Type assertion might need adjustment if interface truly differs
};
