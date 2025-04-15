# Code Mode Quick Reference

## Commands Reference

{{commandsReference}}

## Library Structure Reference

{{libraryStructure}}

## Technical Standards

{{technicalStandards}}

## Task Delegation Process (CRITICAL)

After completing implementation of subtasks, ALWAYS delegate to Code Review Mode:

1. Complete implementation of one or more subtasks
2. Update the status in the implementation plan
3. Use the `switch_mode` tool with these parameters:
   ```
   <switch_mode>
   <mode_slug>code-review</mode_slug>
   <reason>
   Review required: Implementation of [subtask name/task name] is complete. Code Review Mode should verify the implementation meets quality standards and coordinates committing the changes.
   </reason>
   </switch_mode>
   ```
4. If all subtasks are complete, create a completion report before switching modes
5. Be prepared to address feedback from Code Review Mode

## Completion Report Template

Use the template from `memory-bank/templates/completion-report-template.md`.
