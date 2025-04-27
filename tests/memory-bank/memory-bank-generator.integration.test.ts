/* eslint-disable @typescript-eslint/unbound-method */
import 'reflect-metadata';
import { Container } from '@/core/di/container';
import { MemoryBankGenerator } from '@/memory-bank/memory-bank-generator';
import {
  IContentProcessor,
  IMemoryBankContentGenerator,
  IMemoryBankFileManager,
  IMemoryBankOrchestrator,
  IMemoryBankTemplateManager,
  IMemoryBankTemplateProcessor,
  IMemoryBankValidator,
  IProjectContextService,
  IPromptBuilder,
  // MemoryBankFileType, // Removed as unused in this test file
} from '@/memory-bank/interfaces';
import { MemoryBankGenerationError } from '@/core/errors/memory-bank-errors'; // Keep for error checking if needed later
import { ILogger } from '@/core/services/logger-service';
import { LLMAgent } from '@/core/llm/llm-agent';
import { IProjectConfigService } from '@/core/config/interfaces';
import { FileOperations } from '@/core/file-operations/file-operations'; // Real implementation
import { IFileOperations } from '@/core/file-operations/interfaces';
import { ContentProcessor } from '@/memory-bank/content-processor'; // Real implementation
import { MemoryBankFileManager } from '@/memory-bank/memory-bank-file-manager'; // Real implementation
import { MemoryBankTemplateManager } from '@/memory-bank/memory-bank-template-manager'; // Real implementation
import { MemoryBankTemplateProcessor } from '@/memory-bank/memory-bank-template-processor'; // Real implementation
import { MemoryBankValidator } from '@/memory-bank/memory-bank-validator'; // Real implementation
import { ProjectContextService } from '@/memory-bank/project-context-service'; // Real implementation
import { PromptBuilder } from '@/memory-bank/prompt-builder'; // Real implementation
import { MemoryBankContentGenerator } from '@/memory-bank/memory-bank-content-generator'; // Real implementation
import { MemoryBankOrchestrator } from '@/memory-bank/memory-bank-orchestrator'; // Real implementation
import * as fs from 'fs-extra';
import * as path from 'path';
import { Result } from '@/core/result/result';
// Define a type for the combined config structure expected by components
// This might differ from the base ProjectConfig in types/shared.ts
// Adjust based on actual structure used after config loading/merging
type CombinedProjectConfig = {
  baseDir: string; // Changed from projectRoot to baseDir
  memoryBank: {
    outputDir: string;
    useTemplates: boolean;
    templatesDir: string;
    generateProjectOverview: boolean;
    generateTechnicalArchitecture: boolean;
    generateDeveloperGuide: boolean;
    exclusions: string[];
    fileTypes: { include: string[]; exclude: string[] };
  };
  llm: {
    provider: string;
    model: string;
    apiKey: string;
    maxTokens?: number;
    temperature?: number;
  };
  // Add other sections if needed (e.g., rules, systemPrompts)
};

// --- Mocks ---
const mockLlmAgent: jest.Mocked<LLMAgent> = {
  getCompletion: jest.fn(),
  analyzeProject: jest.fn(),
} as unknown as jest.Mocked<LLMAgent>;

const mockLogger: jest.Mocked<ILogger> = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Define a mock CombinedProjectConfig object
// Use 'any' temporarily if the exact structure is complex or unknown, refine later
const mockCombinedConfig: CombinedProjectConfig = {
  baseDir: process.cwd(), // Changed from projectRoot to baseDir
  memoryBank: {
    outputDir: '', // Will be set in beforeEach
    useTemplates: true,
    templatesDir: '', // Will be set in beforeEach
    generateProjectOverview: true,
    generateTechnicalArchitecture: true,
    generateDeveloperGuide: true,
    exclusions: [],
    fileTypes: { include: ['**/*'], exclude: [] },
  },
  llm: { provider: 'openai', model: 'gpt-4', apiKey: 'test-key' }, // Example LLM config
};

