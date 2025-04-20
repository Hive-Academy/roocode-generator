import { ILLMProvider } from "./interfaces";
import { Result } from "../result/result";
import { Injectable, Inject } from "../di/decorators";

/**
 * Registry to manage multiple LLM providers.
 * Allows resolving a provider by name.
 */
@Injectable()
export class LLMProviderRegistry {
  private providers: Map<string, ILLMProvider>;

  constructor(@Inject("ILLMProvider") providers: ILLMProvider[]) {
    this.providers = new Map();
    for (const provider of providers) {
      // Assume each provider has a unique 'name' property
      // This requires ILLMProvider to have a 'name' property or method
      if ("name" in provider && typeof (provider as any).name === "string") {
        const providerName: string = (provider as any).name;
        this.providers.set(providerName, provider);
      }
    }
  }

  /**
   * Get a provider by name.
   * @param name Provider name
   * @returns Result with provider or error if not found
   */
  public getProvider(name: string): Result<ILLMProvider, Error> {
    const provider = this.providers.get(name);
    if (!provider) {
      return Result.err(new Error(`LLM Provider '${name}' not found`));
    }
    return Result.ok(provider);
  }
}
