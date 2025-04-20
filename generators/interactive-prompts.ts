import * as fs from "fs";
import * as readline from "readline";
import { questions } from "./config-questions";

export function askQuestions(projectConfig: any, onComplete: any, index = 0) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  function ask(index: any) {
    if (index >= questions.length) {
      rl.question(
        "Export configuration to roocode.config.json for future use? (Y/n): ",
        (exportAnswer) => {
          if (exportAnswer.trim().toLowerCase() !== "n") {
            fs.writeFileSync("roocode.config.json", JSON.stringify(projectConfig, null, 2));
            console.log(`\nConfiguration saved to roocode.config.json`);
          }
          rl.close();
          onComplete();
        }
      );
      return;
    }
    const q = questions[index];
    const defaultValue = q.default ? ` (${q.default})` : "";
    rl.question(`${q.question}${defaultValue}: `, (answer) => {
      let value = answer.trim() || q.default;
      if (
        [
          "domains",
          "tiers",
          "libraries",
          "architecturePatterns",
          "technicalStandards",
          "infrastructure",
        ].includes(q.property)
      ) {
        value = value
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .join(", ");
      }
      projectConfig[q.property] = value;
      ask(index + 1);
    });
  }
  ask(index);
}
