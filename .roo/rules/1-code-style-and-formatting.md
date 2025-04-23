---
title: Code Style And Formatting
version: 1.0.0
lastUpdated: 2025-04-23T18:18:30.460Z
sectionId: 1
applicableLanguages: [TypeScript, JavaScript]
relatedSections: []
---

# Code Style and Formatting Rules

## 1. Automation & Enforcement

- **Prettier:** All code **must** be formatted using Prettier with the project's `.prettierrc` configuration.
- **ESLint:** All code **must** pass ESLint checks based on the project's `.eslintrc.js` configuration.
- **Pre-commit Hook:** Use the configured Husky hook to run formatting and linting before each commit. Fix all reported issues.

## 2. Formatting (Handled by Prettier)

- **Indentation:** 2 spaces.
- **Line Length:** Max 120 characters.
- **Semicolons:** Always required at the end of statements.
- **Quotes:** Use single quotes (`'`) for strings. Use template literals (`` ` ``) for interpolation or multi-line strings.
- **Trailing Commas:** Use trailing commas for multi-line arrays, objects, and parameter lists (`es5` or `all` setting in Prettier).
- **Spacing:** Consistent spacing around operators, keywords, commas, colons, and after semicolons in `for` loops (enforced by Prettier).
- **Braces:** Opening braces (`{`) on the same line. Always use braces for `if`, `for`, `while`, etc., even for single-line blocks.

  ```typescript
  // Good
  if (condition) {
    doSomething();
  }

  // Bad
  if (condition) doSomething();
  ```

## 3. Naming Conventions

- **Variables, Functions, Methods, Parameters:** `camelCase`.
- **Classes, Interfaces, Type Aliases, Enums:** `PascalCase`.
- **Constants (global or static):** `UPPER_SNAKE_CASE`.
- **File Names:** `kebab-case.ts` (e.g., `project-analyzer.ts`, `llm-config.service.ts`).
  - Type definition files: `*.types.ts` (e.g., `analysis.types.ts`).
  - Interface files (if dedicated): `*.interfaces.ts` (e.g., `config.interfaces.ts`).
- **Private Members (TypeScript):** Use the `private` keyword. Avoid `_` prefix unless necessary for JavaScript compatibility.

## 4. TypeScript Specifics

- **Type Annotations:** Use explicit types for function parameters, return types, and complex variable declarations.
- **Avoid `any`:** Use `unknown` instead of `any` and perform necessary type checks/narrowing. Use `any` only as a last resort with a clear justification.
- **`interface` vs `type`:**
  - Use `interface` for defining object shapes and public APIs (classes can implement interfaces).
  - Use `type` for unions, intersections, primitive aliases, mapped types, or conditional types.
- **Access Modifiers:** Explicitly use `public`, `private`, `protected`. Default is `public`.
- **Readonly:** Use `readonly` for properties that should not be reassigned after object creation.

  ```typescript
  interface UserConfig {
    readonly userId: string;
    theme: "light" | "dark"; // Type alias used implicitly
  }

  class SettingsService {
    private apiKey: string;
    public constructor(key: string) {
      this.apiKey = key;
    }
    // ...
  }
  ```

## 5. Imports

- **Ordering:** Group imports in the following order, separated by blank lines:
  1.  Node.js built-in modules (`import fs from 'fs';`)
  2.  External packages (`import { injectable } from 'inversify';`)
  3.  Internal absolute/aliased paths (`import { LoggerService } from '@/core/services';`)
  4.  Internal relative paths (`import { ChildComponent } from './child-component';`)
- **Named Imports:** Prefer named imports over default imports for better clarity and refactoring.
- **Avoid `* as`:** Avoid `import * as Name` unless necessary to import a module with many exports or for dynamic access.

## 6. Comments

- **Purpose:** Explain _why_ something is done, not _what_ the code does (code should be self-explanatory). Document complex logic, assumptions, or workarounds.
- **Style:**
  - Use `//` for single-line comments.
  - Use `/** ... */` JSDoc style for documenting exported functions, classes, methods, interfaces, and types.
- **TODO/FIXME:** Use standard markers like `// TODO:` or `// FIXME:` with a brief explanation.

## 7. Blank Lines

- Use single blank lines to separate logical blocks of code (e.g., between methods, functions, import groups, related statements).
- Avoid multiple consecutive blank lines.
