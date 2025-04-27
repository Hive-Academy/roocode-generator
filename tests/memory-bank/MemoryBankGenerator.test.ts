// import { MemoryBankGenerator } from '../../src/memory-bank/memory-bank-generator';
// import { IServiceContainer } from '../../src/core/di/interfaces';
// import {
//   IMemoryBankValidator,
//   IMemoryBankFileManager,
//   IMemoryBankTemplateManager,
//   IContentProcessor,
//   IProjectContextService,
//   IPromptBuilder,
// } from '../../src/memory-bank/interfaces';
// import { ILogger } from '../../src/core/services/logger-service';
// import { LLMAgent } from '../../src/core/llm/llm-agent';
// import { Result } from '../../src/core/result/result';
// import { ProjectConfig } from '../../types/shared';
// import { GeneratorOrchestrator } from '../../src/core/application/generator-orchestrator';
// import { IFileOperations } from '../../src/core/file-operations/interfaces';

// describe('MemoryBankGenerator', () => {
//   let memoryBankGenerator: MemoryBankGenerator;
//   let serviceContainerMock: IServiceContainer;
//   let validatorMock: IMemoryBankValidator;
//   let fileManagerMock: IMemoryBankFileManager;
//   let templateManagerMock: IMemoryBankTemplateManager;
//   let contentProcessorMock: IContentProcessor;
//   let loggerMock: ILogger;
//   let projectContextServiceMock: IProjectContextService;
//   let promptBuilderMock: IPromptBuilder;
//   let llmAgentMock: LLMAgent;
//   let fileOperationsMock: IFileOperations;

//   beforeEach(() => {
//     serviceContainerMock = {
//       resolve: jest.fn(),
//     };
//     validatorMock = { validate: jest.fn() };
//     fileManagerMock = { createMemoryBankDirectory: jest.fn() };
//     templateManagerMock = { loadTemplate: jest.fn() };
//     contentProcessorMock = { processTemplate: jest.fn() };
//     loggerMock = { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() };
//     projectContextServiceMock = { gatherContext: jest.fn() };
//     promptBuilderMock = { buildPrompt: jest.fn() };
//     llmAgentMock = { getCompletion: jest.fn() };
//     fileOperationsMock = { writeFile: jest.fn() } as any;

//     (serviceContainerMock.resolve as jest.Mock).mockImplementation((token) => {
//       switch (token) {
//         case 'IMemoryBankValidator':
//           return Result.ok(validatorMock);
//         case 'IMemoryBankFileManager':
//           return Result.ok(fileManagerMock);
//         case 'IMemoryBankTemplateManager':
//           return Result.ok(templateManagerMock);
//         case 'IContentProcessor':
//           return Result.ok(contentProcessorMock);
//         case 'ILogger':
//           return Result.ok(loggerMock);
//         case 'IProjectContextService':
//           return Result.ok(projectContextServiceMock);
//         case 'IPromptBuilder':
//           return Result.ok(promptBuilderMock);
//         case 'LLMAgent':
//           return Result.ok(llmAgentMock);
//         case 'IFileOperations':
//           return Result.ok(fileOperationsMock);
//         default:
//           return Result.err(new Error(`Token not found: ${token}`));
//       }
//     });

//     memoryBankGenerator = new MemoryBankGenerator(
//       serviceContainerMock,
//       validatorMock,
//       fileManagerMock,
//       templateManagerMock,
//       contentProcessorMock,
//       loggerMock,
//       projectContextServiceMock,
//       promptBuilderMock,
//       llmAgentMock,
//       fileOperationsMock
//     );
//   });

//   it('should implement IGenerator interface', () => {
//     expect(memoryBankGenerator).toHaveProperty('name', 'MemoryBank');
//   });

//   it('should be invoked by GeneratorOrchestrator', async () => {
//     const config: ProjectConfig = {
//       name: 'test-project',
//       baseDir: '/test',
//     };
//     const contextPaths: string[] = [];
//     const outputDir: string = '/output';

//     const generateMemoryBankSuiteMock = jest.spyOn(memoryBankGenerator, 'generate');
//     generateMemoryBankSuiteMock.mockImplementation(async () => Result.ok(undefined));

//     const orchestrator = new GeneratorOrchestrator(serviceContainerMock);
//     orchestrator.registerGenerator(memoryBankGenerator);

//     await orchestrator.generate(['MemoryBank'], contextPaths, outputDir);

//     expect(generateMemoryBankSuiteMock).toHaveBeenCalledTimes(1);
//     expect(generateMemoryBankSuiteMock).toHaveBeenCalledWith(config, contextPaths, outputDir);
//   });

//   it('should handle errors during generation', async () => {
//     const config: ProjectConfig = {
//       name: 'test-project',
//       baseDir: '/test',
//     };
//     const contextPaths: string[] = [];
//     const outputDir: string = '/output';
//     const error = new Error('File write failed');

//     (fileOperationsMock.writeFile as jest.Mock).mockImplementation(() => Promise.reject(error));
//     const result = await memoryBankGenerator.generate(config, contextPaths, outputDir);

//     expect(result.isErr()).toBe(true);
//     expect(result.error).toBe(error);
//   });

//   it('should create output artifacts in the specified directory', async () => {
//     const config: ProjectConfig = {
//       name: 'test-project',
//       baseDir: '/test',
//     };
//     const contextPaths: string[] = [];
//     const outputDir: string = '/output';

//     (fileOperationsMock.writeFile as jest.Mock).mockImplementation(() => Promise.resolve());
//     (templateManagerMock.loadTemplate as jest.Mock).mockImplementation(() => 'template content');
//     (contentProcessorMock.processTemplate as jest.Mock).mockImplementation(
//       () => 'processed content'
//     );

//     await memoryBankGenerator.generate(config, contextPaths, outputDir);

//     expect(fileOperationsMock.writeFile).toHaveBeenCalled();
//   });
// });
