import { describe, expect, it, beforeEach } from "@jest/globals";
import { ServiceContainer } from "../container";

describe("ServiceContainer", () => {
  let container: ServiceContainer;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  class TestService {
    public value = "test";
  }

  const TEST_TOKEN = Symbol("TEST_SERVICE");

  describe("register", () => {
    it("should register a service implementation", () => {
      container.register(TEST_TOKEN, TestService);
      const service = container.resolve<TestService>(TEST_TOKEN);
      expect(service).toBeInstanceOf(TestService);
      expect(service.value).toBe("test");
    });

    it("should allow overriding a registered service", () => {
      class OriginalService {
        public value = "original";
      }
      class NewService {
        public value = "new";
      }

      container.register(TEST_TOKEN, OriginalService);
      container.register(TEST_TOKEN, NewService);

      const service = container.resolve<NewService>(TEST_TOKEN);
      expect(service.value).toBe("new");
    });
  });

  describe("resolve", () => {
    it("should throw error for unregistered service", () => {
      const UNREGISTERED_TOKEN = Symbol("UNREGISTERED");
      expect(() => {
        container.resolve(UNREGISTERED_TOKEN);
      }).toThrow("Service not registered for token: Symbol(UNREGISTERED)");
    });

    it("should create new instance for each resolve", () => {
      container.register(TEST_TOKEN, TestService);

      const service1 = container.resolve<TestService>(TEST_TOKEN);
      const service2 = container.resolve<TestService>(TEST_TOKEN);

      expect(service1).not.toBe(service2);
      expect(service1).toBeInstanceOf(TestService);
      expect(service2).toBeInstanceOf(TestService);
    });
  });
});
