---
title: Security
version: 1.0.0
lastUpdated: 2025-04-23T12:05:22.206Z
sectionId: 8
applicableLanguages: [TypeScript, JavaScript]
relatedSections: []
---

Okay, here are comprehensive security coding rules and standards tailored for your `roocode-generator` project, considering its TypeScript/JavaScript stack, frameworks (Langchain, Commander.js, Inquirer.js), structure, and dependencies.

---

# Security Coding Rules and Standards - roocode-generator

## 1. Introduction & Philosophy

Security is paramount for `roocode-generator`, especially given its interaction with Large Language Models (LLMs), the local file system, user input via CLI, and potentially sensitive configuration data (like API keys). These rules aim to minimize security risks by embedding secure practices throughout the development lifecycle. Every developer is responsible for understanding and adhering to these standards.

**Core Principles:**

*   **Least Privilege:** Components should only have access to the resources and permissions strictly necessary for their function.
*   **Defense in Depth:** Implement multiple layers of security controls.
*   **Secure by Default:** Design components and features to be secure in their default configuration.
*   **Never Trust Input:** Treat all external input (user CLI args, file contents, LLM responses, environment variables) as potentially malicious until validated and sanitized.
*   **Keep it Simple:** Complex code is harder to secure. Strive for clarity and simplicity.

## 2. Input Validation and Sanitization

All external data sources must be validated and, where appropriate, sanitized. This includes CLI arguments, user prompts, configuration files, environment variables, and responses from LLMs.

**2.1. CLI Input (Commander.js / Inquirer.js)**

*   **Rule:** Validate all command-line arguments and interactive inputs rigorously.
*   **Guideline:**
    *   Use Commander.js's built-in type coercion and validation features (`.option('-p, --port <number>', 'port number', parseInt)`).
    *   For complex validation (e.g., file paths, specific formats), add custom validation logic immediately after parsing.
    *   Use Inquirer.js's `validate` function for interactive prompts.
    *   Sanitize any input that will be used in file paths, shell commands (avoid if possible!), or logged, to prevent injection attacks.
*   **Example (Commander.js custom validation):**

```typescript
// src/commands/some-command.ts
import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import { sanitizePath } from '../core/utils/security-utils'; // Assume this utility exists

const program = new Command();

program
  .command('generate')
  .option('--output-dir <dir>', 'Output directory for generated files')
  .action((options) => {
    if (!options.outputDir) {
      console.error('Error: --output-dir is required.');
      process.exit(1);
    }

    // **SECURITY: Validate and sanitize path**
    const validatedPath = sanitizePath(options.outputDir); // Prevents path traversal
    if (!validatedPath) {
        console.error(`Error: Invalid output directory path: ${options.outputDir}`);
        process.exit(1);
    }

    // Further checks (e.g., existence, permissions) should happen in FileOperations
    console.log(`Validated output directory: ${validatedPath}`);
    // ... proceed with generation using validatedPath
  });

program.parse(process.argv);
```

*   **Example (Inquirer.js validation):**

```typescript
// src/core/cli/cli-interface.ts
import inquirer from 'inquirer';
import { isValidFilename } from '../core/utils/validation-utils'; // Assume this utility exists

async function askForFilename(): Promise<string> {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'filename',
      message: 'Enter the filename:',
      validate: (input: string) => {
        // **SECURITY: Validate filename format**
        if (!input) {
          return 'Filename cannot be empty.';
        }
        if (!isValidFilename(input)) { // Check for invalid chars like /, .., etc.
          return 'Invalid characters in filename.';
        }
        // Add more specific checks if needed
        return true;
      },
    },
  ]);
  return answers.filename;
}
```

**2.2. File Content / Configuration Files**

*   **Rule:** Validate the structure and content of all configuration files (`llm.config.json`, `roocode-config.json`, etc.) and any files read by the application (e.g., templates, existing code).
*   **Guideline:**
    *   Use schema validation libraries (like Zod, Ajv) or manual checks after parsing JSON/YAML files.
    *   Be cautious when parsing potentially large files to avoid Denial of Service (DoS).
    *   Sanitize content read from files if it's used in sensitive contexts (e.g., constructing prompts, writing to other files).
*   **Example (Using Zod for `llm.config.json`):**

