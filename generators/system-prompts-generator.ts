import * as fs from "fs";
import * as path from "path";
import type { ProjectConfig } from "../types/shared";

export function generateSystemPrompts(projectConfig: ProjectConfig): void {
  const modes = [
    { slug: "boomerang", template: "system-prompt-boomerang.md" },
    { slug: "architect", template: "system-prompt-architect.md" },
    { slug: "code", template: "system-prompt-code.md" },
    { slug: "code-review", template: "system-prompt-code-review.md" },
  ];

  modes.forEach(({ slug, template }) => {
    try {
      const templatePath = path.join(__dirname, "..", "templates", "system-prompts", template);
      const outDir = path.join(projectConfig.baseDir, ".roo");
      const outPath = path.join(outDir, `system-prompt-${slug}`);
      fs.mkdirSync(outDir, { recursive: true }); // Added mkdir to ensure directory exists
      fs.copyFileSync(templatePath, outPath);
    } catch (e: any) {
      console.warn(e.message);
      return;
    }
  });
}
