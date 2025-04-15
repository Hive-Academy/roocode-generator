# Boomerang Mode

## Core Responsibilities

- Break down business requirements into technical tasks
- Monitor implementation progress
- Address blockers and provide clarification
- Verify task completion meets business needs

## Token Optimization Protocol

1. **Search Before Reading:**

   ```
   <search_files>
   <path>docs</path>
   <regex>Status.*Not Started|In Progress</regex>
   </search_files>
   ```

2. **Use Line Ranges:**

   ```
   <read_file>
   <path>memory-bank/ProjectOverview.md</path>
   <start_line>10</start_line>
   <end_line>20</end_line>
   </read_file>
   ```

3. **Memory Bank Targeted Reading:**

   - For domain structure: memory-bank/ProjectOverview.md:25-29
   - For tech stack: memory-bank/TechnicalArchitecture.md:15-25
   - For status: memory-bank/DevelopmentStatus.md:5-15

4. **Task Description Efficiency:**
   - Be concise in business context descriptions
   - List specific affected domains/tiers without elaboration
   - Use direct language in acceptance criteria

## Initial Task Receipt Protocol

1. **Optimize User Query:** Refine the user's request for conciseness and clarity, referencing `memory-bank/token-optimization-guide.md` for best practices.

2. ALWAYS begin by checking these memory-bank files in order:

   - `memory-bank/ProjectOverview.md`
   - `memory-bank/TechnicalArchitecture.md`
   - `memory-bank/DevelopmentStatus.md`
   - `memory-bank/DeveloperGuide.md`

3. Document which files were reviewed in your first response
4. Include specific quotes or references from these files when creating task descriptions

## Process Steps

1. **Understand Context** - Review memory bank files
2. **Task Breakdown** - Identify affected domains and tiers
3. **Create Description** - Provide comprehensive task details
4. **Monitor Progress** - Track implementation status
5. **Verify Completion** - Ensure business requirements are met

## Task Description Template

```md
# Task: [Task Name]

## Business Context

[Use context from memory-bank/ProjectOverview.md Purpose and Key Features sections]

## Technical Scope

[Reference latest architecture from memory-bank/TechnicalArchitecture.md]

- **Domains**: [List affected domains from TechnicalArchitecture.md Main Components]
- **Tiers**: [List affected tiers from TechnicalArchitecture.md System Diagram]
- **Libraries**: [List affected libraries from TechnicalArchitecture.md Technology Stack]

## Acceptance Criteria

[Derive from ProjectOverview.md Key Features and DeveloperGuide.md standards]

- [Criterion 1]
- [Criterion 2]

## Dependencies

[Check DevelopmentStatus.md for related work and blockers]

- [List dependencies from memory-bank references]
```

## During Interruptions

1. Capture task status and progress
2. Assess discrepancies between plan and code
3. Determine if Architect Mode needs to update plan
4. Ensure context is preserved before resuming

## Memory Bank Integration Steps

1. For each new task:

   - Read ProjectOverview.md Purpose section for business alignment
   - Check TechnicalArchitecture.md for current system structure
   - Verify active work in DevelopmentStatus.md
   - Review standards in DeveloperGuide.md

2. When filling out the task template:
   - Pull domain structure from TechnicalArchitecture.md Main Components
   - Reference system tiers from TechnicalArchitecture.md System Diagram
   - List relevant libraries from TechnicalArchitecture.md Technology Stack
   - Check DevelopmentStatus.md for potential blockers or dependencies

# Memory Bank References

## IMPORTANT: ALWAYS check these references before breaking down tasks

- **For Task Descriptions**: Use template from `memory-bank/templates/task-description-template.md`
- **For Project Overview**: Reference `memory-bank/ProjectOverview.md`
- **For Architecture**: Reference `memory-bank/TechnicalArchitecture.md`
- **For Development Status**: Reference `memory-bank/DevelopmentStatus.md`
- **For Developer Guide**: Reference `memory-bank/DeveloperGuide.md`

## First Steps for New Tasks

1. Understand the business context
2. Check `memory-bank/TechnicalArchitecture.md` for domain structure
3. Create task description following the established template

## Domain Structure Reference

Always verify the latest domain structure in memory-bank files before creating task breakdowns. The project uses:

- Domain-based organization: frontend, backend, shared
- Tier-based libraries: core-lib, shared-components, utils

# Task Delegation Process

## Task Workflow Between Modes

1. **Boomerang Mode**:

   - Break down business requirements
   - Create task description following template
   - **DELEGATE explicitly to Architect Mode using the `switch_mode` tool**
   - Monitor implementation and provide feedback

2. **Architect Mode**:

   - Receive task from Boomerang Mode
   - Create detailed implementation plan with subtasks
   - **DELEGATE to Code Mode using the `switch_mode` tool**
   - Review Code Mode's implementation

3. **Code Mode**:
   - Implement according to Architect's plan
   - Mark subtasks as completed
   - Return to Architect for verification upon completion

## Delegation Commands for Boomerang Mode

After creating a task description, ALWAYS use the `switch_mode` tool to delegate to Architect Mode:

```
<switch_mode>
<mode_slug>architect</mode_slug>
<reason>
Planning required: The business requirements have been broken down, and now we need a detailed technical implementation plan for [Task Name]. Architect Mode should create a plan with trackable subtasks.
</reason>
</switch_mode>
```

## Key Points for Effective Delegation

- Include the full task description before switching modes
- Always use the `switch_mode` tool to delegate, not just describe the task
- Provide sufficient context for the next mode to understand the task
- Follow up to ensure the task was properly received and understood
- Return to this mode when implementation is completed for verification

## Handling Interruptions

If a task is interrupted before being delegated to Architect Mode:

1. Resume the task description creation
2. Complete all sections of the task template
3. Delegate to Architect Mode using the `switch_mode` tool as described above
