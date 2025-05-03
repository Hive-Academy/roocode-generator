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
// @ts-expect-error - Suppress error due to non-standard module definition in node-tree-sitter.d.ts
// eslint-disable-next-line @typescript-eslint/no-require-imports
import Parser = require('node-tree-sitter');
// eslint-disable-next-line @typescript-eslint/no-require-imports
import JavaScript = require('tree-sitter-javascript');
// eslint-disable-next-line @typescript-eslint/no-require-imports
import TypeScript = require('tree-sitter-typescript');

// --- Service Implementation ---

@Injectable()
export class TreeSitterParserService implements ITreeSitterParserService {
  private readonly logger: ILogger;
  private readonly parserCache: Map<SupportedLanguage, Parser> = new Map();
  private readonly languageGrammars: Map<SupportedLanguage, any> = new Map(); // Store pre-loaded grammars
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(@Inject('ILogger') logger: ILogger) {
    this.logger = logger;
    this.logger.info('TreeSitterParserService created. Initialization required.');
    // Initialization will be triggered externally or on first use.
  }

  // --- Initialization ---

  /**
   * Initializes the service by pre-loading all required Tree-sitter grammars.
   * This method is idempotent.
   * @returns A Result indicating success or failure of initialization.
   */
  async initialize(): Promise<Result<void, Error>> {
    this.logger.debug(
      `Initialize called. Current state: isInitialized=${this.isInitialized}, hasPromise=${!!this.initializationPromise}`
    );
    if (this.isInitialized) {
      this.logger.debug('Already initialized.');
      return Result.ok(undefined);
    }
    if (this.initializationPromise) {
      this.logger.debug('Initialization already in progress, awaiting existing promise.');
      try {
        await this.initializationPromise;
        this.logger.debug('Ongoing initialization finished.');
        return Result.ok(undefined);
      } catch (error) {
        this.logger.error(
          'Ongoing initialization failed.',
          error instanceof Error ? error : undefined
        );
        // The promise rejection should have been handled, but return error just in case.
        return Result.err(
          error instanceof Error ? error : new Error('Ongoing initialization failed')
        );
      }
    }

    // Use a synchronous approach with static requires
    const initLogic = () => {
      this.logger.info('Initializing Tree-sitter grammars using static requires...');
      try {
        // Validate and store statically imported grammars
        if (!JavaScript || typeof JavaScript !== 'object') {
          throw new Error('Statically imported JavaScript grammar is invalid.');
        }
        this.languageGrammars.set('javascript', JavaScript);
        this.logger.debug('JavaScript grammar validated.');

        if (!TypeScript || typeof TypeScript !== 'object') {
          throw new Error('Statically imported TypeScript grammar is invalid.');
        }
        this.languageGrammars.set('typescript', TypeScript);
        this.logger.debug('TypeScript grammar validated.');

        // Add other languages here if needed using static require

        this.isInitialized = true;
        this.logger.info('All required Tree-sitter grammars initialized successfully.');
      } catch (error: unknown) {
        this.isInitialized = false; // Ensure state reflects failure
        const initError =
          error instanceof Error
            ? error
            : new Error('Unknown initialization error during static loading');
        this.logger.error(
          `TreeSitterParserService static initialization failed: ${initError.message}`,
          initError
        );
        // Re-throw the error to be caught by the caller (cli-main)
        throw initError;
      }
    };

    // Wrap synchronous logic in a promise structure to maintain the async signature
    // and handle idempotency correctly.
    this.initializationPromise = new Promise((resolve, reject) => {
      try {
        initLogic();
        resolve();
      } catch (error: any) {
        reject(error as Error);
      }
    });

    try {
      await this.initializationPromise;
      this.logger.debug('Initialization promise resolved successfully.');
      return Result.ok(undefined);
    } catch (error: unknown) {
      this.isInitialized = false; // Ensure state reflects failure
      const initError = error instanceof Error ? error : new Error('Unknown initialization error');
      this.logger.error(
        `TreeSitterParserService initialization failed: ${initError.message}`,
        initError
      );
      return Result.err(initError);
    } finally {
      this.logger.debug('Clearing initialization promise.');
      this.initializationPromise = null; // Clear promise after completion/failure
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
   * @returns A Result containing the grammar object or an error if not initialized or not found.
   */
  private async _getPreloadedGrammar(language: SupportedLanguage): Promise<Result<any, Error>> {
    // Ensure initialization is complete before proceeding
    if (!this.isInitialized) {
      this.logger.debug(`_getPreloadedGrammar: Service not initialized. Triggering initialize().`);
      const initResult = await this.initialize();
      if (initResult.isErr()) {
        return Result.err(
          new Error(
            `TreeSitterParserService not initialized and initialization failed: ${initResult.error?.message ?? 'Unknown initialization error'}`
          )
        );
      }
      // If initialization succeeded, isInitialized should now be true
      if (!this.isInitialized) {
        // This is a safeguard, should not happen if initialize() works correctly
        return Result.err(new Error('Initialization race condition or unexpected error.'));
      }
      this.logger.debug(`_getPreloadedGrammar: Initialization completed.`);
    }

    const grammar = this.languageGrammars.get(language);
    if (!grammar) {
      // This indicates a problem, as initialization should have loaded it or failed.
      const error = new Error(
        `Grammar for language ${language} not found in pre-loaded cache after successful initialization.`
      );
      this.logger.error(error.message);
      return Result.err(error);
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

  private async _getCachedParser(language: SupportedLanguage): Promise<Result<null, Error>> {
    if (!this.parserCache.has(language)) {
      return Result.ok(null); // Not in cache
    }

    this.logger.debug(`Using cached parser for language: ${language}`);
    const cachedParser = this.parserCache.get(language)!;

    // Re-verify by getting the pre-loaded grammar
    const grammarResult = await this._getPreloadedGrammar(language);
    if (grammarResult.isErr()) {
      this.parserCache.delete(language); // Remove invalid cache entry
      return Result.err(
        new Error(
          `Failed to re-verify pre-loaded Tree-sitter grammar for cached ${language}: ${grammarResult.error?.message || 'Unknown error'}`
        )
      );
    }

    try {
      // Ensure language is set correctly using the verified pre-loaded grammar
      cachedParser.setLanguage(grammarResult.value);
      return Result.ok(cachedParser);
    } catch (error: unknown) {
      this.parserCache.delete(language); // Remove invalid cache entry on setLanguage failure
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

    // Get the pre-loaded grammar
    const grammarResult = await this._getPreloadedGrammar(language);
    if (grammarResult.isErr()) {
      return Result.err(
        grammarResult.error || new Error(`Unknown error getting pre-loaded grammar for ${language}`)
      );
    }

    try {
      const parser = new Parser();
      parser.setLanguage(grammarResult.value); // Use the pre-loaded grammar
      this.parserCache.set(language, parser); // Cache the new parser
      this.logger.info(`Successfully created and cached parser for language: ${language}`);
      return Result.ok(parser);
    } catch (error: unknown) {
      // Error likely occurred during new Parser() or setLanguage()
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

    // 1. Ensure service is initialized (this also handles concurrent calls)
    const initResult = await this.initialize();
    if (initResult.isErr()) {
      return Result.err(
        new Error(
          `TreeSitterParserService initialization failed: ${initResult.error?.message ?? 'Unknown initialization error'}`
        )
      );
    }

    // 2. Get or create the parser for the language.
    // Initialization is guaranteed complete here by the step above.
    const parserResult = await this.getOrCreateParser(language);
    if (parserResult.isErr()) {
      return Result.err(
        parserResult.error || new Error(`Unknown error getting or creating parser for ${language}`)
      );
    }
    const parser = parserResult.value;

    // 3. Parse the content into a syntax tree.

    let tree: Parser.Tree;
    try {
      tree = parser.parse(content);
      this.logger.debug(
        `Successfully created syntax tree for language: ${language}. Root node type: ${tree.rootNode.type}`
      );
    } catch (error: unknown) {
      // Error during parsing itself
      const parseError = new Error(
        `Error during Tree-sitter parsing for ${language}: ${error instanceof Error ? error.message : String(error)}`
      );
      this.logger.error(parseError.message, error instanceof Error ? error : undefined);
      return Result.err(parseError);
    }

    // 4. Get the appropriate queries for the language.
    const queries = this.getQueriesForLanguage(language);
    if (!queries) {
      const queryError = new Error(`No queries defined for language: ${language}`);
      this.logger.error(queryError.message);
      return Result.err(queryError);
    }

    // 5. Extract functions and classes using the queries.
    const functions = this.extractElements(parser, tree, queries.functionQuery, 'function');
    const classes = this.extractElements(parser, tree, queries.classQuery, 'class');

    // 6. Return the results.
    const parsedInfo: ParsedCodeInfo = { functions, classes };
    this.logger.info(
      `Parsing complete for language: ${language}. Found ${functions.length} functions, ${classes.length} classes.`
    );
    return Result.ok(parsedInfo);
  }
}
