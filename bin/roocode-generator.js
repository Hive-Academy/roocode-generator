#!/usr/bin/env node
const inquirer = require("inquirer").default || require("inquirer");
const fs = require("fs").promises;
const path = require("path");
const { runConfigWorkflow } = require("../generators/config-workflow");
const { generateMemoryBank } = require("../generators/memory-bank-generator");
const { generateRuleFiles } = require("../generators/rules-generator");
const { generateSystemPrompts } = require("../generators/system-prompts-generator");
const { generateRoomodesFile } = require("../generators/roomodes-generator");

// Main generation function
async function generateConfiguration(projectConfig, mode = "roo") {
  try {
    // Determine output directory based on mode
    const outDir = path.join(projectConfig.baseDir, mode === "vscode" ? ".vscode" : ".roo");
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
    if (mode === "roo") {
      await generateRuleFiles(projectConfig, writeFile);
      await generateSystemPrompts(projectConfig, writeFile);
      await generateRoomodesFile(projectConfig, writeFile);
      console.log("\nRooCode configuration generated successfully!");
      console.log("You can now use RooCode with your custom workflow.");
    } else if (mode === "vscode") {
      // VS Code Copilot rules generator
      const {
        generateVscodeCopilotRules,
      } = require("../generators/vscode-copilot-rules-generator");
      await generateVscodeCopilotRules(projectConfig, writeFile);
      console.log("\nVS Code Copilot configuration generated successfully!");
      console.log("You can now use Copilot with your custom rules and memory bank.");
    }
  } catch (error) {
    console.error("Error generating configuration:", error.message);
    process.exit(1);
  }
}

async function main() {
  console.log("RooCode Workflow Generator");
  console.log("=========================");
  console.log("This script will help you set up a custom RooCode workflow for your project.\n");

  // Add CLI flag for mode
  const modeArg = process.argv.find((arg) => arg.startsWith("--mode="));
  const mode = modeArg ? modeArg.split("=")[1] : "roo";

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
  let projectConfig = { baseDir };

  // Only set workflow type for manual or new project modes
  if (projectMode === "existing" || projectMode === "new") {
    projectConfig = {
      name: "",
      description: "",
      workflow: "trunk-based",
      baseDir: baseDir,
      folderStructure: "",
    };
  }

  // Delegate all analysis and prompting to runConfigWorkflow
  await runConfigWorkflow(projectConfig, (cfg) => generateConfiguration(cfg, mode));
  // process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
