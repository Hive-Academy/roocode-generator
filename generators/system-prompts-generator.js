const fs = require("fs");
const path = require("path");

// Helper to fill template with projectConfig values
function fillTemplate(template, projectConfig) {
  return template
    .replace(/{{mcpServers}}/g, projectConfig.mcpServers || "")
    .replace(/{{modes}}/g, projectConfig.modes || "")
    .replace(/{{workspaceDir}}/g, projectConfig.workspaceDir || "")
    .replace(/{{os}}/g, projectConfig.os || "")
    .replace(/{{shell}}/g, projectConfig.shell || "")
    .replace(/{{allowedDirs}}/g, projectConfig.allowedDirs || "")
    .replace(/{{searchPatternExample}}/g, projectConfig.searchPatternExample || "")
    .replace(/{{readPatternExample}}/g, projectConfig.readPatternExample || "")
    .replace(/{{domainStructureReference}}/g, projectConfig.domainStructureReference || "")
    .replace(/{{projectOverviewReference}}/g, projectConfig.projectOverviewReference || "")
    .replace(
      /{{taskDescriptionTemplateReference}}/g,
      projectConfig.taskDescriptionTemplateReference || ""
    )
    .replace(/{{reviewSearchPattern}}/g, projectConfig.reviewSearchPattern || "");
}

function generateSystemPrompts(projectConfig, writeFile) {
  const modes = [
    { slug: "boomerang", template: "system-prompt-boomerang.md" },
    { slug: "architect", template: "system-prompt-architect.md" },
    { slug: "code", template: "system-prompt-code.md" },
    { slug: "code-review", template: "system-prompt-code-review.md" },
  ];

  modes.forEach(({ slug, template }) => {
    const templatePath = path.join(__dirname, "..", "templates", "system-prompts", template);
    if (!fs.existsSync(templatePath)) {
      console.warn(`Template not found: ${templatePath}`);
      return;
    }
    const raw = fs.readFileSync(templatePath, "utf8");
    const filled = fillTemplate(raw, projectConfig);
    const outDir = path.join(projectConfig.baseDir, ".roo");
    const outPath = path.join(outDir, `system-prompt-${slug}`);
    writeFile(outPath, filled);
  });
}

module.exports = generateSystemPrompts;
