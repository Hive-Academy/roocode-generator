/*
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { MemoryBankGenerator } from "../../src/memory-bank/MemoryBankGenerator";
import {
  IMemoryBankValidator,
  IMemoryBankFileManager,
  IMemoryBankTemplateManager,
  IContentProcessor,
  MemoryBankFileType,
} from "../../src/memory-bank/interfaces";
import { ILogger } from "../../src/core/services/logger-service";
import { IProjectConfigService } from "../../src/core/config/interfaces";
import { Result } from "../../src/core/result/result";
import { ProjectConfig } from "../../types/shared";

// Mocks
const mockValidator: jest.Mocked<IMemoryBankValidator> = {
  validateRequiredFiles: jest.fn(),
  validateTemplateFiles: jest.fn(),
  validateFileContent: jest.fn(),
};

const mockFileManager: jest.Mocked<IMemoryBankFileManager> = {
  createMemoryBankDirectory: jest.fn(),
  writeMemoryBankFile: jest.fn(),
  readMemoryBankFile: jest.fn(),
};

const mockTemplateManager: jest.Mocked<IMemoryBankTemplateManager> = {
  loadTemplate: jest.fn(),
  validateTemplate: jest.fn(),
};

const mockContentProcessor: jest.Mocked<IContentProcessor> = {
  stripMarkdownCodeBlock: jest.fn(),
  processTemplate: jest.fn(),
};

const mockLogger: jest.Mocked<ILogger> = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const mockProjectConfigService: jest.Mocked<IProjectConfigService> = {
  loadConfig: jest.fn(),
  saveConfig: jest.fn(),
  getConfigFilePath: jest.fn(),
};

describe("MemoryBankGenerator", () => {
  let generator: MemoryBankGenerator;
  const validConfig: ProjectConfig = {
    name: "test-project",
    baseDir: ".",
    rootDir: ".roo",
    generators: ["MemoryBank"],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Provide all required mocks, including the new projectConfigService
    generator = new MemoryBankGenerator(
      mockValidator,
      mockFileManager,
      mockTemplateManager,
      mockContentProcessor,
      mockLogger,
      mockProjectConfigService // Add the mock here
    );
    // Mock successful config loading by default
    mockProjectConfigService.loadConfig.mockResolvedValue(Result.ok(validConfig));
  });

  it("should have the correct name", () => {
    expect(generator.name).toBe("MemoryBank");
  });

  describe("validate", () => {
    it("should return ok if validator succeeds", async () => {
      mockValidator.validateRequiredFiles.mockResolvedValue(Result.ok(undefined));
      const result = await generator.validate();
      expect(result.isOk()).toBe(true);
      expect(mockValidator.validateRequiredFiles).toHaveBeenCalledWith("."); // Assuming baseDir is '.'
    });

    it("should return error if validator fails", async () => {
      const error = new Error("Validation failed");
      mockValidator.validateRequiredFiles.mockResolvedValue(Result.err(error));
      const result = await generator.validate();
      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(error);
    });
  });

  describe("generate", () => {
    beforeEach(() => {
      // Setup successful validation and template loading for generate tests
      mockValidator.validateRequiredFiles.mockResolvedValue(Result.ok(undefined));
      mockTemplateManager.loadTemplate.mockImplementation(async (name) =>
        Result.ok(`Template content for ${name}`)
      );
      mockFileManager.createMemoryBankDirectory.mockResolvedValue(Result.ok(undefined));
      mockFileManager.writeMemoryBankFile.mockResolvedValue(Result.ok(undefined));
    });

    it("should return ok if generation succeeds for all files", async () => {
      // Fix: Call generate without arguments
      const result = await generator.generate();
      expect(result.isOk()).toBe(true);
      expect(mockFileManager.createMemoryBankDirectory).toHaveBeenCalledTimes(1);
      // Check if write was called for each file type
      expect(mockFileManager.writeMemoryBankFile).toHaveBeenCalledTimes(
        Object.keys(MemoryBankFileType).length
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        "MemoryBank generation completed successfully."
      );
    });

    it("should return error if project config loading fails", async () => {
      const configError = new Error("Failed to load config");
      mockProjectConfigService.loadConfig.mockResolvedValue(Result.err(configError));
      // Fix: Call generate without arguments
      const result = await generator.generate();
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain("Failed to load project config");
    });

    it("should return error if creating directory fails", async () => {
      const dirError = new Error("Cannot create dir");
      mockFileManager.createMemoryBankDirectory.mockResolvedValue(Result.err(dirError));
      // Fix: Call generate without arguments
      const result = await generator.generate();
      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(dirError);
    });

    it("should return error if loading a template fails", async () => {
      const templateError = new Error("Cannot load template");
      mockTemplateManager.loadTemplate.mockResolvedValueOnce(Result.err(templateError)); // Fail first template load
      // Fix: Call generate without arguments
      const result = await generator.generate();
      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(templateError);
    });

    it("should return error if writing a file fails", async () => {
      const writeError = new Error("Cannot write file");
      mockFileManager.writeMemoryBankFile.mockResolvedValueOnce(Result.err(writeError)); // Fail first write
      // Fix: Call generate without arguments
      const result = await generator.generate();
      expect(result.isErr()).toBe(true);
      expect(result.error).toBe(writeError);
    });
  });
});
*/
