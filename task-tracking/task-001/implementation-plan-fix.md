# Implementation Plan: Fix RulesGenerator DI Registration (Task 001)

## 1. Overview

This plan addresses a bug identified during the verification of Task 001 ("Update Rules Generator Output Format"). The `RulesGenerator` is not being instantiated with the correct number of dependencies in the Dependency Injection (DI) container configuration, specifically missing the `IRulesFileManager`. This prevents the generator from running correctly.

**Reference Task:** task-001
**File to Modify:** `src/core/di/modules/rules-module.ts`

## 2. Architecture Decision Record

- **Context**: The DI factory for `IGenerator.Rules` in `src/core/di/modules/rules-module.ts` incorrectly omits the `IRulesFileManager` dependency when instantiating `RulesGenerator`. The `RulesGenerator` constructor requires this dependency.
- **Decision**: Modify the factory function for `IGenerator.Rules` to resolve the `IRulesFileManager` dependency from the container and pass it as the final argument to the `RulesGenerator` constructor.
- **Consequences**:
  - Positive: The `RulesGenerator` will be correctly instantiated with all its required dependencies, resolving the runtime/build error. The `generate --generators rules` command should become executable.
  - Negative: None anticipated. This aligns the DI configuration with the class definition.
- **Alternatives considered**: None, this is a direct bug fix required for correctness.

## 3. Component Architecture

No changes to the overall component architecture. This is a fix within the existing DI wiring.

## 4. Interface Changes

No interface changes are required.

## 5. Data Flow

No changes to the data flow.

## 6. Implementation Subtasks

### 1. Fix RulesGenerator DI Registration

**Description**: Update the factory function for the `IGenerator.Rules` token in `src/core/di/modules/rules-module.ts` to correctly resolve and pass the `IRulesFileManager` dependency to the `RulesGenerator` constructor.

**Dependencies**: None.

**Implementation Details**:

```typescript
// In src/core/di/modules/rules-module.ts

// Within the container.registerFactory<IGenerator<RulesConfig>>('IGenerator.Rules', () => { ... });

// 1. Add the resolution for IRulesFileManager
const rulesFileManager = resolveDependency<IRulesFileManager>(container, 'IRulesFileManager');

// 2. Update the constructor call to include rulesFileManager as the last argument
return new RulesGenerator(
  serviceContainer,
  logger,
  fileOps,
  projectAnalyzer,
  llmAgent,
  contentProcessor,
  rulesFileManager // <-- Add this argument
);
```

**Testing Requirements**:

- Verify the application builds successfully after the change.
- Verify the command `node dist/bin/cli.js generate --generators rules` (or equivalent) executes without DI-related errors. (Manual verification after build).

**Acceptance Criteria**:

- [ ] The `IRulesFileManager` dependency is resolved within the `IGenerator.Rules` factory function.
- [ ] The resolved `rulesFileManager` instance is passed as the 7th argument to the `RulesGenerator` constructor.
- [ ] The application builds successfully.

**Estimated effort**: 15 minutes

## 7. Implementation Sequence

1.  Fix RulesGenerator DI Registration

## 8. Risk Assessment

- **Risk**: Minimal. Incorrect modification could lead to other DI errors.
- **Mitigation**: Carefully follow the implementation details. Verify the build succeeds.

## 9. Testing Strategy

- Successful build compilation.
- Manual execution of the `generate --generators rules` command to confirm the DI error is resolved.

## 10. Verification Checklist

- [x] Implementation plan follows the required template (adapted for a fix).
- [x] Architecture decisions documented with rationales.
- [ ] Component diagrams included and accurate (N/A for this fix).
- [ ] Interface definitions are complete (N/A for this fix).
- [x] Subtasks are fully detailed with acceptance criteria.
- [x] Implementation sequence is clear with dependencies.
- [x] Risk assessment included with mitigation strategies.
- [x] Testing strategy is comprehensive.
- [x] All diagrams and code examples render correctly.
