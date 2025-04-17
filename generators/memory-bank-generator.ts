import chalk from "chalk";
import { LLMProvider } from "./llm-provider";
import { MessageContent } from "@langchain/core/messages";
import * as fs from "fs";
import * as path from "path";

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
  const memoryBankDir = path.join(baseDir, "templates", "memory-bank");
  const templateDir = path.join(memoryBankDir, "templates");
  const missing: any[] = [];
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
  // Remove triple backtick code block with optional 'markdown' language
  return content
    .toString()
    .replace(/^```markdown\s*([\s\S]*?)\s*```$/im, "$1")
    .replace(/^```\s*([\s\S]*?)\s*```$/im, "$1");
}

export async function generateMemoryBank(
  projectConfig: Record<string, string>,
  writeFile: Function
) {
  const baseDir = path.join(__dirname, "..");
  const missingFiles = validateMemoryBankFiles(baseDir);
  if (missingFiles.length > 0) {
    console.error(chalk.red("Error: Missing required memory bank files:"));
    missingFiles.forEach((msg) => console.error(chalk.red(`- ${msg}`)));
    throw new Error("Cannot generate memory bank: missing required template files");
  }

  const coreFiles = [
    { name: "ProjectOverview.md" },
    { name: "DeveloperGuide.md" },
    { name: "DevelopmentStatus.md" },
    { name: "TechnicalArchitecture.md" },
  ];
  const optionalFiles = [{ name: "token-optimization-guide.md", condition: true }];

  const llm = new LLMProvider();
  const templateDir = path.join(baseDir, "templates", "memory-bank");

  // Helper to generate content using LLM
  async function generateWithLLM(templateContent: string, fileName: string) {
    const systemPrompt = `You are an expert technical writer. Given a project configuration and a template, generate a complete, high-quality Markdown file for ${fileName}.`;
    const userPrompt = `Project configuration (JSON):\n${JSON.stringify(projectConfig, null, 2)}\n\nTemplate:\n${templateContent}`;
    return await llm.getCompletion(systemPrompt, userPrompt);
  }

  const coreMemoryFiles = {
    ProjectOverview: "",
    DeveloperGuide: "",
    DevelopmentStatus: "",
    TechnicalArchitecture: "",
  };

  // Process core files
  for (const { name } of coreFiles) {
    const templatePath = path.join(templateDir, name);
    if (!fs.existsSync(templatePath)) {
      console.warn(chalk.yellow(`Template not found: ${templatePath}`));
      continue;
    }
    const raw = fs.readFileSync(templatePath, "utf8");
    const outDir = path.join(projectConfig.baseDir, "memory-bank");
    const outPath = path.join(outDir, name);
    fs.mkdirSync(outDir, { recursive: true });
    try {
      let generated = await generateWithLLM(raw, name);
      generated = stripMarkdownCodeBlock(generated);
      writeFile(outPath, generated);
      console.log(chalk.green(`Generated memory bank file: ${name}`));

      coreMemoryFiles[name.replace("", "") as keyof typeof coreMemoryFiles] = generated;
    } catch (err: any) {
      console.error(chalk.red(`LLM generation failed for ${name}: ${err.message}`));
    }
  }

  // Process optional files
  for (const { name, condition } of optionalFiles) {
    if (condition) {
      const templatePath = path.join(templateDir, name);
      if (!fs.existsSync(templatePath)) {
        console.warn(chalk.yellow(`Template not found: ${templatePath}`));
        continue;
      }
      const raw = fs.readFileSync(templatePath, "utf8");
      const outDir = path.join(projectConfig.baseDir, "memory-bank");
      const outPath = path.join(outDir, name);
      fs.mkdirSync(outDir, { recursive: true });
      try {
        let generated = await generateWithLLM(raw, name);
        generated = stripMarkdownCodeBlock(generated);
        writeFile(outPath, generated);
        console.log(chalk.green(`Generated memory bank file: ${name}`));
      } catch (err: any) {
        console.error(chalk.red(`LLM generation failed for ${name}: ${err.message}`));
      }
    }
  }

  // Process templates folder (copy, but do not LLM-generate)
  const templatesDir = path.join(templateDir, "templates");
  if (fs.existsSync(templatesDir)) {
    const outTemplatesDir = path.join(projectConfig.baseDir, "memory-bank", "templates");
    fs.mkdirSync(outTemplatesDir, { recursive: true });
    REQUIRED_TEMPLATE_FILES.forEach((template) => {
      const src = path.join(templatesDir, template);
      const dest = path.join(outTemplatesDir, template);
      if (fs.existsSync(src)) {
        const content = fs.readFileSync(src, "utf8");
        fs.writeFileSync(dest, content, "utf8");
        console.log(chalk.cyan(`Copied template: ${template}`));
      } else {
        console.warn(chalk.yellow(`Template not found: ${template}`));
      }
    });
  }

  return coreMemoryFiles;
}
