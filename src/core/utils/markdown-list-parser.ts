import { Result } from '@core/result/result';

/**
 * Utility class for parsing Markdown unordered lists.
 * Extracts list items while ignoring non-list content.
 */
export class MarkdownListParser {
  /**
   * Extracts items from a Markdown unordered list, ignoring any non-list content.
   * Handles various edge cases including empty input, no list items, and mixed content.
   *
   * @param content The markdown content to parse
   * @returns Result containing array of list items or error
   *
   * @example
   * ```
   * const content = `
   * Some text
   * - First item
   * - Second item
   * More text
   * `;
   * const result = MarkdownListParser.extractListItems(content);
   * // result.value = ["First item", "Second item"]
   * ```
   */
  public static extractListItems(content: string): Result<string[], Error> {
    try {
      // Handle empty or invalid input
      if (!content || typeof content !== 'string') {
        return Result.ok([]);
      }

      // Split content into lines
      const lines = content.split('\n');

      // Extract list items
      const listItems: string[] = [];

      for (const line of lines) {
        const trimmedLine = line.trim();

        // Check if line starts with "- " (unordered list marker)
        if (trimmedLine.startsWith('- ')) {
          // Remove the "- " prefix and trim any remaining whitespace
          const item = trimmedLine.substring(2).trim();

          // Only add non-empty items
          if (item) {
            listItems.push(item);
          }
        }
      }

      return Result.ok(listItems);
    } catch (error) {
      return Result.err(
        error instanceof Error ? error : new Error('Failed to parse markdown list')
      );
    }
  }
}
