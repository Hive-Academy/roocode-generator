// import { AiMagicGenerator } from '../../src/generators/ai-magic-generator';
// import { ILogger } from '../../src/core/services/logger-service';
// import {
//   ProjectContext,
//   IProjectAnalyzer,
//   TechStackAnalysis,
//   PackageJsonMinimal,
// } from '../../src/core/analysis/types';
// import {
//   CodeInsights,
//   FunctionInfo,
//   ClassInfo,
//   ImportInfo,
// } from '../../src/core/analysis/ast-analysis.interfaces'; // Added FunctionInfo, ClassInfo, ImportInfo
// import { Result } from '../../src/core/result/result';
// import { IFileOperations } from '../../src/core/file-operations/interfaces';
// import { LLMAgent } from '../../src/core/llm/llm-agent';
// import { MemoryBankService } from '../../src/memory-bank/memory-bank-service';
// import { IRulesPromptBuilder } from '../../src/generators/rules/interfaces';
// import { IContentProcessor } from '../../src/memory-bank/interfaces';
// import { IServiceContainer } from '../../src/core/di/interfaces';
// import { RooFileOpsHelper } from '../../src/generators/roo-file-ops-helper';
// import { IRoomodesService } from '../../src/core/services/roomodes.service';
// import { Dirent } from 'fs';
// import { MarkdownListParser } from '../../src/core/utils/markdown-list-parser';
// import { ProjectConfig } from '../../types/shared'; // Added for mockOptions
// import path from 'path'; // Added for path.join in assertions

// // Mock implementations
// const mockLogger: ILogger = {
//   trace: jest.fn(),
//   debug: jest.fn(),
//   verbose: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// const mockFileOperations: jest.Mocked<IFileOperations> = {
//   readFile: jest.fn(),
//   writeFile: jest.fn(),
//   createDirectory: jest.fn(),
//   validatePath: jest.fn(),
//   normalizePath: jest.fn(),
//   readDir: jest.fn().mockResolvedValue(Result.ok([]) as Result<Dirent[], Error>),
//   exists: jest.fn(),
//   isDirectory: jest.fn(),
//   copyDirectoryRecursive: jest.fn(),
// } as jest.Mocked<IFileOperations>;

// const mockProjectAnalyzer: jest.Mocked<IProjectAnalyzer> = {
//   analyzeProject: jest.fn(),
// } as jest.Mocked<IProjectAnalyzer>;

// const mockLLMAgent: jest.Mocked<LLMAgent> = {
//   getCompletion: jest.fn(),
//   getStructuredCompletion: jest.fn(),
//   getModelContextWindow: jest.fn(),
//   countTokens: jest.fn(),
//   getProvider: jest.fn(),
// } as unknown as jest.Mocked<LLMAgent>;

// const mockMemoryBankService: jest.Mocked<MemoryBankService> = {
//   generateMemoryBank: jest.fn(),
//   queryMemoryBank: jest.fn(),
//   updateMemoryBankEntry: jest.fn(),
//   deleteMemoryBankEntry: jest.fn(),
// } as unknown as jest.Mocked<MemoryBankService>;

// const mockRulesPromptBuilder: jest.Mocked<IRulesPromptBuilder> = {
//   buildSystemPrompt: jest.fn(),
//   buildUserPrompt: jest.fn(),
//   buildPrompt: jest.fn(),
// } as jest.Mocked<IRulesPromptBuilder>;

// const mockContentProcessor: jest.Mocked<IContentProcessor> = {
//   stripMarkdownCodeBlock: jest.fn(),
//   stripHtmlComments: jest.fn(),
//   processTemplate: jest.fn(),
//   extractCodeBlocks: jest.fn(),
// } as jest.Mocked<IContentProcessor>;

// const mockServiceContainer: jest.Mocked<IServiceContainer> = {
//   initialize: jest.fn(),
//   register: jest.fn(),
//   registerSingleton: jest.fn(),
//   registerFactory: jest.fn(),
//   resolve: jest.fn(),
//   clear: jest.fn(),
// } as jest.Mocked<IServiceContainer>;

// const mockRooFileOpsHelper: jest.Mocked<RooFileOpsHelper> = {
//   listAndFilterModeFiles: jest.fn(),
//   readRooRulesFile: jest.fn(),
//   readModeTemplateFile: jest.fn(),
// } as unknown as jest.Mocked<RooFileOpsHelper>;

// const mockRoomodesService: jest.Mocked<IRoomodesService> = {
//   generateStaticRoomodesFile: jest.fn(),
//   getRoomodeConfig: jest.fn(),
//   listRoomodes: jest.fn(),
// } as jest.Mocked<IRoomodesService>;

// describe('AiMagicGenerator', () => {
//   let generator: AiMagicGenerator;

//   beforeEach(() => {
//     jest.clearAllMocks();

//     generator = new AiMagicGenerator(
//       mockServiceContainer,
//       mockLogger,
//       mockFileOperations,
//       mockProjectAnalyzer,
//       mockLLMAgent,
//       mockMemoryBankService,
//       mockRulesPromptBuilder,
//       mockContentProcessor,
//       mockRooFileOpsHelper,
//       mockRoomodesService
//     );
//   });

//   describe('buildModeRooPrompt (Refactored)', () => {
//     // Mocks for CodeInsights components
//     const mockFunctionInfo: FunctionInfo = { name: 'mockFunction', parameters: ['param1'] };
//     const mockClassInfo: ClassInfo = { name: 'MockClass' };
//     const mockImportInfo: ImportInfo = { source: './mock-module' };

//     const mockCodeInsights: CodeInsights = {
//       functions: [mockFunctionInfo],
//       classes: [mockClassInfo],
//       imports: [mockImportInfo],
//     };

//     const mockTechStack: TechStackAnalysis = {
//       languages: ['TypeScript'],
//       frameworks: ['Jest'],
//       buildTools: ['tsc'],
//       testingFrameworks: ['Jest'],
//       linters: ['ESLint'],
//       packageManager: 'npm',
//     };

//     const mockPackageJson: PackageJsonMinimal = {
//       name: 'test-project',
//       version: '1.0.0',
//       dependencies: { 'some-dep': '1.0.0' },
//       devDependencies: { jest: '29.0.0' },
//     };

//     const mockProjectContext: ProjectContext = {
//       projectRootPath: '/test/project',
//       techStack: mockTechStack,
//       packageJson: mockPackageJson,
//       codeInsights: {
//         'src/someFile.ts': mockCodeInsights,
//       },
//     };

//     const rooRulesContent = 'General rule 1\nGeneral rule 2';
//     const modeTemplateContent = 'Mode specific rule A\nMode specific rule B';
//     const modeName = 'testMode';

//     it('should correctly construct the systemPrompt and call logger.debug', () => {
//       const result = (generator as any).buildModeRooPrompt(
//         mockProjectContext,
//         rooRulesContent,
//         modeTemplateContent,
//         modeName
//       );

//       expect(result.isOk()).toBe(true);
//       if (result.isOk()) {
//         expect(result.value.systemPrompt).toBe(rooRulesContent + '\n' + modeTemplateContent);
//       }
//       // eslint-disable-next-line @typescript-eslint/unbound-method
//       expect(mockLogger.debug).toHaveBeenCalledWith(
//         `Building prompts for mode "${modeName}" with combined base content.`
//       );
//       // eslint-disable-next-line @typescript-eslint/unbound-method
//       expect(mockLogger.debug).toHaveBeenCalledWith(
//         `System prompt for mode "${modeName}" is the combined base content.`
//       );
//     });

//     it('should correctly construct the userPrompt with modeName interpolation and call logger.debug', () => {
//       const result = (generator as any).buildModeRooPrompt(
//         mockProjectContext,
//         rooRulesContent,
//         modeTemplateContent,
//         modeName
//       );
//       expect(result.isOk()).toBe(true);
//       if (result.isOk()) {
//         const expectedUserPrompt = `Based on the context provided in the system prompt (which includes general rules and mode-specific guidelines for "${modeName}"), generate an additional markdown list of AT LEAST 100 new, distinct, actionable rules. These new rules should expand upon the provided context, incorporating principles like KISS (Keep It Simple, Stupid), SOLID, OOP (Object-Oriented Programming), and DRY (Don't Repeat Yourself). Your response MUST consist *only* of this new markdown list. Each rule in the list should start with '- ' or '* '. Do not include any introductory text, concluding remarks, or code blocks.`;
//         expect(result.value.userPrompt).toBe(expectedUserPrompt);
//       }
//       // eslint-disable-next-line @typescript-eslint/unbound-method
//       expect(mockLogger.debug).toHaveBeenCalledWith(
//         `User prompt for mode "${modeName}" instructs generation of rule list only.`
//       );
//     });

