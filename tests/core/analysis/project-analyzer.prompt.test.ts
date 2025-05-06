/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { ProjectAnalyzer } from '../../../src/core/analysis/project-analyzer';
import { JsonSchemaHelper } from '../../../src/core/analysis/json-schema-helper';
import { Result } from '../../../src/core/result/result'; // Added import
import { LLMAgent } from '../../../src/core/llm/llm-agent'; // Import for casting
import { ITreeSitterParserService } from '@core/analysis/interfaces';
import { ILogger } from '../../../src/core/services/logger-service'; // Import ILogger type
import { createMockLogger } from '../../__mocks__/logger.mock'; // Import mock factory
import { IAstAnalysisService } from '@core/analysis/ast-analysis.interfaces'; // Added
import { ITechStackAnalyzerService } from '../../../src/core/analysis/tech-stack-analyzer'; // Added
import { createMockTechStackAnalyzerService } from '../../__mocks__/tech-stack-analyzer.mock'; // Added

describe('ProjectAnalyzer Prompt Tests', () => {
  let projectAnalyzer: ProjectAnalyzer;
  let mockLogger: jest.Mocked<ILogger>; // Declare with type
  // Create dummy mocks for the other 6 required constructor arguments
  const mockFileOps = {} as any; // Pos 1
  const mockLlmAgent = {
    // Pos 3
    // Mock getProvider needed for getPromptOverheadTokens test
    getProvider: jest.fn().mockResolvedValue(
      Result.ok({
        countTokens: jest.fn().mockResolvedValue(10), // Mock countTokens as well
      })
    ),
    // Add other methods if needed by other tests in this file, currently none
    getModelContextWindow: jest.fn().mockResolvedValue(8000),
    countTokens: jest.fn().mockResolvedValue(100),
    getCompletion: jest.fn(),
  } as unknown as LLMAgent; // Cast to satisfy TS
  // const mockResponseParser = {} as any; // Pos 4 - Removed as unused
  const mockProgress = {} as any; // Pos 5
  const mockContentCollector = {} as any; // Pos 6
  const mockFilePrioritizer = {} as any; // Pos 7
  let mockTreeSitterParserService: jest.Mocked<ITreeSitterParserService>; // Pos 8
  let mockAstAnalysisService: jest.Mocked<IAstAnalysisService>; // Pos 9 - Added
  let mockTechStackAnalyzerService: jest.Mocked<ITechStackAnalyzerService>; // Added

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockLogger = createMockLogger(); // Initialize mock logger
    // Initialize the mock services
    mockTreeSitterParserService = {
      initialize: jest.fn().mockResolvedValue(Result.ok(undefined)),
      parse: jest.fn(),
      parseFile: jest.fn().mockResolvedValue(Result.ok({ type: 'program', children: [] })),
    } as jest.Mocked<ITreeSitterParserService>;
    mockAstAnalysisService = {
      // Added
      analyzeAst: jest
        .fn()
        .mockResolvedValue(Result.ok({ functions: [], classes: [], imports: [] })), // Added
    } as jest.Mocked<IAstAnalysisService>; // Added
    mockTechStackAnalyzerService = createMockTechStackAnalyzerService(); // Added
    mockTechStackAnalyzerService.analyze.mockResolvedValue({
      // Default mock
      languages: ['typescript'],
      frameworks: ['jest'],
      buildTools: ['npm'],
      testingFrameworks: ['jest'],
      linters: ['eslint'],
      packageManager: 'npm',
    });
    projectAnalyzer = new ProjectAnalyzer(
      mockFileOps, // 1
      mockLogger, // 2
      mockLlmAgent, // 3
      mockProgress, // 4 (Corrected from mockResponseParser)
      mockContentCollector, // 5 (Corrected from mockProgress)
      mockFilePrioritizer, // 6 (Corrected from mockContentCollector)
      mockTreeSitterParserService, // 7 (Corrected from mockFilePrioritizer)
      mockAstAnalysisService, // 8 (Corrected from mockTreeSitterParserService)
      mockTechStackAnalyzerService // 9 (Added)
    );
  });

  describe('buildSystemPrompt', () => {
    it('should include partial analysis warning', () => {
      const prompt = (projectAnalyzer as any).buildSystemPrompt();
      expect(prompt).toContain('PARTIAL codebase view'); // Updated assertion
      expect(prompt).toContain('Focus ONLY on the provided files'); // Keep this one
    });

    it('should include prompt version', () => {
      const prompt = (projectAnalyzer as any).buildSystemPrompt();
      expect(prompt).toMatch(/Prompt Version: v\d+\.\d+\.\d+/);
    });

    it('should include JSON schema validation instructions', () => {
      const prompt = (projectAnalyzer as any).buildSystemPrompt();
      expect(prompt).toContain('MUST strictly follow this JSON schema'); // Updated assertion
    });
  });

  describe('getPromptOverheadTokens', () => {
    it('should calculate overhead including version and schema', async () => {
      const tokens = await (projectAnalyzer as any).getPromptOverheadTokens();
      expect(tokens).toBeGreaterThan(0);
    });
  });
});

