/* eslint-disable @typescript-eslint/unbound-method */
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
    const filePath = path.join('.roo', 'rules-code', 'rules.md');
    const directoryPath = path.dirname(filePath);
    const content = '## Test Rules\n- Rule 1';

    it('should successfully save rules content to the specified file', async () => {
      // Arrange
      mockFileOps.createDirectory.mockResolvedValue(Result.ok(undefined)); // createDirectory returns void on success
      mockFileOps.writeFile.mockResolvedValue(Result.ok(undefined)); // writeFile returns void on success

      // Act
      const result = await rulesFileManager.saveRules(content, filePath);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.value).toBe(filePath); // Use getter
      expect(mockFileOps.createDirectory).toHaveBeenCalledWith(directoryPath);
      expect(mockFileOps.writeFile).toHaveBeenCalledWith(filePath, content);
      expect(mockLogger.info).toHaveBeenCalledWith(`Rules saved to: ${filePath}`);
    });

    it('should return an error if directory creation fails', async () => {
      // Arrange
      const error = new Error('Failed to create directory');
      mockFileOps.createDirectory.mockResolvedValue(Result.err(error));

      // Act
      const result = await rulesFileManager.saveRules(content, filePath);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(error); // Use getter
      expect(mockFileOps.writeFile).not.toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(`Error saving rules to ${filePath}:`, error);
    });

    it('should return an error if file writing fails', async () => {
      // Arrange
      const error = new Error('Failed to write file');
      mockFileOps.createDirectory.mockResolvedValue(Result.ok(undefined)); // createDirectory returns void on success
      mockFileOps.writeFile.mockResolvedValue(Result.err(error));

      // Act
      const result = await rulesFileManager.saveRules(content, filePath);

      // Assert
      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(error); // Use getter
      expect(mockFileOps.createDirectory).toHaveBeenCalledWith(directoryPath);
      expect(mockLogger.error).toHaveBeenCalledWith(`Error saving rules to ${filePath}:`, error);
    });
  });
});
