/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/unbound-method */
// tests/generators/rules-generator.test.ts
import { Result } from '../../src/core/result/result';
import { DIError } from '../../src/core/di/errors';
import {
  IProjectAnalyzer,
  ProjectContext,
  TechStackAnalysis,
  ProjectStructure,
  DependencyGraph,
} from '../../src/core/analysis/types';
import { IServiceContainer } from '../../src/core/di/interfaces';
import { ServiceToken } from '../../src/core/di/types'; // Import ServiceToken
import { IFileOperations } from '../../src/core/file-operations/interfaces';
import { LLMAgent } from '../../src/core/llm/llm-agent';
import { ILogger } from '../../src/core/services/logger-service';
import { IRulesContentProcessor, IRulesFileManager } from '../../src/generators/rules/interfaces';
import { RulesGenerator } from '../../src/generators/rules/rules-generator';
import { ProgressIndicator } from '../../src/core/ui/progress-indicator';
import { mock, MockProxy } from 'jest-mock-extended';
import path from 'path';
import { ProjectConfig } from '../../types/shared'; // Import ProjectConfig

// Mock the ProgressIndicator module
jest.mock('../../src/core/ui/progress-indicator', () => {
  return {
    ProgressIndicator: jest.fn().mockImplementation(() => {
      return {
        start: jest.fn(),
        succeed: jest.fn(),
        fail: jest.fn(),
        set text(value: string) {
          /* no-op */
        },
      };
    }),
  };
});

