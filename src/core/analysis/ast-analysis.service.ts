// src/core/analysis/ast-analysis.service.ts
import { z, ZodType } from 'zod';
import {
  IAstAnalysisService,
  CodeInsights,
  FunctionInfo,
  ClassInfo,
  ImportInfo,
} from './ast-analysis.interfaces';
import { GenericAstNode } from './types';
import { Result } from '../result/result';
import { ILLMAgent } from '../llm/interfaces';
import { ILogger } from '../services/logger-service';
import { Injectable, Inject } from '../di/decorators';
import { RooCodeError } from '../errors'; // Assuming RooCodeError exists and is appropriate

/**
 * Zod schema for validating FunctionInfo objects.
 * Ensures the object has a 'name' (string) and 'parameters' (array of strings).
 */
const functionInfoSchema: ZodType<FunctionInfo> = z.object({
  name: z.string(),
  parameters: z.array(z.string()),
});

/**
 * Zod schema for validating ClassInfo objects.
 * Ensures the object has a 'name' (string).
 */
const classInfoSchema: ZodType<ClassInfo> = z.object({
  name: z.string(),
});

/**
 * Zod schema for validating ImportInfo objects.
 * Ensures the object has a 'source' (string).
 */
const importInfoSchema: ZodType<ImportInfo> = z.object({
  source: z.string(),
});

/**
 * Zod schema for validating the overall CodeInsights structure.
 * Uses the specific schemas for functions, classes, and imports.
 */
const codeInsightsSchema: ZodType<CodeInsights> = z.object({
  functions: z.array(functionInfoSchema),
  classes: z.array(classInfoSchema),
  imports: z.array(importInfoSchema),
});

/**
 * Service responsible for analyzing Abstract Syntax Tree (AST) data using an LLM
 * to extract structured code insights.
 */
@Injectable() // Removed argument 'IAstAnalysisService'
export class AstAnalysisService implements IAstAnalysisService {
  /**
   * Initializes a new instance of the AstAnalysisService.
   * @param llmAgent The LLM agent for making API calls.
   * @param logger The logger service for logging messages.
   */
  constructor(
    @Inject('ILLMAgent') private readonly llmAgent: ILLMAgent,
    @Inject('ILogger') private readonly logger: ILogger
  ) {}

  /**
   * Analyzes the provided AST data for a file using an LLM.
   * Constructs a prompt, calls the LLM, parses and validates the response.
   * @param astData The generic AST node representing the file's structure.
   * @param filePath The path of the file being analyzed.
   * @returns A Result containing the extracted CodeInsights on success, or an Error on failure.
   */
  async analyzeAst(
    astData: GenericAstNode,
    filePath: string
  ): Promise<Result<CodeInsights, Error>> {
    this.logger.debug(`Analyzing AST for file: ${filePath}`);

    try {
      const systemPromptBase = this.buildPrompt();
      const astDataJsonString = JSON.stringify(astData);
      // Replace placeholder AFTER getting the base prompt
      const systemPrompt = systemPromptBase.replace('{{AST_DATA_JSON}}', astDataJsonString);
      // Use an empty user prompt as the data is now in the system prompt
      const userPrompt = '';

      // Optional: Add token counting check here if needed later
      // const tokenCount = await this.llmAgent.countTokens(systemPrompt + userPrompt);
      // if (tokenCount > MAX_TOKENS) return Result.err(...)

      const completionResult = await this.llmAgent.getCompletion(systemPrompt, userPrompt);

      if (completionResult.isErr()) {
        // Ensure error exists before accessing message and returning
        const error = completionResult.error ?? new Error('Unknown LLM Agent Error');
        this.logger.error(`LLM call failed for ${filePath}: ${error.message}`);
        return Result.err(error);
      }

      // If isOk(), value should be defined per Result contract
      const rawResponse = completionResult.value!;
      let parsedJson: unknown;

      try {
        // Clean potential markdown fences before parsing
        const cleanedResponse = rawResponse.replace(/```json\n?([\s\S]*?)\n?```/g, '$1').trim();
        if (!cleanedResponse) {
          throw new Error('LLM returned an empty response after cleaning markdown fences.');
        }
        parsedJson = JSON.parse(cleanedResponse);
      } catch (parseError) {
        this.logger.warn(
          `Failed to parse LLM JSON response for ${filePath}: ${parseError instanceof Error ? parseError.message : String(parseError)}`
        );
        this.logger.debug(`Raw response for ${filePath}:\n${rawResponse}`);
        // Adjust RooCodeError call - assuming constructor is (message: string, code?: string, options?: { cause?: unknown })
        const errorMessage = `Invalid JSON response from LLM for ${filePath}. Parse Error: ${parseError instanceof Error ? parseError.message : String(parseError)}`;
        return Result.err(
          new RooCodeError(errorMessage, 'LLM_JSON_PARSE_ERROR', { cause: parseError })
        );
      }

      const validationResult = codeInsightsSchema.safeParse(parsedJson);

      if (!validationResult.success) {
        this.logger.warn(
          `LLM response validation failed for ${filePath}: ${validationResult.error.message}`
        );
        // Log the specific validation issues
        this.logger.debug(
          `Validation issues for ${filePath}: ${JSON.stringify(validationResult.error.issues, null, 2)}`
        );
        // Log the JSON that failed validation
        this.logger.debug(
          `Parsed JSON for ${filePath} (failed validation):\n${JSON.stringify(parsedJson, null, 2)}`
        );
        // Adjust RooCodeError call - include Zod issues in message and pass cause
        const validationIssues = JSON.stringify(validationResult.error.issues, null, 2);
        const errorMessage = `LLM response failed schema validation for ${filePath}. Issues: ${validationIssues}`;
        return Result.err(
          new RooCodeError(errorMessage, 'LLM_SCHEMA_VALIDATION_ERROR', {
            cause: validationResult.error,
          })
        );
      }

      this.logger.debug(`Successfully analyzed and validated AST insights for ${filePath}`);
      return Result.ok(validationResult.data);
    } catch (error) {
      // Catch any unexpected errors during the process
      const errorMessage = `Unexpected error during AST analysis for ${filePath}: ${error instanceof Error ? error.message : String(error)}`;
      // Pass the error object itself to the logger for potential stack trace logging
      this.logger.error(errorMessage, error instanceof Error ? error : undefined);
      // Adjust RooCodeError call
      return Result.err(
        new RooCodeError(errorMessage, 'UNEXPECTED_ANALYSIS_ERROR', { cause: error })
      );
    }
  }

