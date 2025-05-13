// /* eslint-disable @typescript-eslint/unbound-method */
// import { MemoryBankContentGenerator } from '../../src/memory-bank/memory-bank-content-generator';
// import { MemoryBankFileType } from '../../src/memory-bank/interfaces';
// import { ProjectContext } from '../../src/core/analysis/types';
// import { LLMAgent } from '../../src/core/llm/llm-agent';
// import { IContentProcessor } from '../../src/memory-bank/interfaces';
// import { ILogger } from '../../src/core/services/logger-service';
// import { Result } from '../../src/core/result/result';
// import { createMockLogger } from '../__mocks__/logger.mock';
// import { createMockLLMAgent } from '../__mocks__/llm-agent.mock';
// import { createMockContentProcessor } from '../__mocks__/content-processor.mock';
// import { createMockProjectContext } from '../__mocks__/project-context.mock';

// describe('MemoryBankContentGenerator', () => {
//   let mockLLMAgent: jest.Mocked<LLMAgent>;
//   let mockContentProcessor: jest.Mocked<IContentProcessor>;
//   let mockLogger: jest.Mocked<ILogger>;
//   let generator: MemoryBankContentGenerator;

//   const expectedSystemPrompt = `You are an expert technical writer specializing in software documentation. Your task is to populate the provided Markdown template using the structured PROJECT CONTEXT data provided in the user prompt. You MUST strictly follow the instructions embedded in HTML comments (\`<!-- LLM: ... -->\`) within the template to guide content generation and data selection. Adhere precisely to the template's structure and formatting.`;
//   type ProjectContextOverrides = Parameters<typeof createMockProjectContext>[0];

//   const getTestContext = (overrides: ProjectContextOverrides = {}): ProjectContext => {
//     return createMockProjectContext(overrides);
//   };

//   beforeEach(() => {
//     // Create fresh mocks using factories for each test
//     mockLLMAgent = createMockLLMAgent();
//     mockContentProcessor = createMockContentProcessor();
//     mockLogger = createMockLogger();

//     // Reset mocks if needed (factories usually create fresh ones)
//     // jest.clearAllMocks(); // Uncomment if mocks persist unexpectedly

//     // Mock default return values (factories might already do this)
//     mockLLMAgent.getCompletion.mockResolvedValue(Result.ok('Mock LLM Content'));
//     mockContentProcessor.stripMarkdownCodeBlock.mockReturnValue(Result.ok('Mock Stripped Content'));
//     // Mock processTemplate if it's ever called by the tested method
//     mockContentProcessor.processTemplate.mockResolvedValue(Result.ok('Mock Processed Template'));

//     // Instantiate the class under test with mocks
//     generator = new MemoryBankContentGenerator(mockLLMAgent, mockContentProcessor, mockLogger);
//   });

//   describe('buildPrompts (via generateContent)', () => {
//     it('should build correct prompts for ProjectOverview', async () => {
//       const fileType = MemoryBankFileType.ProjectOverview;
//       // Use the factory to get context, potentially add specific overrides if needed
//       const mockContext = getTestContext({
//         // Example override if needed:
//         // techStack: { languages: ['Python'] }
//       });
//       const mockTemplate = 'Template for Overview <!-- LLM: Use projectSummary -->';

//       await generator.generateContent(fileType, mockContext, mockTemplate);

//       expect(mockLLMAgent.getCompletion).toHaveBeenCalledTimes(1);
//       const [receivedSystemPrompt, receivedUserPrompt] = mockLLMAgent.getCompletion.mock.calls[0];

//       // 1. Verify System Prompt
//       expect(receivedSystemPrompt).toBe(expectedSystemPrompt);

//       // 2. Verify User Prompt Structure and Content
//       expect(receivedUserPrompt).toMatch(
//         /^Generate the content for the Project Overview document./
//       );
//       expect(receivedUserPrompt).toContain('PROJECT CONTEXT DATA:');
//       expect(receivedUserPrompt).toContain(`TEMPLATE:\n${mockTemplate}`);

//       // 3. Verify Relevant Context Inclusion (ProjectOverview)
//       // Verify Project Summary (using the default from the factory)
//       expect(receivedUserPrompt).toContain('**Project Summary (from codeInsights):**');
//       // Check against the default value set in the mock factory
//       expect(receivedUserPrompt).toContain(JSON.stringify('Default Mock Project Summary', null, 2));

