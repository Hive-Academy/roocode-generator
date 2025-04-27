## Code Style & Formatting

- Use 2 spaces for indentation; never use tabs.
- Limit lines to 100 characters maximum.
- Use single quotes for strings unless double quotes are required.
- Always terminate statements with semicolons.
- Use trailing commas in multi-line objects, arrays, and parameters.
- Use K&R style braces (opening brace on same line); always use braces for control flow.
- Maintain consistent spacing around operators, after commas/colons, and inside curly braces.
- Separate logical blocks of code with a single blank line.
- Order imports: Node built-ins → external packages → internal absolute paths → parent relative → sibling relative.
- Add space after colons in type annotations; no space before the colon.
- Prefer interfaces for object shapes; use types for aliases, unions, intersections.
- Explicitly declare return types for all functions and methods.
- Always specify access modifiers (public/private/protected) for class members.
- Use `//` for single-line comments; use `/** ... */` for documentation comments.

## Project Structure

- Place configuration files directly in project root.
- Store all source code in the `src` directory.
- Store compiled output in `dist` directory; add to `.gitignore`.
- Place CLI entry points in `bin` directory.
- Store non-code assets in dedicated top-level directories.
- Group shared foundational code under `src/core/`.
- Organize distinct features into separate directories under `src`.
- Define module-specific types within the module directory.
- Place globally shared types in `src/core/types/`.
- Place test files adjacent to the source file they test.
- Use kebab-case for files/directories (e.g., `project-analyzer.ts`).
- Use index.ts primarily for exporting public API of a module.

## Naming Conventions

- Use camelCase for variables, parameters, functions, and methods.
- Use PascalCase for classes, interfaces, type aliases, enums, and decorators.
- Use UPPER_CASE for constants and enum members.
- Use kebab-case for file/directory names.
- Use .test.ts or .spec.ts suffix for test files.
- Append meaningful suffixes for class roles (Service, Handler, etc.).
- Prefix interfaces with I (e.g., `IFileOperations`).
- Start function/method names with a verb to indicate action.
- Use boolean variable names that imply truthiness (isValid, hasChanges).
- Use private keyword rather than underscore prefix for private members.

## Dependency Management

- Use npm exclusively; always commit package-lock.json.
- Never manually edit package.json or package-lock.json; use npm commands.
- Use dependencies for runtime packages; devDependencies for development packages.
- Use caret (^) ranges for dependencies to allow non-breaking updates.
- Periodically review and update dependencies using npm update.
- Minimize dependencies; only add those providing significant value.
- Install @types/\* packages as devDependencies for JavaScript libraries.
- Run npm audit regularly to identify and fix vulnerabilities.
- Use tsconfig.json path aliases for cleaner internal imports.
- Use DI to manage internal module dependencies and promote loose coupling.
- Avoid circular dependencies between internal modules.

## TypeScript Best Practices

- Enable strict type checking in tsconfig.json.
- Prefer const over let; avoid var entirely.
- Define explicit types; avoid any unless absolutely necessary.
- Use readonly for properties that shouldn't be reassigned.
- Use built-in utility types (Partial, Required, Readonly, Pick, Omit).
- Use ES modules with import/export syntax; avoid require.
- Prefer async/await over raw Promises or callbacks.
- Always handle Promise rejections with try/catch or .catch().
- Use custom Error classes for specific error types.
- Validate inputs early in functions to prevent errors later.
- Provide context in error messages to aid debugging.
- Use Result type for operations that can predictably fail.
- Keep functions/methods small and focused on a single responsibility.
- Use descriptive names; avoid abbreviations unless widely understood.
- Comment to explain why something is done, not what it does.
- Use decorators for dependency injection.
- Define interfaces for services to promote loose coupling.
- Centrally manage dependency registrations.
- Ensure code compiles without errors per tsconfig.json.

## GPT Prompt Optimization

- Structure prompts with clear sections: role, instructions, reasoning, workflow, output format, verification.
- Include explicit reasoning directives requiring step-by-step problem breakdown.
- Add tool usage guidelines with before, during, and after execution instructions.
- Include persistence directives to ensure tasks are fully completed.
- Provide explicit output templates for different task types.
- Add verification checklists before considering tasks complete.
- Place critical instructions at both beginning and end of prompts.
- Explicitly state what NOT to do to avoid undesired behaviors.
- Include concrete examples showcasing desired input/output patterns.
- Plan extensively before each function call; reflect after execution.
- Break complex tasks into manageable steps with verification between each.
- Always validate results against original requirements.
- Make instructions explicit; GPT-4.1 follows instructions more literally than previous models.
