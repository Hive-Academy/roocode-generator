import { Inject, Injectable } from '../di';
import { Result } from '../result/result';
import { ILogger } from '../services/logger-service';
import { IJsonSchemaHelper } from './json-schema-helper';
import { parseRobustJson } from '../utils/json-utils'; // Import the new utility

@Injectable()
export class ResponseParser {
  constructor(
    @Inject('ILogger') private readonly logger: ILogger,
    @Inject('IJsonSchemaHelper') private readonly jsonSchemaHelper: IJsonSchemaHelper
  ) {}

  /**
   * Parses and validates JSON from LLM response against projectContextSchema
   */
  async parseLlmResponse<T>(response: string): Promise<Result<T, Error>> {
    // Make async
    try {
      // Pre-process and clean the response
      const cleaned = this.cleanResponse(response);

      // Find JSON-like structure
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn('No JSON structure found in response');
        return Result.err(new Error('No JSON structure found in response'));
      }

      const jsonStr = jsonMatch[0];

      // REMOVED redundant repair logic using jsonSchemaHelper

      // Parse JSON robustly using the new utility
      const parsed = await parseRobustJson<T>(jsonStr, this.logger); // Use await and pass logger

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
    if (!parsedData || typeof parsedData !== 'object') {
      this.logger.warn('Attempted to apply defaults to null, undefined, or non-object parsedData');
      return;
    }

    // Default for techStack
    if (parsedData.techStack === null || typeof parsedData.techStack === 'undefined') {
      this.logger.debug('Initializing missing techStack object in parsed LLM response');
      parsedData.techStack = {};
    }
    // Ensure techStack is an object before trying to default its properties
    if (typeof parsedData.techStack === 'object' && parsedData.techStack !== null) {
      const ts = parsedData.techStack;
      if (ts.languages === null || typeof ts.languages === 'undefined') ts.languages = [];
      if (ts.frameworks === null || typeof ts.frameworks === 'undefined') ts.frameworks = [];
      if (ts.buildTools === null || typeof ts.buildTools === 'undefined') ts.buildTools = [];
      if (ts.testingFrameworks === null || typeof ts.testingFrameworks === 'undefined')
        ts.testingFrameworks = [];
      if (ts.linters === null || typeof ts.linters === 'undefined') ts.linters = [];
      if (ts.packageManager === null || typeof ts.packageManager === 'undefined')
        ts.packageManager = ''; // Or 'npm'
    }

    // Default for packageJson
    if (parsedData.packageJson === null || typeof parsedData.packageJson === 'undefined') {
      this.logger.debug('Initializing missing packageJson object in parsed LLM response');
      parsedData.packageJson = {};
    }
    // Ensure packageJson is an object before trying to default its properties
    if (typeof parsedData.packageJson === 'object' && parsedData.packageJson !== null) {
      const pj = parsedData.packageJson;
      if (pj.dependencies === null || typeof pj.dependencies === 'undefined') pj.dependencies = {};
      if (pj.devDependencies === null || typeof pj.devDependencies === 'undefined')
        pj.devDependencies = {};
      if (pj.peerDependencies === null || typeof pj.peerDependencies === 'undefined')
        pj.peerDependencies = {};
    }

    // Default for codeInsights
    if (parsedData.codeInsights === null || typeof parsedData.codeInsights === 'undefined') {
      this.logger.debug('Initializing missing codeInsights object in parsed LLM response');
      parsedData.codeInsights = {};
    }

    // projectRootPath is a required string, schema validation will catch if it's missing/wrong type.
    // No specific default applied here for it, assuming it should generally be present.
  }
}
