/**
 * @fileoverview Core type definitions and type guards for the framework
 * @module types/common
 */

/**
 * Type guard to check if a value is an Error instance
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Type guard to check if a value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Type guard to check if a value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard to check if a value is a valid number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard to check if a value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Type guard to check if a value is a function
 */
export function isFunction<Args extends unknown[] = unknown[], Return = unknown>(
  value: unknown
): value is (...args: Args) => Return {
  return typeof value === 'function';
}

/**
 * Type guard to check if a value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Safely extracts an error message from an unknown error value
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (isObject(error) && isString(error.message)) {
    return error.message;
  }
  if (isString(error)) {
    return error;
  }
  return 'Unknown error';
}

/**
 * Runtime assertion that a value is defined and non-null
 */
export function assertDefined<T>(
  value: T | undefined | null,
  message = 'Value is undefined or null'
): asserts value is T {
  if (value === undefined || value === null) {
    throw new Error(message);
  }
}

/**
 * Type guard to check if all items in an array match a type guard
 */
export function isArrayOf<T>(value: unknown, guard: (item: unknown) => item is T): value is T[] {
  return isArray(value) && value.every(guard);
}

/**
 * Type guard to check if a value matches a specific object shape
 */
export function matchesShape<T extends Record<string, unknown>>(
  value: unknown,
  shape: { [K in keyof T]: (v: unknown) => v is T[K] }
): value is T {
  if (!isObject(value)) {
    return false;
  }

  return Object.entries(shape).every(([key, guard]) => {
    return key in value && guard(value[key]);
  });
}
