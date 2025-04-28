# Task Description: Refactor Rules Generator to "ai-magic" and Convert Memory Bank Generator to Service

## Background

The current system has separate Rules Generator and Memory Bank Generator. The Rules Generator performs advanced project analysis, while the Memory Bank Generator generates files based on project context.

## Objective

Refactor the Rules Generator by renaming it to "ai-magic" and enhance it to perform project scanning and analysis. Refactor the Memory Bank Generator into a service that the ai-magic generator calls to generate memory bank files using the analyzed project context.

## Functional Requirements

- Rename the current Rules Generator to "ai-magic".
- The ai-magic generator will perform project scanning and analysis using the existing projectAnalyzer service.
- Refactor the Memory Bank Generator to become a service that:
  - Accepts structured project context data from ai-magic.
  - Generates memory bank files using templates and content generation logic.
- The ai-magic generator will call the memory bank service to generate memory bank files as part of its generation process.
- Maintain modular separation between ai-magic generation logic and memory bank generation service.

## Technical Requirements

- Update dependency injection to register the ai-magic generator and memory bank service appropriately.
- Adapt the memory bank orchestrator and content generator to accept structured project context from ai-magic.
- Ensure backward compatibility and minimal disruption to existing workflows.
- Implement comprehensive tests to verify generation correctness and integration.
- Update documentation to reflect the new architecture and usage.

## Constraints

- Avoid major codebase disruptions.
- Maintain clear and maintainable code structure.
- Ensure performance is not negatively impacted.

## Success Criteria

- Rules Generator is renamed and enhanced as ai-magic.
- Memory Bank Generator is refactored into a callable service.
- ai-magic generator successfully calls memory bank service to generate files.
- Generation outputs remain consistent or improved.
- No regressions or major bugs introduced.
- Documentation and tests are updated accordingly.

## References

- Rules Generator: src/generators/rules/rules-generator.ts
- Memory Bank Generator and Orchestrator: src/memory-bank/memory-bank-generator.ts, src/memory-bank/memory-bank-orchestrator.ts
- Project Analyzer: src/core/analysis/project-analyzer.ts

## Deliverables

- Updated ai-magic generator code (renamed from rules generator).
- Refactored memory bank generator as a service.
- Updated dependency injection configuration.
- Test suite updates.
- Updated documentation.

## Timeline

- Complete the entire refactor, including testing, within approximately 1 hour.

---

Please proceed with creating a detailed implementation plan and managing the full implementation lifecycle.
