/**
 * @fileoverview Main types barrel file
 * @module types
 */

// Core types
export * from './common/type-guards';
export { Result as OperationResult } from './result';
export * from './reflect.d';

// Domain types
export * from './project';
export * from './llm';
export * from './rules/template';

// Parser types
import 'tree-sitter';
