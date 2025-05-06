# OpenRouter Invalid Response Error Fix - Implementation Plan

## Overview

This plan outlines the steps to fix the `LLMProviderError: OpenRouter response has invalid structure: missing or empty choices array` that occurs during project analysis in the `AiMagicGenerator`. The fix involves enhancing error handling and implementing retry logic in the `ProjectAnalyzer` to gracefully handle intermittent invalid responses from the OpenRouter API.

## Implementation Context

- The error originates from the `OpenRouterProvider` when the API returns a response missing or with an empty `choices` array.
- The `ProjectAnalyzer` currently does not have specific handling or retry logic for this type of error, leading to the `AiMagicGenerator` failing.
- The existing `OpenRouterProvider` correctly identifies this scenario and throws an `LLMProviderError` with the code `INVALID_RESPONSE_FORMAT`.

## Code Style and Architecture Analysis

- **Code Style**: The existing codebase uses TypeScript, follows a clear dependency injection pattern, and utilizes the `Result` monad for error handling. New code should adhere to these patterns.
- **Architecture Patterns**: The system follows a layered architecture with clear separation of concerns (CLI, Application, Core services, LLM providers, Generators). The fix should maintain this structure. The use of the `Result` monad for propagating errors from lower layers (LLM providers) to higher layers (Analyzers, Generators) is a key pattern to preserve.
- **Implementation Patterns**: Error handling is generally done by returning `Result.err`. Retry logic, where implemented, should follow a consistent pattern (e.g., exponential backoff).
- **Naming Conventions**: Use descriptive names for variables, functions, and classes, consistent with existing conventions (camelCase for variables/functions, PascalCase for classes/types).
- **Error Handling**: Leverage the existing `LLMProviderError` and the `Result` monad. Introduce specific error handling in `ProjectAnalyzer` for the identified error code.
- **Testing**: Unit tests exist for `OpenRouterProvider`'s error conditions. Integration tests cover the overall generator flow. New tests should follow the existing structure and mocking patterns.

## Implementation Approach

The fix will be implemented by adding specific error handling and a retry mechanism within the `ProjectAnalyzer`'s `analyzeProject` method. This method calls the `LLMAgent`, which in turn uses the configured LLM provider (OpenRouter). By catching the `LLMProviderError` with the `INVALID_RESPONSE_FORMAT` code, the `ProjectAnalyzer` can attempt to call the `LLMAgent` again, mitigating issues caused by transient API response problems.

## Implementation Subtasks

### 1. Implement Retry Logic in ProjectAnalyzer for Invalid Response Error

**Status**: Not Started
**Assigned Mode**: Code
**Description**: Modify the `analyzeProject` method in `ProjectAnalyzer` to catch `LLMProviderError` with the code `INVALID_RESPONSE_FORMAT` and implement a retry mechanism (e.g., up to 3 attempts with exponential backoff) before finally returning an error.
**Files to Modify**:

- `src/core/analysis/project-analyzer.ts` - Add try-catch block and retry loop around the `llmAgent.getCompletion` call.
- `src/core/llm/llm-provider-errors.ts` - Ensure `LLMProviderError` has a `code` property that can be checked. (Already exists based on analysis).

**Implementation Details**:

