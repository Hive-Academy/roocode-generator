import {
  createMockProjectAnalyzer,
  MockProjectAnalyzer,
} from 'tests/__mocks__/project-analyzer.mock';
import { JsonSchemaHelper } from '../../../src/core/analysis/json-schema-helper';
import { ITechStackAnalyzerService } from '../../../src/core/analysis/tech-stack-analyzer'; // Added
import { createMockTechStackAnalyzerService } from '../../__mocks__/tech-stack-analyzer.mock'; // Added

describe('ProjectAnalyzer Prompt Tests', () => {
  let projectAnalyzer: MockProjectAnalyzer;
  let mockTechStackAnalyzerService: jest.Mocked<ITechStackAnalyzerService>; // Added

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

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
    projectAnalyzer = createMockProjectAnalyzer();

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
    let projectAnalyzer: MockProjectAnalyzer;
    let jsonSchemaHelper: JsonSchemaHelper;

    beforeEach(() => {
      jest.clearAllMocks();
      jsonSchemaHelper = new JsonSchemaHelper(); // Initialize JsonSchemaHelper
      projectAnalyzer = createMockProjectAnalyzer();
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
});
