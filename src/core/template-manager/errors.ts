/**
 * Unified TemplateError type for the template module.
 * This refactors the previous template-specific errors to align with core/errors/index.
 */

import { TemplateError as CoreTemplateError } from '../errors/index';

export class TemplateError extends CoreTemplateError {
  constructor(message: string, context?: unknown) {
    // Standardize context serialization: if object, stringify; if string, use as is; else undefined
    let serializedContext: string;
    if (typeof context === 'string') {
      serializedContext = context;
    } else if (context !== undefined) {
      try {
        serializedContext = JSON.stringify(context);
      } catch {
        serializedContext = '';
      }
    } else {
      serializedContext = '';
    }
    super(message, serializedContext);
    this.name = 'TemplateError';
  }
}

export class TemplateNotFoundError extends TemplateError {
  constructor(templateName: string) {
    super(`Template not found: ${templateName}`, JSON.stringify({ templateName }));
    this.name = 'TemplateNotFoundError';
  }
}

export class TemplateValidationError extends TemplateError {
  constructor(message: string, context?: unknown) {
    super(message, typeof context === 'string' ? context : JSON.stringify(context));
    this.name = 'TemplateValidationError';
  }
}

export class TemplateProcessingError extends TemplateError {
  constructor(message: string, context?: unknown) {
    super(message, typeof context === 'string' ? context : JSON.stringify(context));
    this.name = 'TemplateProcessingError';
  }
}
