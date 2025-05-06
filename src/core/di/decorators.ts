import 'reflect-metadata';
import { ServiceToken } from './types';

/**
 * Interface for injection metadata
 */
interface InjectionMetadata {
  token: ServiceToken;
  index: number;
}

/**
 * Marks a class as injectable, allowing it to be managed by the DI container
 */
export function Injectable(): ClassDecorator {
  return function (target: object): void {
    Reflect.defineMetadata('injectable', true, target);
  };
}

/**
 * Marks a constructor parameter as an injection point
 * @param token The token to inject
 */
export function Inject(token: ServiceToken): ParameterDecorator {
  return function (target: object, _: string | symbol | undefined, parameterIndex: number): void {
    const existingInjections: InjectionMetadata[] = Reflect.getMetadata('injections', target) || [];

    existingInjections.push({
      token,
      index: parameterIndex,
    });

    // Sort by parameter index to ensure correct order
    existingInjections.sort((a, b) => a.index - b.index);

    Reflect.defineMetadata('injections', existingInjections, target);
  };
}

/**
 * Type guard to check if a class is injectable
 * @param target The class to check
 */
export function isInjectable(target: object): boolean {
  return Reflect.getMetadata('injectable', target) === true;
}

/**
 * Gets the injection tokens for a class in parameter order
 * @param target The class to get injections for
 */
export function getInjectionTokens(target: object): ServiceToken[] {
  const injections: InjectionMetadata[] = Reflect.getMetadata('injections', target) || [];
  return injections.map((injection) => injection.token);
}
