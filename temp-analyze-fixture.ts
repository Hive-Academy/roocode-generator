/* eslint-disable @typescript-eslint/no-floating-promises */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
// temp-analyze-fixture.ts
/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/require-await, @typescript-eslint/ban-ts-comment */
// @ts-nocheck - This is a temporary script for manual verification

import { ProjectAnalyzer } from './src/core/analysis/project-analyzer';
import { AstAnalysisService } from './src/core/analysis/ast-analysis.service';
import { FileOperations } from './src/core/file-operations/file-operations';
import { LoggerService } from './src/core/services/logger-service';
import { ResponseParser } from './src/core/analysis/response-parser';
import { ProgressIndicator } from './src/core/ui/progress-indicator';
import { FileContentCollector } from './src/core/analysis/file-content-collector';
import { FilePrioritizer } from './src/core/analysis/file-prioritizer';
import { TreeSitterParserService } from './src/core/analysis/tree-sitter-parser.service';
import { LLMAgent } from './src/core/llm/llm-agent'; // Import the actual LLMAgent
import { Result } from './src/core/result/result';
import { ProjectContext, GenericAstNode } from './src/core/analysis/types';
import path from 'path';
import fs from 'fs/promises'; // Use fs/promises for async file reading
import { fileURLToPath } from 'url'; // Import fileURLToPath

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mock dependencies or use simple implementations for the temporary script
const mockLogger: LoggerService = {
  debug: (message: string, ...args: any[]) => console.log(`DEBUG: ${message}`, ...args),
  info: (message: string, ...args: any[]) => console.log(`INFO: ${message}`, ...args),
  warn: (message: string, ...args: any[]) => console.warn(`WARN: ${message}`, ...args),
  error: (message: string, ...args: any[]) => console.error(`ERROR: ${message}`, ...args),
  // log method is not part of ILogger, remove or implement if needed elsewhere
};

// Simple mock for FileOperations - only need readFile and isDirectory for this test
const mockFileOps: FileOperations = {
  readFile: async (filePath: string) => {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return Result.ok(content);
    } catch (error: any) {
      return Result.err(error);
    }
  },
  readDir: async (dirPath: string) => {
    // This mock is simplified, may need enhancement if collectAnalyzableFiles is fully tested
    mockLogger.debug(`MOCK: readDir called with: ${dirPath}`);
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      // Return Dirent objects or strings depending on expected type
      return Result.ok(
        entries.map(
          (entry) => ({ name: entry.name, isDirectory: () => entry.isDirectory() }) as any
        )
      ); // Simplified Dirent mock
    } catch (error: any) {
      return Result.err(error);
    }
  },
  isDirectory: async (filePath: string) => {
    try {
      const stats = await fs.stat(filePath);
      return Result.ok(stats.isDirectory());
    } catch (error: any) {
      // Assume not a directory if stat fails (e.g., file not found)
      return Result.ok(false);
    }
  },
  writeFile: async (filePath: string, content: string) => {
    mockLogger.debug(`MOCK: writeFile called with ${filePath}`);
    return Result.ok(undefined);
  },
  createDirectory: async (dirPath: string) => {
    mockLogger.debug(`MOCK: createDirectory called with ${dirPath}`);
    return Result.ok(undefined);
  },
  pathExists: async (filePath: string) => {
    mockLogger.debug(`MOCK: pathExists called with ${filePath}`);
    return true;
  }, // Simplified mock
  remove: async (filePath: string) => {
    mockLogger.debug(`MOCK: remove called with ${filePath}`);
    return Result.ok(undefined);
  },
  copy: async (src: string, dest: string) => {
    mockLogger.debug(`MOCK: copy called with ${src} to ${dest}`);
    return Result.ok(undefined);
  },
  move: async (src: string, dest: string) => {
    mockLogger.debug(`MOCK: move called with ${src} to ${dest}`);
    return Result.ok(undefined);
  },
};