// Mock IProjectConfigService according to its interface
const mockProjectConfigService: jest.Mocked<IProjectConfigService> = {
  // Mock loadConfig to return the combined structure
  loadConfig: jest.fn().mockResolvedValue(Result.ok(mockCombinedConfig as any)), // Use 'as any' if type mismatch persists, investigate further if needed
  saveConfig: jest.fn().mockResolvedValue(Result.ok(undefined)),
  validateConfig: jest.fn().mockReturnValue(null),
};

// --- Test Suite ---
describe('MemoryBankGenerator Integration Tests', () => {
  let isolatedContainer: Container;
  let memoryBankGenerator: MemoryBankGenerator;
  const outputDir = path.join(__dirname, '..', '..', 'test-output', 'memory-bank-integration');
  const templatesFixtureDir = path.join(__dirname, '..', 'fixtures', 'memory-bank', 'templates');
  // const markdownFixtureDir = path.join( // Removed as unused
  //   __dirname,
  //   '..',
  //   'fixtures', // Removed dangling comma
  //   'memory-bank',
  //   'markdown-samples'
  // ); // Ensure closing parenthesis is correct

  // Helper to resolve dependencies from the isolated container
  const resolveDependency = <T>(token: string): T => {
    const result = isolatedContainer.resolve<T>(token);
    if (result.isErr()) {
      // Use non-null assertion as isErr() guarantees error is defined
      const errorMsg = `DI Error resolving ${token}: ${result.error!.message}`;
      // Log the original error cause if available
      const cause = (result.error as any)?.cause;
      console.error(errorMsg, cause || result.error!);
      // Throw a new error, potentially wrapping the original
      throw new Error(errorMsg, { cause: cause || result.error! });
    }
    // Add explicit check for undefined value, although resolve should guarantee T on Ok
    if (result.value === undefined || result.value === null) {
      throw new Error(`DI resolved null or undefined for token: ${token}`);
    }
    // Type assertion is safe here due to the checks above
    return result.value as T;
  };

  beforeAll(() => {
    // No async needed here unless registration itself is async
    // Use the singleton instance and clear it for isolation
    isolatedContainer = Container.getInstance();
    isolatedContainer.clear(); // Clear any state from previous test suites

    // --- Register Mocks ---
    isolatedContainer.registerFactory<ILogger>('ILogger', () => mockLogger);
    isolatedContainer.registerFactory<LLMAgent>('LLMAgent', () => mockLlmAgent);
    isolatedContainer.registerFactory<IProjectConfigService>(
      'IProjectConfigService',
      () => mockProjectConfigService
    );

    // --- Register Real Implementations ---
    isolatedContainer.registerFactory<IFileOperations>('IFileOperations', () => {
      // FileOperations requires ILogger
      const logger = resolveDependency<ILogger>('ILogger');
      return new FileOperations(logger);
    });

    isolatedContainer.registerFactory<IContentProcessor>('IContentProcessor', () => {
      const logger = resolveDependency<ILogger>('ILogger');
      return new ContentProcessor(logger);
    });

    isolatedContainer.registerFactory<IMemoryBankValidator>('IMemoryBankValidator', () => {
      const fileOps = resolveDependency<IFileOperations>('IFileOperations');
      const logger = resolveDependency<ILogger>('ILogger');
      // Validator might need config, ensure mockProjectConfigService provides it via loadConfig
      return new MemoryBankValidator(fileOps, logger);
    });

    isolatedContainer.registerFactory<IProjectContextService>('IProjectContextService', () => {
      const fileOps = resolveDependency<IFileOperations>('IFileOperations');
      const projectConfigService =
        resolveDependency<IProjectConfigService>('IProjectConfigService');
      const logger = resolveDependency<ILogger>('ILogger');
      // ProjectContextService uses the config service, relies on loadConfig mock
      return new ProjectContextService(fileOps, projectConfigService, logger);
    });

    isolatedContainer.registerFactory<IPromptBuilder>('IPromptBuilder', () => {
      const logger = resolveDependency<ILogger>('ILogger');
      return new PromptBuilder(logger);
    });

    isolatedContainer.registerFactory<IMemoryBankFileManager>('IMemoryBankFileManager', () => {
      const fileOps = resolveDependency<IFileOperations>('IFileOperations');
      const logger = resolveDependency<ILogger>('ILogger');
      return new MemoryBankFileManager(fileOps, logger);
    });

    isolatedContainer.registerFactory<IMemoryBankTemplateManager>(
      'IMemoryBankTemplateManager',
      () => {
        const fileOps = resolveDependency<IFileOperations>('IFileOperations');
        const logger = resolveDependency<ILogger>('ILogger');
        return new MemoryBankTemplateManager(fileOps, logger);
      }
    );

    isolatedContainer.registerFactory<IMemoryBankTemplateProcessor>(
      'IMemoryBankTemplateProcessor',
      () => {
        const templateManager = resolveDependency<IMemoryBankTemplateManager>(
          'IMemoryBankTemplateManager'
        );
        const logger = resolveDependency<ILogger>('ILogger');
        return new MemoryBankTemplateProcessor(templateManager, logger);
      }
    );

    isolatedContainer.registerFactory<IMemoryBankContentGenerator>(
      'IMemoryBankContentGenerator',
      () => {
        const llmAgent = resolveDependency<LLMAgent>('LLMAgent'); // Gets the mock LLM Agent
        const promptBuilder = resolveDependency<IPromptBuilder>('IPromptBuilder');
        const contentProcessor = resolveDependency<IContentProcessor>('IContentProcessor');
        const logger = resolveDependency<ILogger>('ILogger');
        return new MemoryBankContentGenerator(llmAgent, promptBuilder, contentProcessor, logger);
      }
    );

    isolatedContainer.registerFactory<IMemoryBankOrchestrator>('IMemoryBankOrchestrator', () => {
      const templateProcessor = resolveDependency<IMemoryBankTemplateProcessor>(
        'IMemoryBankTemplateProcessor'
      );
      const contentGenerator = resolveDependency<IMemoryBankContentGenerator>(
        'IMemoryBankContentGenerator'
      );
      const fileManager = resolveDependency<IMemoryBankFileManager>('IMemoryBankFileManager');
      const logger = resolveDependency<ILogger>('ILogger');
      return new MemoryBankOrchestrator(templateProcessor, contentGenerator, fileManager, logger);
    });

    isolatedContainer.registerFactory<MemoryBankGenerator>('MemoryBankGenerator', () => {
      const validator = resolveDependency<IMemoryBankValidator>('IMemoryBankValidator');
      const orchestrator = resolveDependency<IMemoryBankOrchestrator>('IMemoryBankOrchestrator');
      const logger = resolveDependency<ILogger>('ILogger');
      const projectConfigService =
        resolveDependency<IProjectConfigService>('IProjectConfigService');
      const projectContextService =
        resolveDependency<IProjectContextService>('IProjectContextService');
      return new MemoryBankGenerator(
        isolatedContainer, // Pass container if needed, otherwise remove
        validator,
        orchestrator,
        logger,
        projectConfigService,
        projectContextService
      );
    });

    // Initialize the isolated container
    isolatedContainer.initialize();
  });

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Update mockCombinedConfig paths for this specific test run
    mockCombinedConfig.memoryBank.outputDir = outputDir;
    mockCombinedConfig.memoryBank.templatesDir = templatesFixtureDir;
    mockCombinedConfig.baseDir = process.cwd(); // Changed from projectRoot to baseDir

    // Ensure loadConfig mock returns the updated mockCombinedConfig object for this test
    // Use 'as any' temporarily if type issues persist with the CombinedProjectConfig structure
    mockProjectConfigService.loadConfig.mockResolvedValue(Result.ok(mockCombinedConfig as any));

    // Clean and ensure output directory
    await fs.remove(outputDir);
    await fs.ensureDir(outputDir);

    // Resolve the generator instance using the helper
    memoryBankGenerator = resolveDependency<MemoryBankGenerator>('MemoryBankGenerator');
  });

  afterAll(async () => {
    // Clean up the output directory
    await fs.remove(outputDir);
    // Clear the isolated container
    isolatedContainer.clear();
  });

  // --- Test Cases Will Go Here ---

  it('should correctly copy basic templates when enabled', async () => {
    // Arrange
    mockCombinedConfig.memoryBank.useTemplates = true; // Ensure templates are enabled
    mockProjectConfigService.loadConfig.mockResolvedValue(Result.ok(mockCombinedConfig as any));
    // Mock LLM to return simple content for one file type
    mockLlmAgent.getCompletion.mockResolvedValue(Result.ok('```markdown\nOverview Content\n```'));

    // Act
    // Call executeGeneration with the mock config
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const result = await memoryBankGenerator.executeGeneration(mockCombinedConfig as any);

    // Assert
    expect(result.isOk()).toBe(true);
    // Check if template files were copied to outputDir
    const copiedBasicTemplatePath = path.join(outputDir, 'templates', 'basic-template.txt');
    const copiedNestedTemplatePath = path.join(
      outputDir,
      'templates',
      'nested',
      'nested-template.md'
    );
    expect(fs.pathExistsSync(copiedBasicTemplatePath)).toBe(true); // Use sync version for simplicity in tests
    expect(fs.pathExistsSync(copiedNestedTemplatePath)).toBe(true); // Use sync version
    // Check content of copied files (optional but good)
    const basicContent = await fs.readFile(copiedBasicTemplatePath, 'utf-8');
    expect(basicContent).toContain('basic template file');
    const nestedContent = await fs.readFile(copiedNestedTemplatePath, 'utf-8');
    expect(nestedContent).toContain('Nested Template');
  });

  it('should not copy templates when disabled in config', async () => {
    // Arrange
    mockCombinedConfig.memoryBank.useTemplates = false; // Disable templates
    mockProjectConfigService.loadConfig.mockResolvedValue(Result.ok(mockCombinedConfig as any));
    mockLlmAgent.getCompletion.mockResolvedValue(Result.ok('```markdown\nOverview Content\n```'));

    // Act
    // Call executeGeneration with the mock config
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const result = await memoryBankGenerator.executeGeneration(mockCombinedConfig as any);

    // Assert
    expect(result.isOk()).toBe(true);
    // Check that the templates directory was NOT created in outputDir
    const copiedTemplatesDirPath = path.join(outputDir, 'templates');
    expect(fs.pathExistsSync(copiedTemplatesDirPath)).toBe(false); // Use sync version
  });

  it('should generate content with stripped markdown', async () => {
    // Arrange
    mockCombinedConfig.memoryBank.useTemplates = false; // Disable templates for focus
    mockProjectConfigService.loadConfig.mockResolvedValue(Result.ok(mockCombinedConfig as any));
    const rawLlmContent = `
 Some preamble.
 \`\`\`typescript
 function hello() {
   console.log('World');
 }
 \`\`\`
 Some postamble.`;
    const expectedStrippedContent = `
 Some preamble.
 function hello() {
   console.log('World');
 }
 Some postamble.`;
    mockLlmAgent.getCompletion.mockResolvedValue(Result.ok(rawLlmContent));

    // Act
    // Call executeGeneration with the mock config
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const result = await memoryBankGenerator.executeGeneration(mockCombinedConfig as any);

    // Assert
    expect(result.isOk()).toBe(true);
    // Check if generated files exist and have stripped content
    const overviewPath = path.join(outputDir, 'ProjectOverview.md');
    // Add checks for other generated files (TechnicalArchitecture, DeveloperGuide)
    expect(fs.pathExistsSync(overviewPath)).toBe(true); // Use sync version
    const overviewContent = await fs.readFile(overviewPath, 'utf-8');
    // Normalize whitespace for comparison if needed
    expect(overviewContent.trim()).toBe(expectedStrippedContent.trim());
    // Verify LLM was called for each enabled file type

    expect(mockLlmAgent.getCompletion).toHaveBeenCalledTimes(3); // Overview, Arch, DevGuide
  });

  it('should handle LLM failure gracefully during generation', async () => {
    // Arrange
    mockCombinedConfig.memoryBank.useTemplates = false;
    mockProjectConfigService.loadConfig.mockResolvedValue(Result.ok(mockCombinedConfig as any));
    const llmError = new Error('LLM API Timeout');
    // Fail only the second call (e.g., TechnicalArchitecture)
    mockLlmAgent.getCompletion
      .mockResolvedValueOnce(Result.ok('```markdown\nOverview OK\n```')) // ProjectOverview
      .mockResolvedValueOnce(Result.err(llmError)) // TechnicalArchitecture fails
      .mockResolvedValueOnce(Result.ok('```markdown\nDevGuide OK\n```')); // DeveloperGuide

    // Act
    // Call executeGeneration with the mock config
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const result = await memoryBankGenerator.executeGeneration(mockCombinedConfig as any);

    // Assert
    // The orchestrator now returns Ok even if one LLM call fails, as long as others succeed.
    // We verify the overall operation is considered Ok, but the specific error was logged.
    expect(result.isOk()).toBe(true);
    // We expect the orchestrator to log the specific LLM failure.
    // The generator itself might not return the specific LLM error if other steps succeeded.
    // Check logger instead of result.error for the specific LLM failure message.
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('LLM invocation failed for TechnicalArchitecture'),
      expect.any(MemoryBankGenerationError) // Match the error type
    );
    // Check cause by finding the relevant log call (more robust)
    const llmErrorLogCall = mockLogger.error.mock.calls.find((call) =>
      call[0].includes('LLM invocation failed for TechnicalArchitecture')
    );
    expect(llmErrorLogCall).toBeDefined();
    expect(llmErrorLogCall?.[1]?.cause).toBe(llmError); // Check the cause in the logged error

    // Check that files that succeeded before the error were still created
    const overviewPath = path.join(outputDir, 'ProjectOverview.md');
    expect(fs.pathExistsSync(overviewPath)).toBe(true); // Use sync version
    const overviewContent = await fs.readFile(overviewPath, 'utf-8');
    expect(overviewContent).toContain('Overview OK');

    // Check that the file that failed was not created
    const archPath = path.join(outputDir, 'TechnicalArchitecture.md');
    expect(fs.pathExistsSync(archPath)).toBe(false); // Use sync version

    // Check that generation CONTINUED for subsequent files that succeeded
    const devGuidePath = path.join(outputDir, 'DeveloperGuide.md');
    expect(fs.pathExistsSync(devGuidePath)).toBe(true); // Use sync version
    const devGuideContent = await fs.readFile(devGuidePath, 'utf-8');
    expect(devGuideContent).toContain('DevGuide OK'); // Check content

    // The check for the logger call is now done above.
  });

  it('should handle template copying failure gracefully', async () => {
    // Arrange
    mockCombinedConfig.memoryBank.useTemplates = true;
    // Simulate fs.copy failure by pointing templatesDir to a non-existent path
    mockCombinedConfig.memoryBank.templatesDir = path.join(__dirname, 'non-existent-template-dir');
    mockProjectConfigService.loadConfig.mockResolvedValue(Result.ok(mockCombinedConfig as any));
    mockLlmAgent.getCompletion.mockResolvedValue(Result.ok('```markdown\nContent OK\n```'));

    // Act
    // Call executeGeneration with the mock config
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const result = await memoryBankGenerator.executeGeneration(mockCombinedConfig as any);

    // Assert
    // The orchestrator currently logs the error but continues generation
    expect(result.isOk()).toBe(true); // Generation itself succeeds

    // Verify the specific MemoryBankGenerationError from the orchestrator was logged
    const orchestratorErrorLog = mockLogger.error.mock.calls.find(
      (call) =>
        call[0].includes('Failed to copy templates directory') &&
        call[1] instanceof MemoryBankGenerationError
    );
    expect(orchestratorErrorLog).toBeDefined();
    // Optionally check the cause or context if needed, casting to the specific error type
    expect((orchestratorErrorLog?.[1] as MemoryBankGenerationError)?.context?.source).toBe(
      mockCombinedConfig.memoryBank.templatesDir
    );

    // Verify content generation still happened
    const overviewPath = path.join(outputDir, 'ProjectOverview.md');
    expect(fs.pathExistsSync(overviewPath)).toBe(true); // Use sync version
    const overviewContent = await fs.readFile(overviewPath, 'utf-8');
    expect(overviewContent).toContain('Content OK');
    // Verify templates directory was not created in output
    const copiedTemplatesDirPath = path.join(outputDir, 'templates');
    expect(fs.pathExistsSync(copiedTemplatesDirPath)).toBe(false); // Use sync version
  });
});
