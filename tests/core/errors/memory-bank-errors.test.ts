import {
  MemoryBankError,
  MemoryBankGenerationError,
  MemoryBankTemplateError,
  MemoryBankFileError,
  MemoryBankValidationError,
} from '../../../src/core/errors/memory-bank-errors';
import { RooCodeError } from '../../../src/core/errors';

describe('Memory Bank Errors', () => {
  const baseMessage = 'Base error message';
  const baseContext = { key: 'value' };
  const causeError = new Error('Original cause');

  describe('MemoryBankError', () => {
    it('should extend RooCodeError', () => {
      const error = new MemoryBankError(baseMessage);
      expect(error).toBeInstanceOf(MemoryBankError);
      expect(error).toBeInstanceOf(RooCodeError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should have the correct code', () => {
      const error = new MemoryBankError(baseMessage);
      expect(error.code).toBe('MEMORY_BANK_ERROR');
    });

    it('should store message, context, and cause', () => {
      const error = new MemoryBankError(baseMessage, baseContext, causeError);
      expect(error.message).toBe(baseMessage);
      expect(error.context).toEqual(baseContext);
      expect(error.cause).toBe(causeError);
      expect(error.name).toBe('MemoryBankError');
    });
  });

  describe('MemoryBankGenerationError', () => {
    it('should extend MemoryBankError', () => {
      const error = new MemoryBankGenerationError(baseMessage);
      expect(error).toBeInstanceOf(MemoryBankGenerationError);
      expect(error).toBeInstanceOf(MemoryBankError);
      expect(error).toBeInstanceOf(RooCodeError);
    });

    it('should have the correct base code (MEMORY_BANK_ERROR)', () => {
      // The base code is set by MemoryBankError constructor
      const error = new MemoryBankGenerationError(baseMessage);
      expect(error.code).toBe('MEMORY_BANK_ERROR');
    });

    it('should add errorType="generation" to context', () => {
      const error = new MemoryBankGenerationError(baseMessage, baseContext, causeError);
      expect(error.message).toBe(baseMessage);
      expect(error.context).toEqual({ ...baseContext, errorType: 'generation' });
      expect(error.cause).toBe(causeError);
      expect(error.name).toBe('MemoryBankGenerationError');
    });
  });

  describe('MemoryBankTemplateError', () => {
    const templateName = 'test-template.md';

    it('should extend MemoryBankError', () => {
      const error = new MemoryBankTemplateError(baseMessage, templateName);
      expect(error).toBeInstanceOf(MemoryBankTemplateError);
      expect(error).toBeInstanceOf(MemoryBankError);
    });

    it('should have the correct base code (MEMORY_BANK_ERROR)', () => {
      const error = new MemoryBankTemplateError(baseMessage, templateName);
      expect(error.code).toBe('MEMORY_BANK_ERROR');
    });

    it('should store templateName and add errorType="template" to context', () => {
      const error = new MemoryBankTemplateError(baseMessage, templateName, baseContext, causeError);
      expect(error.message).toBe(baseMessage);
      expect(error.templateName).toBe(templateName);
      expect(error.context).toEqual({ ...baseContext, templateName, errorType: 'template' });
      expect(error.cause).toBe(causeError);
      expect(error.name).toBe('MemoryBankTemplateError');
    });
  });

  describe('MemoryBankFileError', () => {
    const filePath = '/path/to/file.md';

    it('should extend MemoryBankError', () => {
      const error = new MemoryBankFileError(baseMessage, filePath);
      expect(error).toBeInstanceOf(MemoryBankFileError);
      expect(error).toBeInstanceOf(MemoryBankError);
    });

    it('should have the correct base code (MEMORY_BANK_ERROR)', () => {
      const error = new MemoryBankFileError(baseMessage, filePath);
      expect(error.code).toBe('MEMORY_BANK_ERROR');
    });

    it('should store filePath and add errorType="file" to context', () => {
      const error = new MemoryBankFileError(baseMessage, filePath, baseContext, causeError);
      expect(error.message).toBe(baseMessage);
      expect(error.filePath).toBe(filePath);
      expect(error.context).toEqual({ ...baseContext, filePath, errorType: 'file' });
      expect(error.cause).toBe(causeError);
      expect(error.name).toBe('MemoryBankFileError');
    });
  });

  describe('MemoryBankValidationError', () => {
    it('should extend MemoryBankError', () => {
      const error = new MemoryBankValidationError(baseMessage);
      expect(error).toBeInstanceOf(MemoryBankValidationError);
      expect(error).toBeInstanceOf(MemoryBankError);
    });

    it('should have the correct base code (MEMORY_BANK_ERROR)', () => {
      const error = new MemoryBankValidationError(baseMessage);
      expect(error.code).toBe('MEMORY_BANK_ERROR');
    });

    it('should add errorType="validation" to context', () => {
      const error = new MemoryBankValidationError(baseMessage, baseContext, causeError);
      expect(error.message).toBe(baseMessage);
      expect(error.context).toEqual({ ...baseContext, errorType: 'validation' });
      expect(error.cause).toBe(causeError);
      expect(error.name).toBe('MemoryBankValidationError');
    });
  });
});
