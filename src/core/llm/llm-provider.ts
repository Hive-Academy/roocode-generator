import { Injectable, Inject } from "../di/decorators";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { ILLMProvider } from "./interfaces";
import { Result } from "../result/result";

export interface LLMProviderConfig {
  modelName: string;
  temperature: number;
  apiKey: string;
}

/**
 * Base class for LLM providers.
 * Each provider implementation should extend this class and implement getCompletion.
 */
@Injectable()
export abstract class BaseLLMProvider implements ILLMProvider {
  abstract readonly name: string;

  abstract getCompletion(systemPrompt: string, userPrompt: string): Promise<Result<string, Error>>;
}

/**
 * OpenAI LLM Provider implementation.
 */
@Injectable()
export class OpenAILLMProvider extends BaseLLMProvider {
  public readonly name = "openai";

  private model: ChatOpenAI;

  constructor(
    @Inject("OpenAIConfig") private readonly config: LLMProviderConfig,
    @Inject("OpenAIClientFactory") private readonly clientFactory: () => ChatOpenAI
  ) {
    super();
    this.model = this.clientFactory();
  }

  async getCompletion(systemPrompt: string, userPrompt: string): Promise<Result<string, Error>> {
    try {
      const response = await this.model.predict(`${systemPrompt}\n\nUser Input: ${userPrompt}`);
      return Result.ok(response);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error("OpenAI LLMProvider error"));
    }
  }
}

/**
 * Google GenAI LLM Provider implementation.
 */
@Injectable()
export class GoogleGenAILLMProvider extends BaseLLMProvider {
  public readonly name = "google-genai";

  private model: ChatGoogleGenerativeAI;

  constructor(
    @Inject("GoogleGenAIConfig") private readonly config: LLMProviderConfig,
    @Inject("GoogleGenAIClientFactory") private readonly clientFactory: () => ChatGoogleGenerativeAI
  ) {
    super();
    this.model = this.clientFactory();
  }

  async getCompletion(systemPrompt: string, userPrompt: string): Promise<Result<string, Error>> {
    try {
      const response = await this.model.predict(`${systemPrompt}\n\nUser Input: ${userPrompt}`);
      return Result.ok(response);
    } catch (error) {
      return Result.err(
        error instanceof Error ? error : new Error("Google GenAI LLMProvider error")
      );
    }
  }
}

/**
 * Anthropic LLM Provider implementation.
 */
@Injectable()
export class AnthropicLLMProvider extends BaseLLMProvider {
  public readonly name = "anthropic";

  private model: ChatAnthropic;

  constructor(
    @Inject("AnthropicConfig") private readonly config: LLMProviderConfig,
    @Inject("AnthropicClientFactory") private readonly clientFactory: () => ChatAnthropic
  ) {
    super();
    this.model = this.clientFactory();
  }

  async getCompletion(systemPrompt: string, userPrompt: string): Promise<Result<string, Error>> {
    try {
      const response = await this.model.predict(`${systemPrompt}\n\nUser Input: ${userPrompt}`);
      return Result.ok(response);
    } catch (error) {
      return Result.err(error instanceof Error ? error : new Error("Anthropic LLMProvider error"));
    }
  }
}
