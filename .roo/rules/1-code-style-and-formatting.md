---
title: Code Style And Formatting
version: 1.0.0
lastUpdated: 2025-04-24T16:04:56.634Z
sectionId: 1
applicableLanguages: [TypeScript, JavaScript]
relatedSections: []
---

### Code Style and Formatting

**Automation:**

*   **Mandatory:** Use Prettier and ESLint for automated formatting and linting. Configure your editor to format on save.
*   Adhere strictly to the configurations defined in `.prettierrc` (or `package.json`) and `.eslintrc.js`. Modifications require team consensus.

**General Formatting (Enforced by Prettier):**

*   **Indentation:** Use 2 spaces per indentation level. Do not use tabs.
*   **Line Length:** Maximum line length is 100 characters. Break longer lines logically.
*   **Quotes:** Use single quotes (`'`) for all strings unless double quotes (`"`) are required (e.g., JSON content, avoiding escapes).
    ```typescript
    // Good
    const message = 'Use single quotes';

    // Bad
    const message = "Use single quotes";
    ```
*   **Semicolons:** Terminate every statement with a semicolon (`;`).
    ```typescript
    // Good
    const count = 10;
    console.log(count);

    // Bad: Missing semicolons
    const count = 10
    console.log(count)
    ```
*   **Trailing Commas:** Use trailing commas in multi-line object literals, array literals, function parameters, import/export lists (`"trailingComma": "es5"` or `"all"` in Prettier config).
    ```typescript
    // Good
    const config = {
      key1: 'value1',
      key2: 'value2', // Trailing comma
    };
    ```
*   **Braces:** Use K&R style (opening brace on the same line as the statement). Always use braces for control flow (`if`, `for`, `while`, etc.), even for single-line blocks.
    ```typescript
    // Good
    if (isValid) {
      process();
    }

    // Bad: Inconsistent bracing
    if (isValid) process();
    if (isValid)
    {
      process();
    }
    ```
*   **Spacing:** Maintain consistent spacing (enforced by Prettier):
    *   Around operators (`=`, `+`, `-`, `*`, `/`, `===`, etc.).
    *   After commas (`,`) and colons (`:`) in object properties/type annotations.
    *   After keywords (`if`, `for`, `while`, `async`, etc.).
    *   Inside curly braces (`{ }`) for object literals and imports/exports.
    *   No space between function/method names and opening parentheses (`()`).
    ```typescript
    // Good
    const result: number = value + 1;
    import { Injectable, Inject } from 'src/core/di';

    // Bad: Inconsistent spacing
    const result:number=value+1;
    import {Injectable,Inject} from 'src/core/di';
    ```

**Blank Lines:**

*   Use a single blank line to separate logical blocks of code (e.g., between methods, classes, functions, import groups).
*   Use a single blank line before `return` statements, unless it's the only statement in the block.
*   Avoid multiple consecutive blank lines.

**Imports:**

*   **Order:** Follow a consistent import order, enforced by ESLint (`eslint-plugin-import`):
    1.  Node.js built-ins (`fs`, `path`)
    2.  External packages (`langchain`, `commander`, `@langchain/core`)
    3.  Internal absolute paths (`src/core/services`, `types/shared`)
    4.  Parent relative paths (`../`)
    5.  Sibling relative paths (`./`)
*   **Grouping:** Separate import groups with a single blank line.
    ```typescript
    import path from 'path';

    import { injectable } from 'tsyringe';
    import ora from 'ora';

    import { LoggerService } from 'src/core/services/logger-service';
    import { IResult } from 'src/core/result/result';

    import { ParentService } from '../services/parent-service';

    import { SiblingUtil } from './sibling-util';
    ```

**TypeScript Specifics:**

*   **Type Annotations:** Use a single space after colons (`:`) in type annotations. No space before the colon.
    ```typescript
    // Good
    let userId: string;
    function processData(data: unknown): void {}

    // Bad
    let userId : string;
    function processData(data:unknown) : void{}
    ```
*   **Interfaces vs. Types:**
    *   Prefer `interface` for defining object shapes and class implementations (`implements`).
    *   Use `type` for primitive aliases, unions, intersections, tuples, and complex mapped types.
*   **Readonly:** Use the `readonly` modifier for properties/variables that should not be reassigned after initialization, especially in interfaces and class properties.
    ```typescript
    interface AppConfig {
      readonly apiUrl: string;
      timeout: number; // Mutable
    }
    ```
*   **Return Types:** Explicitly declare return types for all functions and methods, except for trivial inline callbacks where inference is obvious.
*   **Access Modifiers:** Always specify access modifiers (`public`, `private`, `protected`) for class members (methods, properties, constructor parameters). Avoid relying on the default `public`.

**Comments:**

*   Use `//` for single-line comments. Start the comment text with a space.
*   Use `/** ... */` for multi-line documentation comments (TSDoc).
*   Place comments on a separate line *above* the code they describe. Avoid trailing comments on the same line as code, unless very short and clarifying.
    ```typescript
    // Good: Describes the following block
    // Fetch user data from the API
    const user = await fetchUser(id);

    /**
     * Processes the provided configuration object.
     * @param config The configuration object.
     * @returns A status result.
     */
    function processConfig(config: AppConfig): IResult<void> {
      // ... implementation ...
    }