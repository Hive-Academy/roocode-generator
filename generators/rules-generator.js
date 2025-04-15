const fs = require("fs");
const path = require("path");

// Helper to fill template with projectConfig values
function fillTemplate(template, projectConfig) {
  let techStack = `${projectConfig.frontend}, ${projectConfig.backend}, ${projectConfig.database}`;
  return template
    .replace(/{{techStack}}/g, techStack)
    .replace(/{{projectName}}/g, projectConfig.name)
    .replace(/{{architecture}}/g, projectConfig.architecture)
    .replace(/{{workflow}}/g, projectConfig.workflow);
}

// Main generator function
function generateRuleFiles(projectConfig, writeFile) {
  const modes = [
    { slug: "boomerang", template: "boomerang-rules.md" },
    { slug: "architect", template: "architect-rules.md" },
    { slug: "code", template: "code-rules.md" },
    { slug: "code-review", template: "code-review-rules.md" },
  ];

  modes.forEach(({ slug, template }) => {
    const templatePath = path.join(
      __dirname,
      "..",
      "templates",
      "rules",
      template
    );
    if (!fs.existsSync(templatePath)) {
      console.warn(`Template not found: ${templatePath}`);
      return;
    }
    const raw = fs.readFileSync(templatePath, "utf8");
    const filled = fillTemplate(raw, projectConfig);
    const outDir = path.join(projectConfig.baseDir, `.roo/rules-${slug}`);
    const outPath = path.join(outDir, "rules.md");
    writeFile(outPath, filled);
  });
}

module.exports = generateRuleFiles;
