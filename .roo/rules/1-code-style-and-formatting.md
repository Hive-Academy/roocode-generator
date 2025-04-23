---
title: Code Style And Formatting
version: 1.0.0
lastUpdated: 2025-04-23T11:56:37.444Z
sectionId: 1
applicableLanguages: [TypeScript, JavaScript]
relatedSections: []
---

Okay, here are comprehensive coding rules and standards specifically for the "Code Style and Formatting" section, tailored to your TypeScript/JavaScript project using Langchain, Commander.js, Inquirer.js, Reflect-metadata, ESLint, and Prettier.

```markdown
# Coding Standards: Code Style and Formatting

## 1. Philosophy

-   **Consistency:** Adhering to a consistent code style is paramount for readability and maintainability across the project.
-   **Readability:** Code should be written to be easily understood by other developers (and your future self). Formatting plays a key role in this.
-   **Automation:** We leverage automated tools (Prettier, ESLint) to enforce style rules wherever possible. Manual formatting should be minimal. The configuration files for these tools (`.prettierrc`, `.eslintrc.js`) are the ultimate source of truth for automatically enforceable rules.
-   **Clarity:** Formatting choices should enhance the clarity of the code's logic and structure.

## 2. Tooling Enforcement

-   **Prettier:** Used for opinionated code formatting (line length, spacing, quotes, semicolons, etc.). It ensures a consistent *look*.
    -   Configuration: `.prettierrc` (or `package.json` section)
    -   Execution: Integrated into IDEs (on save), run via npm scripts (`npm run format`), and enforced via pre-commit hooks (Husky).
-   **ESLint:** Used for identifying problematic patterns, enforcing code quality rules, and some style rules not covered by Prettier (e.g., naming conventions, unused variables, TypeScript-specific rules).
    -   Configuration: `.eslintrc.js` (using `@typescript-eslint/parser` and relevant plugins).
    -   Execution: Integrated into IDEs, run via npm scripts (`npm run lint`), and enforced via pre-commit hooks and CI pipelines.

**=> Action:** Ensure your IDE is configured to use the project's ESLint and Prettier configurations for real-time feedback and auto-formatting on save.

## 3. General Formatting (Primarily Enforced by Prettier)

These rules should align with the project's `.prettierrc` configuration.

### 3.1. Indentation

-   **Rule:** Use **2 spaces** for indentation. Do not use tabs.
-   **Rationale:** Consistent spacing improves readability. Spaces prevent issues across different editors/OSs. 2 spaces is a common convention in the JavaScript/TypeScript community.

```typescript
// Good
function exampleFunction(param1: string, param2: number): void {
  if (param1 === 'test') {
    console.log(param2);
  }
}

// Bad (4 spaces)
function exampleFunction(param1: string, param2: number): void {
    if (param1 === 'test') {
        console.log(param2);
    }
}

// Bad (tabs)
function exampleFunction(param1: string, param2: number): void {
	if (param1 === 'test') {
		console.log(param2);
	}
}
```

### 3.2. Line Length

-   **Rule:** Limit lines to a maximum of **120 characters**.
-   **Rationale:** Improves readability, especially on smaller screens or side-by-side diff views. Prettier will automatically wrap lines that exceed this limit.
-   **Note:** URLs, long string literals, or complex type definitions might be exceptions, but aim to break down complex logic or types where possible.

### 3.3. Quotes

-   **Rule:** Use **single quotes (`'`)** for strings. Use template literals (``` ` ```) for strings requiring interpolation or spanning multiple lines.
-   **Rationale:** Consistency. Single quotes are slightly less verbose than double quotes.

```typescript
// Good
const message: string = 'Hello, world!';
const name: string = 'Roocode Generator';
const greeting: string = `Welcome to ${name}!`;
const multiLine: string = `
  This is a
  multi-line string.
`;

// Bad
const message: string = "Hello, world!"; // Use single quotes
```

### 3.4. Semicolons

-   **Rule:** **Always** use semicolons (`;`) at the end of statements.
-   **Rationale:** Avoids ambiguity related to Automatic Semicolon Insertion (ASI) and promotes clarity. Prettier enforces this.

