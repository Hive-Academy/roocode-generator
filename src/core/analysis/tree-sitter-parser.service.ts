import { Injectable, Inject } from '../di/decorators';
// @ts-expect-error - Suppress error due to non-standard module definition in node-tree-sitter.d.ts
// eslint-disable-next-line @typescript-eslint/no-require-imports
import Parser = require('node-tree-sitter');
import { Result } from '../result/result';
import { ILogger } from '../services/logger-service';
import { ITreeSitterParserService } from './interfaces';
import { ParsedCodeInfo, CodeElementInfo } from './types';
import path from 'path';
import {
  SupportedLanguage,
  EXTENSION_LANGUAGE_MAP,
  LANGUAGE_GRAMMAR_MAP,
  LanguageQueries,
  LANGUAGE_QUERIES_MAP,
} from './tree-sitter.config'; // Import from the new config file

// --- Service Implementation ---

@Injectable()
export class TreeSitterParserService implements ITreeSitterParserService {
  private readonly logger: ILogger;
  private readonly parserCache: Map<SupportedLanguage, Parser> = new Map();

  constructor(@Inject('ILogger') logger: ILogger) {
    this.logger = logger;
    this.logger.info('TreeSitterParserService initialized.');
  }

  // --- Language & Grammar Handling ---

  private getLanguageFromExtension(filePath: string): SupportedLanguage | undefined {
    const ext = path.extname(filePath).toLowerCase();
    return EXTENSION_LANGUAGE_MAP[ext];
  }

  private async _loadLanguageModule(language: SupportedLanguage): Promise<Result<any, Error>> {
    const grammarPath = LANGUAGE_GRAMMAR_MAP[language];
    if (!grammarPath) {
      return Result.err(new Error(`Grammar path not defined for language: ${language}`));
    }

    this.logger.debug(
      `Attempting to load grammar module for language: ${language} from ${grammarPath}`
    );
    try {
      const LanguageModule = await import(grammarPath);
      const languageGrammar = LanguageModule.default || LanguageModule;
      if (!languageGrammar) {
        throw new Error('Loaded module does not contain a valid Tree-sitter language grammar.');
      }
      this.logger.debug(`Successfully loaded grammar module for language: ${language}`);
      return Result.ok(languageGrammar);
    } catch (error: unknown) {
      const loadError = new Error(
        `Failed to load Tree-sitter grammar module for ${language} from ${grammarPath}: ${error instanceof Error ? error.message : String(error)}`
      );
      this.logger.error(loadError.message, error instanceof Error ? error : undefined);
      return Result.err(loadError);
    }
  }

  // --- Parser Caching & Creation ---

  /**
   * Attempts to retrieve a parser from the cache and verifies its language module.
   * @param language - The language of the parser to retrieve.
   * @returns A Result containing the cached parser if valid, or an error/null if not found or invalid.
   */

  private async _getCachedParser(language: SupportedLanguage): Promise<Result<null, Error>> {
    if (!this.parserCache.has(language)) {
      return Result.ok(null); // Not in cache
    }

    this.logger.debug(`Using cached parser for language: ${language}`);
    const cachedParser = this.parserCache.get(language)!;

    // Re-verify language module loading - ensures grammar is still accessible
    const loadResult = await this._loadLanguageModule(language);
    if (loadResult.isErr()) {
      this.parserCache.delete(language); // Remove invalid cache entry
      return Result.err(
        new Error(
          `Failed to re-verify Tree-sitter grammar for cached ${language}: ${loadResult.error?.message || 'Unknown error'}`
        )
      );
    }

    try {
      cachedParser.setLanguage(loadResult.value); // Ensure language is set correctly
      return Result.ok(cachedParser);
    } catch (error: unknown) {
      this.parserCache.delete(language); // Remove invalid cache entry
      const setError = new Error(
        `Failed to set language on cached parser for ${language}: ${error instanceof Error ? error.message : String(error)}`
      );
      this.logger.error(setError.message, error instanceof Error ? error : undefined);
      return Result.err(setError);
    }
  }

  /**
   * Creates a new parser instance, loads its language, and caches it.
   * @param language - The language for the new parser.
   * @returns A Result containing the newly created parser or an error.
   */
  private async _createAndCacheParser(language: SupportedLanguage): Promise<Result<Parser, Error>> {
    this.logger.info(`Creating new parser for language: ${language}`);

    const loadResult = await this._loadLanguageModule(language);
    if (loadResult.isErr()) {
      return Result.err(
        loadResult.error || new Error(`Unknown error loading language module for ${language}`)
      );
    }

    try {
      const parser = new Parser();
      parser.setLanguage(loadResult.value);
      this.parserCache.set(language, parser); // Cache the new parser
      this.logger.info(`Successfully created and cached parser for language: ${language}`);
      return Result.ok(parser);
    } catch (error: unknown) {
      const createError = new Error(
        `Failed to create or set language for new parser for ${language}: ${error instanceof Error ? error.message : String(error)}`
      );
      this.logger.error(createError.message, error instanceof Error ? error : undefined);
      return Result.err(createError);
    }
  }

