/* eslint-disable @typescript-eslint/unbound-method */
import { ProjectAnalyzer } from '../../../src/core/analysis/project-analyzer';
import { IFileOperations } from '../../../src/core/file-operations/interfaces';
import { ILogger } from '../../../src/core/services/logger-service';
import { LLMAgent } from '../../../src/core/llm/llm-agent';
import { ResponseParser } from '../../../src/core/analysis/response-parser';
import { ProgressIndicator } from '../../../src/core/ui/progress-indicator';
import { Result } from '../../../src/core/result/result'; // Import Result
import { ProjectContext } from '../../../src/core/analysis/types'; // Import ProjectContext
import path from 'path'; // Import path

// Mock constants used by ProjectAnalyzer
jest.mock('../../../src/core/analysis/constants', () => ({
  BINARY_EXTENSIONS: new Set(['.png', '.jpg', '.zip', '.pdf', '.class', '.pyc']),
  SKIP_DIRECTORIES: new Set(['node_modules', '.git', 'dist', 'build']),
  ANALYZABLE_EXTENSIONS: new Set([
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.json',
    '.yml',
    '.yaml',
    '.md',
    '.py',
    '.java',
    '.html',
    '.css',
  ]),
  ANALYZABLE_FILENAMES: new Set(['Dockerfile', 'Makefile', 'package.json', 'tsconfig.json']),
}));

