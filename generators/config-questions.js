const path = require("path");

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
    question: "Project folder structure type (standard, feature-based, domain-driven):",
    default: "feature-based",
  },
  {
    property: "domains",
    question: "List project domains (comma-separated, e.g. ai-agent,auth,knowledge-base,shared):",
    default: "ai-agent,auth,knowledge-base,shared",
  },
  {
    property: "tiers",
    question: "List project tiers (comma-separated, e.g. backend,frontend,data-access,ui,util):",
    default: "backend,frontend,data-access,ui,util",
  },
  {
    property: "libraries",
    question: "List core libraries or library format (comma-separated or format string):",
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
    question: "Infrastructure (comma-separated, e.g. Docker,CI/CD,NX monorepo):",
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
    default: "<search_files><path>docs</path><regex>Status.*Not Started</regex></search_files>",
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

module.exports = questions;
