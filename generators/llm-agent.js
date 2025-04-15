// generators/llm-agent.js
// Scaffolding for LLM-powered project analysis and config suggestion using LangChain

const { readFileSync } = require("fs");
const fs = require("fs");
const path = require("path");
const { loadLLMConfig } = require("./llm-provider");
const ora = require("ora").default || require("ora");

const { ChatOpenAI } = require("@langchain/openai");
let ChatGoogleGenerativeAI, ChatAnthropic;
try {
  ChatGoogleGenerativeAI = require("@langchain/google-genai").ChatGoogleGenerativeAI;
} catch {
  /* empty */
}
try {
  ChatAnthropic = require("@langchain/anthropic").ChatAnthropic;
} catch {
  /* empty */
}

const { getAllowedConfigFields, postProcessConfig } = require("./config-fields");

// Exclude patterns for files/folders that should not be sent to the LLM
const EXCLUDE_PATTERNS = [
  /^node_modules\b/i,
  /^\.git\b/i,
  /^\.github\b/i,
  /^\.husky\b/i,
  /^dist\b/i,
  /^coverage\b/i,
  /^\.roo\b/i,
  /^\.vscode\b/i,
  /^\.idea\b/i,
  /^package-lock\.json$/i,
  /^yarn\.lock$/i,
  /^pnpm-lock\.yaml$/i,
  /^\.DS_Store$/i,
  /^\.env/i,
  /^llm\.config\.json$/i,
  /^\.npmignore$/i,
  /^\.gitignore$/i,
  /^\.eslintrc(\..*)?$/i,
  /^\.prettierrc(\..*)?$/i,
  /^commitlint\.config\.js$/i,
  /^eslint\.config\.mjs$/i,
];

function shouldExclude(relPath) {
  return EXCLUDE_PATTERNS.some((pat) => pat.test(relPath.replace(/\\/g, "/")));
}

/**
 * List all files and folders recursively in the project directory.
 * @param {string} dir - Directory to scan.
 * @returns {string[]} Array of file and folder paths (relative to dir).
 */
function listFilesRecursive(dir, base = dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const relPath = path.relative(base, filePath).replace(/\\/g, "/");
    const stat = fs.statSync(filePath);
    if (shouldExclude(relPath)) return;
    if (stat && stat.isDirectory()) {
      results.push(relPath + "/");
      results = results.concat(listFilesRecursive(filePath, base));
    } else {
      results.push(relPath);
    }
  });
  return results;
}

/**
 * Read the contents of all files in the project directory (with truncation for large files).
 * @param {string} projectDir - The root directory of the user's project.
 * @param {string[]} fileList - List of all files/folders (relative to projectDir).
 * @param {number} maxBytes - Maximum bytes to read from each file (default: 2000).
 * @returns {object} Object with file contents keyed by filename.
 */
function readAllFilesTruncated(projectDir, fileList, maxBytes = 2000) {
  const fileContents = {};
  fileList.forEach((relPath) => {
    // Skip directories
    if (relPath.endsWith("/")) return;
    const absPath = path.join(projectDir, relPath);
    try {
      const content = readFileSync(absPath, "utf8");
      fileContents[relPath] = content.length > maxBytes ? content.slice(0, maxBytes) : content;
    } catch {
      /* empty */
    }
  });
  return fileContents;
}

/**
 * Prepare a prompt for the LLM with file list and key file contents.
 * @param {string[]} fileList
 * @param {object} fileContents
 * @param {object} context - Extra context (isNxWorkspace, fileTree, etc.)
 * @returns {string} LLM prompt
 */
