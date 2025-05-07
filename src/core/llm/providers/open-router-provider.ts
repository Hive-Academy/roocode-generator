import { Inject, Injectable } from '@core/di/decorators';
import { BaseLLMProvider } from '@core/llm/llm-provider';
import { LLMProviderError } from '@core/llm/llm-provider-errors';
import { Result } from '@core/result/result';
import type { ILogger } from '@core/services/logger-service';
import {
  ChatOpenAI,
  ChatOpenAIFields,
  type ChatOpenAICallOptions,
  type OpenAIInput,
} from '@langchain/openai';
import { LLMConfig } from 'types/shared';
import { z } from 'zod';
import { retryWithBackoff } from '@core/utils/retry-utils';
import { type BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { type Runnable } from '@langchain/core/runnables';
import { LLMCompletionConfig } from '../interfaces'; // Import from interfaces

type OpenRouterChatOpenAIParams = Partial<OpenAIInput>; // This uses OpenAIInput from @langchain/openai

interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  pricing?: {
    prompt: number;
    completion: number;
  };
}

interface OpenRouterCompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
}

interface OpenRouterCompletionResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
  }>;
}

@Injectable()
export class OpenRouterProvider extends BaseLLMProvider {
  public readonly name = 'openrouter';
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private model: ChatOpenAI;

  private readonly DEFAULT_API_URL = 'https://openrouter.ai/api/v1';

  constructor(
    private readonly config: LLMConfig,
    @Inject('ILogger') private readonly logger: ILogger
  ) {
    super();
    this.apiUrl = this.config.apiUrl || this.DEFAULT_API_URL;
    this.apiKey = config.apiKey;

    const constructorParams: ChatOpenAIFields = {
      openAIApiKey: this.apiKey, // Corrected: maps to openAIApiKey
      modelName: this.config.model, // Corrected: maps to modelName
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      configuration: {
        baseURL: this.apiUrl, // Corrected: configuration expects basePath
        defaultHeaders: {
          'HTTP-Referer': 'https://github.com/roocode-generator',
          'X-Title': 'RooCode Generator',
        },
      },
    };
    this.logger.debug(
      `Initializing ChatOpenAI for OpenRouter with params: ${JSON.stringify({
        modelName: constructorParams.modelName,
        temperature: constructorParams.temperature,
        maxTokens: constructorParams.maxTokens,
        basePath: constructorParams.configuration?.baseURL,
      })}`
    );

    try {
      this.model = new ChatOpenAI(constructorParams);
    } catch (e) {
      this.logger.error(
        'Failed to instantiate ChatOpenAI for OpenRouter. LLM calls will fail.',
        e instanceof Error ? e : new Error(String(e))
      );
      // Fallback to a dummy object to prevent immediate crash if constructor fails.
      this.model = {
        withStructuredOutput: () => {
          throw new Error('ChatOpenAI (for OpenRouter) not initialized properly');
        },
        getNumTokens: () => Promise.resolve(0), // Dummy implementation
        // Add other methods as needed by the interface or base class if not truly instantiable
      } as any; // Cast to any to assign to ChatOpenAI type if dummy doesn't match perfectly
    }
  }

