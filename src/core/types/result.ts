/**
 * Interface representing a result with success/failure status and optional data/error
 */
export interface IResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

/**
 * Implementation of Result pattern for handling operation outcomes
 * Provides type-safe success and failure states with optional data/error information
 */
export class Result<T> implements IResult<T> {
  private constructor(
    public readonly success: boolean,
    public readonly data?: T,
    public readonly error?: string,
    public readonly details?: unknown
  ) {}

  /**
   * Create a success result with data
   * @param data The success data
   */
  static success<T>(data: T): Result<T> {
    return new Result<T>(true, data);
  }

  /**
   * Create a failure result with error message and optional details
   * @param error Error message
   * @param details Optional error details
   */
  static failure<T>(error: string, details?: unknown): Result<T> {
    return new Result<T>(false, undefined as unknown as T, error, details);
  }

  /**
   * Check if result is success
   */
  isSuccess(): this is Result<T> & { data: T } {
    return this.success;
  }

  /**
   * Check if result is failure
   */
  isFailure(): this is Result<T> & { error: string } {
    return !this.success;
  }
}
