 
// tests/generators/rules-generator.integration.test.ts
import { Container } from '../../src/core/di/container';
import { IServiceContainer } from '../../src/core/di/interfaces';
import { ILogger } from '../../src/core/services/logger-service';
import { IFileOperations } from '../../src/core/file-operations/interfaces';
import {
  IProjectAnalyzer,
  ProjectContext,
  TechStackAnalysis,
  ProjectStructure,
  DependencyGraph,
} from '../../src/core/analysis/types';
import { LLMAgent } from '../../src/core/llm/llm-agent';
import { IRulesContentProcessor, IRulesFileManager } from '../../src/generators/rules/interfaces';
import { RulesGenerator } from '../../src/generators/rules/rules-generator';
import { RulesFileManager } from '../../src/generators/rules/rules-file-manager'; // Real implementation
import { RulesContentProcessor } from '../../src/generators/rules/rules-content-processor'; // Real implementation
import { ProgressIndicator } from '../../src/core/ui/progress-indicator';
import { Result } from '../../src/core/result/result';
import { mock, MockProxy } from 'jest-mock-extended';
import path from 'path';
import { ProjectConfig } from '../../types/shared';

// Mock dependencies that are external or complex to set up for integration
jest.mock('../../src/core/ui/progress-indicator'); // Mock UI

