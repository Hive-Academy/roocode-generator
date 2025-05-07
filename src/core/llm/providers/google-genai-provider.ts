import { Inject, Injectable } from '@core/di/decorators';
import { BaseLLMProvider } from '@core/llm/llm-provider';
import { LLMProviderError } from '@core/llm/llm-provider-errors';
import { Result } from '@core/result/result';
import type { ILogger } from '@core/services/logger-service';
import { retryWithBackoff } from '@core/utils/retry-utils';
import { ChatGoogleGenerativeAI, type GoogleGenerativeAIChatInput } from '@langchain/google-genai';
import { LLMConfig } from 'types/shared';
import { z } from 'zod';
import {
  GoogleGenAIErrorResponse,
  GoogleGenAITokenResponse, // Use existing interface
  GoogleModelInfoResponse, // Added interface
} from '../types/google-genai.types';
import type { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { LLMCompletionConfig } from '../interfaces'; // Import from interfaces

// Define a custom error for fetch failures to include status
class FetchError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'FetchError';
    this.status = status;
  }
}

// Retry configuration
const RETRY_OPTIONS = {
  retries: 3,
  initialDelay: 500, // ms
  shouldRetry: (error: any): boolean => {
    // Check for status code in common error structures (fetch response, axios error, potentially langchain errors)
    const status = error?.status ?? error?.response?.status;
    // Do not retry on the specific HTML error we throw
    if (error instanceof Error && error.message.includes('unexpected HTML response')) {
      return false;
    }
    return status === 429 || status === 500 || status === 503;
  },
};

@Injectable()
export class GoogleGenAIProvider extends BaseLLMProvider {
  public readonly name = 'google-genai';
  private model: ChatGoogleGenerativeAI;
  private inputTokenLimit: number | null = null; // Added property
  private readonly FALLBACK_TOKEN_LIMIT = 1000000; // Added constant

  constructor(
    private readonly config: LLMConfig,
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly clientFactory: () => ChatGoogleGenerativeAI
  ) {
    super();
    this.defaultContextSize = 8192; // This might need updating based on fetched limits? For now, keep as is.
    const model = this.clientFactory();
    model.temperature = this.config.temperature;
    model.model = this.config.model;
    this.model = model;
    // Initialize limit fetching asynchronously - don't block constructor
    void this.initialize();
  }

  // Method to fetch limits asynchronously after construction
  private async initialize(): Promise<void> {
    try {
      this.inputTokenLimit = await this.fetchModelLimits();
    } catch (error) {
      // fetchModelLimits already logs and returns fallback, but log here too if needed
      this.logger.error(
        'Error during async initialization of GoogleGenAIProvider limits',
        error instanceof Error ? error : new Error(String(error))
      );
      // Ensure fallback is set if fetchModelLimits somehow threw before returning
      if (this.inputTokenLimit === null) {
        this.inputTokenLimit = this.FALLBACK_TOKEN_LIMIT;
        this.logger.warn(
          `Ensured inputTokenLimit is set to fallback: ${this.FALLBACK_TOKEN_LIMIT}`
        );
      }
    }
  }

