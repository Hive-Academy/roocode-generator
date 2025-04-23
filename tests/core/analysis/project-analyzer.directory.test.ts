// import { ProjectAnalyzer } from "../../../src/core/analysis/project-analyzer";
// import { IFileOperations } from "../../../src/core/file-operations/interfaces";
// import { ILogger } from "../../../src/core/services/logger-service";
// import { LLMAgent } from "../../../src/core/llm/llm-agent";
// import { Result } from "../../../src/core/result/result";
// import { Dirent } from "fs";

// describe("ProjectAnalyzer Directory Handling", () => {
//   let analyzer: ProjectAnalyzer;
//   let mockFileOps: jest.Mocked<IFileOperations>;
//   let mockLogger: jest.Mocked<ILogger>;
//   let mockLLMAgent: jest.Mocked<LLMAgent>;

//   beforeEach(() => {
//     mockFileOps = {
//       readFile: jest.fn(),
//       writeFile: jest.fn(),
//       createDirectory: jest.fn(),
//       validatePath: jest.fn(),
//       normalizePath: jest.fn(),
//       readDir: jest.fn(),
//       exists: jest.fn(),
//     };

//     mockLogger = {
//       debug: jest.fn(),
//       info: jest.fn(),
//       warn: jest.fn(),
//       error: jest.fn(),
//     };

//     mockLLMAgent = {
//       getCompletion: jest.fn(),
//       analyzeProject: jest.fn(),
//     };

//     analyzer = new ProjectAnalyzer(mockFileOps, mockLogger, mockLLMAgent);
//   });

//   describe("isDirectory", () => {
//     const expectDebugLog = (message: string): void => {
//       expect(mockLogger.debug).toHaveBeenCalledWith(message);
//     };

//     const expectWarnLog = (message: string): void => {
//       expect(mockLogger.warn).toHaveBeenCalledWith(message);
//     };

//     it("should handle non-existent paths", async (): Promise<void> => {
//       mockFileOps.exists.mockResolvedValue(Result.ok(false));

//       const result = await (analyzer as any).isDirectory("/non/existent/path");

//       expect(result.isOk()).toBe(true);
//       expect(result.value).toBe(false);
//       expectDebugLog("Path does not exist: /non/existent/path");
//     });

//     it("should handle regular files", async (): Promise<void> => {
//       mockFileOps.exists.mockResolvedValue(Result.ok(true));
//       mockFileOps.readFile.mockResolvedValue(Result.ok("file content"));

//       const result = await (analyzer as any).isDirectory("/path/to/file.txt");

//       expect(result.isOk()).toBe(true);
//       expect(result.value).toBe(false);
//       expectDebugLog("Path is a file: /path/to/file.txt");
//     });

//     it("should handle ENOTDIR errors gracefully", async (): Promise<void> => {
//       mockFileOps.exists.mockResolvedValue(Result.ok(true));
//       mockFileOps.readFile.mockResolvedValue(Result.err(new Error("ENOTDIR: not a directory")));

//       const result = await (analyzer as any).isDirectory("/path/to/file.txt");

//       expect(result.isOk()).toBe(true);
//       expect(result.value).toBe(false);
//       expectDebugLog("Path is not a directory: /path/to/file.txt");
//     });

//     it("should handle other file system errors", async (): Promise<void> => {
//       mockFileOps.exists.mockResolvedValue(Result.ok(true));
//       mockFileOps.readFile.mockResolvedValue(Result.err(new Error("Permission denied")));

//       const result = await (analyzer as any).isDirectory("/path/to/something");

//       expect(result.isErr()).toBe(true);
//       expectDebugLog(
//         "Failed to read stats for path: /path/to/something , Error: Permission denied"
//       );
//     });
//   });

//   describe("discoverSourceDirectories", () => {
//     const expectDebugLog = (message: string): void => {
//       expect(mockLogger.debug).toHaveBeenCalledWith(message);
//     };

//     const expectWarnLog = (message: string): void => {
//       expect(mockLogger.warn).toHaveBeenCalledWith(message);
//     };

//     it("should skip non-directory entries", async (): Promise<void> => {
//       mockFileOps.readDir.mockResolvedValue(
//         Result.ok([
//           { name: "src", isDirectory: () => true } as Dirent,
//           { name: "package.json", isDirectory: () => false } as Dirent,
//         ])
//       );

//       mockFileOps.exists.mockImplementation(() => Promise.resolve(Result.ok(true)));
//       mockFileOps.readFile.mockImplementation((path: string) => {
//         if (path.includes("package.json")) {
//           return Promise.resolve(Result.ok("file content"));
//         }
//         return Promise.resolve(Result.err(new Error("ENOTDIR")));
//       });

