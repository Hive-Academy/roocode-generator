import { describe, expect, it, jest } from "@jest/globals";
 
import { BaseService } from "../base-service";
import { IServiceContainer } from "../../di/container";
import { Result } from "../../types/result";

// Mock implementation of BaseService for testing
class TestService extends BaseService {
  protected validateDependencies(): Result<void> {
    return Result.success(undefined);
  }

  // Expose protected methods for testing
  public testInitialize(): Result<void> {
    return this.initialize();
  }

  public testResolveDependency<T>(token: symbol): Result<T> {
    return this.resolveDependency<T>(token);
  }
}

describe("BaseService", () => {
  // Mock container with proper typing
  const mockContainer: jest.Mocked<IServiceContainer> = {
    register: jest.fn(),
    resolve: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("initialization", () => {
    it("should successfully initialize when validation passes", () => {
      const service = new TestService(mockContainer);
      const result = service.testInitialize();

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should fail initialization when validation fails", () => {
      class FailingService extends BaseService {
        protected validateDependencies(): Result<void> {
          return Result.failure("Validation failed");
        }

        public testInitialize(): Result<void> {
          return this.initialize();
        }
      }

      const service = new FailingService(mockContainer);
      const result = service.testInitialize();

      expect(result.success).toBe(false);
      expect(result.error).toContain("Service initialization failed");
      expect(result.error).toContain("Validation failed");
    });
  });

  describe("dependency resolution", () => {
    const TEST_TOKEN = Symbol("TEST_SERVICE");
    const mockService = { test: "service" };

    it("should successfully resolve existing dependency", () => {
      mockContainer.resolve.mockReturnValue(mockService);

      const service = new TestService(mockContainer);
      const result = service.testResolveDependency<typeof mockService>(TEST_TOKEN);

      expect(result.success).toBe(true);
      expect(result.data).toBe(mockService);
      expect(mockContainer.resolve).toHaveBeenCalledWith(TEST_TOKEN);
    });

    it("should handle dependency resolution failure", () => {
      const error = new Error("Service not found");
      mockContainer.resolve.mockImplementation(() => {
        throw error;
      });

      const service = new TestService(mockContainer);
      const result = service.testResolveDependency<typeof mockService>(TEST_TOKEN);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Failed to resolve dependency");
      expect(result.error).toContain(TEST_TOKEN.toString());
      expect(result.details).toBe(error);
    });
  });

  describe("container access", () => {
    it("should provide access to the container", () => {
      const service = new TestService(mockContainer);
      expect(service["container"]).toBe(mockContainer);
    });
  });
});
