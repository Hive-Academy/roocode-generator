import { Inject, Injectable } from "../di";
import { Result } from "../result/result";
import { ILogger } from "../services/logger-service";

@Injectable()
export class ResponseParser {
  constructor(@Inject("ILogger") private readonly logger: ILogger) {}

  /**
   * Cleans and parses JSON from LLM response
   */
  parseJSON<T>(response: string): Result<T, Error> {
    try {
      // Remove markdown code fences and formatting
      let cleaned = response.replace(/```[a-z]*\n/g, "");
      cleaned = cleaned.replace(/```/g, "");
      cleaned = cleaned.replace(/`/g, "");

      // Find JSON-like structure
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return Result.err(new Error("No JSON structure found in response"));
      }

      // Parse JSON
      const parsed = JSON.parse(jsonMatch[0]);

      // Basic structure validation
      if (typeof parsed !== "object" || parsed === null) {
        return Result.err(new Error("Invalid JSON structure"));
      }

      return Result.ok(parsed as T);
    } catch (error: any) {
      this.logger.error(`JSON parsing failed: ${error}`);
      return Result.err(new Error(`Failed to parse LLM response: ${error.message}`));
    }
  }
}
