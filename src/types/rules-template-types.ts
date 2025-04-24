import { Result } from '../core/result/result'; // Use existing Result type from core module

/**
 * Interface for managing rules templates.
 */
export interface IRulesTemplateManager {
  /**
   * Loads the base template content for a given mode.
   * @param mode The mode (e.g., 'javascript', 'typescript').
   * @returns A Result containing the base template string or an Error.
   */
  loadBaseTemplate(mode: string): Promise<Result<string, Error>>;

  /**
   * Loads template customizations for a given mode.
   * @param mode The mode.
   * @returns A Result containing the customization string or an Error. Returns empty string if no customizations found.
   */
  loadCustomizations(mode: string): Promise<Result<string, Error>>;

  /**
   * Merges a base template string with a customization string.
   * @param base The base template string.
   * @param custom The customization string.
   * @returns A Result containing the merged template string or an Error.
   */
  mergeTemplates(base: string, custom: string): Result<string, Error>;

  /**
   * Validates the structure and content of a template string.
   * @param template The template string to validate.
   * @returns A Result indicating success (void) or an Error if validation fails.
   */
  validateTemplate(template: string): Result<void, Error>;
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

// Assuming ProjectContext is defined elsewhere, e.g., in project-analyzer types
// export interface ProjectContext { ... }
