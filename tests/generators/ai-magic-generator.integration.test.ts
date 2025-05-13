// /* eslint-disable @typescript-eslint/unbound-method */
// import path from 'path'; // Add missing import
// import { AiMagicGenerator } from '@generators/ai-magic-generator';
// import { MemoryBankService } from '@memory-bank/memory-bank-service';
// import { IProjectAnalyzer } from '@core/analysis/types'; // Remove unused ProjectContext type
// import { ILogger } from '@core/services/logger-service'; // Keep ILogger type
// import { createMockLogger } from '../__mocks__/logger.mock'; // Correct path
// import { createMockProjectContext } from '../__mocks__/project-context.mock'; // Correct path
// import { mockContentProcessor } from '../__mocks__/content-processor.mock'; // Import the shared mock instance
// import { IFileOperations } from '@core/file-operations/interfaces';
// import { LLMAgent } from '@core/llm/llm-agent';
// import { LLMProviderError } from '@core/llm/llm-provider-errors'; // Import LLMProviderError
// import { Result } from '@core/result/result';
// import { IServiceContainer } from '@core/di/interfaces';
// import { ProjectConfig } from '../../types/shared'; // Corrected import path
// import { IRulesPromptBuilder } from '@generators/rules/interfaces'; // Import for mock
// // import { IContentProcessor } from '@memory-bank/interfaces'; // Commented out: No longer needed for local mock type

// // Mock dependencies
// let mockLogger: jest.Mocked<ILogger>; // Declare logger

// // Mock only the methods defined in IFileOperations
// const mockFileOps: jest.Mocked<IFileOperations> = {
//   readFile: jest.fn(),
//   writeFile: jest.fn(),
//   createDirectory: jest.fn(),
//   validatePath: jest.fn(),
//   normalizePath: jest.fn(),
//   readDir: jest.fn(),
//   exists: jest.fn(),
//   isDirectory: jest.fn(),
//   copyDirectoryRecursive: jest.fn(),
// };

// // Update mock to match the new IProjectAnalyzer interface
// const mockProjectAnalyzer: jest.Mocked<IProjectAnalyzer> = {
//   analyzeProject: jest.fn(),
// };

// // Revert to 'as any' for complex class mocks if jest.Mocked causes issues
// const mockLlmAgent: LLMAgent = {
//   getCompletion: jest.fn(),
// } as any;

// // Revert to 'as any' for complex class mocks if jest.Mocked causes issues
// const mockMemoryBankService: MemoryBankService = {
//   generateMemoryBank: jest.fn(),
// } as any;

// const mockContainer: IServiceContainer = {
//   // Corrected mock based on IServiceContainer interface
//   initialize: jest.fn(),
//   register: jest.fn(),
//   registerSingleton: jest.fn(),
//   registerFactory: jest.fn(),
//   resolve: jest.fn(),
//   clear: jest.fn(),
// };

// // Mock for RulesPromptBuilder
// const mockRulesPromptBuilder: jest.Mocked<IRulesPromptBuilder> = {
//   buildSystemPrompt: jest.fn(),
//   buildPrompt: jest.fn(),
// };

// // Removed local mock definition for ContentProcessor (lines 65-69)
// // Using shared mock 'mockContentProcessor' imported above

// describe('AiMagicGenerator Integration Tests', () => {
//   let aiMagicGenerator: AiMagicGenerator;

//   // Define mock context at describe level for reuse
//   // Use the factory, astData is removed, codeInsights is added by default
//   const mockProjectContext = createMockProjectContext({
//     techStack: {
//       languages: ['ts'],
//       frameworks: ['react'],
//       buildTools: ['webpack'],
//       testingFrameworks: ['jest'],
//       linters: ['eslint'],
//       packageManager: 'npm',
//     },

//     // codeInsights: {} // Default is {}, override if specific insights needed
//   });

//   beforeEach(() => {
//     // Reset mocks before each test
//     jest.clearAllMocks();
//     mockLogger = createMockLogger(); // Initialize logger mock

