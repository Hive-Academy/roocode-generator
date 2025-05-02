/**
 * Response type for Google GenAI token counting API
 */
export interface GoogleGenAITokenResponse {
  /** Total number of tokens in the analyzed text */
  totalTokens: number;
  /** Additional metadata from the API response */
  metadata?: Record<string, unknown>;
}

/**
 * Error response from Google GenAI API
 */
export interface GoogleGenAIErrorResponse {
  error: {
    code: number;
    message: string;
    status: string;
  };
}
