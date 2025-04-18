import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import * as fs from "fs";
import { readFileSync } from "node:fs";
import ora from "ora";
import * as path from "path";
import { getAllowedConfigFields, postProcessConfig } from "./config-fields";
import { LLMProvider, loadLLMConfig } from "./llm-provider"; // Assuming loadLLMConfig returns LLMConfig
import type { LLMConfig, AnalysisResult, ProjectConfig } from "../types/shared"; // Import shared types

// LLMConfig type moved to ../types/shared.ts
// Define types for our configuration
interface ParsedConfig extends Record<string, unknown> {
  baseDir: string; // Added required baseDir
  additionalAnalysis?: string;
  name?: string;
  description?: string;
  dependencies?: {
    runtime?: string[];
    development?: string[];
  };
}

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

function shouldExclude(relPath: string): boolean {
  return EXCLUDE_PATTERNS.some((pat) => pat.test(relPath.replace(/\\/g, "/")));
}

function listFilesRecursive(dir: string, base = dir): string[] {
  const results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach((file: string) => {
    const filePath = path.join(dir, file);
    const relPath = path.relative(base, filePath).replace(/\\/g, "/");
    const stat = fs.statSync(filePath);
    if (shouldExclude(relPath)) return;
    if (stat && stat.isDirectory()) {
      results.push(relPath + "/");
      results.push(...listFilesRecursive(filePath, base));
    } else {
      results.push(relPath);
    }
  });
  return results;
}

function readAllFilesTruncated(
  projectDir: string,
  fileList: string[],
  maxBytes = 2000
): Record<string, string> {
  const fileContents: Record<string, string> = {};
  fileList.forEach((relPath) => {
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

function buildLLMPrompt(
  fileList: string[],
  fileContents: Record<string, string>,
  _context: Record<string, unknown> = {}
): string {
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

  for (const [fname, content] of Object.entries(fileContents)) {
    prompt += `\n=== BEGIN ${fname} ===\n`;
    prompt += content;
    prompt += `\n=== END ${fname} ===\n`;
  }

  prompt += `\nBased on the above analysis, provide the project configuration as a single valid JSON object and nothing else.`;
  return prompt;
}

interface LLMResponse {
  content: string;
}

function getLLMInstance(
  provider: string,
  apiKey: string,
  model: string
): ChatAnthropic | ChatGoogleGenerativeAI | ChatOpenAI {
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
  }
  throw new Error(`Unsupported or missing LLM provider: ${provider}`);
}

async function callLangChainLLM(prompt: string): Promise<string> {
  // Use the defined type for the loaded config
  // Add type assertion as loadLLMConfig likely returns any implicitly
  const config = loadLLMConfig() as LLMConfig;
  // No need for type assertions now
  const provider = config.provider;
  const apiKey = config.apiKey;
  const model = config.model;

  let llm: ChatAnthropic | ChatGoogleGenerativeAI | ChatOpenAI;

  try {
    llm = getLLMInstance(provider, apiKey, model);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`Failed to initialize LLM provider: ${message}`);
  }

  try {
    console.log(`[LLM] Sending prompt to ${provider} (${model})...`);
    const response = (await Promise.race([
      llm.invoke(prompt),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("LLM call timed out after 90s")), 90000)
      ),
    ])) as LLMResponse;

    if (response?.content) {
      return response.content;
    }
    return JSON.stringify(response);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(`LLM call failed: ${message}`);
  }
}

