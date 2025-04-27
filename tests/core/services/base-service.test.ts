import { BaseService } from '../../../src/core/services/base-service';
import { Result } from '../../../src/core/result/result';
import { IServiceContainer } from '../../../src/core/di/interfaces';
import { ServiceToken, Constructor, Factory, ServiceLifetime } from '../../../src/core/di/types';
import { DIError, DependencyResolutionError } from '../../../src/core/di/errors';

class TestService extends BaseService {
  protected validateDependencies(): Result<void, Error> {
    return Result.ok(undefined);
  }
}

class MockContainer implements IServiceContainer {
  initialize(): void {}

  register<T>(
    _token: ServiceToken,
    _implementation: Constructor<T>,
    _lifetime?: ServiceLifetime
  ): Result<void, DIError> {
    return Result.ok(undefined);
  }

  registerSingleton<T>(
    _token: ServiceToken,
    _implementation: Constructor<T>
  ): Result<void, DIError> {
    return Result.ok(undefined);
  }

  registerFactory<T>(
    _token: ServiceToken,
    _factory: Factory<T>,
    _lifetime?: ServiceLifetime
  ): Result<void, DIError> {
    return Result.ok(undefined);
  }

  resolve<T>(_token: ServiceToken): Result<T, DIError> {
    return Result.ok({} as T);
  }

  clear(): void {}
}

describe('BaseService', () => {
  let container: IServiceContainer;

  beforeEach(() => {
    container = new MockContainer();
  });

  describe('initialization', () => {
    it('should initialize successfully when dependencies are valid', () => {
      const service = new TestService(container);
      const result = service['initialize']();
      expect(result.isOk()).toBe(true);
    });

    it('should fail initialization when dependencies are invalid', () => {
      const invalidContainer = new MockContainer();
      jest.spyOn(invalidContainer, 'resolve').mockImplementation(() => {
        return Result.err(new DependencyResolutionError('test', 'Missing dependency'));
      });

      const service = new TestService(invalidContainer);
      const result = service['initialize']();
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('Service initialization failed');
    });
  });

  describe('dependency resolution', () => {
    it('should resolve dependencies successfully', () => {
      const mockDependency = { id: 'test' };
      const container = new MockContainer();
      jest.spyOn(container, 'resolve').mockImplementation(() => {
        return Result.ok(mockDependency);
      });

      const service = new TestService(container);
      const result = service['resolveDependency']<typeof mockDependency>(Symbol('test'));
      expect(result.isOk()).toBe(true);
      expect(result.value).toBe(mockDependency);
    });

    it('should handle dependency resolution failures', () => {
      const container = new MockContainer();
      jest.spyOn(container, 'resolve').mockImplementation(() => {
        return Result.err(new DependencyResolutionError('test', 'Resolution failed'));
      });

      const service = new TestService(container);
      const result = service['resolveDependency']<object>(Symbol('test'));
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('Resolution failed');
    });

    it('should validate resolved dependency type', () => {
      const container = new MockContainer();
      jest.spyOn(container, 'resolve').mockImplementation(() => {
        return Result.ok(null as any);
      });

      const service = new TestService(container);
      const result = service['resolveDependency']<object>(Symbol('test'));
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toContain('Invalid dependency type');
    });
  });
});
