export class LLMProviderError extends Error {
  constructor(
    public readonly message: string,
    public readonly code: string,
    public readonly provider: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'LLMProviderError';
  }

  static fromError(error: unknown, provider: string): LLMProviderError {
    if (error instanceof LLMProviderError) return error;
    if (error instanceof Error) {
      return new LLMProviderError(error.message, 'UNKNOWN_ERROR', provider, { cause: error });
    }
    return new LLMProviderError('An unknown error occurred', 'UNKNOWN_ERROR', provider);
  }
}
