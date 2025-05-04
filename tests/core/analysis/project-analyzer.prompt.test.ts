/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { ProjectAnalyzer } from '../../../src/core/analysis/project-analyzer';
import { JsonSchemaHelper } from '../../../src/core/analysis/json-schema-helper';
import { Result } from '../../../src/core/result/result'; // Added import
import { LLMAgent } from '../../../src/core/llm/llm-agent'; // Import for casting
import { ITreeSitterParserService } from '@core/analysis/interfaces'; // Import the missing interface

describe('ProjectAnalyzer Prompt Tests', () => {
  let projectAnalyzer: ProjectAnalyzer;
  // Mock logger
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
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
  const mockResponseParser = {} as any; // Pos 4
  const mockProgress = {} as any; // Pos 5
  const mockContentCollector = {} as any; // Pos 6
  const mockFilePrioritizer = {} as any; // Pos 7
  let mockTreeSitterParserService: jest.Mocked<ITreeSitterParserService>; // Pos 8 - Declare mock

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    // Initialize the mock service
    mockTreeSitterParserService = {
      parse: jest.fn().mockResolvedValue(Result.ok({ functions: [], classes: [] })), // Default mock
    } as any;
    projectAnalyzer = new ProjectAnalyzer(
      mockFileOps,
      mockLogger, // Pos 2
      mockLlmAgent,
      mockResponseParser,
      mockProgress,
      mockContentCollector,
      mockFilePrioritizer,
      mockTreeSitterParserService // Pass the mock service
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
        astData: {}, // Added required property
        dependencies: {
          dependencies: { react: '17.0.0' },
          devDependencies: { jest: '26.0.0' },
          peerDependencies: { 'react-dom': '17.0.0' },
          internalDependencies: { shared: ['utils'] },
        },
      };

      const schema = jsonSchemaHelper.getProjectContextSchema();
      const result = jsonSchemaHelper.validateJson(JSON.stringify(validProjectContext), schema);
      // Expect successful validation: result should have a 'value' property with true and no 'error'
      expect(result.value).toBe(true);
      expect(result.error).toBeUndefined();
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
      // Expect validation failure - error should be present
      expect(result.error).toBeInstanceOf(Error);
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
      expect(result.error).toBeInstanceOf(Error);
      if (result.error) {
        // Check for specific Zod error messages
        expect(result.error.message).toMatch(
          /techStack\.languages\.0 Expected string, received number/
        );
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
  // Mock logger for integration test setup
  const mockLoggerIntegration = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
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
  const mockResponseParserInt = {} as any; // Pos 4
  const mockProgressInt = {} as any; // Pos 5
  const mockContentCollectorInt = {} as any; // Pos 6
  const mockFilePrioritizerInt = {} as any; // Pos 7
  let mockTreeSitterParserServiceInt: jest.Mocked<ITreeSitterParserService>; // Pos 8 - Declare mock

  beforeEach(() => {
    jest.clearAllMocks();
    // Initialize the mock service for the integration test
    mockTreeSitterParserServiceInt = {
      parse: jest.fn().mockResolvedValue(Result.ok({ functions: [], classes: [] })), // Default mock
    } as any;
    projectAnalyzer = new ProjectAnalyzer(
      mockFileOpsInt,
      mockLoggerIntegration, // Pos 2
      mockLlmAgentInt,
      mockResponseParserInt,
      mockProgressInt,
      mockContentCollectorInt,
      mockFilePrioritizerInt,
      mockTreeSitterParserServiceInt // Pass the mock service
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
        // Add required fields for validation
        // definedFunctions: {}, // Removed
        // definedClasses: {}, // Removed
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
    const validation = jsonSchemaHelper.validateJson(JSON.stringify(projectContext), schema);
    expect(validation.value).toBe(true);
    expect(validation.error).toBeUndefined();
  });
});
