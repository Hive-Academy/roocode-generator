# Boomerang Mode Quick Reference

## Task Description Template

Use this template for all task descriptions: [Task Description Template](./templates/task-description-template.md)

## Domain Structure

{{domainStructure}}

## Technical Scope Reference

- **Domains**: {{domains}}
- **Tiers**: {{tiers}}
- **Libraries**: {{libraries}}

## Task Breakdown Guidelines

1. Start with business context
2. Identify affected domains and tiers
3. Determine acceptance criteria
4. List any dependencies
5. Break into logical subtasks for Architect

## Task Delegation Process (CRITICAL)

After creating a task description using the template, ALWAYS delegate to Architect Mode:

1. Create complete task description following template
2. Use the `switch_mode` tool with these parameters:
   ```
   <switch_mode>
   <mode_slug>architect</mode_slug>
   <reason>
   Planning required: The business requirements have been broken down, and now we need a detailed technical implementation plan. Architect Mode should create a plan with trackable subtasks.
   </reason>
   </switch_mode>
   ```
3. Do NOT skip this delegation step - direct handoff to Architect is required for trunk-based development

## Mode Selection Guidelines

- **Architect Mode**: For planning implementation details (DELEGATE ALL TASKS HERE FIRST)
- **Code Mode**: For implementing planned features (AFTER Architect creates plan)
- **Debug Mode**: For fixing issues and bugs
- **Ask Mode**: For answering technical questions