//     it('should return Result.ok() with correctly constructed prompts on success', () => {
//       const result = (generator as any).buildModeRooPrompt(
//         mockProjectContext,
//         rooRulesContent,
//         modeTemplateContent,
//         modeName
//       );

//       expect(result.isOk()).toBe(true);
//       if (result.isOk()) {
//         const expectedSystemPrompt = rooRulesContent + '\n' + modeTemplateContent;
//         const expectedUserPrompt = `Based on the context provided in the system prompt (which includes general rules and mode-specific guidelines for "${modeName}"), generate an additional markdown list of AT LEAST 100 new, distinct, actionable rules. These new rules should expand upon the provided context, incorporating principles like KISS (Keep It Simple, Stupid), SOLID, OOP (Object-Oriented Programming), and DRY (Don't Repeat Yourself). Your response MUST consist *only* of this new markdown list. Each rule in the list should start with '- ' or '* '. Do not include any introductory text, concluding remarks, or code blocks.`;
//         expect(result.value.systemPrompt).toBe(expectedSystemPrompt);
//         expect(result.value.userPrompt).toBe(expectedUserPrompt);
//         expect(result.value).toEqual({
//           systemPrompt: expectedSystemPrompt,
//           userPrompt: expectedUserPrompt,
//         });
//       }
//     });

//     it('should return Result.err() and log error if an internal error occurs', () => {
//       const originalDebug = mockLogger.debug;

//       (mockLogger.debug as jest.Mock)
//         .mockImplementationOnce(() => {})

//         .mockImplementationOnce(() => {
//           throw new Error('Simulated logger error during system prompt log');
//         });

//       const result = (generator as any).buildModeRooPrompt(
//         mockProjectContext,
//         rooRulesContent,
//         modeTemplateContent,
//         modeName
//       );

//       expect(result.isErr()).toBe(true);
//       expect(result.error).toBeInstanceOf(Error);
//       expect(result.error?.message).toBe('Simulated logger error during system prompt log');
//       // eslint-disable-next-line @typescript-eslint/unbound-method
//       expect(mockLogger.error).toHaveBeenCalledWith(
//         `Error in buildModeRooPrompt for mode "${modeName}": Simulated logger error during system prompt log`,
//         expect.any(Error)
//       );

//       mockLogger.debug = originalDebug;
//     });

//     it('should return Result.err() and log error with default message if error is not an Error instance', () => {
//       const originalDebug = mockLogger.debug;

//       (mockLogger.debug as jest.Mock)
//         .mockImplementationOnce(() => {})

//         .mockImplementationOnce(() => {
//           throw new Error('Simulated non-error string');
//         });

//       const result = (generator as any).buildModeRooPrompt(
//         mockProjectContext,
//         rooRulesContent,
//         modeTemplateContent,
//         modeName
//       );

//       expect(result.isErr()).toBe(true);
//       expect(result.error).toBeInstanceOf(Error);
//       expect(result.error?.message).toBe('Unknown error building mode-specific prompts');
//       // eslint-disable-next-line @typescript-eslint/unbound-method
//       expect(mockLogger.error).toHaveBeenCalledWith(
//         `Error in buildModeRooPrompt for mode "${modeName}": Unknown error building mode-specific prompts`,
//         expect.any(Error)
//       );

//       mockLogger.debug = originalDebug;
//     });
//   });

//   describe('processRooContent (Refactored)', () => {
//     let extractListItemsSpy: jest.SpyInstance;

//     beforeEach(() => {
//       // Ensure all mocks are reset, especially logger calls
//       jest.clearAllMocks();

//       // Re-initialize generator if its state could be affected by other tests,
//       // or ensure its dependencies are freshly mocked for this suite.
//       // For this specific method, we primarily care about mockContentProcessor and mockLogger.
//       // The global beforeEach for AiMagicGenerator already re-instantiates it.

//       extractListItemsSpy = jest.spyOn(MarkdownListParser, 'extractListItems');
//     });

//     afterEach(() => {
//       extractListItemsSpy.mockRestore();
//     });

//     // Test Case 1: Clean Markdown List Input
//     it('should process a clean markdown list correctly', () => {
//       const llmOutput = '- Rule 1\n- Rule 2';
//       mockContentProcessor.stripMarkdownCodeBlock.mockReturnValue(Result.ok(llmOutput));
//       extractListItemsSpy.mockReturnValue(Result.ok(['Rule 1', 'Rule 2']));

//       const result = (generator as any).processRooContent(llmOutput);

//       expect(result.isOk()).toBe(true);
//       if (result.isOk()) {
//         expect(result.value).toBe('Rule 1\nRule 2');
//       }
//       // eslint-disable-next-line @typescript-eslint/unbound-method
//       expect(mockLogger.warn).not.toHaveBeenCalled();
//       expect(extractListItemsSpy).toHaveBeenCalledWith(llmOutput);
//     });

//     // Test Case 2: List with Surrounding Text/Noise
//     it('should extract list when surrounded by text/noise and MarkdownListParser succeeds', () => {
//       const llmOutput = 'Some text\n- Rule 1\n- Rule 2\nSome other text';
//       // const cleanedLlmOutput = '- Rule 1\n- Rule 2'; // Assuming stripMarkdownCodeBlock doesn't remove this noise - REMOVED as unused
//       mockContentProcessor.stripMarkdownCodeBlock.mockReturnValue(Result.ok(llmOutput));
//       extractListItemsSpy.mockReturnValue(Result.ok(['Rule 1', 'Rule 2']));

//       const result = (generator as any).processRooContent(llmOutput);

//       expect(result.isOk()).toBe(true);
//       if (result.isOk()) {
//         expect(result.value).toBe('Rule 1\nRule 2');
//       }
//       expect(extractListItemsSpy).toHaveBeenCalledWith(llmOutput); // Called with the output of stripMarkdownCodeBlock
//       // eslint-disable-next-line @typescript-eslint/unbound-method
//       expect(mockLogger.warn).not.toHaveBeenCalled();
//     });

//     it('should extract list using fallback when surrounded by text/noise and MarkdownListParser fails', () => {
//       const llmOutput = 'Some text\n- Rule 1\n- Rule 2\nSome other text';
//       // Simulate stripMarkdownCodeBlock returning the content as is, if it doesn't target this kind of noise
//       mockContentProcessor.stripMarkdownCodeBlock.mockReturnValue(Result.ok(llmOutput));
//       extractListItemsSpy.mockReturnValue(Result.err(new Error('Parser failed'))); // MarkdownListParser fails

//       const result = (generator as any).processRooContent(llmOutput);

//       expect(result.isOk()).toBe(true);
//       // The fallback logic for "isList" might be too simple for this case if "Some text" isn't stripped.
//       // Based on current implementation, if "Some text" remains, isList would be false.
//       // If stripMarkdownCodeBlock was more aggressive or if the noise was different, this could pass.
//       // For now, assuming the fallback won't catch it perfectly if `stripMarkdownCodeBlock` is passive.
//       // The prompt implies `stripMarkdownCodeBlock` might not remove this, so `cleanedContent` would be "Some text\n- Rule 1\n- Rule 2\nSome other text"
//       // Then `MarkdownListParser.extractListItems` fails.
//       // Then `cleanedContent.split('\n').map(line => line.trim())` would be ["Some text", "- Rule 1", "- Rule 2", "Some other text"]
//       // `isList` check: `lines.every(line => line.startsWith('- ') || line.startsWith('* ') || line.length === 0)`
//       // This would be false because "Some text" does not start with '- ' or '* '.
//       // So, it would log "Could not extract a markdown list..." and return "".
//       if (result.isOk()) {
//         expect(result.value).toBe(''); // Expected based on current logic if noise isn't stripped
//       }
//       // eslint-disable-next-line @typescript-eslint/unbound-method
//       expect(mockLogger.warn).toHaveBeenCalledWith(
//         expect.stringContaining(
//           'MarkdownListParser failed to extract list items, but content appears to be a list. Using raw cleaned content. Error: Parser failed'
//         )
//       );
//       // eslint-disable-next-line @typescript-eslint/unbound-method
//       expect(mockLogger.warn).toHaveBeenCalledWith(
//         expect.stringContaining(
//           'Could not extract a markdown list from LLM output, and content does not appear to be a list.'
//         )
//       );
//     });

