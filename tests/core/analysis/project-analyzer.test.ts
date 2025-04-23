// import { ProjectAnalyzer } from "../../../src/core/analysis/project-analyzer";
// import { IFileOperations } from "../../../src/core/file-operations/interfaces";
// import { ILogger } from "../../../src/core/services/logger-service";
// import { LLMAgent } from "../../../src/core/llm/llm-agent";
// import { Result } from "../../../src/core/result/result";
// import { Dirent } from "fs";
// import path from "path";

// /**
//  * Tests temporarily commented out - to be implemented later
//  * These tests verify the fix for ENOTDIR errors in ProjectAnalyzer
//  */

// describe("ProjectAnalyzer", () => {
//   let projectAnalyzer: ProjectAnalyzer;
//   let mockFileOps: jest.Mocked<IFileOperations>;
//   let mockLogger: jest.Mocked<ILogger>;
//   let mockLLMAgent: jest.Mocked<LLMAgent>;

//   beforeEach(() => {
//     mockFileOps = {
//       readFile: jest.fn(),
//       writeFile: jest.fn(),
//       createDirectory: jest.fn(),
//       validatePath: jest.fn(),
//       normalizePath: jest.fn(p => p),
//       readDir: jest.fn(),
//       exists: jest.fn(),
//       isDirectory: jest.fn(),
//     } as jest.Mocked<IFileOperations>;

//     mockLogger = {
//       debug: jest.fn(),
//       info: jest.fn(),
//       warn: jest.fn(),
//       error: jest.fn(),
//     } as jest.Mocked<ILogger>;

//     mockLLMAgent = {
//       getCompletion: jest.fn(),
//       analyzeProject: jest.fn(),
//     } as jest.Mocked<LLMAgent>;

//     projectAnalyzer = new ProjectAnalyzer(mockFileOps, mockLogger, mockLLMAgent);
//   });

//   describe("collectProjectFiles", () => {
//     it("should handle files and directories correctly", async () => {
//       // Mock directory structure:
//       // root/
//       //   ├── file1.ts
//       //   ├── file2.js
//       //   └── subdir/
//       //        └── file3.ts

//       const rootDir = "/root";
//       const subdir = path.join(rootDir, "subdir");
//       const testFile1 = path.join(rootDir, "file1.ts");
//       const testFile2 = path.join(rootDir, "file2.js");
//       const testFile3 = path.join(subdir, "file3.ts");

//       // Mock readDir responses
//       const mockReadDir = mockFileOps.readDir as jest.MockedFunction<typeof mockFileOps.readDir>;
//       mockReadDir
//         .mockResolvedValueOnce(Result.ok([
//           { name: "file1.ts", isDirectory: () => false } as Dirent,
//           { name: "file2.js", isDirectory: () => false } as Dirent,
//           { name: "subdir", isDirectory: () => true } as Dirent,
//         ]))
//         .mockResolvedValueOnce(Result.ok([
//           { name: "file3.ts", isDirectory: () => false } as Dirent,
//         ]));

//       // Mock isDirectory responses
//       const mockIsDirectory = mockFileOps.isDirectory as jest.MockedFunction<typeof mockFileOps.isDirectory>;
//       mockIsDirectory
//         .mockResolvedValueOnce(Result.ok(false)) // file1.ts
//         .mockResolvedValueOnce(Result.ok(false)) // file2.js
//         .mockResolvedValueOnce(Result.ok(true))  // subdir
//         .mockResolvedValueOnce(Result.ok(false)); // file3.ts

//       // Mock readFile responses
//       const mockReadFile = mockFileOps.readFile as jest.MockedFunction<typeof mockFileOps.readFile>;
//       mockReadFile
//         .mockResolvedValueOnce(Result.ok("content1"))
//         .mockResolvedValueOnce(Result.ok("content2"))
//         .mockResolvedValueOnce(Result.ok("content3"));

//       const files = await projectAnalyzer["collectProjectFiles"](rootDir);

//       // Verify correct files were collected
//       expect(files).toHaveLength(3);
//       expect(files).toContain(`File: file1.ts\ncontent1`);
//       expect(files).toContain(`File: file2.js\ncontent2`);
//       expect(files).toContain(`File: subdir/file3.ts\ncontent3`);

//       // Verify directory checks
//       expect(mockIsDirectory).toHaveBeenCalledWith(testFile1);
//       expect(mockIsDirectory).toHaveBeenCalledWith(testFile2);
//       expect(mockIsDirectory).toHaveBeenCalledWith(subdir);
//       expect(mockIsDirectory).toHaveBeenCalledWith(testFile3);
//     });

//     it("should handle ENOTDIR errors gracefully", async () => {
//       const rootDir = "/root";

//       const mockReadDir = mockFileOps.readDir as jest.MockedFunction<typeof mockFileOps.readDir>;
//       mockReadDir.mockResolvedValueOnce(Result.ok([
//         { name: "file1.ts", isDirectory: () => false } as Dirent,
//       ]));

//       // Simulate ENOTDIR error when checking if file is directory
//       const mockIsDirectory = mockFileOps.isDirectory as jest.MockedFunction<typeof mockFileOps.isDirectory>;
//       mockIsDirectory.mockResolvedValueOnce(
//         Result.err(new Error("ENOTDIR: not a directory"))
//       );

//       const files = await projectAnalyzer["collectProjectFiles"](rootDir);

//       // Verify error was logged
//       const mockWarn = mockLogger.warn as jest.MockedFunction<typeof mockLogger.warn>;
//       expect(mockWarn).toHaveBeenCalledWith(
//         expect.stringContaining("Error checking directory status")
//       );

//       // Verify we continued processing despite the error
//       expect(files).toHaveLength(0);
//     });

//     it("should skip excluded directories", async () => {
//       const rootDir = "/root";

//       const mockReadDir = mockFileOps.readDir as jest.MockedFunction<typeof mockFileOps.readDir>;
//       mockReadDir.mockResolvedValueOnce(Result.ok([
//         { name: "node_modules", isDirectory: () => true } as Dirent,
//         { name: "dist", isDirectory: () => true } as Dirent,
//         { name: ".git", isDirectory: () => true } as Dirent,
//         { name: "coverage", isDirectory: () => true } as Dirent,
//       ]));

//       const files = await projectAnalyzer["collectProjectFiles"](rootDir);

//       // Verify excluded directories were skipped
//       const mockIsDirectory = mockFileOps.isDirectory as jest.MockedFunction<typeof mockFileOps.isDirectory>;
//       expect(mockIsDirectory).not.toHaveBeenCalled();
//       expect(files).toHaveLength(0);

//       // Verify skip was logged
//       const mockDebug = mockLogger.debug as jest.MockedFunction<typeof mockLogger.debug>;
//       expect(mockDebug).toHaveBeenCalledWith(
//         expect.stringContaining("Skipping excluded directory")
//       );
//     });

//     it("should handle readDir errors gracefully", async () => {
//       const rootDir = "/root";

//       const mockReadDir = mockFileOps.readDir as jest.MockedFunction<typeof mockFileOps.readDir>;
//       mockReadDir.mockResolvedValueOnce(
//         Result.err(new Error("Failed to read directory"))
//       );

//       const files = await projectAnalyzer["collectProjectFiles"](rootDir);

//       expect(files).toHaveLength(0);
//       const mockDebug = mockLogger.debug as jest.MockedFunction<typeof mockLogger.debug>;
//       expect(mockDebug).toHaveBeenCalledWith(
//         expect.stringContaining("Failed to read directory")
//       );
//     });
//   });
// });
