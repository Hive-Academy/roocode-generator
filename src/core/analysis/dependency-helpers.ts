// src/core/analysis/dependency-helpers.ts
import * as path from 'path';
import { CodeInsights } from './ast-analysis.interfaces'; // Path relative to src/core/analysis/

/**
 * Optional: Information extracted from tsconfig.json relevant for path alias resolution.
 * This will be provided if alias resolution is attempted.
 */
export interface TsConfigPathsInfo {
  baseUrl?: string; // Absolute path to baseUrl
  paths?: Record<string, string[]>; // e.g., { "@/*": ["src/*"] }
}

// Type for the main function's input
export type CodeInsightsMap = { [filePath: string]: CodeInsights };

export function deriveInternalDependencies(
  codeInsightsMap: CodeInsightsMap,
  rootDir: string,
  tsconfigPathsInfo?: TsConfigPathsInfo // Optional, for alias resolution
): Record<string, string[]> {
  const internalDependencies: Record<string, string[]> = {};

  for (const absoluteFilePath in codeInsightsMap) {
    if (Object.prototype.hasOwnProperty.call(codeInsightsMap, absoluteFilePath)) {
      const insights = codeInsightsMap[absoluteFilePath];
      const importingFileDir = path.dirname(absoluteFilePath);
      const importingFileRelativePath = path.relative(rootDir, absoluteFilePath);

      const resolvedImports: Set<string> = new Set();

      if (insights.imports && insights.imports.length > 0) {
        for (const importObj of insights.imports) {
          const importSource = importObj.source;

          // 1. Categorize and Resolve Import
          if (importSource.startsWith('./') || importSource.startsWith('../')) {
            // Relative import
            const absoluteImportPath = path.resolve(importingFileDir, importSource);
            // TODO: Future enhancement: Implement robust file extension/index resolution.
            // For now, direct resolution is used. This might involve checking for .ts, .js, .tsx, .jsx, /index.ts, /index.js etc.
            const relativeImportPathToRoot = path.relative(rootDir, absoluteImportPath);
            resolvedImports.add(relativeImportPathToRoot);
          } else if (tsconfigPathsInfo && tsconfigPathsInfo.baseUrl && tsconfigPathsInfo.paths) {
            let resolvedAlias = false;
            // Attempt tsconfig.json alias resolution (basic implementation)
            for (const alias in tsconfigPathsInfo.paths) {
              const aliasPattern = alias.endsWith('/*') ? alias.slice(0, -2) : alias;
              const importStartsWithAlias = importSource.startsWith(aliasPattern);

              if (importStartsWithAlias) {
                const remainingPath = importSource.substring(aliasPattern.length);
                for (const targetPathPattern of tsconfigPathsInfo.paths[alias]) {
                  const concreteTargetPath = targetPathPattern.endsWith('/*')
                    ? targetPathPattern.slice(0, -2)
                    : targetPathPattern;
                  const potentialPath = path.resolve(
                    tsconfigPathsInfo.baseUrl,
                    concreteTargetPath,
                    remainingPath
                  );

                  // TODO: Future enhancement: Implement file system checks to verify existence of 'potentialPath'
                  // (and its variations with extensions like .ts, .js, /index.ts).
                  // For this first pass, we assume it resolves if the pattern matches.
                  const relativeImportPathToRoot = path.relative(rootDir, potentialPath);
                  resolvedImports.add(relativeImportPathToRoot);
                  resolvedAlias = true;
                  break;
                }
              }
              if (resolvedAlias) break;
            }

            if (!resolvedAlias) {
              // Not a relative import, not a resolved alias, assume it's an external package/module
              // Or it could be an alias that the basic resolver didn't catch.
              // console.warn(`Alias path '${importSource}' could not be resolved with basic logic or is an external package. Treating as external.`);
              resolvedImports.add(importSource);
            }
          } else {
            // Not a relative import, and no tsconfigPathsInfo provided for alias resolution.
            // Assume it's an external package/module.
            resolvedImports.add(importSource);
          }
        }
      }
      if (resolvedImports.size > 0) {
        internalDependencies[importingFileRelativePath] = Array.from(resolvedImports);
      }
    }
  }
  return internalDependencies;
}
