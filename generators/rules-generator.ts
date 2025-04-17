import { extractBindings, validateConfigBindings } from "./template-utils";
import * as fs from "fs";
import * as path from "path";

// General-purpose template filler: replaces [Placeholder] or {{placeholder}} with values from data object
export function renderTemplate(template: string, data: Record<string, string> = {}) {
  return template.replace(/\[(.+?)\]|{{(.+?)}}/g, (match, square, curly) => {
    const key: string = (square || curly || "").trim();
    return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : match;
  });
}

// Helper to fill template with projectConfig values with default fallbacks
function fillTemplate(template: string, projectConfig: Record<string, string>) {
  // Extract required bindings from the template
  const requiredBindings = extractBindings(template);

  // Create a sanitized config with defaults for common fields
  const sanitizedConfig = {
    // Core fields (always present)
    name: projectConfig.name || "",
    description: projectConfig.description || "",
    workflow: projectConfig.workflow || "standard",

    // Tech stack fields (with empty defaults)
    techStack:
      [projectConfig.frontend, projectConfig.backend, projectConfig.database]
        .filter(Boolean)
        .join(", ") || "standard",

    // Optional fields
    architecture: projectConfig.architecture || "",
    testing: projectConfig.testing || "",
    domains: projectConfig.domains || "",
    tiers: projectConfig.tiers || "",
    libraries: projectConfig.libraries || "",

    // Additional computed fields
    projectPatterns: projectConfig.projectPatterns || "standard coding patterns",
    commentStyle: projectConfig.commentStyle || "// for single-line, /* */ for multi-line",
    commitTool: projectConfig.commitTool || "git commit",
  };

  // Log any missing required bindings as warnings
  const missingFields = validateConfigBindings(sanitizedConfig, requiredBindings);
  if (missingFields.length > 0) {
    console.warn(`Warning: Template has unfilled bindings: ${missingFields.join(", ")}`);
  }

  return renderTemplate(template, sanitizedConfig);
}

// Loads a rule template, injects values, and returns the rendered content
export function loadRuleTemplate(templateName: string, data = {}) {
  const templatePath = path.join(__dirname, "..", "templates", "rules", templateName);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Rule template not found: ${templatePath}`);
  }
  const raw = fs.readFileSync(templatePath, "utf8");
  return renderTemplate(raw, data);
}

// Main generator function
export function generateRuleFiles(projectConfig: Record<string, string>, writeFile: Function) {
  const modes = [
    { slug: "boomerang", template: "boomerang-rules.md" },
    { slug: "architect", template: "architect-rules.md" },
    { slug: "code", template: "code-rules.md" },
    { slug: "code-review", template: "code-review-rules.md" },
  ];

  modes.forEach(({ slug, template }) => {
    // Use loadRuleTemplate for dynamic placeholder support
    let filled;
    try {
      const templatePath = path.join(__dirname, "..", "templates", "rules", template);
      const raw = fs.readFileSync(templatePath, "utf8");
      filled = fillTemplate(raw, projectConfig);
    } catch (e: any) {
      console.warn(e.message);
      return;
    }
    const outDir = path.join(projectConfig.baseDir, `.roo/rules-${slug}`);
    const outPath = path.join(outDir, "rules.md");
    writeFile(outPath, filled);
  });
}
