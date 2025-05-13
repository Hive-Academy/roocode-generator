import { LLMProviderError } from '../llm/llm-provider-errors';

/**
 * Error thrown when a requested model is not found in the provider's available models
 */
export class ModelNotFoundError extends LLMProviderError {
  constructor(message: string, provider: string = 'unknown') {
    super(message, 'MODEL_NOT_FOUND', provider);
    this.name = 'ModelNotFoundError';
  }
}