function buildLLMPrompt(fileList, fileContents, context = {}) {
  const allowedFields = getAllowedConfigFields();
  let prompt = `You are analyzing a Node.js CLI tool for generating RooCode workflow files.\n`;
  prompt += `Project context: isNxWorkspace=${context.isNxWorkspace ? "true" : "false"}.\n`;
  prompt += `Project file tree (top-level): ${context.fileTree || "(not provided)"}\n\n`;

  prompt += `Analysis Instructions:\n`;
  prompt += `1. Technical Stack Analysis:\n`;
  prompt += `   - Identify core dependencies and their versions from package.json\n`;
  prompt += `   - Note development tools (ESLint, Prettier, etc.) and their configurations\n`;
  prompt += `   - Detect testing frameworks and practices\n`;
  prompt += `   - Identify build tools and automation\n\n`;

  prompt += `2. Architecture Analysis:\n`;
  prompt += `   - Determine if the project uses specific architectural patterns\n`;
  prompt += `   - Identify module organization and dependencies\n`;
  prompt += `   - Note any use of specific design patterns\n`;
  prompt += `   - Analyze integration points (LangChain, APIs, etc.)\n\n`;

  prompt += `3. Development Workflow:\n`;
  prompt += `   - Identify version control practices (trunk-based, etc.)\n`;
  prompt += `   - Note CI/CD configuration and tools\n`;
  prompt += `   - Document code quality tools and their settings\n`;
  prompt += `   - Look for automation scripts and tools\n\n`;

  prompt += `Configuration Rules:\n`;
  prompt += `- Only include fields like domains, tiers, and libraries if isNxWorkspace is true or if you detect clear domain-driven design (DDD) structure\n`;
  prompt += `- Do NOT suggest frontend, backend, database, or web-app style fields unless you see actual implementation for them\n`;
  prompt += `- Only suggest config fields that are present in the codebase and in this list: [${allowedFields.join(", ")}]\n`;
  prompt += `- If a field is not relevant or not found, output an empty string for it\n\n`;

  prompt += `Expected Output Format:\n`;
  prompt += `1. Project Configuration (JSON):\n`;
  prompt += `{
    "name": "project-name",
    "description": "Detailed project description",
    "workflow": "Development workflow type",
    "architecture": "Detected architecture pattern",
    "baseDir": "Project root path",
    "folderStructure": "Directory organization pattern",
    "testing": "Testing framework and approach",
    "projectPatterns": "Detected code patterns and practices",
    "dependencies": {
      "runtime": ["List of key runtime dependencies"],
      "development": ["List of key dev dependencies"]
    }
  }\n\n`;

  prompt += `2. Additional Analysis:\n`;
  prompt += `- Project-specific rules and best practices\n`;
  prompt += `- System prompts and memory bank entries\n`;
  prompt += `- Architecture and workflow summary\n`;
  prompt += `- Unique patterns and conventions\n`;
  prompt += `- Any detected anti-patterns or areas for improvement\n\n`;

  prompt += `Project Files:\n`;
  prompt += fileList.slice(0, 200).join("\n");
  prompt += `\n\nFile Contents (truncated to 2000 chars each):\n`;

  // Add key file contents with clear section markers
  for (const [fname, content] of Object.entries(fileContents)) {
    prompt += `\n=== BEGIN ${fname} ===\n`;
    prompt += content;
    prompt += `\n=== END ${fname} ===\n`;
  }

  prompt += `\nBased on the above analysis, provide a comprehensive project configuration and analysis summary in the specified format.`;
  return prompt;
}

/**
 * Dynamically select and instantiate the correct LangChain LLM based on config.
 * @param {string} provider
 * @param {string} apiKey
 * @param {string} model
 * @returns {object} LangChain LLM instance
 */
function getLLMInstance(provider, apiKey, model) {
  if (provider === "openai") {
    return new ChatOpenAI({
      model: model || "gpt-3.5-turbo",
      temperature: 0.2,
      openAIApiKey: apiKey,
    });
  } else if (provider === "google-genai" && ChatGoogleGenerativeAI) {
    return new ChatGoogleGenerativeAI({
      model: model || "gemini-pro",
      apiKey,
    });
  } else if (provider === "anthropic" && ChatAnthropic) {
    return new ChatAnthropic({
      model: model || "claude-3-opus-20240229",
      apiKey,
    });
  } else {
    throw new Error(`Unsupported or missing LLM provider: ${provider}`);
  }
}

