/**
 * Get the list of allowed config fields
 * @returns {string[]} Array of allowed config field names
 */
export function getAllowedConfigFields() {
  // Core required fields that every project needs
  const coreFields = ["name", "description", "workflow", "baseDir", "folderStructure"];

  // Optional fields that will be included only if relevant
  const optionalFields = ["architecture", "testing", "domains", "tiers", "libraries"];

  return [...coreFields, ...optionalFields];
}

/**
 * Post-process the config to remove irrelevant fields and sanitize values
 * @param {object} config
 * @param {string[]} allowedFields
 * @returns {object} Filtered config
 */
export function postProcessConfig(config: any, allowedFields: any) {
  const filtered: Record<string, string> = {};

  // Always include core fields
  for (const key of allowedFields) {
    // Only include non-empty values
    if (config[key] && config[key].toString().trim()) {
      filtered[key] = config[key];
    }
  }

  // Remove nx-specific fields if not an nx project
  if (!config.architecture?.toLowerCase().includes("nx")) {
    delete filtered.domains;
    delete filtered.tiers;
    delete filtered.libraries;
  }

  return filtered;
}
