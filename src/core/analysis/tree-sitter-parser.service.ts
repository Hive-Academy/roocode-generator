/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */
import path from 'path';
import { Inject, Injectable } from '../di/decorators';
import { Result } from '../result/result';
import { ILogger } from '../services/logger-service';
import { ITreeSitterParserService } from './interfaces';
import {
  EXTENSION_LANGUAGE_MAP,
  LANGUAGE_QUERIES_MAP,
  LanguageQueries,
  SupportedLanguage,
} from './tree-sitter.config'; // Import from the new config file
import { CodeElementInfo, ParsedCodeInfo } from './types';

// Use require based on documentation and user feedback
const Parser = require('tree-sitter');
const JavaScript = require('tree-sitter-javascript');
const TypeScript = require('tree-sitter-typescript').typescript; // Use named import for TypeScript

// --- Service Implementation ---

@Injectable()
export class TreeSitterParserService implements ITreeSitterParserService {
  private readonly logger: ILogger;
  // Use 'any' for Parser instance type due to TS issues
  private readonly parserCache: Map<SupportedLanguage, any> = new Map();
  // Use 'any' for Language type
  private readonly languageGrammars: Map<SupportedLanguage, any> = new Map();
  private isInitialized: boolean = false;

  constructor(@Inject('ILogger') logger: ILogger) {
    this.logger = logger;
    this.logger.info('TreeSitterParserService created. Initialization required.');
  }

  // --- Initialization ---

  /**
   * Initializes the service by loading required Tree-sitter grammars.
   * This method is idempotent.
   * @returns A Result indicating success or failure of initialization.
   */
  initialize(): Result<void, Error> {
    // Synchronous
    this.logger.debug(`Initialize called. Current state: isInitialized=${this.isInitialized}`);
    if (this.isInitialized) {
      this.logger.debug('Already initialized.');
      return Result.ok(undefined);
    }

    this.logger.info('Initializing Tree-sitter grammars via require...');
    try {
      // Store the required grammar modules directly
      this.languageGrammars.set('javascript', JavaScript);
      this.languageGrammars.set('typescript', TypeScript);
      // Add other languages if needed

      this.isInitialized = true;
      this.logger.info('Tree-sitter grammars initialized successfully.');
      return Result.ok(undefined);
    } catch (error) {
      this.isInitialized = false;
      const initError = this._handleAndLogError(
        'TreeSitterParserService grammar require() initialization failed',
        error
      );
      return Result.err(initError);
    }
  }

  // --- Language & Grammar Handling ---

  private getLanguageFromExtension(filePath: string): SupportedLanguage | undefined {
    const ext = path.extname(filePath).toLowerCase();
    return EXTENSION_LANGUAGE_MAP[ext];
  }

  /**
   * Retrieves the pre-loaded language grammar. Ensures service is initialized.
   * @param language The language grammar to retrieve.
   * @returns A Result containing the Language object or an error if not initialized or not found.
   */
  private _getPreloadedGrammar(
    // Synchronous
    language: SupportedLanguage
  ): Result<any, Error> {
    // Use 'any' for Language type
    if (!this.isInitialized) {
      this.logger.debug(`_getPreloadedGrammar: Service not initialized. Triggering initialize().`);
      const initResult = this.initialize(); // Call synchronous initialize
      if (initResult.isErr()) {
        return Result.err(
          new Error(
            `Initialization failed before getting preloaded grammar: ${initResult.error!.message}`
          )
        );
      }
      if (!this.isInitialized) {
        return Result.err(
          this._handleAndLogError(
            'Initialization race condition or unexpected error',
            new Error('isInitialized still false after successful initialize() call')
          )
        );
      }
      this.logger.debug(`_getPreloadedGrammar: Initialization completed.`);
    }

    const grammar = this.languageGrammars.get(language);
    if (!grammar) {
      return Result.err(
        this._handleAndLogError(
          `Grammar for language ${language} not found in pre-loaded cache after successful initialization`,
          new Error(`Grammar not found: ${language}`)
        )
      );
    }
    this.logger.debug(`Retrieved pre-loaded grammar for language: ${language}.`);
    return Result.ok(grammar);
  }