```typescript
// src/core/config/llm-config.service.ts
import { z } from 'zod';
import { Result, Ok, Err } from '../core/result/result'; // Assuming a Result type
import { FileOperations } from '../core/file-operations/file-operations'; // Assuming FileOperations service

const LlmConfigSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'google']),
  apiKeyEnvVar: z.string().min(1),
  // Add other expected properties and their types/validations
  model: z.string().optional(),
});

type LlmConfig = z.infer<typeof LlmConfigSchema>;

@Injectable() // Assuming DI
export class LlmConfigService {
  constructor(private fileOps: FileOperations) {}

  async loadConfig(filePath: string): Promise<Result<LlmConfig, Error>> {
    const readResult = await this.fileOps.readFile(filePath);
    if (readResult.isErr()) {
      return Err(new Error(`Failed to read LLM config: ${readResult.error.message}`));
    }

    try {
      const rawConfig = JSON.parse(readResult.value);
      // **SECURITY: Validate structure against schema**
      const parseResult = LlmConfigSchema.safeParse(rawConfig);
      if (!parseResult.success) {
        return Err(new Error(`Invalid LLM config format: ${parseResult.error.message}`));
      }
      return Ok(parseResult.data);
    } catch (error) {
      return Err(new Error(`Failed to parse LLM config JSON: ${error instanceof Error ? error.message : String(error)}`));
    }
  }
  // ... rest of the service
}
```

**2.3. LLM Responses**

*   **Rule:** Treat output from LLMs (via Langchain) as untrusted external input.
*   **Guideline:**
    *   Validate the structure of the LLM response (e.g., expecting JSON, specific fields). Use `ResponseParser`.
    *   Sanitize content from LLMs before using it, especially if it represents code, commands, or file content. Remove potentially harmful elements (e.g., script tags, command execution syntax).
    *   Be cautious about directly executing code generated by LLMs. If necessary, use sandboxing or require user review.
    *   Implement checks for unexpected or nonsensical output that might indicate prompt injection attempts or model failures.
*   **Example (Sanitizing LLM-generated code description):**

```typescript
// src/core/analysis/response-parser.ts
import DOMPurify from 'isomorphic-dompurify'; // Use a proper sanitizer library

export class ResponseParser {
    // ... other methods

    parseAndSanitizeDescription(llmResponse: string): string {
        try {
            // Assuming the response contains a description field in JSON
            const parsed = JSON.parse(llmResponse);
            const description = parsed?.description || '';

            // **SECURITY: Sanitize potentially malicious HTML/Script content**
            // Adjust configuration based on allowed tags if any HTML is expected
            const sanitized = DOMPurify.sanitize(description, { USE_PROFILES: { html: false } });

            return sanitized;
        } catch (error) {
            // Handle parsing error, return default or log
            console.error("Failed to parse or sanitize LLM description:", error);
            return ''; // Or throw, depending on desired behavior
        }
    }
}
```

## 3. Secrets Management

API keys (OpenAI, Anthropic, Google GenAI) and other sensitive credentials must be handled securely.

*   **Rule:** Never hardcode secrets directly in the source code, configuration files, or commit them to version control.
*   **Guideline:**
    *   Use environment variables to store secrets. Utilize the `dotenv` library to load variables from a `.env` file during development.
    *   Ensure `.env` files are listed in `.gitignore`.
    *   Provide clear documentation (e.g., in `README.md` or a `.env.example` file) on required environment variables.
    *   Access secrets via `process.env` within the application (e.g., in `LlmConfigService`).
    *   Limit the scope and lifetime of secrets in memory. Avoid logging secrets.
*   **Example (Loading API Key):**

```typescript
// src/core/config/llm-config.service.ts
import 'dotenv/config'; // Load .env file

// ... inside a method or constructor
async loadProviderConfig(providerName: string): Promise<Result<ProviderConfig, Error>> {
    const configResult = await this.loadConfig('llm.config.json'); // Load base config
    if (configResult.isErr()) return configResult;

    const config = configResult.value;

    if (config.provider === providerName) {
        // **SECURITY: Load API key from environment variable**
        const apiKey = process.env[config.apiKeyEnvVar];
        if (!apiKey) {
            return Err(new Error(`API key environment variable '${config.apiKeyEnvVar}' not set for provider ${providerName}.`));
        }
        // Return config object including the apiKey (use it directly, don't store unnecessarily)
        return Ok({ provider: config.provider, apiKey: apiKey, model: config.model });
    }
    // ... handle other providers or errors
}
```

## 4. Dependency Management

Vulnerabilities in third-party packages (`npm` dependencies) are a significant attack vector.

*   **Rule:** Regularly audit and update dependencies.
*   **Guideline:**
    *   Use `npm audit` frequently to check for known vulnerabilities. Integrate this into CI/CD pipelines.
    *   Keep dependencies reasonably up-to-date using `npm update` or tools like Dependabot/Renovate (configure via GitHub).
    *   Commit `package-lock.json` to ensure reproducible and verified dependency trees.
    *   Before adding a new dependency, evaluate its maintenance status, popularity, and security track record. Prefer well-maintained and reputable packages.
    *   Run `npm audit fix` or manually update vulnerable packages promptly.
*   **CI/CD Integration (`.github/workflows/nodejs.yml`):**

