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
  selectedGenerators: Record<string, boolean>
) {
  try {
    // Determine output directory based on mode
    const outDir = path.join(projectConfig.baseDir, mode === "vscode" ? ".vscode" : ".roo");
    fs.mkdirSync(outDir, { recursive: true });

    if (selectedGenerators.memoryBank) {
      await generateMemoryBank(projectConfig);
    } else {
      console.log("Skipping memory bank generation.");
    }

    // lets read memory files rom memory bank folder nad pass these files with it's content to the llm
    const memoryFiles = fs.readdirSync(path.join(projectConfig.baseDir, "memory-bank"));

    const generatedMemoryFiles: {
      ProjectOverview: string;
      DeveloperGuide: string;
      DevelopmentStatus: string;
      TechnicalArchitecture: string;
    } = {
      ProjectOverview: "",
      DeveloperGuide: "",
      DevelopmentStatus: "",
      TechnicalArchitecture: "",
    };
    for (const file of memoryFiles) {
      const filePath = path.join(projectConfig.baseDir, "memory-bank", file);
      if (fs.statSync(filePath).isFile()) {
        const content = fs.readFileSync(filePath, "utf8");
        const fileName = path.basename(
          file,
          path.extname(file)
        ) as keyof typeof generatedMemoryFiles;
        generatedMemoryFiles[fileName] = content;
      }
    }

    if (mode === "roo") {
      if (selectedGenerators.rules) generateRuleFiles(projectConfig);
      if (selectedGenerators.systemPrompts) generateSystemPrompts(projectConfig);
      if (selectedGenerators.roomodes) generateRoomodesFile(projectConfig);

      console.log("\nRooCode configuration generated successfully!");
      console.log("You can now use RooCode with your custom workflow.");
    } else if (mode === "vscode") {
      // VS Code Copilot rules generator
      const {
        generateVscodeCopilotRules,
      } = require("../generators/vscode-copilot-rules-generator");

      await generateVscodeCopilotRules(projectConfig);
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
  // add a new args for a boolean value to generate memory bank or not and default to true if not specified
  // add a new args for a boolean value to generate rules or not and default to true if not specified
  const memoryBankArg = process.argv.find((arg) => arg.startsWith("--memory-bank="));
  const generateMemoryBankFlag =
    memoryBankArg && memoryBankArg.split("=")[1] === "false" ? false : true;

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
      memoryBank: generateMemoryBankFlag,
      rules: true,
      systemPrompts: true,
      roomodes: true,
    };
  } else if (mode === "vscode") {
    selectedGenerators = {
      memoryBank: generateMemoryBankFlag,
      rules: true,
      systemPrompts: false,
      roomodes: false,
    };
  } else {
    selectedGenerators = {
      memoryBank: generateMemoryBankFlag,
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
