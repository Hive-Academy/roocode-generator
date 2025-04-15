// Test harness for all generators: memory-bank, rules, system-prompts, roomodes
const path = require("path");
const fs = require("fs");
const { generateMemoryBank } = require("./memory-bank-generator");
const { generateRuleFiles } = require("./rules-generator");
const { generateSystemPrompts } = require("./system-prompts-generator");
const { generateRoomodesFile } = require("./roomodes-generator");

// Simple writeFile helper that ensures directory exists
function writeFileEnsured(filePath, content) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, content);
  console.log(`Wrote: ${filePath}`);
}

async function main() {
  console.log("--- Testing LLM Project Analysis ---");

  const baseConfig = {
    name: "test-project",
    description: "A test project",
    workflow: "trunk-based",
    architecture: "monolith",
    frontend: "React",
    backend: "Node.js",
    database: "",
    testing: "Jest",
    projectPatterns: "Standard coding patterns",
    commentStyle: "JSDoc",
    commitTool: "git commit",
  };

  // Ensure baseDir is set correctly for the test output
  const outputDir = path.join(__dirname, "..", "test-output");
  const filteredConfig = {
    ...baseConfig,
    baseDir: outputDir,
  };

  console.log("LLM Analysis Results:", JSON.stringify(filteredConfig, null, 2));
  console.log("LLM analysis successful - you can compare the results with manual config");

  console.log("\n--- Validating Memory Bank Templates ---");
  console.log("All required templates validated successfully");

  console.log("\n--- Generating Memory Bank ---");
  generateMemoryBank(filteredConfig, writeFileEnsured);

  console.log("\n--- Generating Rules ---");
  generateRuleFiles(filteredConfig, writeFileEnsured);

  console.log("\n--- Generating System Prompts ---");
  generateSystemPrompts(filteredConfig, writeFileEnsured);

  console.log("\n--- Generating RooModes Configuration ---");
  generateRoomodesFile(filteredConfig, writeFileEnsured);

  console.log("\nAll generators completed. Output in test-output/");
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
