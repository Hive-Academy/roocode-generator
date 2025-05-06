export class OpenAIConfig {
  public readonly modelName: string;
  public readonly temperature: number;
  public readonly apiKey: string;

  constructor() {
    this.modelName = process.env.LLM_MODEL || 'gpt-4';
    this.temperature = 0.2;
    this.apiKey = process.env.OPENAI_API_KEY || '';
  }
}

export class GoogleGenAIConfig {
  public readonly modelName: string;
  public readonly temperature: number;
  public readonly apiKey: string;

  constructor() {
    this.modelName = process.env.LLM_MODEL || 'models/chat-bison-001';
    this.temperature = 0.2;
    this.apiKey = process.env.GOOGLE_API_KEY || '';
  }
}

export class AnthropicConfig {
  public readonly modelName: string;
  public readonly temperature: number;
  public readonly apiKey: string;

  constructor() {
    this.modelName = process.env.LLM_MODEL || 'claude-v1';
    this.temperature = 0.2;
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
  }
}
