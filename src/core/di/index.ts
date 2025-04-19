import "reflect-metadata";

import { Container } from "./container";
import { Injectable, Inject } from "./decorators";
import { ServiceLifetime, type Constructor, type Factory } from "./types";
import type { ServiceDescriptor } from "./types";
import {
  DIError,
  DependencyResolutionError,
  CircularDependencyError,
  ServiceRegistrationError,
  ContainerNotInitializedError,
} from "./errors";

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
};

export type { ServiceDescriptor, Constructor, Factory };

/**
 * Gets the global container instance
 */
export function getContainer(): Container {
  return Container.getInstance();
}

/**
 * Initializes the DI container
 */
export function initializeContainer(): void {
  const container = Container.getInstance();
  container.initialize();
}

/**
 * Type-safe helper for registering a singleton service
 * @param token The service token
 * @param implementation The service implementation
 */
export function registerSingleton<T>(token: string, implementation: Constructor<T>): void {
  const container = Container.getInstance();
  const result = container.registerSingleton<T>(token, implementation);
  if (result.isErr() && result.error !== undefined) {
    throw result.error;
  }
}

/**
 * Type-safe helper for registering a transient service
 * @param token The service token
 * @param implementation The service implementation
 */
export function registerTransient<T>(token: string, implementation: Constructor<T>): void {
  const container = Container.getInstance();
  const result = container.register<T>(token, implementation);
  if (result.isErr() && result.error !== undefined) {
    throw result.error;
  }
}

/**
 * Type-safe helper for registering a factory function
 * @param token The service token
 * @param factory The factory function
 * @param lifetime Optional service lifetime (defaults to Transient)
 */
export function registerFactory<T>(
  token: string,
  factory: Factory<T>,
  lifetime: ServiceLifetime = ServiceLifetime.Transient
): void {
  const container = Container.getInstance();
  const result = container.registerFactory<T>(token, factory, lifetime);
  if (result.isErr() && result.error !== undefined) {
    throw result.error;
  }
}

/**
 * Type-safe helper for resolving a service
 * @param token The service token
 */
export function resolve<T>(token: string): T {
  const container = Container.getInstance();
  const result = container.resolve<T>(token);
  if (result.isErr() && result.error !== undefined) {
    throw result.error;
  }
  return result.value as T;
}
