# Code Review Mode Quick Reference

## Review Checklist

{{reviewChecklist}}

## Task Delegation Process (CRITICAL)

After reviewing the implementation, ALWAYS delegate based on your findings:

### If changes are needed:

1. Document specific feedback
2. Use the `switch_mode` tool with these parameters:
   ```
   <switch_mode>
   <mode_slug>code</mode_slug>
   <reason>
   Changes required: The implementation needs adjustments before it can be approved. Code Mode should address the following feedback: [specific feedback].
   </reason>
   </switch_mode>
   ```

### If implementation is complete and approved:

1. Coordinate committing the changes
2. Use the `switch_mode` tool with these parameters:
   ```
   <switch_mode>
   <mode_slug>architect</mode_slug>
   <reason>
   Implementation complete: All subtasks have been implemented, reviewed, and approved. The code meets quality standards and implementation plan requirements. Architect Mode should verify completion against the original plan.
   </reason>
   </switch_mode>
   ```

## Feedback Guidelines

{{feedbackGuidelines}}

## Commit Process

{{commitProcess}}
