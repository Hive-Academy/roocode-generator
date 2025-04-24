/**
 * @fileoverview Core type definitions and type guards for the framework
 * @module core/types
 */

/**
 * Type guard to check if a value is an Error instance
 *
 * @param value - The value to check
 * @returns True if the value is an Error instance
 *
 * @example
 * ```typescript
 * const error = new Error('Something went wrong');
 * if (isError(error)) {
 *   console.error(error.message);
 * }
 * ```
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Type guard to check if a value is a non-null object
 *
 * @param value - The value to check
 * @returns True if the value is a non-null object
 *
 * @example
 * ```typescript
 * const data = { key: 'value' };
 * if (isObject(data)) {
 *   // TypeScript knows data is Record<string, unknown>
 *   console.log(data.key);
 * }
 * ```
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Type guard to check if a value is a string
 *
 * @param value - The value to check
 * @returns True if the value is a string
 *
 * @example
 * ```typescript
 * const input = getUserInput();
 * if (isString(input)) {
 *   // TypeScript knows input is string
 *   return input.trim();
 * }
 * ```
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard to check if a value is a valid number
 *
 * @param value - The value to check
 * @returns True if the value is a number and not NaN
 *
 * @example
 * ```typescript
 * const amount = parseFloat(input);
 * if (isNumber(amount)) {
 *   // TypeScript knows amount is number
 *   return amount.toFixed(2);
 * }
 * ```
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard to check if a value is a boolean
 *
 * @param value - The value to check
 * @returns True if the value is a boolean
 *
 * @example
 * ```typescript
 * const flag = getFlag();
 * if (isBoolean(flag)) {
 *   // TypeScript knows flag is boolean
 *   return flag ? 'Yes' : 'No';
 * }
 * ```
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Type guard to check if a value is a function
 *
 * @template Args - The function parameter types
 * @template Return - The function return type
 * @param value - The value to check
 * @returns True if the value is a function with the specified signature
 *
 * @example
 * ```typescript
 * // Type guard for a specific function signature
 * const isHandler = isFunction<[event: Event], void>;
 *
 * const handler = getEventHandler();
 * if (isHandler(handler)) {
 *   // TypeScript knows handler is (event: Event) => void
 *   handler(new Event('click'));
 * }
 * ```
 */
export function isFunction<Args extends unknown[] = unknown[], Return = unknown>(
  value: unknown
): value is (...args: Args) => Return {
  return typeof value === 'function';
}

/**
 * Type guard to check if a value is an array
 *
 * @param value - The value to check
 * @returns True if the value is an array
 *
 * @example
 * ```typescript
 * const data = getData();
 * if (isArray(data)) {
 *   // TypeScript knows data is an array
 *   data.forEach(item => process(item));
 * }
 * ```
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Safely extracts an error message from an unknown error value
 *
 * @param error - The error value to extract message from
 * @returns A string message describing the error
 *
 * @example
 * ```typescript
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   console.error(getErrorMessage(error));
 * }
 * ```
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
 *
 * @template T - The type of the value
 * @param value - The value to check
 * @param message - Optional custom error message
 * @throws Error if value is undefined or null
 *
 * @example
 * ```typescript
 * function processUser(user: User | undefined) {
 *   assertDefined(user, 'User must be defined');
 *   // TypeScript knows user is defined here
 *   return user.id;
 * }
 * ```
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
 *
 * @template T - The expected item type
 * @param value - The array to check
 * @param guard - The type guard function for items
 * @returns True if value is an array and all items match the guard
 *
 * @example
 * ```typescript
 * const data = getItems();
 * if (isArrayOf(data, isString)) {
 *   // TypeScript knows data is string[]
 *   data.map(item => item.toUpperCase());
 * }
 * ```
 */
export function isArrayOf<T>(value: unknown, guard: (item: unknown) => item is T): value is T[] {
  return isArray(value) && value.every(guard);
}

/**
 * Type guard to check if a value matches a specific object shape
 *
 * @template T - The expected object type
 * @param value - The value to check
 * @param shape - Object with type guard functions for each property
 * @returns True if value matches the shape
 *
 * @example
 * ```typescript
 * interface User {
 *   id: number;
 *   name: string;
 * }
 *
 * const isUser = (value: unknown): value is User =>
 *   matchesShape(value, {
 *     id: isNumber,
 *     name: isString
 *   });
 * ```
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

/**
 * Utility type that removes null and undefined from a type
 *
 * @template T - The type to make non-nullable
 *
 * @example
 * ```typescript
 * type MaybeString = string | null | undefined;
 * type DefiniteString = NonNullable<MaybeString>; // string
 * ```
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * Utility type that extracts parameter types from a function type
 *
 * @template T - The function type
 *
 * @example
 * ```typescript
 * function greet(name: string, age: number): void {}
 * type GreetParams = Parameters<typeof greet>; // [string, number]
 * ```
 */
export type Parameters<T extends (...args: unknown[]) => unknown> = T extends (
  ...args: infer P
) => unknown
  ? P
  : never;

/**
 * Utility type that extracts the return type from a function type
 *
 * @template T - The function type
 *
 * @example
 * ```typescript
 * function getValue(): string { return 'value'; }
 * type ReturnValue = ReturnType<typeof getValue>; // string
 * ```
 */
export type ReturnType<T extends (...args: unknown[]) => unknown> = T extends (
  ...args: unknown[]
) => infer R
  ? R
  : unknown;

/**
 * Utility type that makes all properties of a type required
 *
 * @template T - The type to make required
 *
 * @example
 * ```typescript
 * interface Config {
 *   host?: string;
 *   port?: number;
 * }
 * type RequiredConfig = Required<Config>; // { host: string; port: number; }
 * ```
 */
export type Required<T> = {
  [P in keyof T]-?: T[P];
};

/**
 * Utility type that makes all properties of a type optional
 *
 * @template T - The type to make partial
 *
 * @example
 * ```typescript
 * interface User {
 *   id: number;
 *   name: string;
 * }
 * type PartialUser = Partial<User>; // { id?: number; name?: string; }
 * ```
 */
export type Partial<T> = {
  [P in keyof T]?: T[P];
};
