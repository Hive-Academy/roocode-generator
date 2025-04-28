# TypeScript Code Standards & Architecture Guide

Generate code that strictly adheres to these standards. Consider them requirements, not suggestions.

## Code Style & Patterns

- Use strict TypeScript: Avoid `any` except when absolutely necessary
- Apply functional patterns: Prefer arrow functions, immutable data structures
- Handle errors with Result<T, E> pattern: Return Result.ok(value) or Result.err(error)
- Structure async operations with try/catch blocks and async/await
- Follow consistent formatting: 2-space indent, 120 char limit, single quotes, semicolons

## Project Architecture

- Organize by domain: src/[domain]/[technical-concern]
- Define interfaces in interfaces.ts, types in types.ts within each module
- Use path aliases (@core/, @generators/) instead of relative imports
- Apply dependency injection via @Injectable and @Inject decorators
- Keep directories shallow: Maximum 3-4 nesting levels
- Create single-responsibility classes with explicit access modifiers

## Naming Conventions

- Variables/functions/methods: camelCase (getUserProfile, isActive)
- Classes/interfaces/types: PascalCase (UserService, ApiResponse)
- Files/directories: kebab-case (user-service.ts, api-types.ts)
- Constants: UPPER_SNAKE_CASE (MAX_RETRIES, API_VERSION)
- Write descriptive names that express intent and behavior

## Code Organization

- Group related functionality into cohesive modules
- Export using named exports over default exports
- Place decorators directly above their declarations
- Write comments explaining why code exists, not what it does
- Avoid circular dependencies and maintain clear dependency flows

Follow these standards to ensure integration with the existing codebase architecture.
