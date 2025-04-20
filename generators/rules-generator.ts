import * as fs from "fs";
import * as path from "path";
import type { ProjectConfig } from "../types/shared";

// Main generator function
export function generateRuleFiles(projectConfig: ProjectConfig): void {
  // Updated signature
  const modes = [
    { slug: "boomerang", template: "boomerang-rules.md" },
    { slug: "architect", template: "architect-rules.md" },
    { slug: "code", template: "code-rules.md" },
    { slug: "code-review", template: "code-review-rules.md" },
  ];

  modes.forEach(({ slug, template }) => {
    // Simply copy the template file to the destination
    try {
      const templatePath = path.join(__dirname, "..", "templates", "rules", template);
      const outDir = path.join(projectConfig.baseDir, `.roo`, `rules-${slug}`);
      const outPath = path.join(outDir, "rules.md");
      fs.mkdirSync(outDir, { recursive: true });
      fs.copyFileSync(templatePath, outPath);
    } catch (e: any) {
      console.warn(e.message);
      return;
    }
  });
}
