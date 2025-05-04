 
/* eslint-disable @typescript-eslint/unbound-method */
import path from 'path'; // Added path import
import {
  FileMetadata,
  IFileContentCollector,
  IFilePrioritizer,
  ITreeSitterParserService, // Added TreeSitter service interface
} from '../../../src/core/analysis/interfaces'; // Added FileMetadata import
import { ProjectContext } from '../../../src/core/analysis/types'; // Import ProjectContext
import { ProjectAnalyzer } from '../../../src/core/analysis/project-analyzer';
import { ResponseParser } from '../../../src/core/analysis/response-parser';
import { IFileOperations } from '../../../src/core/file-operations/interfaces';
import { LLMAgent } from '../../../src/core/llm/llm-agent';
import { Result } from '../../../src/core/result/result';
import { ILogger } from '../../../src/core/services/logger-service';
import { ProgressIndicator } from '../../../src/core/ui/progress-indicator';

// Define a type for the metadata objects used frequently in tests
// type TestFileMetadata = { path: string; size: number }; // Removed unused type

// ** FIX: Define DeepPartial utility type **
type DeepPartial<T> = T extends object
  ? {
      [P in keyof T]?: DeepPartial<T[P]>;
    }
  : T;

// --- Describe Block for Analysis Result ---
describe('ProjectAnalyzer Analysis Result', () => {
  let projectAnalyzer: ProjectAnalyzer;
  let mockFileOps: jest.Mocked<IFileOperations>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockLLMAgent: jest.Mocked<LLMAgent>;
  let mockResponseParser: jest.Mocked<ResponseParser>;
  let mockProgress: jest.Mocked<ProgressIndicator>;
  let mockContentCollector: jest.Mocked<IFileContentCollector>;
  let mockFilePrioritizer: jest.Mocked<IFilePrioritizer>;
  let mockTreeSitterParserService: jest.Mocked<ITreeSitterParserService>; // Declare the mock variable

  const rootPath = 'root/path';
  // Mock LLM response that might contain outdated/different TS structure info
  const mockLlmResponseWithOldTsData = JSON.stringify({
    techStack: { languages: ['TypeScript'], frameworks: ['Node.js'] },
    structure: {
      rootDir: 'src',
      definedFunctions: {
        'src/utils.ts': [{ name: 'llmFormatDate' }], // Different name from TS mock
        'src/app.ts': [{ name: 'llmStartApp' }],
      },
      definedClasses: {
        'src/app.ts': [{ name: 'LlmApplication' }], // Different name from TS mock
      },
    },
    dependencies: {
      internalDependencies: {
        'src/app.ts': ['./utils'],
      },
      externalDependencies: ['express'],
    },
  });

  // Mock parsed result corresponding to the above LLM response
  const mockParsedResultWithOldTsData: DeepPartial<ProjectContext> = {
    // Use DeepPartial for flexibility
    techStack: { languages: ['TypeScript'], frameworks: ['Node.js'] },
    structure: {
      rootDir: 'src',
      definedFunctions: {
        'src/utils.ts': [{ name: 'llmFormatDate' }],
        'src/app.ts': [{ name: 'llmStartApp' }],
      },
      definedClasses: {
        'src/app.ts': [{ name: 'LlmApplication' }],
      },
    },
    dependencies: {
      internalDependencies: {
        'src/app.ts': ['./utils'],
      },
      // externalDependencies: ['express'], // Assuming this might come from package.json analysis later
    },
  };

  // Mock LLM response without any structure fields
  const mockLlmResponseWithoutStructure = JSON.stringify({
    techStack: { languages: ['JavaScript'] },
    // structure field is missing
    dependencies: { externalDependencies: ['lodash'] },
  });

  // Mock parsed result corresponding to the above LLM response
  const mockParsedResultWithoutStructure: DeepPartial<ProjectContext> = {
    techStack: { languages: ['JavaScript'] },
    // structure field is missing
    dependencies: {
      // externalDependencies: ['lodash'], // Assuming this might come from package.json analysis later
    },
  };

  beforeEach(() => {
    // Mocks for the 'Analysis Result' tests - Re-initialize fully
    mockFileOps = {
      writeFile: jest.fn(),
      createDirectory: jest.fn(),
      validatePath: jest.fn(),
      getFiles: jest.fn(),
      // Mock readDir and isDirectory for collectAnalyzableFiles
      readDir: jest.fn().mockImplementation((dirPath: string) => {
        if (dirPath === rootPath) return Result.ok(['src', 'package.json']); // Added package.json
        if (dirPath === path.join(rootPath, 'src')) return Result.ok(['app.ts', 'utils.ts']);
        return Result.ok([]);
      }),
      isDirectory: jest.fn().mockImplementation((filePath: string) => {
        if (filePath === path.join(rootPath, 'src')) return Result.ok(true);
        return Result.ok(false);
      }),
      // readFile will be overridden below
      readFile: jest.fn(), // Add placeholder
    } as any;

    mockLogger = {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as any;

    mockLLMAgent = {
      getModelContextWindow: jest.fn().mockResolvedValue(10000),
      countTokens: jest.fn().mockResolvedValue(10),
      getCompletion: jest.fn(), // Mocked per test
      getProvider: jest.fn().mockResolvedValue(
        Result.ok({
          getContextWindowSize: jest.fn().mockReturnValue(10000),
          countTokens: jest.fn().mockResolvedValue(10),
          getCompletion: jest.fn(),
        })
      ),
    } as any;

    mockResponseParser = {
      parseLlmResponse: jest.fn(), // Mocked per test
    } as any;

    mockProgress = {
      start: jest.fn(),
      update: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn(),
    } as any;

    mockContentCollector = {
      collectContent: jest.fn().mockResolvedValue(
        Result.ok({
          // Include package.json content if needed by tests
          content: 'package.json content\nsrc/app.ts content\nsrc/utils.ts content',
          metadata: [
            { path: path.join(rootPath, 'package.json'), size: 50 },
            { path: path.join(rootPath, 'src/app.ts'), size: 300 },
            { path: path.join(rootPath, 'src/utils.ts'), size: 400 },
          ],
        })
      ),
    } as unknown as jest.Mocked<IFileContentCollector>;

    mockFilePrioritizer = {
      prioritizeFiles: jest.fn().mockImplementation((metadata: FileMetadata[]) => metadata),
    } as unknown as jest.Mocked<IFilePrioritizer>;

    mockTreeSitterParserService = {
      parse: jest.fn(), // Will be mocked more specifically below
    } as any;

    // ** DEBUG: Add logging to parse mock **
    mockTreeSitterParserService.parse.mockImplementation((content, language) => {
      // Removed async
      console.log(`[DEBUG] mockTreeSitterParserService.parse called with language: ${language}`); // DEBUG LOG
      if (language === 'typescript') {
        console.log(`[DEBUG] Returning empty arrays for TS`); // DEBUG LOG
        return Result.ok({ functions: [], classes: [] });
      }
      // Mock JS parsing if needed, otherwise default
      if (language === 'javascript') {
        console.log(`[DEBUG] Returning default empty for JS`); // DEBUG LOG
        // Example: return Result.ok({ functions: [{name: 'jsFunc', ...}], classes: [] });
      }
      // Default for safety or other files not explicitly mocked here
      console.log(`[DEBUG] Returning default empty for other language: ${language}`); // DEBUG LOG
      return Result.ok({ functions: [], classes: [] }); // Return Result directly
    });

    // ** DEBUG: Add logging to readFile mock **
    // eslint-disable-next-line @typescript-eslint/require-await
    mockFileOps.readFile = jest.fn().mockImplementation(async (filePath: string) => {
      console.log(`[DEBUG] mockFileOps.readFile called with path: ${filePath}`); // DEBUG LOG
      if (filePath.endsWith('app.ts')) {
        console.log(`[DEBUG] Matched app.ts`); // DEBUG LOG
        return Result.ok('app.ts content');
      }
      if (filePath.endsWith('utils.ts')) {
        console.log(`[DEBUG] Matched utils.ts`); // DEBUG LOG
        return Result.ok('utils.ts content');
      }
      if (filePath.endsWith('package.json')) {
        console.log(`[DEBUG] Matched package.json`); // DEBUG LOG
        return Result.ok('package.json content'); // Handle package.json
      }
      // Use a more specific error for unexpected calls within this suite
      console.error(`[DEBUG] Unexpected readFile call: ${filePath}`); // DEBUG LOG
      return Result.err(
        new Error(`Unexpected readFile call in 'Analysis Result' suite: ${filePath}`)
      );
    });

    // Re-instantiate projectAnalyzer with mocks for this suite
    projectAnalyzer = new ProjectAnalyzer(
      mockFileOps,
      mockLogger,
      mockLLMAgent,
      mockResponseParser,
      mockProgress,
      mockContentCollector,
      mockFilePrioritizer,
      mockTreeSitterParserService
    );
  });

  it('should correctly merge Tree-sitter data (empty for TS), overriding LLM response', async () => {
    // LLM response still provides other data (techStack, etc.) and potentially outdated structure info
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok(mockLlmResponseWithOldTsData));
    // ResponseParser still parses the LLM response initially
    mockResponseParser.parseLlmResponse.mockReturnValue(
      Result.ok(mockParsedResultWithOldTsData as ProjectContext)
    ); // Cast for test

    const result = await projectAnalyzer.analyzeProject([rootPath]);

    expect(result.isOk()).toBe(true);
    const context = result.unwrap();

    // Check existing fields (basic check)
    expect(context.techStack.languages).toEqual(['TypeScript']);
    expect(context.structure.rootDir).toBe(rootPath); // Should use the provided root path

    // Check new fields - ASSERTING TREE-SITTER DATA (EMPTY FOR TS) OVERRIDES LLM DATA
    expect(context.structure.definedFunctions).toEqual({
      'src/app.ts': [], // Overwritten by TreeSitter mock
      'src/utils.ts': [], // Overwritten by TreeSitter mock
    });
    // ** FIX: Assertion for definedClasses should include utils.ts **
    expect(context.structure.definedClasses).toEqual({
      'src/app.ts': [], // Overwritten by TreeSitter mock
      'src/utils.ts': [], // Overwritten by TreeSitter mock
    });
    // Verify other LLM-derived data is preserved
    expect(context.dependencies.internalDependencies).toEqual({
      'src/app.ts': ['./utils'],
    });
  });

  it('should use Tree-sitter data (empty for TS) even if structure missing in LLM response', async () => {
    // LLM response doesn't contain the structure fields
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok(mockLlmResponseWithoutStructure));
    mockResponseParser.parseLlmResponse.mockReturnValue(
      Result.ok(mockParsedResultWithoutStructure as ProjectContext) // Cast for test
    );

    const result = await projectAnalyzer.analyzeProject([rootPath]);

    expect(result.isOk()).toBe(true);
    const context = result.unwrap();

    // Check existing fields
    expect(context.techStack.languages).toEqual(['JavaScript']);
    expect(context.structure.rootDir).toBe(rootPath); // Should use the provided root path

    // Check that Tree-sitter fields are populated correctly from the mock service
    expect(context.structure.definedFunctions).toEqual({
      'src/app.ts': [], // Populated by TreeSitter mock
      'src/utils.ts': [], // Populated by TreeSitter mock
    });
    // ** FIX: Assertion for definedClasses should include utils.ts **
    expect(context.structure.definedClasses).toEqual({
      'src/app.ts': [], // Populated by TreeSitter mock
      'src/utils.ts': [], // Populated by TreeSitter mock
    });
    // Verify other LLM-derived data is preserved (or defaults if missing)
    expect(context.dependencies.internalDependencies).toEqual({}); // Defaults correctly
  });

  it('should return error if LLM response generation fails', async () => {
    const error = new Error('LLM Error');
    mockLLMAgent.getCompletion.mockResolvedValue(Result.err(error));

    const result = await projectAnalyzer.analyzeProject([rootPath]);

    expect(result.isErr()).toBe(true);
    expect(result.error).toBe(error);
    // ** FIX: Corrected expected string **
    expect(mockProgress.fail).toHaveBeenCalledWith(
      expect.stringContaining('Project context analysis failed after multiple LLM attempts')
    );
  });

  it('should return error if LLM response parsing fails', async () => {
    const error = new Error('Parsing Error');
    mockLLMAgent.getCompletion.mockResolvedValue(Result.ok('invalid json'));
    mockResponseParser.parseLlmResponse.mockReturnValue(Result.err(error));

    const result = await projectAnalyzer.analyzeProject([rootPath]);

    expect(result.isErr()).toBe(true);
    expect(result.error).toBe(error);
    // ** FIX: Corrected expected string **
    expect(mockProgress.fail).toHaveBeenCalledWith(
      expect.stringContaining('Failed to parse analysis results from LLM')
    );
  });
});
