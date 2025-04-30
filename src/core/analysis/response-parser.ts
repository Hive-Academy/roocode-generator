import { Inject, Injectable } from '../di';
import { Result } from '../result/result';
import { ILogger } from '../services/logger-service';
import { IJsonSchemaHelper } from './json-schema-helper';

@Injectable()
export class ResponseParser {
  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    @Inject('IJsonSchemaHelper') private readonly jsonSchemaHelper: IJsonSchemaHelper
  ) {}

  /**
   * Cleans, validates, and parses JSON from LLM response with error recovery
   */
  parseJSON<T>(response: string): Result<T, Error> {
    try {
      // Pre-process and clean the response
      const cleaned = this.cleanResponse(response);

      // Find JSON-like structure
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn('No JSON structure found in response');
        return Result.err(new Error('No JSON structure found in response'));
      }

      let jsonStr = jsonMatch[0];

      // Attempt to repair common JSON issues
      const repairResult = this.jsonSchemaHelper.repairJson(jsonStr);
      if (repairResult.isErr()) {
        const errorMsg =
          repairResult.error instanceof Error ? repairResult.error.message : 'Unknown repair error';
        this.logger.warn(`JSON repair failed: ${errorMsg}`);
        // Continue with original JSON if repair fails
      } else if (repairResult.value) {
        jsonStr = repairResult.value;
        this.logger.debug('JSON successfully repaired');
      }

      // Parse JSON
      const parsed = JSON.parse(jsonStr);

      // Validate against schema
      const schema = this.jsonSchemaHelper.getLlmResponseSchema();
      const validationResult = this.jsonSchemaHelper.validateJson(JSON.stringify(parsed), schema);

      if (validationResult.isErr()) {
        const errorMsg =
          validationResult.error instanceof Error
            ? validationResult.error.message
            : 'Schema validation failed';
        this.logger.error(`Schema validation failed: ${errorMsg}`);
        return Result.err(new Error(`Invalid JSON structure: ${errorMsg}`));
      }

      return Result.ok(parsed as T);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? `Failed to parse LLM response: ${error.message}`
          : 'Failed to parse LLM response: Unknown error';
      this.logger.error(errorMessage, {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: response,
        name: error instanceof Error ? error.name : 'Unknown error',
      });
      return Result.err(new Error(errorMessage));
    }
  }

  /**
   * Cleans response text by removing markdown and code formatting
   */
  private cleanResponse(response: string): string {
    let cleaned = response;

    // Remove markdown code fences with language specifier
    cleaned = cleaned.replace(/```[a-z]*\n/g, '');

    // Remove remaining code fences
    cleaned = cleaned.replace(/```/g, '');

    // Remove inline code backticks
    cleaned = cleaned.replace(/`/g, '');

    // Trim whitespace
    cleaned = cleaned.trim();

    return cleaned;
  }
}
