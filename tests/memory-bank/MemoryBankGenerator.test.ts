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
//       llmAgentMock
//     );
//   });

//   it('should implement IGenerator interface', () => {
//     expect(memoryBankGenerator).toHaveProperty('name', 'MemoryBank');
//     expect(memoryBankGenerator).toHaveProperty('executeGeneration');
//     expect(memoryBankGenerator).toHaveProperty('validate');
//   });

//   it('should call generateMemoryBankSuite on executeGeneration', async () => {
//     const config: ProjectConfig = {
//       name: 'test-project',
//       baseDir: '/test',
//     };
//     const generateMemoryBankSuiteMock = jest.spyOn(memoryBankGenerator, 'generateMemoryBankSuite');
//     generateMemoryBankSuiteMock.mockImplementation(async () => Result.ok(undefined));

//     await memoryBankGenerator.executeGeneration(config);

//     expect(generateMemoryBankSuiteMock).toHaveBeenCalledTimes(1);
//   });
// });
