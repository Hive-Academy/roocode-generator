import 'reflect-metadata';

import { Container } from './container';
import { Injectable, Inject } from './decorators';
import { ServiceLifetime, type Constructor, type Factory } from './types';
import type { ServiceDescriptor } from './types';
import {
  DIError,
  DependencyResolutionError,
  CircularDependencyError,
  ServiceRegistrationError,
  ContainerNotInitializedError,
} from './errors';
import { registerServices } from './registrations';

// Re-export all public types and functions
export {
  Container,
  Injectable,
  Inject,
  ServiceLifetime,
  DIError,
  DependencyResolutionError,
  CircularDependencyError,
  ServiceRegistrationError,
  ContainerNotInitializedError,
  registerServices,
};

export type { ServiceDescriptor, Constructor, Factory };

/**
 * Gets the global container instance
 */
export function getContainer(): Container {
  return Container.getInstance();
}

/**
 * Helper function to check for errors and throw them if present
 * @param result The result object to check for errors
 */
function checkAndThrowError(result: { isErr(): boolean; error?: Error }): void {
  if (result.isErr() && result.error !== undefined) {
    throw result.error;
  }
}

/**
 * Type-safe helper for registering a singleton service
 * @param token The unique string identifier for the service to register.
 *              This token is used to retrieve the service instance later.
 * @param implementation The constructor function or class implementing the service.
 *                      Must be a valid class or constructor function.
 */
export function registerSingleton<T>(token: string, implementation: Constructor<T>): void {
  const container = Container.getInstance();
  const result = container.registerSingleton<T>(token, implementation);
  checkAndThrowError(result);
}

/**
 * Type-safe helper for registering a transient service
 * @param token The unique string identifier for the service to register.
 *              This token is used to retrieve the service instance later.
 * @param implementation The constructor function or class implementing the service.
 *                      Must be a valid class or constructor function.
 */
export function registerTransient<T>(token: string, implementation: Constructor<T>): void {
  const container = Container.getInstance();
  const result = container.register<T>(token, implementation);
  checkAndThrowError(result);
}

/**
 * Type-safe helper for registering a factory function
 * @param token The unique string identifier for the service to register.
 *              This token is used to retrieve the service instance later.
 * @param factory A factory function that returns an instance of the service.
 *                This function is called each time the service is resolved.
 * @param lifetime Optional service lifetime, defaults to Transient.
 *                 Determines how long the service instance is retained.
 */
export function registerFactory<T>(
  token: string,
  factory: Factory<T>,
  lifetime: ServiceLifetime = ServiceLifetime.Transient
): void {
  const container = Container.getInstance();
  const result = container.registerFactory<T>(token, factory, lifetime);
  checkAndThrowError(result);
}

/**
 * Type-safe helper for resolving a service
 * @param token The unique string identifier for the service to resolve.
 *              Must correspond to a previously registered service token.
 */
export function resolve<T>(token: string): T {
  const container = Container.getInstance();
  const result = container.resolve<T>(token);
  checkAndThrowError(result);
  return result.value as T;
}
