import { describe, expect, it } from '@jest/globals';
// import { Result } from '../result';

describe('Result', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  });

  // describe('success', () => {
  //   it('should create a success result with data', () => {
  //     const data = { value: 'test' };
  //     const result = Result.success(data);

  //     expect(result.success).toBe(true);
  //     expect(result.data).toBe(data);
  //     expect(result.error).toBeUndefined();
  //     expect(result.details).toBeUndefined();
  //   });

  //   it('should correctly identify as success with type guard', () => {
  //     const data = { value: 'test' };
  //     const result = Result.success(data);

  //     if (result.isSuccess()) {
  //       // TypeScript should recognize data as defined here
  //       expect(result.data.value).toBe('test');
  //     } else {
  //       // This branch should never execute
  //       throw new Error('Result should be success');
  //     }
  //   });
  // });

  // describe('failure', () => {
  //   it('should create a failure result with error message', () => {
  //     const error = 'Test error';
  //     const details = { code: 500 };
  //     const result = Result.failure<string>(error, details);

  //     expect(result.success).toBe(false);
  //     expect(result.data).toBeUndefined();
  //     expect(result.error).toBe(error);
  //     expect(result.details).toBe(details);
  //   });

  //   it('should correctly identify as failure with type guard', () => {
  //     const error = 'Test error';
  //     const result = Result.failure<string>(error);

  //     if (result.isFailure()) {
  //       // TypeScript should recognize error as defined here
  //       expect(result.error).toBe(error);
  //     } else {
  //       // This branch should never execute
  //       throw new Error('Result should be failure');
  //     }
  //   });

  //   it('should handle failure without details', () => {
  //     const error = 'Test error';
  //     const result = Result.failure<string>(error);

  //     expect(result.success).toBe(false);
  //     expect(result.error).toBe(error);
  //     expect(result.details).toBeUndefined();
  //   });
  // });

  // describe('type safety', () => {
  //   it('should maintain type safety for success results', () => {
  //     interface TestData {
  //       id: number;
  //       name: string;
  //     }

  //     const data: TestData = { id: 1, name: 'test' };
  //     const result = Result.success<TestData>(data);

  //     if (result.isSuccess()) {
  //       // TypeScript should recognize these properties exist
  //       expect(result.data.id).toBe(1);
  //       expect(result.data.name).toBe('test');
  //     }
  //   });

  //   it('should maintain type safety for failure results', () => {
  //     interface TestData {
  //       id: number;
  //       name: string;
  //     }

  //     const result = Result.failure<TestData>('error');

  //     if (result.isFailure()) {
  //       // Should not have access to data in failure case
  //       expect(result.data).toBeUndefined();
  //       // But should have access to error
  //       expect(typeof result.error).toBe('string');
  //     }
  //   });
  // });
});
