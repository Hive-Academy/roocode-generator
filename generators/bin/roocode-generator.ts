import * as fs from "fs";
import * as path from "path";
import { generateMemoryBank } from "../memory-bank-generator";
import { generateRuleFiles } from "../rules-generator";
import { generateSystemPrompts } from "../system-prompts-generator";
import { generateRoomodesFile } from "../roomodes-generator";
import inquirer from "inquirer";
import { runConfigWorkflow } from "../config-workflow";

// Main generation function
async function generateConfiguration(
  projectConfig: Record<string, string>,
  mode = "roo",
  selectedGenerators: Record<string, boolean> | null = null
) {
  try {
    // Determine output directory based on mode
    const outDir = path.join(projectConfig.baseDir, mode === "vscode" ? ".vscode" : ".roo");
    fs.mkdirSync(outDir, { recursive: true });

    // Helper function to write files
    const writeFile = async (filePath: string, content: string) => {
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(filePath, content, "utf8");
      console.log(`Generated: ${path.relative(projectConfig.baseDir, filePath)}`);
    };

    // Interactive selection: if not provided, default to all
    const gens = selectedGenerators || {
      memoryBank: true,
      rules: true,
      systemPrompts: true,
      roomodes: true,
    };

    let generatedMemoryFiles = null;

    if (gens.memoryBank) {
      generatedMemoryFiles = await generateMemoryBank(projectConfig, writeFile);
    }

    if (mode === "roo") {
      if (gens.rules) generateRuleFiles(projectConfig, writeFile);
      if (gens.systemPrompts) generateSystemPrompts(projectConfig, generatedMemoryFiles, writeFile);
      if (gens.roomodes) generateRoomodesFile(projectConfig, writeFile);
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
  } catch (error: any) {
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

  // Set selectedGenerators based on mode (no prompt)
  let selectedGenerators;
  if (mode === "roo") {
    selectedGenerators = {
      memoryBank: true,
      rules: true,
      systemPrompts: true,
      roomodes: true,
    };
  } else if (mode === "vscode") {
    selectedGenerators = {
      memoryBank: true,
      rules: true,
      systemPrompts: false,
      roomodes: false,
    };
  } else {
    selectedGenerators = {
      memoryBank: true,
      rules: true,
      systemPrompts: true,
      roomodes: true,
    };
  }

  const baseDir = process.cwd();
  let projectConfig: Record<string, string> = { baseDir };

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
  await runConfigWorkflow(projectConfig, (cfg: Record<string, string>) =>
    generateConfiguration(cfg, mode, selectedGenerators)
  );
  // process.exit(0);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