//     // Instantiate the generator with mocked dependencies
//     // aiMagicGenerator = new AiMagicGenerator(
//     //   mockContainer,
//     //   mockLogger,
//     //   mockFileOps,
//     //   mockProjectAnalyzer,
//     //   mockLlmAgent, // LLMAgent is used for rules generation now
//     //   mockMemoryBankService,
//     //   mockRulesPromptBuilder, // Add new mock
//     //   mockContentProcessor // Add new mock
//     // );

//     // Mock the consolidated analyzeProject method
//     mockProjectAnalyzer.analyzeProject.mockResolvedValue(Result.ok(mockProjectContext));
//   });

//   it('should call MemoryBankService and generate rules file on successful analysis', async () => {
//     const mockContextPaths = ['/path/to/project'];
//     // Corrected mockConfig to satisfy ProjectConfig interface
//     const mockConfig: ProjectConfig = {
//       name: 'test-project',
//       baseDir: '/path/to/project',
//       rootDir: '/path/to/project/dist',
//       generators: ['ai-magic'],
//     };
//     // mockProjectContext is now defined at the describe level
//     const mockMemoryBankOutputPath = 'memory-bank/output.md';
//     const mockRulesOutputPath = '.roo/rules-code/generated-rules.md';
//     const mockGeneratedRulesContent = '# Generated Rules\n\n- Rule 1';
//     const mockStrippedRulesContent = '# Generated Rules\n\n- Rule 1'; // Assume stripping doesn't change it here

//     // Arrange: Mock analyzeProject to return success
//     // Note: analyzeProject is private, but its underlying calls are mocked above.
//     // If analyzeProject itself needs mocking (e.g., if made protected/public for testing), adjust here.

//     // Arrange: Mock MemoryBankService to return success
//     (mockMemoryBankService.generateMemoryBank as jest.Mock).mockResolvedValue(
//       Result.ok(mockMemoryBankOutputPath)
//     );
//     // Arrange: Mock Rules generation steps to succeed
//     mockRulesPromptBuilder.buildSystemPrompt.mockReturnValue(Result.ok('SYSTEM_PROMPT'));
//     mockRulesPromptBuilder.buildPrompt.mockReturnValue(Result.ok('USER_PROMPT'));
//     (mockLlmAgent.getCompletion as jest.Mock).mockResolvedValue(
//       Result.ok(mockGeneratedRulesContent)
//     );
//     mockContentProcessor.stripMarkdownCodeBlock.mockReturnValue(
//       Result.ok(mockStrippedRulesContent)
//     );
//     (mockFileOps.writeFile as jest.Mock).mockResolvedValue(Result.ok(undefined)); // Mock writeFile success

//     // Act
//     const result = await aiMagicGenerator.generate(mockConfig, mockContextPaths);

//     // Assert
//     expect(result.isOk()).toBe(true);
//     // Assert: Check combined success message
//     expect(result.value).toContain(
//       `Memory Bank generated successfully. ${mockMemoryBankOutputPath}`
//     );
//     // Use path.normalize for cross-platform compatibility and add the expected period
//     const normalizedRulesPath = path.normalize(mockRulesOutputPath);
//     expect(result.value).toContain(`Rules file generated successfully at ${normalizedRulesPath}.`);
//     // Check that the new analyzeProject method was called
//     expect(mockProjectAnalyzer.analyzeProject).toHaveBeenCalledTimes(1);
//     expect(mockProjectAnalyzer.analyzeProject).toHaveBeenCalledWith(mockContextPaths);
//     expect(mockMemoryBankService.generateMemoryBank).toHaveBeenCalledTimes(1);
//     // Deep equality check for the context passed to memory bank service
//     // Expect both context and config arguments
//     expect(mockMemoryBankService.generateMemoryBank).toHaveBeenCalledWith(
//       expect.objectContaining(mockProjectContext),
//       mockConfig
//     );
//     // Assert: Check rules generation calls
//     expect(mockRulesPromptBuilder.buildSystemPrompt).toHaveBeenCalledWith('code');
//     expect(mockRulesPromptBuilder.buildPrompt).toHaveBeenCalledWith(
//       expect.any(String), // instruction
//       expect.any(String), // context string
//       '' // template
//     );
//     expect(mockLlmAgent.getCompletion).toHaveBeenCalledWith('SYSTEM_PROMPT', 'USER_PROMPT');
//     expect(mockContentProcessor.stripMarkdownCodeBlock).toHaveBeenCalledWith(
//       mockGeneratedRulesContent
//     );
//     // Normalize the path for the writeFile assertion
//     expect(mockFileOps.writeFile).toHaveBeenCalledWith(
//       path.normalize(mockRulesOutputPath),
//       mockStrippedRulesContent
//     );

