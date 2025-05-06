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

/**
 * Response type for Google GenAI getModel API
 */
export interface GoogleModelInfoResponse {
  /** The maximum number of tokens that can be sent in a prompt */
  inputTokenLimit?: number;
  /** The maximum number of tokens that can be generated in a response */
  outputTokenLimit?: number;
  /** Other model properties */
  [key: string]: any;
}
