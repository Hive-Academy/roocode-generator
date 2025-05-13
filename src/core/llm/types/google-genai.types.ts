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
 * Represents a single Generative Language Model from the Google GenAI API.
 * Based on documentation from https://ai.google.dev/api/models#Model
 */
export interface GoogleModel {
  /** Required. The resource name of the `Model`. Format: `models/{model}` */
  name: string;
  /** Required. The name of the base model, pass this to the generation request. E.g., `gemini-1.5-flash` */
  baseModelId?: string; // Marked optional as per some examples, though docs say "Required" for the field itself. API might omit.
  /** Required. The version number of the model. E.g., `001` or `1.0` */
  version?: string; // Marked optional, API might omit.
  /** The human-readable name of the model. E.g. "Gemini 1.5 Flash". */
  displayName?: string;
  /** A short description of the model. */
  description?: string;
  /** Maximum number of input tokens allowed for this model. */
  inputTokenLimit?: number;
  /** Maximum number of output tokens available for this model. */
  outputTokenLimit?: number;
  /** The model's supported generation methods. E.g., `generateContent`, `embedContent` */
  supportedGenerationMethods?: string[];
  /** Controls the randomness of the output. */
  temperature?: number;
  /** The maximum temperature this model can use. */
  maxTemperature?: number;
  /** For Nucleus sampling. */
  topP?: number;
  /** For Top-k sampling. If empty, indicates the model doesn't use top-k sampling. */
  topK?: number;
  /** Other model properties not explicitly defined. */
  [key: string]: any;
}

/**
 * Alias for GoogleModel, previously GoogleModelInfoResponse.
 * Represents the response for getting a single model's details.
 */
export type GoogleModelInfoResponse = GoogleModel;

/**
 * Response type for Google GenAI listModels API
 */
export interface GoogleListModelsResponse {
  /** The returned Models. */
  models: GoogleModel[];
  /** A token, which can be sent as `pageToken` to retrieve the next page. */
  nextPageToken?: string;
}
