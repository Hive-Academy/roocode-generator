import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import * as fs from "fs";
import { readFileSync } from "node:fs";
import ora from "ora";
import * as path from "path";
import { getAllowedConfigFields, postProcessConfig } from "./config-fields";
import { LLMProvider, loadLLMConfig } from "./llm-provider";

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

function shouldExclude(relPath: string) {
  return EXCLUDE_PATTERNS.some((pat) => pat.test(relPath.replace(/\\/g, "/")));
}

/**
 * List all files and folders recursively in the project directory.
 * @param {string} dir - Directory to scan.
 * @returns {string[]} Array of file and folder paths (relative to dir).
 */
function listFilesRecursive(dir: string, base = dir) {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach((file: string) => {
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
function readAllFilesTruncated(projectDir: string, fileList: string[], maxBytes = 2000) {
  const fileContents: Record<string, string> = {};
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
function buildLLMPrompt(fileList: string[], fileContents: Record<string, string>, context = {}) {
  const allowedFields = getAllowedConfigFields();
  let prompt = `You are analyzing a Node.js CLI tool for generating RooCode workflow files.\n`;

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
  prompt += `Respond ONLY with a single valid JSON object matching this schema. Do not include markdown, code fences, or any extra commentary. Your response must be valid JSON and nothing else.\n`;
  prompt += `1. Project Configuration (JSON):\n`;
  prompt += `{"name": "project-name", "description": "Detailed project description", "workflow": "Development workflow type", "architecture": "Detected architecture pattern", "baseDir": "Project root path", "folderStructure": "Directory organization pattern", "testing": "Testing framework and approach", "projectPatterns": "Detected code patterns and practices", "dependencies": {"runtime": ["List of key runtime dependencies"], "development": ["List of key dev dependencies"]}}\n`;

  prompt += `Project Files:\n`;
  prompt += fileList.slice(0, 200).join("\n");
  prompt += `\n\nFile Contents (truncated to 2000 chars each):\n`;

  // Add key file contents with clear section markers
  for (const [fname, content] of Object.entries(fileContents)) {
    prompt += `\n=== BEGIN ${fname} ===\n`;
    prompt += content;
    prompt += `\n=== END ${fname} ===\n`;
  }

  prompt += `\nBased on the above analysis, provide the project configuration as a single valid JSON object and nothing else.`;
  return prompt;
}

/**
 * Dynamically select and instantiate the correct LangChain LLM based on config.
 * @param {string} provider
 * @param {string} apiKey
 * @param {string} model
 * @returns {object} LangChain LLM instance
 */
function getLLMInstance(provider: string, apiKey: string, model: string) {
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
async function callLangChainLLM(prompt: string) {
  const { provider, apiKey, model } = loadLLMConfig();
  let llm;

  try {
    llm = getLLMInstance(provider, apiKey, model);
  } catch (e: any) {
    throw new Error(`Failed to initialize LLM provider: ${e.message}`);
  }

  try {
    console.log(`[LLM] Sending prompt to ${provider} (${model})...`);
    const response: any = await Promise.race([
      llm.invoke(prompt),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("LLM call timed out after 90s")), 90000)
      ),
    ]);

    if (response && response.content) {
      return response.content;
    }
    return response;
  } catch (e: any) {
    throw new Error(`LLM call failed: ${e.message || e}`);
  }
}

/**
 * Parse the LLM response to extract suggested projectConfig fields.
 * Expects the LLM to return a JSON block or clear key-value pairs for config.
 * @param {string} llmResponse
 * @returns {object} Parsed config or empty object
 */
function parseLLMConfig(llmResponse: any) {
  // 1. Prefer extracting JSON from a ```json ... ``` code block
  const codeBlockMatch = llmResponse.match(/```json[\r\n]+([\s\S]*?)```/i);
  if (codeBlockMatch) {
    let parsedConfig = {};
    try {
      parsedConfig = JSON.parse(codeBlockMatch[1]);
    } catch {
      parsedConfig = {};
    }
    // Extract any additional analysis after the JSON code block
    const afterBlock = llmResponse.split(codeBlockMatch[0])[1]?.trim();
    return {
      ...parsedConfig,
      additionalAnalysis: afterBlock || "",
    };
  }

  // 2. Robust fallback: try to find the first valid JSON object in the text
  // Use a regex to find all possible JSON objects and try to parse each
  const jsonObjects = [];
  const jsonRegex = /\{[\s\S]*?\}/g;
  let match;
  while ((match = jsonRegex.exec(llmResponse)) !== null) {
    // Skip any candidate that is exactly 2000 characters (likely truncated)
    if (match[0].length === 2000) continue;
    jsonObjects.push(match[0]);
  }
  for (const obj of jsonObjects) {
    try {
      const parsed = JSON.parse(obj);
      // If it has a name or description, it's likely the config
      if (parsed && (parsed.name || parsed.description)) {
        const afterBlock = llmResponse.split(obj)[1]?.trim();
        return {
          ...parsed,
          additionalAnalysis: afterBlock || "",
        };
      }
    } catch {
      // skip invalid
    }
  }

  // 3. Fallback: look for key: value pairs
  const config: Record<string, string> = {};
  const lines = llmResponse.split("\n");
  lines.forEach((line: string) => {
    const match = line.match(/^([\w.]+):\s*(.+)$/);
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
export async function analyzeProjectWithLLM(projectDir: string, context = {}) {
  const allFiles = listFilesRecursive(projectDir);
  const fileCount = allFiles.filter((f) => !f.endsWith("/")).length;

  console.log(`[LLM] Sending ${fileCount} files to the LLM (after exclusions).`);
  const fileContents = readAllFilesTruncated(projectDir, allFiles);

  const llmPrompt = buildLLMPrompt(allFiles, fileContents, context);

  let llmResponse = "";
  let suggestedConfig: Record<any, any> = {};

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
  } catch (e: any) {
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
      name: suggestedConfig["name"] || "",
      description: suggestedConfig["description"] || "",
      dependencies: suggestedConfig.dependencies?.runtime || "",
      devDependencies: suggestedConfig.dependencies?.development || "",
    },
    fileList: allFiles,
    llmPrompt,
    llmResponse,
    suggestedConfig,
  };
}

export class LLMAgent {
  llmProvider: LLMProvider;
  constructor(llmProvider: LLMProvider) {
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

  buildUserPrompt(projectFiles: Record<string, string>) {
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
}
