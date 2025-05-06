/**
 * Interfaces for Template Management System
 */

import { TemplateError } from '../errors';
import { Result } from '../result/result';

/**
 * Interface for Template metadata
 */
export interface ITemplateMetadata {
  name: string;
  version: string;
  description?: string;
  author?: string;
  [key: string]: unknown;
}

/**
 * Interface for Template
 */
export interface ITemplate {
  metadata: ITemplateMetadata;

  /**
   * Validate the template content and metadata
   * @returns Result<void, TemplateError>
   */
  validate(): Result<void, TemplateError>;

  /**
   * Process the template with given context data
   * @param context - data to process the template
   * @returns Result<string, TemplateError> processed output or error
   */
  process(context: Record<string, unknown>): Result<string, TemplateError>;
}

/**
 * Interface for TemplateManager
 */
export interface ITemplateManager {
  /**
   * Load a template by name
   * @param name - template name
   * @returns Result<ITemplate, TemplateError>
   */
  loadTemplate(name: string): Promise<Result<ITemplate, TemplateError>>;

  /**
   * Validate a template by name
   * @param name - template name
   * @returns Result<void, TemplateError>
   */
  validateTemplate(name: string): Promise<Result<void, TemplateError>>;

  /**
   * Process a template by name with context data
   * @param name - template name
   * @param context - data for processing
   * @returns Result<string, TemplateError>
   */
  processTemplate(
    name: string,
    context: Record<string, unknown>
  ): Promise<Result<string, TemplateError>>;
}
