// vscode-copilot-rules-generator.js
// Generator for VS Code Copilot custom rules and MCP server integration

const fs = require("fs");
const path = require("path");

// Utility to ensure a directory exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Utility to find mcp.json files in common locations
function findMcpJsonFiles(baseDir) {
  const candidates = [
    path.join(baseDir, ".vscode", "mcp.json"),
    path.join(baseDir, ".roo", "mcp.json"),
    path.join(baseDir, "mcp.json"),
  ];
  return candidates.filter(fs.existsSync);
}

// Extract mcpServers from a given mcp.json file
function extractMcpServers(filePath) {
  try {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return data.mcpServers || {};
  } catch (e) {
    return {};
  }
}

// Generate the MCP Servers markdown section
function generateMcpServersSection(mcpServersMap) {
  if (Object.keys(mcpServersMap).length === 0) return "No MCP servers found.";
  let md = "## MCP Servers\n\n";
  for (const [source, servers] of Object.entries(mcpServersMap)) {
    md += `**From ${source}:**\n`;
    for (const [name, config] of Object.entries(servers)) {
      md += `- **${name}**: \`${JSON.stringify(config)}\`\n`;
    }
    md += "\n";
  }
  return md;
}

// Utility to copy a file if it doesn't exist or overwrite if requested
function copyFileToVscode(src, dest, overwrite = true) {
  if (!fs.existsSync(dest) || overwrite) {
    fs.copyFileSync(src, dest);
  }
}

// Parse CLI arguments for --mode flag
function getModeArg() {
  const modeArg = process.argv.find((arg) => arg.startsWith("--mode="));
  if (modeArg) {
    const mode = modeArg.split("=")[1];
    if (["vscode", "roo"].includes(mode)) return mode;
  }
  return "vscode"; // default
}

// Utility to update settings/config for Copilot instructions (codeGeneration, reviewSelection)
function updateCopilotSettings(targetDir, files, reviewFiles, mode) {
  if (mode === "vscode") {
    const settingsPath = path.join(targetDir, "settings.json");
    let settings = {};
    if (fs.existsSync(settingsPath)) {
      try {
        settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
      } catch (e) {
        /* empty */
      }
    }
    settings["github.copilot.chat.codeGeneration.instructions"] = files.map((f) => ({ file: f }));
    settings["github.copilot.chat.reviewSelection.instructions"] = reviewFiles.map((f) => ({
      file: f,
    }));
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8");
    console.log(`Updated: ${settingsPath}`);
  }
  // For 'roo' mode, future: update .roo config as needed
}

// Copy MCP usage guide as a rule file and add strict advice
function generateVscodeCopilotRules(projectConfig, writeFile) {
  const baseDir = projectConfig.baseDir;
  const vscodeDir = path.join(baseDir, ".vscode");
  if (!fs.existsSync(vscodeDir)) fs.mkdirSync(vscodeDir, { recursive: true });

  // Copy architect-rules.md, code-rules.md, code-review-rules.md
  const rules = [
    {
      src: path.join(baseDir, "templates", "rules", "architect-rules.md"),
      dest: path.join(vscodeDir, "architect-rules.md"),
    },
    {
      src: path.join(baseDir, "templates", "rules", "code-rules.md"),
      dest: path.join(vscodeDir, "code-rules.md"),
    },
    {
      src: path.join(baseDir, "templates", "rules", "code-review-rules.md"),
      dest: path.join(vscodeDir, "code-review-rules.md"),
    },
  ];
  for (const { src, dest } of rules) {
    if (fs.existsSync(src)) fs.copyFileSync(src, dest);
  }

  // Copy MCP usage guide as mcp-usage-rule.md and add strict advice
  const mcpGuidePath = path.join(baseDir, "templates", "guide", "vscode-mcp-usage-guide.md");
  const mcpRulePath = path.join(vscodeDir, "mcp-usage-rule.md");
  let mcpContent = fs.readFileSync(mcpGuidePath, "utf8");
  mcpContent += "\n\n**Rule:** Always use tools from the defined MCP servers whenever possible.**";
  fs.writeFileSync(mcpRulePath, mcpContent, "utf8");

  // Update .vscode/settings.json
  const settingsPath = path.join(vscodeDir, "settings.json");
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
    } catch (e) {
      /* empty */
    }
  }
  settings["github.copilot.chat.codeGeneration.instructions"] = [
    { file: "architect-rules.md" },
    { file: "code-rules.md" },
    { file: "mcp-usage-rule.md" },
  ];
  settings["github.copilot.chat.reviewSelection.instructions"] = [
    { file: "code-review-rules.md" },
    { file: "mcp-usage-rule.md" },
  ];
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), "utf8");
  console.log("Updated VS Code Copilot rules and MCP usage rule.");
}

module.exports = { generateVscodeCopilotRules };

// Main generator logic
function main() {
  const baseDir = process.cwd();
  const mode = getModeArg();
  const targetDir = path.join(baseDir, mode === "vscode" ? ".vscode" : ".roo");
  ensureDir(targetDir);

  // Scan for mcp.json files
  const mcpFiles = findMcpJsonFiles(baseDir);
  const mcpServersMap = {};
  for (const file of mcpFiles) {
    mcpServersMap[path.relative(baseDir, file)] = extractMcpServers(file);
  }

  // Generate VS Code Copilot rules
  generateVscodeCopilotRules({ baseDir }, fs.writeFileSync);
}

if (require.main === module) {
  main();
}
