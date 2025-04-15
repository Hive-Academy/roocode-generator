const fs = require("fs");
const path = require("path");
const { extractBindings, validateConfigBindings } = require("./template-utils");

// General-purpose template filler: replaces [Placeholder] or {{placeholder}} with values from data object
function renderTemplate(template, data = {}) {
  return template.replace(/\[(.+?)\]|{{(.+?)}}/g, (match, square, curly) => {
    const key = (square || curly || "").trim();
    return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : match;
  });
}

// Helper to fill template with projectConfig values and handle system prompt specifics
function fillTemplate(template, projectConfig) {
  // Extract required bindings from the template
  const requiredBindings = extractBindings(template);

  // Create a sanitized config with defaults for system prompts
  const sanitizedConfig = {
    // Core fields
    name: projectConfig.name || "",
    description: projectConfig.description || "",
    workflow: projectConfig.workflow || "standard",

    // System prompt specific fields with defaults
    os: process.platform,
    shell: process.platform === "win32" ? "PowerShell" : "bash",
    workspaceDir: projectConfig.baseDir || process.cwd(),
    allowedDirs: [projectConfig.baseDir || process.cwd()],

    // Search and read patterns with defaults
    searchPatternExample:
      "<search_files><path>docs</path><regex>Status.*Not Started</regex></search_files>",
    readPatternExample:
      "<read_file><path>file.md</path><start_line>10</start_line><end_line>20</end_line></read_file>",
    reviewSearchPattern:
      "<search_files><path>src</path><regex>function\\s+\\w+</regex></search_files>",
    domainStructureReference: "memory-bank/ProjectOverview.md:25-29",

    // MCP servers (empty by default)
    mcpServers: projectConfig.mcpServers || "- No MCP servers configured",

    // Modes configuration
    modes: projectConfig.workflow
      ? projectConfig.workflow.split(",").join("\n- ")
      : "- Default workflow",

    // Optional fields from project config
    ...(projectConfig.domains ? { domains: projectConfig.domains } : {}),
    ...(projectConfig.tiers ? { tiers: projectConfig.tiers } : {}),
    ...(projectConfig.libraries ? { libraries: projectConfig.libraries } : {}),
  };

  // Log any missing required bindings as warnings
  const missingFields = validateConfigBindings(sanitizedConfig, requiredBindings);
  if (missingFields.length > 0) {
    console.warn(
      `Warning: System prompt template has unfilled bindings: ${missingFields.join(", ")}`
    );
  }

  return renderTemplate(template, sanitizedConfig);
}

// Loads a system prompt template, injects values, and returns the rendered content
function loadSystemPromptTemplate(templateName, data = {}) {
  const templatePath = path.join(__dirname, "..", "templates", "system-prompts", templateName);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`System prompt template not found: ${templatePath}`);
  }
  const raw = fs.readFileSync(templatePath, "utf8");
  return renderTemplate(raw, data);
}

function generateSystemPrompts(projectConfig, writeFile) {
  const modes = [
    { slug: "boomerang", template: "system-prompt-boomerang.md" },
    { slug: "architect", template: "system-prompt-architect.md" },
    { slug: "code", template: "system-prompt-code.md" },
    { slug: "code-review", template: "system-prompt-code-review.md" },
  ];

  modes.forEach(({ slug, template }) => {
    let filled;
    try {
      const templatePath = path.join(__dirname, "..", "templates", "system-prompts", template);
      const raw = fs.readFileSync(templatePath, "utf8");
      filled = fillTemplate(raw, projectConfig);
    } catch (e) {
      console.warn(e.message);
      return;
    }
    const outDir = path.join(projectConfig.baseDir, ".roo");
    const outPath = path.join(outDir, `system-prompt-${slug}`);
    writeFile(outPath, filled);
  });
}

module.exports = {
  generateSystemPrompts,
  renderTemplate,
  loadSystemPromptTemplate,
};