//     // Test Case 3: List within Markdown Code Block
//     it('should process a list within a markdown code block', () => {
//       const llmOutput = '```markdown\n- Rule 1\n- Rule 2\n```';
//       const strippedContent = '- Rule 1\n- Rule 2';
//       mockContentProcessor.stripMarkdownCodeBlock.mockReturnValue(Result.ok(strippedContent));
//       extractListItemsSpy.mockReturnValue(Result.ok(['Rule 1', 'Rule 2']));

//       const result = (generator as any).processRooContent(llmOutput);

//       expect(result.isOk()).toBe(true);
//       if (result.isOk()) {
//         expect(result.value).toBe('Rule 1\nRule 2');
//       }
//       // eslint-disable-next-line @typescript-eslint/unbound-method
//       expect(mockContentProcessor.stripMarkdownCodeBlock).toHaveBeenCalledWith(llmOutput.trim());
//       expect(extractListItemsSpy).toHaveBeenCalledWith(strippedContent);
//     });

//     // Test Case 4: List with Markdown Code Block and Other Noise
//     it('should process a list within a markdown code block surrounded by noise', () => {
//       const llmOutput = 'Intro text\n```markdown\n- Rule 1\n- Rule 2\n```\nOutro text';
//       const strippedContent = '- Rule 1\n- Rule 2'; // Simulating stripMarkdownCodeBlock successfully removed block and noise
//       mockContentProcessor.stripMarkdownCodeBlock.mockReturnValue(Result.ok(strippedContent));
//       extractListItemsSpy.mockReturnValue(Result.ok(['Rule 1', 'Rule 2']));

//       const result = (generator as any).processRooContent(llmOutput);

//       expect(result.isOk()).toBe(true);
//       if (result.isOk()) {
//         expect(result.value).toBe('Rule 1\nRule 2');
//       }
//       // eslint-disable-next-line @typescript-eslint/unbound-method
//       expect(mockContentProcessor.stripMarkdownCodeBlock).toHaveBeenCalledWith(llmOutput.trim());
//       expect(extractListItemsSpy).toHaveBeenCalledWith(strippedContent);
//     });

//     // Test Case 5: Empty LLM Output
//     it('should handle empty LLM output', () => {
//       const llmOutput = '   ';
//       mockContentProcessor.stripMarkdownCodeBlock.mockReturnValue(Result.ok('   ')); // or Result.ok("")

//       const result = (generator as any).processRooContent(llmOutput);

//       expect(result.isOk()).toBe(true);
//       if (result.isOk()) {
//         expect(result.value).toBe('');
//       }
//       // The first log is if cleanedContent is empty *after* stripMarkdownCodeBlock.
//       // If stripMarkdownCodeBlock returns "   ", then cleanedContent becomes "" after .trim().
//       // eslint-disable-next-line @typescript-eslint/unbound-method
//       expect(mockLogger.warn).toHaveBeenCalledWith(
//         'LLM output for rules is empty after initial cleaning.'
//       );
//     });

//     // Test Case 6: LLM Output Becomes Empty After Stripping Code Block
//     it('should handle LLM output that becomes empty after stripping code block', () => {
//       const llmOutput = '```\n```';
//       mockContentProcessor.stripMarkdownCodeBlock.mockReturnValue(Result.ok(''));

//       const result = (generator as any).processRooContent(llmOutput);

//       expect(result.isOk()).toBe(true);
//       if (result.isOk()) {
//         expect(result.value).toBe('');
//       }
//       // eslint-disable-next-line @typescript-eslint/unbound-method
//       expect(mockLogger.warn).toHaveBeenCalledWith(
//         'LLM output for rules is empty after initial cleaning.'
//       );
//     });

//     // Test Case 7: Invalid/Non-List Input
//     it('should handle invalid/non-list input', () => {
//       const llmOutput = 'This is just some random text without a list.';
//       mockContentProcessor.stripMarkdownCodeBlock.mockReturnValue(Result.ok(llmOutput));
//       extractListItemsSpy.mockReturnValue(Result.err(new Error('Not a list'))); // Or Result.ok([])

//       const result = (generator as any).processRooContent(llmOutput);

//       expect(result.isOk()).toBe(true);
//       if (result.isOk()) {
//         expect(result.value).toBe('');
//       }
//       // eslint-disable-next-line @typescript-eslint/unbound-method
//       expect(mockLogger.warn).toHaveBeenCalledWith(
//         expect.stringContaining(
//           'Could not extract a markdown list from LLM output, and content does not appear to be a list.'
//         )
//       );
//     });

//     // Test Case 8: stripMarkdownCodeBlock Fails
//     it('should handle failure of stripMarkdownCodeBlock', () => {
//       const llmOutput = '```markdown\n- Rule 1\n```';
//       mockContentProcessor.stripMarkdownCodeBlock.mockReturnValue(
//         Result.err(new Error('Strip failed'))
//       );
//       // MarkdownListParser will be called with the original llmOutput.trim()
//       extractListItemsSpy.mockReturnValue(Result.err(new Error('Parser failed on raw content')));

//       const result = (generator as any).processRooContent(llmOutput);

//       expect(result.isOk()).toBe(true);
//       if (result.isOk()) {
//         expect(result.value).toBe('');
//       }
//       // eslint-disable-next-line @typescript-eslint/unbound-method
//       expect(mockLogger.warn).toHaveBeenCalledWith(
//         'Failed to strip markdown from LLM output, proceeding with potentially uncleaned content for list extraction. Error: Strip failed'
//       );
//       // eslint-disable-next-line @typescript-eslint/unbound-method
//       expect(mockLogger.warn).toHaveBeenCalledWith(
//         expect.stringContaining(
//           'Could not extract a markdown list from LLM output, and content does not appear to be a list.'
//         )
//       );
//     });

//     // Test Case 9: MarkdownListParser.extractListItems Fails, but Content IS a List
//     it('should use fallback when MarkdownListParser fails but content is a list', () => {
//       const llmOutput = '- Rule1\n- Rule2';
//       mockContentProcessor.stripMarkdownCodeBlock.mockReturnValue(Result.ok(llmOutput));
//       extractListItemsSpy.mockReturnValue(Result.err(new Error('Parse failed')));

//       const result = (generator as any).processRooContent(llmOutput);

//       expect(result.isOk()).toBe(true);
//       if (result.isOk()) {
//         expect(result.value).toBe('- Rule1\n- Rule2'); // Fallback uses lines directly
//       }
//       // eslint-disable-next-line @typescript-eslint/unbound-method
//       expect(mockLogger.warn).toHaveBeenCalledWith(
//         'MarkdownListParser failed to extract list items, but content appears to be a list. Using raw cleaned content. Error: Parse failed'
//       );
//     });

//     // Test Case 10: MarkdownListParser.extractListItems Returns Empty Array, but Content IS a List
//     it('should use fallback when MarkdownListParser returns empty array but content is a list', () => {
//       const llmOutput = '- Rule1\n- Rule2';
//       mockContentProcessor.stripMarkdownCodeBlock.mockReturnValue(Result.ok(llmOutput));
//       extractListItemsSpy.mockReturnValue(Result.ok([])); // Parser returns empty list

//       const result = (generator as any).processRooContent(llmOutput);

