# Implementation Plan: Fix OpenRouter Missing Choices Error

**Task ID:** TSK-004
**Task Name:** Fix OpenRouter Missing Choices Error
**Status:** Ready for Review

## Overview

This plan addresses the "missing or empty choices array" error in the `OpenRouterProvider` by enhancing its response handling logic. The fix will involve checking for unexpected error structures within the response body, even when the HTTP status code is 200. The full unexpected response data will be logged for debugging, and a more informative `LLMProviderError` will be thrown when an error structure is detected in the body. Existing logic for handling missing/empty `choices` arrays and successful responses will be preserved.

## Implementation Strategy

The core of the implementation will be modifying the `getCompletion` method in `src/core/llm/providers/open-router-provider.ts`. After a successful HTTP response (`response.ok` is true), the code will first check if the parsed JSON data contains an `error` field or a similar indicator of an internal API error. If such an error is found, the full response data will be logged, and a specific `LLMProviderError` will be thrown, potentially using details from the error structure in the response body. The existing checks for the `choices` array will then follow, handling cases where the array is missing or empty without an explicit error field. Unit tests will be updated to cover these new error handling paths.

## Acceptance Criteria Mapping

- **AC1 (No crash):** Satisfied by implementing robust error handling that catches unexpected response structures before attempting to access `choices`.
- **AC2 (Handle body errors):** Satisfied by adding explicit checks for error structures within the response body when `response.ok` is true.
- **AC3 (Log unexpected data):** Satisfied by adding logging of the full response data when an unexpected structure (either an error field or missing `choices`) is encountered.
- **AC4 (Appropriate LLMProviderError):** Satisfied by throwing a specific `LLMProviderError` with a message derived from the response body's error structure when available.
- **AC5 (Successful responses):** Satisfied by ensuring the new error handling logic does not interfere with the correct processing of valid responses containing the `choices` array.
- **AC6 (Unit tests):** Satisfied by adding or updating unit tests to cover the new error handling scenarios for unexpected response structures.

## Implementation Subtasks

### 1. Enhance OpenRouter Response Error Handling

**Status**: ✅ Completed

**Description**: Modify the `getCompletion` method to check for an 'error' field or similar error structure in the parsed JSON response body _before_ checking for the 'choices' array, specifically when the HTTP response is OK (status 200).

**Files Modified**:

- `src/core/llm/providers/open-router-provider.ts` - Added conditional logic to inspect the response body for error indicators.

**Implementation Details**:

```typescript
// Inside getCompletion, after const data = (await response.json()) as OpenRouterCompletionResponse;
if (data && typeof data === 'object' && 'error' in data) {
  this.logger.error('OpenRouter response contained an error in the body', { responseData: data });
  const errorMessage = (data as any).error?.message || JSON.stringify((data as any).error);
  throw new LLMProviderError(
    `OpenRouter API error in body: ${errorMessage}`,
    'API_ERROR_IN_BODY',
    this.name,
    { responseData: data }
  );
}
```

**Testing Requirements**:

- Manually test with a mock OpenRouter response that has a 200 status but an error structure in the body.
- Verify the error is logged and thrown correctly.

**Related Acceptance Criteria**: AC1, AC2, AC3, AC4

### 2. Update Error Logging for Missing Choices

**Status**: ✅ Completed

**Description**: Enhance the existing error handling for missing/empty choices array to include detailed logging of the full response data.

**Files Modified**:

- `src/core/llm/providers/open-router-provider.ts` - Updated the existing error handling block for missing choices with detailed logging.

**Implementation Details**:

```typescript
if (!data || !Array.isArray(data.choices) || data.choices.length === 0) {
  this.logger.error(
    'OpenRouter response has invalid structure: missing or empty choices array. Response data: ' +
      JSON.stringify(data),
    new Error('Invalid response structure')
  );
  throw new LLMProviderError(
    'OpenRouter response has invalid structure: missing or empty choices array',
    'INVALID_RESPONSE_FORMAT',
    this.name,
    { responseData: data }
  );
}
```

**Testing Requirements**:

- Verify that the full response data is logged when the choices array is missing or empty.
- Ensure the error message is clear and helpful for debugging.

**Related Acceptance Criteria**: AC3, AC4

### 3. Update Unit Tests

**Status**: ✅ Completed

**Description**: Add comprehensive unit tests to cover the new error handling logic and verify existing functionality.

**Files Modified**:

- `tests/core/llm/providers/open-router-provider.test.ts` - Added new test cases and updated existing ones.

**Implementation Details**:

- Added new test suite "getCompletion - TSK-004 Error Handling"
- Implemented tests for:
  - 200 response with error in body
  - 200 response missing choices array
  - Valid successful response
- Added comprehensive assertions for error messages, codes, and logging calls

**Testing Requirements**:

- All new and existing tests pass successfully
- Test coverage includes all new error handling paths
- Logging calls are verified in each error scenario

**Related Acceptance Criteria**: AC1, AC2, AC3, AC4, AC5, AC6

## Implementation Sequence

1. ✅ Enhance OpenRouter Response Error Handling - Implement the core logic for checking body errors.
2. ✅ Update Error Logging for Missing Choices - Enhance existing error handling with detailed logging.
3. ✅ Update Unit Tests - Add comprehensive tests for the new logic and verify existing functionality.

## Testing Strategy

Unit tests will be the primary method for verifying the fix. New test cases have been added to `tests/core/llm/providers/open-router-provider.test.ts` to specifically mock API responses that trigger the new error handling paths:

- 200 status with error structure in body
- 200 status with missing choices array
- Valid response with choices array

Each test verifies both the error handling/success path and the logging behavior. The tests have been implemented and are passing successfully.
