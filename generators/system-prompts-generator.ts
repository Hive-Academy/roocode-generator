import { extractBindings, validateConfigBindings } from "./template-utils";
import { LLMProvider } from "./llm-provider";
import * as fs from "fs";
import * as path from "path";

// Define interfaces for type safety
interface TemplateBindings {
  name?: string;
  description?: string;
  workflow?: string;
  documentReferences?: {
    overview: string;
    architecture: string;
    development: string;
    status: string;
  };
  templateReferences?: {
    taskDescription: string;
    statusReport: string;
    progress: string;
    acknowledgment: string;
    implementation: string;
    completion: string;
  };
  projectInfo?: string;
  taskManagement?: string;
  projectFeatures?: string[];
  projectStakeholders?: string[];
  projectTimeline?: string;
  technicalStack?: string[];
  mcpServers?: string;
  modes?: string;
  domains?: string;
  tiers?: string;
  libraries?: string;
  [key: string]: any; // Allow for additional dynamic bindings
}

export function renderTemplate(template: string, data: any = {}) {
  return template.replace(/\[(.+?)\]|{{(.+?)}}/g, (match, square, curly) => {
    const key: string = (square || curly || "").trim();
    return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : match;
  });
}

// Helper to fill template with projectConfig values and handle system prompt specifics
async function fillTemplate(
  template: string,
  projectConfig: Record<string, string>,
  generatedMemoryFiles: {
    ProjectOverview: string;
    DeveloperGuide: string;
    DevelopmentStatus: string;
    TechnicalArchitecture: string;
  } | null
) {
  // Extract required bindings from the template and convert Set to Array
  const requiredBindings = Array.from(extractBindings(template));

  // Initialize LLM provider for binding analysis
  const llmProvider = new LLMProvider();

  // Get LLM-analyzed bindings if we have memory files
  let llmBindings: TemplateBindings = {};
  if (generatedMemoryFiles) {
    try {
      llmBindings = await llmProvider.analyzeAndMapBindings(
        projectConfig,
        generatedMemoryFiles,
        requiredBindings
      );
    } catch (error) {
      console.warn("Warning: LLM binding analysis failed:", error);
    }
  }

  // Create a sanitized config with defaults and LLM-analyzed values
  const sanitizedConfig = {
    // Core fields (prefer LLM analysis if available)
    name: llmBindings.name || projectConfig.name || "",
    description: llmBindings.description || projectConfig.description || "",
    workflow: llmBindings.workflow || projectConfig.workflow || "standard",

    // System prompt specific fields with defaults
    os: process.platform,
    shell: process.platform === "win32" ? "PowerShell" : "bash",
    workspaceDir: projectConfig.baseDir || process.cwd(),
    allowedDirs: [projectConfig.baseDir || process.cwd()],

    // Memory bank references (from LLM analysis)
    documentReferences: llmBindings.documentReferences || {
      overview: "memory-bank/ProjectOverview.md",
      architecture: "memory-bank/TechnicalArchitecture.md",
      development: "memory-bank/DeveloperGuide.md",
      status: "memory-bank/DevelopmentStatus.md",
    },

    // Template references (from LLM analysis)
    templateReferences: llmBindings.templateReferences || {
      taskDescription: "templates/task-description-template.md",
      statusReport: "templates/status-report-template.md",
      progress: "templates/progress-update-template.md",
      acknowledgment: "templates/mode-acknowledgment-templates.md",
      implementation: "templates/implementation-plan-template.md",
      completion: "templates/completion-report-template.md",
    },

    // Project details (from LLM analysis)
    projectInfo: llmBindings.projectInfo || "",
    taskManagement: llmBindings.taskManagement || "",
    projectFeatures: llmBindings.projectFeatures || [],
    projectStakeholders: llmBindings.projectStakeholders || [],
    projectTimeline: llmBindings.projectTimeline || "",
    technicalStack: llmBindings.technicalStack || [],

    // Search and read patterns
    searchPatternExample:
      "<search_files><path>docs</path><regex>Status.*Not Started</regex></search_files>",
    readPatternExample:
      "<read_file><path>file.md</path><start_line>10</start_line><end_line>20</end_line></read_file>",
    reviewSearchPattern:
      "<search_files><path>src</path><regex>function\\s+\\w+</regex></search_files>",

    // MCP servers
    mcpServers: llmBindings.mcpServers || projectConfig.mcpServers || "- No MCP servers configured",

    // Modes configuration
    modes:
      llmBindings.modes ||
      (projectConfig.workflow
        ? projectConfig.workflow.split(",").join("\n- ")
        : "- Default workflow"),

    // Optional fields (prefer LLM analysis)
    domains: llmBindings.domains || projectConfig.domains || "",
    tiers: llmBindings.tiers || projectConfig.tiers || "",
    libraries: llmBindings.libraries || projectConfig.libraries || "",

    // Preserve any other project config values
    ...projectConfig,

    // Include any additional LLM-analyzed bindings
    ...llmBindings,
  };

  // Convert requiredBindings array back to Set for validation
  const missingFields = validateConfigBindings(sanitizedConfig, new Set(requiredBindings));

  if (missingFields.length > 0) {
    console.warn(
      `Warning: System prompt template has unfilled bindings: ${missingFields.join(", ")}`
    );
  }

  return renderTemplate(template, sanitizedConfig);
}

// Loads a system prompt template, injects values, and returns the rendered content
export function loadSystemPromptTemplate(templateName: string, data = {}) {
  const templatePath = path.join(__dirname, "..", "templates", "system-prompts", templateName);
  if (!fs.existsSync(templatePath)) {
    throw new Error(`System prompt template not found: ${templatePath}`);
  }
  const raw = fs.readFileSync(templatePath, "utf8");
  return renderTemplate(raw, data);
}

export function generateSystemPrompts(
  projectConfig: Record<string, string>,
  generatedMemoryFiles: {
    ProjectOverview: string;
    DeveloperGuide: string;
    DevelopmentStatus: string;
    TechnicalArchitecture: string;
  } | null,
  writeFile: Function
) {
  const modes = [
    { slug: "boomerang", template: "system-prompt-boomerang.md" },
    { slug: "architect", template: "system-prompt-architect.md" },
    { slug: "code", template: "system-prompt-code.md" },
    { slug: "code-review", template: "system-prompt-code-review.md" },
  ];

  modes.forEach(async ({ slug, template }) => {
    let filled;
    try {
      const templatePath = path.join(__dirname, "..", "templates", "system-prompts", template);
      const raw = fs.readFileSync(templatePath, "utf8");
      filled = await fillTemplate(raw, projectConfig, generatedMemoryFiles);
    } catch (e: any) {
      console.warn(e.message);
      return;
    }
    const outDir = path.join(projectConfig.baseDir, ".roo");
    const outPath = path.join(outDir, `system-prompt-${slug}`);
    writeFile(outPath, filled);
  });
}
