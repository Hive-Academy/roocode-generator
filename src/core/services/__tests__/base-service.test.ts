/*
// import { BaseService } from "../base-service";
// import { Result } from "../../types/result";
// import { IServiceContainer } from "../../di/interfaces";
// import { ServiceToken } from "../../di/types";

// class TestService extends BaseService {
//   protected validateDependencies(): Result<void> {
//     return Result.success(undefined);
//   }
// }

// class MockContainer implements IServiceContainer {
//   initialize(): void {}
  
//   register<T>(): Result<void, Error> {
//     return Result.success(undefined);
//   }
  
//   registerSingleton<T>(): Result<void, Error> {
//     return Result.success(undefined);
//   }
  
//   registerFactory<T>(): Result<void, Error> {
//     return Result.success(undefined);
//   }
  
//   resolve<T>(_token: ServiceToken): Result<T, Error> {
//     return Result.success({} as T);
//   }
  
//   clear(): void {}
// }

// describe("BaseService", () => {
//   let container: IServiceContainer;

//   beforeEach(() => {
//     container = new MockContainer();
//   });

//   describe("initialization", () => {
//     it("should initialize successfully when dependencies are valid", () => {
//       const service = new TestService(container);
//       const result = service["initialize"]();
//       expect(result.isSuccess()).toBe(true);
//     });

//     it("should fail initialization when dependencies are invalid", () => {
//       const invalidContainer = new MockContainer();
//       jest.spyOn(invalidContainer, "resolve").mockImplementation(() => {
//         return Result.failure("Missing dependency");
//       });

//       const service = new TestService(invalidContainer);
//       const result = service["initialize"]();
//       expect(result.isFailure()).toBe(true);
//       expect(result.error).toContain("Service initialization failed");
//     });
//   });

//   describe("dependency resolution", () => {
//     it("should resolve dependencies successfully", () => {
//       const mockDependency = { id: "test" };
//       const container = new MockContainer();
//       jest.spyOn(container, "resolve").mockImplementation(() => {
//         return Result.success(mockDependency);
//       });

//       const service = new TestService(container);
//       const result = service["resolveDependency"]<typeof mockDependency>(Symbol("test"));
//       expect(result.isSuccess()).toBe(true);
//       expect(result.value).toBe(mockDependency);
//     });

//     it("should handle dependency resolution failures", () => {
//       const container = new MockContainer();
//       jest.spyOn(container, "resolve").mockImplementation(() => {
//         return Result.failure("Resolution failed");
//       });

//       const service = new TestService(container);
//       const result = service["resolveDependency"]<object>(Symbol("test"));
//       expect(result.isFailure()).toBe(true);
//       expect(result.error).toContain("Failed to resolve dependency");
//     });

//     it("should validate resolved dependency type", () => {
//       const container = new MockContainer();
//       jest.spyOn(container, "resolve").mockImplementation(() => {
//         return Result.success(null);
//       });

//       const service = new TestService(container);
//       const result = service["resolveDependency"]<object>(Symbol("test"));
//       expect(result.isFailure()).toBe(true);
//       expect(result.error).toContain("Invalid dependency type");
//     });
//   });
// });
*/
