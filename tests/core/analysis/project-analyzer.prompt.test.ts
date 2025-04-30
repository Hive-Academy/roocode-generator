/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { ProjectAnalyzer } from '../../../src/core/analysis/project-analyzer';
import { JsonSchemaHelper } from '../../../src/core/analysis/json-schema-helper';

describe('ProjectAnalyzer Prompt Tests', () => {
  let projectAnalyzer: ProjectAnalyzer;
  // Create dummy mocks for the 7 required constructor arguments
  const mockArg1 = {} as any;
  const mockArg2 = {} as any;
  const mockArg3 = {} as any;
  const mockArg4 = {} as any;
  const mockArg5 = {} as any;
  const mockArg6 = {} as any;
  const mockArg7 = {} as any;

  beforeEach(() => {
    projectAnalyzer = new ProjectAnalyzer(
      mockArg1,
      mockArg2,
      mockArg3,
      mockArg4,
      mockArg5,
      mockArg6,
      mockArg7
    );
  });

  describe('buildSystemPrompt', () => {
    it('should include partial analysis warning', () => {
      const prompt = (projectAnalyzer as any).buildSystemPrompt();
      expect(prompt).toContain('Analysis is based on partial codebase');
      expect(prompt).toContain('Focus only on provided files');
    });

    it('should include prompt version', () => {
      const prompt = (projectAnalyzer as any).buildSystemPrompt();
      expect(prompt).toMatch(/Prompt Version: v\d+\.\d+\.\d+/);
    });

    it('should include JSON schema validation instructions', () => {
      const prompt = (projectAnalyzer as any).buildSystemPrompt();
      expect(prompt).toContain('Response must strictly follow the JSON schema');
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
        },
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
        },
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
        expect(result.error.message).toMatch(/expected/);
      }
    });
  });
});

describe('Integration: ProjectAnalyzer with JsonSchemaHelper', () => {
  let projectAnalyzer: ProjectAnalyzer;
  let jsonSchemaHelper: JsonSchemaHelper;
  const mockArg1 = {} as any;
  const mockArg2 = {} as any;
  const mockArg3 = {} as any;
  const mockArg4 = {} as any;
  const mockArg5 = {} as any;
  const mockArg6 = {} as any;
  const mockArg7 = {} as any;

  beforeEach(() => {
    projectAnalyzer = new ProjectAnalyzer(
      mockArg1,
      mockArg2,
      mockArg3,
      mockArg4,
      mockArg5,
      mockArg6,
      mockArg7
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
      },
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
