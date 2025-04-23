// Utility functions for memory bank template rendering and filling
const { extractBindings, validateConfigBindings } = require("./template-utils");

function renderTemplate(template, data = {}) {
  return template.replace(/\[(.+?)\]|{{(.+?)}}/g, (match, square, curly) => {
    const key = (square || curly || "").trim();
    return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : match;
  });
}

function fillTemplate(template, projectConfig) {
  const requiredBindings = extractBindings(template);
  const now = new Date();
  const mapping = {
    projectName: projectConfig.name || "",
    projectDescription: projectConfig.description || "",
    purpose: projectConfig.purpose || projectConfig.description || "",
    keyFeatures: projectConfig.keyFeatures || "",
    stakeholders: projectConfig.stakeholders || "",
    startDate: projectConfig.startDate || "",
    projectStatus: projectConfig.status || "Active",
    status: projectConfig.status || "Active",
    lastUpdated: projectConfig.lastUpdated || now.toISOString().split("T")[0],
    version: projectConfig.version || "1.0.0",
    techStack:
      projectConfig.techStack ||
      [
        projectConfig.frontend,
        projectConfig.backend,
        projectConfig.database,
        projectConfig.architecture,
      ]
        .filter(Boolean)
        .join(", ") ||
      "Node.js, CLI, LangChain",
    additionalNotes: projectConfig.additionalNotes || "",
    prerequisites: projectConfig.prerequisites || "",
    setupInstructions: projectConfig.setupInstructions || "",
    requiredTools: projectConfig.requiredTools || "",
    projectStructure: projectConfig.folderStructure || projectConfig.projectStructure || "",
    workflow: projectConfig.workflow || "trunk-based",
    codingStandards: projectConfig.codingStandards || "",
    testing: projectConfig.testing || "",
    testTypes: projectConfig.testTypes || "",
    testCoverage: projectConfig.testCoverage || "",
    commonTasks: projectConfig.commonTasks || "",
    ciPipeline: projectConfig.ciPipeline || "GitHub Actions",
    environments: projectConfig.environments || "",
    deploymentSteps: projectConfig.deploymentSteps || "",
    troubleshootingGuide: projectConfig.troubleshootingGuide || "",
    developmentPractices: projectConfig.developmentPractices || "",
    documentationLinks: projectConfig.documentationLinks || "",
    implementationPlanTemplateReference: "memory-bank/templates/implementation-plan-template.md",
    completionReportTemplateReference: "memory-bank/templates/completion-report-template.md",
    modeAcknowledgmentTemplateReference: "memory-bank/templates/mode-acknowledgment-templates.md",
    currentPhase: projectConfig.currentPhase || "",
    activeAreas: projectConfig.activeAreas || "",
    recentChanges: projectConfig.recentChanges || "",
    plannedUpdates: projectConfig.plannedUpdates || "",
    knownIssues: projectConfig.knownIssues || "",
    upcomingMilestones: projectConfig.upcomingMilestones || "",
    architecture: projectConfig.architecture || "",
    systemDiagram: projectConfig.systemDiagram || "",
    mainComponents: projectConfig.mainComponents || "",
    frontend: projectConfig.frontend || "",
    backend: projectConfig.backend || "",
    database: projectConfig.database || "",
    integrationPoints: projectConfig.integrationPoints || "",
    architecturalDecisions: projectConfig.architecturalDecisions || "",
    specialConsiderations: projectConfig.specialConsiderations || "",
    commonPatterns: projectConfig.commonPatterns || "",
    ...(projectConfig.memoryBankEntries && Array.isArray(projectConfig.memoryBankEntries)
      ? {
          architecturalDecisions:
            projectConfig.memoryBankEntries
              .filter((e) => e.type === "architectural" || e.category === "architecture")
              .map((e) => `- ${e.content}`)
              .join("\n") || "",
          developmentPractices:
            projectConfig.memoryBankEntries
              .filter((e) => e.type === "practice" || e.category === "development")
              .map((e) => `- ${e.content}`)
              .join("\n") || "",
          commonPatterns:
            projectConfig.memoryBankEntries
              .filter((e) => e.type === "pattern" || e.category === "patterns")
              .map((e) => `- ${e.content}`)
              .join("\n") || "",
          specialConsiderations:
            projectConfig.memoryBankEntries
              .filter((e) => e.type === "consideration" || e.category === "special")
              .map((e) => `- ${e.content}`)
              .join("\n") || "",
        }
      : {}),
  };
  const missingFields = validateConfigBindings(mapping, requiredBindings);
  if (missingFields.length > 0) {
    console.warn(
      `Warning: Memory bank template has unfilled bindings: ${missingFields.join(", ")}`
    );
  }
  return renderTemplate(template, mapping);
}

module.exports = {
  renderTemplate,
  fillTemplate,
};