/**
 * Call the LLM using LangChain with the given prompt.
 * @param {string} prompt
 * @returns {Promise<string>} LLM response
 */
async function callLangChainLLM(prompt) {
  const { provider, apiKey, model } = loadLLMConfig();
  let llm;
  try {
    llm = getLLMInstance(provider, apiKey, model);
  } catch (e) {
    console.error(`[LLM Error] Failed to initialize LLM provider (${provider}):`, e.message);
    throw new Error(`Failed to initialize LLM provider: ${e.message}`);
  }
  try {
    console.log(`[LLM] Sending prompt to ${provider} (${model})...`);
    const response = await Promise.race([
      llm.invoke(prompt),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("LLM call timed out after 90s")), 90000)
      ),
    ]);
    if (response && response.content) {
      return response.content;
    }
    return response;
  } catch (e) {
    // Enhanced error logging for quota/rate limit and other API errors
    if (e.message && e.message.includes("429") && provider === "google-genai") {
      console.error(
        "[LLM Error] Google Gemini API quota exceeded or rate limited. See: https://ai.google.dev/gemini-api/docs/rate-limits"
      );
    }
    console.error(`[LLM Error] LLM call failed:`, e.message || e);
    throw new Error(`LLM call failed: ${e.message || e}`);
  }
}

/**
 * Parse the LLM response to extract suggested projectConfig fields.
 * Expects the LLM to return a JSON block or clear key-value pairs for config.
 * @param {string} llmResponse
 * @returns {object} Parsed config or empty object
 */
function parseLLMConfig(llmResponse) {
  // Try to extract a JSON block from the response
  const jsonMatch = llmResponse.match(/```json([\s\S]*?)```/i) || llmResponse.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch {
      /* empty */
    }
  }
  // Fallback: look for key: value pairs
  const config = {};
  const lines = llmResponse.split("\n");
  lines.forEach((line) => {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      config[match[1]] = match[2];
    }
  });
  return config;
}

/**
 * Analyze the project directory and generate a summary using LangChain tools.
 * @param {string} projectDir - The root directory of the user's project.
 * @param {object} context - Extra context (isNxWorkspace, fileTree, etc.)
 * @returns {Promise<object>} Suggested projectConfig values and summary.
 */
async function analyzeProjectWithLLM(projectDir, context = {}) {
  const allFiles = listFilesRecursive(projectDir);
  const fileCount = allFiles.filter((f) => !f.endsWith("/")).length;
  console.log(`[LLM] Sending ${fileCount} files to the LLM (after exclusions).`);
  const fileContents = readAllFilesTruncated(projectDir, allFiles);
  const llmPrompt = buildLLMPrompt(allFiles, fileContents, context);
  let llmResponse = "";
  let suggestedConfig = {};
  const spinner = ora("Analyzing project with LLM...").start();
  const allowedFields = getAllowedConfigFields();
  try {
    llmResponse = await callLangChainLLM(llmPrompt);
    suggestedConfig = postProcessConfig(parseLLMConfig(llmResponse), allowedFields);
    if (!llmResponse || llmResponse.length < 10) {
      spinner.warn(
        "[LLM Warning] LLM response was empty or too short. Falling back to interactive setup."
      );
    } else {
      spinner.succeed("LLM analysis complete.");
    }
  } catch (e) {
    spinner.fail("LLM analysis failed: " + e.message);
    llmResponse = `LLM call failed: ${e.message}`;
    console.error("[LLM Error]", e.message);
    if (e.message && e.message.includes("timed out")) {
      console.error(
        "[LLM Error] The LLM call timed out. Try a smaller project or check your network/API limits."
      );
    }
  }
  return {
    summary: {
      name: fileContents["package.json"]
        ? JSON.parse(fileContents["package.json"]).name
        : path.basename(projectDir),
      description: fileContents["package.json"]
        ? JSON.parse(fileContents["package.json"]).description
        : "",
      dependencies: fileContents["package.json"]
        ? JSON.parse(fileContents["package.json"]).dependencies
        : {},
      devDependencies: fileContents["package.json"]
        ? JSON.parse(fileContents["package.json"]).devDependencies
        : {},
      readme: fileContents["README.md"] || "",
    },
    fileList: allFiles,
    fileContents,
    llmPrompt,
    llmResponse,
    suggestedConfig,
  };
}