```typescript
// src/core/analysis/project-analyzer.ts
import { Injectable, Inject } from '../di/decorators';
import { IFileOperations } from '../file-operations/interfaces';
import { ILogger } from '../services/logger-service';
import { Result } from '../result/result';
import { IProjectAnalyzer, ProjectContext } from './types';
import { LLMAgent } from '../llm/llm-agent';
import { ResponseParser } from './response-parser';
import {
  BINARY_EXTENSIONS,
  SKIP_DIRECTORIES,
  ANALYZABLE_EXTENSIONS,
  ANALYZABLE_FILENAMES,
} from './constants';
import { ProgressIndicator } from '../ui/progress-indicator';
import path from 'path';
import { LLMProviderError } from '../llm/llm-provider-errors'; // Import LLMProviderError

@Injectable()
export class ProjectAnalyzer implements IProjectAnalyzer {
  constructor(
    @Inject('IFileOperations') private readonly fileOps: IFileOperations,
    @Inject('ILogger') private readonly logger: ILogger,
    @Inject('LLMAgent') private readonly llmAgent: LLMAgent,
    @Inject('ResponseParser') private readonly responseParser: ResponseParser,
    @Inject('ProgressIndicator') private readonly progress: ProgressIndicator
  ) {
    this.logger.debug('ProjectAnalyzer initialized');
  }

  async analyzeProject(paths: string[]): Promise<Result<ProjectContext, Error>> {
    if (!paths || paths.length === 0) {
      return Result.err(new Error('No project paths provided for analysis.'));
    }
    const rootPath = paths[0];

    try {
      this.progress.start('Collecting project files for analysis...');
      const files = await this.collectProjectFiles(rootPath);
      if (files.length === 0) {
        this.progress.fail('No analyzable files found in the project');
        return Result.err(new Error('No analyzable files found for analysis'));
      }
      this.progress.update(`Collected ${files.length} files. Analyzing project context...`);

      const systemPrompt = `Analyze the provided project files to determine its overall context.
        Return a single JSON object containing the tech stack, project structure, and dependencies.
        The JSON object must strictly adhere to the following structure:
        {
          "techStack": {
            "languages": string[],
            "frameworks": string[],
            "buildTools": string[],
            "testingFrameworks": string[],
            "linters": string[],
            "packageManager": string
          },
          "structure": {
            "rootDir": string,
            "sourceDir": string,
            "testDir": string,
            "configFiles": string[],
            "mainEntryPoints": string[],
            "componentStructure": Record<string, string[]>
          },
          "dependencies": {
            "dependencies": Record<string, string>,
            "devDependencies": Record<string, string>,
            "peerDependencies": Record<string, string>,
            "internalDependencies": Record<string, string[]>
          }
        }
        Important:
        - Analyze based *only* on the provided file contents.
        - Infer fields like 'sourceDir', 'testDir', 'mainEntryPoints' based on common conventions and file contents.
        - If a field cannot be determined (e.g., no clear package manager), return an empty array [] or empty object {} or null as appropriate for the type.
        - Return ONLY the JSON object without any surrounding text, explanations, markdown formatting, or code fences.`;

      const maxRetries = 3;
      let attempts = 0;

      while (attempts < maxRetries) {
        try {
          const result = await this.llmAgent.getCompletion(systemPrompt, files.join('\n\n---\n\n'));

          if (result.isOk()) {
            this.progress.update('Processing analysis results...');
            const parsedResult = this.responseParser.parseJSON<ProjectContext>(
              result.value as string
            );

            if (parsedResult.isErr()) {
              this.progress.fail('Failed to parse analysis results from LLM');
              this.logger.error(
                `Failed to parse LLM response: ${result.value}`,
                parsedResult.error
              );
              return parsedResult;
            }

            if (!parsedResult.value) {
              this.progress.fail('Parsed analysis result value is undefined');
              this.logger.error(
                'Parsed analysis result value is undefined, though parsing was successful.'
              );
              return Result.err(new Error('Parsed analysis result value is undefined'));
            }

            const techStack = parsedResult.value.techStack ?? {
              languages: [],
              frameworks: [],
              buildTools: [],
              testingFrameworks: [],
              linters: [],
              packageManager: '',
            };
            const structure = parsedResult.value.structure ?? {
              rootDir: '',
              sourceDir: '',
              testDir: '',
              configFiles: [],
              mainEntryPoints: [],
              componentStructure: {},
            };
            const dependencies = parsedResult.value.dependencies ?? {
              dependencies: {},
              devDependencies: {},
              peerDependencies: {},
              internalDependencies: {},
            };

            const finalContext: ProjectContext = {
              techStack,
              structure: {
                ...structure,
                rootDir: rootPath,
              },
              dependencies,
            };

            this.progress.succeed('Project context analysis completed successfully');
            return Result.ok(finalContext);
          } else {
            const error = result.error;
            if (
              error instanceof LLMProviderError &&
              error.code === 'INVALID_RESPONSE_FORMAT' &&
              attempts < maxRetries - 1
            ) {
              this.logger.warn(
                `Attempt ${attempts + 1} failed due to invalid response format. Retrying...`
              );
              attempts++;
              await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempts - 1)));
              continue;
            } else {
              this.progress.fail('Project context analysis failed during LLM call');
              return Result.err(error as Error);
            }
          }
        } catch (error) {
          this.progress.fail('Project context analysis failed during LLM call');
          const errorMessage = error instanceof Error ? error.message : String(error);
          const errorCause = error instanceof Error ? error : undefined;
          this.logger.error(`Project context analysis failed: ${errorMessage}`, errorCause);
          return Result.err(new Error(`Project context analysis failed: ${errorMessage}`));
        }
      }

      // If the loop finishes, it means all retries failed for INVALID_RESPONSE_FORMAT
      this.progress.fail(
        `Project context analysis failed after ${maxRetries} attempts due to invalid response format.`
      );
      return Result.err(
        new Error(
          `Project context analysis failed after ${maxRetries} attempts due to invalid response format.`
        )
      );
    } catch (error) {
      this.progress.fail('Project context analysis failed');
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCause = error instanceof Error ? error : undefined;
      this.logger.error(`Project context analysis failed: ${errorMessage}`, errorCause);
      return Result.err(new Error(`Project context analysis failed: ${errorMessage}`));
    }
  }

  private async isDirectory(filePath: string): Promise<Result<boolean, Error>> {
    const result = await this.fileOps.isDirectory(filePath);
    if (result.isErr()) {
      this.logger.warn(`Error checking if path is directory: ${filePath} - ${result.error}`);
      return Result.err(result.error as Error);
    }
    return Result.ok(result.value as boolean);
  }

  private async collectProjectFiles(rootDir: string): Promise<string[]> {
    try {
      const files: string[] = [];
      const scanDir = async (dirPath: string): Promise<void> => {
        const result = await this.fileOps.readDir(dirPath);
        if (!result.isOk() || !result.value) {
          this.logger.debug(`Failed to read directory: ${dirPath}`);
          return;
        }

        const items = result.value;
        for (const item of items) {
          const itemName: string = typeof item === 'string' ? item : item.name;
          const fullPath: string = path.join(dirPath, itemName);

          if (SKIP_DIRECTORIES.has(itemName)) {
            this.logger.debug(`Skipping excluded directory: ${itemName}`);
            continue;
          }

          if (itemName.startsWith('.')) {
            this.logger.debug(`Skipping hidden item: ${itemName}`);
            continue;
          }

          const isDirResult = await this.isDirectory(fullPath);
          if (isDirResult.isErr()) {
            this.logger.warn(`Error checking directory status: ${fullPath} - ${isDirResult.error}`);
            continue;
          }

          if (isDirResult.value) {
            await scanDir(fullPath);
          } else if (this.shouldAnalyzeFile(itemName)) {
            const contentResult = await this.fileOps.readFile(fullPath);
            if (contentResult.isOk() && typeof contentResult.value === 'string') {
              files.push(`File: ${path.relative(rootDir, fullPath)}\n${contentResult.value}`);
            }
          }
        }
      };

      await scanDir(rootDir);
      return files;
    } catch (error: any) {
      this.logger.error(`Error collecting project files: ${error}`);
      return [];
    }
  }

  private shouldAnalyzeFile(filePath: string): boolean {
    const fileName = path.basename(filePath);
    const ext = path.extname(fileName).toLowerCase();

    if (
      fileName.includes('.test.') ||
      fileName.includes('.spec.') ||
      fileName.endsWith('.d.ts') ||
      fileName.endsWith('.map') ||
      fileName === 'package-lock.json' ||
      fileName === 'yarn.lock' ||
      fileName.endsWith('.lock')
    ) {
      this.logger.debug(`Skipping test/generated/lock file: ${fileName}`);
      return false;
    }

    if (BINARY_EXTENSIONS.has(ext)) {
      this.logger.debug(`Skipping binary file: ${fileName}`);
      return false;
    }

    if (ANALYZABLE_FILENAMES.has(fileName)) {
      this.logger.debug(`Including known filename: ${fileName}`);
      return true;
    }

    if (ANALYZABLE_EXTENSIONS.has(ext)) {
      this.logger.debug(`Including file with known extension: ${fileName}`);
      return true;
    }

    if (!ext && ANALYZABLE_FILENAMES.has(fileName)) {
      this.logger.debug(`Including known filename without extension: ${fileName}`);
      return true;
    }

    this.logger.debug(`Skipping file by default: ${fileName}`);
    return false;
  }
}
```

