/* eslint-disable @typescript-eslint/unbound-method */
import { GeneratorOrchestrator } from '../../../src/core/application/generator-orchestrator';
import { IGenerator } from '../../../src/core/generators/base-generator';
import { IProjectConfigService } from '../../../src/core/config/interfaces';
import { ILogger } from '../../../src/core/services/logger-service';
import { Result } from '../../../src/core/result/result';

describe('GeneratorOrchestrator (Unit)', () => {
  let mockProjectConfigService: jest.Mocked<IProjectConfigService>;
  let mockLogger: jest.Mocked<ILogger>;
  let mockAiMagicGenerator: jest.Mocked<IGenerator<any>>;
  let mockOtherGenerator: jest.Mocked<IGenerator<any>>;
  let orchestrator: GeneratorOrchestrator;

  beforeEach(() => {
    mockProjectConfigService = {
      loadConfig: jest.fn(),
      saveConfig: jest.fn(),
      validateConfig: jest.fn(), // Corrected mock
    };
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    mockAiMagicGenerator = {
      name: 'AiMagicGenerator',
      generate: jest.fn(),
      validate: jest.fn().mockResolvedValue(Result.ok(undefined)), // Corrected mock
    };

    mockOtherGenerator = {
      name: 'OtherGenerator',
      generate: jest.fn(),
      validate: jest.fn().mockResolvedValue(Result.ok(undefined)), // Corrected mock
    };

    // Initialize orchestrator with mocked generators
    orchestrator = new GeneratorOrchestrator(
      [mockAiMagicGenerator, mockOtherGenerator],
      mockProjectConfigService,
      mockLogger
    );
  });

  it('should register generators by name', () => {
    // Check if generators are registered in the internal map
    // Accessing private property for testing purposes
    const generatorsMap = (orchestrator as any).generatorsMap as Map<string, IGenerator<any>>;
    expect(generatorsMap.has('AiMagicGenerator')).toBe(true);
    expect(generatorsMap.has('OtherGenerator')).toBe(true);
    expect(generatorsMap.get('AiMagicGenerator')).toBe(mockAiMagicGenerator);
    expect(generatorsMap.get('OtherGenerator')).toBe(mockOtherGenerator);
  });

  describe('execute', () => {
    it('should route "generate" command to AiMagicGenerator with options and generatorType', async () => {
      const options = { generatorType: 'memory-bank', someOtherOption: 'value' };
      // Mock generate to return Result.ok with a string
      mockAiMagicGenerator.generate.mockResolvedValue(Result.ok('Generated content'));

      const result = await orchestrator.execute('generate', options);

      expect(result.isOk()).toBe(true);

      // Verify that generate was called with options and generatorType
      expect(mockAiMagicGenerator.generate).toHaveBeenCalledWith(options, options.generatorType);
      expect(mockOtherGenerator.generate).not.toHaveBeenCalled();
    });

    it('should return an error if AiMagicGenerator is not found for "generate" command', async () => {
      // Create an orchestrator without AiMagicGenerator
      const orchestratorWithoutAiMagic = new GeneratorOrchestrator(
        [mockOtherGenerator],
        mockProjectConfigService,
        mockLogger
      );

      const options = { generatorType: 'memory-bank' };
      const result = await orchestratorWithoutAiMagic.execute('generate', options);

      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('AiMagicGenerator not found');
      expect(mockAiMagicGenerator.generate).not.toHaveBeenCalled();
    });

    it('should return an error for unsupported commands', async () => {
      const options = {};
      const result = await orchestrator.execute('unsupported-command', options);

      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain("Command 'unsupported-command' not supported");
      expect(mockAiMagicGenerator.generate).not.toHaveBeenCalled();
      expect(mockOtherGenerator.generate).not.toHaveBeenCalled();
    });

    it('should propagate error from AiMagicGenerator execution', async () => {
      const options = { generatorType: 'roo' };
      const generatorError = new Error('AiMagicGenerator failed');
      mockAiMagicGenerator.generate.mockResolvedValue(Result.err(generatorError));

      const result = await orchestrator.execute('generate', options);

      expect(result.isErr()).toBe(true);
      expect(result.error).toStrictEqual(generatorError);

      expect(mockAiMagicGenerator.generate).toHaveBeenCalledWith(options, options.generatorType);
    });
  });

  // Add tests for executeGenerators if it's still intended for other uses
  // For now, assuming its primary use case is replaced by the new execute method for 'generate'
  // and it might be refactored or removed later.
});