class LLMAgent {
  constructor(llmProvider) {
    this.llmProvider = llmProvider;
  }

  static buildSystemPrompt() {
    return `You are a technical architect analyzing a software project. Focus on:
          1. Project architecture and design patterns
          2. Development workflow and tools
          3. Testing and quality assurance practices
          4. Integration points and dependencies
          5. Memory bank entries for:
            - Key architectural decisions
            - Development practices
            - Common patterns and solutions
            - Areas requiring special attention

          Provide detailed analysis in JSON format with additional context as markdown.`;
  }

  buildUserPrompt(projectFiles) {
    return `Analyze this project's structure and provide:
1. A configuration summary in JSON format containing:
   - name: Project name
   - description: Brief project description
   - workflow: Development workflow type
   - architecture: System architecture pattern
   - testing: Testing approach
   - projectPatterns: Key design patterns used
   - dependencies: Key runtime and development dependencies
   - memoryBankEntries: Array of important knowledge items for the memory bank

2. Additional analysis of:
   - Code organization and patterns
   - Development tools and practices
   - Integration points
   - Areas for improvement
   - Key architectural decisions to document

Project files to analyze: ${Object.keys(projectFiles).join(", ")}`;
  }

  async analyzeProject(projectFiles, baseDir) {
    try {
      const systemPrompt = LLMAgent.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(projectFiles);

      const response = await this.llmProvider.getCompletion(systemPrompt, userPrompt);
      let config = this.parseAnalysisResponse(response);

      // Ensure baseDir is preserved from the actual project path
      config.baseDir = baseDir;

      // Set default values for required fields
      const requiredFields = new Set([
        "Task Name",
        "April 15, 2025",
        "Your Name",
        "1-2 sentence overview",
        // ...other required fields...
      ]);

      requiredFields.forEach((field) => {
        if (!config[field]) {
          console.log(`Setting default value for required field: ${field}`);
          config[field] = "";
        }
      });

      return config;
    } catch (error) {
      console.error("Error analyzing project:", error);
      throw error;
    }
  }

  getDefaultValueForField(field) {
    // Provide sensible defaults for common fields
    const defaults = {
      name: path.basename(process.cwd()),
      description: "A software project",
      workflow: "trunk-based",
      architecture: "standard",
      folderStructure: "standard",
      testing: "unit tests",
      // Tech stack defaults
      frontend: "",
      backend: "",
      database: "",
      // Architecture defaults
      domains: "",
      tiers: "",
      libraries: "",
      // Development defaults
      projectPatterns: "standard coding patterns",
      ciPipeline: "GitHub Actions",
      commitConventions: "Conventional Commits",
      commentStyle: "// for single-line, /* */ for multi-line",
      commitTool: "git commit",
      mcpServers: "- No MCP servers configured",
    };

    return defaults[field] || "";
  }

