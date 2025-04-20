import chalk from "chalk";
import { LLMProvider } from "./llm-provider";
import { MessageContent } from "@langchain/core/messages";
import * as fs from "fs";
import * as path from "path";
import type { ProjectConfig } from "../types/shared";
import { isValidProjectConfig, GeneratorError } from "./shared-utils";

interface GenerationError {
  file: string;
  error: Error;
}

// Required memory bank files that must be present
const REQUIRED_MEMORY_BANK_FILES = [
  "ProjectOverview.md",
  "TechnicalArchitecture.md",
  "DevelopmentStatus.md",
  "DeveloperGuide.md",
];

// Required template files that must be present
const REQUIRED_TEMPLATE_FILES = [
  "completion-report-template.md",
  "implementation-plan-template.md",
  "mode-acknowledgment-templates.md",
  "task-description-template.md",
];

// Validates that all required memory bank files and templates exist
export function validateMemoryBankFiles(baseDir: string) {
  const memoryBankDir = path.join(baseDir, "memory-bank");
  const templateDir = path.join(baseDir, "templates", "memory-bank", "templates");
  const missing: string[] = [];

  REQUIRED_MEMORY_BANK_FILES.forEach((file) => {
    const filePath = path.join(memoryBankDir, file);
    if (!fs.existsSync(filePath)) {
      missing.push(`Missing required memory bank file: ${file}`);
    }
  });

  REQUIRED_TEMPLATE_FILES.forEach((file) => {
    const filePath = path.join(templateDir, file);
    if (!fs.existsSync(filePath)) {
      missing.push(`Missing required template file: ${file}`);
    }
  });
  return missing;
}

// Helper to strip code block wrappers from markdown
function stripMarkdownCodeBlock(content: MessageContent) {
  return JSON.stringify(content)
    .replace(/^```markdown\s*([\s\S]*?)\s*```$/im, "$1")
    .replace(/^```\s*([\s\S]*?)\s*```$/im, "$1");
}

export async function generateMemoryBank(projectConfig: ProjectConfig): Promise<void> {
  // Track generation errors
  const errors: GenerationError[] = [];

  // Validate input configuration
  if (!isValidProjectConfig(projectConfig)) {
    throw new GeneratorError("Invalid project configuration", "memory-bank", "INVALID_CONFIG");
  }

  const baseDir = projectConfig.baseDir;
  const missingFiles = validateMemoryBankFiles(baseDir);
  if (missingFiles.length > 0) {
    console.error(chalk.red("Error: Missing required memory bank files:"));
    missingFiles.forEach((msg) => console.error(chalk.red(`- ${msg}`)));
    throw new GeneratorError(
      "Cannot generate memory bank: missing required template files",
      "memory-bank-generator",
      "MISSING_TEMPLATES"
    );
  }

  // Create memory bank directory
  try {
    const memoryBankDir = path.join(baseDir, "memory-bank");
    await fs.promises.mkdir(memoryBankDir, { recursive: true });
  } catch (error) {
    if (error instanceof Error) {
      throw new GeneratorError(
        `Failed to create memory bank directory: ${error.message}`,
        "memory-bank",
        "DIR_CREATION_FAILED"
      );
    }
    throw error;
  }

  const coreFiles = [
    { name: "ProjectOverview.md" },
    { name: "DeveloperGuide.md" },
    { name: "DevelopmentStatus.md" },
    { name: "TechnicalArchitecture.md" },
  ];

  const llm = new LLMProvider();
  const templateDir = path.join(baseDir, "templates", "memory-bank");

  // Helper to generate content using LLM
  async function generateWithLLM(templateContent: string, fileName: string) {
    const systemPrompt = `You are an expert technical writer. Given a project configuration and a template, generate a complete, high-quality Markdown file for ${fileName}.`;
    const userPrompt = `Project configuration (JSON): \n ${JSON.stringify(projectConfig, null, 2)} \n Template: \n ${templateContent}`;
    return await llm.getCompletion(systemPrompt, userPrompt);
  }

  // Process core files
  for (const { name } of coreFiles) {
    const templatePath = path.join(templateDir, name);
    if (!fs.existsSync(templatePath)) {
      console.warn(chalk.yellow(`Template not found: ${templatePath}`));
      continue;
    }

    try {
      const raw = fs.readFileSync(templatePath, "utf8");
      const outDir = path.join(projectConfig.baseDir, "memory-bank");
      const outPath = path.join(outDir, name);
      fs.mkdirSync(outDir, { recursive: true });

      let generated = await generateWithLLM(raw, name);
      generated = stripMarkdownCodeBlock(generated);

      fs.writeFileSync(outPath, generated, "utf8");
      console.log(chalk.green(`Generated memory bank file: ${name}`));
    } catch (error) {
      if (error instanceof Error) {
        errors.push({
          file: name,
          error: error,
        });
        console.error(chalk.red(`Error generating ${name}: ${error.message}`));
      }
    }
  }

  // Process templates folder (copy, but do not LLM-generate)
  const templatesDir = path.join(templateDir, "templates");
  if (fs.existsSync(templatesDir)) {
    try {
      const outTemplatesDir = path.join(projectConfig.baseDir, "memory-bank", "templates");
      fs.mkdirSync(outTemplatesDir, { recursive: true });

      REQUIRED_TEMPLATE_FILES.forEach((template) => {
        try {
          const src = path.join(templatesDir, template);
          const dest = path.join(outTemplatesDir, template);
          if (fs.existsSync(src)) {
            const content = fs.readFileSync(src, "utf8");
            fs.writeFileSync(dest, content, "utf8");
            console.log(chalk.cyan(`Copied template: ${template}`));
          } else {
            console.warn(chalk.yellow(`Template not found: ${template}`));
          }
        } catch (error) {
          if (error instanceof Error) {
            errors.push({
              file: template,
              error: error,
            });
            console.error(chalk.red(`Error copying template ${template}: ${error.message}`));
          }
        }
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new GeneratorError(
          `Failed to create templates directory: ${error.message}`,
          "memory-bank",
          "TEMPLATES_DIR_CREATION_FAILED"
        );
      }
      throw error;
    }
  }

  // If there were any errors during generation, throw a summary error
  if (errors.length > 0) {
    const errorSummary = errors.map((e) => `${e.file}: ${e.error.message}`).join("\n");
    throw new GeneratorError(
      `Memory bank generation completed with errors:\n${errorSummary}`,
      "memory-bank",
      "PARTIAL_GENERATION_FAILURE"
    );
  }
}
