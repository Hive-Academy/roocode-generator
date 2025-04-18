import { extractBindings, validateConfigBindings } from "./template-utils";
import { LLMProvider } from "./llm-provider";
import * as fs from "fs";
import * as path from "path";

export function generateSystemPrompts(projectConfig: Record<string, string>) {
  const modes = [
    { slug: "boomerang", template: "system-prompt-boomerang.md" },
    { slug: "architect", template: "system-prompt-architect.md" },
    { slug: "code", template: "system-prompt-code.md" },
    { slug: "code-review", template: "system-prompt-code-review.md" },
  ];

  modes.forEach(async ({ slug, template }) => {
    try {
      const templatePath = path.join(__dirname, "..", "templates", "system-prompts", template);
      const outDir = path.join(projectConfig.baseDir, ".roo");
      const outPath = path.join(outDir, `system-prompt-${slug}`);
      fs.copyFileSync(templatePath, outPath);
    } catch (e: any) {
      console.warn(e.message);
      return;
    }
  });
}