//       expect(result.isOk()).toBe(true);
//       if (result.isOk()) {
//         expect(result.value).toBe('- Rule1\n- Rule2'); // Fallback uses lines directly
//       }
//       // No specific warning for "parser returned empty but content is list", it just uses the fallback.
//       // The log "MarkdownListParser failed..." is only if rulesResult.isErr().
//       // If rulesResult.isOk() but rulesResult.value.length === 0, it goes to the `else` for fallback.
//       // eslint-disable-next-line @typescript-eslint/unbound-method
//       expect(mockLogger.warn).not.toHaveBeenCalledWith(
//         expect.stringContaining('MarkdownListParser failed')
//       );
//     });

//     // Test Case 11: Content is Empty After All Processing
//     it('should handle content that is empty after all processing', () => {
//       const llmOutput = '- \n-    \n*  ';
//       mockContentProcessor.stripMarkdownCodeBlock.mockReturnValue(Result.ok(llmOutput));
//       // extractListItems would return ["", "   ", "  "]
//       extractListItemsSpy.mockReturnValue(Result.ok(['', '   ', '  ']));

//       const result = (generator as any).processRooContent(llmOutput);

//       expect(result.isOk()).toBe(true);
//       if (result.isOk()) {
//         expect(result.value).toBe('');
//       }
//       // eslint-disable-next-line @typescript-eslint/unbound-method
//       expect(mockLogger.warn).toHaveBeenCalledWith(
//         'Processed LLM rules content is effectively empty.'
//       );
//     });

//     // Test Case 12: Error Handling (Simulated Internal Error)
//     it('should handle an unexpected internal error during processing', () => {
//       const llmOutput = '- Rule 1';
//       mockContentProcessor.stripMarkdownCodeBlock.mockReturnValue(Result.ok(llmOutput));

//       // Simulate an error, e.g., by making a string method throw
//       const originalTrim = String.prototype.trim;

//       String.prototype.trim = jest.fn().mockImplementationOnce(() => {
//         // Affects llmOutput.trim() at the start
//         throw new Error('Simulated trim error');
//       });

//       const result = (generator as any).processRooContent(llmOutput);

//       expect(result.isErr()).toBe(true);
//       if (result.isErr()) {
//         expect(result.error.message).toBe('Simulated trim error');
//       }
//       // eslint-disable-next-line @typescript-eslint/unbound-method
//       expect(mockLogger.error).toHaveBeenCalledWith(
//         'Error in processRooContent: Simulated trim error',
//         expect.any(Error)
//       );

//       String.prototype.trim = originalTrim; // Restore original method
//     });

//     it('should handle non-Error instance thrown internally', () => {
//       const llmOutput = '- Rule 1';
//       mockContentProcessor.stripMarkdownCodeBlock.mockReturnValue(Result.ok(llmOutput));

//       const originalTrim = String.prototype.trim;

//       String.prototype.trim = jest.fn().mockImplementationOnce(() => {
//         throw new Error('Simulated non-error string');
//       });

//       const result = (generator as any).processRooContent(llmOutput);

//       expect(result.isErr()).toBe(true);
//       if (result.isErr()) {
//         expect(result.error.message).toBe('Unknown error processing roo content');
//       }
//       // eslint-disable-next-line @typescript-eslint/unbound-method
//       expect(mockLogger.error).toHaveBeenCalledWith(
//         'Error in processRooContent: Unknown error processing roo content',
//         expect.any(Error)
//       );

//       String.prototype.trim = originalTrim;
//     });
//   });

//   describe('generateRooSystemPrompts', () => {
//     let mockProjectContext: ProjectContext;
//     let mockOptions: ProjectConfig;

//     // Spies for internal methods
//     let buildModeRooPromptSpy: jest.SpyInstance;
//     let getRooCompletionSpy: jest.SpyInstance;
//     let processRooContentSpy: jest.SpyInstance;
//     let writeRooFileSpy: jest.SpyInstance;

//     beforeEach(() => {
//       // Reset mocks for RooFileOpsHelper methods that are frequently used
//       mockRooFileOpsHelper.listAndFilterModeFiles.mockReset();
//       mockRooFileOpsHelper.readRooRulesFile.mockReset();
//       mockRooFileOpsHelper.readModeTemplateFile.mockReset();

//       // Mock logger methods specifically for this suite if needed, or rely on global clear
//       (mockLogger.info as jest.Mock).mockClear();
//       (mockLogger.warn as jest.Mock).mockClear();
//       (mockLogger.error as jest.Mock).mockClear();
//       (mockLogger.debug as jest.Mock).mockClear();

//       mockProjectContext = {
//         projectRootPath: '/test/project',
//         techStack: {
//           languages: ['TypeScript'],
//           frameworks: ['Jest'],
//           buildTools: ['tsc'],
//           testingFrameworks: ['Jest'],
//           linters: ['ESLint'],
//           packageManager: 'npm',
//         },
//         packageJson: {
//           name: 'test-project',
//           version: '1.0.0',
//         },
//         codeInsights: {},
//       } as ProjectContext;

//       mockOptions = {
//         // Add any relevant options from ProjectConfig if needed by the method
//         // For now, it's mostly unused directly by generateRooSystemPrompts logic itself
//       } as ProjectConfig;

//       // Spy on internal methods of the AiMagicGenerator instance
//       // These methods are tested in their own describe blocks, here we mock their behavior
//       // for the orchestrator method generateRooSystemPrompts.
//       buildModeRooPromptSpy = jest.spyOn(generator as any, 'buildModeRooPrompt');
//       getRooCompletionSpy = jest.spyOn(generator as any, 'getRooCompletion');
//       processRooContentSpy = jest.spyOn(generator as any, 'processRooContent');
//       writeRooFileSpy = jest.spyOn(generator as any, 'writeRooFile');
//     });

//     afterEach(() => {
//       // Restore all spies
//       buildModeRooPromptSpy.mockRestore();
//       getRooCompletionSpy.mockRestore();
//       processRooContentSpy.mockRestore();
//       writeRooFileSpy.mockRestore();
//       // jest.restoreAllMocks(); // Use this if other mocks need restoring globally for the suite
//     });

//     // Test Case 1: Successful Generation for a Single Mode
//     it('should successfully generate a roo system prompt for a single mode', async () => {
//       // Arrange
//       const modeName = 'testMode';
//       const modeFileName = `system-prompt-${modeName}.md`;
//       const outputFileName = `system-prompt-${modeName}`; // Note: .md is NOT added by current code

//       mockRooFileOpsHelper.listAndFilterModeFiles.mockResolvedValue(
//         Result.ok([
//           { name: modeFileName, path: `templates/system-prompts/${modeFileName}` } as Dirent,
//         ])
//       );
//       mockRooFileOpsHelper.readRooRulesFile.mockResolvedValue(Result.ok('Global Rules Content'));
//       mockRooFileOpsHelper.readModeTemplateFile.mockResolvedValue(
//         Result.ok('TestMode Template Content')
//       );

//       buildModeRooPromptSpy.mockReturnValue(
//         Result.ok({
//           systemPrompt: 'system prompt for testMode',
//           userPrompt: 'user prompt for testMode',
//         })
//       );
//       getRooCompletionSpy.mockResolvedValue(Result.ok('LLM Rule 1\nLLM Rule 2'));
//       // processRooContentSpy will be called with "LLM Rule 1\nLLM Rule 2"
//       // Let's assume it processes it to "- LLM Rule 1\n- LLM Rule 2" as per task,
//       // but the actual processRooContent implementation formats it as "LLM Rule 1\nLLM Rule 2" (without leading dash)
//       // For this orchestrator test, we mock its *return value*.
//       // The task description for Test Case 1 says processRooContent returns Result.ok("- LLM Rule 1\n- LLM Rule 2")
//       // The actual processRooContent (lines 237-238 of ai-magic-generator.ts) returns rules.map((rule: string) => `- ${rule}`).join('\n');
//       // So, if LLM returns "LLM Rule 1\nLLM Rule 2", processRooContent (if not mocked and called directly) would first have MarkdownListParser.extractListItems return ['LLM Rule 1', 'LLM Rule 2']
//       // Then it would format to "- LLM Rule 1\n- LLM Rule 2".
//       // So the mock for processRooContentSpy should return this.
//       processRooContentSpy.mockReturnValue(Result.ok('- LLM Rule 1\n- LLM Rule 2'));

