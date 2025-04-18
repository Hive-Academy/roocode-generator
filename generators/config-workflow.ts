import * as fs from "fs";
import * as path from "path";
import * as inquirer from "inquirer";
import { askQuestions } from "./interactive-prompts";

const CONFIG_FILENAME = "roocode.config.json";

export function saveConfigToFile(config: any) {
  const configPath = path.join(config.baseDir, CONFIG_FILENAME);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`Configuration saved to ${configPath}`);
}

export function loadConfigFromFile() {
  const configPath = path.join(process.cwd(), CONFIG_FILENAME);
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath) as any);
    } catch (e) {
      console.error(`Error parsing ${CONFIG_FILENAME}:`, e);
    }
  }
  return null;
}

export async function interactiveEditConfig(config: any) {
  // Edit main config fields
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

  for (const field of editableFields) {
    if (config[field] !== undefined) {
      const { newValue } = await inquirer.default.prompt([
        {
          type: "input",
          name: "newValue",
          message: `Edit ${field}:`,
          default: config[field],
        },
      ]);
      config[field] = newValue;
    }
  }

  // Edit suggestedRules (array)
  if (Array.isArray(config.suggestedRules)) {
    const rules = [...config.suggestedRules];
    let editing = true;
    while (editing) {
      console.log("\nCurrent Suggested Rules:");
      rules.forEach((rule, i) => console.log(`  ${i + 1}. ${rule}`));
      const { ruleAction } = await inquirer.default.prompt([
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
        const { idx } = await inquirer.default.prompt([
          {
            type: "input",
            name: "idx",
            message: "Enter rule number to edit:",
            validate: (v) => Number(v) > 0 && Number(v) <= rules.length,
          },
        ]);
        const { newRule } = await inquirer.default.prompt([
          {
            type: "input",
            name: "newRule",
            message: "Edit rule:",
            default: rules[idx - 1],
          },
        ]);
        rules[idx - 1] = newRule;
      } else if (ruleAction === "remove") {
        const { idx } = await inquirer.default.prompt([
          {
            type: "input",
            name: "idx",
            message: "Enter rule number to remove:",
            validate: (v) => Number(v) > 0 && Number(v) <= rules.length,
          },
        ]);
        rules.splice(idx - 1, 1);
      } else if (ruleAction === "add") {
        const { newRule } = await inquirer.default.prompt([
          {
            type: "input",
            name: "newRule",
            message: "Enter new rule:",
          },
        ]);
        rules.push(newRule);
      } else {
        editing = false;
      }
    }
    config.suggestedRules = rules;
  }

  // Edit llmRecommendations (array)
  if (Array.isArray(config.llmRecommendations)) {
    const recs = [...config.llmRecommendations];
    let editing = true;
    while (editing) {
      console.log("\nCurrent LLM Recommendations:");
      recs.forEach((rec, i) => console.log(`  ${i + 1}. ${rec}`));
      const { recAction } = await inquirer.default.prompt([
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
        const { idx } = await inquirer.default.prompt([
          {
            type: "input",
            name: "idx",
            message: "Enter recommendation number to edit:",
            validate: (v) => Number(v) > 0 && Number(v) <= recs.length,
          },
        ]);
        const { newRec } = await inquirer.default.prompt([
          {
            type: "input",
            name: "newRec",
            message: "Edit recommendation:",
            default: recs[idx - 1],
          },
        ]);
        recs[idx - 1] = newRec;
      } else if (recAction === "remove") {
        const { idx } = await inquirer.default.prompt([
          {
            type: "input",
            name: "idx",
            message: "Enter recommendation number to remove:",
            validate: (v) => Number(v) > 0 && Number(v) <= recs.length,
          },
        ]);
        recs.splice(idx - 1, 1);
      } else if (recAction === "add") {
        const { newRec } = await inquirer.default.prompt([
          {
            type: "input",
            name: "newRec",
            message: "Enter new recommendation:",
          },
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
  const { confirm } = await inquirer.default.prompt([
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

export async function runConfigWorkflow(projectConfig: any, generateConfiguration: any) {
  // Ensure baseDir is set to current directory if not provided
  projectConfig.baseDir = projectConfig.baseDir || process.cwd();

  const config = loadConfigFromFile();
  if (config) {
    const { useExisting } = await inquirer.default.prompt([
      {
        type: "confirm",
        name: "useExisting",
        message: "Found existing roocode.config.json. Would you like to use it?",
        default: true,
      },
    ]);
    if (useExisting) {
      // Ensure baseDir is preserved
      config.baseDir = projectConfig.baseDir;
      await generateConfiguration(config);
      return;
    }
  }

  // Always perform and show project analysis/scan on first run
  let analysis = null;
  let suggestedConfig = null;
  try {
    const { analyzeProjectWithLLM } = require("./llm-agent");
    analysis = await analyzeProjectWithLLM(projectConfig.baseDir);
    suggestedConfig = {
      ...analysis.suggestedConfig,
      ...analysis.llmResponse,
      baseDir: projectConfig.baseDir,
    };
    console.log("\n========================");
    console.log("Project Scan Complete!");
    console.log(
      `Scanned ${analysis.fileList ? analysis.fileList.length : 0} files in your project directory.`
    );
    console.log("========================");
    console.log("Project Analysis Results (from LLM scan):");
    console.log("------------------------");
    Object.entries(suggestedConfig).forEach(([key, value]) => {
      if (key !== "baseDir" && value) {
        console.log(`${key}: ${value}`);
      }
    });
    console.log("------------------------");
  } catch (error: any) {
    console.error("Error analyzing project:", error.message);
    if (error && error.stack) {
      console.error("Error stack:", error.stack);
    }
    if (typeof analysis === "object") {
      console.error("Analysis object:", JSON.stringify(analysis, null, 2));
    }
    suggestedConfig = {
      name: "",
      description: "",
      workflow: "trunk-based",
      baseDir: projectConfig.baseDir,
      folderStructure: "",
    };
  }

  // Prompt user for action on the scanned config
  const { action } = await inquirer.default.prompt([
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

  if (action === "accept") {
    await generateConfiguration(suggestedConfig);
    return;
  } else if (action === "edit") {
    await interactiveEditConfig(suggestedConfig);
    await generateConfiguration(suggestedConfig);
    return;
  }

  // Fallback to interactive setup if rejected
  await askQuestions(projectConfig, generateConfiguration);
}
