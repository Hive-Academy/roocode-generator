import { RooCodeError } from './index';

/**
 * Base error class for memory bank errors
 */
export class MemoryBankError extends RooCodeError {
  constructor(message: string, context?: Record<string, unknown>, cause?: Error) {
    // Calls RooCodeError constructor with the base code
    super(message, 'MEMORY_BANK_ERROR', context, cause);
  }
}

/**
 * Error thrown during memory bank generation process
 */
export class MemoryBankGenerationError extends MemoryBankError {
  constructor(message: string, context?: Record<string, unknown>, cause?: Error) {
    // Calls MemoryBankError constructor, adding errorType to context
    super(message, { ...context, errorType: 'generation' }, cause);
  }
}

/**
 * Error thrown during memory bank template operations
 */
export class MemoryBankTemplateError extends MemoryBankError {
  constructor(
    message: string,
    public readonly templateName: string, // Keep specific properties
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    // Calls MemoryBankError constructor, adding errorType and templateName to context
    super(message, { ...context, templateName, errorType: 'template' }, cause);
  }
}

/**
 * Error thrown during memory bank file operations
 */
export class MemoryBankFileError extends MemoryBankError {
  constructor(
    message: string,
    public readonly filePath: string, // Keep specific properties
    context?: Record<string, unknown>,
    cause?: Error
  ) {
    // Calls MemoryBankError constructor, adding errorType and filePath to context
    super(message, { ...context, filePath, errorType: 'file' }, cause);
  }
}

/**
 * Error thrown during memory bank validation operations
 */
export class MemoryBankValidationError extends MemoryBankError {
  constructor(message: string, context?: Record<string, unknown>, cause?: Error) {
    // Calls MemoryBankError constructor, adding errorType to context
    super(message, { ...context, errorType: 'validation' }, cause);
  }
}