//       const expectedOutputPath = path.join('.roo', outputFileName);
//       writeRooFileSpy.mockResolvedValue(Result.ok(expectedOutputPath));

//       // Act
//       const result = await (generator as any).generateRooSystemPrompts(
//         mockProjectContext,
//         mockOptions
//       );

//       // Assert
//       expect(result.isOk()).toBe(true);
//       if (result.isOk()) {
//         expect(result.value).toContain(`Successfully generated roo content for 1 mode(s)`);
//         expect(result.value).toContain(expectedOutputPath);
//       }

//       expect(mockRooFileOpsHelper.listAndFilterModeFiles).toHaveBeenCalledWith(
//         'templates/system-prompts'
//       );
//       expect(mockRooFileOpsHelper.readRooRulesFile).toHaveBeenCalledWith(
//         'templates/system-prompts/roo-rules.md'
//       );
//       expect(mockRooFileOpsHelper.readModeTemplateFile).toHaveBeenCalledWith(
//         `templates/system-prompts/${modeFileName}`
//       );

//       expect(buildModeRooPromptSpy).toHaveBeenCalledWith(
//         mockProjectContext,
//         'Global Rules Content',
//         'TestMode Template Content',
//         modeName
//       );
//       expect(getRooCompletionSpy).toHaveBeenCalledWith(
//         'system prompt for testMode',
//         'user prompt for testMode'
//       );
//       expect(processRooContentSpy).toHaveBeenCalledWith('LLM Rule 1\nLLM Rule 2');

//       // Verify finalContent based on actual code: it's just processedLLMRules
//       const expectedFinalContent = '- LLM Rule 1\n- LLM Rule 2';
//       expect(writeRooFileSpy).toHaveBeenCalledWith(expectedOutputPath, expectedFinalContent);

//       // Rule count check: processedLLMRules is "- LLM Rule 1\n- LLM Rule 2", so 2 rules.
//       // MIN_RULES is 100. So a warning should be logged.
//       expect(mockLogger.warn).toHaveBeenCalledWith(
//         expect.stringContaining(
//           `LLM generated only 2 rules for mode "${modeName}". Minimum required is 100.`
//         )
//       );
//     });

//     // Test Case 2: Rule Count Warning
//     it('should log a warning if rule count is less than 100', async () => {
//       // Arrange
//       const modeName = 'warningMode';
//       const modeFileName = `system-prompt-${modeName}.md`;
//       const outputFileName = `system-prompt-${modeName}`;

//       mockRooFileOpsHelper.listAndFilterModeFiles.mockResolvedValue(
//         Result.ok([
//           { name: modeFileName, path: `templates/system-prompts/${modeFileName}` } as Dirent,
//         ])
//       );
//       mockRooFileOpsHelper.readRooRulesFile.mockResolvedValue(Result.ok('Global Rules Content'));
//       mockRooFileOpsHelper.readModeTemplateFile.mockResolvedValue(
//         Result.ok('WarningMode Template Content')
//       );

//       buildModeRooPromptSpy.mockReturnValue(
//         Result.ok({ systemPrompt: 'sys prompt', userPrompt: 'user prompt' })
//       );
//       getRooCompletionSpy.mockResolvedValue(Result.ok('LLM Rule 1')); // Only one rule from LLM

//       // processRooContent will turn "LLM Rule 1" into "- LLM Rule 1"
//       processRooContentSpy.mockReturnValue(Result.ok('- LLM Rule 1'));

//       const expectedOutputPath = path.join('.roo', outputFileName);
//       writeRooFileSpy.mockResolvedValue(Result.ok(expectedOutputPath));

//       // Act
//       const result = await (generator as any).generateRooSystemPrompts(
//         mockProjectContext,
//         mockOptions
//       );

//       // Assert
//       expect(result.isOk()).toBe(true); // Method should still succeed overall
//       expect(writeRooFileSpy).toHaveBeenCalledWith(expectedOutputPath, '- LLM Rule 1');
//       expect(mockLogger.warn).toHaveBeenCalledWith(
//         expect.stringContaining(
//           `LLM generated only 1 rules for mode "${modeName}". Minimum required is 100.`
//         )
//       );
//     });

//     // Test Case 3: No Rules Generated by LLM (processRooContent returns empty)
//     it('should log warnings and write base content if processRooContent returns empty', async () => {
//       // Arrange
//       const modeName = 'noRulesMode';
//       const modeFileName = `system-prompt-${modeName}.md`;
//       const outputFileName = `system-prompt-${modeName}`;

//       mockRooFileOpsHelper.listAndFilterModeFiles.mockResolvedValue(
//         Result.ok([
//           { name: modeFileName, path: `templates/system-prompts/${modeFileName}` } as Dirent,
//         ])
//       );
//       mockRooFileOpsHelper.readRooRulesFile.mockResolvedValue(Result.ok('Global Rules Content'));
//       mockRooFileOpsHelper.readModeTemplateFile.mockResolvedValue(
//         Result.ok('NoRulesMode Template Content')
//       );

//       buildModeRooPromptSpy.mockReturnValue(
//         Result.ok({ systemPrompt: 'sys prompt', userPrompt: 'user prompt' })
//       );
//       getRooCompletionSpy.mockResolvedValue(
//         Result.ok('Some LLM Output that results in empty processed content')
//       );

//       // processRooContent returns empty string
//       processRooContentSpy.mockReturnValue(Result.ok(''));

//       const expectedOutputPath = path.join('.roo', outputFileName);
//       // writeRooFileSpy will be called, but the method should skip to next mode due to empty processedLLMRules
//       // The current code (line 424 of ai-magic-generator.ts) has a continue statement if processedLLMRules is empty.
//       // So, writeRooFileSpy should NOT be called for this mode.
//       // The overall result should be an error if no modes succeed.

//       // Act
//       const result = await (generator as any).generateRooSystemPrompts(
//         mockProjectContext,
//         mockOptions
//       );

//       // Assert
//       // Since the mode fails (due to empty processed content), and it's the only mode,
//       // the overall result should be an error.
//       expect(result.isErr()).toBe(true);
//       if (result.isErr()) {
//         expect(result.error.message).toBe(
//           'No roo files were generated as no modes were processed successfully.'
//         );
//       }

//       // Check logs for this specific mode
//       expect(mockLogger.warn).toHaveBeenCalledWith(
//         expect.stringContaining(
//           `Processed LLM rules content is empty, undefined, or null for mode "${modeName}". Skipping rule count verification and file generation.`
//         )
//       );

//       // writeRooFile should NOT have been called for this mode
//       expect(writeRooFileSpy).not.toHaveBeenCalledWith(expectedOutputPath, expect.any(String));
//     });

//     // Test Case 4: Error in listAndFilterModeFiles
//     it('should return an error if listAndFilterModeFiles fails', async () => {
//       // Arrange
//       const listError = new Error('List failed');
//       mockRooFileOpsHelper.listAndFilterModeFiles.mockResolvedValue(Result.err(listError));

//       // Act
//       const result = await (generator as any).generateRooSystemPrompts(
//         mockProjectContext,
//         mockOptions
//       );

//       // Assert
//       expect(result.isErr()).toBe(true);
//       if (result.isErr()) {
//         // The actual code wraps the error: `modeFilesResult.error ?? new Error('Failed to list mode template files')`
//         // So we check against the original error object.
//         expect(result.error).toBe(listError);
//       }
//       expect(mockRooFileOpsHelper.readRooRulesFile).not.toHaveBeenCalled();
//     });

//     // Test Case 5: No Mode Files Found
//     it('should return ok with a message and log warning if no mode files are found', async () => {
//       // Arrange
//       mockRooFileOpsHelper.listAndFilterModeFiles.mockResolvedValue(Result.ok([])); // No files found

//       // Act
//       const result = await (generator as any).generateRooSystemPrompts(
//         mockProjectContext,
//         mockOptions
//       );

//       // Assert
//       expect(result.isOk()).toBe(true);
//       if (result.isOk()) {
//         expect(result.value).toBe('No mode template files found. No roo files generated.');
//       }
//       expect(mockLogger.warn).toHaveBeenCalledWith(
//         'No mode template files found in templates/system-prompts. No roo files will be generated.'
//       );
//       expect(mockRooFileOpsHelper.readRooRulesFile).not.toHaveBeenCalled();
//     });

