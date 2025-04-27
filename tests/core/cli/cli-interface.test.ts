// import chalk from 'chalk';
// import ora from 'ora';
// Removed unused imports for ApplicationContainer, IGeneratorOrchestrator, IProjectManager, ILogger, ProgressIndicator
import { CliInterface } from '../../../src/core/cli/cli-interface';
// Removed unused ICliInterface import

// Mock 'inquirer' which is a direct dependency of CliInterface
jest.mock('inquirer', () => ({
  prompt: jest.fn(),
}));
import inquirer from 'inquirer'; // Import the mocked module

// Mocks for ora and chalk remain as they might be used by CliInterface indirectly or in future tests
jest.mock('ora', () => {
  const mockOra = () => ({
    start: jest.fn().mockReturnThis(),
    stop: jest.fn().mockReturnThis(),
    succeed: jest.fn().mockReturnThis(),
    fail: jest.fn().mockReturnThis(),
    info: jest.fn().mockReturnThis(),
    warn: jest.fn().mockReturnThis(),
    error: jest.fn().mockReturnThis(),
  });
  return mockOra;
});

jest.mock('chalk', () => {
  return {
    green: jest.fn((text: string) => text),
    red: jest.fn((text: string) => text),
    yellow: jest.fn((text: string) => text),
    blue: jest.fn((text: string) => text),
    magenta: jest.fn((text: string) => text),
    cyan: jest.fn((text: string) => text),
  };
});

describe('CliInterface', () => {
  let cliInterface: CliInterface;
  let inquirerMock: jest.Mocked<typeof inquirer>;
  let originalArgv: string[];
  let mockExit: jest.SpyInstance; // Declare mock spy

  beforeEach(() => {
    // Store original process.argv
    originalArgv = process.argv;

    // Reset mocks before each test
    jest.clearAllMocks();

    // Mock process.exit to prevent test termination and allow assertion
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

    // Get the mocked inquirer instance
    inquirerMock = inquirer as jest.Mocked<typeof inquirer>;
    inquirerMock.prompt.mockResolvedValue({}); // Default mock implementation

    // Initialize CLI interface with mocked dependencies
    cliInterface = new CliInterface(inquirerMock);
    // DO NOT mock parseArgs here. We will test the actual method.
  });

  afterEach(() => {
    // Restore original process.argv after each test
    process.argv = originalArgv;
    // Restore process.exit mock
    if (mockExit) {
      mockExit.mockRestore();
    }
  });

  it('should properly parse generate command with memory-bank generator', async () => {
    // Arrange
    const expectedCommand = 'generate';
    const expectedGenerators = ['memory-bank'];
    // Set process.argv for this specific test case
    // Includes node executable and script path placeholders
    process.argv = ['node', 'cli.js', 'generate', '--generators', 'memory-bank'];

    // Act
    // Call the actual parseArgs method (no arguments needed)
    await cliInterface.parseArgs();
    const args = cliInterface.getParsedArgs();

    // Assert
    expect(args.command).toBe(expectedCommand);
    // Commander parses options into the options object directly
    expect(args.options.generators).toEqual(expectedGenerators);
  });

  it('should parse generate command with multiple generators', async () => {
    // Arrange
    const expectedCommand = 'generate';
    const expectedGenerators = ['rules', 'prompts'];
    process.argv = ['node', 'cli.js', 'generate', '--generators', 'rules', 'prompts']; // Commander handles multiple args

    // Act
    await cliInterface.parseArgs();
    const args = cliInterface.getParsedArgs();

    // Assert
    expect(args.command).toBe(expectedCommand);
    expect(args.options.generators).toEqual(expectedGenerators);
  });

  it('should handle generate command with no specific generators provided', async () => {
    // Arrange
    const expectedCommand = 'generate';
    // Commander sets the option value to an empty array if the flag is present but has no value(s)
    // Or undefined if the flag is not present at all. Let's test presence without value.
    const expectedGenerators: string[] = []; // Commander returns [] when the option is defined but not provided
    process.argv = ['node', 'cli.js', 'generate']; // No --generators flag

    // Act
    await cliInterface.parseArgs();
    const args = cliInterface.getParsedArgs();

    // Assert
    expect(args.command).toBe(expectedCommand);
    expect(args.options.generators).toEqual(expectedGenerators);
  });

  it('should parse config command with provider option', async () => {
    // Arrange
    const expectedCommand = 'config';
    const expectedProvider = 'openai';
    process.argv = ['node', 'cli.js', 'config', '--provider', 'openai'];

    // Act
    await cliInterface.parseArgs();
    const args = cliInterface.getParsedArgs();

    // Assert
    expect(args.command).toBe(expectedCommand);
    expect(args.options.provider).toBe(expectedProvider);
    expect(args.options.apiKey).toBeUndefined();
    expect(args.options.model).toBeUndefined();
  });

  it('should parse config command with all options', async () => {
    // Arrange
    const expectedCommand = 'config';
    const expectedProvider = 'anthropic';
    const expectedApiKey = 'sk-123';
    const expectedModel = 'claude-3';
    process.argv = [
      'node',
      'cli.js',
      'config',
      '--provider',
      expectedProvider,
      '--api-key',
      expectedApiKey,
      '--model',
      expectedModel,
    ];

    // Act
    await cliInterface.parseArgs();
    const args = cliInterface.getParsedArgs();

    // Assert
    expect(args.command).toBe(expectedCommand);
    expect(args.options.provider).toBe(expectedProvider);
    expect(args.options.apiKey).toBe(expectedApiKey);
    expect(args.options.model).toBe(expectedModel);
  });

  // Test case for when no command is provided (should default or show help)
  it('should have null command when no command is provided', async () => {
    // Arrange
    const expectedCommand = null; // As per parseArgs logic
    process.argv = ['node', 'cli.js']; // Only node and script name

    // Act
    await cliInterface.parseArgs();
    const args = cliInterface.getParsedArgs();

    // Assert
    expect(args.command).toBe(expectedCommand);
    expect(args.options).toEqual({}); // Should be empty options
  });

  // Test case for an unknown command
  it('should have null command for an unknown command', async () => {
    // Arrange
    const expectedCommand = null; // Commander doesn't call action for unknown commands
    process.argv = ['node', 'cli.js', 'unknown-command', '--some-option'];

    // Act
    // Note: Commander might exit or show help here in a real scenario,
    // but our parseArgs implementation catches this.
    await cliInterface.parseArgs();
    const args = cliInterface.getParsedArgs();

    // Assert
    expect(args.command).toBe(expectedCommand);
    expect(args.options).toEqual({});
  });
});
