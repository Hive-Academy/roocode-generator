import { Injectable } from "../../core/di";
import { Result } from "../../core/result/result";
import { IRulesPromptBuilder } from "./interfaces";

@Injectable()
export class RulesPromptBuilder implements IRulesPromptBuilder {
  buildPrompt(instructions: string, context: string, template: string): Result<string, Error> {
    // Stub implementation - actual logic will be in a later subtask
    console.log("RulesPromptBuilder.buildPrompt called with:", { instructions, context, template });
    if (!instructions || !context) {
      return Result.err(new Error("Missing instructions or context for prompt building (stub)"));
    }
    // Combine inputs into a basic prompt structure
    const prompt = `
Instructions: ${instructions}

Context: ${context}

Template: ${template || "No template provided."}

Generate rules based on the above.
`;
    return Result.ok(prompt);
  }

  buildSystemPrompt(mode: string): Result<string, Error> {
    // Stub implementation - actual logic will be in a later subtask
    console.log("RulesPromptBuilder.buildSystemPrompt called with mode:", mode);
    if (!mode) {
      return Result.err(new Error("Missing mode for system prompt building (stub)"));
    }
    const systemPrompt = `You are an expert assistant generating configuration rules for the '${mode}' mode of the RooCode Generator system. Follow the instructions precisely. Output MUST be valid Markdown.`;
    return Result.ok(systemPrompt);
  }
}
