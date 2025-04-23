// import { RulesTemplateManager } from "../../../src/core/templating/rules-template-manager";
// import { IFileOperations } from "../../../src/core/file-operations/interfaces";
// import { ILogger } from "../../../src/core/services/logger-service";
// import { LLMAgent } from "../../../src/core/llm/llm-agent";
// import { Result } from "../../../src/core/result/result";

// describe("RulesTemplateManager", () => {
//   let mockFileOperations: jest.Mocked<IFileOperations>;
//   let mockLogger: jest.Mocked<ILogger>;
//   let mockLLMAgent: jest.Mocked<LLMAgent>;
//   let templateManager: RulesTemplateManager;

//   beforeEach(() => {
//     mockFileOperations = {
//       readTextFile: jest.fn(),
//       writeTextFile: jest.fn(),
//       readJsonFile: jest.fn(),
//       writeJsonFile: jest.fn(),
//       createDirectory: jest.fn(),
//       pathExists: jest.fn(),
//       isDirectory: jest.fn(),
//       isFile: jest.fn(),
//       getDirectoryContents: jest.fn(),
//       copyFile: jest.fn(),
//       deleteFile: jest.fn(),
//       deleteDirectory: jest.fn(),
//       getRelativePath: jest.fn(),
//       getAbsolutePath: jest.fn(),
//       joinPaths: jest.fn(),
//       dirname: jest.fn(),
//       basename: jest.fn(),
//       extname: jest.fn(),
//     };
//     mockLogger = {
//       info: jest.fn(),
//       warn: jest.fn(),
//       error: jest.fn(),
//       debug: jest.fn(),
//     };
//     mockLLMAgent = {
//       getCompletion: jest.fn(),
//       getChatCompletion: jest.fn(),
//     };

//     templateManager = new RulesTemplateManager(
//       mockFileOperations,
//       mockLogger,
//       mockLLMAgent // LLMAgent is a dependency of RulesTemplateManager, though not directly used in template loading/merging
//     );
//   });

//   // Test case for successful loading of base template
//   test("loadBaseTemplate should load the base template successfully", async () => {
//     const mode = "testMode";
//     const expectedPath = `templates/rules/${mode}-rules.md`;
//     const mockContent = "Base template content";
//     mockFileOperations.readTextFile.mockResolvedValue(Result.ok(mockContent));
//     mockFileOperations.pathExists.mockResolvedValue(Result.ok(true)); // Assume base template exists

//     const result = await templateManager.loadBaseTemplate(mode);

//     expect(result.isOk()).toBe(true);
//     expect(result.value).toBe(mockContent);
//     expect(mockFileOperations.readTextFile).toHaveBeenCalledWith(expectedPath);
//     expect(mockLogger.info).toHaveBeenCalledWith(
//       `Loading base template for mode: ${mode} from ${expectedPath}`
//     );
//   });

//   // Test case for base template not found
//   test("loadBaseTemplate should return an error if base template is not found", async () => {
//     const mode = "nonExistentMode";
//     const expectedPath = `templates/rules/${mode}-rules.md`;
//     mockFileOperations.pathExists.mockResolvedValue(Result.ok(false)); // Base template does not exist

//     const result = await templateManager.loadBaseTemplate(mode);

//     expect(result.isErr()).toBe(true);
//     expect(result.error?.message).toContain(
//       `Base template not found for mode: ${mode} at ${expectedPath}`
//     );
//     expect(mockFileOperations.pathExists).toHaveBeenCalledWith(expectedPath);
//     expect(mockLogger.error).toHaveBeenCalledWith(
//       `Base template not found for mode: ${mode} at ${expectedPath}`
//     );
//   });

//   // Test case for error during base template read
//   test("loadBaseTemplate should return an error if reading base template fails", async () => {
//     const mode = "testMode";
//     const expectedPath = `templates/rules/${mode}-rules.md`;
//     const mockError = new Error("Read error");
//     mockFileOperations.pathExists.mockResolvedValue(Result.ok(true));
//     mockFileOperations.readTextFile.mockResolvedValue(Result.err(mockError));

//     const result = await templateManager.loadBaseTemplate(mode);

//     expect(result.isErr()).toBe(true);
//     expect(result.error).toBe(mockError);
//     expect(mockFileOperations.readTextFile).toHaveBeenCalledWith(expectedPath);
//     expect(mockLogger.error).toHaveBeenCalledWith(
//       `Failed to read base template for mode ${mode} from ${expectedPath}`,
//       mockError
//     );
//   });

//   // Test case for successful loading of customizations (file exists)
//   test("loadCustomizations should load customizations if the file exists", async () => {
//     const mode = "testMode";
//     const expectedPath = `.roo/rules-${mode}/customizations.md`;
//     const mockContent = "Customization content";
//     mockFileOperations.pathExists.mockResolvedValue(Result.ok(true)); // Customization file exists
//     mockFileOperations.readTextFile.mockResolvedValue(Result.ok(mockContent));

//     const result = await templateManager.loadCustomizations(mode);

//     expect(result.isOk()).toBe(true);
//     expect(result.value).toBe(mockContent);
//     expect(mockFileOperations.pathExists).toHaveBeenCalledWith(expectedPath);
//     expect(mockFileOperations.readTextFile).toHaveBeenCalledWith(expectedPath);
//     expect(mockLogger.info).toHaveBeenCalledWith(
//       `Loading customizations for mode: ${mode} from ${expectedPath}`
//     );
//   });

