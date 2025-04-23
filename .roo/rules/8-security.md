---
title: Security
version: 1.0.0
lastUpdated: 2025-04-23T18:21:31.983Z
sectionId: 8
applicableLanguages: [TypeScript, JavaScript]
relatedSections: []
---

### Security Coding Rules

#### 1. Input Validation & Sanitization

- **Validate CLI Arguments:** Thoroughly validate all inputs received via Commander.js and Inquirer.js against expected types, formats, and ranges.
- **Sanitize User Input:** Sanitize any user-provided input (CLI args, prompts) before using it in file paths, commands, or LLM prompts.
- **Validate Configuration:** Validate data loaded from configuration files (`llm.config.json`, `roocode-config.json`) against a defined schema or type.
- **Validate LLM Responses:** Treat LLM output as untrusted input. Validate and sanitize it before processing, saving, or executing any actions based on it.

#### 2. Dependency Management

- **Lock Dependencies:** Always commit `package-lock.json` to ensure reproducible builds and dependency trees.
- **Audit Dependencies:** Regularly run `npm audit` and address reported vulnerabilities promptly.
- **Minimize Dependencies:** Only include necessary dependencies. Remove unused packages.
- **Vet Dependencies:** Prefer well-maintained and reputable libraries.

#### 3. Secrets Management

- **No Hardcoded Secrets:** Never commit API keys, passwords, or other secrets directly into source code or configuration files.
- **Use Environment Variables:** Load secrets (e.g., LLM API keys) from environment variables using `dotenv` or a secure secrets management system.
  ```typescript
  // Example using dotenv
  import dotenv from "dotenv";
  dotenv.config();
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error("LLM_API_KEY not found in environment variables.");
  }
  ```
- **Gitignore Sensitive Files:** Ensure configuration files potentially containing secrets (even temporarily or locally) are listed in `.gitignore`.
- **Restrict Secret Exposure:** Avoid logging secrets or including them in error messages.

#### 4. File System Security

- **Validate File Paths:** Sanitize and validate all file paths used in file operations (`file-operations.ts`). Prevent path traversal vulnerabilities.

  ```typescript
  import path from "path";

  function isPathSafe(baseDir: string, userPath: string): boolean {
    const resolvedPath = path.resolve(baseDir, userPath);
    return resolvedPath.startsWith(path.resolve(baseDir));
  }

  // Usage:
  // if (!isPathSafe(projectRoot, filePathFromInput)) {
  //   throw new Error("Invalid file path detected.");
  // }
  ```

- **Limit Permissions:** Ensure file operations run with the minimum necessary permissions.
- **Cautious File Writing:** Be extra careful when writing files based on external inputs, especially LLM-generated content. Validate content before writing.

#### 5. Langchain & LLM Security

- **Sanitize Prompt Inputs:** Sanitize data incorporated into LLM prompts to mitigate prompt injection risks. Clearly delimit user input within prompts.
- **Avoid Sensitive Data Leakage:** Do not send sensitive source code, PII, or proprietary information to external LLMs unless necessary and properly assessed for risks. Configure Langchain agents accordingly.
- **Validate LLM Output:** Treat LLM output as untrusted. Validate and sanitize before use, especially if it influences file operations or code generation.
- **Review Provider Policies:** Understand the data privacy and security policies of the configured LLM providers (OpenAI, Anthropic, Google GenAI).

#### 6. General Secure Coding Practices

- **Avoid Unsafe Functions:** Do not use `eval()`, `new Function()`, `setTimeout(string)`, or `setInterval(string)`.
- **Enable Strict Mode:** Ensure TypeScript's `strict` mode is enabled in `tsconfig.json`.
- **Minimize `any` Type:** Avoid using the `any` type. Prefer specific types or `unknown` with type checking.
- **Secure Error Handling:** Catch errors properly and avoid exposing sensitive details (e.g., file paths, stack traces) to the user unless intended for debugging.
- **Use Security Linters:** Integrate ESLint plugins focused on security (e.g., `eslint-plugin-security`) if applicable.
