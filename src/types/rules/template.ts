import { Result } from '../result';

/**
 * Interface for managing rules templates.
 */
export interface IRulesTemplateManager {
  /**
   * Loads the base template content for a given mode.
   */
  loadBaseTemplate(mode: string): Promise<Result<string>>;

  /**
   * Loads template customizations for a given mode.
   */
  loadCustomizations(mode: string): Promise<Result<string>>;

  /**
   * Merges a base template string with a customization string.
   */
  mergeTemplates(base: string, custom: string): Result<string>;

  /**
   * Validates the structure and content of a template string.
   */
  validateTemplate(template: string): Result<void>;
}

/**
 * Metadata associated with a template.
 */
export interface TemplateMetadata {
  mode: string;
  version: string;
  lastUpdated: string;
  requiredSections: string[];
  optionalSections: string[];
}

/**
 * Structure for template customizations.
 */
export interface TemplateCustomization {
  mode: string;
  sections: {
    name: string;
    content: string;
    priority: number; // Higher priority sections might override lower priority ones
  }[];
  contextualRules: string[]; // Rules generated based on project context
}
