import { Injectable, Inject } from '@core/di/decorators';
import { Result } from '@core/result/result';
import { BaseLLMProvider } from '@core/llm/llm-provider';
import { LLMProviderError } from '@core/llm/llm-provider-errors';
import type { ILogger } from '@core/services/logger-service';
import { LLMConfig } from 'types/shared';
import { ChatAnthropic, type AnthropicInput } from '@langchain/anthropic';
import { z } from 'zod';
import { retryWithBackoff } from '@core/utils/retry-utils';
import type { BaseLanguageModelInput } from '@langchain/core/language_models/base';
import { LLMCompletionConfig } from '../interfaces'; // Import from interfaces

type AnthropicTokenCountResponse = {
  total_tokens: number;
};
@Injectable()
export class AnthropicProvider extends BaseLLMProvider {
  public readonly name = 'anthropic';
  private model: ChatAnthropic;

  constructor(
    private readonly config: LLMConfig,
    @Inject('ILogger') private readonly logger: ILogger,
    private readonly clientFactory: () => ChatAnthropic
  ) {
    super();
    this.defaultContextSize = 100000; // Claude has a large context window
    const model = this.clientFactory();
    model.temperature = this.config.temperature;
    model.modelName = this.config.model;
    if (typeof this.config.maxTokens === 'number') {
      model.maxTokens = this.config.maxTokens; // Corrected based on research
    }
    this.model = model;
  }

  async getCompletion(
    systemPrompt: string,
    userPrompt: string
  ): Promise<Result<string, LLMProviderError>> {
    try {
      this.logger.debug(`Sending completion request to Anthropic (model: ${this.config.model})`);
      const response = await this.model.predict(`${systemPrompt}\n\nUser Input: ${userPrompt}`);
      return Result.ok(response);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to get completion from Anthropic', err);
      return Result.err(LLMProviderError.fromError(error, this.name));
    }
  }

  async getContextWindowSize(): Promise<number> {
    return Promise.resolve(this.defaultContextSize);
  }