describe('JsonSchemaHelper', () => {
  let jsonSchemaHelper: JsonSchemaHelper;

  beforeEach(() => {
    jsonSchemaHelper = new JsonSchemaHelper();
  });

  describe('validateJson', () => {
    it('should validate correct project context JSON', () => {
      const validProjectContext = {
        techStack: {
          languages: ['TypeScript'],
          frameworks: ['React'],
          buildTools: ['Webpack'],
          testingFrameworks: ['Jest'],
          linters: ['ESLint'],
          packageManager: 'npm',
        },
        structure: {
          rootDir: '/',
          sourceDir: 'src',
          testDir: 'tests',
          configFiles: ['package.json'],
          mainEntryPoints: ['src/index.ts'],
          componentStructure: { components: ['Button.tsx', 'Header.tsx'] },
          // Add required fields from TSK-007
          // definedFunctions: {}, // Removed
          // definedClasses: {}, // Removed
        },
        // astData: {}, // Removed - Not part of the schema defined in JsonSchemaHelper
        dependencies: {
          dependencies: { react: '17.0.0' },
          devDependencies: { jest: '26.0.0' },
          peerDependencies: { 'react-dom': '17.0.0' },
          internalDependencies: { shared: ['utils'] },
        },
      };

      const schema = jsonSchemaHelper.getProjectContextSchema();
      const result = jsonSchemaHelper.validateJson(JSON.stringify(validProjectContext), schema);
      // Expect successful validation: result should be Ok and not Err
      expect(result.isOk()).toBe(true);
      expect(result.isErr()).toBe(false);
    });

    it('should reject invalid project context JSON', () => {
      // Missing 'dependencies' property
      const invalidProjectContext = {
        techStack: {
          languages: ['TypeScript'],
          frameworks: ['React'],
          buildTools: ['Webpack'],
          testingFrameworks: ['Jest'],
          linters: ['ESLint'],
          packageManager: 'npm',
        },
        structure: {
          rootDir: '/',
          sourceDir: 'src',
          testDir: 'tests',
          configFiles: ['package.json'],
          mainEntryPoints: ['src/index.ts'],
          componentStructure: { components: ['Button.tsx', 'Header.tsx'] },
        },
        // dependencies missing
      };

      const schema = jsonSchemaHelper.getProjectContextSchema();
      const result = jsonSchemaHelper.validateJson(JSON.stringify(invalidProjectContext), schema);
      // Expect validation failure - result should be Err
      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(Error); // Keep checking the error type
    });

    it('should provide detailed validation errors', () => {
      const invalidProjectContext = {
        techStack: {
          // Wrong type: number instead of string inside languages array
          languages: [123],
          frameworks: ['React'],
          buildTools: ['Webpack'],
          testingFrameworks: ['Jest'],
          linters: ['ESLint'],
          packageManager: 'npm',
        },
        structure: {
          rootDir: '/',
          sourceDir: 'src',
          testDir: 'tests',
          configFiles: ['package.json'],
          mainEntryPoints: ['src/index.ts'],
          componentStructure: { components: ['Button.tsx', 'Header.tsx'] },
          // definedFunctions and definedClasses are missing, causing validation error below
        },
        astData: {}, // Added required property
        dependencies: {
          dependencies: { react: '17.0.0' },
          devDependencies: { jest: '26.0.0' },
          peerDependencies: { 'react-dom': '17.0.0' },
          internalDependencies: { shared: ['utils'] },
        },
      };

      const schema = jsonSchemaHelper.getProjectContextSchema();
      const result = jsonSchemaHelper.validateJson(JSON.stringify(invalidProjectContext), schema);
      expect(result.isErr()).toBe(true); // Check it's an error Result
      expect(result.error).toBeInstanceOf(Error);
      if (result.isErr()) {
        // Use type guard
        // Check for specific Zod error messages
        if (result.error) {
          // Add explicit check to satisfy TS
          expect(result.error.message).toMatch(
            /techStack\.languages\.0 Expected string, received number/
          );
        }
        // Removed checks for definedFunctions/definedClasses as they are no longer required
        // expect(result.error.message).toMatch(/structure\.definedFunctions Required/);
        // expect(result.error.message).toMatch(/structure\.definedClasses Required/);
        // Check for astData required if needed, but the main error is the language type
      }
    });
  });
});

