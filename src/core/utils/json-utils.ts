import { jsonrepair } from 'jsonrepair';
import { ILogger } from '../services/logger-service'; // Import only ILogger interface

/**
 * Parses a JSON string robustly using a provided logger instance.
 * Attempts standard JSON.parse first. If that fails, it attempts to repair
 * the string using `jsonrepair` and then parse the repaired string.
 * Logs warnings and errors using LoggerService.
 *
 * @template T The expected type of the parsed object.
 * @param jsonString The JSON string to parse.
 * @param logger An instance of LoggerService (or compatible ILogger) for logging.
 * @returns A promise that resolves with the parsed object.
 * @throws An error if the string cannot be parsed even after repair.
 */
export async function parseRobustJson<T = any>( // Added async keyword
  jsonString: string,
  logger: ILogger // Accept logger instance
): Promise<T> {
  try {
    // Attempt standard parsing
    const result = JSON.parse(jsonString);
    // Async function automatically wraps this in Promise.resolve()
    return result;
  } catch (e1) {
    const parseError = e1 instanceof Error ? e1.message : String(e1);
    // Log only the beginning of potentially long strings
    const preview = jsonString.length > 100 ? `${jsonString.substring(0, 100)}...` : jsonString;
    logger.warn(
      `Standard JSON parsing failed for string: "${preview}". Error: ${parseError}. Attempting repair.`
    );
    try {
      const repairedJson = jsonrepair(jsonString);
      // Attempt parsing the repaired string
      const parsedResult = JSON.parse(repairedJson);

      // Check if the repaired result is actually structured data (object or array)
      if (typeof parsedResult !== 'object' || parsedResult === null) {
        throw new Error(
          `Repaired JSON parsed successfully but is not an object or array (type: ${typeof parsedResult}). Original string: "${preview}"`
        );
      }

      logger.info(`Successfully parsed JSON after repair for string: "${preview}"`);
      // Async function automatically wraps this in Promise.resolve()
      return parsedResult;
    } catch (e2) {
      // THIS IS THE CRITICAL BLOCK as per Senior Dev feedback
      const error = new Error(
        `Failed to parse JSON string even after repair. Initial Error: ${e1 instanceof Error ? e1.message : String(e1)}, Repair Error: ${e2 instanceof Error ? e2.message : String(e2)}`
      );
      logger.error(
        `JSON repair and subsequent parsing failed for string: "${preview}"`,
        error // Log the constructed error
      );
      // Explicitly reject the promise to ensure async rejection
      return Promise.reject(error);
    }
  }
}
