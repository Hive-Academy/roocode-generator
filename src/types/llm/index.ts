/**
 * @fileoverview LLM configuration and interaction types
 * @module types/llm
 */

/**
 * Configuration for LLM (Language Learning Model) interactions
 */
export interface LLMConfig {
  /** Model identifier */
  model: string;
  /** LLM provider (e.g., "anthropic", "openai", "google-genai") */
  provider: string;
  /** API key for authentication */
  apiKey: string;
  /** Maximum tokens for response */
  maxTokens: number;
  /** Temperature for response generation */
  temperature: number;
  /** Optional model-specific parameters */
  modelParams?: Record<string, unknown>;
  /** Optional API URL override */
  apiUrl?: string;
  /** Optional Google Cloud location for Google GenAI */
  location?: string;
  /** Optional Google Cloud project ID for Google GenAI */
  projectId?: string;
}

/**
 * Common handler function type for async operations
 */
export type Handler<T, R> = (input: T) => Promise<Result<R>>;

/**
 * Generic result type for operations that may fail
 */
export interface Result<T> {
  /** Whether the operation was successful */
  success: boolean;
  /** Result data (present if success is true) */
  data?: T;
  /** Error message (present if success is false) */
  error?: string;
}