```typescript
// Good
import { Injectable } from '@/core/di';
const x = 10;
console.log(x);

// Bad (missing semicolons)
import { Injectable } from '@/core/di'
const x = 10
console.log(x)
```

### 3.5. Trailing Commas

-   **Rule:** Use trailing commas wherever possible in multi-line object literals, array literals, function parameters, and type definitions (`"es5"` or `"all"` in Prettier config).
-   **Rationale:** Simplifies adding/removing items and results in cleaner Git diffs.

```typescript
// Good
const myObject = {
  key1: 'value1',
  key2: 'value2', // Trailing comma
};

const myArray = [
  'item1',
  'item2', // Trailing comma
];

function processItems(
  item1: string,
  item2: number, // Trailing comma
): void {
  // ...
}

// Bad (missing trailing comma makes adding item3 noisier in diff)
const myObject = {
  key1: 'value1',
  key2: 'value2'
};
```

### 3.6. Spacing

-   **Rule:** Use standard spacing practices (enforced by Prettier):
    -   Around operators (`=`, `+`, `-`, `*`, `/`, `===`, etc.): `const x = y + 5;`
    -   After commas: `[1, 2, 3]`, `function(a, b)`
    -   Around keywords (`if`, `for`, `while`): `if (condition) {...}`
    -   After colons in object properties: `{ key: value }`
    -   Before opening curly braces: `class MyClass { ... }`, `function myFunc() { ... }`
    -   Around curly braces in imports: `import { A, B } from 'module';`
-   **Rationale:** Consistency and readability.

### 3.7. Braces

-   **Rule:** **Always** use curly braces (`{}`) for `if`, `else`, `for`, `while`, `do...while` statements, even if the body is a single line. Use the K&R style (opening brace on the same line).
-   **Rationale:** Prevents errors when adding more lines to the block later and improves clarity.

```typescript
// Good
if (isValid) {
  process();
}

// Good
for (const item of items) {
  console.log(item);
}

// Bad (potential for errors if another line is added without braces)
if (isValid)
  process();

// Bad (opening brace on new line)
if (isValid)
{
  process();
}
```

### 3.8. Blank Lines

-   **Rule:** Use blank lines sparingly to separate logical blocks of code within functions, between functions/methods, and between major sections of a file (e.g., imports, class definition, exports). Avoid multiple consecutive blank lines.
-   **Rationale:** Improves readability by visually grouping related code.

```typescript
// Good
import { Injectable } from '@/core/di';
import { LoggerService } from '@/core/services';

@Injectable()
class MyService {
  constructor(private readonly logger: LoggerService) {}

  public async processData(data: string): Promise<void> {
    this.logger.info('Processing started...');
    const result = await this.performComplexOperation(data);

    // Separate logical step
    if (result.success) {
      this.logger.info('Processing successful.');
      await this.saveResult(result.value);
    } else {
      this.logger.error('Processing failed:', result.error);
    }
  }

  private async performComplexOperation(input: string): Promise<any> {
    // ... implementation ...
    return { success: true, value: 'processed:' + input };
  }

  private async saveResult(value: string): Promise<void> {
    // ... implementation ...
  }
}
```

## 4. TypeScript Specifics

### 4.1. Type Annotations

-   **Rule:**
    -   **Always** provide explicit type annotations for function parameters and return types, unless the return type is trivially and immediately inferred (e.g., `() => 5`).
    -   Provide type annotations for variable declarations when the type is not immediately obvious from the assigned value or when defining class properties.
    -   Use the colon syntax (`: type`) with a space after the colon.
-   **Rationale:** Improves code clarity, enables better static analysis, and reduces potential runtime errors.

```typescript
// Good
function calculateTotal(price: number, quantity: number): number {
  return price * quantity;
}

// Good (explicit class property types)
@Injectable()
class ConfigService {
  private configPath: string;
  public readonly settings: Record<string, any> = {};

  constructor(configPath: string = 'roocode-config.json') {
    this.configPath = configPath;
    // ... load settings ...
  }
}

// Okay (inferred return type is obvious)
const add = (a: number, b: number) => a + b;

// Bad (missing parameter/return types)
function calculateTotal(price, quantity) {
  return price * quantity;
}
```