describe('RulesGenerator Integration Test', () => {
  let container: IServiceContainer;
  let rulesGenerator: RulesGenerator;
  let mockLogger: MockProxy<ILogger>;
  let mockFileOps: MockProxy<IFileOperations>; // Mock file system interactions
  let mockProjectAnalyzer: MockProxy<IProjectAnalyzer>;
  let mockLLMAgent: MockProxy<LLMAgent>;
  let mockProgressIndicator: MockProxy<ProgressIndicator>;

  const mockProjectContext: ProjectContext = {
    techStack: {
      languages: ['TypeScript'],
      frameworks: ['Node.js'],
      tools: [],
      buildTools: ['tsc'],
      testingFrameworks: ['Jest'],
      linters: ['ESLint'],
      packageManager: 'npm',
    } as TechStackAnalysis,
    structure: {
      rootDir: '/test',
      sourceDir: 'src',
      testDir: 'tests',
      configFiles: ['tsconfig.json'],
      mainEntryPoints: ['src/index.ts'],
      componentStructure: {},
    } as ProjectStructure,
    dependencies: {
      dependencies: {},
      devDependencies: { jest: 'latest' },
      peerDependencies: {},
      internalDependencies: {},
    } as DependencyGraph,
  };
  const mockConfig: ProjectConfig = {
    name: 'integration-test',
    rootDir: '.',
    baseDir: 'src',
    generators: ['rules'],
  };
  const contextPaths = ['.'];
  const expectedOutputPath = path.join('.roo', 'rules-code', 'rules.md');
  const expectedOutputDir = path.dirname(expectedOutputPath);

  beforeEach(() => {
    // Use singleton instance
    container = Container.getInstance();
    // Clear previous registrations if any test modifies the singleton container
    container.clear();
    mockLogger = mock<ILogger>();
    mockFileOps = mock<IFileOperations>();
    mockProjectAnalyzer = mock<IProjectAnalyzer>();
    mockLLMAgent = mock<LLMAgent>();
    mockProgressIndicator = mock<ProgressIndicator>(); // Mocked via jest.mock

    // Register mocks using registerFactory
    container.registerFactory<ILogger>('ILogger', () => mockLogger);
    container.registerFactory<IFileOperations>('IFileOperations', () => mockFileOps);
    container.registerFactory<IProjectAnalyzer>('IProjectAnalyzer', () => mockProjectAnalyzer);
    container.registerFactory<LLMAgent>('LLMAgent', () => mockLLMAgent);
    container.registerFactory<ProgressIndicator>('ProgressIndicator', () => mockProgressIndicator);
    // Register IServiceContainer itself - needed by RulesGenerator constructor
    container.registerFactory<IServiceContainer>('IServiceContainer', () => container);

    // Register real implementations using registerFactory, resolving dependencies
    container.registerFactory<IRulesContentProcessor>('IRulesContentProcessor', () => {
      // RulesContentProcessor has no constructor dependencies
      return new RulesContentProcessor();
    });
    container.registerFactory<IRulesFileManager>('IRulesFileManager', () => {
      // Resolve dependencies needed by RulesFileManager constructor
      const fileOpsResult = container.resolve<IFileOperations>('IFileOperations');
      const loggerResult = container.resolve<ILogger>('ILogger');
      // Use unwrap() to get the value or throw if resolution failed
      const fileOps = fileOpsResult.unwrap();
      const logger = loggerResult.unwrap();
      return new RulesFileManager(fileOps, logger);
    });

    // Define a string token for the generator
    const rulesGeneratorToken = 'RulesGenerator';
    // Register the generator itself using registerFactory
    container.registerFactory<RulesGenerator>(rulesGeneratorToken, () => {
      const resolvedContainer = container.resolve<IServiceContainer>('IServiceContainer').unwrap();
      const logger = container.resolve<ILogger>('ILogger').unwrap();
      const fileOps = container.resolve<IFileOperations>('IFileOperations').unwrap();
      const projectAnalyzer = container.resolve<IProjectAnalyzer>('IProjectAnalyzer').unwrap();
      const llmAgent = container.resolve<LLMAgent>('LLMAgent').unwrap();
      const contentProcessor = container
        .resolve<IRulesContentProcessor>('IRulesContentProcessor')
        .unwrap();
      const rulesFileManager = container.resolve<IRulesFileManager>('IRulesFileManager').unwrap();
      return new RulesGenerator(
        resolvedContainer,
        logger,
        fileOps,
        projectAnalyzer,
        llmAgent,
        contentProcessor,
        rulesFileManager
      );
    });

    // Initialize container AFTER registrations
    container.initialize();

    // Resolve the generator instance using the string token
    const resolveResult = container.resolve<RulesGenerator>(rulesGeneratorToken);
    if (resolveResult.isErr()) {
      // Wrap the error to satisfy ESLint rule explicitly
      // Also check if error exists before accessing message
      const errMsg = resolveResult.error?.message ?? 'Unknown DI Error';
      throw new Error(`DI Resolution failed: ${errMsg}`);
    }
    // Assign resolved value using unwrap after checking for error
    rulesGenerator = resolveResult.unwrap();

    // --- Setup Mock Behaviors ---
    // Mock Project Analyzer to return predefined context
    mockProjectAnalyzer.analyzeTechStack.mockResolvedValue(Result.ok(mockProjectContext.techStack));
    mockProjectAnalyzer.analyzeProjectStructure.mockResolvedValue(
      Result.ok(mockProjectContext.structure)
    );
    mockProjectAnalyzer.analyzeDependencies.mockResolvedValue(
      Result.ok(mockProjectContext.dependencies)
    );

    // Mock LLM Agent to return simple content for each section (ensure Promise return)
    mockLLMAgent.getCompletion.mockImplementation(async (systemPrompt, _) => {
      if (systemPrompt.includes('code-style'))
        return Promise.resolve(Result.ok('## Style Rules\n- Use tabs.'));
      if (systemPrompt.includes('project-structure'))
        return Promise.resolve(Result.ok('## Structure Rules\n- Put everything in `src`.'));
      if (systemPrompt.includes('naming-conventions'))
        return Promise.resolve(Result.ok('## Naming Rules\n- Use snake_case.'));
      if (systemPrompt.includes('dependency-management'))
        return Promise.resolve(Result.ok('## Dependency Rules\n- Use `npm ci`.'));
      if (systemPrompt.includes('best-practices'))
        return Promise.resolve(Result.ok('## Practices Rules\n- Write tests.'));
      return Promise.resolve(Result.ok('## Default Rules\n- Be consistent.'));
    });

    // Mock File Operations - Simulate success
    mockFileOps.createDirectory.mockResolvedValue(Result.ok(undefined));
    mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined));
  });

  it('should generate a rules file with aggregated content from mocked LLM responses', async () => {
    const result = await rulesGenerator.generate(mockConfig, contextPaths);

    // Assert overall success
    expect(result.isOk()).toBe(true);
    expect(result.value).toBe(expectedOutputPath);

    // Verify mocks were called as expected
    expect(mockProjectAnalyzer.analyzeTechStack).toHaveBeenCalledWith(contextPaths);
    expect(mockLLMAgent.getCompletion).toHaveBeenCalledTimes(5); // For the 5 sections

    // Verify file operations were called correctly by the real RulesFileManager
    expect(mockFileOps.createDirectory).toHaveBeenCalledWith(expectedOutputDir);
    expect(mockFileOps.writeFile).toHaveBeenCalledWith(
      expectedOutputPath,
      expect.stringContaining('## Style Rules\n- Use tabs.') // Check content from LLM mock
    );
    expect(mockFileOps.writeFile).toHaveBeenCalledWith(
      expectedOutputPath,
      expect.stringContaining('## Structure Rules\n- Put everything in `src`.')
    );
    expect(mockFileOps.writeFile).toHaveBeenCalledWith(
      expectedOutputPath,
      expect.stringContaining('## Practices Rules\n- Write tests.')
    );

    // Verify logger output (optional, but good practice)
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Generating project coding standards...')
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining(`Successfully generated rules file: ${expectedOutputPath}`)
    );
  });

  it('should return an error if file writing fails', async () => {
    const writeError = new Error('Disk full');
    mockFileOps.writeFile.mockResolvedValue(Result.err(writeError)); // Simulate file write failure

    const result = await rulesGenerator.generate(mockConfig, contextPaths);

    expect(result.isErr()).toBe(true);
    // The error should propagate up from RulesFileManager via executeGeneration
    expect(result.error?.message).toContain('Rules generation failed'); // Check wrapped error message
    // Check the underlying cause if wrapped (adjust based on actual error wrapping in executeGeneration)
    // expect((result.error as any)?.cause).toBe(writeError);

    // Let's check the logger for the specific error from saveRules
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Failed to save aggregated rules file'),
      expect.objectContaining({ message: writeError.message })
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Rules generation process failed'),
      expect.any(Error)
    );
    expect(mockFileOps.createDirectory).toHaveBeenCalledWith(expectedOutputDir); // Directory creation still attempted
  });

  it('should return an error if project analysis fails', async () => {
    const analysisError = new Error('Cannot read package.json');
    mockProjectAnalyzer.analyzeTechStack.mockResolvedValue(Result.err(analysisError)); // Simulate analysis failure

    const result = await rulesGenerator.generate(mockConfig, contextPaths);

    expect(result.isErr()).toBe(true);
    expect(result.error?.message).toContain('Rules generation failed');
    // Check the underlying cause if wrapped
    // expect((result.error as any)?.cause).toBe(analysisError);

    expect(mockLLMAgent.getCompletion).not.toHaveBeenCalled();
    expect(mockFileOps.writeFile).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Rules generation process failed'),
      expect.any(Error)
    );
  });
});
