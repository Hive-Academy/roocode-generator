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
  GoogleGenAITokenResponse,
  GoogleModel,
  GoogleListModelsResponse,
} from '../types/google-genai.types';
import type { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { LLMCompletionConfig } from '../interfaces';

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
    const status = error?.status ?? error?.response?.status;
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
  private inputTokenLimit: number | null = null;
  private readonly FALLBACK_TOKEN_LIMIT = 1000000;

  constructor(
    private readonly config: LLMConfig,
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly clientFactory: () => ChatGoogleGenerativeAI
  ) {
    super();
    this.defaultContextSize = 8192;
    const model = this.clientFactory();
    model.temperature = this.config.temperature;
    model.model = this.config.model; // Langchain client expects "models/model-name" or just "model-name"
    this.model = model;
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      this.inputTokenLimit = await this.fetchModelLimits();
    } catch (error) {
      this.logger.error(
        'Error during async initialization of GoogleGenAIProvider limits',
        error instanceof Error ? error : new Error(String(error))
      );
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
    try {
      const inputText = `${systemPrompt}\n\nUser Input: ${userPrompt}`;
      const currentInputTokens = await this.countTokens(inputText);
      const limit = this.inputTokenLimit ?? this.FALLBACK_TOKEN_LIMIT;
      this.logger.debug(`Input tokens: ${currentInputTokens}, Limit: ${limit}`);
      if (currentInputTokens > limit) {
        const errorMsg = `Input (${currentInputTokens} tokens) exceeds model token limit (${limit}).`;
        this.logger.warn(`${errorMsg} Skipping API call.`);
        return Result.err(new LLMProviderError(errorMsg, 'INPUT_VALIDATION_ERROR', this.name));
      }
    } catch (validationError) {
      this.logger.error(
        'Error during pre-call validation in getCompletion',
        validationError instanceof Error ? validationError : new Error(String(validationError))
      );
      return Result.err(
        LLMProviderError.fromError(
          validationError instanceof Error ? validationError : new Error(String(validationError)),
          this.name
        )
      );
    }

    try {
      this.logger.debug(
        `Sending completion request to Google GenAI (model: ${this.config.model}) with retry`
      );
      const response = await retryWithBackoff(async () => {
        const message = await this.model.invoke(`${systemPrompt}\n\nUser Input: ${userPrompt}`);
        if (typeof message.content === 'string') {
          return message.content;
        } else if (Array.isArray(message.content)) {
          let combinedText = '';
          for (const part of message.content) {
            if (
              part &&
              typeof part.type === 'string' &&
              part.type === 'text' &&
              typeof part.text === 'string'
            ) {
              combinedText += part.text;
            }
          }
          if (combinedText) {
            return combinedText;
          } else {
            throw new Error(
              'LLM response content array did not contain any processable text parts. Received: ' +
                JSON.stringify(message.content)
            );
          }
        } else {
          throw new Error(
            'LLM response content is not a string or a recognized array structure. Received: ' +
              JSON.stringify(message.content)
          );
        }
      }, RETRY_OPTIONS);
      return Result.ok(response);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to get completion from Google GenAI after retries', err);
      return Result.err(LLMProviderError.fromError(err, this.name));
    }
  }

  async getStructuredCompletion<T extends z.ZodTypeAny>(
    prompt: BaseLanguageModelInput,
    schema: T,
    completionConfig?: LLMCompletionConfig
  ): Promise<Result<z.infer<T>, LLMProviderError>> {
    let promptStringForTokenCount: string;
    if (typeof prompt === 'string') {
      promptStringForTokenCount = prompt;
    } else if (Array.isArray(prompt)) {
      promptStringForTokenCount = prompt
        .map((msgLike) => {
          if (typeof msgLike === 'string') return msgLike;
          if (Array.isArray(msgLike) && msgLike.length === 2 && typeof msgLike[1] === 'string')
            return msgLike[1];
          if (
            typeof msgLike === 'object' &&
            msgLike !== null &&
            'content' in msgLike &&
            typeof msgLike.content === 'string'
          )
            return msgLike.content;
          return '';
        })
        .filter((content) => !!content)
        .join('\n');
    } else if (
      typeof prompt === 'object' &&
      prompt !== null &&
      'content' in prompt &&
      typeof prompt.content === 'string'
    ) {
      promptStringForTokenCount = prompt.content;
    } else {
      try {
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
          promptStringForTokenCount = JSON.stringify(prompt);
          this.logger.debug(
            `GoogleGenAIProvider: promptStringForTokenCount fell back to JSON.stringify for prompt type: ${typeof prompt}. Output: ${promptStringForTokenCount.substring(0, 100)}...`
          );
        }
      } catch (e) {
        promptStringForTokenCount = '';
        this.logger.warn(
          `GoogleGenAIProvider: promptStringForTokenCount could not be stringified for type ${typeof prompt}, falling back to empty string. Error: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }

    try {
      const currentInputTokens = await this.countTokens(promptStringForTokenCount);
      const limit = this.inputTokenLimit ?? this.FALLBACK_TOKEN_LIMIT;
      const maxOutputTokensForThisCall =
        completionConfig?.maxTokens ?? this.config.maxTokens ?? this.model.maxOutputTokens ?? 2048;
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

    try {
      this.logger.debug(
        `Sending structured completion request to Google GenAI (model: ${this.config.model}) with schema and retry. Prompt type: ${typeof prompt === 'string' ? 'string' : 'object'}`
      );

      let modelToInvoke = this.model;
      const bindOptions: Partial<GoogleGenerativeAIChatInput> = {};
      if (completionConfig) {
        if (completionConfig.temperature !== undefined)
          bindOptions.temperature = completionConfig.temperature;
        if (completionConfig.maxTokens !== undefined)
          bindOptions.maxOutputTokens = completionConfig.maxTokens;
        if (completionConfig.topP !== undefined) bindOptions.topP = completionConfig.topP;
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
      if (error instanceof LLMProviderError) {
        return Result.err(error);
      }
      return Result.err(LLMProviderError.fromError(err, this.name));
    }
  }

  public async listModels(): Promise<Result<string[], LLMProviderError>> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${this.config.apiKey}`;
    const redactedUrl = url.replace(/key=([^&]+)/, 'key=[REDACTED_API_KEY]');
    this.logger.info(`Fetching list of Google GenAI models from: ${redactedUrl}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorBodyText: string | undefined;
        try {
          errorBodyText = await response.text();
          const errorData = JSON.parse(errorBodyText) as GoogleGenAIErrorResponse;
          const errorMessage = `Failed to list Google GenAI models. Status: ${response.status}. API Error: ${errorData?.error?.message || 'Unknown API error'}`;
          const details = {
            rawApiError: errorData,
            statusCode: response.status,
            responseBody: errorBodyText?.substring(0, 500),
          };
          const logMessage = `${errorMessage} - Details: ${JSON.stringify(details)}`;
          const llmError = new LLMProviderError(
            errorMessage,
            `API_ERROR_${response.status}`,
            this.name,
            details
          );
          this.logger.error(logMessage, llmError);
          return Result.err(llmError);
        } catch (e: unknown) {
          const errorMessage = `Failed to list Google GenAI models. Status: ${response.status}. Response body: ${errorBodyText || 'Could not read error body.'}`;
          const errorMeta = {
            statusCode: response.status,
            bodyPreview: errorBodyText?.substring(0, 100),
            parseError: e instanceof Error ? e.message : String(e),
          };
          const logMessage = `${errorMessage} - Parsing Details: ${JSON.stringify(errorMeta)}`;
          const llmError = new LLMProviderError(
            errorMessage,
            `API_ERROR_${response.status}`,
            this.name,
            { parsingDetails: errorMeta }
          );
          this.logger.error(logMessage, llmError);
          return Result.err(llmError);
        }
      }

      const data = (await response.json()) as GoogleListModelsResponse;

      if (!data.models || data.models.length === 0) {
        this.logger.warn('No models found from Google GenAI API.');
        return Result.err(new LLMProviderError('No models found', 'NO_MODELS_RETURNED', this.name));
      }
      const modelIds = data.models
        .map((model: GoogleModel) => model.baseModelId || model.name)
        .filter((id): id is string => !!id);

      if (modelIds.length === 0) {
        this.logger.warn(
          'No usable model IDs (baseModelId or name) found in the Google GenAI API response.'
        );
        return Result.err(
          new LLMProviderError('No usable model IDs found', 'NO_USABLE_MODEL_IDS', this.name)
        );
      }
      const uniqueModelIds = [...new Set(modelIds)];
      this.logger.info(`Successfully listed ${uniqueModelIds.length} unique Google GenAI models.`);
      this.logger.debug(`Available Google GenAI models: ${uniqueModelIds.join(', ')}`);
      return Result.ok(uniqueModelIds);
    } catch (error: unknown) {
      const errorMessage = `Error listing Google GenAI models: ${error instanceof Error ? error.message : String(error)}`;
      let llmError: LLMProviderError;
      if (error instanceof Error) {
        llmError = new LLMProviderError(errorMessage, 'NETWORK_ERROR', this.name, {
          cause: {
            name: error.name,
            message: error.message,
            stackPreview: error.stack?.substring(0, 200),
          },
        });
        this.logger.error(llmError.message, llmError);
      } else {
        const details = { caughtErrorString: String(error) };
        llmError = new LLMProviderError(errorMessage, 'NETWORK_ERROR', this.name, details);
        this.logger.error(`${llmError.message} - Non-Error Cause: ${String(error)}`, llmError);
      }
      return Result.err(llmError);
    }
  }

  async getContextWindowSize(): Promise<number> {
    if (this.inputTokenLimit === null) {
      this.logger.debug(
        'getContextWindowSize called before inputTokenLimit was initialized. Attempting to initialize now.'
      );
      await this.initialize();
    }
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
      this.logger.warn(
        `Failed to count tokens for Google GenAI model ${this.config.model} after retries or due to non-retriable error, using approximation: ${error?.message}`
      );
      if (error instanceof FetchError && error.status) {
        this.logger.warn(`Final error status code: ${error.status}`);
      }
      return Math.ceil(text.length / 4);
    }
  }

  private async fetchModelLimits(): Promise<number> {
    if (!this.config.model) {
      this.logger.warn('fetchModelLimits called without a model configured. Using fallback limit.');
      return this.FALLBACK_TOKEN_LIMIT;
    }
    if (!this.config.apiKey) {
      this.logger.error(
        'fetchModelLimits called without an API key configured for Google GenAI. Using fallback limit.'
      );
      return this.FALLBACK_TOKEN_LIMIT;
    }

    const modelIdForPath = this.config.model.startsWith('models/')
      ? this.config.model.split('/')[1]
      : this.config.model;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelIdForPath}?key=${this.config.apiKey}`;
    const redactedUrl = url.replace(/key=([^&]+)/, 'key=[REDACTED_API_KEY]');
    this.logger.info(`Fetching model limits for "${modelIdForPath}" from: ${redactedUrl}`);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let errorBodyText: string | undefined;
        let errorData: GoogleGenAIErrorResponse | undefined;
        try {
          errorBodyText = await response.text();
          errorData = JSON.parse(errorBodyText) as GoogleGenAIErrorResponse;
          const apiErrorMessage = errorData?.error?.message || 'Unknown API error';
          this.logger.warn(
            `Failed to fetch model limits for ${modelIdForPath}. Status: ${response.status}. API Error: "${apiErrorMessage}". Response: ${errorBodyText.substring(0, 200)}. Raw Error Data: ${JSON.stringify(errorData)}. Using fallback.`
          );
        } catch (e: unknown) {
          this.logger.warn(
            `Failed to fetch model limits for ${modelIdForPath}. Status: ${response.status}. Could not parse error response: "${errorBodyText || 'empty response'}". Parse Error: ${e instanceof Error ? e.message : String(e)}. Using fallback.`
          );
        }
        if (response.status === 404) {
          const llmErrorFor404 = new LLMProviderError(
            `Received 404 Not Found for model "${modelIdForPath}". This could mean the model doesn't exist, is not available with the provided API key, or the API key is invalid/misconfigured. URL: ${redactedUrl}. Using fallback.`,
            'FETCH_LIMITS_404',
            this.name,
            { modelId: modelIdForPath, url: redactedUrl }
          );
          this.logger.error(llmErrorFor404.message, llmErrorFor404);
        }
        return this.FALLBACK_TOKEN_LIMIT;
      }

      const data = (await response.json()) as GoogleModel;

      if (typeof data.inputTokenLimit === 'number') {
        this.logger.info(
          `Successfully retrieved input token limit for ${modelIdForPath}: ${data.inputTokenLimit}`
        );
        return data.inputTokenLimit;
      } else {
        this.logger.warn(
          `Input token limit not found or invalid type (${typeof data.inputTokenLimit}) for model ${modelIdForPath} in API response. Full response: ${JSON.stringify(data).substring(0, 500)}. Using fallback.`
        );
        return this.FALLBACK_TOKEN_LIMIT;
      }
    } catch (error: unknown) {
      const errorMessage = `Network or unexpected error fetching model limits for ${modelIdForPath}: ${error instanceof Error ? error.message : String(error)}. Using fallback.`;
      let llmErrorToLog: Error;
      if (error instanceof Error) {
        llmErrorToLog = error;
      } else {
        llmErrorToLog = new LLMProviderError(
          errorMessage,
          'UNKNOWN_FETCH_LIMITS_ERROR',
          this.name,
          { caughtErrorString: String(error) }
        );
      }
      this.logger.error(errorMessage, llmErrorToLog);
      return this.FALLBACK_TOKEN_LIMIT;
    }
  }

  private async performCountTokensRequest(text: string): Promise<number> {
    // Correctly format modelId for the API path
    const modelIdForPath = this.config.model.startsWith('models/')
      ? this.config.model // Already in models/model-id format
      : `models/${this.config.model}`; // Prepend models/ if not present

    const url = `https://generativelanguage.googleapis.com/v1beta/${modelIdForPath}:countTokens?key=${this.config.apiKey}`;
    let response: Response;

    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
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
      this.logger.warn(
        `Network error during countTokens fetch: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
      );
      throw new FetchError(
        `Network error during countTokens: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
      );
    }

    if (!response.ok) {
      let errorBodyText: string | null = null;
      try {
        errorBodyText = await response.text();
        try {
          const errorData = JSON.parse(errorBodyText) as GoogleGenAIErrorResponse;
          this.logger.warn(
            `countTokens API Error: ${errorData?.error?.message} (Code: ${errorData?.error?.code}, Status: ${response.status}).`
          );
        } catch (jsonError) {
          this.logger.debug(
            `JSON parse failed in countTokens error handler: ${jsonError instanceof Error ? jsonError.message : String(jsonError)}`
          );
          if (errorBodyText && errorBodyText.trim().toLowerCase().startsWith('<!doctype html')) {
            this.logger.error(
              'Received non-JSON (HTML) response during token count. Check API Key/URL/Permissions/Proxy.'
            );
            this.logger.error(`Raw Response Snippet: ${errorBodyText.substring(0, 500)}`);
            throw new Error(
              `Token counting failed due to unexpected HTML response. Status: ${response.status}`
            );
          } else {
            this.logger.warn(
              `countTokens failed. Non-OK response (${response.status}) and non-JSON/non-HTML body. Body snippet: ${errorBodyText?.substring(0, 200)}`
            );
          }
        }
      } catch (textError) {
        this.logger.warn(
          `Error reading error response body for countTokens: ${textError instanceof Error ? textError.message : String(textError)}`
        );
      }
      throw new FetchError(`API request failed with status ${response.status}`, response.status);
    }

    try {
      const data = (await response.json()) as GoogleGenAITokenResponse;
      if (data && typeof data.totalTokens === 'number') {
        return data.totalTokens;
      } else {
        this.logger.warn(
          `Unexpected successful response structure from countTokens: ${JSON.stringify(data)}. Using approximation.`
        );
        throw new Error('Invalid response structure from countTokens API.');
      }
    } catch (jsonParseError) {
      this.logger.warn(
        `Failed to parse successful countTokens response: ${jsonParseError instanceof Error ? jsonParseError.message : String(jsonParseError)}. Using approximation.`
      );
      throw new Error(
        `Failed to parse successful countTokens response: ${jsonParseError instanceof Error ? jsonParseError.message : String(jsonParseError)}`
      );
    }
  }
}