### 4.2. Interfaces vs. Type Aliases

-   **Rule:**
    -   Use `interface` for defining the shape of objects or implementing contracts (e.g., for classes).
    -   Use `type` for defining unions, intersections, primitive aliases, mapped types, conditional types, or tuple types.
-   **Rationale:** `interface` offers declaration merging and better error messages for object shapes. `type` is more flexible for other kinds of type definitions.

```typescript
// Good (Interface for object shape/contract)
interface ProjectConfig {
  rootDir: string;
  sourceDir: string;
  // ...
}

// Good (Interface for class contract)
interface IGenerator {
  generate(): Promise<Result<string, Error>>;
}

// Good (Type alias for union)
type CommandStatus = 'pending' | 'running' | 'completed' | 'failed';

// Good (Type alias for complex type)
type FileOperationResult = Result<string, FileOperationError>;

// Avoid using type for simple object shapes where interface works
// Less preferred: type User = { id: number; name: string; };
// Preferred: interface User { id: number; name: string; }
```

### 4.3. Access Modifiers

-   **Rule:** Explicitly use `public`, `private`, or `protected` for all class members (methods and properties). Use `readonly` where applicable, especially for injected dependencies or properties that shouldn't change after construction.
-   **Rationale:** Clearly defines the intended API surface of a class and improves encapsulation. `readonly` prevents accidental modification.

```typescript
// Good
import { Injectable } from '@/core/di';
import { LLMAgent } from '@/core/llm';
import { LoggerService } from '@/core/services';

@Injectable()
export class RulesGenerator implements IGenerator {
  // Explicit public, private, readonly
  public readonly generatorType: string = 'rules';

  constructor(
    private readonly llmAgent: LLMAgent,
    private readonly logger: LoggerService,
    protected readonly configService: ProjectConfigService, // Example protected
  ) {}

  public async generate(): Promise<Result<string, Error>> {
    this.logger.info('Generating rules...');
    // ... use private methods ...
    const prompt = this.buildPrompt();
    return this.llmAgent.generate(prompt);
  }

  private buildPrompt(): string {
    // ... implementation ...
    const context = this.configService.getProjectContext(); // Access protected member
    return `Generate rules based on context: ${context}`;
  }
}
```

### 4.4. Enums

-   **Rule:** Prefer **string enums** over numeric enums unless there's a specific performance reason for numeric ones.
-   **Rationale:** String enums are more descriptive and easier to debug (logs show meaningful strings instead of numbers).

```typescript
// Good
export enum LogLevel {
  Debug = 'DEBUG',
  Info = 'INFO',
  Warn = 'WARN',
  Error = 'ERROR',
}

// Less Preferred (unless performance critical)
export enum NumericStatus {
  Pending, // 0
  Processing, // 1
  Done, // 2
}
```

### 4.5. Decorators (Reflect-metadata / Custom DI)

-   **Rule:** Place decorators directly above the element they decorate (class, method, property, parameter).
-   **Rationale:** Standard convention and improves readability.

```typescript
// Good
import { Injectable, Inject } from '@/core/di';
import { LoggerService } from '@/core/services';
import { TYPES } from '@/core/di/types';

@Injectable() // Decorator directly above class
export class MemoryBankCommandHandler {
  constructor(
    @Inject(TYPES.LoggerService) private readonly logger: LoggerService, // Decorator directly above parameter
    @Inject(TYPES.MemoryBankGenerator) private readonly generator: IGenerator,
  ) {}

  @LogExecutionTime() // Example custom method decorator
  public async handleCommand(): Promise<void> {
    this.logger.info('Handling memory bank command...');
    // ...
  }
}
```

### 4.6. `any` Type

-   **Rule:** **Avoid** using `any` whenever possible. Prefer specific types, `unknown`, or generics. Use `any` only as a last resort when type information is truly unavailable or during incremental migration from JavaScript. If `any` is used, add a comment explaining why.
-   **Rationale:** `any` opts out of type checking, defeating the purpose of TypeScript and increasing the risk of runtime errors. `unknown` is a safer alternative as it requires type checking before use.