//     // Test Case 6: Error in readRooRulesFile
//     it('should return an error if readRooRulesFile fails', async () => {
//       // Arrange
//       mockRooFileOpsHelper.listAndFilterModeFiles.mockResolvedValue(
//         Result.ok([{ name: 'system-prompt-someMode.md', path: '...' } as Dirent]) // Need at least one mode file to proceed to readRooRulesFile
//       );
//       const readRulesError = new Error('Read rules failed');
//       mockRooFileOpsHelper.readRooRulesFile.mockResolvedValue(Result.err(readRulesError));

//       // Act
//       const result = await (generator as any).generateRooSystemPrompts(
//         mockProjectContext,
//         mockOptions
//       );

//       // Assert
//       expect(result.isErr()).toBe(true);
//       if (result.isErr()) {
//         expect(result.error).toBe(readRulesError); // Actual code returns the original error or a wrapped one.
//       }
//       expect(mockRooFileOpsHelper.readModeTemplateFile).not.toHaveBeenCalled();
//     });

//     // Test Case 7: Empty roo-rules.md Content
//     it('should return an error if roo-rules.md content is empty or whitespace', async () => {
//       // Arrange
//       mockRooFileOpsHelper.listAndFilterModeFiles.mockResolvedValue(
//         Result.ok([{ name: 'system-prompt-someMode.md', path: '...' } as Dirent])
//       );
//       mockRooFileOpsHelper.readRooRulesFile.mockResolvedValue(Result.ok('   ')); // Empty/whitespace content

//       // Act
//       const result = await (generator as any).generateRooSystemPrompts(
//         mockProjectContext,
//         mockOptions
//       );

//       // Assert
//       expect(result.isErr()).toBe(true);
//       if (result.isErr()) {
//         expect(result.error.message).toBe(
//           'Roo rules content is empty or undefined. Cannot proceed with roo generation.'
//         );
//       }
//       expect(mockRooFileOpsHelper.readModeTemplateFile).not.toHaveBeenCalled();
//     });

//     // Test Case 8: Error in readModeTemplateFile for one mode (should skip and continue)
//     it('should skip a mode if readModeTemplateFile fails for it, but continue with others', async () => {
//       // Arrange
//       const mode1Name = 'mode1';
//       const mode1FileName = `system-prompt-${mode1Name}.md`;
//       const mode2Name = 'mode2';
//       const mode2FileName = `system-prompt-${mode2Name}.md`;
//       const output2FileName = `system-prompt-${mode2Name}`;

//       mockRooFileOpsHelper.listAndFilterModeFiles.mockResolvedValue(
//         Result.ok([
//           { name: mode1FileName, path: `templates/system-prompts/${mode1FileName}` } as Dirent,
//           { name: mode2FileName, path: `templates/system-prompts/${mode2FileName}` } as Dirent,
//         ])
//       );
//       mockRooFileOpsHelper.readRooRulesFile.mockResolvedValue(Result.ok('Global Rules Content'));

//       // mode1 template read fails
//       mockRooFileOpsHelper.readModeTemplateFile
//         .mockResolvedValueOnce(Result.err(new Error('Read template1 failed')))
//         .mockResolvedValueOnce(Result.ok('Mode2 Template Content')); // mode2 template read succeeds

//       // Setup mocks for mode2 to succeed
//       buildModeRooPromptSpy.mockReturnValue(
//         Result.ok({ systemPrompt: 'sys prompt mode2', userPrompt: 'user prompt mode2' })
//       );
//       getRooCompletionSpy.mockResolvedValue(Result.ok('LLM Rules for Mode2'));
//       processRooContentSpy.mockReturnValue(Result.ok('- LLM Rules for Mode2')); // Assume >100 rules for simplicity here or adjust warning check

//       const expectedOutputPathMode2 = path.join('.roo', output2FileName);
//       writeRooFileSpy.mockResolvedValue(Result.ok(expectedOutputPathMode2));

//       // Act
//       const result = await (generator as any).generateRooSystemPrompts(
//         mockProjectContext,
//         mockOptions
//       );

//       // Assert
//       expect(result.isOk()).toBe(true); // Overall success if at least one mode succeeds
//       if (result.isOk()) {
//         expect(result.value).toContain(`Successfully generated roo content for 1 mode(s)`);
//         expect(result.value).toContain(expectedOutputPathMode2);
//       }

//       expect(mockLogger.warn).toHaveBeenCalledWith(
//         `Failed to read template for mode "${mode1Name}", skipping: Read template1 failed`
//       );

//       // Verify mode2 was processed
//       expect(buildModeRooPromptSpy).toHaveBeenCalledWith(
//         mockProjectContext,
//         'Global Rules Content',
//         'Mode2 Template Content',
//         mode2Name
//       );
//       expect(getRooCompletionSpy).toHaveBeenCalledWith('sys prompt mode2', 'user prompt mode2');
//       expect(processRooContentSpy).toHaveBeenCalledWith('LLM Rules for Mode2');
//       expect(writeRooFileSpy).toHaveBeenCalledWith(
//         expectedOutputPathMode2,
//         '- LLM Rules for Mode2'
//       );
//       // Check rule count warning for mode2 (1 rule)
//       expect(mockLogger.warn).toHaveBeenCalledWith(
//         expect.stringContaining(
//           `LLM generated only 1 rules for mode "${mode2Name}". Minimum required is 100.`
//         )
//       );
//     });

//     // Test Case 9: Error in buildModeRooPrompt for one mode
//     it('should skip a mode if buildModeRooPrompt fails for it, but continue with others', async () => {
//       // Arrange
//       const mode1Name = 'mode1BuildFail';
//       const mode1FileName = `system-prompt-${mode1Name}.md`;
//       const mode2Name = 'mode2BuildSuccess';
//       const mode2FileName = `system-prompt-${mode2Name}.md`;
//       const output2FileName = `system-prompt-${mode2Name}`;

//       mockRooFileOpsHelper.listAndFilterModeFiles.mockResolvedValue(
//         Result.ok([
//           { name: mode1FileName, path: `.../${mode1FileName}` } as Dirent,
//           { name: mode2FileName, path: `.../${mode2FileName}` } as Dirent,
//         ])
//       );
//       mockRooFileOpsHelper.readRooRulesFile.mockResolvedValue(Result.ok('Global Rules Content'));
//       mockRooFileOpsHelper.readModeTemplateFile
//         .mockResolvedValueOnce(Result.ok('Mode1 Template Content'))
//         .mockResolvedValueOnce(Result.ok('Mode2 Template Content'));

//       // buildModeRooPrompt fails for mode1, succeeds for mode2
//       buildModeRooPromptSpy
//         .mockReturnValueOnce(Result.err(new Error('Build prompt failed for mode1')))
//         .mockReturnValueOnce(Result.ok({ systemPrompt: 'sys mode2', userPrompt: 'user mode2' }));

//       // Setup mocks for mode2 to succeed further
//       getRooCompletionSpy.mockResolvedValue(Result.ok('LLM Rules for Mode2'));
//       processRooContentSpy.mockReturnValue(Result.ok('- LLM Rules for Mode2'));
//       const expectedOutputPathMode2 = path.join('.roo', output2FileName);
//       writeRooFileSpy.mockResolvedValue(Result.ok(expectedOutputPathMode2));

//       // Act
//       const result = await (generator as any).generateRooSystemPrompts(
//         mockProjectContext,
//         mockOptions
//       );

//       // Assert
//       expect(result.isOk()).toBe(true);
//       if (result.isOk()) {
//         expect(result.value).toContain(`Successfully generated roo content for 1 mode(s)`);
//         expect(result.value).toContain(expectedOutputPathMode2);
//       }
//       expect(mockLogger.warn).toHaveBeenCalledWith(
//         `Failed to build prompts for mode "${mode1Name}", skipping: Build prompt failed for mode1`
//       );

