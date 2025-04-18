import * as fs from "fs";
import * as path from "path";
import * as inquirer from "inquirer";
import { askQuestions } from "./interactive-prompts";
import { analyzeProjectWithLLM } from "./llm-agent"; // Static import
import type { ProjectConfig, AnalysisResult } from "../types/shared"; // Import shared types

const CONFIG_FILENAME = "roocode.config.json";

// Types moved to ../types/shared.ts
export function saveConfigToFile(config: ProjectConfig): void {
  const configPath = path.join(config.baseDir, CONFIG_FILENAME);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`Configuration saved to ${configPath}`);
}

export function loadConfigFromFile(): ProjectConfig | null {
  const configPath = path.join(process.cwd(), CONFIG_FILENAME);
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath, "utf-8")) as ProjectConfig;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(`Error parsing ${CONFIG_FILENAME}:`, message);
    }
  }
  return null;
}

export async function interactiveEditConfig(config: ProjectConfig): Promise<void> {
  const editableFields = [
    "name",
    "description",
    "architecture",
    "frontend",
    "backend",
    "database",
    "testing",
    "workflow",
    "baseDir",
    "folderStructure",
    "domains",
    "tiers",
    "libraries",
  ];

  for (const field of editableFields as (keyof ProjectConfig)[]) {
    if (config[field] !== undefined) {
      const answers = await inquirer.default.prompt([
        {
          type: "input",
          name: "newValue",
          message: `Edit ${field}:`,
          default: Array.isArray(config[field])
            ? (config[field] as string[]).join(",") // Handle string arrays
            : typeof config[field] === "object" && config[field] !== null
              ? "" // Use empty string for non-array objects as default
              : String(config[field] ?? ""), // Handle primitives
        },
      ]);
      // Temporary 'as any' for assignment during strict upgrade.
      // Needs refinement based on field type for full type safety.
      (config as any)[field] = answers.newValue;
    }
  }

  // Edit suggestedRules (array)
  if (Array.isArray(config.suggestedRules)) {
    const rules = [...config.suggestedRules]; // Ensure it's string[]
    let editing = true;
    while (editing) {
      console.log("\nCurrent Suggested Rules:");
      rules.forEach((rule, i) => console.log(`  ${i + 1}. ${String(rule)}`));
      const { ruleAction } = await inquirer.default.prompt<{
        ruleAction: "edit" | "remove" | "add" | "done";
      }>([
        {
          type: "list",
          name: "ruleAction",
          message: "Edit rules:",
          choices: [
            { name: "Edit a rule", value: "edit" },
            { name: "Remove a rule", value: "remove" },
            { name: "Add a new rule", value: "add" },
            { name: "Done editing rules", value: "done" },
          ],
        },
      ]);
      if (ruleAction === "edit") {
        const { idxStr } = await inquirer.default.prompt<{ idxStr: string }>([
          {
            type: "input",
            name: "idxStr",
            message: "Enter rule number to edit:",
            validate: (v) => Number(v) > 0 && Number(v) <= rules.length,
          },
        ]);
        const idx = Number(idxStr);
        const { newRule } = await inquirer.default.prompt<{ newRule: string }>([
          { type: "input", name: "newRule", message: "Edit rule:", default: rules[idx - 1] },
        ]);
        rules[idx - 1] = newRule;
      } else if (ruleAction === "remove") {
        const { idxStr } = await inquirer.default.prompt<{ idxStr: string }>([
          {
            type: "input",
            name: "idxStr",
            message: "Enter rule number to remove:",
            validate: (v) => Number(v) > 0 && Number(v) <= rules.length,
          },
        ]);
        const idx = Number(idxStr);
        rules.splice(idx - 1, 1);
      } else if (ruleAction === "add") {
        const { newRule } = await inquirer.default.prompt<{ newRule: string }>([
          { type: "input", name: "newRule", message: "Enter new rule:" },
        ]);
        rules.push(newRule);
      } else {
        editing = false;
      }
    }
    config.suggestedRules = rules;
  }

  // Edit llmRecommendations (array) - Similar logic as suggestedRules
  if (Array.isArray(config.llmRecommendations)) {
    const recs = [...config.llmRecommendations]; // Ensure it's string[]
    let editing = true;
    while (editing) {
      console.log("\nCurrent LLM Recommendations:");
      recs.forEach((rec, i) => console.log(`  ${i + 1}. ${String(rec)}`));
      const { recAction } = await inquirer.default.prompt<{
        recAction: "edit" | "remove" | "add" | "done";
      }>([
        {
          type: "list",
          name: "recAction",
          message: "Edit recommendations:",
          choices: [
            { name: "Edit a recommendation", value: "edit" },
            { name: "Remove a recommendation", value: "remove" },
            { name: "Add a new recommendation", value: "add" },
            { name: "Done editing recommendations", value: "done" },
          ],
        },
      ]);
      if (recAction === "edit") {
        const { idxStr } = await inquirer.default.prompt<{ idxStr: string }>([
          {
            type: "input",
            name: "idxStr",
            message: "Enter recommendation number to edit:",
            validate: (v) => Number(v) > 0 && Number(v) <= recs.length,
          },
        ]);
        const idx = Number(idxStr);
        const { newRec } = await inquirer.default.prompt<{ newRec: string }>([
          {
            type: "input",
            name: "newRec",
            message: "Edit recommendation:",
            default: recs[idx - 1],
          },
        ]);
        recs[idx - 1] = newRec;
      } else if (recAction === "remove") {
        const { idxStr } = await inquirer.default.prompt<{ idxStr: string }>([
          {
            type: "input",
            name: "idxStr",
            message: "Enter recommendation number to remove:",
            validate: (v) => Number(v) > 0 && Number(v) <= recs.length,
          },
        ]);
        const idx = Number(idxStr);
        recs.splice(idx - 1, 1);
      } else if (recAction === "add") {
        const { newRec } = await inquirer.default.prompt<{ newRec: string }>([
          { type: "input", name: "newRec", message: "Enter new recommendation:" },
        ]);
        recs.push(newRec);
      } else {
        editing = false;
      }
    }
    config.llmRecommendations = recs;
  }

  // Confirm final config
  console.log("\nFinal configuration to be used:");
  console.log(JSON.stringify(config, null, 2));
  const { confirm } = await inquirer.default.prompt<{ confirm: boolean }>([
    {
      type: "confirm",
      name: "confirm",
      message: "Proceed with this configuration?",
      default: true,
    },
  ]);
  if (!confirm) {
    console.log(
      "\nYou can edit the configuration manually in roocode.config.json or rerun the CLI for interactive setup."
    );
    process.exit(0);
  }
}