//     // Assert: Check logger calls
//     expect(mockLogger.info).toHaveBeenCalledWith('Starting AI Magic generation process...');
//     expect(mockLogger.info).toHaveBeenCalledWith('Starting Memory Bank Service generation...');
//     expect(mockLogger.info).toHaveBeenCalledWith('Starting Rules file generation...');
//     expect(mockLogger.info).toHaveBeenCalledWith(
//       `Memory Bank Service completed successfully. ${mockMemoryBankOutputPath}`
//     );
//     // Check if any info log contains the success message substring
//     expect(mockLogger.info).toHaveBeenCalledWith(
//       expect.stringContaining(
//         `Rules file generated successfully at ${path.normalize(mockRulesOutputPath)}`
//       )
//     );
//   });

//   it('should return error if project analysis fails', async () => {
//     const mockContextPaths = ['/path/to/project'];
//     const mockConfig: ProjectConfig = {
//       // Corrected mockConfig
//       name: 'test-project',
//       baseDir: '/path/to/project',
//       rootDir: '/path/to/project/dist',
//       generators: ['ai-magic'],
//     };
//     const analysisError = new Error('Analysis failed');

//     // Arrange: Mock the consolidated analyzeProject to fail
//     mockProjectAnalyzer.analyzeProject.mockResolvedValue(Result.err(analysisError));

//     // Act
//     const result = await aiMagicGenerator.generate(mockConfig, mockContextPaths);

//     // Assert
//     expect(result.isErr()).toBe(true);
//     // The error from analyzeProject should be propagated
//     expect(result.error).toBe(analysisError);
//     expect(mockMemoryBankService.generateMemoryBank).not.toHaveBeenCalled();
//     // Logger might log the specific analysis error or a wrapper message depending on implementation
//     expect(mockLogger.error).toHaveBeenCalledWith(
//       expect.stringContaining('Project analysis failed'), // Check if the logger message indicates analysis failure
//       analysisError
//     );
//   });

//   it('should return error if MemoryBankService fails', async () => {
//     const mockContextPaths = ['/path/to/project'];
//     const mockConfig: ProjectConfig = {
//       // Corrected mockConfig
//       name: 'test-project',
//       baseDir: '/path/to/project',
//       rootDir: '/path/to/project/dist',
//       generators: ['ai-magic'],
//     };
//     const memoryBankError = new Error('Memory bank generation failed');
//     // Use the factory-created mock context defined at the describe level
//     // No need to redefine it here

//     // Arrange: Mock analyzeProject to succeed
//     mockProjectAnalyzer.analyzeProject.mockResolvedValue(Result.ok(mockProjectContext));
//     // Arrange: Mock MemoryBankService to return error
//     (mockMemoryBankService.generateMemoryBank as jest.Mock).mockResolvedValue(
//       Result.err(memoryBankError)
//     );

//     // Act
//     const result = await aiMagicGenerator.generate(mockConfig, mockContextPaths);