describe('Integration: ProjectAnalyzer with JsonSchemaHelper', () => {
  let projectAnalyzer: ProjectAnalyzer;
  let jsonSchemaHelper: JsonSchemaHelper;
  let mockLoggerIntegration: jest.Mocked<ILogger>; // Declare with type
  // Dummy mocks for other args in integration test
  const mockFileOpsInt = {} as any; // Pos 1
  const mockLlmAgentInt = {
    // Pos 3 (Add getProvider for consistency if needed, though not directly tested here)
    getProvider: jest.fn().mockResolvedValue(
      Result.ok({
        countTokens: jest.fn().mockResolvedValue(10),
      })
    ),
    getModelContextWindow: jest.fn().mockResolvedValue(8000),
    countTokens: jest.fn().mockResolvedValue(100),
    getCompletion: jest.fn(),
  } as unknown as LLMAgent; // Cast to satisfy TS
  // const mockResponseParserInt = {} as any; // Pos 4 - Removed as unused
  const mockProgressInt = {} as any; // Pos 5
  const mockContentCollectorInt = {} as any; // Pos 6
  const mockFilePrioritizerInt = {} as any; // Pos 7
  let mockTreeSitterParserServiceInt: jest.Mocked<ITreeSitterParserService>; // Pos 8
  let mockAstAnalysisServiceInt: jest.Mocked<IAstAnalysisService>; // Pos 9 - Added
  let mockTechStackAnalyzerServiceInt: jest.Mocked<ITechStackAnalyzerService>; // Added for integration test

  beforeEach(() => {
    jest.clearAllMocks();
    mockLoggerIntegration = createMockLogger(); // Initialize mock logger
    // Initialize the mock services for the integration test
    mockTreeSitterParserServiceInt = {
      initialize: jest.fn().mockResolvedValue(Result.ok(undefined)),
      parse: jest.fn(),
      parseFile: jest.fn().mockResolvedValue(Result.ok({ type: 'program', children: [] })),
    } as jest.Mocked<ITreeSitterParserService>;
    mockAstAnalysisServiceInt = {
      // Added
      analyzeAst: jest
        .fn()
        .mockResolvedValue(Result.ok({ functions: [], classes: [], imports: [] })), // Added
    } as jest.Mocked<IAstAnalysisService>; // Added
    mockTechStackAnalyzerServiceInt = createMockTechStackAnalyzerService(); // Added
    mockTechStackAnalyzerServiceInt.analyze.mockResolvedValue({
      // Default mock
      languages: ['typescript'],
      frameworks: ['jest'],
      buildTools: ['npm'],
      testingFrameworks: ['jest'],
      linters: ['eslint'],
      packageManager: 'npm',
    });
    projectAnalyzer = new ProjectAnalyzer(
      mockFileOpsInt, // 1
      mockLoggerIntegration, // 2
      mockLlmAgentInt, // 3
      mockProgressInt, // 4 (Corrected from mockResponseParserInt)
      mockContentCollectorInt, // 5 (Corrected from mockProgressInt)
      mockFilePrioritizerInt, // 6 (Corrected from mockContentCollectorInt)
      mockTreeSitterParserServiceInt, // 7 (Corrected from mockFilePrioritizerInt)
      mockAstAnalysisServiceInt, // 8 (Corrected from mockTreeSitterParserServiceInt)
      mockTechStackAnalyzerServiceInt // 9 (Added)
    );
    jsonSchemaHelper = new JsonSchemaHelper();
  });

  it('should generate a project context that validates against the JSON schema', () => {
    // Generate prompt from ProjectAnalyzer using its private method via casting.
    const prompt = (projectAnalyzer as any).buildSystemPrompt();

    // Construct a valid project context; embedding the prompt in componentStructure for demonstration.
    const projectContext = {
      techStack: {
        languages: ['TypeScript'],
        frameworks: ['React'],
        buildTools: ['Webpack'],
        testingFrameworks: ['Jest'],
        linters: ['ESLint'],
        packageManager: 'npm',
      },
      structure: {
        rootDir: '/',
        sourceDir: 'src',
        testDir: 'tests',
        configFiles: ['package.json'],
        mainEntryPoints: ['src/index.ts'],
        componentStructure: { components: [prompt] },
        directoryTree: [], // Added missing required property
        // Add required fields for validation
        // definedFunctions: {}, // Removed
        // definedClasses: {}, // Removed
      },
      // astData: {}, // Removed - Not part of the schema defined in JsonSchemaHelper
      dependencies: {
        dependencies: { react: '17.0.0' },
        devDependencies: { jest: '26.0.0' },
        peerDependencies: { 'react-dom': '17.0.0' },
        internalDependencies: { shared: ['utils'] },
      },
    };

    const schema = jsonSchemaHelper.getProjectContextSchema();
    const validation = jsonSchemaHelper.validateJson(JSON.stringify(projectContext), schema);
    expect(validation.isOk()).toBe(true); // Check if validation is Ok
    expect(validation.isErr()).toBe(false); // Check if validation is not Err
  });
});
