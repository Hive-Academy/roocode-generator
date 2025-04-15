const fs = require("fs");
const path = require("path");

// Helper to fill template with projectConfig values
function fillTemplate(template, projectConfig) {
  return template
    .replace(/{{domains}}/g, projectConfig.domains || "")
    .replace(/{{tiers}}/g, projectConfig.tiers || "")
    .replace(/{{libraries}}/g, projectConfig.libraries || "")
    .replace(/{{backendStack}}/g, projectConfig.backend || "")
    .replace(/{{frontendStack}}/g, projectConfig.frontend || "")
    .replace(/{{infrastructure}}/g, projectConfig.infrastructure || "")
    .replace(/{{currentFocus}}/g, projectConfig.currentFocus || "")
    .replace(/{{fileReferences}}/g, projectConfig.fileReferences || "")
    .replace(
      /{{domainStructureLineRange}}/g,
      projectConfig.domainStructureLineRange || ""
    )
    .replace(/{{domainStructure}}/g, projectConfig.domainStructure || "")
    .replace(
      /{{architecturePatterns}}/g,
      projectConfig.architecturePatterns || ""
    )
    .replace(/{{libraryStructure}}/g, projectConfig.libraryStructure || "")
    .replace(/{{componentStructure}}/g, projectConfig.componentStructure || "")
    .replace(/{{commandsReference}}/g, projectConfig.commandsReference || "")
    .replace(/{{technicalStandards}}/g, projectConfig.technicalStandards || "")
    .replace(/{{reviewChecklist}}/g, projectConfig.reviewChecklist || "")
    .replace(/{{feedbackGuidelines}}/g, projectConfig.feedbackGuidelines || "")
    .replace(/{{commitProcess}}/g, projectConfig.commitProcess || "");
}

function generateMemoryBank(projectConfig, writeFile) {
  const files = [
    { name: "core-reference.md" },
    { name: "boomerang-mode-quickref.md" },
    { name: "architect-mode-quickref.md" },
    { name: "code-mode-quickref.md" },
    { name: "code-review-mode-quickref.md" },
    { name: "token-optimization-guide.md" },
  ];

  files.forEach(({ name }) => {
    const templatePath = path.join(
      __dirname,
      "..",
      "templates",
      "memory-bank",
      name
    );
    if (!fs.existsSync(templatePath)) {
      console.warn(`Template not found: ${templatePath}`);
      return;
    }
    const raw = fs.readFileSync(templatePath, "utf8");
    const filled = fillTemplate(raw, projectConfig);
    const outDir = path.join(projectConfig.baseDir, "memory-bank");
    const outPath = path.join(outDir, name);
    writeFile(outPath, filled);
  });

  // Copy templates in memory-bank/templates/
  const templatesDir = path.join(
    __dirname,
    "..",
    "templates",
    "memory-bank",
    "templates"
  );
  const outTemplatesDir = path.join(
    projectConfig.baseDir,
    "memory-bank",
    "templates"
  );
  if (fs.existsSync(templatesDir)) {
    fs.readdirSync(templatesDir).forEach((file) => {
      const src = path.join(templatesDir, file);
      const dest = path.join(outTemplatesDir, file);
      fs.copyFileSync(src, dest);
      console.log(`Copied template: ${dest}`);
    });
  }
}

module.exports = generateMemoryBank;
