#!/usr/bin/env node
const inquirer = require("inquirer").default || require("inquirer");
const fs = require("fs").promises;
const path = require("path");
const { runConfigWorkflow } = require("../generators/config-workflow");
const { generateMemoryBank } = require("../generators/memory-bank-generator");
const { generateRuleFiles } = require("../generators/rules-generator");
const { generateSystemPrompts } = require("../generators/system-prompts-generator");
const { generateRoomodesFile } = require("../generators/roomodes-generator");
const { LLMAgent } = require("../generators/llm-agent");
const { LLMProvider } = require("../generators/llm-provider");

async function analyzeProject(baseDir) {
  const llmProvider = new LLMProvider();
  const llmAgent = new LLMAgent(llmProvider);

  console.log("\nAnalyzing project structure and files...");

  // Scan for key files
  const keyFiles = ["package.json", "README.md", "tsconfig.json", "nx.json"];
  const projectFiles = {};

  for (const file of keyFiles) {
    try {
      const content = await fs.readFile(path.join(baseDir, file), "utf8");
      projectFiles[file] = content;
    } catch (err) {
      // File doesn't exist, skip
    }
  }

  // Use LLM to analyze project structure
  const projectAnalysis = await llmAgent.analyzeProject(projectFiles, baseDir);

  return {
    name: projectAnalysis.name || "",
    description: projectAnalysis.description || "",
    workflow: projectAnalysis.workflow || "trunk-based",
    baseDir: baseDir,
    folderStructure: projectAnalysis.folderStructure || "",
    // Optional fields - only include if detected
    ...(projectAnalysis.architecture ? { architecture: projectAnalysis.architecture } : {}),
    ...(projectAnalysis.testing ? { testing: projectAnalysis.testing } : {}),
    ...(projectAnalysis.domains ? { domains: projectAnalysis.domains } : {}),
    ...(projectAnalysis.tiers ? { tiers: projectAnalysis.tiers } : {}),
    ...(projectAnalysis.libraries ? { libraries: projectAnalysis.libraries } : {}),
  };
}

// Main generation function
async function generateConfiguration(projectConfig) {
  try {
    // Create output directory
    const outDir = path.join(projectConfig.baseDir, ".roo");
    await fs.mkdir(outDir, { recursive: true });

    // Helper function to write files
    const writeFile = async (filePath, content) => {
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, content, "utf8");
      console.log(`Generated: ${path.relative(projectConfig.baseDir, filePath)}`);
    };

    // Generate all configuration files
    await generateMemoryBank(projectConfig, writeFile);
    await generateRuleFiles(projectConfig, writeFile);
    await generateSystemPrompts(projectConfig, writeFile);
    await generateRoomodesFile(projectConfig, writeFile);

    console.log("\nRooCode configuration generated successfully!");
    console.log("You can now use RooCode with your custom workflow.");
  } catch (error) {
    console.error("Error generating configuration:", error.message);
    process.exit(1);
  }
}

async function main() {
  console.log("RooCode Workflow Generator");
  console.log("=========================");
  console.log("This script will help you set up a custom RooCode workflow for your project.\n");

  const { projectMode } = await inquirer.prompt([
    {
      type: "list",
      name: "projectMode",
      message: "What would you like to do?",
      choices: [
        { name: "Auto-detect project (LLM-powered)", value: "auto" },
        { name: "Integrate RooCode manually into an existing project", value: "existing" },
        { name: "Start a new project with RooCode best practices", value: "new" },
      ],
    },
  ]);

  const baseDir = process.cwd();
  let projectConfig;

  if (projectMode === "auto") {
    try {
      projectConfig = await analyzeProject(baseDir);

      // Show analysis results and confirm
      console.log("\nProject Analysis Results:");
      console.log("========================");
      Object.entries(projectConfig).forEach(([key, value]) => {
        if (key !== "baseDir" && value) {
          console.log(`${key}: ${value}`);
        }
      });

      const { confirmed } = await inquirer.prompt([
        {
          type: "confirm",
          name: "confirmed",
          message: "Would you like to proceed with these settings?",
          default: true,
        },
      ]);

      if (!confirmed) {
        // Fall back to manual configuration with minimal defaults
        projectConfig = {
          name: "",
          description: "",
          workflow: "trunk-based",
          baseDir: baseDir,
          folderStructure: "",
        };
      }
    } catch (error) {
      console.error("Error during project analysis:", error.message);
      console.log("Falling back to manual configuration...\n");
      projectConfig = {
        name: "",
        description: "",
        workflow: "trunk-based",
        baseDir: baseDir,
        folderStructure: "",
      };
    }
  } else if (projectMode === "existing") {
    // Minimal config for existing projects
    projectConfig = {
      name: "",
      description: "",
      workflow: "trunk-based",
      baseDir: baseDir,
      folderStructure: "",
    };
  } else {
    // New project flow with minimal defaults
    console.log(
      "\n[New Project Mode] This feature will help you scaffold a new project with RooCode best practices.\n"
    );
    projectConfig = {
      name: "",
      description: "",
      workflow: "trunk-based",
      baseDir: baseDir,
      folderStructure: "",
    };
  }

  await runConfigWorkflow(projectConfig, generateConfiguration);
  // process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
