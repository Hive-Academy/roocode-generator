// src/core/analysis/ast-analysis.service.ts
import { z, ZodType } from 'zod';
import {
  IAstAnalysisService,
  CodeInsights,
  FunctionInfo,
  ClassInfo,
  ImportInfo,
} from './ast-analysis.interfaces';
import { GenericAstNode } from './types'; // Ensure this path is correct
import { Result } from '../result/result';
import { ILLMAgent } from '../llm/interfaces';
import { ILogger } from '../services/logger-service';
import { Injectable, Inject } from '../di/decorators';
import { RooCodeError } from '../errors';
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
 * Represents the condensed structure extracted from the AST.
 * This is used as input for the LLM prompt.
 */
interface CondensedAst {
  imports: { source: string }[];
  functions: { name: string; params: string[] }[];
  classes: { name: string }[];
}

/**
 * Service responsible for analyzing Abstract Syntax Tree (AST) data.
 * It first condenses the AST and then uses an LLM to extract structured code insights
 * from the condensed representation.
 */
@Injectable()
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
   * Analyzes the provided AST data for a file by first condensing it and then using an LLM.
   * Constructs a prompt with the condensed AST, calls the LLM, parses and validates the response.
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
      // Step 1: Condense the AST
      const condensedAst = this._condenseAst(astData);
      const condensedAstJson = JSON.stringify(condensedAst, null, 2); // Pretty print for prompt clarity

      // Optional: Log the condensed AST for debugging
      // this.logger.debug(`Condensed AST for ${filePath}:\n${condensedAstJson}`);

      // Step 2: Build the prompt using the condensed AST JSON
      const systemPrompt = this.buildPrompt(condensedAstJson);
      const userPrompt = ''; // User prompt remains empty as data is in system prompt

      // Optional: Add token counting check here if needed later
      // const tokenCount = await this.llmAgent.countTokens(systemPrompt + userPrompt);
      // if (tokenCount > MAX_TOKENS) return Result.err(...)

      // Step 3: Call the LLM
      const completionResult = await this.llmAgent.getCompletion(systemPrompt, userPrompt);

      if (completionResult.isErr()) {
        // Ensure error exists before accessing message and returning
        const error = completionResult.error ?? new Error('Unknown LLM Agent Error');
        this.logger.error(`LLM call failed for ${filePath}: ${error.message}`);
        return Result.err(error);
      }

      // Step 4: Parse and Validate the LLM Response
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
        const errorMessage = `Invalid JSON response from LLM for ${filePath}. Parse Error: ${parseError instanceof Error ? parseError.message : String(parseError)}`;
        return Result.err(
          new RooCodeError(
            errorMessage,
            'LLM_JSON_PARSE_ERROR',
            { rawResponse }, // Add context
            parseError instanceof Error ? parseError : new Error(String(parseError))
          )
        );
      }

      const validationResult = codeInsightsSchema.safeParse(parsedJson);

      if (!validationResult.success) {
        this.logger.warn(
          `LLM response validation failed for ${filePath}: ${validationResult.error.message}`
        );
        this.logger.debug(
          `Validation issues for ${filePath}: ${JSON.stringify(validationResult.error.issues, null, 2)}`
        );
        this.logger.debug(
          `Parsed JSON for ${filePath} (failed validation):\n${JSON.stringify(parsedJson, null, 2)}`
        );
        const validationIssues = JSON.stringify(validationResult.error.issues, null, 2);
        const errorMessage = `LLM response failed schema validation for ${filePath}. Issues: ${validationIssues}`;
        return Result.err(
          new RooCodeError(
            errorMessage,
            'LLM_SCHEMA_VALIDATION_ERROR',
            { parsedJson }, // Add context
            validationResult.error
          )
        );
      }

      this.logger.debug(`Successfully analyzed and validated AST insights for ${filePath}`);
      return Result.ok(validationResult.data);
    } catch (error) {
      const errorMessage = `Unexpected error during AST analysis for ${filePath}: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMessage, error instanceof Error ? error : undefined);
      return Result.err(
        new RooCodeError(
          errorMessage,
          'UNEXPECTED_ANALYSIS_ERROR',
          undefined,
          error instanceof Error ? error : new Error(String(error))
        )
      );
    }
  }

  /**
   * Condenses a full GenericAstNode tree into a simplified structure containing
   * only imports, function definitions, and class definitions.
   * This is used to create a smaller input for the LLM.
   * @param node The root GenericAstNode to start traversal from.
   * @returns A CondensedAst object.
   */
  private _condenseAst(node: GenericAstNode): CondensedAst {
    const condensed: CondensedAst = { imports: [], functions: [], classes: [] };

    const findChildByType = (
      parentNode: GenericAstNode,
      type: string | string[]
    ): GenericAstNode | undefined => {
      const types = Array.isArray(type) ? type : [type];
      return parentNode.children?.find((c) => types.includes(c.type));
    };

    const findDescendantByType = (
      startNode: GenericAstNode,
      type: string | string[]
    ): GenericAstNode | undefined => {
      const types = Array.isArray(type) ? type : [type];
      const queue = [...(startNode.children || [])];
      while (queue.length > 0) {
        const current = queue.shift();
        if (!current) continue;
        if (types.includes(current.type)) {
          return current;
        }
        queue.push(...(current.children || []));
      }
      return undefined;
    };

    const extractText = (targetNode: GenericAstNode | undefined): string | undefined => {
      if (!targetNode?.text) return undefined;
      // Remove surrounding quotes for string literals
      if (targetNode.type === 'string_literal' || targetNode.type === 'string') {
        return targetNode.text.replace(/^['"`]|['"`]$/g, '');
      }
      return targetNode.text;
    };

    /**
     * Finds the function or method name from an AST node.
     * Handles various node types including method definitions with modifiers and decorators.
     * @param node The AST node to extract the name from
     * @returns The extracted function/method name or undefined if not found
     */
    const findFunctionName = (node: GenericAstNode): string | undefined => {
      // Direct identifier for simple functions
      const nameNode = findChildByType(node, ['identifier', 'property_identifier']);
      if (nameNode) return extractText(nameNode);

      // For methods with modifiers or decorators
      const methodDefinition = findDescendantByType(node, ['method_definition', 'method']);
      if (methodDefinition) {
        const methodName = findChildByType(methodDefinition, ['identifier', 'property_identifier']);
        return extractText(methodName);
      }

      // For property methods (e.g., in TypeScript)
      const propertyIdentifier = findDescendantByType(node, ['property_identifier']);
      return extractText(propertyIdentifier);
    };

    const traverse = (currentNode: GenericAstNode) => {
      if (!currentNode) return;

      try {
        if (currentNode.type === 'import_statement') {
          // Common patterns: import 'source'; import {} from 'source'; import x from 'source';
          const sourceNode =
            findChildByType(currentNode, 'string_literal') || // TS/JS: import 'source'
            findChildByType(currentNode, 'string') || // Python: import source / from source import ... (source is often identifier, handled below)
            findDescendantByType(currentNode, 'string_literal') || // Deeper nested string
            findDescendantByType(currentNode, 'string');

          let source = extractText(sourceNode);

          // Handle Python 'import identifier' or 'from identifier import ...'
          if (
            !source &&
            (currentNode.text.startsWith('import ') || currentNode.text.startsWith('from '))
          ) {
            const potentialSourceIdentifier = currentNode.children?.find(
              (c) => c.type === 'identifier' || c.type === 'dotted_name'
            );
            if (potentialSourceIdentifier) {
              source = potentialSourceIdentifier.text;
            }
          }

          if (source) {
            condensed.imports.push({ source });
          } else {
            this.logger.debug(
              `Could not extract source from import node: ${JSON.stringify(currentNode)}`
            );
          }
        } else if (
          currentNode.type === 'function_definition' ||
          currentNode.type === 'function_declaration' ||
          currentNode.type === 'method_definition' ||
          currentNode.type === 'method'
        ) {
          const name = findFunctionName(currentNode);

          if (name) {
            const paramsNode = findChildByType(currentNode, ['formal_parameters', 'parameters']); // JS/TS vs Python
            const params: string[] = [];

            if (paramsNode) {
              /**
               * Processes a parameter node to extract its name, handling various parameter types
               * including decorated and modified parameters.
               * @param paramNode The parameter node to process
               */
              const processParam = (paramNode: GenericAstNode) => {
                // Skip decorator nodes
                if (paramNode.type === 'decorator') return;

                // For required_parameter nodes (TypeScript)
                if (paramNode.type === 'required_parameter') {
                  const paramId = findDescendantByType(paramNode, ['identifier']);
                  const paramName = extractText(paramId);
                  if (paramName && !['self', 'cls'].includes(paramName)) {
                    params.push(paramName);
                  }
                  return;
                }

                // For simple identifier parameters
                if (paramNode.type === 'identifier') {
                  const paramName = extractText(paramNode);
                  if (paramName && !['self', 'cls'].includes(paramName)) {
                    params.push(paramName);
                  }
                  return;
                }

                // For other parameter types, try to find the identifier
                const paramId = findDescendantByType(paramNode, ['identifier']);
                const paramName = extractText(paramId);
                if (paramName && !['self', 'cls'].includes(paramName)) {
                  params.push(paramName);
                }
              };

              // Process each parameter
              paramsNode.children?.forEach(processParam);
            }

            // Add the function info if we found a valid name
            condensed.functions.push({ name, params });
          } else {
            this.logger.debug(
              `Could not extract name from function node: ${JSON.stringify(currentNode)}`
            );
          }
        } else if (
          currentNode.type === 'class_definition' ||
          currentNode.type === 'class_declaration'
        ) {
          const nameNode =
            findChildByType(currentNode, 'identifier') ||
            findChildByType(currentNode, 'type_identifier'); // TS specific
          const name = extractText(nameNode);
          if (name) {
            condensed.classes.push({ name });
          } else {
            this.logger.debug(
              `Could not extract name from class node: ${JSON.stringify(currentNode)}`
            );
          }
        }
      } catch (error) {
        const nodeInfo = `(type: ${currentNode.type}, text: "${currentNode.text.substring(0, 50)}...")`; // Add node info to message
        this.logger.warn(
          `Error processing node ${nodeInfo} during AST condensation: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Recursively traverse children regardless of current node type
      currentNode.children?.forEach(traverse);
    };

    traverse(node);
    return condensed;
  }

  /**
   * Constructs the system prompt for the LLM to analyze the *condensed* AST data.
   * Includes instructions, the target schema definition, and a few-shot example.
   * @param condensedAstJson A JSON string representing the condensed AST structure.
   * @returns The system prompt string.
   */
  private buildPrompt(condensedAstJson: string): string {
    // Define the target schema structure clearly for the LLM
    const targetSchemaString = `
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
}`;

    // Define the few-shot example
    const exampleCondensedInput = JSON.stringify(
      {
        imports: [{ source: 'react' }, { source: './utils' }],
        functions: [
          { name: 'calculateTotal', params: ['price', 'quantity'] },
          { name: 'formatDate', params: ['date'] },
        ],
        classes: [{ name: 'Product' }, { name: 'UserProfile' }],
      },
      null,
      2
    );

    const exampleOutput = JSON.stringify(
      {
        functions: [
          { name: 'calculateTotal', parameters: ['price', 'quantity'] },
          { name: 'formatDate', parameters: ['date'] },
        ],
        classes: [{ name: 'Product' }, { name: 'UserProfile' }],
        imports: [{ source: 'react' }, { source: './utils' }],
      },
      null,
      2
    );

    // Construct the final prompt
    const prompt = `
### Instruction ###
Analyze the provided **CONDENSED** JSON data ('condensedAstData') representing the key structural elements (imports, functions, classes) extracted from a source code file's Abstract Syntax Tree (AST).
Your task is to reformat this condensed data into a specific JSON output structure.

The input 'condensedAstData' follows this format:
\`\`\`json
{
  "imports": [{ "source": "string" }],
  "functions": [{ "name": "string", "params": ["string"] }],
  "classes": [{ "name": "string" }]
}
\`\`\`

Return the results ONLY as a valid JSON object matching the following TypeScript interface ('CodeInsights'). Ensure the property names in your output JSON exactly match the interface (e.g., use "parameters" for function parameters, not "params"). Do NOT include any other text, explanations, or markdown formatting.

### Target Output Schema (CodeInsights) ###
\`\`\`typescript
${targetSchemaString}
\`\`\`

### Few-Shot Example ###

**Example Input ('condensedAstData'):**
\`\`\`json
${exampleCondensedInput}
\`\`\`

**Example Output (JSON only):**
\`\`\`json
${exampleOutput}
\`\`\`

### Input 'condensedAstData' ###

\`\`\`json
${condensedAstJson}
\`\`\`

### Output (JSON only) ###

\`\`\`json
`; // The LLM should complete the JSON starting from here and add the closing ```

    return prompt;
  }
}
