import { IPromptBuilder } from "./interfaces";
import { ILogger } from "../core/services/logger-service";
import { Result } from "../core/result/result";
import { Injectable, Inject } from "../core/di/decorators";

@Injectable()
export class PromptBuilder implements IPromptBuilder {
  constructor(@Inject("ILogger") private readonly logger: ILogger) {}

  buildPrompt(
    baseInstruction: string,
    projectContext: string,
    templateContent: string
  ): Result<string, Error> {
    try {
      const prompt = `${baseInstruction}\n\nContext:\n${projectContext}\n\nTemplate:\n${templateContent}`;
      return Result.ok(prompt);
    } catch (error) {
      return Result.err(
        new Error(
          `Error building prompt: ${error instanceof Error ? error.message : String(error)}`
        )
      );
    }
  }
}