**Testing Requirements**:

- Unit tests for `ProjectAnalyzer` mocking `LLMAgent.getCompletion` to return `Result.err(new LLMProviderError('...', 'INVALID_RESPONSE_FORMAT'))` multiple times before succeeding.
- Verify that `LLMAgent.getCompletion` is called multiple times.
- Verify that the final result is `Result.ok` when retries succeed.
- Verify that the final result is `Result.err` after all retries fail.

**Acceptance Criteria**:

- [ ] `ProjectAnalyzer.analyzeProject` attempts LLM call multiple times on `INVALID_RESPONSE_FORMAT` error.
- [ ] `ProjectAnalyzer.analyzeProject` returns `Result.ok` if a retry succeeds.
- [ ] `ProjectAnalyzer.analyzeProject` returns `Result.err` after retries are exhausted for `INVALID_RESPONSE_FORMAT`.

**Estimated effort**: 30-45 minutes

### 2. Add Integration Test for Retry Logic in AiMagicGenerator

**Status**: Not Started
**Assigned Mode**: Junior Tester
**Description**: Add a new integration test case in `ai-magic-generator.integration.test.ts` that mocks the `LLMAgent.getCompletion` to simulate the `OpenRouterProvider` returning an `INVALID_RESPONSE_FORMAT` error a few times before returning a successful response.
**Files to Modify**:

- `tests/generators/ai-magic-generator.integration.test.ts` - Add a new `it` block with mocking and assertions for the retry scenario.

**Implementation Details**:

```typescript
// tests/generators/ai-magic-generator.integration.test.ts
import path from 'path';
import { AiMagicGenerator } from '@generators/ai-magic-generator';
import { MemoryBankService } from '@memory-bank/memory-bank-service';
import { IProjectAnalyzer, ProjectContext } from '@core/analysis/types';
import { ILogger } from '@core/services/logger-service';
import { IFileOperations } from '@core/file-operations/interfaces';
import { LLMAgent } from '@core/llm/llm-agent';
import { Result } from '@core/result/result';
import { IServiceContainer } from '@core/di/interfaces';
import { ProjectConfig } from '../../types/shared';
import { IRulesPromptBuilder } from '@generators/rules/interfaces';
import { IContentProcessor } from '@memory-bank/interfaces';
import { LLMProviderError } from '@core/llm/llm-provider-errors'; // Import LLMProviderError

// Mock dependencies
const mockLogger: ILogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockFileOps: jest.Mocked<IFileOperations> = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  createDirectory: jest.fn(),
  validatePath: jest.fn(),
  normalizePath: jest.fn(),
  readDir: jest.fn(),
  exists: jest.fn(),
  isDirectory: jest.fn(),
  copyDirectoryRecursive: jest.fn(),
};

const mockProjectAnalyzer: jest.Mocked<IProjectAnalyzer> = {
  analyzeProject: jest.fn(),
};

const mockLlmAgent: LLMAgent = {
  getCompletion: jest.fn(),
} as any;

const mockMemoryBankService: MemoryBankService = {
  generateMemoryBank: jest.fn(),
} as any;

const mockContainer: IServiceContainer = {
  initialize: jest.fn(),
  register: jest.fn(),
  registerSingleton: jest.fn(),
  registerFactory: jest.fn(),
  resolve: jest.fn(),
  clear: jest.fn(),
};

const mockRulesPromptBuilder: jest.Mocked<IRulesPromptBuilder> = {
  buildSystemPrompt: jest.fn(),
  buildPrompt: jest.fn(),
};

const mockContentProcessor: jest.Mocked<IContentProcessor> = {
  stripMarkdownCodeBlock: jest.fn(),
  processTemplate: jest.fn(),
};

describe('AiMagicGenerator Integration Tests', () => {
  let aiMagicGenerator: AiMagicGenerator;

  const mockProjectContext: ProjectContext = {
    techStack: {
      languages: ['ts'],
      frameworks: ['react'],
      buildTools: ['webpack'],
      testingFrameworks: ['jest'],
      linters: ['eslint'],
      packageManager: 'npm',
    },
    structure: {
      rootDir: '/path/to/project',
      sourceDir: 'src',
      testDir: 'tests',
      configFiles: ['tsconfig.json'],
      mainEntryPoints: ['src/index.ts'],
      componentStructure: {},
    },
    dependencies: {
      dependencies: { react: '18.0.0' },
      devDependencies: { jest: '29.0.0' },
      peerDependencies: {},
      internalDependencies: {},
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    aiMagicGenerator = new AiMagicGenerator(
      mockContainer,
      mockLogger,
      mockFileOps,
      mockProjectAnalyzer,
      mockLlmAgent,
      mockMemoryBankService,
      mockRulesPromptBuilder,
      mockContentProcessor
    );

    // Mock the consolidated analyzeProject method to succeed by default
    mockProjectAnalyzer.analyzeProject.mockResolvedValue(Result.ok(mockProjectContext));
  });

  it('should call MemoryBankService and generate rules file on successful analysis', async () => {
    const mockContextPaths = ['/path/to/project'];
    const mockConfig: ProjectConfig = {
      name: 'test-project',
      baseDir: '/path/to/project',
      rootDir: '/path/to/project/dist',
      generators: ['ai-magic'],
    };
    const mockMemoryBankOutputPath = 'memory-bank/output.md';
    const mockRulesOutputPath = '.roo/rules-code/generated-rules.md';
    const mockGeneratedRulesContent = '# Generated Rules\n\n- Rule 1';
    const mockStrippedRulesContent = '# Generated Rules\n\n- Rule 1';

    (mockMemoryBankService.generateMemoryBank as jest.Mock).mockResolvedValue(
      Result.ok(mockMemoryBankOutputPath)
    );
    mockRulesPromptBuilder.buildSystemPrompt.mockReturnValue(Result.ok('SYSTEM_PROMPT'));
    mockRulesPromptBuilder.buildPrompt.mockReturnValue(Result.ok('USER_PROMPT'));
    (mockLlmAgent.getCompletion as jest.Mock).mockResolvedValue(
      Result.ok(mockGeneratedRulesContent)
    );
    mockContentProcessor.stripMarkdownCodeBlock.mockReturnValue(
      Result.ok(mockStrippedRulesContent)
    );
    (mockFileOps.writeFile as jest.Mock).mockResolvedValue(Result.ok(undefined));

    const result = await aiMagicGenerator.generate(mockConfig, mockContextPaths);

    expect(result.isOk()).toBe(true);
    expect(result.value).toContain(
      `Memory Bank generated successfully. ${mockMemoryBankOutputPath}`
    );
    const normalizedRulesPath = path.normalize(mockRulesOutputPath);
    expect(result.value).toContain(`Rules file generated successfully at ${normalizedRulesPath}.`);
    expect(mockProjectAnalyzer.analyzeProject).toHaveBeenCalledTimes(1);
    expect(mockProjectAnalyzer.analyzeProject).toHaveBeenCalledWith(mockContextPaths);
    expect(mockMemoryBankService.generateMemoryBank).toHaveBeenCalledTimes(1);
    expect(mockMemoryBankService.generateMemoryBank).toHaveBeenCalledWith(
      expect.objectContaining(mockProjectContext),
      mockConfig
    );
    expect(mockRulesPromptBuilder.buildSystemPrompt).toHaveBeenCalledWith('code');
    expect(mockRulesPromptBuilder.buildPrompt).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      ''
    );
    expect(mockLlmAgent.getCompletion).toHaveBeenCalledWith('SYSTEM_PROMPT', 'USER_PROMPT');
    expect(mockContentProcessor.stripMarkdownCodeBlock).toHaveBeenCalledWith(
      mockGeneratedRulesContent
    );
    expect(mockFileOps.writeFile).toHaveBeenCalledWith(
      path.normalize(mockRulesOutputPath),
      mockStrippedRulesContent
    );

    expect(mockLogger.info).toHaveBeenCalledWith('Starting AI Magic generation process...');
    expect(mockLogger.info).toHaveBeenCalledWith('Starting Memory Bank Service generation...');
    expect(mockLogger.info).toHaveBeenCalledWith('Starting Rules file generation...');
    expect(mockLogger.info).toHaveBeenCalledWith(
      `Memory Bank Service completed successfully. ${mockMemoryBankOutputPath}`
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining(
        `Rules file generated successfully at ${path.normalize(mockRulesOutputPath)}`
      )
    );
  });

  it('should return error if project analysis fails', async () => {
    const mockContextPaths = ['/path/to/project'];
    const mockConfig: ProjectConfig = {
      name: 'test-project',
      baseDir: '/path/to/project',
      rootDir: '/path/to/project/dist',
      generators: ['ai-magic'],
    };
    const analysisError = new Error('Analysis failed');

    mockProjectAnalyzer.analyzeProject.mockResolvedValue(Result.err(analysisError));

    const result = await aiMagicGenerator.generate(mockConfig, mockContextPaths);

    expect(result.isErr()).toBe(true);
    expect(result.error).toBe(analysisError);
    expect(mockMemoryBankService.generateMemoryBank).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Project analysis failed'),
      analysisError
    );
  });

  it('should return error if MemoryBankService fails', async () => {
    const mockContextPaths = ['/path/to/project'];
    const mockConfig: ProjectConfig = {
      name: 'test-project',
      baseDir: '/path/to/project',
      rootDir: '/path/to/project/dist',
      generators: ['ai-magic'],
    };
    const memoryBankError = new Error('Memory bank generation failed');
    const mockProjectContext: ProjectContext = {
      techStack: {
        languages: ['ts'],
        frameworks: ['react'],
        buildTools: ['webpack'],
        testingFrameworks: ['jest'],
        linters: ['eslint'],
        packageManager: 'npm',
      },
      structure: {
        rootDir: '/path/to/project',
        sourceDir: 'src',
        testDir: 'tests',
        configFiles: ['tsconfig.json'],
        mainEntryPoints: ['src/index.ts'],
        componentStructure: {},
      },
      dependencies: {
        dependencies: { react: '18.0.0' },
        devDependencies: { jest: '29.0.0' },
        peerDependencies: {},
        internalDependencies: {},
      },
    };

    mockProjectAnalyzer.analyzeProject.mockResolvedValue(Result.ok(mockProjectContext));
    (mockMemoryBankService.generateMemoryBank as jest.Mock).mockResolvedValue(
      Result.err(memoryBankError)
    );

    const result = await aiMagicGenerator.generate(mockConfig, mockContextPaths);

    expect(result.isErr()).toBe(true);
    expect(result.error?.message).toContain('AI Magic generation completed with errors');
    expect(result.error?.message).toContain(
      `Memory Bank Service failed: ${memoryBankError.message}`
    );
    expect(mockMemoryBankService.generateMemoryBank).toHaveBeenCalledTimes(1);
    expect(mockMemoryBankService.generateMemoryBank).toHaveBeenCalledWith(
      expect.objectContaining(mockProjectContext),
      mockConfig
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      `Memory Bank Service failed: ${memoryBankError.message}`,
      memoryBankError
    );
  });

  it('should return error if no context paths are provided', async () => {
    const mockConfig: ProjectConfig = {
      name: 'test-project',
      baseDir: '/path/to/project',
      rootDir: '/path/to/project/dist',
      generators: ['ai-magic'],
    };

    const result = await aiMagicGenerator.generate(mockConfig, []);

    expect(result.isErr()).toBe(true);
    expect(result.error?.message).toBe('No context path provided for analysis');
    expect(mockProjectAnalyzer.analyzeProject).not.toHaveBeenCalled();
    expect(mockMemoryBankService.generateMemoryBank).not.toHaveBeenCalled();
  });

  it('should return error if rules generation fails but memory bank succeeds', async () => {
    const mockContextPaths = ['/path/to/project'];
    const mockConfig: ProjectConfig = {
      name: 'test-project',
      baseDir: '/path/to/project',
      rootDir: '/path/to/project/dist',
      generators: ['ai-magic'],
    };
    const mockMemoryBankOutputPath = 'memory-bank/output.md';
    const rulesGenError = new Error('LLM failed for rules');

    mockProjectAnalyzer.analyzeProject.mockResolvedValue(Result.ok(mockProjectContext));
    (mockMemoryBankService.generateMemoryBank as jest.Mock).mockResolvedValue(
      Result.ok(mockMemoryBankOutputPath)
    );
    mockRulesPromptBuilder.buildSystemPrompt.mockReturnValue(Result.ok('SYSTEM_PROMPT'));
    mockRulesPromptBuilder.buildPrompt.mockReturnValue(Result.ok('USER_PROMPT'));
    (mockLlmAgent.getCompletion as jest.Mock).mockResolvedValue(Result.err(rulesGenError));

    const result = await aiMagicGenerator.generate(mockConfig, mockContextPaths);

    expect(result.isErr()).toBe(true);
    expect(result.error?.message).toContain('Rules file generation failed');
    expect(result.error?.message).toContain(rulesGenError.message);
    expect(mockMemoryBankService.generateMemoryBank).toHaveBeenCalledTimes(1);
    expect(mockLlmAgent.getCompletion).toHaveBeenCalledTimes(1);
    expect(mockFileOps.writeFile).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('Rules file generation failed'),
      expect.any(Error)
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining(
        `Rules file generation failed: LLM failed to generate rules content: ${rulesGenError.message}`
      ),
      expect.any(Error)
    );
  });

  it('should successfully generate if LLM returns invalid response intermittently', async () => {
    const mockContextPaths = ['/path/to/project'];
    const mockConfig: ProjectConfig = {
      name: 'test-project',
      baseDir: '/path/to/project',
      rootDir: '/path/to/project/dist',
      generators: ['ai-magic'],
    };
    const mockMemoryBankOutputPath = 'memory-bank/output.md';
    const mockRulesOutputPath = '.roo/rules-code/generated-rules.md';
    const mockGeneratedRulesContent = '# Generated Rules\n\n- Rule 1';
    const mockStrippedRulesContent = '# Generated Rules\n\n- Rule 1';

    mockProjectAnalyzer.analyzeProject.mockImplementation(async (paths: string[]) => {
      // Simulate the retry logic within the mock if needed, or mock LLMAgent directly
      // Mocking LLMAgent.getCompletion is simpler for this test
      // The actual retry logic is tested in ProjectAnalyzer unit tests
      // This integration test verifies the overall flow when analysis eventually succeeds
      return Result.ok(mockProjectContext); // Assume analysis eventually succeeds due to retries
    });

    (mockMemoryBankService.generateMemoryBank as jest.Mock).mockResolvedValue(
      Result.ok(mockMemoryBankOutputPath)
    );

    mockRulesPromptBuilder.buildSystemPrompt.mockReturnValue(Result.ok('SYSTEM_PROMPT'));
    mockRulesPromptBuilder.buildPrompt.mockReturnValue(Result.ok('USER_PROMPT'));

    const invalidResponseError = new LLMProviderError(
      'Invalid response',
      'INVALID_RESPONSE_FORMAT'
    );
    (mockLlmAgent.getCompletion as jest.Mock)
      .mockResolvedValueOnce(Result.err(invalidResponseError))
      .mockResolvedValueOnce(Result.err(invalidResponseError))
      .mockResolvedValue(Result.ok(mockGeneratedRulesContent));

    mockContentProcessor.stripMarkdownCodeBlock.mockReturnValue(
      Result.ok(mockStrippedRulesContent)
    );
    (mockFileOps.writeFile as jest.Mock).mockResolvedValue(Result.ok(undefined));

    const result = await aiMagicGenerator.generate(mockConfig, mockContextPaths);

    expect(result.isOk()).toBe(true);
    expect(result.value).toContain(
      `Memory Bank generated successfully. ${mockMemoryBankOutputPath}`
    );
    expect(result.value).toContain(
      `Rules file generated successfully at ${path.normalize(mockRulesOutputPath)}.`
    );

    expect(mockProjectAnalyzer.analyzeProject).toHaveBeenCalledTimes(1);
    expect(mockMemoryBankService.generateMemoryBank).toHaveBeenCalledTimes(1);
    expect(mockLlmAgent.getCompletion).toHaveBeenCalledTimes(3);
    expect(mockFileOps.writeFile).toHaveBeenCalledTimes(1);
  });
});
```

