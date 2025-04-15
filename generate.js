const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Project configuration to be filled
const projectConfig = {
  name: "",
  description: "",
  architecture: "",
  frontend: "",
  backend: "",
  database: "",
  testing: "",
  workflow: "",
  baseDir: process.cwd(),
  folderStructure: "",
};

// Support for config file import/export
const CONFIG_FILENAME = "roocode.config.json";

function saveConfigToFile(config) {
  fs.writeFileSync(CONFIG_FILENAME, JSON.stringify(config, null, 2));
  console.log(`\nConfiguration saved to ${CONFIG_FILENAME}`);
}

function loadConfigFromFile() {
  if (fs.existsSync(CONFIG_FILENAME)) {
    const raw = fs.readFileSync(CONFIG_FILENAME, "utf8");
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error(`Error parsing ${CONFIG_FILENAME}:`, e);
    }
  }
  return null;
}

// Expanded questions to cover all placeholders and support multi-select/lists
const questions = [
  {
    property: "name",
    question: "Project name:",
    default: path.basename(process.cwd()),
  },
  {
    property: "description",
    question: "Brief project description:",
    default: "A software project using RooCode",
  },
  {
    property: "architecture",
    question: "Project architecture (monolith, microservices, serverless):",
    default: "monolith",
  },
  {
    property: "frontend",
    question: "Frontend technology (React, Angular, Vue, etc.):",
    default: "React",
  },
  {
    property: "backend",
    question: "Backend technology (Node.js, Python, Java, etc.):",
    default: "Node.js",
  },
  {
    property: "database",
    question: "Database technology (MongoDB, PostgreSQL, MySQL, etc.):",
    default: "MongoDB",
  },
  {
    property: "testing",
    question: "Testing frameworks (Jest, Cypress, etc.):",
    default: "Jest",
  },
  {
    property: "workflow",
    question: "Development workflow (GitFlow, trunk-based, etc.):",
    default: "trunk-based",
  },
  {
    property: "folderStructure",
    question:
      "Project folder structure type (standard, feature-based, domain-driven):",
    default: "feature-based",
  },
  {
    property: "domains",
    question:
      "List project domains (comma-separated, e.g. ai-agent,auth,knowledge-base,shared):",
    default: "ai-agent,auth,knowledge-base,shared",
  },
  {
    property: "tiers",
    question:
      "List project tiers (comma-separated, e.g. backend,frontend,data-access,ui,util):",
    default: "backend,frontend,data-access,ui,util",
  },
  {
    property: "libraries",
    question:
      "List core libraries or library format (comma-separated or format string):",
    default: "libs/<domain>/<tier>/[type-]<feature|util>",
  },
  {
    property: "architecturePatterns",
    question:
      "Architecture patterns (comma-separated, e.g. Repository Pattern,Modular,Event-Driven):",
    default: "Repository Pattern,Modular",
  },
  {
    property: "technicalStandards",
    question: "Technical standards (comma-separated or summary):",
    default: "Clean code,Unit tests,Error handling",
  },
  {
    property: "currentFocus",
    question: "Current project focus or status:",
    default: "Initial setup and core feature development",
  },
  {
    property: "infrastructure",
    question:
      "Infrastructure (comma-separated, e.g. Docker,CI/CD,NX monorepo):",
    default: "Docker,CI/CD,NX monorepo",
  },
  {
    property: "fileReferences",
    question: "Common file references (markdown table rows, or leave blank):",
    default: "",
  },
  {
    property: "commandsReference",
    question: "CLI commands reference (short summary or leave blank):",
    default: "",
  },
  {
    property: "componentStructure",
    question: "Component structure (short summary or leave blank):",
    default: "",
  },
  {
    property: "libraryStructure",
    question: "Library structure (short summary or leave blank):",
    default: "",
  },
  {
    property: "reviewChecklist",
    question: "Code review checklist (markdown list or leave blank):",
    default: "",
  },
  {
    property: "feedbackGuidelines",
    question: "Feedback guidelines (markdown list or leave blank):",
    default: "",
  },
  {
    property: "commitProcess",
    question: "Commit process (markdown list or leave blank):",
    default: "",
  },
  {
    property: "domainStructure",
    question: "Domain structure (markdown or leave blank):",
    default: "",
  },
  {
    property: "domainStructureLineRange",
    question: "Domain structure line range (e.g. 25-29):",
    default: "25-29",
  },
  {
    property: "searchPattern",
    question: "Example search_files pattern (XML or leave blank):",
    default:
      "<search_files><path>docs</path><regex>Status.*Not Started</regex></search_files>",
  },
  {
    property: "readPattern",
    question: "Example read_file pattern (XML or leave blank):",
    default:
      "<read_file><path>file.md</path><start_line>10</start_line><end_line>20</end_line></read_file>",
  },
  {
    property: "domainStructureFile",
    question: "Domain structure file name:",
    default: "boomerang-mode-quickref.md",
  },
  {
    property: "projectTechFile",
    question: "Project tech file name:",
    default: "core-reference.md",
  },
  {
    property: "domainStructureSearch",
    question: "Domain structure search pattern:",
    default: "Domains.*Tiers",
  },
  {
    property: "projectTechSearch",
    question: "Project tech search pattern:",
    default: "Core Technologies",
  },
  {
    property: "projectTechLineRange",
    question: "Project tech line range:",
    default: "51-55",
  },
];