//       const dirs = await (analyzer as any).discoverSourceDirectories("/root");

//       expect(dirs).toContain("src");
//       expect(dirs).not.toContain("package.json");
//       expectDebugLog("Skipping non-directory entry: package.json");
//     });

//     it("should handle directory check errors gracefully", async (): Promise<void> => {
//       mockFileOps.readDir.mockResolvedValue(
//         Result.ok([{ name: "src", isDirectory: () => true } as Dirent])
//       );

//       mockFileOps.exists.mockResolvedValue(Result.ok(true));
//       mockFileOps.readFile.mockResolvedValue(Result.err(new Error("Permission denied")));

//       const dirs = await (analyzer as any).discoverSourceDirectories("/root");

//       expect(dirs).toHaveLength(0);
//       expectWarnLog("Error checking directory status: /root/src - Error: Permission denied");
//     });
//   });

//   describe("containsSourceFiles", () => {
//     const expectDebugLog = (message: string): void => {
//       expect(mockLogger.debug).toHaveBeenCalledWith(message);
//     };

//     const expectWarnLog = (message: string): void => {
//       expect(mockLogger.warn).toHaveBeenCalledWith(message);
//     };

//     it("should handle directory check errors gracefully", async (): Promise<void> => {
//       mockFileOps.exists.mockResolvedValue(Result.ok(true));
//       mockFileOps.readFile.mockResolvedValue(Result.err(new Error("Permission denied")));

//       const result = await (analyzer as any).containsSourceFiles("/path/to/dir");

//       expect(result).toBe(false);
//       expectWarnLog("Error checking directory status: /path/to/dir - Error: Permission denied");
//     });

//     it("should skip non-directory paths", async (): Promise<void> => {
//       mockFileOps.exists.mockResolvedValue(Result.ok(true));
//       mockFileOps.readFile.mockResolvedValue(Result.ok("file content"));

//       const result = await (analyzer as any).containsSourceFiles("/path/to/file.txt");

//       expect(result).toBe(false);
//       expectDebugLog("Skipping source files check for non-directory path: /path/to/file.txt");
//     });
//   });

//   describe("findComponents", () => {
//     const expectDebugLog = (message: string): void => {
//       expect(mockLogger.debug).toHaveBeenCalledWith(message);
//     };

//     const expectWarnLog = (message: string): void => {
//       expect(mockLogger.warn).toHaveBeenCalledWith(message);
//     };

//     it("should handle directory check errors gracefully", async (): Promise<void> => {
//       mockFileOps.exists.mockResolvedValue(Result.ok(true));
//       mockFileOps.readFile.mockResolvedValue(Result.err(new Error("Permission denied")));

//       const components = await (analyzer as any).findComponents("/path/to/dir");

//       expect(components).toHaveLength(0);
//       expectWarnLog("Error checking directory status: /path/to/dir - Error: Permission denied");
//     });

//     it("should skip non-directory paths", async (): Promise<void> => {
//       mockFileOps.exists.mockResolvedValue(Result.ok(true));
//       mockFileOps.readFile.mockResolvedValue(Result.ok("file content"));

//       const components = await (analyzer as any).findComponents("/path/to/file.txt");

//       expect(components).toHaveLength(0);
//       expectDebugLog("Skipping component search in non-directory: /path/to/file.txt");
//     });
//   });

//   describe("findSourceFiles", () => {
//     const expectDebugLog = (message: string): void => {
//       expect(mockLogger.debug).toHaveBeenCalledWith(message);
//     };

//     const expectWarnLog = (message: string): void => {
//       expect(mockLogger.warn).toHaveBeenCalledWith(message);
//     };

//     it("should handle directory check errors gracefully", async (): Promise<void> => {
//       mockFileOps.exists.mockResolvedValue(Result.ok(true));
//       mockFileOps.readFile.mockResolvedValue(Result.err(new Error("Permission denied")));

//       const files = await (analyzer as any).findSourceFiles("/path/to/dir");

//       expect(files).toHaveLength(0);
//       expectWarnLog("Error checking directory status: /path/to/dir - Error: Permission denied");
//     });

//     it("should skip non-directory paths", async (): Promise<void> => {
//       mockFileOps.exists.mockResolvedValue(Result.ok(true));
//       mockFileOps.readFile.mockResolvedValue(Result.ok("file content"));

//       const files = await (analyzer as any).findSourceFiles("/path/to/file.txt");

//       expect(files).toHaveLength(0);
//       expectDebugLog("Skipping source file search in non-directory: /path/to/file.txt");
//     });
//   });
// });