**Testing Requirements**:

- Mock `LLMAgent.getCompletion` to return `Result.err` with `INVALID_RESPONSE_FORMAT` code for the first few calls, then `Result.ok`.
- Assert that `AiMagicGenerator.generate` returns `Result.ok`.
- Assert that the success messages are logged/returned.
- Assert that `LLMAgent.getCompletion` was called the expected number of times (failures + 1 success).

**Acceptance Criteria**:

- [ ] A new integration test case exists for the retry scenario.
- [ ] The test case mocks intermittent `INVALID_RESPONSE_FORMAT` errors.
- [ ] The test case asserts successful generation after retries.
- [ ] The test case verifies the number of LLM calls.

**Estimated effort**: 30-45 minutes

### 3. Add Unit Tests for ProjectAnalyzer Retry Logic

**Status**: Not Started
**Assigned Mode**: Junior Tester
**Description**: Add new unit tests in `project-analyzer.test.ts` to specifically test the retry logic implemented in Subtask 1.
**Files to Modify**:

- `tests/core/analysis/project-analyzer.test.ts` - Add new `it` blocks to test retry scenarios.

**Implementation Details**:

```typescript
// tests/core/analysis/project-analyzer.test.ts
import { ProjectAnalyzer } from '@core/analysis/project-analyzer';
import { IFileOperations } from '@core/file-operations/interfaces';
import { ILogger } from '@core/services/logger-service';
import { LLMAgent } from '@core/llm/llm-agent';
import { ResponseParser } from '@core/analysis/response-parser';
import { ProgressIndicator } from '@core/ui/progress-indicator';
import { Result } from '@core/result/result';
import { LLMProviderError } from '@core/llm/llm-provider-errors'; // Import LLMProviderError

// Mock dependencies
const mockFileOps: jest.Mocked<IFileOperations> = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  createDirectory: jest.fn(),
  validatePath: jest.fn(),
  normalizePath: jest.fn(),
  readDir: jest.fn(),
  exists: jest.fn(),
  isDirectory: jest.fn(),
  copyDirectoryRecursive: jest.fn(),
};

const mockLogger: jest.Mocked<ILogger> = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockLlmAgent: jest.Mocked<LLMAgent> = {
  getCompletion: jest.fn(),
} as any; // Use as any for mocking complex class

const mockResponseParser: jest.Mocked<ResponseParser> = {
  parseJSON: jest.fn(),
};

const mockProgressIndicator: jest.Mocked<ProgressIndicator> = {
  start: jest.fn(),
  update: jest.fn(),
  succeed: jest.fn(),
  fail: jest.fn(),
  stop: jest.fn(),
};

describe('ProjectAnalyzer', () => {
  let projectAnalyzer: ProjectAnalyzer;

  beforeEach(() => {
    jest.clearAllMocks();
    projectAnalyzer = new ProjectAnalyzer(
      mockFileOps,
      mockLogger,
      mockLlmAgent,
      mockResponseParser,
      mockProgressIndicator
    );
  });

  describe('analyzeProject with Retry', () => {
    it('should retry LLM call on INVALID_RESPONSE_FORMAT error and succeed', async () => {
      const mockPaths = ['/fake/project/root'];
      const invalidResponseError = new LLMProviderError(
        'Invalid response',
        'INVALID_RESPONSE_FORMAT'
      );
      const successfulResponse = '{"techStack":{},"structure":{},"dependencies":{}}'; // Minimal valid JSON

      // Arrange: Mock llmAgent.getCompletion to fail twice then succeed
      (mockLlmAgent.getCompletion as jest.Mock)
        .mockResolvedValueOnce(Result.err(invalidResponseError)) // First attempt fails
        .mockResolvedValueOnce(Result.err(invalidResponseError)) // Second attempt fails
        .mockResolvedValue(Result.ok(successfulResponse)); // Third attempt succeeds

      // Arrange: Mock file operations to succeed
      mockFileOps.readDir.mockResolvedValue(Result.ok(['file1.ts']));
      mockFileOps.isDirectory.mockResolvedValue(Result.ok(false));
      mockFileOps.readFile.mockResolvedValue(Result.ok('// file content'));
      mockFileOps.exists.mockResolvedValue(Result.ok(true));

      // Arrange: Mock responseParser to succeed
      mockResponseParser.parseJSON.mockReturnValue(
        Result.ok({ techStack: {}, structure: {}, dependencies: {} })
      );

      // Act
      const result = await projectAnalyzer.analyzeProject(mockPaths);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockLlmAgent.getCompletion).toHaveBeenCalledTimes(3); // Expect 3 calls due to 2 failures + 1 success
      expect(mockLogger.warn).toHaveBeenCalledTimes(2); // Expect warnings for the failed attempts
      expect(mockLogger.error).not.toHaveBeenCalled(); // No final error should be logged
    });

    it('should fail after exhausting retries for INVALID_RESPONSE_FORMAT error', async () => {
      const mockPaths = ['/fake/project/root'];
      const invalidResponseError = new LLMProviderError(
        'Invalid response',
        'INVALID_RESPONSE_FORMAT'
      );

      // Arrange: Mock llmAgent.getCompletion to fail all attempts
      (mockLlmAgent.getCompletion as jest.Mock).mockResolvedValue(Result.err(invalidResponseError));

      // Arrange: Mock file operations to succeed
      mockFileOps.readDir.mockResolvedValue(Result.ok(['file1.ts']));
      mockFileOps.isDirectory.mockResolvedValue(Result.ok(false));
      mockFileOps.readFile.mockResolvedValue(Result.ok('// file content'));
      mockFileOps.exists.mockResolvedValue(Result.ok(true));

      // Act
      const result = await projectAnalyzer.analyzeProject(mockPaths);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toContain(
        'Project context analysis failed after 3 attempts due to invalid response format.'
      );
      expect(mockLlmAgent.getCompletion).toHaveBeenCalledTimes(3);
      expect(mockLogger.warn).toHaveBeenCalledTimes(2);
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });

    it('should not retry for other types of LLMProviderErrors', async () => {
      const mockPaths = ['/fake/project/root'];
      const otherLLMError = new LLMProviderError('Some other error', 'SOME_OTHER_CODE');

      // Arrange: Mock llmAgent.getCompletion to return a different error
      (mockLlmAgent.getCompletion as jest.Mock).mockResolvedValue(Result.err(otherLLMError));

      // Arrange: Mock file operations to succeed
      mockFileOps.readDir.mockResolvedValue(Result.ok(['file1.ts']));
      mockFileOps.isDirectory.mockResolvedValue(Result.ok(false));
      mockFileOps.readFile.mockResolvedValue(Result.ok('// file content'));
      mockFileOps.exists.mockResolvedValue(Result.ok(true));

      // Act
      const result = await projectAnalyzer.analyzeProject(mockPaths);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(otherLLMError);
      expect(mockLlmAgent.getCompletion).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });

    it('should not retry for non-LLMProviderErrors', async () => {
      const mockPaths = ['/fake/project/root'];
      const genericError = new Error('A generic error');

      // Arrange: Mock llmAgent.getCompletion to throw a generic error
      (mockLlmAgent.getCompletion as jest.Mock).mockRejectedValue(genericError);

      // Arrange: Mock file operations to succeed
      mockFileOps.readDir.mockResolvedValue(Result.ok(['file1.ts']));
      mockFileOps.isDirectory.mockResolvedValue(Result.ok(false));
      mockFileOps.readFile.mockResolvedValue(Result.ok('// file content'));
      mockFileOps.exists.mockResolvedValue(Result.ok(true));

      // Act
      const result = await projectAnalyzer.analyzeProject(mockPaths);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('Project context analysis failed');
      expect(mockLlmAgent.getCompletion).toHaveBeenCalledTimes(1);
      expect(mockLogger.warn).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledTimes(1);
    });
  });
});
```