```yaml
name: Node.js CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Use Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20.x' # Use appropriate LTS version
        cache: 'npm'
    - run: npm ci # Use ci for faster, reliable installs
    - run: npm run build --if-present
    - run: npm test
    # **SECURITY: Add dependency vulnerability scanning**
    - name: Run npm audit
      run: npm audit --audit-level=moderate # Fail on moderate or higher vulnerabilities

  # Add linting job as well
  lint:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - name: Use Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20.x'
        cache: 'npm'
    - run: npm ci
    - run: npm run lint # Ensure linting includes security rules
```

## 5. Filesystem Security

Interacting with the file system (`src/core/file-operations`) requires careful handling to prevent unauthorized access or modification.

*   **Rule:** Prevent Path Traversal vulnerabilities. Validate and sanitize all file paths derived from external input.
*   **Guideline:**
    *   Use `path.resolve()` and `path.normalize()` on any user-provided or externally derived path components *before* using them.
    *   Validate that resolved paths stay within expected base directories (e.g., the project root or designated output folders). Do not allow navigating upwards (`../`) beyond permitted boundaries.
    *   Check file existence and permissions *after* path validation and resolution, just before performing read/write operations.
    *   Use specific, non-recursive file operations where possible (e.g., `readFile` instead of a recursive `readDir` if only one file is needed).
    *   Be cautious with file permissions when creating files or directories. Apply the least permissive settings necessary.
*   **Example (Path Sanitization Utility):**

```typescript
// src/core/utils/security-utils.ts
import path from 'path';

/**
 * Sanitizes a user-provided path component to prevent traversal.
 * Resolves the path relative to a base directory (e.g., process.cwd())
 * and checks if it stays within that base.
 * Returns the absolute, normalized path if safe, otherwise null.
 */
export function sanitizePath(inputPath: string, basePath: string = process.cwd()): string | null {
  const absoluteBasePath = path.resolve(basePath);
  const resolvedPath = path.resolve(absoluteBasePath, inputPath);

  // **SECURITY: Check if the resolved path starts with the base path**
  if (!resolvedPath.startsWith(absoluteBasePath + path.sep) && resolvedPath !== absoluteBasePath) {
    console.warn(`Path traversal attempt detected: ${inputPath} resolved to ${resolvedPath} outside of base ${absoluteBasePath}`);
    return null; // Path is outside the allowed base directory
  }

  // Normalize to remove redundant separators, ., .. (within the allowed path)
  const normalizedPath = path.normalize(resolvedPath);

  // Double-check normalization didn't escape the base (shouldn't happen if startsWith check is robust)
  if (!normalizedPath.startsWith(absoluteBasePath + path.sep) && normalizedPath !== absoluteBasePath) {
     console.warn(`Path traversal attempt detected after normalization: ${inputPath} normalized to ${normalizedPath}`);
     return null;
  }

  return normalizedPath;
}

// Usage within FileOperations or command handlers:
// const safeOutputPath = sanitizePath(userInput.outputDir, projectConfig.rootDir);
// if (!safeOutputPath) { /* handle error */ }
// await this.fileOps.writeFile(safeOutputPath, content);
```

## 6. LLM Interaction Security (Langchain)

Interacting with LLMs introduces unique risks like Prompt Injection.

*   **Rule:** Treat LLM prompts as code and LLM responses as untrusted input. Protect against prompt injection.
*   **Guideline:**
    *   **Input Sanitization for Prompts:** Before incorporating user input or file content into prompts sent to the LLM, sanitize or escape characters that could manipulate the prompt structure (e.g., instructions, delimiters).
    *   **Use Structured Formats:** Whenever possible, structure prompts and expected outputs (e.g., using JSON schemas) to make injection harder and validation easier. Langchain offers tools for structured output.
    *   **Instruction Placement:** Place instructions *before* user-controlled data in the prompt. Use clear delimiters between instructions, context, and user input.
    *   **Output Filtering/Validation:** Rigorously validate and sanitize LLM responses (see section 2.3). Filter out unexpected instructions or attempts to exfiltrate data found in the response.
    *   **Limit LLM Capabilities:** If using Langchain Agents or tools, strictly limit the capabilities granted to the LLM (e.g., restrict file system access, network calls).
    *   **Data Privacy:** Avoid sending sensitive Personally Identifiable Information (PII) or internal secrets *within* prompts to external LLM providers unless absolutely necessary, documented, and compliant with privacy policies. Consider data masking or anonymization techniques.
*   **Example (Conceptual Prompt Structure):**