//   // Test case for no customizations (file does not exist)
//   test("loadCustomizations should return empty string if customization file does not exist", async () => {
//     const mode = "testMode";
//     const expectedPath = `.roo/rules-${mode}/customizations.md`;
//     mockFileOperations.pathExists.mockResolvedValue(Result.ok(false)); // Customization file does not exist

//     const result = await templateManager.loadCustomizations(mode);

//     expect(result.isOk()).toBe(true);
//     expect(result.value).toBe("");
//     expect(mockFileOperations.pathExists).toHaveBeenCalledWith(expectedPath);
//     expect(mockFileOperations.readTextFile).not.toHaveBeenCalled(); // Should not try to read
//     expect(mockLogger.info).toHaveBeenCalledWith(
//       `No customizations found for mode: ${mode} at ${expectedPath}. Using base template only.`
//     );
//   });

//   // Test case for error during customization read
//   test("loadCustomizations should return an error if reading customization file fails", async () => {
//     const mode = "testMode";
//     const expectedPath = `.roo/rules-${mode}/customizations.md`;
//     const mockError = new Error("Read error");
//     mockFileOperations.pathExists.mockResolvedValue(Result.ok(true));
//     mockFileOperations.readTextFile.mockResolvedValue(Result.err(mockError));

//     const result = await templateManager.loadCustomizations(mode);

//     expect(result.isErr()).toBe(true);
//     expect(result.error).toBe(mockError);
//     expect(mockFileOperations.pathExists).toHaveBeenCalledWith(expectedPath);
//     expect(mockFileOperations.readTextFile).toHaveBeenCalledWith(expectedPath);
//     expect(mockLogger.error).toHaveBeenCalledWith(
//       `Failed to read customizations for mode ${mode} from ${expectedPath}`,
//       mockError
//     );
//   });

//   // Test case for successful merging with customization
//   test("mergeTemplates should merge base and custom templates", () => {
//     const base = "Base content\n{{CUSTOMIZATIONS}}";
//     const custom = "Custom content";
//     const expected = "Base content\nCustom content";

//     const result = templateManager.mergeTemplates(base, custom);

//     expect(result.isOk()).toBe(true);
//     expect(result.value).toBe(expected);
//     expect(mockLogger.info).toHaveBeenCalledWith("Merging base template with customizations.");
//   });

//   // Test case for successful merging without customization placeholder
//   test("mergeTemplates should append custom content if placeholder is missing", () => {
//     const base = "Base content";
//     const custom = "Custom content";
//     const expected = "Base content\n\nCustom content"; // Appends with double newline

//     const result = templateManager.mergeTemplates(base, custom);

//     expect(result.isOk()).toBe(true);
//     expect(result.value).toBe(expected);
//     expect(mockLogger.warn).toHaveBeenCalledWith(
//       'Customization placeholder "{{CUSTOMIZATIONS}}" not found in base template. Appending customizations.'
//     );
//   });

//   // Test case for merging with empty custom content
//   test("mergeTemplates should return base template if custom content is empty", () => {
//     const base = "Base content\n{{CUSTOMIZATIONS}}";
//     const custom = "";
//     const expected = "Base content\n"; // Placeholder is replaced with empty string

//     const result = templateManager.mergeTemplates(base, custom);

//     expect(result.isOk()).toBe(true);
//     expect(result.value).toBe(expected);
//     expect(mockLogger.info).toHaveBeenCalledWith("Merging base template with customizations.");
//   });

//   // Test case for merging with empty base content
//   test("mergeTemplates should return custom content if base content is empty", () => {
//     const base = "";
//     const custom = "Custom content";
//     const expected = "\n\nCustom content"; // Appends with double newline if base is empty

//     const result = templateManager.mergeTemplates(base, custom);

//     expect(result.isOk()).toBe(true);
//     expect(result.value).toBe(expected);
//     expect(mockLogger.warn).toHaveBeenCalledWith(
//       'Customization placeholder "{{CUSTOMIZATIONS}}" not found in base template. Appending customizations.'
//     );
//   });

//   // Test case for merging with both empty
//   test("mergeTemplates should return empty string if both base and custom are empty", () => {
//     const base = "";
//     const custom = "";
//     const expected = "";

//     const result = templateManager.mergeTemplates(base, custom);

//     expect(result.isOk()).toBe(true);
//     expect(result.value).toBe(expected);
//     expect(mockLogger.warn).toHaveBeenCalledWith(
//       'Customization placeholder "{{CUSTOMIZATIONS}}" not found in base template. Appending customizations.'
//     );
//   });

//   // Test case for mergeTemplates error handling (e.g., invalid input types - though TS helps here)
//   // This might be less critical with TypeScript, but good to consider if inputs could be 'any'
//   test("mergeTemplates should handle non-string inputs gracefully (if possible)", () => {
//     // This test is more conceptual for JS; TS prevents invalid types at compile time.
//     // If inputs were 'any', we'd add runtime checks. With TS, we trust the types.
//     const base: any = 123;
//     const custom: any = "custom";
//     // TS would flag this, but if it somehow happened at runtime:
//     // The current implementation would likely throw a TypeError from String.prototype.replace or template literal.
//     // We could wrap in try/catch if needed, but for now, rely on TS.
//     expect(() => templateManager.mergeTemplates(base, custom)).toThrow();
//   });
// });
