# Token Optimization Guide

## User Request Patterns (How to Ask)

### File Updates (50-70% token reduction)

```
Update [file]:
1. Change [specific item] status to [value]
2. Add note: "[brief note]"
3. [other specific changes]
```

### Code Implementation (40-60% token reduction)

```
Implement [component]:
1. Use [pattern/model] for structure
2. Reference [similar component]
3. Focus on [specific functionality]
```

## Tool Usage Optimization

### Search Before Reading

- ALWAYS use search_files before reading entire files:
  {{searchPattern}}

### Read Only What's Needed

- Use line ranges to target specific sections:
  {{readPattern}}

### Memory Bank Reference Table

| Information           | File                    | Line Range                   | Search Pattern            |
| --------------------- | ----------------------- | ---------------------------- | ------------------------- |
| Domain/Tier Structure | {{domainStructureFile}} | {{domainStructureLineRange}} | {{domainStructureSearch}} |
| Project Tech          | {{projectTechFile}}     | {{projectTechLineRange}}     | {{projectTechSearch}}     |

## Mode-Specific Guidelines

### Boomerang Mode

1. Search for status info before reading entire files
2. Reference line numbers from the table above
3. Use only essential context in mode transitions

### Architect Mode

1. Reference templates by name, don't include them
2. Write concise subtask descriptions
3. Focus on changes from standard patterns

### Code Mode

1. Check specific code sections before full files
2. Update only changed status sections
3. Use line numbers in file operations

## System Prompt Enhancements

Add this block to each system prompt:

```
## TOKEN OPTIMIZATION

1. SEARCH before reading entire files
2. Use LINE RANGES for targeted reading
3. Reference memory-bank/token-optimization-guide.md
4. Update only CHANGED sections of files
5. Use CONCISE language in all operations
```
