import * as path from 'path';
import { ProjectContext } from './types';

// Node.js built-in modules (expand this list as needed)
const NODE_BUILTIN_MODULES = new Set([
  'fs',
  'path',
  'os',
  'http',
  'https',
  'events',
  'stream',
  'util',
  'url',
  'zlib',
  'crypto',
  'buffer',
  'child_process',
  'assert',
  'async_hooks',
  'constants',
  'diagnostics_channel',
  'dgram',
  'dns',
  'domain',
  'fs/promises',
  'http2',
  'inspector',
  'module',
  'net',
  'perf_hooks',
  'process',
  'punycode',
  'querystring',
  'readline',
  'repl',
  'stream/promises',
  'string_decoder',
  'sys',
  'timers',
  'timers/promises',
  'tls',
  'trace_events',
  'tty',
  'v8',
  'vm',
  'worker_threads',
  'zlib',
]);

const CONFIG_FILE_PATTERNS: RegExp[] = [
  /(^|\/)(babel|webpack|vite|jest|playwright|eslint|prettier|stylelint|postcss|tailwind)\.config\.(js|ts|cjs|mjs|json)$/i,
  /(^|\/)(\.eslintrc|\.eslintignore|\.prettierrc|\.prettierignore|\.stylelintrc|\.stylelintignore)$/i,
  /(^|\/)(tsconfig(\..*)?\.json|jsconfig(\..*)?\.json)$/i,
  /(^|\/)(dockerfile|docker-compose\.yml|\.dockerignore)$/i,
  /(^|\/)(package\.json|pnpm-lock\.yaml|yarn\.lock|package-lock\.json)$/i,
  /(^|\/)(nest-cli\.json|angular\.json|vue\.config\.js|nuxt\.config\.(js|ts))$/i, // Added more common framework/tool configs
  /(^|\/)(\.env(\.[^/]+)*|\.npmrc|\.yarnrc|\.gitattributes|\.gitignore)$/i, // Added env files and other common rc files
];

const ENTRY_POINT_PATTERNS: RegExp[] = [
  /(^|\/)(src|app|source|lib|server|client|main|electron)\/(index|main|app|server|client|start|entry|bootstrap)\.(js|ts|jsx|tsx|mjs|cjs)$/i,
  /^(index|main|app|server|client|start|entry|bootstrap)\.(js|ts|jsx|tsx|mjs|cjs)$/i, // For root level entry points
  /(^|\/)(pages|views)\/(index|app|main)\.(js|ts|jsx|tsx|vue|svelte)$/i, // Common for web frameworks with page-based routing
  /(^|\/)main\.(py|go|java|cs|rb|php)$/i, // Common entry for other languages, though context is TS/JS focused
];

export function getConfigFiles(projectContext: ProjectContext): string[] {
  const allFiles = Object.keys(projectContext.codeInsights);
  const configFiles: string[] = [];

  for (const filePath of allFiles) {
    for (const pattern of CONFIG_FILE_PATTERNS) {
      if (pattern.test(filePath)) {
        configFiles.push(filePath);
        break; // Move to next file once a pattern matches
      }
    }
  }
  return configFiles;
}

export function getEntryPointFiles(projectContext: ProjectContext): string[] {
  const allFiles = Object.keys(projectContext.codeInsights);
  const entryPoints: string[] = [];

  for (const filePath of allFiles) {
    for (const pattern of ENTRY_POINT_PATTERNS) {
      if (pattern.test(filePath)) {
        entryPoints.push(filePath);
        break; // Move to next file once a pattern matches
      }
    }
  }
  return entryPoints;
}

// Add other utility functions here in the future

export function getDependencyVersion(
  packageName: string,
  projectContext: ProjectContext
): string | undefined {
  const { packageJson } = projectContext;
  if (!packageJson) return undefined;

  // Check in dependencies
  if (packageJson.dependencies && packageJson.dependencies[packageName]) {
    return packageJson.dependencies[packageName];
  }
  // Check in devDependencies
  if (packageJson.devDependencies && packageJson.devDependencies[packageName]) {
    return packageJson.devDependencies[packageName];
  }
  // Check in peerDependencies
  if (packageJson.peerDependencies && packageJson.peerDependencies[packageName]) {
    return packageJson.peerDependencies[packageName];
  }
  return undefined;
}

export function getInternalDependenciesForFile(
  filePath: string,
  projectContext: ProjectContext
): string[] {
  const insights = projectContext.codeInsights[filePath];
  if (!insights || !insights.imports) {
    return [];
  }

  const internalDeps = new Set<string>();
  const importingFileDir = path.dirname(filePath);

  for (const importInfo of insights.imports) {
    const importSource = importInfo.source;

    // a. Check for Node.js built-in modules
    if (NODE_BUILTIN_MODULES.has(importSource)) {
      continue;
    }

    // b. Check against package.json dependencies (simplified check for root package name)
    // A more robust check would involve checking if importSource starts with a package name.
    // For example, 'lodash/debounce' should be caught if 'lodash' is a dependency.
    // The current getDependencyVersion checks for an exact match.
    // We can refine this by checking if any part of the importSource before the first '/' is a dependency.
    const rootPackageName = importSource.split('/')[0];
    if (getDependencyVersion(rootPackageName, projectContext)) {
      continue;
    }
    // Also check the full importSource in case it's a direct match (e.g. for scoped packages like @angular/core)
    if (getDependencyVersion(importSource, projectContext)) {
      continue;
    }

    // c. Check for relative paths
    if (importSource.startsWith('./') || importSource.startsWith('../')) {
      // Resolve relative path: from projectRoot, then importingFileDir, then importSource
      const absoluteImportPath = path.resolve(
        projectContext.projectRootPath,
        importingFileDir,
        importSource
      );
      const relativeImportPath = path
        .relative(projectContext.projectRootPath, absoluteImportPath)
        .replace(/\\/g, '/');

      // As per simplification, add the calculated relativeImportPath.
      // Consumers will need to handle extension resolution (.ts, .js, /index.ts etc.) if this path
      // doesn't directly map to a key in codeInsights.
      internalDeps.add(relativeImportPath);
    } else {
      // d. Check for absolute paths / Aliases (Simplified)
      // If it's not caught by (a), (b), or (c), and it exists as a key in codeInsights,
      // consider it an internal module specifier (already relative or an alias treated as relative).
      if (projectContext.codeInsights[importSource]) {
        internalDeps.add(importSource);
      }
      // e. Default (Fallback): Otherwise, assume external or unresolvable for now and skip it.
    }
  }

  return Array.from(internalDeps);
}

export function getFilesByPattern(projectContext: ProjectContext, pattern: RegExp): string[] {
  const allFiles = Object.keys(projectContext.codeInsights);
  const matchingFiles: string[] = [];

  for (const filePath of allFiles) {
    if (pattern.test(filePath)) {
      matchingFiles.push(filePath);
    }
  }
  return matchingFiles;
}