//       // Verify Component Summaries (using the default from the factory)
//       expect(receivedUserPrompt).toContain('**Key Components (Summaries):**');
//       // Check against the default value set in the mock factory
//       const expectedComponentSummaries = [
//         { name: 'DefaultButton', summary: 'Default button component summary' },
//         { name: 'DefaultModal', summary: 'Default modal component summary' },
//       ].map((c: any) => ({
//         // Map to ensure only name/summary are compared if factory has more details
//         name: c.name,
//         summary: c.summary,
//       }));
//       expect(receivedUserPrompt).toContain(JSON.stringify(expectedComponentSummaries, null, 2));

//       // Verify Tech Stack (Languages/Frameworks) - uses techStack directly
//       expect(receivedUserPrompt).toContain('**Tech Stack (Languages/Frameworks):**');
//       const expectedTechStack = {
//         languages: mockContext.techStack?.languages,
//         frameworks: mockContext.techStack?.frameworks,
//       };
//       expect(receivedUserPrompt).toContain(JSON.stringify(expectedTechStack, null, 2));

//       // 4. Verify Irrelevant Context Exclusion (ProjectOverview)
//       expect(receivedUserPrompt).not.toContain('**Project Structure'); // Full structure excluded
//       expect(receivedUserPrompt).not.toContain('**Dependencies'); // Full dependencies excluded
//       expect(receivedUserPrompt).not.toContain('**Identified Functions'); // Functions excluded
//       expect(receivedUserPrompt).not.toContain('**Identified Classes'); // Classes excluded
//       expect(receivedUserPrompt).not.toContain('**Key Components (Usage & Details'); // Detailed components excluded
//       expect(receivedUserPrompt).not.toContain('**Tech Stack (Detailed)'); // Detailed tech stack excluded
//     });

//     it('should build correct prompts for TechnicalArchitecture', async () => {
//       const fileType = MemoryBankFileType.TechnicalArchitecture;
//       const mockContext = getTestContext(); // Use default mock context
//       const mockTemplate = 'Template for Arch <!-- LLM: Detail components -->';

//       await generator.generateContent(fileType, mockContext, mockTemplate);

//       expect(mockLLMAgent.getCompletion).toHaveBeenCalledTimes(1);
//       const [receivedSystemPrompt, receivedUserPrompt] = mockLLMAgent.getCompletion.mock.calls[0];

//       // 1. Verify System Prompt
//       expect(receivedSystemPrompt).toBe(expectedSystemPrompt);

//       // 2. Verify User Prompt Structure and Content
//       expect(receivedUserPrompt).toMatch(
//         /^Generate the content for the Technical Architecture document./
//       );
//       expect(receivedUserPrompt).toContain('PROJECT CONTEXT DATA:');
//       expect(receivedUserPrompt).toContain(`TEMPLATE:\n${mockTemplate}`);

//       // 3. Verify Relevant Context Inclusion (TechnicalArchitecture)
//       expect(receivedUserPrompt).toContain('**Tech Stack (Detailed):**');
//       expect(receivedUserPrompt).toContain(JSON.stringify(mockContext.techStack, null, 2));

//       expect(receivedUserPrompt).toContain('**Project Structure:**'); // Note: Title doesn't include "(Detailed)" in code
//       expect(receivedUserPrompt).toContain(JSON.stringify(mockContext.structure, null, 2));

//       expect(receivedUserPrompt).toContain('**Dependencies:**');
//       expect(receivedUserPrompt).toContain(JSON.stringify(mockContext.dependencies, null, 2));

//       // 3. Verify Relevant Context Inclusion (TechnicalArchitecture)
//       // ... (Tech Stack, Structure, Dependencies checks remain similar) ...
//       expect(receivedUserPrompt).toContain('**Tech Stack (Detailed):**');
//       expect(receivedUserPrompt).toContain(JSON.stringify(mockContext.techStack, null, 2));
//       expect(receivedUserPrompt).toContain('**Project Structure:**');
//       expect(receivedUserPrompt).toContain(JSON.stringify(mockContext.structure, null, 2));
//       expect(receivedUserPrompt).toContain('**Dependencies:**');
//       expect(receivedUserPrompt).toContain(JSON.stringify(mockContext.dependencies, null, 2));

//       // Verify Aggregated Functions
//       expect(receivedUserPrompt).toContain('**Identified Functions (Across Project):**');
//       // Aggregate functions from the mockCodeInsightsData map
//       const allFunctions = Object.values(mockContext.codeInsights)
//         .flatMap((insight) => insight.functions || [])
//         .filter((f) => f.name);
//       const expectedFunctions = allFunctions.map((f) => ({
//         name: f.name,
//         params: f.parameters.length,
//       }));
//       expect(receivedUserPrompt).toContain(JSON.stringify(expectedFunctions, null, 2));