  /**
   * Constructs the system prompt for the LLM to analyze AST data.
   * Includes instructions, schema definition, and a few-shot example.
   * @returns The system prompt string with the {{AST_DATA_JSON}} placeholder.
   */
  private buildPrompt(): string {
    // Implementation provided by Junior Coder - assumed correct based on review
    const prompt = `
        ### Instruction ###
        Analyze the provided JSON AST ('astData') representing a source code file. Extract all top-level function definitions, class definitions, and import statements.
        The 'astData' has nodes with a 'type' property (e.g., 'function_definition', 'class_definition', 'import_statement', 'identifier', 'formal_parameters', 'string_literal') and a 'children' array.
        - Function names are typically in an 'identifier' node within 'function_definition'.
        - Parameters are within 'formal_parameters' -> 'parameter_declaration' -> 'identifier'.
        - Class names are typically in an 'identifier' node within 'class_definition'.
        - Import sources are typically in a 'string_literal' or similar node within 'import_statement'.

        Return the results ONLY as a valid JSON object matching the following TypeScript interface. Do NOT include any other text, explanations, or markdown formatting.

        \`\`\`typescript
        interface FunctionInfo {
          name: string;
          parameters: string[];
        }

        interface ClassInfo {
          name: string;
        }

        interface ImportInfo {
          source: string;
        }

        interface CodeInsights {
          functions: FunctionInfo[];
          classes: ClassInfo[];
          imports: ImportInfo[];
        }
        \`\`\`

        ### Example Input ('astData' Snippet) ###

        \`\`\`json
        {
          "type": "program",
          "children": [
            {
              "type": "import_statement",
              "children": [
                { "type": "import_clause", "children": [...] },
                { "type": "string_literal", "text": "'react'" }
              ]
            },
            {
              "type": "function_definition",
              "children": [
                { "type": "identifier", "text": "calculateTotal" },
                {
                  "type": "formal_parameters",
                  "children": [
                    { "type": "parameter_declaration", "children": [{ "type": "identifier", "text": "price" }] },
                    { "type": "parameter_declaration", "children": [{ "type": "identifier", "text": "quantity" }] }
                  ]
                },
                { "type": "block", "children": [] }
              ]
            },
            {
              "type": "class_definition",
              "children": [
                { "type": "identifier", "text": "Product" },
                { "type": "class_body", "children": [] }
              ]
            }
          ]
        }
        \`\`\`

        ### Example Output (JSON only) ###

        \`\`\`json
        {
          "functions": [{ "name": "calculateTotal", "parameters": ["price", "quantity"] }],
          "classes": [{ "name": "Product" }],
          "imports": [{ "source": "react" }]
        }
        \`\`\`

        ### Input 'astData' ###

        \`\`\`json
        {{AST_DATA_JSON}}
        \`\`\`

        ### Output (JSON only) ###

        \`\`\`
        `; // Note: Removed the final json backticks here as they were in the original plan but might cause issues. LLM should provide them.

    // The placeholder {{AST_DATA_JSON}} will be replaced dynamically in the analyzeAst method.
    return prompt;
  }
}
