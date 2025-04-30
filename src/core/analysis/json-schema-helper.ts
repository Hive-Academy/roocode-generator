import { Injectable } from '../di/decorators';
import { Result } from '../result/result';
import { z } from 'zod';

export interface IJsonSchemaHelper {
  getProjectContextSchema(): z.ZodSchema;
  validateJson(json: string, schema: z.ZodSchema): Result<boolean, Error>;
  repairJson(jsonString: string): Result<string, Error>;
  getLlmResponseSchema(): z.ZodSchema;
}

@Injectable()
export class JsonSchemaHelper implements IJsonSchemaHelper {
  private readonly projectContextSchema: z.ZodSchema;
  private readonly llmResponseSchema: z.ZodSchema;

  constructor() {
    // Initialize the LLM response schema
    this.llmResponseSchema = z
      .object({
        type: z.string(),
        content: z.unknown(),
        metadata: z
          .object({
            timestamp: z.string().optional(),
            model: z.string().optional(),
            version: z.string().optional(),
          })
          .optional(),
      })
      .strict();

    // Define the schema using Zod
    this.projectContextSchema = z
      .object({
        techStack: z
          .object({
            languages: z.array(z.string()),
            frameworks: z.array(z.string()),
            buildTools: z.array(z.string()),
            testingFrameworks: z.array(z.string()),
            linters: z.array(z.string()),
            packageManager: z.string(),
          })
          .strict(),

        structure: z
          .object({
            rootDir: z.string(),
            sourceDir: z.string(),
            testDir: z.string(),
            configFiles: z.array(z.string()),
            mainEntryPoints: z.array(z.string()),
            componentStructure: z.record(z.array(z.string())),
          })
          .strict(),

        dependencies: z
          .object({
            dependencies: z.record(z.string()),
            devDependencies: z.record(z.string()),
            peerDependencies: z.record(z.string()),
            internalDependencies: z.record(z.array(z.string())),
          })
          .strict(),
      })
      .strict();
  }

  public getProjectContextSchema(): z.ZodSchema {
    return this.projectContextSchema;
  }

  public validateJson(json: string, schema: z.ZodSchema): Result<boolean, Error> {
    try {
      // Parse JSON string to object if needed
      const jsonObject = typeof json === 'string' ? JSON.parse(json) : json;

      // Validate using Zod schema
      const result = schema.safeParse(jsonObject);

      if (!result.success) {
        // Format Zod errors into a readable message
        const errors = result.error.errors
          .map((error) => `${error.path.join('.')} ${error.message}`)
          .join('; ');

        return Result.err(new Error(`JSON validation failed: ${errors}`));
      }

      return Result.ok(true);
    } catch (error) {
      if (error instanceof Error) {
        return Result.err(new Error(`JSON validation error: ${error.message}`));
      }
      return Result.err(new Error('An unknown error occurred during JSON validation'));
    }
  }

  public repairJson(jsonString: string): Result<string, Error> {
    try {
      // Handle missing quotes around property names
      jsonString = jsonString.replace(/([{,])\s*(\w+)\s*:/g, '$1 "$2":');

      // Remove trailing commas
      jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');

      // Balance brackets/braces
      const balanced = this.balanceBrackets(jsonString);
      if (!balanced.success) {
        return Result.err(new Error(balanced.error));
      }

      // Verify the repair worked by parsing
      JSON.parse(balanced.result);
      return Result.ok(balanced.result);
    } catch (error) {
      return Result.err(
        new Error(`JSON repair failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      );
    }
  }

  private balanceBrackets(json: string): { success: boolean; result: string; error?: string } {
    const stack: string[] = [];
    const pairs: { [key: string]: string } = {
      '{': '}',
      '[': ']',
      '"': '"',
    };
    let inString = false;
    let result = json;

    for (let i = 0; i < json.length; i++) {
      const char = json[i];

      if (char === '"' && (i === 0 || json[i - 1] !== '\\')) {
        if (!inString) {
          stack.push(char);
          inString = true;
        } else {
          if (stack[stack.length - 1] === '"') {
            stack.pop();
            inString = false;
          }
        }
        continue;
      }

      if (inString) continue;

      if ('{['.includes(char)) {
        stack.push(char);
      } else if ('}]'.includes(char)) {
        if (stack.length === 0) {
          return {
            success: false,
            result: json,
            error: `Unexpected closing bracket '${char}' at position ${i}`,
          };
        }

        const last = stack.pop()!;
        if (pairs[last] !== char) {
          return {
            success: false,
            result: json,
            error: `Mismatched brackets: expected '${pairs[last]}' but found '${char}' at position ${i}`,
          };
        }
      }
    }

    // Add missing closing brackets/braces
    while (stack.length > 0) {
      const char = stack.pop()!;
      if (char === '"') {
        result += '"';
      } else {
        result += pairs[char];
      }
    }

    return { success: true, result };
  }

  public getLlmResponseSchema(): z.ZodSchema {
    return this.llmResponseSchema;
  }
}