// Function to ask questions sequentially
function askQuestions(index = 0) {
  if (index >= questions.length) {
    rl.question(
      "Export configuration to roocode.config.json for future use? (Y/n): ",
      (exportAnswer) => {
        if (exportAnswer.trim().toLowerCase() !== "n") {
          saveConfigToFile(projectConfig);
        }
        generateConfiguration();
      }
    );
    return;
  }

  const q = questions[index];
  const defaultValue = q.default ? ` (${q.default})` : "";

  rl.question(`${q.question}${defaultValue}: `, (answer) => {
    let value = answer.trim() || q.default;
    // For list-type properties, store as comma-separated string for template injection
    if (
      [
        "domains",
        "tiers",
        "libraries",
        "architecturePatterns",
        "technicalStandards",
        "infrastructure",
      ].includes(q.property)
    ) {
      value = value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .join(", ");
    }
    projectConfig[q.property] = value;
    askQuestions(index + 1);
  });
}

// Function to create directories
function createDirectories() {
  const dirs = [
    path.join(projectConfig.baseDir, ".roo"),
    path.join(projectConfig.baseDir, ".roo/rules-boomerang"),
    path.join(projectConfig.baseDir, ".roo/rules-architect"),
    path.join(projectConfig.baseDir, ".roo/rules-code"),
    path.join(projectConfig.baseDir, ".roo/rules-code-review"),
    path.join(projectConfig.baseDir, "memory-bank"),
    path.join(projectConfig.baseDir, "memory-bank/templates"),
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  }
}

// Function to write file
function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content);
  console.log(`Created file: ${filePath}`);
}

// Main generation function
function generateConfiguration() {
  console.log("\nGenerating RooCode configuration...");

  // Create directories
  createDirectories();

  // Generate files using separate modules
  const generateRoomodesFile = require("./generators/roomodes-generator");
  const generateRuleFiles = require("./generators/rules-generator");
  const generateSystemPrompts = require("./generators/system-prompts-generator");
  const generateMemoryBank = require("./generators/memory-bank-generator");
  const generateReadme = require("./generators/readme-generator");
  const generateAutoApproveConfig = require("./generators/auto-approve-generator");

  // Generate all files
  generateRoomodesFile(projectConfig, writeFile);
  generateRuleFiles(projectConfig, writeFile);
  generateSystemPrompts(projectConfig, writeFile);
  generateMemoryBank(projectConfig, writeFile);
  generateReadme(projectConfig, writeFile);
  generateAutoApproveConfig(projectConfig, writeFile);

  console.log("\nRooCode configuration generated successfully!");
  console.log("You can now use RooCode with your custom workflow.");

  rl.close();
}

// Start the configuration process
function start() {
  rl.question(
    "Load configuration from roocode.config.json? (y/N): ",
    (answer) => {
      if (answer.trim().toLowerCase() === "y") {
        const loaded = loadConfigFromFile();
        if (loaded) {
          Object.assign(projectConfig, loaded);
          console.log("Loaded configuration. Preview:");
          console.log(JSON.stringify(projectConfig, null, 2));
          rl.question("Proceed with this configuration? (Y/n): ", (proceed) => {
            if (proceed.trim().toLowerCase() === "n") {
              askQuestions();
            } else {
              generateConfiguration();
            }
          });
          return;
        } else {
          console.log(
            "No valid config found. Proceeding with interactive setup."
          );
        }
      }
      askQuestions();
    }
  );
}

console.log("RooCode Workflow Generator");
console.log("=========================");
console.log(
  "This script will create a custom RooCode workflow for your project."
);
console.log(
  "Please answer the following questions to customize your configuration."
);
console.log(
  "Press Enter to accept the default value (shown in parentheses).\n"
);

start();