//     // Assert
//     expect(result.isErr()).toBe(true);
//     // Expect the wrapped error message
//     expect(result.error?.message).toContain('AI Magic generation completed with errors');
//     expect(result.error?.message).toContain(
//       `Memory Bank Service failed: ${memoryBankError.message}`
//     );
//     expect(mockMemoryBankService.generateMemoryBank).toHaveBeenCalledTimes(1);
//     // Expect both context and config arguments
//     expect(mockMemoryBankService.generateMemoryBank).toHaveBeenCalledWith(
//       expect.objectContaining(mockProjectContext),
//       mockConfig
//     );
//     // Expect the more detailed log message from the source code
//     expect(mockLogger.error).toHaveBeenCalledWith(
//       `Memory Bank Service failed: ${memoryBankError.message}`,
//       memoryBankError
//     );
//   });

//   it('should return error if no context paths are provided', async () => {
//     const mockConfig: ProjectConfig = {
//       // Corrected mockConfig
//       name: 'test-project',
//       baseDir: '/path/to/project',
//       rootDir: '/path/to/project/dist',
//       generators: ['ai-magic'],
//     };

//     // Act
//     const result = await aiMagicGenerator.generate(mockConfig, []); // Empty context paths

//     // Assert
//     expect(result.isErr()).toBe(true);
//     expect(result.error?.message).toBe('No context path provided for analysis');
//     // analyzeProject should not be called if paths are empty
//     expect(mockProjectAnalyzer.analyzeProject).not.toHaveBeenCalled();
//     expect(mockMemoryBankService.generateMemoryBank).not.toHaveBeenCalled();
//   });

//   it('should return error if rules generation fails but memory bank succeeds', async () => {
//     const mockContextPaths = ['/path/to/project'];
//     const mockConfig: ProjectConfig = {
//       name: 'test-project',
//       baseDir: '/path/to/project',
//       rootDir: '/path/to/project/dist',
//       generators: ['ai-magic'],
//     };
//     const mockMemoryBankOutputPath = 'memory-bank/output.md';
//     const rulesGenError = new Error('LLM failed for rules');

//     // Arrange: Mock analysis to succeed (Ensure mockProjectContext is accessible)
//     mockProjectAnalyzer.analyzeProject.mockResolvedValue(Result.ok(mockProjectContext));
//     // Arrange: Mock MemoryBankService to succeed
//     (mockMemoryBankService.generateMemoryBank as jest.Mock).mockResolvedValue(
//       Result.ok(mockMemoryBankOutputPath)
//     );
//     // Arrange: Mock Rules generation steps to fail at LLM call
//     mockRulesPromptBuilder.buildSystemPrompt.mockReturnValue(Result.ok('SYSTEM_PROMPT'));
//     mockRulesPromptBuilder.buildPrompt.mockReturnValue(Result.ok('USER_PROMPT'));
//     (mockLlmAgent.getCompletion as jest.Mock).mockResolvedValue(Result.err(rulesGenError));

//     // Act
//     const result = await aiMagicGenerator.generate(mockConfig, mockContextPaths); // Use the instance variable

//     // Assert
//     expect(result.isErr()).toBe(true);
//     expect(result.error?.message).toContain('Rules file generation failed');
//     expect(result.error?.message).toContain(rulesGenError.message);
//     expect(mockMemoryBankService.generateMemoryBank).toHaveBeenCalledTimes(1); // Memory bank should still be called
//     expect(mockLlmAgent.getCompletion).toHaveBeenCalledTimes(1); // LLM for rules was called
//     expect(mockFileOps.writeFile).not.toHaveBeenCalled(); // Rules file shouldn't be written
//     expect(mockLogger.error).toHaveBeenCalledWith(
//       expect.stringContaining('Rules file generation failed'),
//       expect.any(Error) // The wrapped error
//     );
//     // Check for the specific error log related to rules generation failure
//     expect(mockLogger.error).toHaveBeenCalledWith(
//       // Expect the full nested error message prefix
//       expect.stringContaining(
//         `Rules file generation failed: LLM failed to generate rules content: ${rulesGenError.message}`
//       ),
//       expect.any(Error) // The wrapped error from the rules generation step
//     );
//     // We can also check that the overall error was returned, if needed:
//     // expect(result.error?.message).toContain('AI Magic generation completed with errors');
//   });
//   it('should successfully generate rules after retrying on invalid response format errors', async () => {
//     const mockContextPaths = ['/path/to/project'];
//     const mockConfig: ProjectConfig = {
//       name: 'test-project',
//       baseDir: '/path/to/project',
//       rootDir: '/path/to/project/dist',
//       generators: ['ai-magic'],
//     };
//     const mockMemoryBankOutputPath = 'memory-bank/output.md';
//     const mockRulesOutputPath = '.roo/rules-code/generated-rules.md';
//     const mockGeneratedRulesContent = '# Generated Rules\n\n- Rule 1';
//     const mockStrippedRulesContent = '# Generated Rules\n\n- Rule 1';