  async getCompletion(
    systemPrompt: string,
    userPrompt: string
  ): Promise<Result<string, LLMProviderError>> {
    try {
      this.logger.debug(`Sending completion request to OpenRouter (model: ${this.config.model})`);

      const response = await fetch(`${this.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          // Fixed: Using hardcoded defaults
          'HTTP-Referer': 'https://github.com/roocode-generator',
          'X-Title': 'RooCode Generator',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
        } as OpenRouterCompletionRequest),
      });

      if (!response.ok) {
        // const errorData = (await response.json().catch(() => ({ error: response.statusText }))) as {
        //   error?: string;
        // };
        // Fixed: errorDetails removed as it was unused.
        const errorBody = await response.text();
        this.logger.error(
          `OpenRouter API error (getCompletion): ${response.status} ${response.statusText}. Body: ${errorBody}`
        );
        let errorCode: string = 'API_ERROR';
        if (response.status === 401) errorCode = 'AUTHENTICATION_ERROR';
        if (response.status === 429) errorCode = 'RATE_LIMIT_ERROR';
        if (response.status >= 500) errorCode = 'API_ERROR';

        throw new LLMProviderError(
          `OpenRouter API error (getCompletion): ${response.statusText} (Status: ${response.status})`,
          errorCode,
          this.name,
          { statusCode: response.status, responseBody: errorBody }
        );
      }

      const data = (await response.json()) as OpenRouterCompletionResponse;

      if (
        !data ||
        !Array.isArray(data.choices) ||
        data.choices.length === 0 ||
        !data.choices[0].message ||
        typeof data.choices[0].message.content !== 'string'
      ) {
        const errorMsg =
          'OpenRouter response (getCompletion) has invalid structure or missing content.';
        this.logger.error(`${errorMsg} Response data: ${JSON.stringify(data)}`);
        throw new LLMProviderError(errorMsg, 'INVALID_RESPONSE_FORMAT', this.name, {
          responseData: data, // This is Record<string, unknown> compatible
        });
      }

      const completion = data.choices[0].message.content;
      this.logger.debug(
        `Received completion from OpenRouter (model: ${this.config.model}, length: ${completion.length})`
      );
      return Result.ok(completion);
    } catch (error) {
      this.logger.error(
        `Failed to get completion from OpenRouter (model: ${this.config.model})`,
        error instanceof Error ? error : new Error(String(error))
      );
      return Result.err(LLMProviderError.fromError(error, this.name));
    }
  }

  async listModels(): Promise<Result<string[], LLMProviderError>> {
    try {
      const response = await fetch(`${this.apiUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          // Fixed: Using hardcoded defaults
          'HTTP-Referer': 'https://github.com/roocode-generator',
          'X-Title': 'RooCode Generator',
        },
      });

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error(
          `OpenRouter API error (listModels): ${response.status} ${response.statusText}. Body: ${errorBody}`
        );
        let errorCode: string = 'API_ERROR'; // Fixed: errorCode is string
        if (response.status === 401) errorCode = 'AUTHENTICATION_ERROR';
        throw new LLMProviderError(
          `OpenRouter API error (listModels): ${response.statusText} (Status: ${response.status})`,
          errorCode,
          this.name,
          { statusCode: response.status, responseBody: errorBody }
        );
      }

