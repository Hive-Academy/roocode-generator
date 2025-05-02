// Define language identifiers
export type SupportedLanguage = 'javascript' | 'typescript';

// --- Language Configuration ---

export const EXTENSION_LANGUAGE_MAP: Readonly<Record<string, SupportedLanguage>> = {
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
};

export const LANGUAGE_GRAMMAR_MAP: Readonly<Record<SupportedLanguage, string>> = {
  javascript: 'tree-sitter-javascript',
  typescript: 'tree-sitter-typescript/typescript',
};

// --- Tree-sitter Queries ---
// Group queries by language for better organization

export interface LanguageQueries {
  functionQuery: string;
  classQuery: string;
}

const JS_FUNCTION_QUERY = `
[
  (function_declaration name: (identifier) @name) @definition
  (variable_declarator name: (identifier) @name value: [(function) (arrow_function)]) @definition
  (pair key: [(property_identifier) (string)] @name value: [(function) (arrow_function)]) @definition ; Object properties { func: () => {} }
  (method_definition name: (property_identifier) @name) @definition ; Class methods
  (export_statement declaration: [(function_declaration name: (identifier) @name) (lexical_declaration (variable_declarator name: (identifier) @name value: [(function) (arrow_function)]))]) @definition
  (export_default_statement declaration: [(function_declaration name: (identifier)? @name) (arrow_function)] @default_definition) @definition ; export default function foo() {} / export default () => {}
]
`;

const JS_CLASS_QUERY = `
[
  (class_declaration name: (identifier) @name) @definition
  (export_statement declaration: (class_declaration name: (identifier) @name)) @definition
  (export_default_statement declaration: (class_declaration name: (identifier)? @name) @default_definition) @definition
]
`;

const TS_FUNCTION_QUERY = `
[
  (function_declaration name: (identifier) @name) @definition
  (variable_declarator name: (identifier) @name value: [(function) (arrow_function)]) @definition
  (method_definition name: (property_identifier) @name) @definition
  (export_statement declaration: [(function_declaration name: (identifier) @name) (lexical_declaration (variable_declarator name: (identifier) @name value: [(function) (arrow_function)]))]) @definition
  (export_default_statement declaration: [(function_declaration name: (identifier)? @name) (arrow_function)] @default_definition) @definition
]
`;

const TS_CLASS_QUERY = `
[
  (class_declaration name: (type_identifier) @name) @definition
  (export_statement declaration: (class_declaration name: (type_identifier) @name)) @definition
  (export_default_statement declaration: (class_declaration name: (type_identifier)? @name) @default_definition) @definition
]
`;

export const LANGUAGE_QUERIES_MAP: Readonly<Record<SupportedLanguage, LanguageQueries>> = {
  javascript: { functionQuery: JS_FUNCTION_QUERY, classQuery: JS_CLASS_QUERY },
  typescript: { functionQuery: TS_FUNCTION_QUERY, classQuery: TS_CLASS_QUERY },
};
