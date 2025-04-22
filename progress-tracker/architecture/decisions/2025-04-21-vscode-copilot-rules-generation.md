# Architecture Decision Record: VS Code Copilot Rules Generation

## Status

Proposed

## Context

The project previously had functionality to generate VS Code Copilot rule files and update settings.json, which was implemented in `old-code/vscode-copilot-rules-generator.ts`. This functionality needs to be restored and integrated into the current modular CLI architecture.

The functionality includes:

1. Copying rule files from templates to .vscode directory
2. Modifying MCP usage guide to create a rule file
3. Updating settings.json with rule file references

The current project has an existing `VSCodeCopilotRulesGenerator` class in `src/generators/vscode-copilot-rules-generator.ts`, but it doesn't include the functionality we need to restore.

## Decision

We will extend the existing `VSCodeCopilotRulesGenerator` class to include the missing functionality rather than creating a new command or generator. This approach leverages the existing dependency injection and file operations infrastructure while maintaining the feature-based project structure.

The implementation will:

1. Modify the `executeGeneration` method to include the rule file copying and settings update functionality
2. Add helper methods for specific tasks:
   - `copyRuleFiles`: Copy rule files from templates to .vscode
   - `copyAndModifyMcpGuide`: Copy and modify MCP usage guide
   - `updateSettingsJson`: Update settings.json with rule file references

This approach aligns with the modular CLI architecture described in memory-bank/TechnicalArchitecture.md:17-48 and leverages existing components like File Operations and Project Config Service.

## Consequences

### Positive

- Reuses existing infrastructure and dependency injection
- Maintains the feature-based project structure
- Leverages existing file operations service
- Provides a clean integration with the current architecture
- Restores functionality without duplicating code

### Negative

- Increases the complexity of the VSCodeCopilotRulesGenerator class
- May require additional testing to ensure both old and new functionality work correctly

## Alternatives Considered

### 1. Create a New Generator Class

We could create a separate generator class specifically for VS Code Copilot rule file generation.

**Pros:**

- Clear separation of concerns
- Simpler implementation for each generator

**Cons:**

- Duplication of code and functionality
- Additional complexity in the command structure
- Less alignment with the feature-based project structure

### 2. Create a New Command

We could create a new CLI command specifically for VS Code Copilot rule generation.

**Pros:**

- Clear separation of functionality
- Direct user access to the specific functionality

**Cons:**

- Fragmentation of related functionality
- Less integration with existing architecture
- Potential confusion for users with multiple similar commands

## References

- memory-bank/TechnicalArchitecture.md:17-48 (Modular CLI Architecture)
- memory-bank/DeveloperGuide.md:79-104 (Feature-based project structure)
- memory-bank/DeveloperGuide.md:148-167 (Development guidelines)
- old-code/vscode-copilot-rules-generator.ts:41-94 (Original functionality)
