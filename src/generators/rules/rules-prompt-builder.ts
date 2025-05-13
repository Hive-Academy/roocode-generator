import { Injectable } from '../../core/di';
import { Result } from '../../core/result/result';
import { IRulesPromptBuilder } from './interfaces';
// Removed unused ProjectContext import for now

@Injectable()
export class RulesPromptBuilder implements IRulesPromptBuilder {
  /**
   * Builds the user prompt for generating coding standards and rules.
   * @param instructions - Optional additional high-level instructions.
   * @param context - Stringified project context analysis.
   * @param template - Template content (likely ignored).
   * @returns A Result containing the user prompt string or an error.
   */
  buildPrompt(instructions: string, context: string): Result<string, Error> {
    if (!context) {
      return Result.err(new Error('Project context is required to build the rules prompt.'));
    }

    // Focus the user prompt on the goal, relying on the system prompt for formatting details.
    const prompt = `
Analyze the following project context and generate a concise, relevant set of coding standards and architectural rules for this project.

**Project Context:**
\`\`\`json
${context}
\`\`\`

${instructions ? `\n**Additional Instructions:**\n${instructions}\n` : ''}

**IMPORTANT OUTPUT INSTRUCTIONS:**
1. Provide **ONLY** the list of rules.
2. Format the rules as a **Markdown unordered list** using hyphens (\`-\`).
3. Each rule should be a single list item.
4. Do **NOT** include any introductory sentences, concluding remarks, or any other text before or after the list.
5. Each rule must be relevant to the project context and provide clear, actionable guidance.
`;
    return Result.ok(prompt);
  }

  /**
   * Builds the system prompt for the LLM, instructing it on the desired output format and style.
   * @param mode - The generation mode (e.g., 'code'). Used for context.
   * @returns A Result containing the system prompt string or an error.
   */
  buildSystemPrompt(mode: string): Result<string, Error> {
    if (!mode) {
      return Result.err(new Error('Mode is required for system prompt building.'));
    }

    // Revised system prompt focusing on structure, style, and context-driven content generation.
    // Corrected: Removed the stray backslash before the backtick
    const systemPrompt = `
You are an expert software architect and technical writer. Your task is to generate a project-specific coding standards and architectural rules document in Markdown format based on the provided project context.

**Core Task:** Analyze the project context (provided in the user prompt) and generate relevant, actionable rules.

**Output Requirements:**

* **Format:** Markdown unordered list only.
* **Structure:**
  * Each rule must be a single list item starting with a hyphen (\`-\`).
  * NO title, introduction, sections, or conclusion.
  * NO categorization or grouping - just a flat list of rules.
* **Content:**
  * Rules MUST be relevant to the specific project context provided.
  * Rules should be clear, concise, and actionable.
  * Include brief examples within rule descriptions only where necessary for clarity.
* **Style:**
  * Maintain a professional and authoritative tone.
  * Present rules as requirements, not suggestions.
* **Strict Adherence:** 
  * The output MUST be ONLY the list of rules.
  * NO introductory text before the list.
  * NO concluding text after the list.
  * ONLY the markdown list of rules with no other content.

Generate the rules based *only* on the user prompt's project context, adhering strictly to these instructions.
`;
    return Result.ok(systemPrompt);
  }
}
