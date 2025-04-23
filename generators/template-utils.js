const fs = require("fs");
const path = require("path");

/**
 * Extract all placeholder bindings from a template string
 * @param {string} templateContent The template content to scan
 * @returns {Set<string>} Set of unique binding names found
 */
function extractBindings(templateContent) {
  const bindings = new Set();

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
function scanTemplateDirectory(dirPath, extensions = [".md"]) {
  const templateBindings = new Map();

  function scanDir(currentPath) {
    const files = fs.readdirSync(currentPath);

    files.forEach((file) => {
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
function getAllRequiredConfigFields(baseDir) {
  const templateDirs = [
    path.join(baseDir, "templates", "memory-bank"),
    path.join(baseDir, "templates", "rules"),
    path.join(baseDir, "templates", "system-prompts"),
  ];

  const allBindings = new Set();

  templateDirs.forEach((dir) => {
    if (fs.existsSync(dir)) {
      const bindings = scanTemplateDirectory(dir);
      bindings.forEach((templateBindings) => {
        templateBindings.forEach((binding) => allBindings.add(binding));
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
function validateConfigBindings(config, requiredFields) {
  const missingFields = [];
  requiredFields.forEach((field) => {
    if (!config[field] || config[field].toString().trim() === "") {
      missingFields.push(field);
    }
  });
  return missingFields;
}

module.exports = {
  extractBindings,
  scanTemplateDirectory,
  getAllRequiredConfigFields,
  validateConfigBindings,
};