  /**
   * Retrieves or creates a Tree-sitter parser instance for the specified language.
   * Uses caching to avoid redundant loading.
   * @param language - The language for the parser.
   * @returns A Result containing the parser instance or an error.
   */
  private async getOrCreateParser(language: SupportedLanguage): Promise<Result<Parser, Error>> {
    const cachedResult = await this._getCachedParser(language);

    if (cachedResult.isErr()) {
      // Ensure a valid Error object is passed
      return Result.err(
        cachedResult.error || new Error(`Unknown error retrieving cached parser for ${language}`)
      );
    }

    const cachedParser = cachedResult.value;
    if (cachedParser) {
      return Result.ok(cachedParser); // Return valid cached parser
    }

    // If not cached or cache was invalid, create a new one
    return this._createAndCacheParser(language);
  }

  // --- Querying & Extraction ---

  private getQueriesForLanguage(language: SupportedLanguage): LanguageQueries | undefined {
    return LANGUAGE_QUERIES_MAP[language];
  }

  private processQueryMatch(
    match: Parser.QueryMatch,
    elementType: 'function' | 'class'
  ): CodeElementInfo | null {
    // Explicitly type nodes as 'any' due to node-tree-sitter typing issues.
    let nameNode: any;
    let definitionNode: any;
    let defaultDefinitionNode: any;

    for (const capture of match.captures) {
      switch (capture.name) {
        case 'name':
          nameNode = capture.node;
          break;
        case 'definition':
          definitionNode = capture.node;
          break;
        case 'default_definition':
          defaultDefinitionNode = capture.node;
          break;
      }
    }

    if (definitionNode) {
      let name: string;
      if (nameNode) {
        name = nameNode.text;
      } else if (defaultDefinitionNode) {
        name = `[default_${elementType}]`;
      } else {
        name = `[anonymous_${elementType}]`;
      }

      const startLine = definitionNode.startPosition.row + 1;
      const endLine = definitionNode.endPosition.row + 1;

      if (startLine > 0 && endLine >= startLine) {
        this.logger.debug(`Extracted ${elementType}: ${name} (Lines ${startLine}-${endLine})`);
        return { name, startLine, endLine };
      } else {
        this.logger.warn(
          `Invalid line numbers for extracted ${elementType} '${name}': Start ${startLine}, End ${endLine}. Node type: ${definitionNode.type}`
        );
        return null;
      }
    } else {
      this.logger.warn(
        `Query match found for ${elementType} but missing '@definition' capture. Match pattern index: ${match.pattern}, Captures: ${JSON.stringify(match.captures.map((c: Parser.QueryCapture) => ({ name: c.name, text: c.node.text, type: c.node.type })))}`
      );
      return null;
    }
  }

  private extractElements(
    parser: Parser,
    tree: Parser.Tree,
    queryStr: string,
    elementType: 'function' | 'class'
  ): CodeElementInfo[] {
    try {
      const language = parser.getLanguage();
      if (!language) {
        this.logger.error(
          `Parser has no language object set before executing ${elementType} query.`
        );
        return [];
      }

      const query = language.query(queryStr);
      const matches = query.matches(tree.rootNode);
      this.logger.debug(`Found ${matches.length} potential ${elementType} matches.`);

      const elements = matches
        .map((match: Parser.QueryMatch) => this.processQueryMatch(match, elementType))
        .filter((element: CodeElementInfo | null): element is CodeElementInfo => element !== null);

      return elements;
    } catch (error: unknown) {
      this.logger.error(
        `Error executing Tree-sitter query for ${elementType}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
      return [];
    }
  }

  // --- Public API ---

  async parse(
    content: string,
    language: SupportedLanguage
  ): Promise<Result<ParsedCodeInfo, Error>> {
    this.logger.info(`Parsing content for language: ${language}`);

    // 1. Get or create the parser for the language.
    const parserResult = await this.getOrCreateParser(language);
    if (parserResult.isErr()) {
      return Result.err(
        parserResult.error || new Error(`Unknown error getting or creating parser for ${language}`)
      );
    }
    const parser = parserResult.value;

    // 2. Parse the content into a syntax tree.
    let tree: Parser.Tree;
    try {
      tree = parser.parse(content);
      this.logger.debug(
        `Successfully created syntax tree for language: ${language}. Root node type: ${tree.rootNode.type}`
      );
    } catch (error: unknown) {
      const parseError = new Error(
        `Error during Tree-sitter parsing for ${language}: ${error instanceof Error ? error.message : String(error)}`
      );
      this.logger.error(parseError.message, error instanceof Error ? error : undefined);
      return Result.err(parseError);
    }

    // 3. Get the appropriate queries for the language.
    const queries = this.getQueriesForLanguage(language);
    if (!queries) {
      const queryError = new Error(`No queries defined for language: ${language}`);
      this.logger.error(queryError.message);
      return Result.err(queryError);
    }

    // 4. Extract functions and classes using the queries.
    const functions = this.extractElements(parser, tree, queries.functionQuery, 'function');
    const classes = this.extractElements(parser, tree, queries.classQuery, 'class');

    // 5. Return the results.
    const parsedInfo: ParsedCodeInfo = { functions, classes };
    this.logger.info(
      `Parsing complete for language: ${language}. Found ${functions.length} functions, ${classes.length} classes.`
    );
    return Result.ok(parsedInfo);
  }
}