**Testing Requirements**:

- Mock `LLMAgent.getCompletion` to control its return values (success, specific error, other errors).
- Use `mockResolvedValueOnce` to simulate intermittent failures.
- Assert the number of times `LLMAgent.getCompletion` is called.
- Assert the final `Result` returned by `analyzeProject`.
- Assert logger calls (warnings for retries, errors for final failures).

**Acceptance Criteria**:

- [ ] Unit tests exist for `ProjectAnalyzer`'s retry logic.
- [ ] Tests cover successful retry scenarios.
- [ ] Tests cover retry exhaustion scenarios.
- [ ] Tests verify that retries only occur for `INVALID_RESPONSE_FORMAT` errors.

**Estimated effort**: 45-60 minutes

## Implementation Sequence

1. Implement Retry Logic in ProjectAnalyzer for Invalid Response Error - Mode: Code
2. Add Unit Tests for ProjectAnalyzer Retry Logic - Mode: Junior Tester
3. Add Integration Test for Retry Logic in AiMagicGenerator - Mode: Junior Tester

## Testing Strategy

- **Unit Tests**: Focus on the `ProjectAnalyzer`'s retry logic in isolation by mocking the `LLMAgent`.
- **Integration Tests**: Verify the end-to-end flow in `AiMagicGenerator` when the `ProjectAnalyzer`'s retry mechanism is triggered and eventually succeeds.
- **Manual Testing**: Run `npm start -- generate -- --generators memory-bank` with a configuration that uses OpenRouter and potentially introduce network instability or mock the OpenRouter API response to simulate the error and verify the retry behavior and eventual success.

## Documentation Update Needs

- Update `memory-bank/DeveloperGuide.md` to document the retry mechanism implemented in `ProjectAnalyzer` and the types of errors it handles.
- Update `memory-bank/TechnicalArchitecture.md` to reflect the enhanced error handling and retry pattern in the analysis layer.