```typescript
// Good (using unknown)
async function fetchData(url: string): Promise<unknown> {
  const response = await fetch(url);
  return response.json();
}

async function processData() {
  const data = await fetchData('/api/data');
  // Requires type check/assertion before use
  if (typeof data === 'object' && data !== null && 'name' in data) {
    console.log((data as { name: string }).name);
  }
}

// Bad (using any)
// function processUntypedData(data: any): void {
//   console.log(data.potentiallyNonExistentProperty); // No compile-time error!
// }

// Acceptable (with justification, e.g., interacting with old JS library)
function interactWithLegacyLib(input: any /* Reason: LegacyLib expects untyped object */): void {
  // ...
}
```

## 5. Imports and Exports

### 5.1. Import Order

-   **Rule:** Group and sort imports in the following order:
    1.  Node.js built-in modules (e.g., `path`, `fs`)
    2.  External library imports (e.g., `langchain`, `commander`, `reflect-metadata`)
    3.  Internal absolute path imports (using TS path aliases like `@/*`)
    4.  Internal relative path imports (`./`, `../`)
    -   Separate groups with a blank line. Sort imports alphabetically within each group.
-   **Rationale:** Improves readability and makes it easier to locate specific imports. ESLint plugins (`eslint-plugin-import`) can enforce this.

```typescript
// Good
import fs from 'fs/promises'; // Node built-in
import path from 'path';

import { Command } from 'commander'; // External
import { ChatOpenAI } from '@langchain/openai'; // External (@ scope)
import { injectable, inject } from 'inversify'; // External
import ora from 'ora'; // External
import 'reflect-metadata'; // External (side effects)

import { ApplicationContainer } from '@/core/application/application-container'; // Internal absolute
import { ProjectConfigService } from '@/core/config'; // Internal absolute
import { Result } from '@/core/result'; // Internal absolute
import { TYPES } from '@/core/di/types'; // Internal absolute

import { BaseGenerator } from '../core/generators/base-generator'; // Internal relative
import { IRulesGeneratorOptions } from './interfaces'; // Internal relative (sibling)
```

### 5.2. Named vs. Default Exports