//       // Verify mode2 was processed
//       expect(buildModeRooPromptSpy).toHaveBeenCalledTimes(2); // Called for mode1 (failed) and mode2 (succeeded)
//       expect(getRooCompletionSpy).toHaveBeenCalledWith('sys mode2', 'user mode2');
//       expect(processRooContentSpy).toHaveBeenCalledWith('LLM Rules for Mode2');
//       expect(writeRooFileSpy).toHaveBeenCalledWith(
//         expectedOutputPathMode2,
//         '- LLM Rules for Mode2'
//       );
//       expect(mockLogger.warn).toHaveBeenCalledWith(
//         expect.stringContaining(
//           `LLM generated only 1 rules for mode "${mode2Name}". Minimum required is 100.`
//         )
//       );
//     });

//     // Test Case 10: Error in getRooCompletion for one mode
//     it('should skip a mode if getRooCompletion fails for it, but continue with others', async () => {
//       // Arrange
//       const mode1Name = 'mode1LLMFail';
//       const mode1FileName = `system-prompt-${mode1Name}.md`;
//       const mode2Name = 'mode2LLMSuccess';
//       const mode2FileName = `system-prompt-${mode2Name}.md`;
//       const output2FileName = `system-prompt-${mode2Name}`;

//       mockRooFileOpsHelper.listAndFilterModeFiles.mockResolvedValue(
//         Result.ok([
//           { name: mode1FileName, path: `.../${mode1FileName}` } as Dirent,
//           { name: mode2FileName, path: `.../${mode2FileName}` } as Dirent,
//         ])
//       );
//       mockRooFileOpsHelper.readRooRulesFile.mockResolvedValue(Result.ok('Global Rules Content'));
//       mockRooFileOpsHelper.readModeTemplateFile
//         .mockResolvedValueOnce(Result.ok('Mode1 Template Content'))
//         .mockResolvedValueOnce(Result.ok('Mode2 Template Content'));

//       buildModeRooPromptSpy
//         .mockReturnValueOnce(Result.ok({ systemPrompt: 'sys mode1', userPrompt: 'user mode1' }))
//         .mockReturnValueOnce(Result.ok({ systemPrompt: 'sys mode2', userPrompt: 'user mode2' }));

//       // getRooCompletion fails for mode1, succeeds for mode2
//       getRooCompletionSpy
//         .mockResolvedValueOnce(Result.err(new Error('LLM failed for mode1')))
//         .mockResolvedValueOnce(Result.ok('LLM Rules for Mode2'));

//       processRooContentSpy.mockReturnValue(Result.ok('- LLM Rules for Mode2'));
//       const expectedOutputPathMode2 = path.join('.roo', output2FileName);
//       writeRooFileSpy.mockResolvedValue(Result.ok(expectedOutputPathMode2));

//       // Act
//       const result = await (generator as any).generateRooSystemPrompts(
//         mockProjectContext,
//         mockOptions
//       );

//       // Assert
//       expect(result.isOk()).toBe(true);
//       if (result.isOk()) {
//         expect(result.value).toContain(`Successfully generated roo content for 1 mode(s)`);
//         expect(result.value).toContain(expectedOutputPathMode2);
//       }
//       expect(mockLogger.warn).toHaveBeenCalledWith(
//         `Failed to get LLM completion for mode "${mode1Name}", skipping: LLM failed for mode1`
//       );

//       expect(getRooCompletionSpy).toHaveBeenCalledTimes(2);
//       expect(processRooContentSpy).toHaveBeenCalledWith('LLM Rules for Mode2'); // Only called for mode2
//       expect(writeRooFileSpy).toHaveBeenCalledWith(
//         expectedOutputPathMode2,
//         '- LLM Rules for Mode2'
//       );
//       expect(mockLogger.warn).toHaveBeenCalledWith(
//         expect.stringContaining(
//           `LLM generated only 1 rules for mode "${mode2Name}". Minimum required is 100.`
//         )
//       );
//     });

//     // Test Case 11: Error in processRooContent for one mode
//     it('should skip a mode if processRooContent fails for it, but continue with others', async () => {
//       // Arrange
//       const mode1Name = 'mode1ProcessFail';
//       const mode1FileName = `system-prompt-${mode1Name}.md`;
//       const mode2Name = 'mode2ProcessSuccess';
//       const mode2FileName = `system-prompt-${mode2Name}.md`;
//       const output2FileName = `system-prompt-${mode2Name}`;

//       mockRooFileOpsHelper.listAndFilterModeFiles.mockResolvedValue(
//         Result.ok([
//           { name: mode1FileName, path: `.../${mode1FileName}` } as Dirent,
//           { name: mode2FileName, path: `.../${mode2FileName}` } as Dirent,
//         ])
//       );
//       mockRooFileOpsHelper.readRooRulesFile.mockResolvedValue(Result.ok('Global Rules Content'));
//       mockRooFileOpsHelper.readModeTemplateFile
//         .mockResolvedValueOnce(Result.ok('Mode1 Template Content'))
//         .mockResolvedValueOnce(Result.ok('Mode2 Template Content'));

//       buildModeRooPromptSpy
//         .mockReturnValueOnce(Result.ok({ systemPrompt: 'sys mode1', userPrompt: 'user mode1' }))
//         .mockReturnValueOnce(Result.ok({ systemPrompt: 'sys mode2', userPrompt: 'user mode2' }));

//       getRooCompletionSpy
//         .mockResolvedValueOnce(Result.ok('LLM Rules for Mode1 - will fail processing'))
//         .mockResolvedValueOnce(Result.ok('LLM Rules for Mode2'));

//       // processRooContent fails for mode1, succeeds for mode2
//       processRooContentSpy
//         .mockReturnValueOnce(Result.err(new Error('Process failed for mode1')))
//         .mockReturnValueOnce(Result.ok('- LLM Rules for Mode2'));

//       const expectedOutputPathMode2 = path.join('.roo', output2FileName);
//       writeRooFileSpy.mockResolvedValue(Result.ok(expectedOutputPathMode2));

//       // Act
//       const result = await (generator as any).generateRooSystemPrompts(
//         mockProjectContext,
//         mockOptions
//       );

//       // Assert
//       expect(result.isOk()).toBe(true);
//       if (result.isOk()) {
//         expect(result.value).toContain(`Successfully generated roo content for 1 mode(s)`);
//         expect(result.value).toContain(expectedOutputPathMode2);
//       }
//       expect(mockLogger.warn).toHaveBeenCalledWith(
//         `Failed to process content for mode "${mode1Name}", skipping: Process failed for mode1`
//       );

//       expect(processRooContentSpy).toHaveBeenCalledTimes(2);
//       expect(writeRooFileSpy).toHaveBeenCalledWith(
//         expectedOutputPathMode2,
//         '- LLM Rules for Mode2'
//       ); // Only called for mode2
//       expect(mockLogger.warn).toHaveBeenCalledWith(
//         expect.stringContaining(
//           `LLM generated only 1 rules for mode "${mode2Name}". Minimum required is 100.`
//         )
//       );
//     });

//     // Test Case 12: Error in writeRooFile for one mode
//     it('should log an error if writeRooFile fails for a mode, but continue and succeed if another mode is successful', async () => {
//       // Arrange
//       const mode1Name = 'mode1WriteFail';
//       const mode1FileName = `system-prompt-${mode1Name}.md`;
//       const output1FileName = `system-prompt-${mode1Name}`;
//       const mode2Name = 'mode2WriteSuccess';
//       const mode2FileName = `system-prompt-${mode2Name}.md`;
//       const output2FileName = `system-prompt-${mode2Name}`;

//       mockRooFileOpsHelper.listAndFilterModeFiles.mockResolvedValue(
//         Result.ok([
//           { name: mode1FileName, path: `.../${mode1FileName}` } as Dirent,
//           { name: mode2FileName, path: `.../${mode2FileName}` } as Dirent,
//         ])
//       );
//       mockRooFileOpsHelper.readRooRulesFile.mockResolvedValue(Result.ok('Global Rules Content'));
//       mockRooFileOpsHelper.readModeTemplateFile
//         .mockResolvedValueOnce(Result.ok('Mode1 Template Content'))
//         .mockResolvedValueOnce(Result.ok('Mode2 Template Content'));

