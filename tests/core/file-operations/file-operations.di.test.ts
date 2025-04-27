/*
import "reflect-metadata";
import { Container } from "../di/container";
import { FileOperations } from "./file-operations";
import { ILogger } from "./file-operations";

describe("FileOperations DI integration", () => {
  it("should instantiate FileOperations via DI container", () => {
    const container = Container.getInstance();

    // Register a mock ILogger for testing
    class MockLogger implements ILogger {
      error(message: string, error?: Error): void {}
    }
    container.register("ILogger", MockLogger);

    // Register FileOperations
    container.register("IFileOperations", FileOperations);

    container.initialize();

    const fileOps = container.resolve<FileOperations>("IFileOperations");
    expect(fileOps).toBeInstanceOf(FileOperations);
  });
});
*/