//     // Arrange: Mock analysis to succeed
//     mockProjectAnalyzer.analyzeProject.mockResolvedValue(Result.ok(mockProjectContext));
//     // Arrange: Mock MemoryBankService to succeed
//     (mockMemoryBankService.generateMemoryBank as jest.Mock).mockResolvedValue(
//       Result.ok(mockMemoryBankOutputPath)
//     );

//     // Arrange: Mock Rules generation steps with retries
//     mockRulesPromptBuilder.buildSystemPrompt.mockReturnValue(Result.ok('SYSTEM_PROMPT'));
//     mockRulesPromptBuilder.buildPrompt.mockReturnValue(Result.ok('USER_PROMPT'));

//     // Mock LLMAgent.getCompletion to fail twice with INVALID_RESPONSE_FORMAT, then succeed
//     const invalidFormatError = new LLMProviderError(
//       'Invalid response format',
//       'INVALID_RESPONSE_FORMAT',
//       'OpenRouterProvider' // Add the provider name
//     );
//     (mockLlmAgent.getCompletion as jest.Mock)
//       .mockResolvedValueOnce(Result.err(invalidFormatError)) // First attempt fails
//       .mockResolvedValueOnce(Result.err(invalidFormatError)) // Second attempt fails
//       .mockResolvedValueOnce(Result.ok(mockGeneratedRulesContent)); // Third attempt succeeds

//     mockContentProcessor.stripMarkdownCodeBlock.mockReturnValue(
//       Result.ok(mockStrippedRulesContent)
//     );
//     (mockFileOps.writeFile as jest.Mock).mockResolvedValue(Result.ok(undefined)); // Mock writeFile success

//     // Act
//     const result = await aiMagicGenerator.generate(mockConfig, mockContextPaths);

//     // Assert
//     expect(result.isOk()).toBe(true);
//     expect(result.value).toContain(
//       `Memory Bank generated successfully. ${mockMemoryBankOutputPath}`
//     );
//     const normalizedRulesPath = path.normalize(mockRulesOutputPath);
//     expect(result.value).toContain(`Rules file generated successfully at ${normalizedRulesPath}.`);

//     // Verify that LLMAgent.getCompletion was called the expected number of times (initial + 2 retries)
//     expect(mockLlmAgent.getCompletion).toHaveBeenCalledTimes(3);

//     // Verify other successful generation steps were called
//     expect(mockProjectAnalyzer.analyzeProject).toHaveBeenCalledTimes(1);
//     expect(mockMemoryBankService.generateMemoryBank).toHaveBeenCalledTimes(1);
//     expect(mockRulesPromptBuilder.buildSystemPrompt).toHaveBeenCalledTimes(1);
//     expect(mockRulesPromptBuilder.buildPrompt).toHaveBeenCalledTimes(1);
//     expect(mockContentProcessor.stripMarkdownCodeBlock).toHaveBeenCalledTimes(1);
//     expect(mockFileOps.writeFile).toHaveBeenCalledTimes(1);

//     // Verify logger calls for retries (optional, but good for confidence)
//     expect(mockLogger.warn).toHaveBeenCalledWith(
//       expect.stringContaining('LLM call failed with INVALID_RESPONSE_FORMAT. Retrying...')
//     );
//     expect(mockLogger.warn).toHaveBeenCalledTimes(2); // Should log warning for each retry attempt
//   });
// });