  async getCompletion(
    systemPrompt: string,
    userPrompt: string
  ): Promise<Result<string, LLMProviderError>> {
    // --- Pre-call Validation ---
    try {
      const inputText = `${systemPrompt}\n\nUser Input: ${userPrompt}`;
      // Use countTokens which includes retry and approximation logic
      const currentInputTokens = await this.countTokens(inputText);

      // Use fetched limit or fallback if initialization hasn't completed or failed
      const limit = this.inputTokenLimit ?? this.FALLBACK_TOKEN_LIMIT;

      this.logger.debug(`Input tokens: ${currentInputTokens}, Limit: ${limit}`);

      if (currentInputTokens > limit) {
        const errorMsg = `Input (${currentInputTokens} tokens) exceeds model token limit (${limit}).`;
        this.logger.warn(`${errorMsg} Skipping API call.`);
        // Return an Error Result consistent with other provider errors
        return Result.err(new LLMProviderError(errorMsg, 'INPUT_VALIDATION_ERROR', this.name));
      }
    } catch (validationError) {
      // Catch errors during the validation step itself (e.g., unexpected error in countTokens)
      this.logger.error(
        'Error during pre-call validation in getCompletion',
        validationError instanceof Error ? validationError : new Error(String(validationError))
      );
      // Return an error Result, as we can't proceed
      return Result.err(
        LLMProviderError.fromError(
          validationError instanceof Error ? validationError : new Error(String(validationError)),
          this.name
        )
      );
    }
    // --- End Pre-call Validation ---

    try {
      this.logger.debug(
        `Sending completion request to Google GenAI (model: ${this.config.model}) with retry`
      );

      const response = await retryWithBackoff(async () => {
        // The actual API call using langchain client
        // Note: Langchain client might have its own token counting/limits, but we are enforcing ours beforehand.
        const message = await this.model.invoke(`${systemPrompt}\n\nUser Input: ${userPrompt}`);
        if (typeof message.content === 'string') {
          return message.content;
        } else if (Array.isArray(message.content)) {
          let combinedText = '';
          for (const part of message.content) {
            // Ensure part and part.text are valid before trying to access/append
            if (
              part &&
              typeof part.type === 'string' &&
              part.type === 'text' &&
              typeof part.text === 'string'
            ) {
              combinedText += part.text;
            }
            // Not handling other part types like 'image_url' for now
          }
          if (combinedText) {
            return combinedText;
          } else {
            // This case means we got an array, but no text parts, or empty text parts.
            throw new Error(
              'LLM response content array did not contain any processable text parts. Received: ' +
                JSON.stringify(message.content)
            );
          }
        } else {
          // Fallback for unexpected content types
          throw new Error(
            'LLM response content is not a string or a recognized array structure. Received: ' +
              JSON.stringify(message.content)
          );
        }
      }, RETRY_OPTIONS);

      // The 'response' variable from retryWithBackoff will now be the string content
      return Result.ok(response);
    } catch (error) {
      // This catches the final error after retries are exhausted or if shouldRetry returned false
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to get completion from Google GenAI after retries', err);
      // Wrap the final error
      return Result.err(LLMProviderError.fromError(err, this.name));
    }
  }