  // --- Parser Caching & Creation ---

  /**
   * Attempts to retrieve a parser from the cache and verifies its language module.
   * @param language - The language of the parser to retrieve.
   * @returns A Result containing the cached parser if valid, or an error/null if not found or invalid.
   */
  private _getCachedParser(language: SupportedLanguage): Result<any, Error> {
    // Use 'any' for Parser instance type
    if (!this.parserCache.has(language)) {
      return Result.ok(null);
    }

    this.logger.debug(`Using cached parser for language: ${language}`);
    const cachedParser = this.parserCache.get(language)!;

    const grammarResult = this._getPreloadedGrammar(language); // Call synchronous method
    if (grammarResult.isErr()) {
      this.parserCache.delete(language);
      return Result.err(
        new Error(
          `Failed to re-verify pre-loaded grammar for cached ${language}: ${grammarResult.error!.message}`
        )
      );
    }

    try {
      cachedParser.setLanguage(grammarResult.value);
      return Result.ok(cachedParser);
    } catch (error: unknown) {
      this.parserCache.delete(language);
      return Result.err(
        this._handleAndLogError(`Failed to set language on cached parser for ${language}`, error)
      );
    }
  }

  /**
   * Creates a new parser instance, loads its language, and caches it.
   * @param language - The language for the new parser.
   * @returns A Result containing the newly created parser or an error.
   */
  private _createAndCacheParser(language: SupportedLanguage): Result<any, Error> {
    // Use 'any' for Parser instance type
    this.logger.info(`Creating new parser for language: ${language}`);

    const grammarResult = this._getPreloadedGrammar(language); // Call synchronous method
    if (grammarResult.isErr()) {
      return Result.err(grammarResult.error!);
    }

    try {
      const parser = new Parser(); // Use require'd Parser constructor
      parser.setLanguage(grammarResult.value);
      this.parserCache.set(language, parser);
      this.logger.info(`Successfully created and cached parser for language: ${language}`);
      return Result.ok(parser);
    } catch (error: unknown) {
      return Result.err(
        this._handleAndLogError(
          `Failed to create or set language for new parser for ${language}`,
          error
        )
      );
    }
  }

  /**
   * Retrieves or creates a Tree-sitter parser instance for the specified language.
   * Uses caching to avoid redundant loading.
   * @param language - The language for the parser.
   * @returns A Result containing the parser instance or an error.
   */
  private getOrCreateParser(language: SupportedLanguage): Result<any, Error> {
    // Use 'any' for Parser instance type
    const cachedResult = this._getCachedParser(language); // Call synchronous method

    if (cachedResult.isErr()) {
      return Result.err(cachedResult.error!);
    }

    const cachedParser = cachedResult.value;
    if (cachedParser) {
      return Result.ok(cachedParser);
    }

    return this._createAndCacheParser(language);
  }

  // --- Querying & Extraction ---

  private getQueriesForLanguage(language: SupportedLanguage): LanguageQueries | undefined {
    return LANGUAGE_QUERIES_MAP[language];
  }

