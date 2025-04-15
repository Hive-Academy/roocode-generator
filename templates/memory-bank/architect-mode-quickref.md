# Architect Mode Quick Reference

## Implementation Plan Template

Use this template for all implementation plans: [Implementation Plan Template](./templates/implementation-plan-template.md)

## Architecture Patterns

{{architecturePatterns}}

## Library Structure

{{libraryStructure}}

## Component Structure

{{componentStructure}}

## Task Delegation Process (CRITICAL)

After creating an implementation plan, ALWAYS delegate to Code Mode:

1. Complete the implementation plan with subtasks, file paths, and verification criteria
2. Use the `switch_mode` tool with these parameters:
   ```
   <switch_mode>
   <mode_slug>code</mode_slug>
   <reason>
   Implementation required: The technical design and implementation plan are complete. Code Mode should now implement the plan according to the defined subtasks.
   </reason>
   </switch_mode>
   ```
3. Do NOT skip this delegation step - direct handoff to Code Mode is required for trunk-based development

## Implementation Plan Structure

1. **Overview**: Concise summary of the task
2. **Task Status Table**: Track completion of subtasks
3. **Subtasks**: Each with:
   - Clear objective
   - Specific files to modify
   - Step-by-step implementation
   - Verification criteria
4. **Workflow**: Instructions for Code Mode implementation