      const data = (await response.json()) as { data: OpenRouterModel[] };
      if (!data || !Array.isArray(data.data)) {
        const errorMsg = 'OpenRouter listModels response has invalid structure.';
        this.logger.error(`${errorMsg} Response data: ${JSON.stringify(data)}`);
        throw new LLMProviderError(errorMsg, 'INVALID_RESPONSE_FORMAT', this.name, {
          responseData: data, // This is Record<string, unknown> compatible
        });
      }
      const models = data.data.map((model) => model.id);
      return Result.ok(models);
    } catch (error) {
      this.logger.error(
        'Failed to fetch OpenRouter models',
        error instanceof Error ? error : new Error(String(error))
      );
      return Result.err(LLMProviderError.fromError(error, this.name));
    }
  }

  /**
   * Get the maximum context window size for the model.
   * Uses the context_length from modelParams if available, otherwise defaults.
   * IMPORTANT: For OpenRouter, this relies on `modelParams.context_length` being accurate
   * for the specific underlying model proxied by OpenRouter. This value might not always be
   * up-to-date or available for all models on OpenRouter.
   * @returns Promise resolving to the context window size in tokens
   */
  async getContextWindowSize(): Promise<number> {
    const contextLength = this.config.modelParams?.context_length as number | undefined;
    if (contextLength) {
      this.logger.debug(
        `Using context_length from modelParams: ${contextLength} for OpenRouter model ${this.config.model}`
      );
      return Promise.resolve(contextLength);
    }
    // Fallback to the class's defaultContextSize or BaseLLMProvider's default if not set here.
    this.logger.debug(
      `Using defaultContextSize: ${this.defaultContextSize} for OpenRouter model ${this.config.model} (no context_length in modelParams). This is a fallback from BaseLLMProvider and might not be accurate for all OpenRouter models.`
    );
    return Promise.resolve(this.defaultContextSize); // Inherited from BaseLLMProvider
  }

  /**
   * Count the number of tokens in a text string.
   * For OpenRouter, an exact token count for the proxied model is complex.
   * This implementation assumes ChatOpenRouter does NOT have a reliable getNumTokens() method
   * for arbitrary proxied models and falls back to the base class's approximation.
   * A warning is logged.
   * @param text The text to count tokens for
   * @returns Promise resolving to the token count
   */
  async countTokens(text: string): Promise<number> {
    try {
      // Using ChatOpenAI's getNumTokens.
      const tokenCount = await this.model.getNumTokens(text);
      this.logger.debug(
        `OpenRouterProvider: Token count for text (length ${text.length}) using this.model.getNumTokens() for ${this.config.model}: ${tokenCount}. ` +
          `Note: When ChatOpenAI is used with OpenRouter, accuracy for non-OpenAI models proxied by OpenRouter is not guaranteed.`
      );
      return tokenCount;
    } catch (error) {
      this.logger.warn(
        // Ensure this logger call is one argument or matches ILogger signature
        `OpenRouterProvider: this.model.getNumTokens() failed for model ${this.config.model}. Error: ${error instanceof Error ? error.message : String(error)}. Falling back to super.countTokens() approximation.`
      );
      return super.countTokens(text); // Fallback to character-based approximation
    }
  }

  private async _validateInputTokens(
    prompt: BaseLanguageModelInput, // Changed to BaseLanguageModelInput
    maxOutputTokensConfig?: number
  ): Promise<Result<void, LLMProviderError>> {
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
            `OpenRouterProvider: promptStringForTokenCount fell back to JSON.stringify. Output: ${promptStringForTokenCount.substring(0, 100)}...`
          );
        }
      } catch (e) {
        promptStringForTokenCount = '';
        this.logger.warn(
          `OpenRouterProvider: promptStringForTokenCount could not be stringified, falling back to empty string. Error: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }

    try {
      const currentInputTokens = await this.countTokens(promptStringForTokenCount);
      const modelContextWindow = await this.getContextWindowSize();
      const maxOutputTokens = maxOutputTokensConfig ?? this.config.maxTokens ?? 1024; // Default if not set
      const availableForInput = modelContextWindow - maxOutputTokens;

      this.logger.debug(
        `OpenRouterProvider (_validateInputTokens): Input tokens (approx): ${currentInputTokens}, Available for input: ${availableForInput} (Model Context: ${modelContextWindow}, Reserved for Output: ${maxOutputTokens}) for model ${this.config.model}. Context window source: ${this.config.modelParams?.context_length ? 'modelParams' : 'default fallback'}. Token count is an approximation.`
      );

      if (currentInputTokens > availableForInput) {
        const errorMsg = `Input prompt (approx. ${currentInputTokens} tokens) for OpenRouter structured completion exceeds model's available input token limit (${availableForInput} tokens). Model: ${this.config.model}, Total Context (potentially approx.): ${modelContextWindow}, Reserved for Output: ${maxOutputTokens}.`;
        this.logger.warn(errorMsg);
        return Result.err(new LLMProviderError(errorMsg, 'VALIDATION_ERROR', this.name));
      }
      return Result.ok(undefined);
    } catch (validationError: unknown) {
      const message = `Error during pre-call token validation in OpenRouterProvider: ${validationError instanceof Error ? validationError.message : String(validationError)}`;
      const errorToLog = validationError instanceof Error ? validationError : new Error(message);
      this.logger.error(message, errorToLog);
      return Result.err(
        new LLMProviderError(message, 'UNKNOWN_ERROR', this.name, { cause: errorToLog })
      );
    }
  }

  private async _performStructuredCallWithRetry<TOutput>(
    structuredModel: Runnable<BaseLanguageModelInput, TOutput>,
    promptInput: BaseLanguageModelInput,
    callOptions?: Partial<ChatOpenAICallOptions> // Changed to ChatOpenAICallOptions
  ): Promise<TOutput> {
    // Use modelParams for retry config if available, otherwise defaults
    // Helper to safely get numeric model parameters for retry logic
    const getNumConfigParam = (paramName: string, defaultValue: number): number => {
      const modelParams = this.config.modelParams || {}; // Ensure modelParams exists
      const val = modelParams[paramName];
      if (typeof val === 'number' && !isNaN(val)) return val;
      if (typeof val === 'string') {
        const parsed = parseFloat(val);
        if (!isNaN(parsed)) return parsed;
      }
      this.logger.debug(`Using default for retry param '${paramName}': ${defaultValue}`);
      return defaultValue;
    };

    const retryAttempts = getNumConfigParam('retryAttempts', 3);
    const initialDelay = getNumConfigParam('retryInitialDelayMs', 1000);
    const maxDelay = getNumConfigParam('retryMaxDelayMs', 30000);
    const factor = getNumConfigParam('retryFactor', 2);

    const RETRY_OPTIONS = {
      retries: retryAttempts,
      initialDelay: initialDelay,
      maxDelay: maxDelay,
      factor: factor,
      shouldRetry: (error: any): boolean => {
        const status = error?.status ?? error?.response?.status ?? error?.cause?.status; // Check wrapped errors too
        const retriableStatusCodes = [429, 500, 502, 503, 504];
        if (status && retriableStatusCodes.includes(Number(status))) {
          this.logger.warn(
            `OpenRouterProvider (_performStructuredCallWithRetry): Retriable API error (status ${status}) for model ${this.config.model}. Retrying... Error: ${error.message}`
          );
          return true;
        }
        return false;
      },
    };

    return retryWithBackoff(async () => {
      try {
        this.logger.debug(
          `OpenRouterProvider (_performStructuredCallWithRetry): Invoking structured model for ${this.config.model}. Options: ${JSON.stringify(callOptions)}`
        );
        // Fixed: Cast structuredModel to any to bypass potential signature mismatch due to unresolved types
        const response = await (structuredModel as any).invoke(promptInput, callOptions);
        return response;
      } catch (error: any) {
        const meta = {
          errorMessage: error.message,
          errorName: error.name,
          errorStatus: error.status,
          errorCode: error.code,
          errorResponseData: error.response?.data,
        };
        this.logger.warn(
          // Ensure this logger call is one argument or matches ILogger signature
          `OpenRouterProvider (_performStructuredCallWithRetry): API call attempt failed for model ${this.config.model}. Details: ${JSON.stringify(meta)}. Error: ${error instanceof Error ? error.message : String(error)}`
        );
        throw error;
      }
    }, RETRY_OPTIONS);
  }

  public async getStructuredCompletion<T extends z.ZodTypeAny>(
    prompt: BaseLanguageModelInput, // Changed to BaseLanguageModelInput
    schema: T,
    completionConfig?: LLMCompletionConfig // Uses imported LLMCompletionConfig
  ): Promise<Result<z.infer<T>, LLMProviderError>> {
    this.logger.debug(
      `OpenRouterProvider (getStructuredCompletion): Starting for model ${this.config.model}. Schema: ${schema.description || 'Unnamed Schema'}. Prompt type: ${typeof prompt === 'string' ? 'string' : 'object'}`
    );

    const maxOutputTokensForThisCall = completionConfig?.maxTokens ?? this.config.maxTokens;

    // _validateInputTokens now takes BaseLanguageModelInput
    const tokenValidationResult = await this._validateInputTokens(
      prompt, // Pass BaseLanguageModelInput directly
      maxOutputTokensForThisCall
    );
    if (tokenValidationResult.isErr()) {
      return Result.err<LLMProviderError>(tokenValidationResult.error!);
    }

    // langChainPromptInput is now the original prompt parameter
    // const langChainPromptInput: BaseLanguageModelInput = [new HumanMessage(prompt)]; // No longer needed if prompt is already BaseLanguageModelInput

    // Use this.model (ChatOpenAI configured for OpenRouter) withStructuredOutput
    // The success depends on the underlying OpenRouter model supporting function calling/tool use.
    let runnableToInvoke: Runnable<
      BaseLanguageModelInput,
      z.infer<T>
    > = this.model.withStructuredOutput(schema, {
      // Explicitly use ChatOpenAI
      name:
        schema.description || `extract_openrouter_data_${schema.constructor?.name || 'generic'}`,
    });

    // Prepare bindOptions (for constructor-level params) and runtimeCallOptions (for invoke-level params)
    const bindOptions: Partial<OpenRouterChatOpenAIParams> = {}; // Use OpenRouterChatOpenAIParams
    const runtimeCallOptions: Partial<ChatOpenAICallOptions> = {}; // Use ChatOpenAICallOptions

    if (completionConfig) {
      if (completionConfig.temperature !== undefined)
        bindOptions.temperature = completionConfig.temperature;
      if (completionConfig.maxTokens !== undefined)
        bindOptions.maxTokens = completionConfig.maxTokens; // Binds to model for this call
      if (completionConfig.topP !== undefined) bindOptions.topP = completionConfig.topP;

      if (completionConfig.stopSequences && completionConfig.stopSequences.length > 0) {
        runtimeCallOptions.stop = completionConfig.stopSequences;
      }
    }

    if (Object.keys(bindOptions).length > 0) {
      runnableToInvoke = (runnableToInvoke as any).bind(bindOptions as any); // Fixed: Cast to any
      this.logger.debug(
        `OpenRouterProvider (getStructuredCompletion): Bound temporary configurations for this call. Options: ${JSON.stringify(bindOptions)}`
      );
    }

    try {
      const parsedObject = await this._performStructuredCallWithRetry(
        runnableToInvoke,
        prompt, // Use the original prompt parameter
        runtimeCallOptions
      );

      this.logger.debug(
        `OpenRouterProvider (getStructuredCompletion): Successfully received structured response for model ${this.config.model}.`
      );
      return Result.ok(parsedObject);
    } catch (error: unknown) {
      const errorToLog = error instanceof Error ? error : new Error(String(error));
      this.logger.error(
        `OpenRouterProvider (getStructuredCompletion): Error for model ${this.config.model}`,
        errorToLog
      );

      if (error instanceof LLMProviderError) {
        return Result.err(error);
      }

      let errorCode: string = 'API_ERROR'; // Fixed: errorCode is string
      let message = `OpenRouter API error during structured completion: ${error instanceof Error ? error.message : String(error)}`;
      const cause = error instanceof Error ? error : new Error(String(error));
      let statusCode: number | undefined;
      const anyError = error as any;

      if (anyError.status && typeof anyError.status === 'number') statusCode = anyError.status;
      else if (anyError.response?.status && typeof anyError.response.status === 'number')
        statusCode = anyError.response.status;
      else if (anyError.cause?.status && typeof anyError.cause.status === 'number')
        statusCode = anyError.cause.status;

      if (anyError.response?.data?.error) {
        // OpenAI-like error structure from OpenRouter
        const apiError = anyError.response.data.error;
        message = `OpenRouter API Error: ${apiError.message} (Type: ${apiError.type || 'N/A'}, Code: ${apiError.code || 'N/A'})`;
        if (apiError.type === 'invalid_request_error') errorCode = 'VALIDATION_ERROR';
        else if (apiError.type === 'insufficient_quota') errorCode = 'RATE_LIMIT_ERROR';
        else if (apiError.code === 'context_length_exceeded') errorCode = 'VALIDATION_ERROR';
      } else if (anyError.message?.toLowerCase().includes('context_length_exceeded')) {
        errorCode = 'VALIDATION_ERROR';
      }

      if (statusCode) {
        if (statusCode === 400) errorCode = 'VALIDATION_ERROR';
        else if (statusCode === 401) errorCode = 'AUTHENTICATION_ERROR';
        else if (statusCode === 403) errorCode = 'AUTHENTICATION_ERROR';
        else if (statusCode === 429) errorCode = 'RATE_LIMIT_ERROR';
        else if (statusCode >= 500) errorCode = 'API_ERROR';
      }

      // Check if the error message indicates lack of support for structured output/tool calling
      // This is a common failure mode if the underlying model doesn't support it.
      const lowerCaseMessage = message.toLowerCase();
      if (
        lowerCaseMessage.includes('tool') ||
        lowerCaseMessage.includes('function calling') ||
        lowerCaseMessage.includes('structured output') ||
        lowerCaseMessage.includes('json mode')
      ) {
        if (
          errorCode === 'API_ERROR' ||
          errorCode === 'UNKNOWN_ERROR' ||
          errorCode === 'VALIDATION_ERROR'
        ) {
          // If the error is already specific, keep it, otherwise mark as NOT_IMPLEMENTED
          // if the model itself is the issue.
          if (!lowerCaseMessage.includes('schema') && !lowerCaseMessage.includes('parse')) {
            // Avoid overriding parsing errors
            errorCode = 'NOT_IMPLEMENTED';
            this.logger.warn(
              `Model ${this.config.model} may not support structured output (tool/function calling) or the provided schema is incompatible. Error: ${message}`
            );
          }
        }
      }

      return Result.err(new LLMProviderError(message, errorCode, this.name, { cause, statusCode }));
    }
  }
}