```typescript
// src/generators/rules/rules-prompt-builder.ts

function buildPrompt(userGoal: string, projectContext: string): string {
    // **SECURITY: Sanitize user input before embedding**
    const sanitizedGoal = sanitizeForPrompt(userGoal); // Implement this function
    const sanitizedContext = sanitizeForPrompt(projectContext);

    // **SECURITY: Use clear delimiters and instruction placement**
    const prompt = `
    ### INSTRUCTIONS ###
    Generate coding rules based on the following goal and project context.
    Format the output as a markdown document with sections.
    Do not include any harmful or executable code in the rules themselves.

    ### PROJECT CONTEXT ###
    ${sanitizedContext}

    ### USER GOAL ###
    ${sanitizedGoal}

    ### GENERATED RULES ###
    `; // LLM starts generating here

    return prompt;
}

function sanitizeForPrompt(input: string): string {
    // Basic example: Escape common delimiters or sequences LLMs might interpret as instructions.
    // This needs careful tuning based on the specific LLM and prompt structure.
    // Consider libraries or more robust methods depending on risk.
    return input.replace(/###/g, '# # #'); // Simple example
}
```

## 7. Secure Coding Practices

General secure coding practices applicable to TypeScript/Node.js.

*   **Rule:** Avoid dangerous functions and practices. Use safer alternatives.
*   **Guideline:**
    *   **No `eval()` or `new Function()`:** Never use `eval` or the `Function` constructor with dynamic input.
    *   **Safe `child_process`:** Avoid `child_process.exec` with unsanitized input. Prefer `child_process.execFile` or `child_process.spawn` with fixed commands and passing user input as arguments, not part of the command string itself.
    *   **Type Safety:** Leverage TypeScript's type system. Avoid `any` where possible; use `unknown` and perform type checks. Enable `strict` mode in `tsconfig.json`.
    *   **Error Handling:** Catch specific errors rather than generic `Error`. Do not leak sensitive information (stack traces, file paths, internal configurations) in error messages shown to users or in production logs. Use custom error types (`src/core/errors`).
    *   **Regular Expressions (ReDoS):** Avoid overly complex or nested regular expressions, especially when applied to user input, as they can be vulnerable to Regular Expression Denial of Service (ReDoS). Use linters or tools (`safe-regex`) to detect potentially unsafe regex.
    *   **Serialization Security:** Be cautious when deserializing data from untrusted sources. While `JSON.parse` is generally safe for JSON, avoid libraries that deserialize complex object graphs without validation, as this can lead to prototype pollution or other vulnerabilities (less common with plain JSON).

## 8. Configuration Security

Ensure configuration files themselves do not introduce risks.

*   **Rule:** Do not store sensitive data (secrets) in configuration files (`llm.config.json`, `roocode-config.json`). Load secrets from environment variables (see Section 3).
*   **Guideline:**
    *   Validate the structure and values of configuration files upon loading (see Section 2.2).
    *   Ensure configuration files have appropriate file permissions if stored in sensitive locations (though typically they reside with the code).

## 9. Logging Security

Logs can inadvertently expose sensitive information.

*   **Rule:** Do not log sensitive data.
*   **Guideline:**
    *   Review all logging statements (`LoggerService`) to ensure they do not log API keys, passwords, PII, verbose error details containing internal paths, or large chunks of potentially sensitive file content.
    *   Implement filtering or masking for sensitive fields if necessary.
    *   Configure appropriate log levels for different environments (e.g., `INFO` or `WARN` in production, `DEBUG` in development). Be mindful that even debug logs might be collected.

## 10. Tooling and Automation

Leverage tools to automatically detect and prevent security issues.

*   **ESLint:** Configure ESLint with security-focused plugins like `eslint-plugin-security` or `eslint-plugin-security-node`. Ensure these rules run as part of your linting process (`npm run lint`).
*   **Static Application Security Testing (SAST):** Integrate SAST tools (e.g., Snyk Code, Semgrep, SonarQube/SonarCloud) into the CI/CD pipeline to scan code for potential vulnerabilities.
*   **Software Composition Analysis (SCA):** Use `npm audit` and tools like Snyk Open Source, Dependabot alerts to continuously monitor dependencies for known vulnerabilities (see Section 4).
*   **Pre-commit Hooks (Husky):** Use Husky (`husky` in devDependencies) to run linters and potentially security checks before commits are made.

## 11. Security Reviews and Audits

Manual review remains crucial for catching issues missed by tools.

*   **Rule:** Perform security-focused code reviews.
*   **Guideline:**
    *   Pay special attention during code reviews to areas involving input handling, file system access, LLM interaction, dependency changes, and authentication/authorization logic (if applicable).
    *   Periodically conduct deeper security audits of critical components or workflows.
    *   Foster a security-aware culture where developers feel comfortable raising potential security concerns.

---

By consistently applying these rules and standards, the `roocode-generator` project can significantly reduce its exposure to common security threats. Remember that security is an ongoing process, requiring vigilance and adaptation as the project evolves and new threats emerge.