  async getStructuredCompletion<T extends z.ZodTypeAny>(
    prompt: BaseLanguageModelInput,
    schema: T,
    completionConfig?: LLMCompletionConfig
  ): Promise<Result<z.infer<T>, LLMProviderError>> {
    // --- Pre-call Validation ---
    let promptStringForTokenCount: string;
    // Convert BaseLanguageModelInput to a string for token counting.
    if (typeof prompt === 'string') {
      promptStringForTokenCount = prompt;
    } else if (Array.isArray(prompt)) {
      // Handles BaseMessageLike[]
      promptStringForTokenCount = prompt
        .map((msgLike) => {
          if (typeof msgLike === 'string') return msgLike;
          // Check for [role, content] tuple if msgLike is an array
          if (Array.isArray(msgLike) && msgLike.length === 2 && typeof msgLike[1] === 'string')
            return msgLike[1];
          // Check for BaseMessage structure if msgLike is an object
          if (
            typeof msgLike === 'object' &&
            msgLike !== null &&
            'content' in msgLike &&
            typeof msgLike.content === 'string'
          )
            return msgLike.content;
          // Fallback for other message-like structures in the array
          return '';
        })
        .filter((content) => !!content) // Remove empty strings resulting from fallback
        .join('\n');
    } else if (
      typeof prompt === 'object' &&
      prompt !== null &&
      'content' in prompt &&
      typeof prompt.content === 'string'
    ) {
      // Handles single BaseMessage
      promptStringForTokenCount = prompt.content;
    } else {
      // Fallback for other BaseLanguageModelInput types (e.g., complex PromptValues)
      try {
        // Attempt to get a string representation if possible (e.g. from a PromptValue)
        // This is a best-effort conversion for complex types.
        if (typeof (prompt as any)?.toChatMessages === 'function') {
          const messages = (prompt as any).toChatMessages();
          promptStringForTokenCount = messages
            .map((m: any) => (typeof m.content === 'string' ? m.content : ''))
            .filter((c: string) => !!c)
            .join('\n');
        } else if (
          typeof (prompt as any)?.toString === 'function' &&
          (prompt as any).toString() !== '[object Object]'
        ) {
          promptStringForTokenCount = (prompt as any).toString();
        } else {
          // If toString is generic or toChatMessages doesn't exist, fallback to JSON.stringify
          promptStringForTokenCount = JSON.stringify(prompt);
          this.logger.debug(
            `GoogleGenAIProvider: promptStringForTokenCount fell back to JSON.stringify for prompt type: ${typeof prompt}. Output: ${promptStringForTokenCount.substring(0, 100)}...`
          );
        }
      } catch (e) {
        promptStringForTokenCount = ''; // Ultimate fallback
        this.logger.warn(
          `GoogleGenAIProvider: promptStringForTokenCount could not be stringified for type ${typeof prompt}, falling back to empty string. Error: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }

    try {
      const currentInputTokens = await this.countTokens(promptStringForTokenCount);
      const limit = this.inputTokenLimit ?? this.FALLBACK_TOKEN_LIMIT;
      const maxOutputTokensForThisCall =
        completionConfig?.maxTokens ?? this.config.maxTokens ?? this.model.maxOutputTokens ?? 2048; // Get maxTokens from model if available
      const availableForInput = limit - maxOutputTokensForThisCall;

      this.logger.debug(
        `GoogleGenAIProvider: Structured Input tokens: ${currentInputTokens}, Available for input: ${availableForInput} (Model Limit: ${limit}, Reserved for Output: ${maxOutputTokensForThisCall}) for model ${this.config.model}`
      );

      if (currentInputTokens > availableForInput) {
        const errorMsg = `Input (${currentInputTokens} tokens) for Google GenAI structured completion exceeds model's available input token limit (${availableForInput}). Model: ${this.config.model}, Total Limit: ${limit}, Reserved for Output: ${maxOutputTokensForThisCall}.`;
        this.logger.warn(errorMsg);
        return Result.err(new LLMProviderError(errorMsg, 'VALIDATION_ERROR', this.name));
      }
    } catch (validationError) {
      const message = `Error during pre-call token validation in GoogleGenAIProvider getStructuredCompletion: ${validationError instanceof Error ? validationError.message : String(validationError)}`;
      const errorToLog = validationError instanceof Error ? validationError : new Error(message);
      this.logger.error(message, errorToLog);
      return Result.err(
        new LLMProviderError(message, 'UNKNOWN_ERROR', this.name, { cause: errorToLog })
      );
    }
    // --- End Pre-call Validation ---

    try {
      this.logger.debug(
        `Sending structured completion request to Google GenAI (model: ${this.config.model}) with schema and retry. Prompt type: ${typeof prompt === 'string' ? 'string' : 'object'}`
      );

      let modelToInvoke = this.model;

      // Apply per-call configurations if any
      const bindOptions: Partial<GoogleGenerativeAIChatInput> = {};
      if (completionConfig) {
        if (completionConfig.temperature !== undefined)
          bindOptions.temperature = completionConfig.temperature;
        if (completionConfig.maxTokens !== undefined)
          bindOptions.maxOutputTokens = completionConfig.maxTokens; // maps to maxOutputTokens
        if (completionConfig.topP !== undefined) bindOptions.topP = completionConfig.topP;
        // GoogleGenAI specific: topK
        // if (completionConfig.topK !== undefined) bindOptions.topK = completionConfig.topK;
        if (completionConfig.stopSequences && completionConfig.stopSequences.length > 0) {
          bindOptions.stopSequences = completionConfig.stopSequences;
        }
      }

      if (Object.keys(bindOptions).length > 0) {
        modelToInvoke = modelToInvoke.bind(bindOptions) as ChatGoogleGenerativeAI;
        this.logger.debug(
          `GoogleGenAIProvider: Bound temporary configurations for this call. Options: ${JSON.stringify(bindOptions)}`
        );
      }

      const structuredModel = modelToInvoke.withStructuredOutput(schema, {
        name: schema.description || `extract_${schema.constructor?.name || 'data'}`,
      });

      const response = await retryWithBackoff(() => structuredModel.invoke(prompt), RETRY_OPTIONS);

      return Result.ok(response);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to get structured completion from Google GenAI after retries', err);
      // Ensure LLMProviderError is returned
      if (error instanceof LLMProviderError) {
        return Result.err(error);
      }
      return Result.err(LLMProviderError.fromError(err, this.name));
    }
  }
  async getContextWindowSize(): Promise<number> {
    // TODO: Potentially update this based on fetched model info if available?
    // For now, return the fetched input limit or the original default.
    return Promise.resolve(this.inputTokenLimit ?? this.defaultContextSize);
  }

  async countTokens(text: string): Promise<number> {
    this.logger.debug(`Counting tokens for Google GenAI (model: ${this.config.model}) with retry`);
    try {
      const tokenCount = await retryWithBackoff(
        () => this.performCountTokensRequest(text),
        RETRY_OPTIONS
      );
      return tokenCount;
    } catch (error: any) {
      // This catch block handles the final error after retries or non-retriable errors (like HTML)
      this.logger.warn(
        `Failed to count tokens for Google GenAI model ${this.config.model} after retries or due to non-retriable error, using approximation: ${error?.message}`
      );
      // Log specific details if it was a FetchError that wasn't retried
      if (error instanceof FetchError && error.status) {
        this.logger.warn(`Final error status code: ${error.status}`);
      }
      // Return approximation on final failure
      return Math.ceil(text.length / 4);
    }
  }

  // --- New/Updated Private Methods ---

  /**
   * Fetches the input token limit for the configured model from the Google API.
   * Returns the fetched limit or a fallback value if the API call fails or the limit is not found.
   */
  private async fetchModelLimits(): Promise<number> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}?key=${this.config.apiKey}`;
    const redactedUrl = url.replace(/key=([^&]+)/, 'key=[REDACTED_API_KEY]');
    this.logger.debug(`Fetching model limits from: ${redactedUrl}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          // Assuming apiKey is the correct credential for this endpoint
          // Authorization: `Bearer ${this.config.apiKey}`, // Usually Bearer is for OAuth, API keys might be different
          'Content-Type': 'application/json', // Often not needed for GET but doesn't hurt
        },
      });

      if (!response.ok) {
        this.logger.warn(
          `Failed to fetch model limits for ${this.config.model}. Status: ${response.status}. Using fallback.`
        );
        return this.FALLBACK_TOKEN_LIMIT;
      }

      // Try parsing the successful response
      try {
        const data = (await response.json()) as GoogleModelInfoResponse;
        const limit = data?.inputTokenLimit;

        if (typeof limit === 'number') {
          this.logger.info(`Retrieved input token limit for ${this.config.model}: ${limit}`);
          return limit;
        } else {
          this.logger.warn(
            `Input token limit not found or invalid type (${typeof limit}) for model ${this.config.model} in API response. Using fallback.`
          );
          return this.FALLBACK_TOKEN_LIMIT;
        }
      } catch (jsonError) {
        this.logger.warn(
          `Failed to parse successful model limits response for ${this.config.model}: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}. Using fallback.`
        );
        return this.FALLBACK_TOKEN_LIMIT;
      }
    } catch (error) {
      // Network errors or other fetch-related issues
      this.logger.error(
        `Network error fetching model limits for ${this.config.model}: ${error instanceof Error ? error.message : String(error)}. Using fallback.`,
        error instanceof Error ? error : new Error(String(error))
      );
      return this.FALLBACK_TOKEN_LIMIT;
    }
  }

  /**
   * Performs the actual fetch request to the Google GenAI countTokens endpoint.
   * Handles response parsing, error detection (including HTML), and throws appropriate errors.
   * Returns the token count on success, or throws an error (FetchError for retriable, Error for non-retriable).
   * Note: The calling function (`countTokens`) handles the final approximation on error.
   */
  private async performCountTokensRequest(text: string): Promise<number> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.config.model}:countTokens?key=${this.config.apiKey}`;
    let response: Response;

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          // Authorization: `Bearer ${this.config.apiKey}`, // Use API Key in URL as per spec
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Assuming the structure matches the 'generateContent' format for consistency
          contents: [
            {
              parts: [
                {
                  text: text,
                },
              ],
            },
          ],
        }),
      });
    } catch (fetchError) {
      // Catch network errors during the fetch itself
      this.logger.warn(
        `Network error during countTokens fetch: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
      );
      // Throw a FetchError so retry logic might catch it (though network errors might not have status)
      throw new FetchError(
        `Network error during countTokens: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
      );
    }

    if (!response.ok) {
      let errorBodyText: string | null = null;
      try {
        errorBodyText = await response.text();
        // Attempt to parse as JSON first
        try {
          const errorData = JSON.parse(errorBodyText) as GoogleGenAIErrorResponse;
          // Log specific API error if available
          this.logger.warn(
            `countTokens API Error: ${errorData?.error?.message} (Code: ${errorData?.error?.code}, Status: ${response.status}).` // Removed "Using approximation" here, caller handles it
          );
        } catch (jsonError) {
          this.logger.debug(
            `JSON parse failed in countTokens error handler: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`
          );
          // JSON parsing failed, check for HTML
          if (errorBodyText && errorBodyText.trim().toLowerCase().startsWith('<!doctype html')) {
            // More specific HTML check
            this.logger.error(
              'Received non-JSON (HTML) response during token count. Check API Key/URL/Permissions/Proxy.'
            );
            this.logger.error(`Raw Response Snippet: ${errorBodyText.substring(0, 500)}`);
            // Throw a standard Error to PREVENT retries for HTML responses
            throw new Error(
              `Token counting failed due to unexpected HTML response. Status: ${response.status}`
            );
          } else {
            // Non-JSON, Non-HTML error body
            this.logger.warn(
              `countTokens failed. Non-OK response (${response.status}) and non-JSON/non-HTML body. Body snippet: ${errorBodyText?.substring(0, 200)}`
            );
          }
        }
      } catch (textError) {
        // Error reading response body text itself (less likely)
        this.logger.warn(
          `Error reading error response body for countTokens: ${textError instanceof Error ? textError.message : String(textError)}`
        );
      }

      // Always throw FetchError for non-ok responses to allow retry logic to evaluate
      // (unless the specific HTML error was already thrown)
      throw new FetchError(`API request failed with status ${response.status}`, response.status);
    }

    // Handle successful response (response.ok is true)
    try {
      const data = (await response.json()) as GoogleGenAITokenResponse; // Use existing interface
      if (data && typeof data.totalTokens === 'number') {
        return data.totalTokens;
      } else {
        // Successful response but unexpected structure
        this.logger.warn(
          `Unexpected successful response structure from countTokens: ${JSON.stringify(data)}. Using approximation.`
        );
        // Throw an error here so the outer countTokens catch block returns approximation
        throw new Error('Invalid response structure from countTokens API.');
      }
    } catch (jsonParseError) {
      // Error parsing the successful JSON response
      this.logger.warn(
        `Failed to parse successful countTokens response: ${jsonParseError instanceof Error ? jsonParseError.message : String(jsonParseError)}. Using approximation.`
      );
      // Throw an error here so the outer countTokens catch block returns approximation
      throw new Error(
        `Failed to parse successful countTokens response: ${jsonParseError instanceof Error ? jsonParseError.message : String(jsonParseError)}`
      );
    }
  }
}