  async countTokens(text: string): Promise<number> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages/count_tokens', {
        method: 'POST',
        headers: {
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          text: text,
        }),
      });

      if (!response.ok) {
        this.logger.warn(
          `Failed to count tokens for Anthropic model ${this.config.model}, using approximation`
        );
        return Promise.resolve(Math.ceil(text.length / 4));
      }

      const data = (await response.json()) as AnthropicTokenCountResponse;
      const tokenCount = data?.total_tokens || Math.ceil(text.length / 4);
      return Promise.resolve(tokenCount);
    } catch (error: any) {
      this.logger.warn(
        `Failed to count tokens for Anthropic model ${this.config.model}, using approximation: ${error?.message}`
      );
      return Promise.resolve(Math.ceil(text.length / 4));
    }
  }

  async getStructuredCompletion<T extends z.ZodTypeAny>(
    prompt: BaseLanguageModelInput,
    schema: T,
    completionConfig?: LLMCompletionConfig
  ): Promise<Result<z.infer<T>, LLMProviderError>> {
    const validationResult = await this._validateInputTokens(prompt, completionConfig);
    if (validationResult.isErr()) {
      // Explicitly type the error argument for Result.err and use non-null assertion
      return Result.err<LLMProviderError>(validationResult.error!);
    }

    // _performStructuredCallWithRetry will now take prompt and completionConfig
    const callResult = await this._performStructuredCallWithRetry(prompt, schema, completionConfig);
    if (callResult.isErr()) {
      // Explicitly type the error argument for Result.err and use non-null assertion
      return Result.err<LLMProviderError>(callResult.error!);
    }
    return Result.ok(callResult.value);
  }

  private async _validateInputTokens(
    prompt: BaseLanguageModelInput,
    completionConfig?: LLMCompletionConfig
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
            `AnthropicProvider: promptStringForTokenCount fell back to JSON.stringify. Output: ${promptStringForTokenCount.substring(0, 100)}...`
          );
        }
      } catch (e) {
        promptStringForTokenCount = '';
        this.logger.warn(
          `AnthropicProvider: promptStringForTokenCount could not be stringified, falling back to empty string. Error: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }

    try {
      const currentInputTokens = await this.countTokens(promptStringForTokenCount);
      // Use model's maxTokens if available, then config, then a default for reserved output.
      // Anthropic's context window is usually large, so focus on input not exceeding it minus a buffer.
      const maxOutputTokensForThisCall =
        completionConfig?.maxTokens ?? this.config.maxTokens ?? this.model.maxTokens ?? 2048;
      const limit = this.defaultContextSize; // Anthropic's total context window
      const availableForInput = limit - maxOutputTokensForThisCall;

      this.logger.debug(
        `AnthropicProvider: Structured Input tokens: ${currentInputTokens}, Available for input: ${availableForInput} (Model Context: ${limit}, Reserved for Output: ${maxOutputTokensForThisCall}) for model ${this.config.model}`
      );

      if (currentInputTokens > availableForInput) {
        const errorMsg = `Input (${currentInputTokens} tokens) for Anthropic structured completion exceeds model's available input token limit (${availableForInput}). Model: ${this.config.model}, Total Context: ${limit}, Reserved for Output: ${maxOutputTokensForThisCall}.`;
        this.logger.warn(errorMsg);
        return Result.err(new LLMProviderError(errorMsg, 'VALIDATION_ERROR', this.name));
      }
      return Result.ok(undefined);
    } catch (validationError) {
      const message = `Error during pre-call token validation in AnthropicProvider: ${validationError instanceof Error ? validationError.message : String(validationError)}`;
      const errorToLog = validationError instanceof Error ? validationError : new Error(message);
      this.logger.error(message, errorToLog);
      return Result.err(
        new LLMProviderError(message, 'UNKNOWN_ERROR', this.name, { cause: errorToLog })
      );
    }
  }

  private async _performStructuredCallWithRetry<T extends z.ZodTypeAny>(
    prompt: BaseLanguageModelInput, // Changed from combinedPromptContent
    schema: T,
    completionConfig?: LLMCompletionConfig // Added completionConfig
  ): Promise<Result<z.infer<T>, LLMProviderError>> {
    try {
      this.logger.debug(
        `Sending structured completion request to Anthropic (model: ${this.config.model}) with schema and retry. Prompt type: ${typeof prompt === 'string' ? 'string' : 'object'}`
      );

      let modelToInvoke = this.model;

      // Apply per-call configurations if any
      const bindOptions: Partial<AnthropicInput> = {}; // AnthropicInput is from @langchain/anthropic
      if (completionConfig) {
        if (completionConfig.temperature !== undefined)
          bindOptions.temperature = completionConfig.temperature;
        if (completionConfig.maxTokens !== undefined)
          bindOptions.maxTokens = completionConfig.maxTokens; // maps to max_tokens_to_sample or maxTokens
        if (completionConfig.topP !== undefined) bindOptions.topP = completionConfig.topP;
        // Anthropic specific: topK
        // if (completionConfig.topK !== undefined) bindOptions.topK = completionConfig.topK;
        if (completionConfig.stopSequences && completionConfig.stopSequences.length > 0) {
          // For ChatAnthropic, stop sequences are usually part of the prompt or handled by the model directly.
          // If specific binding is needed, it would be:
          // bindOptions.stop = completionConfig.stopSequences; // Check ChatAnthropic documentation for exact field name
          this.logger.warn(
            'AnthropicProvider: stopSequences via completionConfig might not be directly bindable in the same way as OpenAI. Ensure prompt guides stopping.'
          );
        }
      }

      if (Object.keys(bindOptions).length > 0) {
        modelToInvoke = modelToInvoke.bind(bindOptions) as ChatAnthropic;
        this.logger.debug(
          `AnthropicProvider: Bound temporary configurations for this call. Options: ${JSON.stringify(bindOptions)}`
        );
      }

      const structuredModel = modelToInvoke.withStructuredOutput(schema, {
        name: schema.description || `extract_${schema.constructor?.name || 'data'}`,
      });

      const RETRY_OPTIONS = {
        retries: (this.config as any).retryAttempts ?? 3,
        initialDelay: (this.config as any).retryInitialDelayMs ?? 1000,
        maxDelay: (this.config as any).retryMaxDelayMs ?? 30000,
        factor: (this.config as any).retryFactor ?? 2,
        shouldRetry: (error: any): boolean => {
          const status = error?.status ?? error?.response?.status;
          if (status === 429 || status === 500 || status === 503 || status === 529) {
            // 529 is specific to Anthropic for overload
            this.logger.warn(
              `AnthropicProvider: Retriable API error (status ${status}) for model ${this.config.model}. Retrying... Error: ${error.message}`
            );
            return true;
          }
          // Add more specific Anthropic error codes if known
          return false;
        },
      };

      const response = await retryWithBackoff(
        () => structuredModel.invoke(prompt), // Pass the original prompt
        RETRY_OPTIONS
      );

      return Result.ok(response);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to get structured completion from Anthropic after retries', err);
      if (error instanceof LLMProviderError) {
        return Result.err(error);
      }
      return Result.err(LLMProviderError.fromError(err, this.name));
    }
  }
}