-   **Rule:** Prefer **named exports** over default exports for modules within this project. Default exports can be used for entry points or when required by a framework/library convention.
-   **Rationale:** Named exports improve clarity (you see exactly what's being imported), are easier to search for, and generally better for tree-shaking and refactoring.

```typescript
// Good (module defining utilities) - src/core/utils/strings.ts
export function capitalize(str: string): string { /* ... */ }
export function truncate(str: string, length: number): string { /* ... */ }

// Good (consuming module)
import { capitalize, truncate } from '@/core/utils/strings';

// Less Preferred (default export) - src/core/utils/strings.ts
// export default {
//   capitalize: (str: string): string => { /* ... */ },
//   truncate: (str: string, length: number): string => { /* ... */ },
// };

// Less Preferred (consuming module)
// import StringUtils from '@/core/utils/strings'; // Name 'StringUtils' is arbitrary
// StringUtils.capitalize('hello');

// Okay (Default export for a primary class representing the file's purpose)
// src/core/application/application-container.ts
// export default class ApplicationContainer { ... } // If this is the single main export
// import AppContainer from '@/core/application/application-container';
```

### 5.3. Path Aliases

-   **Rule:** Utilize TypeScript path aliases (configured in `tsconfig.json`, e.g., `@/*` pointing to `src/*`) for imports outside the current top-level directory (`core`, `generators`, etc.). Use relative paths (`./`, `../`) for imports within the same top-level directory or subdirectories.
-   **Rationale:** Avoids long relative paths (`../../../../core/services`) and makes code more resilient to file restructuring within a module.

```typescript
// In src/generators/rules/rules-generator.ts

// Good (using alias for different top-level module)
import { LoggerService } from '@/core/services';
import { LLMAgent } from '@/core/llm';

// Good (using relative path for sibling or child)
import { IRulesPromptBuilder } from './interfaces';
import { RulesPromptBuilder } from './rules-prompt-builder';

// Bad (using relative path for distant module)
// import { LoggerService } from '../../core/services/logger-service';
```

## 6. Comments

### 6.1. Comment Style

-   **Rule:** Use `//` for single-line comments. Use `/* ... */` for multi-line block comments (less common, prefer multiple `//` lines if feasible).
-   **Rule:** Place comments on a new line *above* the code they refer to. Inline comments (`// comment after code`) should be used sparingly only for very short, targeted explanations.
-   **Rule:** Write clear, concise, and professional comments. Avoid redundant comments that merely restate the code. Focus on *why* something is done, not *what* is done (the code should explain the *what*).

```typescript
// Good (explains the 'why')
// Fetch the project configuration before initializing the LLM agent
const config = await this.configService.loadConfig();

// Good (single line comment above)
// Ensure the output directory exists
await this.fileOps.ensureDir(outputDir);

// Okay (short inline comment for clarification)
const timeout = 5 * 60 * 1000; // 5 minutes in milliseconds

// Bad (redundant comment)
// Increment the counter
counter++;
```

### 6.2. JSDoc / TSDoc

-   **Rule:** Use TSDoc (`/** ... */`) comments for all exported functions, classes, interfaces, types, and complex public class members. Include descriptions, parameter explanations (`@param`), and return value explanations (`@returns`).
-   **Rationale:** Enables better documentation generation, improves IntelliSense in IDEs, and serves as inline documentation for consumers of the API.

```typescript
/**
 * Orchestrates the generation process for different artifact types.
 * @Injectable() // Decorators can be included in TSDoc for clarity
 */
@Injectable()
export class GeneratorOrchestrator {
  /**
   * Initializes the orchestrator with necessary dependencies.
   * @param generatorRegistry - A map containing available generator instances.
   * @param logger - Service for logging messages.
   */
  constructor(
    @Inject(TYPES.GeneratorRegistry) private readonly generatorRegistry: Map<string, IGenerator>,
    @Inject(TYPES.LoggerService) private readonly logger: LoggerService,
  ) {}

  /**
   * Runs the generation process for a specific artifact type.
   * @param generatorType - The type of artifact to generate (e.g., 'rules', 'memory-bank').
   * @param options - Generation-specific options.
   * @returns A Result containing the path to the generated artifact or an error.
   */
  public async generate(
    generatorType: string,
    options: Record<string, any>,
  ): Promise<Result<string, Error>> {
    this.logger.info(`Starting generation for type: ${generatorType}`);
    const generator = this.generatorRegistry.get(generatorType);

    if (!generator) {
      return Result.Err(new Error(`Generator type "${generatorType}" not found.`));
    }

    // TODO: Pass options to the generator instance if needed
    return generator.generate();
  }
}
```

## 7. File Naming

-   **Rule:** Use `kebab-case` for file names (e.g., `project-config.service.ts`, `rules-generator.ts`).
-   **Rule:** Use `PascalCase` for class names, interface names, type aliases, and enum names.
-   **Rule:** Files containing primarily one class, interface, or type should often be named after that element, using kebab-case (e.g., `ProjectConfigService` class in `project-config.service.ts`).
-   **Rule:** Use descriptive names that indicate the file's purpose. Suffixes like `.service.ts`, `.command.ts`, `.interface.ts`, `.type.ts`, `.enum.ts`, `.error.ts` can be used for clarity.

```
// Examples
src/core/config/project-config.service.ts   // Contains class ProjectConfigService
src/core/config/interfaces.ts               // Contains interfaces like IProjectConfig
src/core/llm/llm-agent.ts                   // Contains class LLMAgent
src/generators/rules/rules-generator.ts     // Contains class RulesGenerator
src/commands/memory-bank-command-handler.ts // Contains class MemoryBankCommandHandler
src/core/types/common.ts                    // Contains common type aliases like Result
src/core/errors/index.ts                    // Barrel file for errors
```

## 8. Evolution

These style guidelines are living documentation. They may be updated as the project evolves, new patterns emerge, or tooling capabilities change. Proposed changes should be discussed with the team and updated in this document and the relevant tool configurations (`.prettierrc`, `.eslintrc.js`).
```