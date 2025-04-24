/**
 * @fileoverview Core error classes for the RooCode framework
 * @module core/errors
 */

/**
 * Base error class for all RooCode errors
 *
 * @class RooCodeError
 * @extends {Error}
 *
 * @example
 * ```typescript
 * throw new RooCodeError(
 *   'Failed to process request',
 *   'REQUEST_ERROR',
 *   { requestId: '123' },
 *   originalError
 * );
 * ```
 */
export class RooCodeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Creates a new error instance with additional context
   *
   * @param additionalContext - Additional context to merge with existing context
   * @returns A new RooCodeError instance with combined context
   *
   * @example
   * ```typescript
   * const error = new RooCodeError('Failed', 'ERROR_CODE', { id: 1 });
   * const withContext = error.withContext({ timestamp: Date.now() });
   * ```
   */
  public withContext(additionalContext: Record<string, unknown>): RooCodeError {
    return new RooCodeError(
      this.message,
      this.code,
      { ...this.context, ...additionalContext },
      this.cause
    );
  }
}

/**
 * Error thrown when validation fails
 *
 * @class ValidationError
 * @extends {RooCodeError}
 *
 * @example
 * ```typescript
 * throw new ValidationError(
 *   'Invalid user data',
 *   { userId: '123', fields: ['email', 'password'] }
 * );
 * ```
 */
export class ValidationError extends RooCodeError {
  constructor(message: string, context?: Record<string, unknown>, cause?: Error) {
    super(message, 'VALIDATION_ERROR', context, cause);
  }
}

/**
 * Error thrown when configuration is invalid
 *
 * @class ConfigurationError
 * @extends {RooCodeError}
 *
 * @example
 * ```typescript
 * throw new ConfigurationError(
 *   'Missing required configuration',
 *   { missingKeys: ['apiKey', 'endpoint'] }
 * );
 * ```
 */
export class ConfigurationError extends RooCodeError {
  constructor(message: string, context?: Record<string, unknown>, cause?: Error) {
    super(message, 'CONFIGURATION_ERROR', context, cause);
  }
}

/**
 * Error thrown when a file operation fails
 *
 * @class FileSystemError
 * @extends {RooCodeError}
 *
 * @example
 * ```typescript
 * throw new FileSystemError(
 *   'Failed to read configuration file',
 *   '/path/to/config.json',
 *   { operation: 'read' }
 * );
 * ```
 */
export class FileSystemError extends RooCodeError {
  constructor(
    message: string,
    public readonly path: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, 'FILESYSTEM_ERROR', { ...context, path }, cause);
  }
}

/**
 * Error thrown when a generator operation fails
 *
 * @class GeneratorError
 * @extends {RooCodeError}
 *
 * @example
 * ```typescript
 * throw new GeneratorError(
 *   'Failed to generate component',
 *   'react-component',
 *   { componentName: 'UserProfile' }
 * );
 * ```
 */
export class GeneratorError extends RooCodeError {
  constructor(
    message: string,
    public readonly generatorName: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, 'GENERATOR_ERROR', { ...context, generatorName }, cause);
  }
}

/**
 * Error thrown when template processing fails
 *
 * @class TemplateError
 * @extends {RooCodeError}
 *
 * @example
 * ```typescript
 * throw new TemplateError(
 *   'Invalid template syntax',
 *   'component.template.ts',
 *   { line: 42, error: 'Unexpected token' }
 * );
 * ```
 */
export class TemplateError extends RooCodeError {
  constructor(
    message: string,
    public readonly templateName: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, 'TEMPLATE_ERROR', { ...context, templateName }, cause);
  }
}

/**
 * Error thrown when a plugin operation fails
 *
 * @class PluginError
 * @extends {RooCodeError}
 *
 * @example
 * ```typescript
 * throw new PluginError(
 *   'Plugin initialization failed',
 *   'typescript-transformer',
 *   { config: pluginConfig }
 * );
 * ```
 */
export class PluginError extends RooCodeError {
  constructor(
    message: string,
    public readonly pluginName: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, 'PLUGIN_ERROR', { ...context, pluginName }, cause);
  }
}

/**
 * Error thrown when an operation times out
 *
 * @class TimeoutError
 * @extends {RooCodeError}
 *
 * @example
 * ```typescript
 * throw new TimeoutError(
 *   'API request timed out',
 *   'fetchUserData',
 *   5000,
 *   { userId: '123' }
 * );
 * ```
 */
export class TimeoutError extends RooCodeError {
  constructor(
    message: string,
    public readonly operationName: string,
    public readonly timeoutMs: number,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, 'TIMEOUT_ERROR', { ...context, operationName, timeoutMs }, cause);
  }
}

/**
 * Error thrown when an operation is cancelled
 *
 * @class CancellationError
 * @extends {RooCodeError}
 *
 * @example
 * ```typescript
 * throw new CancellationError(
 *   'Operation cancelled by user',
 *   'fileUpload',
 *   { fileId: '123', progress: '45%' }
 * );
 * ```
 */
export class CancellationError extends RooCodeError {
  constructor(
    message: string,
    public readonly operationName: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, 'CANCELLATION_ERROR', { ...context, operationName }, cause);
  }
}

/**
 * Error thrown when an unsupported operation is attempted
 *
 * @class UnsupportedOperationError
 * @extends {RooCodeError}
 *
 * @example
 * ```typescript
 * throw new UnsupportedOperationError(
 *   'Batch updates not supported in free tier',
 *   'batchUpdate',
 *   { tier: 'free', requestedBatchSize: 100 }
 * );
 * ```
 */
export class UnsupportedOperationError extends RooCodeError {
  constructor(
    message: string,
    public readonly operationName: string,
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    super(message, 'UNSUPPORTED_OPERATION_ERROR', { ...context, operationName }, cause);
  }
}
