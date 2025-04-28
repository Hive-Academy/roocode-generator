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
  buildPrompt(instructions: string, context: string, _template: string): Result<string, Error> {
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
Generate the complete Markdown rules document now, following the structural and stylistic guidelines provided in the system prompt.
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

*   **Format:** Valid Markdown (.md).
*   **Structure:**
    *   **Title:** Start with a Level 1 Heading (\`#\`) providing a suitable title (e.g., "# [Project Language/Framework] Code Standards").
    *   **Introduction:** Include a brief (1-2 sentence) introduction stating the purpose of the rules (e.g., "These standards ensure consistency and maintainability...").
    *   **Sections:** Use Level 2 Headings (\`##\`) to categorize rules. Infer relevant categories from the project context, such as:
        *   Code Style & Patterns
        *   Project Architecture
        *   Naming Conventions
        *   Code Organization
        *   Testing (if applicable)
        *   Dependencies (if applicable)
        *   Security (if applicable)
    *   **Rules:** List individual rules under each section using bullet points (\`-\`). Rules should be derived from the project context (languages, frameworks, patterns identified).
    *   **Conclusion:** End with a brief concluding sentence (e.g., "Adherence to these guidelines is expected...").
*   **Content:**
    *   Rules MUST be relevant to the specific project context provided.
    *   Rules should be clear, concise, and actionable.
    *   Include brief examples within rule descriptions only where necessary for clarity.
*   **Style:**
    *   Maintain a professional and authoritative tone.
    *   Present rules as requirements, not suggestions.
*   **Inspiration (Format/Tone ONLY):** You can draw inspiration for the *structure and tone* from typical coding standards documents (like the one at '.roo/rules-code/rules.md'), but DO NOT copy its content directly. Generate rules based *only* on the provided project context.
*   **Strict Adherence:** The final output MUST strictly follow the specified Markdown structure and generate contextually relevant rules. Avoid extra commentary.

Generate the rules document based *only* on the user prompt's project context, adhering strictly to these instructions.
`;
    return Result.ok(systemPrompt);
  }
}
