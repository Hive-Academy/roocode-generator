# Container Test Coverage Implementation Plan

## Overview

Add missing test coverage for the Container class in `src/core/di/container.ts`, focusing on error handling scenarios and singleton management.

## Architecture Decision Record

### Context

- The Container class has incomplete test coverage for critical error handling paths
- Missing tests for singleton management and validation scenarios
- Need to ensure robust error handling for dependency injection edge cases

### Decision

- Add comprehensive test cases for all uncovered code paths
- Focus on error scenarios and edge cases
- Maintain existing test structure and patterns

### Consequences

- Improved reliability through complete test coverage
- Better error handling validation
- More maintainable codebase

## Implementation Subtasks

### 1. Test Injectable Decorator Validation

**Description**: Add test for non-injectable class registration validation (line 68)

**Implementation Details**:

```typescript
it('should return error when registering non-injectable class', () => {
  class NonInjectableService {}
  const result = container.register('TestToken', NonInjectableService);
  expect(result.isErr()).toBe(true);
  expect(result.error?.message).toContain('must be decorated with @Injectable()');
});
```

**Testing Requirements**:

- Verify error when registering non-injectable class
- Check error message format

### 2. Test Container Clear Method

**Description**: Add tests for the clear() method implementation (lines 178-180)

**Implementation Details**:

```typescript
describe('clear', () => {
  it('should clear all registrations and singletons', () => {
    // Setup test services and verify initial state
    // Call clear()
    // Verify services and singletons are cleared
  });
});
```

**Testing Requirements**:

- Verify services map is cleared
- Verify singletons map is cleared
- Verify resolution stack is cleared

### 3. Test Singleton Factory Instance Caching

**Description**: Add tests for singleton factory instance caching (line 194)

**Implementation Details**:

```typescript
it('should cache and reuse singleton factory instances', () => {
  // Register singleton factory
  // Resolve multiple times
  // Verify same instance is returned
});
```

**Testing Requirements**:

- Verify instance caching behavior
- Test multiple resolutions return same instance

### 4. Test Dependency Resolution Error Handling

**Description**: Add tests for dependency resolution error handling (lines 209-217)

**Implementation Details**:

```typescript
describe('dependency resolution errors', () => {
  it('should handle errors during dependency resolution', () => {
    // Setup service with failing dependency
    // Attempt resolution
    // Verify error handling
  });
});
```

**Testing Requirements**:

- Test error propagation
- Verify error wrapping
- Check error message format

### 5. Test Container Initialization Check

**Description**: Add test for container initialization validation (line 234)

**Implementation Details**:

```typescript
it('should require initialization before use', () => {
  const uninitializedContainer = Container.getInstance();
  uninitializedContainer.clear(); // Reset initialization
  const result = uninitializedContainer.resolve('any');
  expect(result.isErr()).toBe(true);
  expect(result.error?.message).toContain('not initialized');
});
```

**Testing Requirements**:

- Verify initialization check
- Test error message

### 6. Test Token Validation

**Description**: Add tests for token validation (line 240)

**Implementation Details**:

```typescript
describe('token validation', () => {
  it('should reject invalid tokens', () => {
    // Test various invalid token types
    // Verify validation errors
  });
});
```

**Testing Requirements**:

- Test null/undefined tokens
- Test invalid token types
- Verify error messages

### 7. Test Implementation Validation

**Description**: Add tests for implementation validation (line 247)

**Implementation Details**:

```typescript
describe('implementation validation', () => {
  it('should reject invalid implementations', () => {
    // Test various invalid implementations
    // Verify validation errors
  });
});
```

**Testing Requirements**:

- Test null/undefined implementations
- Test non-function implementations
- Verify error messages

### 8. Test Circular Dependency Detection

**Description**: Add tests for circular dependency detection (line 253)

**Implementation Details**:

```typescript
describe('circular dependency detection', () => {
  it('should detect circular dependencies', () => {
    // Setup circular dependency scenario
    // Attempt resolution
    // Verify error detection
  });
});
```

**Testing Requirements**:

- Test simple circular dependency
- Test complex circular dependency chain
- Verify error message includes dependency chain

## Implementation Sequence

1. Test Injectable Decorator Validation

   - Dependencies: None
   - Enables: Basic validation testing

2. Test Container Clear Method

   - Dependencies: None
   - Enables: State management testing

3. Test Singleton Factory Instance Caching

   - Dependencies: None
   - Enables: Lifecycle management testing

4. Test Dependency Resolution Error Handling

   - Dependencies: Injectable Decorator Validation
   - Enables: Error handling testing

5. Test Container Initialization Check

   - Dependencies: None
   - Enables: Lifecycle validation testing

6. Test Token Validation

   - Dependencies: None
   - Enables: Input validation testing

7. Test Implementation Validation

   - Dependencies: Token Validation
   - Enables: Complete validation testing

8. Test Circular Dependency Detection
   - Dependencies: All previous tasks
   - Completes the test coverage

## Risk Assessment

### Risks

1. Test interference due to singleton pattern
2. Complex dependency scenarios
3. Async timing issues

### Mitigation

1. Clear container state between tests
2. Use isolated test services
3. Proper test cleanup

## Testing Strategy

### Unit Testing

- Each subtask has specific test cases
- Focus on edge cases and error conditions
- Verify error messages and types

### Integration Testing

- Test complex dependency scenarios
- Verify singleton behavior across resolutions
- Test circular dependency detection

## Verification Checklist

- [ ] All subtasks have detailed test cases
- [ ] Error scenarios are covered
- [ ] Singleton behavior is verified
- [ ] Circular dependencies are detected
- [ ] All uncovered lines are addressed
- [ ] Tests follow existing patterns
- [ ] No test interference between cases
- [ ] Clear error messages are verified

## Memory Bank References

- DeveloperGuide.md: Testing standards and practices
- TechnicalArchitecture.md: DI container design principles
