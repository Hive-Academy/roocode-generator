/* eslint-disable @typescript-eslint/only-throw-error */
/* eslint-disable @typescript-eslint/unbound-method */
// tests/core/utils/json-utils.test.ts
import { createMockLogger } from '../../__mocks__/logger.mock'; // Corrected shared mock path
import { ILogger } from '../../../src/core/services/logger-service'; // Corrected path again
import { parseRobustJson } from '../../../src/core/utils/json-utils'; // Corrected path

// jsonrepair is used directly by the function, no need to import it here unless mocking

describe('parseRobustJson', () => {
  let mockLogger: jest.Mocked<ILogger>; // Use Jest's Mocked type

  beforeEach(() => {
    // Reset mocks before each test
    mockLogger = createMockLogger();
    // No need to clear individual mocks when using createMockLogger factory each time
    // It returns fresh mocks.
  });

  it('should parse valid JSON correctly without logging warnings/errors/info', async () => {
    // Added async
    const validJsonString = '{ "name": "Test", "value": 123, "nested": { "flag": true } }';
    const expectedObject = { name: 'Test', value: 123, nested: { flag: true } };

    const result = await parseRobustJson(validJsonString, mockLogger); // Added await

    expect(result).toEqual(expectedObject);
    expect(mockLogger.warn).not.toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
    expect(mockLogger.info).not.toHaveBeenCalled(); // Should not log info on direct parse
    // Removed check for mockLogger.log as it doesn't exist on ILogger
    expect(mockLogger.debug).not.toHaveBeenCalled();
  });

  it('should repair and parse JSON with trailing comma, logging warn and info', async () => {
    // Added async
    const malformedJson = '{ "key": "value", }';
    const expectedObject = { key: 'value' };

    const result = await parseRobustJson(malformedJson, mockLogger); // Added await

    expect(result).toEqual(expectedObject);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    // Check for key parts of the message due to dynamic content
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Standard JSON parsing failed') // Only one argument expected
    );
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
    // Check for key parts of the message
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Successfully parsed JSON after repair') // Only one argument expected
    );
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should repair and parse JSON with unquoted keys, logging warn and info', async () => {
    // Added async
    const malformedJson = '{ key: "value", anotherKey: 123 }';
    const expectedObject = { key: 'value', anotherKey: 123 };

    const result = await parseRobustJson(malformedJson, mockLogger); // Added await

    expect(result).toEqual(expectedObject);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    // Check for key parts of the message
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Standard JSON parsing failed') // Only one argument expected
    );
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
    // Check for key parts of the message
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Successfully parsed JSON after repair') // Only one argument expected
    );
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should repair and parse JSON with comments, logging warn and info', async () => {
    // Added async
    const malformedJson = '// This is a comment\n{ "key": "value" /* another comment */ }';
    const expectedObject = { key: 'value' };

    const result = await parseRobustJson(malformedJson, mockLogger); // Added await

    expect(result).toEqual(expectedObject);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    // Check for key parts of the message
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Standard JSON parsing failed') // Only one argument expected
    );
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
    // Check for key parts of the message
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Successfully parsed JSON after repair') // Only one argument expected
    );
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should repair and parse JSON with single quotes, logging warn and info', async () => {
    // Added async
    const malformedJson = "{ 'key': 'value', 'number': 123 }";
    const expectedObject = { key: 'value', number: 123 };

    const result = await parseRobustJson(malformedJson, mockLogger); // Added await

    expect(result).toEqual(expectedObject);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    // Check for key parts of the message
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Standard JSON parsing failed') // Only one argument expected
    );
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
    // Check for key parts of the message
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Successfully parsed JSON after repair') // Only one argument expected
    );
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should repair and parse JSON with mixed issues (trailing comma, comments, unquoted keys), logging warn and info', async () => {
    // Added async
    const malformedJson = `// Start comment
    {
      key: "value", // unquoted key
      'singleQuoteKey': true,
      "trailingComma": [1, 2, 3,], // trailing comma in array
    } // Trailing comma for object`;
    const expectedObject = { key: 'value', singleQuoteKey: true, trailingComma: [1, 2, 3] };

    const result = await parseRobustJson(malformedJson, mockLogger); // Added await

    expect(result).toEqual(expectedObject);
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    // Check for key parts of the message
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Standard JSON parsing failed') // Only one argument expected
    );
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
    // Check for key parts of the message
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Successfully parsed JSON after repair') // Only one argument expected
    );
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should throw an error and log warn/error for unrepairable JSON (plain text)', async () => {
    // Restore async
    const unrepairableJson = 'this is definitely not json';

    // Restore async check with rejects.toThrowError and regex
    await expect(parseRobustJson(unrepairableJson, mockLogger)).rejects.toThrowError(
      /Failed to parse JSON string even after repair/
    );

    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    // Check for key parts of the message
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Standard JSON parsing failed') // Only one argument expected
    );
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    // Check for key parts of the message and the error object
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('JSON repair and subsequent parsing failed'),
      expect.any(Error)
    );
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it('should throw an error and log warn/error for unrepairable JSON (broken structure)', async () => {
    // Restore async
    const unrepairableJson = '{"key": "value", "unterminated": ';

    // Expect resolution because jsonrepair turns this into {"key": "value", "unterminated": null}
    const expectedRepairedObject = { key: 'value', unterminated: null };
    await expect(parseRobustJson(unrepairableJson, mockLogger)).resolves.toEqual(
      expectedRepairedObject
    );

    // Expect warn (initial parse fail) and info (successful repair), but no error
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Standard JSON parsing failed')
    );
    expect(mockLogger.info).toHaveBeenCalledTimes(1);
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining('Successfully parsed JSON after repair')
    );
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should handle empty string input by throwing error after repair attempt', async () => {
    // Restore async
    const emptyJson = '';

    // Restore async check with rejects.toThrow and stringContaining
    // Use rejects.toThrowError with regex for more robust matching against the error message
    await expect(parseRobustJson(emptyJson, mockLogger)).rejects.toThrowError(
      /Failed to parse JSON string even after repair/
    );

    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    // Check for key parts of the message
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Standard JSON parsing failed') // Only one argument expected
    );
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    // Check for key parts of the message and the error object
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('JSON repair and subsequent parsing failed'),
      expect.any(Error) // jsonrepair throws specific error for empty string
    );
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  it('should handle JSON string with only whitespace by throwing error after repair attempt', async () => {
    // Restore async
    const whitespaceJson = '   \n\t   ';

    // Restore async check with rejects.toThrow and stringContaining
    // Use rejects.toThrowError with regex for more robust matching against the error message
    await expect(parseRobustJson(whitespaceJson, mockLogger)).rejects.toThrowError(
      /Failed to parse JSON string even after repair/
    );

    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    // Check for key parts of the message
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Standard JSON parsing failed') // Only one argument expected
    );
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    // Check for key parts of the message and the error object
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.stringContaining('JSON repair and subsequent parsing failed'),
      expect.any(Error) // jsonrepair throws specific error for whitespace
    );
    expect(mockLogger.info).not.toHaveBeenCalled();
  });

  // Generic type test
  it('should parse to the specified generic type', async () => {
    // Added async
    interface MyType {
      id: number;
      label: string;
    }
    const validJsonString = '{ "id": 42, "label": "Generic Test" }';
    const expectedObject: MyType = { id: 42, label: 'Generic Test' };

    const result = await parseRobustJson<MyType>(validJsonString, mockLogger); // Added await

    expect(result).toEqual(expectedObject);
    // Type checking should work correctly now with await
    expect(result.id).toBe(42); // Check type property access
    expect(mockLogger.warn).not.toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
    expect(mockLogger.info).not.toHaveBeenCalled();
  });
  // Test case to cover non-Error exceptions
  it('should handle non-Error thrown during initial parse and repair parse', async () => {
    const jsonString = '{"valid": "structure"}'; // Content doesn't matter due to mock
    const initialErrorString = 'Primitive Parse Error';
    const repairErrorString = 'Primitive Repair Error';

    // Mock JSON.parse to throw strings
    const parseSpy = jest
      .spyOn(JSON, 'parse')
      .mockImplementationOnce(() => {
        throw initialErrorString; // Throw string on first call
      })
      .mockImplementationOnce(() => {
        throw repairErrorString; // Throw string on second call (after repair attempt)
      });

    await expect(parseRobustJson(jsonString, mockLogger)).rejects.toThrowError(
      /Failed to parse JSON string even after repair/
    );

    // Verify warn log uses String(e1)
    expect(mockLogger.warn).toHaveBeenCalledTimes(1);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining(`Error: ${initialErrorString}`)
    );

    // Verify error log uses String(e1) and String(e2) in its message
    expect(mockLogger.error).toHaveBeenCalledTimes(1);
    expect(mockLogger.error).toHaveBeenCalledWith(
      // 1st arg: General message
      expect.stringContaining('JSON repair and subsequent parsing failed'),
      // 2nd arg: Error object with specific message content
      expect.objectContaining({
        message: expect.stringContaining(
          `Initial Error: ${initialErrorString}, Repair Error: ${repairErrorString}`
        ),
      })
    );

    expect(mockLogger.info).not.toHaveBeenCalled();

    // Restore the original JSON.parse
    parseSpy.mockRestore();
  });
});