//       buildModeRooPromptSpy
//         .mockReturnValueOnce(Result.ok({ systemPrompt: 'sys mode1', userPrompt: 'user mode1' }))
//         .mockReturnValueOnce(Result.ok({ systemPrompt: 'sys mode2', userPrompt: 'user mode2' }));

//       getRooCompletionSpy
//         .mockResolvedValueOnce(Result.ok('LLM Rules for Mode1'))
//         .mockResolvedValueOnce(Result.ok('LLM Rules for Mode2'));

//       processRooContentSpy
//         .mockReturnValueOnce(Result.ok('- LLM Rules for Mode1'))
//         .mockReturnValueOnce(Result.ok('- LLM Rules for Mode2'));

//       const expectedOutputPathMode1 = path.join('.roo', output1FileName);
//       const expectedOutputPathMode2 = path.join('.roo', output2FileName);

//       // writeRooFile fails for mode1, succeeds for mode2
//       const writeError = new Error('Write failed for mode1');
//       writeRooFileSpy
//         .mockResolvedValueOnce(Result.err(writeError))
//         .mockResolvedValueOnce(Result.ok(expectedOutputPathMode2));

//       // Act
//       const result = await (generator as any).generateRooSystemPrompts(
//         mockProjectContext,
//         mockOptions
//       );

//       // Assert
//       expect(result.isOk()).toBe(true); // Overall success because mode2 succeeded
//       if (result.isOk()) {
//         expect(result.value).toContain(`Successfully generated roo content for 1 mode(s)`);
//         expect(result.value).toContain(expectedOutputPathMode2);
//         expect(result.value).not.toContain(expectedOutputPathMode1);
//       }

//       expect(mockLogger.error).toHaveBeenCalledWith(
//         `Failed to write roo file for mode "${mode1Name}" at ${expectedOutputPathMode1}`,
//         writeError
//       );

//       // Verify mode2 was processed and written successfully
//       expect(writeRooFileSpy).toHaveBeenCalledWith(
//         expectedOutputPathMode2,
//         '- LLM Rules for Mode2'
//       );
//       expect(mockLogger.info).toHaveBeenCalledWith(
//         `Successfully generated roo file for mode "${mode2Name}" at ${expectedOutputPathMode2}`
//       );
//       // Check rule count warnings
//       expect(mockLogger.warn).toHaveBeenCalledWith(
//         expect.stringContaining(
//           `LLM generated only 1 rules for mode "${mode1Name}". Minimum required is 100.`
//         )
//       );
//       expect(mockLogger.warn).toHaveBeenCalledWith(
//         expect.stringContaining(
//           `LLM generated only 1 rules for mode "${mode2Name}". Minimum required is 100.`
//         )
//       );
//     });

//     // Test Case 13: LLM Returns Empty Content (getRooCompletion returns empty string)
//     it('should log a warning and skip mode if getRooCompletion returns empty content', async () => {
//       // Arrange
//       const modeName = 'emptyLLMMode';
//       const modeFileName = `system-prompt-${modeName}.md`;

//       mockRooFileOpsHelper.listAndFilterModeFiles.mockResolvedValue(
//         Result.ok([{ name: modeFileName, path: `.../${modeFileName}` } as Dirent])
//       );
//       mockRooFileOpsHelper.readRooRulesFile.mockResolvedValue(Result.ok('Global Rules Content'));
//       mockRooFileOpsHelper.readModeTemplateFile.mockResolvedValue(
//         Result.ok('EmptyLLMMode Template')
//       );

//       buildModeRooPromptSpy.mockReturnValue(
//         Result.ok({ systemPrompt: 'sys prompt', userPrompt: 'user prompt' })
//       );
//       // getRooCompletion returns empty string
//       getRooCompletionSpy.mockResolvedValue(Result.ok('  '));

//       // Act
//       const result = await (generator as any).generateRooSystemPrompts(
//         mockProjectContext,
//         mockOptions
//       );

//       // Assert
//       // Since the mode fails (due to empty LLM content), and it's the only mode,
//       // the overall result should be an error.
//       expect(result.isErr()).toBe(true);
//       if (result.isErr()) {
//         expect(result.error.message).toBe(
//           'No roo files were generated as no modes were processed successfully.'
//         );
//       }

//       expect(mockLogger.warn).toHaveBeenCalledWith(
//         `LLM returned empty or null content for mode "${modeName}". Skipping file generation.`
//       );
//       expect(processRooContentSpy).not.toHaveBeenCalled();
//       expect(writeRooFileSpy).not.toHaveBeenCalled();
//     });

//     // Test Case 14: Successful Generation for Multiple Modes
//     it('should successfully generate roo system prompts for multiple modes', async () => {
//       // Arrange
//       const modeAName = 'modeA';
//       const modeAFileName = `system-prompt-${modeAName}.md`;
//       const outputAFileName = `system-prompt-${modeAName}`;
//       const modeBName = 'modeB';
//       const modeBFileName = `system-prompt-${modeBName}.md`;
//       const outputBFileName = `system-prompt-${modeBName}`;

//       mockRooFileOpsHelper.listAndFilterModeFiles.mockResolvedValue(
//         Result.ok([
//           { name: modeAFileName, path: `.../${modeAFileName}` } as Dirent,
//           { name: modeBFileName, path: `.../${modeBFileName}` } as Dirent,
//         ])
//       );
//       mockRooFileOpsHelper.readRooRulesFile.mockResolvedValue(Result.ok('Global Rules Content'));

//       mockRooFileOpsHelper.readModeTemplateFile
//         .mockResolvedValueOnce(Result.ok('ModeA Template Content'))
//         .mockResolvedValueOnce(Result.ok('ModeB Template Content'));

//       buildModeRooPromptSpy
//         .mockReturnValueOnce(Result.ok({ systemPrompt: 'sys A', userPrompt: 'user A' }))
//         .mockReturnValueOnce(Result.ok({ systemPrompt: 'sys B', userPrompt: 'user B' }));

//       getRooCompletionSpy
//         .mockResolvedValueOnce(Result.ok('LLM Rules A1\nLLM Rules A2')) // 2 rules for mode A
//         .mockResolvedValueOnce(Result.ok('LLM Rules B1\nLLM Rules B2\nLLM Rules B3')); // 3 rules for mode B

//       processRooContentSpy
//         .mockReturnValueOnce(Result.ok('- LLM Rules A1\n- LLM Rules A2'))
//         .mockReturnValueOnce(Result.ok('- LLM Rules B1\n- LLM Rules B2\n- LLM Rules B3'));

//       const expectedOutputPathA = path.join('.roo', outputAFileName);
//       const expectedOutputPathB = path.join('.roo', outputBFileName);
//       writeRooFileSpy
//         .mockResolvedValueOnce(Result.ok(expectedOutputPathA))
//         .mockResolvedValueOnce(Result.ok(expectedOutputPathB));

//       // Act
//       const result = await (generator as any).generateRooSystemPrompts(
//         mockProjectContext,
//         mockOptions
//       );

//       // Assert
//       expect(result.isOk()).toBe(true);
//       if (result.isOk()) {
//         expect(result.value).toContain(`Successfully generated roo content for 2 mode(s)`);
//         expect(result.value).toContain(expectedOutputPathA);
//         expect(result.value).toContain(expectedOutputPathB);
//       }

//       expect(writeRooFileSpy).toHaveBeenCalledWith(
//         expectedOutputPathA,
//         '- LLM Rules A1\n- LLM Rules A2'
//       );
//       expect(writeRooFileSpy).toHaveBeenCalledWith(
//         expectedOutputPathB,
//         '- LLM Rules B1\n- LLM Rules B2\n- LLM Rules B3'
//       );

//       expect(mockLogger.warn).toHaveBeenCalledWith(
//         expect.stringContaining(
//           `LLM generated only 2 rules for mode "${modeAName}". Minimum required is 100.`
//         )
//       );
//       expect(mockLogger.warn).toHaveBeenCalledWith(
//         expect.stringContaining(
//           `LLM generated only 3 rules for mode "${modeBName}". Minimum required is 100.`
//         )
//       );
//     });
//   });
// });