// Type parameters: Partial for initial config, specific function type for callback
export async function runConfigWorkflow(
  projectConfig: Partial<ProjectConfig>,
  generateConfiguration: (config: ProjectConfig) => Promise<void> | void
): Promise<void> {
  // Ensure baseDir is set to current directory if not provided
  const baseDir = projectConfig.baseDir || process.cwd();
  projectConfig.baseDir = baseDir; // Ensure it's set on the partial object too

  const existingConfig = loadConfigFromFile();
  if (existingConfig) {
    const { useExisting } = await inquirer.default.prompt<{ useExisting: boolean }>([
      {
        type: "confirm",
        name: "useExisting",
        message: "Found existing roocode.config.json. Would you like to use it?",
        default: true,
      },
    ]);
    if (useExisting) {
      // Ensure baseDir is preserved from current context, not loaded file
      existingConfig.baseDir = baseDir;
      await generateConfiguration(existingConfig);
      return;
    }
  }

  // Always perform and show project analysis/scan on first run
  let analysis: AnalysisResult | null = null; // Use defined AnalysisResult type
  let suggestedConfig: ProjectConfig | null = null;

  try {
    analysis = await analyzeProjectWithLLM(baseDir); // Use baseDir

    if (analysis?.suggestedConfig) {
      suggestedConfig = {
        ...analysis.suggestedConfig, // Spread the suggested config
        baseDir: baseDir, // Ensure baseDir is correctly set
      };
      console.log("\n========================");
      console.log("Project Scan Complete!");
      console.log(`Scanned ${analysis.fileList?.length ?? 0} files in your project directory.`);
      console.log("========================");
      console.log("Project Analysis Results (from LLM scan):");
      console.log("------------------------");
      Object.entries(suggestedConfig).forEach(([key, value]) => {
        // Check if value is not null/undefined before logging
        if (key !== "baseDir" && value !== null && value !== undefined) {
          // Attempt to stringify complex objects, otherwise use value directly
          const displayValue = typeof value === "object" ? JSON.stringify(value) : value;
          console.log(`${key}: ${displayValue}`);
        }
      });
      console.log("------------------------");
    } else {
      console.warn("LLM analysis did not return expected configuration structure.");
      suggestedConfig = { baseDir: baseDir }; // Minimal config
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error analyzing project:", message);
    if (error instanceof Error && error.stack) {
      console.error("Error stack:", error.stack);
    }
    // Fallback suggested config on error
    suggestedConfig = {
      name: "",
      description: "",
      workflow: "trunk-based",
      baseDir: baseDir,
      folderStructure: "",
    };
  }

  // Ensure suggestedConfig is not null before proceeding
  if (!suggestedConfig) {
    console.error("Failed to determine suggested configuration. Exiting.");
    process.exit(1);
  }

  // Prompt user for action on the scanned config
  const { action } = await inquirer.default.prompt<{ action: "accept" | "edit" | "reject" }>([
    {
      type: "list",
      name: "action",
      message: "Do you want to accept, edit, or reject this configuration?",
      choices: [
        { name: "Accept and continue", value: "accept" },
        { name: "Edit values", value: "edit" },
        { name: "Reject and use manual setup", value: "reject" },
      ],
    },
  ]);

  const finalConfig = suggestedConfig; // Use suggestedConfig as the base

  if (action === "edit") {
    await interactiveEditConfig(finalConfig); // Edit the config object directly
  } else if (action === "reject") {
    // Fallback to interactive setup if rejected
    // askQuestions needs to return the config or modify it by reference
    // Assuming askQuestions modifies projectConfig and we use that
    console.log("Proceeding with manual setup...");
    askQuestions(projectConfig, generateConfiguration); // Pass the original partial config
    return; // Exit after manual setup completes
  }

  // Generate configuration if accepted or after editing
  await generateConfiguration(finalConfig);
}