describe('RulesGenerator', () => {
  let rulesGenerator: RulesGenerator;
  let mockLogger: MockProxy<ILogger>;
  let mockFileOps: MockProxy<IFileOperations>; // Kept for potential future use or if BaseGenerator needs it implicitly
  let mockProjectAnalyzer: MockProxy<IProjectAnalyzer>;
  let mockLLMAgent: MockProxy<LLMAgent>;
  let mockContentProcessor: MockProxy<IRulesContentProcessor>;
  let mockRulesFileManager: MockProxy<IRulesFileManager>; // Added mock
  let mockServiceContainer: MockProxy<IServiceContainer>;
  let mockProgressIndicator: MockProxy<ProgressIndicator>;

  // Updated mockProjectContext with all required fields
  const mockProjectContext: ProjectContext = {
    techStack: {
      languages: ['TypeScript'],
      frameworks: ['React'],
      tools: ['Jest'],
      buildTools: ['Webpack'], // Added
      testingFrameworks: ['Jest'], // Added
      linters: ['ESLint'], // Added
      packageManager: 'npm', // Added
    } as TechStackAnalysis,
    structure: {
      files: ['src/index.ts'],
      directories: ['src'],
      rootDir: '/mock/project', // Added
      sourceDir: 'src', // Added
      testDir: 'tests', // Added
      configFiles: ['tsconfig.json'], // Added
      mainEntryPoints: ['src/index.ts'], // Added
      componentStructure: {}, // Added
    } as ProjectStructure,
    dependencies: {
      nodes: [],
      links: [],
      dependencies: { react: '^18.0.0' }, // Added
      devDependencies: { jest: '^29.0.0' }, // Added
      peerDependencies: {}, // Added
      internalDependencies: {}, // Added
    } as DependencyGraph,
  };
  // Corrected mockConfig field name and added required fields
  const mockConfig: ProjectConfig = {
    name: 'test-project',
    rootDir: '.',
    baseDir: 'src',
    generators: ['rules'],
  };
  const contextPaths = ['.'];
  const expectedOutputPath = path.join('.roo', 'rules-code', 'rules.md');

  beforeEach(() => {
    mockLogger = mock<ILogger>();
    mockFileOps = mock<IFileOperations>();
    mockProjectAnalyzer = mock<IProjectAnalyzer>();
    mockLLMAgent = mock<LLMAgent>();
    mockContentProcessor = mock<IRulesContentProcessor>();
    mockRulesFileManager = mock<IRulesFileManager>(); // Instantiate mock
    mockServiceContainer = mock<IServiceContainer>();
    mockProgressIndicator = mock<ProgressIndicator>();

    // Configure the mock container to return the mocked ProgressIndicator
    // Removed problematic .calledWith()
    // Adjusted mockImplementation signature
    mockServiceContainer.resolve.mockImplementation(
      <T>(token: ServiceToken): Result<T, DIError> => {
        if (token === 'ProgressIndicator') {
          // Use string token
          // Cast specifically for this case
          return Result.ok(mockProgressIndicator as unknown as T);
        }
        // Handle other tokens - return an error Result
        const error = new DIError(
          `Mock does not handle resolution for token: ${token?.toString() ?? 'undefined'}`,
          'MOCK_RESOLUTION_FAILURE'
        );
        // Cast error result to match generic signature
        return Result.err(error) as Result<T, DIError>;
      }
    );

    // Instantiate with all mocks, using type assertions
    rulesGenerator = new RulesGenerator(
      mockServiceContainer as IServiceContainer,
      mockLogger as ILogger,
      mockFileOps as IFileOperations, // Still passing fileOps
      mockProjectAnalyzer as IProjectAnalyzer,
      mockLLMAgent as LLMAgent,
      mockContentProcessor as IRulesContentProcessor,
      mockRulesFileManager as IRulesFileManager // Pass new mock
    );
  });

  // --- Validation Tests ---
  describe('validate', () => {
    it('should validate dependencies successfully', async () => {
      const result = await rulesGenerator.validate();
      expect(result.isOk()).toBe(true);
    });
  });

  describe('validateDependencies', () => {
    it('should return success when all dependencies are present', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (rulesGenerator as any).validateDependencies();
      expect(result.isOk()).toBe(true);
    });

    it('should return error when a dependency is missing', () => {
      // Create a generator missing a dependency (e.g., rulesFileManager)
      const incompleteGenerator = new RulesGenerator(
        mockServiceContainer as IServiceContainer,
        mockLogger as ILogger,
        mockFileOps as IFileOperations,
        mockProjectAnalyzer as IProjectAnalyzer,
        mockLLMAgent as LLMAgent,
        mockContentProcessor as IRulesContentProcessor,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        null as any // Missing rulesFileManager - Intentionally null for test
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (incompleteGenerator as any).validateDependencies();
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('missing required dependencies');
    });
  });

  // --- Core Execution Tests ---
  describe('executeGeneration', () => {
    beforeEach(() => {
      // Common setup: Mock successful analysis and content processing by default
      mockProjectAnalyzer.analyzeTechStack.mockResolvedValue(
        Result.ok(mockProjectContext.techStack)
      );
      mockProjectAnalyzer.analyzeProjectStructure.mockResolvedValue(
        Result.ok(mockProjectContext.structure)
      );
      mockProjectAnalyzer.analyzeDependencies.mockResolvedValue(
        Result.ok(mockProjectContext.dependencies)
      );

      // Mock LLM and content processor for generateRulesContent internal calls
      mockLLMAgent.getCompletion.mockResolvedValue(Result.ok('LLM Content for section'));
      mockContentProcessor.stripMarkdownCodeBlock.mockImplementation((content) =>
        Result.ok(content)
      ); // Simple pass-through

      // Mock successful file saving
      mockRulesFileManager.saveRules.mockResolvedValue(Result.ok(expectedOutputPath));
    });

    it('should successfully analyze, generate content, and save the rules file', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (rulesGenerator as any).executeGeneration(mockConfig, contextPaths);

      expect(result.isOk()).toBe(true);
      expect(result.value).toBe(expectedOutputPath);

      // Verify analysis was called
      expect(mockProjectAnalyzer.analyzeTechStack).toHaveBeenCalledWith(contextPaths);
      expect(mockProjectAnalyzer.analyzeProjectStructure).toHaveBeenCalledWith(contextPaths);
      expect(mockProjectAnalyzer.analyzeDependencies).toHaveBeenCalledWith(contextPaths);

      // Verify LLM was called (at least once, for the first section)
      expect(mockLLMAgent.getCompletion).toHaveBeenCalled();

      // Verify saving was called with the correct path and non-empty content
      expect(mockRulesFileManager.saveRules).toHaveBeenCalledWith(
        expectedOutputPath,
        expect.stringContaining('## Code Style and Formatting') // Check for expected content structure
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        `Successfully generated rules file: ${expectedOutputPath}`
      );
    });

    it('should return error if project analysis fails', async () => {
      const analysisError = new Error('Analysis Failed');
      mockProjectAnalyzer.analyzeTechStack.mockResolvedValue(Result.err(analysisError)); // Simulate failure

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (rulesGenerator as any).executeGeneration(mockConfig, contextPaths);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(analysisError);
      expect(mockLLMAgent.getCompletion).not.toHaveBeenCalled();
      expect(mockRulesFileManager.saveRules).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Rules generation process failed',
        expect.any(Error)
      ); // Check for general failure log
    });

    it('should return error if content generation fails (e.g., LLM error)', async () => {
      const contentGenError = new Error('LLM Failed');
      mockLLMAgent.getCompletion.mockResolvedValue(Result.err(contentGenError)); // Simulate LLM failure

      // Need to call the public generate method which calls executeGeneration
      const result = await rulesGenerator.generate(mockConfig, contextPaths); // Use public API

      expect(result.isErr()).toBe(true);
      // The error might be wrapped, check the message
      expect(result.error?.message).toContain('Rules generation failed');
      expect(mockRulesFileManager.saveRules).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('LLM generation failed'),
        expect.any(String)
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Rules generation process failed',
        expect.any(Error)
      );
    });

    it('should return error if saving the file fails', async () => {
      const saveError = new Error('Save Failed');
      mockRulesFileManager.saveRules.mockResolvedValue(Result.err(saveError)); // Simulate save failure

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (rulesGenerator as any).executeGeneration(mockConfig, contextPaths);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(saveError); // Should propagate the specific save error
      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to save aggregated rules file: ${saveError.message}`
      );
    });

    it('should return error if no context path is provided', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (rulesGenerator as any).executeGeneration(mockConfig, []); // Empty contextPaths

      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('No context path provided');
      expect(mockProjectAnalyzer.analyzeTechStack).not.toHaveBeenCalled();
      expect(mockRulesFileManager.saveRules).not.toHaveBeenCalled();
    });
  });

  // --- Internal Method Tests ---

  describe('analyzeProject', () => {
    it('should return combined project context on successful analysis', async () => {
      mockProjectAnalyzer.analyzeTechStack.mockResolvedValue(
        Result.ok(mockProjectContext.techStack)
      );
      mockProjectAnalyzer.analyzeProjectStructure.mockResolvedValue(
        Result.ok(mockProjectContext.structure)
      );
      mockProjectAnalyzer.analyzeDependencies.mockResolvedValue(
        Result.ok(mockProjectContext.dependencies)
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (rulesGenerator as any).analyzeProject(contextPaths);

      expect(result.isOk()).toBe(true);
      expect(result.value).toEqual(mockProjectContext);
    });

    it('should return error if tech stack analysis fails', async () => {
      const error = new Error('Tech stack failed');
      mockProjectAnalyzer.analyzeTechStack.mockResolvedValue(Result.err(error));
      mockProjectAnalyzer.analyzeProjectStructure.mockResolvedValue(
        Result.ok(mockProjectContext.structure)
      );
      mockProjectAnalyzer.analyzeDependencies.mockResolvedValue(
        Result.ok(mockProjectContext.dependencies)
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (rulesGenerator as any).analyzeProject(contextPaths);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(error);
    });

    it('should return error if structure analysis fails', async () => {
      const error = new Error('Structure failed');
      mockProjectAnalyzer.analyzeTechStack.mockResolvedValue(
        Result.ok(mockProjectContext.techStack)
      );
      mockProjectAnalyzer.analyzeProjectStructure.mockResolvedValue(Result.err(error));
      mockProjectAnalyzer.analyzeDependencies.mockResolvedValue(
        Result.ok(mockProjectContext.dependencies)
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (rulesGenerator as any).analyzeProject(contextPaths);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(error);
    });

    it('should return error if dependency analysis fails', async () => {
      const error = new Error('Dependencies failed');
      mockProjectAnalyzer.analyzeTechStack.mockResolvedValue(
        Result.ok(mockProjectContext.techStack)
      );
      mockProjectAnalyzer.analyzeProjectStructure.mockResolvedValue(
        Result.ok(mockProjectContext.structure)
      );
      mockProjectAnalyzer.analyzeDependencies.mockResolvedValue(Result.err(error));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (rulesGenerator as any).analyzeProject(contextPaths);

      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(error);
    });
  });

  describe('generateRulesContent', () => {
    beforeEach(() => {
      // Mock successful LLM and processing by default (removed unnecessary async)
      // Updated mock signature and return types
      mockLLMAgent.getCompletion.mockImplementation(
        async (systemPrompt: string, _userPrompt: string): Promise<Result<string, Error>> => {
          if (systemPrompt.includes('code-style-and-formatting'))
            return Promise.resolve(Result.ok('Style Content'));
          if (systemPrompt.includes('project-structure'))
            return Promise.resolve(Result.ok('Structure Content'));
          if (systemPrompt.includes('naming-conventions'))
            return Promise.resolve(Result.ok('Naming Content'));
          if (systemPrompt.includes('dependency-management'))
            return Promise.resolve(Result.ok('Dependency Content'));
          if (systemPrompt.includes('programming-language-best-practices'))
            return Promise.resolve(Result.ok('Practices Content')); // Wrap in Promise.resolve
          return Promise.resolve(Result.ok('Default LLM Content')); // Wrap in Promise.resolve
        }
      );
      mockContentProcessor.stripMarkdownCodeBlock.mockImplementation((content) =>
        Result.ok(content)
      );
    });

    it('should aggregate content from all sections with correct headers', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (rulesGenerator as any).generateRulesContent(mockProjectContext);

      expect(result.isOk()).toBe(true);
      const content = result.value;
      expect(content).toContain('## Code Style and Formatting\n\nStyle Content');
      expect(content).toContain('## Project Structure\n\nStructure Content');
      expect(content).toContain('## Naming Conventions\n\nNaming Content');
      expect(content).toContain('## Dependency Management\n\nDependency Content');
      expect(content).toContain('## Programming Language Best Practices\n\nPractices Content');
      expect(mockLLMAgent.getCompletion).toHaveBeenCalledTimes(5); // Called for each section
      expect(mockContentProcessor.stripMarkdownCodeBlock).toHaveBeenCalledTimes(5);
    });

    it('should use fallback template if LLM fails for a section', async () => {
      // Simulate LLM failure for one section (removed unnecessary async)
      // Updated mock signature and return types
      mockLLMAgent.getCompletion.mockImplementation(
        async (systemPrompt: string, _userPrompt: string): Promise<Result<string, Error>> => {
          if (systemPrompt.includes('project-structure'))
            return Promise.resolve(Result.err(new Error('LLM Timeout'))); // Wrap in Promise.resolve
          return Promise.resolve(Result.ok('LLM Content')); // Wrap in Promise.resolve
        }
      );
      // Spy on the template generation method (assuming it's accessible or mockable)
      // Since generateCodingStandards is private, we check the output contains its content
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const codingStandardsContent = (rulesGenerator as any).generateCodingStandards();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (rulesGenerator as any).generateRulesContent(mockProjectContext);

      expect(result.isOk()).toBe(true);
      const content = result.value;
      expect(content).toContain('## Code Style and Formatting\n\nLLM Content'); // Success
      expect(content).toContain('## Project Structure\n\n' + codingStandardsContent); // Fallback (assuming 'project-structure' falls back to coding standards template) - Adjust if fallback is different
      expect(content).toContain('## Naming Conventions\n\nLLM Content'); // Success
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('LLM generation failed for project-structure'),
        expect.any(String)
      );
    });

    it('should handle errors during content processing gracefully', async () => {
      const stripError = new Error('Strip failed');
      mockContentProcessor.stripMarkdownCodeBlock.mockImplementation((content) => {
        if (content === 'Structure Content') return Result.err(stripError); // Fail for one section
        return Result.ok(content);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (rulesGenerator as any).generateRulesContent(mockProjectContext);

      expect(result.isOk()).toBe(true);
      const content = result.value;
      expect(content).toContain('## Code Style and Formatting\n\nStyle Content'); // Processed ok
      expect(content).toContain('## Project Structure\n\nStructure Content'); // Original content used on strip failure
      expect(content).toContain('## Naming Conventions\n\nNaming Content'); // Processed ok
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to strip markdown block from project-structure'),
        stripError.message
      );
    });

    it('should add error placeholder if an unexpected error occurs during section processing', async () => {
      const unexpectedError = new Error('Unexpected processing error');
      // Removed unnecessary async, handle potential throw
      // Updated mock signature and return types
      mockLLMAgent.getCompletion.mockImplementation(
        async (systemPrompt: string, _userPrompt: string): Promise<Result<string, Error>> => {
          if (systemPrompt.includes('naming-conventions')) {
            // Simulate async rejection for thrown error
            throw unexpectedError;
          }
          return Promise.resolve(Result.ok('LLM Content')); // Wrap in Promise.resolve
        }
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await (rulesGenerator as any).generateRulesContent(mockProjectContext);

      expect(result.isOk()).toBe(true); // generateRulesContent itself should succeed
      const content = result.value;
      expect(content).toContain('## Code Style and Formatting\n\nLLM Content');
      expect(content).toContain(
        '## Naming Conventions\n\nError generating content for this section.'
      ); // Error placeholder added
      expect(content).toContain('## Dependency Management\n\nLLM Content');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error processing section naming-conventions',
        unexpectedError
      );
    });
  });

  // --- Helper Method Tests (Kept from original) ---
  describe('trimIntroduction', () => {
    it('should remove common introductory text', () => {
      const content =
        'Okay, here are comprehensive coding rules and standards for your project.\n\n## Section 1\nContent';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (rulesGenerator as any).trimIntroduction(content);
      expect(result).toBe('## Section 1\nContent');
    });

    it('should handle content without introductory text', () => {
      const content = '## Section 1\nContent';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (rulesGenerator as any).trimIntroduction(content);
      expect(result).toBe('## Section 1\nContent');
    });
  });

  describe('limitContentSize', () => {
    it('should not modify content under 250 lines', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (rulesGenerator as any).limitContentSize(content);
      expect(result).toBe(content);
    });

    it('should trim content over 250 lines', () => {
      const lines = Array.from({ length: 300 }, (_, i) => `Line ${i + 1}`);
      const content = lines.join('\n');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (rulesGenerator as any).limitContentSize(content);
      const resultLines = result.split('\n');
      expect(resultLines.length).toBeLessThanOrEqual(250);
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Trimming content'));
    });
  });
});