//       // Verify Aggregated Classes
//       expect(receivedUserPrompt).toContain('**Identified Classes (Names Across Project):**');
//       // Aggregate class names from the mockCodeInsightsData map
//       const allClassNames = Object.values(mockContext.codeInsights)
//         .flatMap((insight) => insight.classes || [])
//         .map((c) => c.name)
//         .filter(Boolean);
//       expect(receivedUserPrompt).toContain(JSON.stringify(allClassNames, null, 2));

//       // 4. Verify Irrelevant Context Exclusion (TechnicalArchitecture)
//       expect(receivedUserPrompt).not.toContain('**Project Summary'); // Summary excluded
//       expect(receivedUserPrompt).not.toContain('**Key Components (Summaries):**'); // Component summaries excluded (full details might be implied by other sections)
//       expect(receivedUserPrompt).not.toContain('**Key Components (Usage & Details'); // Explicit Developer Guide section excluded
//       expect(receivedUserPrompt).not.toContain('**Tech Stack (Languages/Frameworks):**'); // Overview-specific tech stack excluded
//     });

//     it('should build correct prompts for DeveloperGuide', async () => {
//       const fileType = MemoryBankFileType.DeveloperGuide;
//       const mockContext = getTestContext(); // Use default mock context
//       const mockTemplate = 'Template for Dev Guide <!-- LLM: Explain Button component -->';

//       // Rely on the default components provided by the factory via (as any).components
//       // If specific components were needed:
//       // const mockContext = getTestContext({
//       //   _implementation_components: [ { name: 'SpecificComp', path: '...', summary: '...', details: {} } ]
//       // });

//       await generator.generateContent(fileType, mockContext, mockTemplate);

//       expect(mockLLMAgent.getCompletion).toHaveBeenCalledTimes(1);
//       const [receivedSystemPrompt, receivedUserPrompt] = mockLLMAgent.getCompletion.mock.calls[0];

//       // 1. Verify System Prompt
//       expect(receivedSystemPrompt).toBe(expectedSystemPrompt);

//       // 2. Verify User Prompt Structure and Content
//       expect(receivedUserPrompt).toMatch(/^Generate the content for the Developer Guide document./);
//       expect(receivedUserPrompt).toContain('PROJECT CONTEXT DATA:');
//       expect(receivedUserPrompt).toContain(`TEMPLATE:\n${mockTemplate}`);

//       // 3. Verify Relevant Context Inclusion (DeveloperGuide)
//       expect(receivedUserPrompt).toContain('**Tech Stack (for Setup):**');
//       expect(receivedUserPrompt).toContain(JSON.stringify(mockContext.techStack, null, 2));

//       expect(receivedUserPrompt).toContain('**Project Structure (Detailed):**');
//       expect(receivedUserPrompt).toContain(JSON.stringify(mockContext.structure, null, 2));

//       expect(receivedUserPrompt).toContain('**Dependencies (for Setup/Build):**');
//       expect(receivedUserPrompt).toContain(JSON.stringify(mockContext.dependencies, null, 2));

//       // 3. Verify Relevant Context Inclusion (DeveloperGuide)
//       // ... (Tech Stack, Structure, Dependencies checks remain similar) ...
//       expect(receivedUserPrompt).toContain('**Tech Stack (for Setup):**');
//       expect(receivedUserPrompt).toContain(JSON.stringify(mockContext.techStack, null, 2));
//       expect(receivedUserPrompt).toContain('**Project Structure (Detailed):**');
//       expect(receivedUserPrompt).toContain(JSON.stringify(mockContext.structure, null, 2));
//       expect(receivedUserPrompt).toContain('**Dependencies (for Setup/Build):**');
//       expect(receivedUserPrompt).toContain(JSON.stringify(mockContext.dependencies, null, 2));

//       // Verify Key Components (using the default from the factory)
//       expect(receivedUserPrompt).toContain(
//         '**Key Components (Usage & Details from codeInsights):**'
//       );
//       // Check against the default value set in the mock factory
//       const expectedComponents = [
//         { name: 'DefaultButton', summary: 'Default button component summary' },
//         { name: 'DefaultModal', summary: 'Default modal component summary' },
//       ];
//       expect(receivedUserPrompt).toContain(JSON.stringify(expectedComponents, null, 2)); // Includes full component details

//       // 4. Verify Irrelevant Context Exclusion (DeveloperGuide)
//       expect(receivedUserPrompt).not.toContain('**Project Summary'); // Summary excluded
//       expect(receivedUserPrompt).not.toContain('**Identified Functions'); // General function list excluded (might be within component details)
//       expect(receivedUserPrompt).not.toContain('**Identified Classes'); // General class list excluded (might be within component details)
//       expect(receivedUserPrompt).not.toContain('**Key Components (Summaries):**'); // Overview-specific component list excluded
//       expect(receivedUserPrompt).not.toContain('**Tech Stack (Languages/Frameworks):**'); // Overview-specific tech stack excluded
//       expect(receivedUserPrompt).not.toContain('**Tech Stack (Detailed):**'); // Arch-specific tech stack title excluded (uses 'for Setup')
//     });

