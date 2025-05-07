import { jest } from '@jest/globals';
// ProjectAnalyzer import removed
import { IProjectAnalyzer, ProjectContext } from '../../src/core/analysis/types';
import { Result } from '../../src/core/result/result';
import { LLMProviderError } from '../../src/core/llm/llm-provider-errors'; // Added import
import { createMockFileOperations } from './file-operations.mock';
import { createMockLogger } from './logger.mock';
import { createMockLLMAgent } from './llm-agent.mock';
import { createMockProgressIndicator } from './progress-indicator.mock';
import { createMockFileContentCollector } from './file-content-collector.mock';
import { createMockFilePrioritizer } from './file-prioritizer.mock';
import { createMockTreeSitterParserService } from './tree-sitter-parser.service.mock';
import { createMockAstAnalysisService } from './ast-analysis.service.mock';
import { createMockTechStackAnalyzerService } from './tech-stack-analyzer.mock';
import { createMockProjectAnalyzerHelpers } from './project-analyzer.helpers.mock';

// Default mock ProjectContext data
const defaultMockProjectContextData: ProjectContext = {
  techStack: {
    languages: ['mockLang'],
    frameworks: ['mockFramework'],
    buildTools: ['mockBuildTool'],
    testingFrameworks: ['mockTestFramework'],
    linters: ['mockLinter'],
    packageManager: 'mockPM',
  },
  structure: {
    rootDir: '/mock/root',
    sourceDir: 'src',
    testDir: 'tests',
    configFiles: ['package.json'],
    mainEntryPoints: ['src/index.ts'],
    directoryTree: [],
    componentStructure: {},
  },
  dependencies: {
    dependencies: { 'mock-dep': '1.0.0' },
    devDependencies: { 'mock-dev-dep': '1.0.0' },
    peerDependencies: {},
    internalDependencies: {},
  },
  codeInsights: {},
  packageJson: { name: 'mock-package', version: '1.0.0' },
};

// Interface for the returned mock object, allowing access to underlying mocks
export interface MockProjectAnalyzer extends jest.Mocked<IProjectAnalyzer> {
  mockFileOps: ReturnType<typeof createMockFileOperations>;
  mockLogger: ReturnType<typeof createMockLogger>;
  mockLLMAgent: ReturnType<typeof createMockLLMAgent>;
  mockProgressIndicator: ReturnType<typeof createMockProgressIndicator>;
  mockFileContentCollector: ReturnType<typeof createMockFileContentCollector>;
  mockFilePrioritizer: ReturnType<typeof createMockFilePrioritizer>;
  mockTreeSitterParserService: ReturnType<typeof createMockTreeSitterParserService>;
  mockAstAnalysisService: ReturnType<typeof createMockAstAnalysisService>;
  mockTechStackAnalyzerService: ReturnType<typeof createMockTechStackAnalyzerService>;
  mockHelpers: ReturnType<typeof createMockProjectAnalyzerHelpers>;
}

export const createMockProjectAnalyzer = (): MockProjectAnalyzer => {
  const mockFileOps = createMockFileOperations();
  const mockLogger = createMockLogger();
  const mockLLMAgent = createMockLLMAgent();
  const mockProgressIndicator = createMockProgressIndicator();
  const mockFileContentCollector = createMockFileContentCollector();
  const mockFilePrioritizer = createMockFilePrioritizer();
  const mockTreeSitterParserService = createMockTreeSitterParserService();
  const mockAstAnalysisService = createMockAstAnalysisService();
  const mockTechStackAnalyzerService = createMockTechStackAnalyzerService();
  const mockHelpers = createMockProjectAnalyzerHelpers();

  const analyzerMock = {
    analyzeProject: jest
      .fn<() => Promise<Result<ProjectContext, LLMProviderError>>>() // Changed Error to LLMProviderError
      .mockResolvedValue(Result.ok(defaultMockProjectContextData)), // Use the detailed default mock
  } as unknown as jest.Mocked<IProjectAnalyzer>;

  return {
    ...analyzerMock,
    mockFileOps,
    mockLogger,
    mockLLMAgent,
    mockProgressIndicator,
    mockFileContentCollector,
    mockFilePrioritizer,
    mockTreeSitterParserService,
    mockAstAnalysisService,
    mockTechStackAnalyzerService,
    mockHelpers,
  } as MockProjectAnalyzer;
};

export const mockProjectAnalyzer = createMockProjectAnalyzer();
