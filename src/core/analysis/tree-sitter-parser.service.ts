import { injectable, inject } from 'inversify';
// @ts-expect-error - Suppress error due to non-standard module definition in node-tree-sitter.d.ts

// eslint-disable-next-line @typescript-eslint/no-require-imports
import Parser = require('node-tree-sitter'); // Use require import style for compatibility with .d.ts
import { Result } from '../result/result';
import { ILogger } from '../services/logger-service';
// Removed TYPES import as it's not used
import { ITreeSitterParserService } from './interfaces';
import { ParsedCodeInfo } from './types';
import path from 'path'; // Needed for extension mapping

// Define language identifiers
type SupportedLanguage = 'javascript' | 'typescript';

@injectable()
export class TreeSitterParserService implements ITreeSitterParserService {
  private readonly logger: ILogger;
  // Cache for loaded parsers to avoid reloading grammars
  private readonly parserCache: Map<SupportedLanguage, Parser> = new Map();
  // Map file extensions to language identifiers
  private readonly extensionLanguageMap: Record<string, SupportedLanguage> = {
    '.js': 'javascript',
    '.jsx': 'javascript', // Assuming JSX uses the JS grammar for now
    '.ts': 'typescript',
    '.tsx': 'typescript', // Assuming TSX uses the TS grammar
  };

  // Map language identifiers to the required grammar package/path
  private readonly languageGrammarMap: Record<SupportedLanguage, string> = {
    javascript: 'tree-sitter-javascript',
    typescript: 'tree-sitter-typescript/typescript', // Use the specific typescript grammar
    // Add more languages here as needed, e.g., python: 'tree-sitter-python'
  };

  constructor(@inject('ILogger') logger: ILogger) {
    // Use string token 'ILogger'
    this.logger = logger; // Use logger directly, no forService method
    this.logger.info('TreeSitterParserService initialized.');
    // Preload parsers? Or load on demand? Let's load on demand for now.
  }

  /**
   * Gets the language identifier based on the file extension.
   * @param filePath - The path to the file.
   * @returns The language identifier or undefined if the extension is not mapped.
   */
  private getLanguageFromExtension(filePath: string): SupportedLanguage | undefined {
    const ext = path.extname(filePath).toLowerCase();
    return this.extensionLanguageMap[ext];
  }

  /**
   * Loads the Tree-sitter grammar for the specified language.
   * Handles dynamic require and caching.
   * @param language - The language identifier.
   * @returns A Promise resolving to a Result containing the Parser instance or an Error.
   */
  private async loadParser(language: SupportedLanguage): Promise<Result<Parser, Error>> {
    // Keep async for dynamic import
    if (this.parserCache.has(language)) {
      this.logger.debug(`Using cached parser for language: ${language}`);
      return Result.ok(this.parserCache.get(language));
    }

    const grammarPath = this.languageGrammarMap[language];
    if (!grammarPath) {
      const error = new Error(`Grammar path not defined for language: ${language}`);
      this.logger.error(error.message);
      return Result.err(error);
    }

    this.logger.info(`Attempting to load grammar for language: ${language} from ${grammarPath}`);
    try {
      // Dynamically require the grammar module

      // Dynamically import the grammar module
      const LanguageModule = await import(grammarPath);
      const parser = new Parser();
      // Tree-sitter grammars might be default exports or named exports
      // Adjust based on actual grammar structure if needed. Assuming default/main export.
      parser.setLanguage(LanguageModule.default || LanguageModule);
      this.parserCache.set(language, parser);
      this.logger.info(`Successfully loaded and cached parser for language: ${language}`);
      return Result.ok(parser);
    } catch (error: unknown) {
      const loadError = new Error(
        `Failed to load Tree-sitter grammar for ${language} from ${grammarPath}: ${error instanceof Error ? error.message : String(error)}`
      );
      this.logger.error(loadError.message, error instanceof Error ? error : undefined); // Pass error directly
      // Don't cache failures, allow retrying later if needed
      return Result.err(loadError);
    }
  }

  /**
   * Parses the given code content using the appropriate Tree-sitter grammar.
   * @param content - The source code content as a string.
   * @param language - The language identifier (e.g., 'javascript', 'typescript').
   * @returns A Promise resolving to a Result containing the parsed code information or an Error.
   */
  async parse(
    content: string,
    language: SupportedLanguage
  ): Promise<Result<ParsedCodeInfo, Error>> {
    this.logger.info(`Parsing content for language: ${language}`);

    const loadResult = await this.loadParser(language);
    if (loadResult.isErr()) {
      // Type-safe error propagation
      return Result.err(loadResult.error!); // Add non-null assertion
    }

    const parser = loadResult.value;

    try {
      // TODO: Implement actual parsing and querying in Subtask 3
      // For now, just initialize the parser and return a placeholder
      const tree = parser.parse(content);
      this.logger.debug(
        `Successfully created syntax tree for language: ${language}. Root node type: ${tree.rootNode.type}`
      );

      // Placeholder result - actual extraction logic will be in the next subtask
      const parsedInfo: ParsedCodeInfo = {
        functions: [],
        classes: [],
      };
      this.logger.info(`Parsing complete (placeholder) for language: ${language}`);
      return Result.ok(parsedInfo);
    } catch (error: unknown) {
      const parseError = new Error(
        `Error during Tree-sitter parsing for ${language}: ${error instanceof Error ? error.message : String(error)}`
      );
      this.logger.error(parseError.message, error instanceof Error ? error : undefined); // Pass error directly
      return Result.err(parseError);
    }
  }
}