//     it('should handle empty context sections gracefully', async () => {
//       const fileType = MemoryBankFileType.ProjectOverview;
//       // Create context with minimal data and empty codeInsights map
//       const mockContext = getTestContext({
//         // Override techStack with empty languages/frameworks to test ProjectOverview's specific formatting
//         techStack: { languages: [], frameworks: [] },
//         dependencies: undefined, // Keep this undefined
//         codeInsightsMap: {}, // Empty map for standard insights
//         // Explicitly override the non-standard properties to be empty/undefined for this test
//         _implementation_projectSummary: undefined,
//         _implementation_components: [],
//       });
//       const mockTemplate = 'Template for Empty Overview <!-- LLM: Handle missing data -->';

//       await generator.generateContent(fileType, mockContext, mockTemplate);

//       expect(mockLLMAgent.getCompletion).toHaveBeenCalledTimes(1);
//       const [, receivedUserPrompt] = mockLLMAgent.getCompletion.mock.calls[0];

//       // Verify sections are omitted, not included with null/empty data
//       expect(receivedUserPrompt).not.toContain('**Project Summary (from codeInsights):**'); // Should be skipped as value is undefined
//       expect(receivedUserPrompt).not.toContain('**Key Components (Summaries):**'); // Should be skipped as value is []

//       // Tech Stack IS included by formatContextSection because { languages: [], frameworks: [] } is not seen as empty
//       expect(receivedUserPrompt).toContain('**Tech Stack (Languages/Frameworks):**');
//       // Verify it contains the empty arrays
//       expect(receivedUserPrompt).toContain(
//         JSON.stringify({ languages: [], frameworks: [] }, null, 2)
//       );

//       // Check that the main structure is still present
//       expect(receivedUserPrompt).toContain('PROJECT CONTEXT DATA:');
//       expect(receivedUserPrompt).toContain(`TEMPLATE:\n${mockTemplate}`);
//       // Check if the "No specific context" message appears (optional, depends on exact logic if *all* sections are empty)
//       // Based on current code, the Tech Stack section IS added, so the note should NOT be present.
//       expect(receivedUserPrompt).not.toContain(
//         '*(No specific context data selected or available for this file type)*'
//       );
//     });

//     it('should handle JSON stringify errors in context formatting', async () => {
//       const fileType = MemoryBankFileType.ProjectOverview;
//       const circularRef: any = {};
//       circularRef.myself = circularRef; // Create circular reference

//       const mockContext = getTestContext({
//         // Override techStack to be non-circular and complete for this test part
//         techStack: {
//           languages: ['TypeScript'],
//           frameworks: ['React'],
//           buildTools: ['Webpack'], // Added missing
//           testingFrameworks: ['Jest'], // Added missing
//           linters: ['ESLint'], // Added missing
//           packageManager: 'npm', // Added missing
//         },
//         _implementation_projectSummary: circularRef,
//         _implementation_components: [],
//       });

//       const mockTemplate = 'Template for Error Handling';

//       await generator.generateContent(fileType, mockContext, mockTemplate);

//       expect(mockLLMAgent.getCompletion).toHaveBeenCalledTimes(1);
//       const [, receivedUserPrompt] = mockLLMAgent.getCompletion.mock.calls[0];

//       // Verify the section with the error shows the fallback message
//       expect(receivedUserPrompt).toContain('**Project Summary (from codeInsights):**');
//       expect(receivedUserPrompt).toContain(
//         JSON.stringify({ error: 'Failed to serialize data' }, null, 2)
//       );

//       // Verify other sections are still formatted correctly
//       expect(receivedUserPrompt).toContain('**Tech Stack (Languages/Frameworks):**');
//       const expectedTechStack = {
//         languages: mockContext.techStack?.languages,
//         frameworks: mockContext.techStack?.frameworks,
//       };
//       expect(receivedUserPrompt).toContain(JSON.stringify(expectedTechStack, null, 2));

//       // Verify logger was called with the error
//       // The logger receives ONE argument due to the template literal in the source code
//       expect(mockLogger.error).toHaveBeenCalledWith(
//         // Check that the single argument contains both the prefix and the error type text
//         expect.stringMatching(
//           /Failed to stringify context section "Project Summary \(from codeInsights\)".*TypeError: Converting circular structure to JSON/
//         )
//       );
//     });
//   });
// });