// Mock LLMAgent - we don't need actual LLM calls for this AST analysis verification
// We need to mock the methods used by ProjectAnalyzer and AstAnalysisService
const mockLLMAgent: LLMAgent = {
  getModelContextWindow: async () => 100000, // Sufficiently large context window
  countTokens: async (text: string) => text.length / 4, // Simple token count estimate
  getCompletion: async (systemPrompt: string, userPrompt: string) => {
    mockLogger.debug('MOCK: LLMAgent.getCompletion called.');
    // Return a mock LLM response that matches the expected CodeInsights structure
    // This mock response is crucial for verifying the parsing and validation logic
    const mockCodeInsights = {
      // Use a simple object here, not ProjectContext
      imports: [
        { source: 'react' },
        { source: 'react' }, // useState, useEffect from react
        { source: './utils' },
        { source: '../services/logger-service' },
      ],
      classes: [{ name: 'UserProfile' }],
      functions: [
        { name: 'constructor', parameters: ['logger', 'config'] },
        { name: 'getData', parameters: [] },
        { name: 'formatName', parameters: ['input'] },
        { name: 'onNameChange', parameters: ['newValue', 'oldValue'] },
        { name: 'formattedName', parameters: [] }, // Getter
        { name: 'formattedName', parameters: ['value'] }, // Setter
        { name: 'calculateTotal', parameters: ['price', 'quantity'] },
        { name: 'processData', parameters: ['data'] },
      ],
    };
    // The LLM response parser expects a string, often with markdown fences
    const mockResponseString = '```json\n' + JSON.stringify(mockCodeInsights, null, 2) + '\n```';
    return Result.ok(mockResponseString);
  },
  // Add other necessary LLMAgent methods with mock implementations if called by ProjectAnalyzer
  // Add dummy implementations for methods not used in this script to satisfy the interface
  analyzeProject: async (paths: string[]) => Result.err(new Error('Not implemented in mock')),
  analyzeCode: async (code: string, language: string) =>
    Result.err(new Error('Not implemented in mock')),
  analyzeText: async (text: string) => Result.err(new Error('Not implemented in mock')),
  generateCode: async (prompt: string) => Result.err(new Error('Not implemented in mock')),
  generateText: async (prompt: string) => Result.err(new Error('Not implemented in mock')),
  summarizeText: async (text: string) => Result.err(new Error('Not implemented in mock')),
  summarizeCode: async (code: string, language: string) =>
    Result.err(new Error('Not implemented in mock')),
  refactorCode: async (code: string, language: string, instructions: string) =>
    Result.err(new Error('Not implemented in mock')),
  reviewCode: async (code: string, language: string) =>
    Result.err(new Error('Not implemented in mock')),
  translateCode: async (code: string, fromLanguage: string, toLanguage: string) =>
    Result.err(new Error('Not implemented in mock')),
  findCodeSmells: async (code: string, language: string) =>
    Result.err(new Error('Not implemented in mock')),
  generateTests: async (code: string, language: string) =>
    Result.err(new Error('Not implemented in mock')),
  findBugs: async (code: string, language: string) =>
    Result.err(new Error('Not implemented in mock')),
  optimizeCode: async (code: string, language: string) =>
    Result.err(new Error('Not implemented in mock')),
  generateDocumentation: async (code: string, language: string) =>
    Result.err(new Error('Not implemented in mock')),
  generateCommitMessage: async (diff: string) => Result.err(new Error('Not implemented in mock')),
  generateReadme: async (projectContext: ProjectContext) =>
    Result.err(new Error('Not implemented in mock')),
  generateDeveloperGuide: async (projectContext: ProjectContext) =>
    Result.err(new Error('Not implemented in mock')),
  generateTechnicalArchitecture: async (projectContext: ProjectContext) =>
    Result.err(new Error('Not implemented in mock')),
  generateProjectOverview: async (projectContext: ProjectContext) =>
    Result.err(new Error('Not implemented in mock')),
  generateRoomodes: async (projectContext: ProjectContext) =>
    Result.err(new Error('Not implemented in mock')),
  generateVscodeCopilotRules: async (projectContext: ProjectContext) =>
    Result.err(new Error('Not implemented in mock')),
};

// Instantiate services with mocks
const logger = mockLogger;
const fileOps = mockFileOps;
const llmAgent = mockLLMAgent; // Injected mock LLM agent
const responseParser = new ResponseParser(logger); // ResponseParser needs logger
const progress = new ProgressIndicator(); // ProgressIndicator can be used directly
const contentCollector = new FileContentCollector(fileOps, logger); // Needs fileOps and logger
const filePrioritizer = new FilePrioritizer(); // FilePrioritizer has no dependencies
const treeSitterParserService = new TreeSitterParserService(logger); // Needs logger
const astAnalysisService = new AstAnalysisService(llmAgent, logger); // Needs LLMAgent and logger

// Instantiate ProjectAnalyzer with all dependencies
const projectAnalyzer = new ProjectAnalyzer(
  fileOps,
  logger,
  llmAgent, // Injected mock LLM agent
  responseParser,
  progress,
  contentCollector,
  filePrioritizer,
  treeSitterParserService,
  astAnalysisService // Injected AstAnalysisService
);

async function analyzeFixture() {
  const fixturePath = path.resolve(__dirname, 'tests/fixtures/sample-ast-analysis.ts');
  console.log(`Analyzing fixture file: ${fixturePath}`);

  // Run analysis on the single fixture file
  const result = await projectAnalyzer.analyzeProject([fixturePath]);

  if (result.isOk()) {
    console.log('\n--- ProjectContext Output for Fixture ---');
    console.log(JSON.stringify(result.value, null, 2));
    console.log('---------------------------------------\n');
    console.log('Fixture analysis successful.');
  } else {
    console.error('\n--- Fixture Analysis Failed ---');
    console.error(result.error);
    console.log('-------------------------------\n');
    console.log('Fixture analysis failed.');
  }
}

analyzeFixture();
