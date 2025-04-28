import { RulesPromptBuilder } from '@/generators/rules/rules-prompt-builder';
// Removed unused Result import

describe('RulesPromptBuilder', () => {
  let builder: RulesPromptBuilder;

  beforeEach(() => {
    builder = new RulesPromptBuilder();
  });

  describe('buildSystemPrompt', () => {
    it('should return an error if mode is missing', () => {
      const result = builder.buildSystemPrompt('');
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toBe('Mode is required for system prompt building.');
    });

    it('should return a system prompt containing core instructions', () => {
      const result = builder.buildSystemPrompt('code');
      expect(result.isOk()).toBe(true);
      const prompt = result.value as string;

      // Check for key phrases and structural elements
      expect(prompt).toContain('You are an expert software architect and technical writer.');
      expect(prompt).toContain('**Core Task:** Analyze the project context');
      expect(prompt).toContain('**Output Requirements:**');
      expect(prompt).toContain('*   **Format:** Valid Markdown (.md).');
      expect(prompt).toContain('*   **Structure:**');
      expect(prompt).toContain('Level 1 Heading (`#`)');
      expect(prompt).toContain('Level 2 Headings (`##`)');
      expect(prompt).toContain('bullet points (`-`)');
      expect(prompt).toContain('*   **Content:**');
      expect(prompt).toContain('Rules MUST be relevant to the specific project context');
      expect(prompt).toContain('*   **Style:**');
      expect(prompt).toContain('professional and authoritative tone');
      expect(prompt).toContain('*   **Inspiration (Format/Tone ONLY):**');
      expect(prompt).toContain('DO NOT copy its content directly');
      expect(prompt).toContain('*   **Strict Adherence:**');
      expect(prompt).toContain('Generate the rules document based *only* on the user prompt');
    });
  });

  describe('buildPrompt', () => {
    const mockContext = JSON.stringify({ techStack: { languages: ['typescript'] } }, null, 2);
    const mockInstructions = 'Focus on TypeScript best practices.';

    it('should return an error if context is missing', () => {
      const result = builder.buildPrompt(mockInstructions, '', '');
      expect(result.isErr()).toBe(true);
      expect(result.error?.message).toBe('Project context is required to build the rules prompt.');
    });

    it('should include the project context within a JSON block', () => {
      const result = builder.buildPrompt(mockInstructions, mockContext, '');
      expect(result.isOk()).toBe(true);
      const prompt = result.value as string;
      expect(prompt).toContain('**Project Context:**');
      expect(prompt).toContain('```json\n' + mockContext + '\n```');
    });

    it('should include additional instructions if provided', () => {
      const result = builder.buildPrompt(mockInstructions, mockContext, '');
      expect(result.isOk()).toBe(true);
      const prompt = result.value as string;
      expect(prompt).toContain('**Additional Instructions:**');
      expect(prompt).toContain(mockInstructions);
    });

    it('should not include additional instructions section if not provided', () => {
      const result = builder.buildPrompt('', mockContext, ''); // Empty instructions
      expect(result.isOk()).toBe(true);
      const prompt = result.value as string;
      expect(prompt).not.toContain('**Additional Instructions:**');
    });

    it('should include the final generation instruction', () => {
      const result = builder.buildPrompt(mockInstructions, mockContext, '');
      expect(result.isOk()).toBe(true);
      const prompt = result.value as string;
      expect(prompt).toContain(
        'Generate the complete Markdown rules document now, following the structural and stylistic guidelines provided in the system prompt.'
      );
    });

    // Note: The template parameter is intentionally ignored in the current implementation,
    // so no specific test for it is needed unless the logic changes.
  });
});
