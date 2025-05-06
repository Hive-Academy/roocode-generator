// tests/generators/rules-file-manager.test.ts
import { RulesFileManager } from '../../src/generators/rules/rules-file-manager';
import { IFileOperations } from '../../src/core/file-operations/interfaces';
import { ILogger } from '../../src/core/services/logger-service'; // Corrected path again
import { Result } from '../../src/core/result/result';
import { mock, MockProxy } from 'jest-mock-extended';
import path from 'path';

describe('RulesFileManager', () => {
  let rulesFileManager: RulesFileManager;
  let mockFileOps: MockProxy<IFileOperations>;
  let mockLogger: MockProxy<ILogger>;

  beforeEach(() => {
    mockFileOps = mock<IFileOperations>();
    mockLogger = mock<ILogger>();
    // Use type assertions to satisfy ESLint with mocks
    rulesFileManager = new RulesFileManager(mockFileOps as IFileOperations, mockLogger as ILogger);
  });

  it('should be defined', () => {
    expect(rulesFileManager).toBeDefined();
  });

  describe('saveRules', () => {
    it('should successfully save rules content to the specified file', async () => {
      // Arrange
      const filePath = path.join('.roo', 'rules-code', 'rules.md');
      const directoryPath = path.dirname(filePath);
      const content = '## Test Rules\n- Rule 1';
      mockFileOps.createDirectory.mockResolvedValue(Result.ok(undefined)); // createDirectory returns void on success
      mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined)); // writeFile returns void on success

      // Act
      const result = await rulesFileManager.saveRules(filePath, content); // Pass correct args

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.value).toBe(filePath); // Use getter
      // Check calls array to avoid unbound-method error
      expect(mockFileOps.createDirectory.mock.calls).toContainEqual([directoryPath]);
      expect(mockFileOps.writeFile.mock.calls).toContainEqual([filePath, content]);
      // Check calls array for logger info
      expect(mockLogger.info.mock.calls).toContainEqual([
        `Successfully saved rules to ${filePath}`,
      ]);
      // Also check the initial attempt log
      expect(mockLogger.info.mock.calls).toContainEqual([
        `Attempting to save rules to: ${filePath}`,
      ]);
    });

    it('should return an error if directory creation fails', async () => {
      // Arrange
      const filePath = path.join('.roo', 'rules-code', 'rules.md');
      const directoryPath = path.dirname(filePath);
      const content = '## Test Rules\n- Rule 1';
      const error = new Error('Failed to create directory');
      mockFileOps.createDirectory.mockResolvedValue(Result.err(error));

      // Act
      const result = await rulesFileManager.saveRules(filePath, content); // Pass correct args

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(error); // Use getter
      // Check that writeFile was not called using mock.calls length
      expect(mockFileOps.writeFile.mock.calls.length).toBe(0);
      // Expect the actual log message from the source code
      // Check calls array for logger error
      expect(mockLogger.error.mock.calls).toContainEqual([
        `Failed to ensure directory ${directoryPath} exists`,
        error,
      ]);
    });

    it('should return an error if file writing fails', async () => {
      // Arrange
      const filePath = path.join('.roo', 'rules-code', 'rules.md');
      const directoryPath = path.dirname(filePath);
      const content = '## Test Rules\n- Rule 1';
      const error = new Error('Failed to write file');
      mockFileOps.createDirectory.mockResolvedValue(Result.ok(undefined)); // createDirectory returns void on success
      mockFileOps.writeFile.mockResolvedValue(Result.err(error));

      // Act
      const result = await rulesFileManager.saveRules(filePath, content); // Pass correct args

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(error); // Use getter
      // Check calls array to avoid unbound-method error
      expect(mockFileOps.createDirectory.mock.calls).toContainEqual([directoryPath]);
      // Check calls array for logger error
      expect(mockLogger.error.mock.calls).toContainEqual([
        `Failed to write rules file to ${filePath}`,
        error,
      ]);
    });
  });
});
