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
   * Parses and validates JSON from LLM response against projectContextSchema
   */
  parseLlmResponse<T>(response: string): Result<T, Error> {
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

      // Apply defaults before validation to handle potential nulls from LLM
      this.applyProjectContextDefaults(parsed);

      // Validate against projectContextSchema
      const schema = this.jsonSchemaHelper.getProjectContextSchema();
      const validationResult = this.jsonSchemaHelper.validateJson(JSON.stringify(parsed), schema);

      if (validationResult.isErr()) {
        const errorMsg = validationResult.error?.message || 'Unknown validation error';
        this.logger.warn(`Invalid ProjectContext: ${errorMsg}`);
        return Result.err(new Error(`Invalid ProjectContext: ${errorMsg}`));
      }

      this.logger.debug('ProjectContext validated successfully');

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

  /**
   * Applies default values to specific fields of the parsed ProjectContext object
   * before schema validation to prevent errors due to null/undefined values.
   * Modifies the object in place.
   * @param parsedData The parsed JSON object from the LLM response.
   */
  private applyProjectContextDefaults(parsedData: any): void {
    if (!parsedData) {
      this.logger.warn('Attempted to apply defaults to null/undefined parsedData');
      return;
    }

    // Ensure parent 'structure' object exists
    if (!parsedData.structure) {
      this.logger.debug('Initializing missing structure object in parsed LLM response');
      parsedData.structure = {};
    }

    // Apply default to structure.testDir
    if (
      parsedData.structure.testDir === null ||
      typeof parsedData.structure.testDir === 'undefined'
    ) {
      this.logger.debug('Defaulting null/undefined structure.testDir to empty string');
      parsedData.structure.testDir = '';
    }

    // Apply default to structure.componentStructure
    if (
      parsedData.structure.componentStructure === null ||
      typeof parsedData.structure.componentStructure === 'undefined'
    ) {
      this.logger.debug('Defaulting null/undefined structure.componentStructure to empty object');
      parsedData.structure.componentStructure = {};
    }

    // Ensure parent 'dependencies' object exists
    if (!parsedData.dependencies) {
      this.logger.debug('Initializing missing dependencies object in parsed LLM response');
      parsedData.dependencies = {};
    }

    // Apply default to dependencies.internalDependencies
    if (
      parsedData.dependencies.internalDependencies === null ||
      typeof parsedData.dependencies.internalDependencies === 'undefined'
    ) {
      this.logger.debug(
        'Defaulting null/undefined dependencies.internalDependencies to empty object'
      );
      parsedData.dependencies.internalDependencies = {};
    }
  }
}