describe('ProjectAnalyzer', () => {
  let projectAnalyzer: ProjectAnalyzer;
  let mockFileOps: jest.Mocked<IFileOperations>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockLLMAgent: jest.Mocked<LLMAgent>;
  let mockResponseParser: jest.Mocked<ResponseParser>;
  let mockProgressIndicator: jest.Mocked<ProgressIndicator>;

  beforeEach(() => {
    mockFileOps = {
      readFile: jest.fn(),
      writeFile: jest.fn(),
      exists: jest.fn(),
      isDirectory: jest.fn(),
      readDir: jest.fn(),
      copyFile: jest.fn(),
      copyDirectoryRecursive: jest.fn(),
      deleteFile: jest.fn(),
      deleteDirectory: jest.fn(),
      createDirectory: jest.fn(),
      getRelativePath: jest.fn(),
      getAbsolutePath: jest.fn(),
      joinPaths: jest.fn(),
      dirname: jest.fn(),
      basename: jest.fn(),
      extname: jest.fn(),
      normalizePath: jest.fn((p) => p), // Add mock for normalizePath
    } as unknown as jest.Mocked<IFileOperations>;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as jest.Mocked<ILogger>;

    mockLLMAgent = {
      getCompletion: jest.fn(),
      getChatCompletion: jest.fn(),
    } as unknown as jest.Mocked<LLMAgent>;

    mockResponseParser = {
      parseJSON: jest.fn(),
    } as unknown as jest.Mocked<ResponseParser>;

    mockProgressIndicator = {
      start: jest.fn(),
      update: jest.fn(),
      succeed: jest.fn(),
      fail: jest.fn(),
    } as unknown as jest.Mocked<ProgressIndicator>;

    projectAnalyzer = new ProjectAnalyzer(
      mockFileOps,
      mockLogger,
      mockLLMAgent,
      mockResponseParser,
      mockProgressIndicator
    );
  });

  describe('shouldAnalyzeFile', () => {
    // Access the private method using type assertion - now takes full path
    const shouldAnalyzeFile = (filePath: string) => {
      return (projectAnalyzer as any).shouldAnalyzeFile(filePath);
    };

    it('should return true for analyzable extensions', () => {
      expect(shouldAnalyzeFile('src/app.js')).toBe(true);
      expect(shouldAnalyzeFile('src/component.jsx')).toBe(true);
      expect(shouldAnalyzeFile('src/service.ts')).toBe(true);
      expect(shouldAnalyzeFile('src/component.tsx')).toBe(true);
      expect(shouldAnalyzeFile('config/config.json')).toBe(true);
      expect(shouldAnalyzeFile('config/config.yml')).toBe(true);
      expect(shouldAnalyzeFile('docs/README.md')).toBe(true);
      expect(shouldAnalyzeFile('scripts/script.py')).toBe(true);
      expect(shouldAnalyzeFile('com/example/Main.java')).toBe(true);
    });

    it('should return true for analyzable filenames (even without extension)', () => {
      expect(shouldAnalyzeFile('Dockerfile')).toBe(true);
      expect(shouldAnalyzeFile('Makefile')).toBe(true);
      expect(shouldAnalyzeFile('package.json')).toBe(true);
      expect(shouldAnalyzeFile('tsconfig.json')).toBe(true);
      expect(shouldAnalyzeFile('/path/to/package.json')).toBe(true); // Test with path
    });

    it('should return false for test/spec files', () => {
      expect(shouldAnalyzeFile('src/app.test.js')).toBe(false);
      expect(shouldAnalyzeFile('src/component.spec.tsx')).toBe(false);
    });

    it('should return false for declaration, map, and lock files', () => {
      expect(shouldAnalyzeFile('types/types.d.ts')).toBe(false);
      expect(shouldAnalyzeFile('dist/app.js.map')).toBe(false);
      expect(shouldAnalyzeFile('package-lock.json')).toBe(false);
      expect(shouldAnalyzeFile('yarn.lock')).toBe(false);
    });

    it('should return false for binary extensions', () => {
      expect(shouldAnalyzeFile('assets/image.png')).toBe(false);
      expect(shouldAnalyzeFile('docs/document.pdf')).toBe(false);
      expect(shouldAnalyzeFile('dist/archive.zip')).toBe(false);
      expect(shouldAnalyzeFile('bin/App.class')).toBe(false);
      expect(shouldAnalyzeFile('cache/script.pyc')).toBe(false);
    });

    it('should return false for unlisted extensions/filenames', () => {
      expect(shouldAnalyzeFile('data.csv')).toBe(false);
      expect(shouldAnalyzeFile('temp.log')).toBe(false);
      expect(shouldAnalyzeFile('NOTES')).toBe(false); // No extension, not in ANALYZABLE_FILENAMES
    });
  });

  describe('analyzeProject', () => {
    const mockRootPath = '/mock/project';
    const mockPaths = [mockRootPath];
    // const mockFileContent1 = 'File: src/index.ts\nconsole.log("hello");'; // Unused
    // const mockFileContent2 = 'File: package.json\n{ "name": "test-project" }'; // Unused
    // const mockCollectedFiles = [mockFileContent1, mockFileContent2]; // Removed unused variable
    const mockLLMResponse: ProjectContext = {
      techStack: {
        languages: ['TypeScript'],
        frameworks: [],
        buildTools: ['tsc'],
        testingFrameworks: [],
        linters: [],
        packageManager: 'npm',
      },
      structure: {
        rootDir: '/some/other/path', // This should be overridden
        sourceDir: 'src',
        testDir: '',
        configFiles: ['package.json'],
        mainEntryPoints: ['src/index.ts'],
        componentStructure: {},
      },
      dependencies: {
        dependencies: {},
        devDependencies: { typescript: '^5.0.0' },
        peerDependencies: {},
        internalDependencies: {},
      },
    };

    beforeEach(() => {
      // Mock file system operations for collectProjectFiles
      // Simulate reading the root directory (re-add async and wrap return in Promise.resolve)
      mockFileOps.readDir.mockImplementation(async (dirPath) => {
        if (dirPath === mockRootPath) {
          // Simulate Dirent objects
          return Promise.resolve(
            Result.ok([
              { name: 'src', isDirectory: () => true, isFile: () => false } as any,
              { name: 'package.json', isDirectory: () => false, isFile: () => true } as any,
              { name: 'node_modules', isDirectory: () => true, isFile: () => false } as any, // Should be skipped
              { name: '.git', isDirectory: () => true, isFile: () => false } as any, // Should be skipped
              { name: 'README.md', isDirectory: () => false, isFile: () => true } as any, // Should be analyzed
            ])
          );
        }
        if (dirPath === path.join(mockRootPath, 'src')) {
          return Promise.resolve(
            Result.ok([
              { name: 'index.ts', isDirectory: () => false, isFile: () => true } as any,
              { name: 'index.test.ts', isDirectory: () => false, isFile: () => true } as any, // Should be skipped by shouldAnalyzeFile
            ])
          );
        }
        // Default for other dirs or errors
        return Promise.resolve(
          Result.err(new Error(`ENOENT: no such file or directory, scandir '${dirPath}'`))
        );
      });

      // Simulate isDirectory checks (re-add async and wrap return in Promise.resolve)
      mockFileOps.isDirectory.mockImplementation(async (filePath) => {
        if (
          filePath.endsWith('node_modules') ||
          filePath.endsWith('.git') ||
          filePath.endsWith('src')
        ) {
          return Promise.resolve(Result.ok(true));
        }
        return Promise.resolve(Result.ok(false));
      });

      // Simulate readFile operations (re-add async and wrap return in Promise.resolve)
      mockFileOps.readFile.mockImplementation(async (filePath) => {
        if (filePath === path.join(mockRootPath, 'src', 'index.ts')) {
          return Promise.resolve(Result.ok('console.log("hello");'));
        }
        if (filePath === path.join(mockRootPath, 'package.json')) {
          return Promise.resolve(Result.ok('{ "name": "test-project" }'));
        }
        if (filePath === path.join(mockRootPath, 'README.md')) {
          return Promise.resolve(Result.ok('# Test Project'));
        }
        return Promise.resolve(Result.err(new Error(`File not found: ${filePath}`)));
      });

      // Mock LLM and Parser
      mockLLMAgent.getCompletion.mockResolvedValue(Result.ok(JSON.stringify(mockLLMResponse)));
      mockResponseParser.parseJSON.mockReturnValue(Result.ok(mockLLMResponse));
    });

    it('should successfully analyze a project and return ProjectContext', async () => {
      const result = await projectAnalyzer.analyzeProject(mockPaths);

      expect(result.isOk()).toBe(true);
      const context = result.value as ProjectContext;

      // Verify file collection (indirectly via LLM input)
      expect(mockLLMAgent.getCompletion).toHaveBeenCalledTimes(1);
      const llmInput = mockLLMAgent.getCompletion.mock.calls[0][1];
      // Check for platform-specific path and content separately
      expect(llmInput).toContain(`File: ${path.join('src', 'index.ts')}`);
      expect(llmInput).toContain('console.log("hello");');
      expect(llmInput).toContain(`File: package.json`);
      expect(llmInput).toContain('{ "name": "test-project" }');
      expect(llmInput).toContain(`File: README.md`);
      expect(llmInput).toContain('# Test Project');
      expect(llmInput).not.toContain('node_modules');
      expect(llmInput).not.toContain('.git');
      expect(llmInput).not.toContain('index.test.ts'); // Filtered by shouldAnalyzeFile

      // Verify parsing
      expect(mockResponseParser.parseJSON).toHaveBeenCalledWith(JSON.stringify(mockLLMResponse));

      // Verify final context structure and rootDir override
      expect(context).toBeDefined();
      expect(context.techStack).toEqual(mockLLMResponse.techStack);
      expect(context.dependencies).toEqual(mockLLMResponse.dependencies);
      expect(context.structure.rootDir).toBe(mockRootPath); // Check override
      expect(context.structure.sourceDir).toBe(mockLLMResponse.structure.sourceDir);
      expect(context.structure.configFiles).toEqual(mockLLMResponse.structure.configFiles);

      // Verify progress indication
      expect(mockProgressIndicator.start).toHaveBeenCalledWith(
        'Collecting project files for analysis...'
      );
      expect(mockProgressIndicator.update).toHaveBeenCalledWith(
        expect.stringContaining('Collected 3 files. Analyzing project context...')
      ); // 3 files: index.ts, package.json, README.md
      expect(mockProgressIndicator.update).toHaveBeenCalledWith('Processing analysis results...');
      expect(mockProgressIndicator.succeed).toHaveBeenCalledWith(
        'Project context analysis completed successfully'
      );
    });

    it('should return error if no paths are provided', async () => {
      const result = await projectAnalyzer.analyzeProject([]);
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toBe('No project paths provided for analysis.');
      expect(mockProgressIndicator.start).not.toHaveBeenCalled();
    });

    it('should return error if no analyzable files are found', async () => {
      // Mock readDir to return only skipped files/dirs
      mockFileOps.readDir.mockResolvedValue(
        Result.ok([
          { name: 'node_modules', isDirectory: () => true, isFile: () => false } as any,
          { name: '.git', isDirectory: () => true, isFile: () => false } as any,
        ])
      );
      mockFileOps.isDirectory.mockResolvedValue(Result.ok(true)); // All are dirs

      const result = await projectAnalyzer.analyzeProject(mockPaths);
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toBe('No analyzable files found for analysis');
      expect(mockProgressIndicator.start).toHaveBeenCalled();
      expect(mockProgressIndicator.fail).toHaveBeenCalledWith(
        'No analyzable files found in the project'
      );
    });

    it('should return error if LLM agent fails', async () => {
      const llmError = new Error('LLM API error');
      mockLLMAgent.getCompletion.mockResolvedValue(Result.err(llmError));

      const result = await projectAnalyzer.analyzeProject(mockPaths);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(llmError);
      expect(mockProgressIndicator.fail).toHaveBeenCalledWith(
        'Project context analysis failed during LLM call'
      );
    });

    it('should return error if response parsing fails', async () => {
      const parseError = new Error('Invalid JSON');
      mockLLMAgent.getCompletion.mockResolvedValue(Result.ok('invalid json'));
      mockResponseParser.parseJSON.mockReturnValue(Result.err(parseError));

      const result = await projectAnalyzer.analyzeProject(mockPaths);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(parseError);
      expect(mockProgressIndicator.fail).toHaveBeenCalledWith(
        'Failed to parse analysis results from LLM'
      );
    });

    it('should return error if parsed value is undefined', async () => {
      mockLLMAgent.getCompletion.mockResolvedValue(Result.ok('{}')); // Valid JSON, but maybe not ProjectContext
      mockResponseParser.parseJSON.mockReturnValue(Result.ok(undefined as any)); // Simulate undefined value

      const result = await projectAnalyzer.analyzeProject(mockPaths);

      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toBe('Parsed analysis result value is undefined');
      expect(mockProgressIndicator.fail).toHaveBeenCalledWith(
        'Parsed analysis result value is undefined'
      );
    });

    it('should return error if file collection fails', async () => {
      const fileError = new Error('Permission denied');
      mockFileOps.readDir.mockResolvedValue(Result.err(fileError)); // Fail reading root

      const result = await projectAnalyzer.analyzeProject(mockPaths);

      // The error is caught inside collectProjectFiles which returns [], leading to "No analyzable files" error
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toBe('No analyzable files found for analysis');
      // Check the debug log from scanDir when readDir fails
      expect(mockLogger.debug).toHaveBeenCalledWith(`Failed to read directory: ${mockRootPath}`);
      expect(mockProgressIndicator.fail).toHaveBeenCalledWith(
        'No analyzable files found in the project'
      );
    });
  });
});