  private processQueryMatch(
    match: any, // Use 'any' for QueryMatch type
    elementType: 'function' | 'class'
  ): CodeElementInfo | null {
    let nameNode: any;
    let definitionNode: any;
    let defaultDefinitionNode: any;

    // Assuming match.captures is an array
    if (Array.isArray(match.captures)) {
      for (const capture of match.captures) {
        // Add safety checks for capture object and name property
        if (capture && typeof capture.name === 'string') {
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

      // Add safety checks for position properties
      const startRow = definitionNode.startPosition?.row;
      const endRow = definitionNode.endPosition?.row;

      if (typeof startRow !== 'number' || typeof endRow !== 'number') {
        this.logger.warn(`Invalid position data for node in processQueryMatch`);
        return null;
      }

      const startLine = startRow + 1;
      const endLine = endRow + 1;

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
      // Add safety check for match.captures before mapping
      const capturesString = Array.isArray(match.captures)
        ? JSON.stringify(
            match.captures.map((c: any) => ({
              // Use 'any' for QueryCapture type
              name: c?.name,
              text: c?.node?.text,
              type: c?.node?.type,
            }))
          )
        : '[]';
      this.logger.warn(
        `Query match found for ${elementType} but missing '@definition' capture. Match pattern index: ${match.pattern}, Captures: ${capturesString}`
      );
      return null;
    }
  }

  private extractElements(
    parser: any, // Use 'any' for Parser instance type
    tree: any, // Use 'any' for Tree type
    queryStr: string,
    elementType: 'function' | 'class'
  ): CodeElementInfo[] {
    try {
      if (!parser) {
        this.logger.error('Parser instance is undefined in extractElements.');
        return [];
      }
      const language = parser.getLanguage();
      if (!language) {
        this.logger.error(
          `Parser has no language object set before executing ${elementType} query.`
        );
        return [];
      }

      // Create query using the Parser.Query constructor
      // Use 'any' to bypass potential type issues with accessing Query via require'd Parser
      const query = new Parser.Query(language, queryStr);

      // Add safety check for tree.rootNode
      if (!tree?.rootNode) {
        this.logger.error('Tree or rootNode is undefined in extractElements.');
        return [];
      }
      const matches = query.matches(tree.rootNode);
      this.logger.debug(`Found ${matches.length} potential ${elementType} matches.`);

      const elements = matches
        .map((match: any) => this.processQueryMatch(match, elementType)) // Use 'any' for QueryMatch type
        .filter((element: CodeElementInfo | null): element is CodeElementInfo => element !== null);

      return elements;
    } catch (error: unknown) {
      this._handleAndLogError(`Error executing Tree-sitter query for ${elementType}`, error);
      return [];
    }
  }

  // --- Public API ---

  parse(
    // Synchronous
    content: string,
    language: SupportedLanguage
  ): Result<ParsedCodeInfo, Error> {
    // Synchronous return
    this.logger.info(`Parsing content for language: ${language}`);

    const initResult = this.initialize(); // Call synchronous initialize
    if (initResult.isErr()) {
      return Result.err(initResult.error!);
    }

    const parserResult = this.getOrCreateParser(language); // Call synchronous method
    if (parserResult.isErr()) {
      return Result.err(parserResult.error!);
    }
    const parser = parserResult.value;

    let tree: any; // Use 'any' for Tree type
    try {
      // Ensure parser is not null before calling parse
      if (!parser) {
        throw new Error('Parser instance is null or undefined before parsing.');
      }
      tree = parser.parse(content);
      // Add safety check for tree.rootNode before accessing properties
      if (!tree?.rootNode) {
        throw new Error('Parsing resulted in an undefined tree or rootNode.');
      }
      this.logger.debug(
        `Successfully created syntax tree for language: ${language}. Root node type: ${tree.rootNode.type}`
      );
    } catch (error: unknown) {
      return Result.err(
        this._handleAndLogError(`Error during Tree-sitter parsing for ${language}`, error)
      );
    }

    const queries = this.getQueriesForLanguage(language);
    if (!queries) {
      return Result.err(
        this._handleAndLogError(
          `No queries defined for language: ${language}`,
          new Error(`Missing queries for ${language}`)
        )
      );
    }

    // Ensure parser is not null before passing to extractElements
    if (!parser) {
      return Result.err(
        new Error('Parser instance became null or undefined before element extraction.')
      );
    }
    const functions = this.extractElements(parser, tree, queries.functionQuery, 'function');
    const classes = this.extractElements(parser, tree, queries.classQuery, 'class');

    const parsedInfo: ParsedCodeInfo = { functions, classes };
    this.logger.info(
      `Parsing complete for language: ${language}. Found ${functions.length} functions, ${classes.length} classes.`
    );
    return Result.ok(parsedInfo);
  }

  /**
   * Handles and logs an error, ensuring a proper Error object is created.
   * @param context A string describing the context where the error occurred.
   * @param error The caught error object (unknown type).
   * @returns The processed Error object.
   * @private
   */
  private _handleAndLogError(context: string, error: unknown): Error {
    const processedError =
      error instanceof Error ? error : new Error(String(error) || 'Unknown error');
    const message = `${context}: ${processedError.message}`;
    this.logger.error(message, processedError);
    processedError.message = message;
    return processedError;
  }
}