function parseLLMConfig(llmResponse: string): ParsedConfig {
  // 1. Prefer extracting JSON from a ```json ... ``` code block
  const codeBlockMatch = llmResponse.match(/```json[\r\n]+([\s\S]*?)```/i);
  if (codeBlockMatch?.[1]) {
    try {
      const parsedConfig = JSON.parse(codeBlockMatch[1]) as ParsedConfig;
      const afterBlock = codeBlockMatch[0] ? llmResponse.split(codeBlockMatch[0])[1]?.trim() : "";
      return {
        ...parsedConfig,
        additionalAnalysis: afterBlock || "",
      };
    } catch (e) {
      console.warn("Failed to parse JSON code block:", e);
    }
  }

  // 2. Robust fallback: try to find the first valid JSON object in the text
  const jsonRegex = /\{[\s\S]*?\}/g;
  let match: RegExpExecArray | null;
  while ((match = jsonRegex.exec(llmResponse)) !== null) {
    const potentialJson = match[0];
    if (potentialJson.length === 2000) continue;
    try {
      const parsed = JSON.parse(potentialJson) as ParsedConfig;
      if (typeof parsed.name === "string" || typeof parsed.description === "string") {
        const afterBlock = llmResponse.split(potentialJson)[1]?.trim();
        return {
          ...parsed,
          additionalAnalysis: afterBlock || "",
        };
      }
    } catch {
      // skip invalid JSON
    }
  }

  // 3. Fallback: look for key: value pairs
  // Provide a default baseDir, although it might be inaccurate in this fallback case
  const config: ParsedConfig = { baseDir: process.cwd() };
  const lines = llmResponse.split("\n");
  lines.forEach((line: string) => {
    const keyValueMatch = line.match(/^([\w.-]+):\s*(.*)$/);
    if (keyValueMatch?.[1] && keyValueMatch[2] !== undefined) {
      config[keyValueMatch[1]] = keyValueMatch[2].trim();
    }
  });
  return config;
}

// Update return type to use shared AnalysisResult
export async function analyzeProjectWithLLM(
  projectDir: string,
  _context: Record<string, unknown> = {}
): Promise<AnalysisResult> {
  const allFiles = listFilesRecursive(projectDir);
  const fileCount = allFiles.filter((f) => !f.endsWith("/")).length;

  console.log(`[LLM] Sending ${fileCount} files to the LLM (after exclusions).`);
  const fileContents = readAllFilesTruncated(projectDir, allFiles);
  const llmPrompt = buildLLMPrompt(allFiles, fileContents, _context);

  let llmResponse = "";
  // Initialize with baseDir from projectDir argument
  let suggestedConfig: ParsedConfig = { baseDir: projectDir };

  const spinner = ora("Analyzing project with LLM...").start();
  const allowedFields = getAllowedConfigFields();

  try {
    llmResponse = await callLangChainLLM(llmPrompt);
    suggestedConfig = postProcessConfig(parseLLMConfig(llmResponse), allowedFields) as ParsedConfig;

    if (!llmResponse || llmResponse.length < 10) {
      spinner.warn(
        "[LLM Warning] LLM response was empty or too short. Falling back to interactive setup."
      );
    } else {
      spinner.succeed("LLM analysis complete.");
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    spinner.fail("LLM analysis failed: " + message);
    llmResponse = `LLM call failed: ${message}`;
    console.error("[LLM Error]", message);

    if (message.includes("timed out")) {
      console.error(
        "[LLM Error] The LLM call timed out. Try a smaller project or check your network/API limits."
      );
    }
  }

  // Construct the return object matching the AnalysisResult interface
  // The result of postProcessConfig should align with ProjectConfig fields
  // Add type assertion for clarity during migration phase
  const finalSuggestedConfig = suggestedConfig as ProjectConfig;

  return {
    summary: {
      name: String(finalSuggestedConfig.name || ""),
      description: String(finalSuggestedConfig.description || ""),
      // Ensure dependencies are arrays, even if undefined in ParsedConfig/ProjectConfig
      dependencies: finalSuggestedConfig.dependencies?.runtime ?? [],
      devDependencies: finalSuggestedConfig.dependencies?.development ?? [],
    },
    fileList: allFiles,
    llmPrompt,
    llmResponse,
    // Ensure the returned suggestedConfig matches the ProjectConfig type expected by AnalysisResult
    suggestedConfig: finalSuggestedConfig,
  };
}

export class LLMAgent {
  llmProvider: LLMProvider;

  constructor(llmProvider: LLMProvider) {
    this.llmProvider = llmProvider;
  }

  static buildSystemPrompt(): string {
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

  buildUserPrompt(projectFiles: Record<string, string>): string {
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