  async buildProjectContext(projectFiles, baseDir) {
    let context = "";

    // Add package.json analysis
    if (projectFiles["package.json"]) {
      const pkg = JSON.parse(projectFiles["package.json"]);
      context += `\nPackage.json analysis:\n`;
      context += `Name: ${pkg.name || "N/A"}\n`;
      context += `Description: ${pkg.description || "N/A"}\n`;
      context += `Dependencies: ${Object.keys(pkg.dependencies || {}).join(", ")}\n`;
      context += `Dev Dependencies: ${Object.keys(pkg.devDependencies || {}).join(", ")}\n`;
      context += `Scripts: ${Object.keys(pkg.scripts || {}).join(", ")}\n`;

      // Look for specific development tools
      const devDeps = { ...pkg.devDependencies, ...pkg.dependencies };
      if (devDeps.husky || devDeps["@commitlint/cli"]) {
        context += `Commit tools: husky, commitlint\n`;
      }
      if (devDeps.jest || devDeps.mocha || devDeps.vitest) {
        context += `Testing framework detected\n`;
      }
      if (devDeps.prettier || devDeps.eslint) {
        context += `Code style tools: ${Object.keys(devDeps)
          .filter((d) => ["prettier", "eslint"].includes(d))
          .join(", ")}\n`;
      }
    }

    // Add README.md content
    if (projectFiles["README.md"]) {
      context += `\nREADME.md content:\n${projectFiles["README.md"]}\n`;
    }

    // Add tsconfig.json analysis
    if (projectFiles["tsconfig.json"]) {
      context += `\nTypeScript configuration detected.\n`;
      try {
        const tsConfig = JSON.parse(projectFiles["tsconfig.json"]);
        if (tsConfig.compilerOptions?.paths) {
          context += `Module aliasing detected in tsconfig.json\n`;
        }
      } catch (e) {
        // Invalid JSON, skip detailed analysis
      }
    }

    // Add nx.json analysis
    if (projectFiles["nx.json"]) {
      context += `\nNx monorepo structure detected.\n`;
      try {
        const nxConfig = JSON.parse(projectFiles["nx.json"]);
        if (nxConfig.projects) {
          context += `Nx projects: ${Object.keys(nxConfig.projects).join(", ")}\n`;
        }
      } catch (e) {
        // Invalid JSON, skip detailed analysis
      }
    }

    // Directory structure analysis
    try {
      const dirStructure = await this.analyzeDirectoryStructure(baseDir);
      context += `\nDirectory structure:\n${dirStructure}`;
    } catch (error) {
      console.warn("Could not analyze directory structure:", error.message);
    }

    return context;
  }

  async analyzeDirectoryStructure(baseDir) {
    const fs = require("fs").promises;
    const path = require("path");

    async function getDirectoryStructure(dir, depth = 0, maxDepth = 3) {
      if (depth >= maxDepth) return "";

      let structure = "";
      const items = await fs.readdir(dir, { withFileTypes: true });

      for (const item of items) {
        if (item.name.startsWith(".") || item.name === "node_modules") continue;

        const indent = "  ".repeat(depth);
        structure += `${indent}${item.name}\n`;

        if (item.isDirectory()) {
          structure += await getDirectoryStructure(path.join(dir, item.name), depth + 1, maxDepth);
        }
      }

      return structure;
    }

    return await getDirectoryStructure(baseDir);
  }

  parseAnalysisResponse(response) {
    try {
      // If response is already an object, return it
      if (typeof response !== "string") {
        return response;
      }

      // Try to extract JSON from markdown code blocks first
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1].trim());
        // Convert to proper format if it's wrapped in additional objects
        if (parsed.llmRecommendations || parsed.suggestedRules) {
          return {
            name: parsed.name || "",
            description: parsed.description || "",
            workflow: parsed.workflow || "trunk-based",
            architecture: parsed.architecture || "",
            // Preserve other fields but ensure proper defaults
            ...parsed,
            baseDir: process.cwd(), // Will be overwritten with actual project path
          };
        }
        return parsed;
      }

      // Try parsing the whole response as JSON
      return JSON.parse(response);
    } catch (error) {
      console.error("Error parsing LLM response:", error);
      throw error;
    }
  }
}

module.exports = { analyzeProjectWithLLM, LLMAgent };
