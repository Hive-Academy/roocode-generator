// generators/config-workflow.js
const fs = require("fs");
const path = require("path");
const inquirer = require("inquirer").default || require("inquirer");
const { analyzeProjectWithLLM } = require("./llm-agent");
const { askQuestions } = require("./interactive-prompts");

const CONFIG_FILENAME = "roocode.config.json";

function saveConfigToFile(config) {
  const configPath = path.join(config.baseDir, CONFIG_FILENAME);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`Configuration saved to ${configPath}`);
}

function loadConfigFromFile() {
  const configPath = path.join(process.cwd(), CONFIG_FILENAME);
  if (fs.existsSync(configPath)) {
    try {
      return JSON.parse(fs.readFileSync(configPath));
    } catch (e) {
      console.error(`Error parsing ${CONFIG_FILENAME}:`, e);
    }
  }
  return null;
}

function validateConfigReferences(config) {
  const missing = [];
  // Validate memoryBankTemplates
  if (config.memoryBankTemplates) {
    for (const [key, relPath] of Object.entries(config.memoryBankTemplates)) {
      if (!fs.existsSync(path.join(process.cwd(), relPath))) {
        missing.push(`Missing memory bank template: ${relPath}`);
      }
    }
  }
  // Validate systemPrompts
  if (config.systemPrompts) {
    for (const [key, relPath] of Object.entries(config.systemPrompts)) {
      // Accept both prompt text and file path; only check if it looks like a file path
      if (
        typeof relPath === "string" &&
        relPath.endsWith(".md") &&
        !fs.existsSync(path.join(process.cwd(), relPath))
      ) {
        missing.push(`Missing system prompt file: ${relPath}`);
      }
    }
  }
  // Validate rules (if present as file references)
  if (config.suggestedRules && Array.isArray(config.suggestedRules)) {
    config.suggestedRules.forEach((rule) => {
      if (
        typeof rule === "string" &&
        rule.endsWith(".md") &&
        !fs.existsSync(path.join(process.cwd(), rule))
      ) {
        missing.push(`Missing rule file: ${rule}`);
      }
    });
  }
  return missing;
}

function isNxWorkspace(projectRoot) {
  // Check for nx.json or workspace.json in the root
  return (
    fs.existsSync(path.join(projectRoot, "nx.json")) ||
    fs.existsSync(path.join(projectRoot, "workspace.json")) ||
    fs.existsSync(path.join(projectRoot, "project.json"))
  );
}

async function interactiveEditConfig(config) {
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
      const { newValue } = await inquirer.prompt([
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
    let rules = [...config.suggestedRules];
    let editing = true;
    while (editing) {
      console.log("\nCurrent Suggested Rules:");
      rules.forEach((rule, i) => console.log(`  ${i + 1}. ${rule}`));
      const { ruleAction } = await inquirer.prompt([
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
        const { idx } = await inquirer.prompt([
          {
            type: "input",
            name: "idx",
            message: "Enter rule number to edit:",
            validate: (v) => v > 0 && v <= rules.length,
          },
        ]);
        const { newRule } = await inquirer.prompt([
          {
            type: "input",
            name: "newRule",
            message: "Edit rule:",
            default: rules[idx - 1],
          },
        ]);
        rules[idx - 1] = newRule;
      } else if (ruleAction === "remove") {
        const { idx } = await inquirer.prompt([
          {
            type: "input",
            name: "idx",
            message: "Enter rule number to remove:",
            validate: (v) => v > 0 && v <= rules.length,
          },
        ]);
        rules.splice(idx - 1, 1);
      } else if (ruleAction === "add") {
        const { newRule } = await inquirer.prompt([
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
    let recs = [...config.llmRecommendations];
    let editing = true;
    while (editing) {
      console.log("\nCurrent LLM Recommendations:");
      recs.forEach((rec, i) => console.log(`  ${i + 1}. ${rec}`));
      const { recAction } = await inquirer.prompt([
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
        const { idx } = await inquirer.prompt([
          {
            type: "input",
            name: "idx",
            message: "Enter recommendation number to edit:",
            validate: (v) => v > 0 && v <= recs.length,
          },
        ]);
        const { newRec } = await inquirer.prompt([
          {
            type: "input",
            name: "newRec",
            message: "Edit recommendation:",
            default: recs[idx - 1],
          },
        ]);
        recs[idx - 1] = newRec;
      } else if (recAction === "remove") {
        const { idx } = await inquirer.prompt([
          {
            type: "input",
            name: "idx",
            message: "Enter recommendation number to remove:",
            validate: (v) => v > 0 && v <= recs.length,
          },
        ]);
        recs.splice(idx - 1, 1);
      } else if (recAction === "add") {
        const { newRec } = await inquirer.prompt([
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
  const { confirm } = await inquirer.prompt([
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

async function runConfigWorkflow(projectConfig, generateConfiguration) {
  // Ensure baseDir is set to current directory if not provided
  projectConfig.baseDir = projectConfig.baseDir || process.cwd();

  let config = loadConfigFromFile();
  if (config) {
    const { useExisting } = await inquirer.prompt([
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

  // Auto-detect flow
  const { useAutoDetect } = await inquirer.prompt([
    {
      type: "confirm",
      name: "useAutoDetect",
      message: "Use LLM-powered auto-detect for project config?",
      default: true,
    },
  ]);

  if (useAutoDetect) {
    try {
      const analysis = await analyzeProjectWithLLM(projectConfig.baseDir);
      if (analysis.suggestedConfig) {
        const suggestedConfig = {
          ...analysis.suggestedConfig,
          baseDir: projectConfig.baseDir, // Preserve the actual project path
        };

        console.log("\nAuto-detected configuration:");
        console.log(suggestedConfig);

        const { action } = await inquirer.prompt([
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
      }
    } catch (error) {
      console.error("Error analyzing project:", error.message);
    }
  }

  // Fallback to interactive setup
  await askQuestions(projectConfig, generateConfiguration);
}

module.exports = {
  saveConfigToFile,
  loadConfigFromFile,
  runConfigWorkflow,
};
