import * as fs from "fs";
import * as path from "path";

/**
 * Extract all placeholder bindings from a template string
 * @param {string} templateContent The template content to scan
 * @returns {Set<string>} Set of unique binding names found
 */
export function extractBindings(templateContent: string): Set<string> {
  const bindings = new Set<string>();

  // Match both [Placeholder] and {{placeholder}} syntax
  const patterns = [
    /\[(.+?)\]/g, // [Placeholder] syntax
    /{{(.+?)}}/g, // {{placeholder}} syntax
  ];

  patterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(templateContent)) !== null) {
      bindings.add(match[1].trim());
    }
  });

  return bindings;
}

/**
 * Scan all template files in a directory recursively
 * @param {string} dirPath Directory to scan
 * @param {string[]} extensions File extensions to include
 * @returns {Map<string, Set<string>>} Map of filepath to required bindings
 */
export function scanTemplateDirectory(dirPath: string, extensions = [".md"]) {
  const templateBindings = new Map();

  function scanDir(currentPath: string) {
    const files = fs.readdirSync(currentPath);

    files.forEach((file: string) => {
      const fullPath = path.join(currentPath, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDir(fullPath);
      } else if (extensions.some((ext) => file.endsWith(ext))) {
        const content = fs.readFileSync(fullPath, "utf8");
        const bindings = extractBindings(content);
        if (bindings.size > 0) {
          templateBindings.set(fullPath, bindings);
        }
      }
    });
  }

  scanDir(dirPath);
  return templateBindings;
}

/**
 * Get all required configuration fields from templates
 * @param {string} baseDir Base directory containing templates
 * @returns {Set<string>} Set of all required configuration fields
 */
export function getAllRequiredConfigFields(baseDir: string): Set<string> {
  const templateDirs = [
    path.join(baseDir, "templates", "memory-bank"),
    path.join(baseDir, "templates", "rules"),
    path.join(baseDir, "templates", "system-prompts"),
  ];

  const allBindings = new Set<string>();

  templateDirs.forEach((dir) => {
    if (fs.existsSync(dir)) {
      const bindings = scanTemplateDirectory(dir);
      bindings.forEach((templateBindings) => {
        templateBindings.forEach((binding: string) => allBindings.add(binding));
      });
    }
  });

  return allBindings;
}

/**
 * Validates that a config object has all required bindings
 * @param {object} config Configuration object to validate
 * @param {Set<string>} requiredFields Set of required field names
 * @returns {string[]} Array of missing field names
 */
export function validateConfigBindings(
  config: Record<any, any>,
  requiredFields: Set<string>
): string[] {
  const missingFields: string[] = [];
  requiredFields.forEach((field) => {
    if (!config[field] || config[field].toString().trim() === "") {
      missingFields.push(field);
    }
  });
  return missingFields;
}
