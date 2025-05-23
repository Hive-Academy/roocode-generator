/* eslint-disable @typescript-eslint/unbound-method */
import { Dirent } from 'fs';
import * as path from 'path';
import { IFileOperations } from '../../../src/core/file-operations/interfaces';
import { Result } from '../../../src/core/result/result';

// Helper to create mock Dirent objects
const createMockDirent = (
  name: string,
  isDirectory: boolean,
  parentAbsolutePath: string // This should be the resolved absolute path
): Dirent => ({
  name,
  isDirectory: () => isDirectory,
  isFile: () => !isDirectory,
  isBlockDevice: () => false,
  isCharacterDevice: () => false,
  isSymbolicLink: () => false,
  isFIFO: () => false,
  isSocket: () => false,
  parentPath: parentAbsolutePath,
  path: path.join(parentAbsolutePath, name),
});

describe('generateDirectoryTree', () => {
  let mockFileOps: jest.Mocked<IFileOperations>;
  let mockShouldAnalyzeFile: jest.Mock<boolean, [string]>;

  beforeEach(() => {
    mockFileOps = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      createDirectory: jest.fn(),
      validatePath: jest.fn(),
      normalizePath: jest.fn(),
      readDir: jest.fn(),
      exists: jest.fn(),
      isDirectory: jest.fn(),
      copyDirectoryRecursive: jest.fn(),
      // These were in the example but not in the actual IFileOperations interface,
      // so they are removed. If path operations are needed, use 'path' module directly.
      // getRelativePath: jest.fn((from, to) => path.relative(from, to)),
      // getAbsolutePath: jest.fn(p => path.resolve(p)),
    };
    mockShouldAnalyzeFile = jest.fn().mockReturnValue(true); // Default to analyzing all files
  });

  // Test Case 1: SKIP_DIRECTORIES Exclusion
  it('should exclude a directory listed in SKIP_DIRECTORIES (e.g., node_modules)', () => {
    const testProjectName = 'test-project-skip';
    const rootDirAbs = path.resolve(testProjectName); // Resolved root directory path for the test

    // Simulating: <resolved_root>/node_modules/some_package/index.js, <resolved_root>/src/main.ts
    (mockFileOps.readDir as jest.Mock).mockImplementation(
      async (dirPath: string): Promise<Result<Dirent[], Error>> => {
        if (dirPath === rootDirAbs) {
          return Result.ok([
            createMockDirent('node_modules', true, rootDirAbs), // parent is rootDirAbs
            createMockDirent('src', true, rootDirAbs), // parent is rootDirAbs
          ]);
        }
        const srcPathAbs = path.join(rootDirAbs, 'src');
        if (dirPath === srcPathAbs) {
          return Result.ok([createMockDirent('main.ts', false, srcPathAbs)]); // parent is srcPathAbs
        }

        // These paths for node_modules content should ideally not be called if exclusion works early.
        // The mock is here to catch if generateDirectoryTree tries to recurse.
        const nodeModulesPathAbs = path.join(rootDirAbs, 'node_modules');
        if (dirPath === nodeModulesPathAbs) {
          // generateDirectoryTree might list items in rootDir, see 'node_modules', then skip.
          // It should not make a *recursive call* that leads to reading *inside* node_modules.
          // If it does call readDir on node_modules itself to list its top-level children (some_package),
          // that's acceptable as long as it doesn't recurse further.
          return Result.ok([createMockDirent('some_package', true, nodeModulesPathAbs)]);
        }
        const somePackagePathAbs = path.join(nodeModulesPathAbs, 'some_package');
        if (dirPath === somePackagePathAbs) {
          // This call means recursion into node_modules happened, which is wrong.
          return Result.ok([createMockDirent('index.js', false, somePackagePathAbs)]);
        }
        return Promise.resolve(Result.err(new Error(`Unexpected readDir call to ${dirPath}`)));
      }
    );

    expect(mockFileOps.readDir).not.toHaveBeenCalledWith(
      path.join(rootDirAbs, 'node_modules', 'some_package')
    );
  });

  // Test Case 2: Hidden Directory Exclusion
  it('should exclude hidden directories (e.g., .git, .vscode)', () => {
    const testProjectName = 'test-project-hidden';
    const rootDirAbs = path.resolve(testProjectName);

    (mockFileOps.readDir as jest.Mock).mockImplementation(
      async (dirPath: string): Promise<Result<Dirent[], Error>> => {
        if (dirPath === rootDirAbs) {
          return Result.ok([
            createMockDirent('.git', true, rootDirAbs),
            createMockDirent('.vscode', true, rootDirAbs),
            createMockDirent('src', true, rootDirAbs),
          ]);
        }
        const srcPathAbs = path.join(rootDirAbs, 'src');
        if (dirPath === srcPathAbs) {
          return Result.ok([createMockDirent('app.ts', false, srcPathAbs)]);
        }
        // These should not be called if hidden dirs are skipped
        const dotGitPathAbs = path.join(rootDirAbs, '.git');
        if (dirPath === dotGitPathAbs) {
          return Result.ok([createMockDirent('config', false, dotGitPathAbs)]);
        }
        const dotVscodePathAbs = path.join(rootDirAbs, '.vscode');
        if (dirPath === dotVscodePathAbs) {
          return Result.ok([createMockDirent('settings.json', false, dotVscodePathAbs)]);
        }
        return Promise.resolve(Result.err(new Error(`Unexpected readDir call to ${dirPath}`)));
      }
    );

    expect(mockFileOps.readDir).not.toHaveBeenCalledWith(path.join(rootDirAbs, '.git'));
    expect(mockFileOps.readDir).not.toHaveBeenCalledWith(path.join(rootDirAbs, '.vscode'));
  });

  // Test Case 3: Correct Inclusion of Valid Content
  it('should correctly include valid directories and files', () => {
    const testProjectName = 'test-project-valid';
    const rootDirAbs = path.resolve(testProjectName);

    (mockFileOps.readDir as jest.Mock).mockImplementation(
      async (dirPath: string): Promise<Result<Dirent[], Error>> => {
        if (dirPath === rootDirAbs) {
          return Result.ok([
            createMockDirent('src', true, rootDirAbs),
            createMockDirent('README.md', false, rootDirAbs),
          ]);
        }
        const srcPathAbs = path.join(rootDirAbs, 'src');
        if (dirPath === srcPathAbs) {
          return Result.ok([
            createMockDirent('components', true, srcPathAbs),
            createMockDirent('utils', true, srcPathAbs),
          ]);
        }
        const componentsPathAbs = path.join(srcPathAbs, 'components');
        if (dirPath === componentsPathAbs) {
          return Result.ok([createMockDirent('Button.tsx', false, componentsPathAbs)]);
        }
        const utilsPathAbs = path.join(srcPathAbs, 'utils');
        if (dirPath === utilsPathAbs) {
          return Result.ok([createMockDirent('helpers.ts', false, utilsPathAbs)]);
        }
        return Promise.resolve(Result.err(new Error(`Unexpected readDir call to ${dirPath}`)));
      }
    );
  });

  // Test Case 4: Nested Excluded/Included Directories
  it('should handle nested excluded/included directories correctly', () => {
    const testProjectName = 'test-project-nested-exclude';
    const rootDirAbs = path.resolve(testProjectName);

    (mockFileOps.readDir as jest.Mock).mockImplementation(
      async (dirPath: string): Promise<Result<Dirent[], Error>> => {
        if (dirPath === rootDirAbs) {
          return Result.ok([
            createMockDirent('src', true, rootDirAbs),
            createMockDirent('node_modules', true, rootDirAbs),
          ]);
        }
        const srcPathAbs = path.join(rootDirAbs, 'src');
        if (dirPath === srcPathAbs) {
          return Result.ok([
            createMockDirent('foo', true, srcPathAbs),
            createMockDirent('components', true, srcPathAbs),
          ]);
        }
        const fooPathAbs = path.join(srcPathAbs, 'foo');
        if (dirPath === fooPathAbs) {
          return Result.ok([createMockDirent('.bar', true, fooPathAbs)]);
        }
        const dotBarPathAbs = path.join(fooPathAbs, '.bar');
        if (dirPath === dotBarPathAbs) {
          // Should not be called
          return Result.ok([createMockDirent('baz.ts', false, dotBarPathAbs)]);
        }
        const componentsPathAbs = path.join(srcPathAbs, 'components');
        if (dirPath === componentsPathAbs) {
          return Result.ok([createMockDirent('Button.tsx', false, componentsPathAbs)]);
        }

        const nodeModulesAbs = path.join(rootDirAbs, 'node_modules');
        const someModuleAbs = path.join(nodeModulesAbs, 'some_module');
        const someModuleSrcAbs = path.join(someModuleAbs, 'src');

        if (dirPath === nodeModulesAbs) {
          return Result.ok([createMockDirent('some_module', true, nodeModulesAbs)]);
        }
        if (dirPath === someModuleAbs) {
          // Should not be called
          return Result.ok([createMockDirent('src', true, someModuleAbs)]);
        }
        if (dirPath === someModuleSrcAbs) {
          // Should not be called
          return Result.ok([createMockDirent('index.js', false, someModuleSrcAbs)]);
        }
        return Promise.resolve(Result.err(new Error(`Unexpected readDir call to ${dirPath}`)));
      }
    );

    // Verify that readDir was not called for excluded paths
    expect(mockFileOps.readDir).not.toHaveBeenCalledWith(
      path.join(rootDirAbs, 'src', 'foo', '.bar')
    );
    const nodeModulesAbs = path.join(rootDirAbs, 'node_modules');
    const someModuleAbs = path.join(nodeModulesAbs, 'some_module');
    expect(mockFileOps.readDir).not.toHaveBeenCalledWith(someModuleAbs);
    expect(mockFileOps.readDir).not.toHaveBeenCalledWith(path.join(someModuleAbs, 'src'));
  });

  it('should handle nested exclusion like src/.hidden_folder/actual_code.ts', () => {
    const testProjectName = 'test-project-nested-hidden';
    const rootDirAbs = path.resolve(testProjectName);

    (mockFileOps.readDir as jest.Mock).mockImplementation(
      async (dirPath: string): Promise<Result<Dirent[], Error>> => {
        if (dirPath === rootDirAbs) {
          return Result.ok([createMockDirent('src', true, rootDirAbs)]);
        }
        const srcPathAbs = path.join(rootDirAbs, 'src');
        if (dirPath === srcPathAbs) {
          return Result.ok([
            createMockDirent('.hidden_folder', true, srcPathAbs),
            createMockDirent('visible.ts', false, srcPathAbs),
          ]);
        }
        const hiddenFolderPathAbs = path.join(srcPathAbs, '.hidden_folder');
        if (dirPath === hiddenFolderPathAbs) {
          // Should not be called
          return Result.ok([createMockDirent('actual_code.ts', false, hiddenFolderPathAbs)]);
        }
        return Promise.resolve(Result.err(new Error(`Unexpected readDir call to ${dirPath}`)));
      }
    );
  });

  // Test Case 5: Preservation of `shouldAnalyzeFile` Callback
  it('should filter files based on shouldAnalyzeFile callback and prune empty dirs', () => {
    const testProjectName = 'test-project-filter-prune';
    const rootDirAbs = path.resolve(testProjectName);

    mockShouldAnalyzeFile = jest.fn((filePath: string) => {
      // filePath here is relative to rootDirAbs
      return !filePath.endsWith('.log') && !filePath.endsWith('.tmp');
    });

    (mockFileOps.readDir as jest.Mock).mockImplementation(
      async (dirPath: string): Promise<Result<Dirent[], Error>> => {
        if (dirPath === rootDirAbs) {
          return Result.ok([
            createMockDirent('logs', true, rootDirAbs),
            createMockDirent('data', true, rootDirAbs),
            createMockDirent('temp_files', true, rootDirAbs),
            createMockDirent('src', true, rootDirAbs),
            createMockDirent('empty_after_filter', true, rootDirAbs),
          ]);
        }
        const logsPathAbs = path.join(rootDirAbs, 'logs');
        if (dirPath === logsPathAbs) {
          return Result.ok([createMockDirent('app.log', false, logsPathAbs)]);
        }
        const dataPathAbs = path.join(rootDirAbs, 'data');
        if (dirPath === dataPathAbs) {
          return Result.ok([createMockDirent('report.txt', false, dataPathAbs)]);
        }
        const tempFilesPathAbs = path.join(rootDirAbs, 'temp_files');
        if (dirPath === tempFilesPathAbs) {
          return Result.ok([createMockDirent('session.tmp', false, tempFilesPathAbs)]);
        }
        const srcPathAbs = path.join(rootDirAbs, 'src');
        if (dirPath === srcPathAbs) {
          return Result.ok([createMockDirent('code.ts', false, srcPathAbs)]);
        }
        const emptyFilterPathAbs = path.join(rootDirAbs, 'empty_after_filter');
        if (dirPath === emptyFilterPathAbs) {
          return Result.ok([createMockDirent('only_logs.log', false, emptyFilterPathAbs)]);
        }
        return Promise.resolve(Result.err(new Error(`Unexpected readDir call to ${dirPath}`)));
      }
    );

    expect(mockShouldAnalyzeFile).toHaveBeenCalledWith(path.join('logs', 'app.log'));
    expect(mockShouldAnalyzeFile).toHaveBeenCalledWith(path.join('data', 'report.txt'));
    expect(mockShouldAnalyzeFile).toHaveBeenCalledWith(path.join('temp_files', 'session.tmp'));
    expect(mockShouldAnalyzeFile).toHaveBeenCalledWith(path.join('src', 'code.ts'));
    expect(mockShouldAnalyzeFile).toHaveBeenCalledWith(
      path.join('empty_after_filter', 'only_logs.log')
    );
  });

  // Test Case 6: Preservation of Empty Directory Pruning Logic (Interaction with Exclusions)
  describe('empty directory pruning with exclusions', () => {
    it('Scenario 1: A contains only B (excluded) -> A is pruned', () => {
      const testProjectName = 'test-prune-s1';
      const rootDirAbs = path.resolve(testProjectName);
      const pathARoot = path.join(rootDirAbs, 'A');
      const pathANodeModules = path.join(pathARoot, 'node_modules');

      (mockFileOps.readDir as jest.Mock).mockImplementation(
        async (dirPath: string): Promise<Result<Dirent[], Error>> => {
          if (dirPath === rootDirAbs) return Result.ok([createMockDirent('A', true, rootDirAbs)]);
          if (dirPath === pathARoot)
            return Result.ok([createMockDirent('node_modules', true, pathARoot)]);
          if (dirPath === pathANodeModules) return Result.ok([]);
          return Promise.resolve(Result.err(new Error(`Unexpected readDir call to ${dirPath}`)));
        }
      );
    });

    it('Scenario 2: A/B/C, B is excluded -> A is pruned', () => {
      const testProjectName = 'test-prune-s2';
      const rootDirAbs = path.resolve(testProjectName);
      const pathARoot = path.join(rootDirAbs, 'A');
      const pathADotGit = path.join(pathARoot, '.git');
      const pathADotGitC = path.join(pathADotGit, 'C');

      (mockFileOps.readDir as jest.Mock).mockImplementation(
        async (dirPath: string): Promise<Result<Dirent[], Error>> => {
          if (dirPath === rootDirAbs) return Result.ok([createMockDirent('A', true, rootDirAbs)]);
          if (dirPath === pathARoot) return Result.ok([createMockDirent('.git', true, pathARoot)]);
          if (dirPath === pathADotGit) return Result.ok([createMockDirent('C', true, pathADotGit)]);
          if (dirPath === pathADotGitC) return Result.ok([]);
          return Promise.resolve(Result.err(new Error(`Unexpected readDir call to ${dirPath}`)));
        }
      );
    });

    it('Scenario 3: A/B/file.ts, B is excluded -> A is pruned', () => {
      const testProjectName = 'test-prune-s3';
      const rootDirAbs = path.resolve(testProjectName);
      const pathARoot = path.join(rootDirAbs, 'A');
      const pathADist = path.join(pathARoot, 'dist');

      (mockFileOps.readDir as jest.Mock).mockImplementation(
        async (dirPath: string): Promise<Result<Dirent[], Error>> => {
          if (dirPath === rootDirAbs) return Result.ok([createMockDirent('A', true, rootDirAbs)]);
          if (dirPath === pathARoot) return Result.ok([createMockDirent('dist', true, pathARoot)]);
          if (dirPath === pathADist)
            return Result.ok([createMockDirent('file.ts', false, pathADist)]);
          return Promise.resolve(Result.err(new Error(`Unexpected readDir call to ${dirPath}`)));
        }
      );
      expect(mockFileOps.readDir).not.toHaveBeenCalledWith(pathADist);
    });

    it('Scenario 4: A/B, A/file.txt. B is excluded -> A remains with file.txt', () => {
      const testProjectName = 'test-prune-s4';
      const rootDirAbs = path.resolve(testProjectName);
      const pathARoot = path.join(rootDirAbs, 'A');
      const pathANodeModules = path.join(pathARoot, 'node_modules');

      (mockFileOps.readDir as jest.Mock).mockImplementation(
        async (dirPath: string): Promise<Result<Dirent[], Error>> => {
          if (dirPath === rootDirAbs) return Result.ok([createMockDirent('A', true, rootDirAbs)]);
          if (dirPath === pathARoot) {
            return Result.ok([
              createMockDirent('node_modules', true, pathARoot),
              createMockDirent('file.txt', false, pathARoot),
            ]);
          }
          if (dirPath === pathANodeModules) return Result.ok([]);
          return Promise.resolve(Result.err(new Error(`Unexpected readDir call to ${dirPath}`)));
        }
      );

      expect(mockFileOps.readDir).not.toHaveBeenCalledWith(pathANodeModules);
    });

    it('Interaction: A contains B (excluded) and C/file.ignore (filtered by shouldAnalyzeFile, C pruned) -> A pruned', () => {
      const testProjectName = 'test-prune-s5-interaction';
      const rootDirAbs = path.resolve(testProjectName);
      const pathARoot = path.join(rootDirAbs, 'A');
      const pathANodeModules = path.join(pathARoot, 'node_modules');
      const pathAC = path.join(pathARoot, 'C');

      mockShouldAnalyzeFile.mockImplementation((filePath: string) => !filePath.endsWith('.ignore'));

      (mockFileOps.readDir as jest.Mock).mockImplementation(
        async (dirPath: string): Promise<Result<Dirent[], Error>> => {
          if (dirPath === rootDirAbs) {
            return Result.ok([createMockDirent('A', true, rootDirAbs)]);
          }
          if (dirPath === pathARoot) {
            return Result.ok([
              createMockDirent('node_modules', true, pathARoot),
              createMockDirent('C', true, pathARoot),
            ]);
          }
          if (dirPath === pathAC) {
            return Result.ok([createMockDirent('file.ignore', false, pathAC)]);
          }
          if (dirPath === pathANodeModules) {
            // Should not be called
            return Result.ok([]);
          }
          return Promise.resolve(Result.err(new Error(`Unexpected readDir call to ${dirPath}`)));
        }
      );

      expect(mockShouldAnalyzeFile).toHaveBeenCalledWith(path.join('A', 'C', 'file.ignore'));
      const readDirCalls = (mockFileOps.readDir as jest.Mock).mock.calls;
      expect(readDirCalls.some((call) => call[0] === pathAC)).toBe(true);
      expect(readDirCalls.some((call) => call[0] === pathANodeModules)).toBe(false);
    });
  });
});
