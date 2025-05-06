// src/core/analysis/tech-stack-helpers.ts
import * as path from 'path';

// Assuming IFileOperations and Result types are defined in this path.
// If not, for the purpose of this task, minimal interfaces would be:
//
// export interface Result<T, E> {
//   isOk(): this is { value: T };
//   isErr(): this is { error: E };
//   value?: T;
//   error?: E;
// }
//
// export interface IFileOperations {
//   exists(filePath: string): Promise<Result<boolean, Error>>;
// }
//
// The task specifies importing from '../file-operations/interfaces'.
// I will proceed with this import.
import { IFileOperations } from '../file-operations/interfaces';
import { Result } from '../result/result';

/**
 * A predefined mapping of common file extensions to language names.
 */
const EXTENSION_LANG_MAP: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.py': 'Python',
  '.java': 'Java',
  '.cs': 'C#',
  '.go': 'Go',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.html': 'HTML',
  '.htm': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.sass': 'SCSS',
  '.less': 'LESS',
  '.json': 'JSON',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.md': 'Markdown',
  '.sh': 'Shell',
  '.bat': 'Batch',
  '.ps1': 'PowerShell',
  '.c': 'C',
  '.cpp': 'C++',
  '.h': 'C/C++ Header',
  '.hpp': 'C++ Header',
  '.swift': 'Swift',
  '.kt': 'Kotlin',
  '.kts': 'Kotlin Script',
  '.rs': 'Rust',
  '.lua': 'Lua',
  '.pl': 'Perl',
  '.sql': 'SQL',
  '.r': 'R',
  '.m': 'Objective-C',
  '.mm': 'Objective-C++',
  '.scala': 'Scala',
  '.groovy': 'Groovy',
  '.dart': 'Dart',
  '.fs': 'F#',
  '.fsi': 'F#',
  '.fsx': 'F#',
  '.fsscript': 'F#',
  '.vue': 'Vue',
  '.svelte': 'Svelte',
};

/**
 * Derives unique programming languages from a list of file paths based on their extensions.
 * @param filePaths - Array of file paths.
 * @returns A sorted array of unique language names. Returns an empty array if no languages can be derived.
 */
export function deriveLanguages(filePaths: string[]): string[] {
  if (!filePaths || filePaths.length === 0) {
    return [];
  }
  const languages = new Set<string>();
  for (const filePath of filePaths) {
    if (typeof filePath === 'string') {
      const ext = path.extname(filePath).toLowerCase();
      if (EXTENSION_LANG_MAP[ext]) {
        languages.add(EXTENSION_LANG_MAP[ext]);
      }
    }
  }
  return Array.from(languages).sort();
}

/**
 * Mappings for common npm packages to technology categories.
 */
const FRAMEWORK_PACKAGES: Record<string, string> = {
  react: 'React',
  '@angular/core': 'Angular',
  vue: 'Vue.js',
  svelte: 'Svelte',
  next: 'Next.js',
  nuxt: 'Nuxt.js',
  '@nestjs/core': 'NestJS',
  express: 'Express.js',
  koa: 'Koa.js',
  fastify: 'Fastify',
  'spring-boot': 'Spring Boot', // Example for Java, though typically not in package.json
  django: 'Django', // Example for Python
  flask: 'Flask', // Example for Python
  'ruby-on-rails': 'Ruby on Rails', // Example for Ruby
  laravel: 'Laravel', // Example for PHP
  'ASP.NET': 'ASP.NET', // Example for C#
};

const BUILD_TOOL_PACKAGES: Record<string, string> = {
  webpack: 'Webpack',
  rollup: 'Rollup',
  parcel: 'Parcel',
  esbuild: 'esbuild',
  vite: 'Vite',
  typescript: 'TypeScript Compiler (tsc)', // tsc is part of typescript package
  '@babel/core': 'Babel',
  'babel-loader': 'Babel Loader',
  gulp: 'Gulp',
  grunt: 'Grunt',
  maven: 'Maven', // Example for Java
  gradle: 'Gradle', // Example for Java
};

const TESTING_FRAMEWORK_PACKAGES: Record<string, string> = {
  jest: 'Jest',
  mocha: 'Mocha',
  chai: 'Chai',
  jasmine: 'Jasmine',
  cypress: 'Cypress',
  '@playwright/test': 'Playwright',
  vitest: 'Vitest',
  '@testing-library/react': 'React Testing Library',
  '@testing-library/vue': 'Vue Testing Library',
  '@testing-library/angular': 'Angular Testing Library',
  '@testing-library/svelte': 'Svelte Testing Library',
  junit: 'JUnit', // Example for Java
  testng: 'TestNG', // Example for Java
  pytest: 'Pytest', // Example for Python
  unittest: 'Unittest', // Example for Python
  rspec: 'RSpec', // Example for Ruby
  phpunit: 'PHPUnit', // Example for PHP
};

const LINTER_FORMATTER_PACKAGES: Record<string, string> = {
  eslint: 'ESLint',
  prettier: 'Prettier',
  tslint: 'TSLint', // Deprecated but might still appear
  stylelint: 'Stylelint',
  flake8: 'Flake8', // Example for Python
  pylint: 'Pylint', // Example for Python
  rubocop: 'RuboCop', // Example for Ruby
};

interface TechStackCategorization {
  frameworks: string[];
  buildTools: string[];
  testingFrameworks: string[];
  linters: string[];
}

/**
 * Infers frameworks, build tools, testing frameworks, and linters
 * based on dependencies listed in package.json data.
 * @param packageJsonData - The parsed content of a package.json file.
 * @returns An object containing arrays of unique, sorted names for frameworks, build tools, testing frameworks, and linters.
 */
export function inferTechnologiesFromDependencies(packageJsonData: any): TechStackCategorization {
  const result: TechStackCategorization = {
    frameworks: [],
    buildTools: [],
    testingFrameworks: [],
    linters: [],
  };

  if (!packageJsonData || typeof packageJsonData !== 'object') {
    return result;
  }

  const dependencies = packageJsonData.dependencies || {};
  const devDependencies = packageJsonData.devDependencies || {};

  const allDependencies: Record<string, string> = {
    ...(typeof dependencies === 'object' ? dependencies : {}),
    ...(typeof devDependencies === 'object' ? devDependencies : {}),
  };

  const foundFrameworks = new Set<string>();
  const foundBuildTools = new Set<string>();
  const foundTestingFrameworks = new Set<string>();
  const foundLinters = new Set<string>();

  for (const pkgName in allDependencies) {
    if (FRAMEWORK_PACKAGES[pkgName]) foundFrameworks.add(FRAMEWORK_PACKAGES[pkgName]);
    if (BUILD_TOOL_PACKAGES[pkgName]) foundBuildTools.add(BUILD_TOOL_PACKAGES[pkgName]);
    if (TESTING_FRAMEWORK_PACKAGES[pkgName])
      foundTestingFrameworks.add(TESTING_FRAMEWORK_PACKAGES[pkgName]);
    if (LINTER_FORMATTER_PACKAGES[pkgName]) foundLinters.add(LINTER_FORMATTER_PACKAGES[pkgName]);
  }

  result.frameworks = Array.from(foundFrameworks).sort();
  result.buildTools = Array.from(foundBuildTools).sort();
  result.testingFrameworks = Array.from(foundTestingFrameworks).sort();
  result.linters = Array.from(foundLinters).sort();

  return result;
}

/**
 * Detects the package manager used in the project by checking for the existence of specific lock files.
 * @param rootDir - The root directory of the project.
 * @param fileOps - An instance of IFileOperations to check file existence.
 * @returns A promise that resolves to the name of the package manager ('npm', 'yarn', 'pnpm') or 'unknown' if none are detected.
 */
export async function detectPackageManager(
  rootDir: string,
  fileOps: IFileOperations
): Promise<string> {
  try {
    const npmLockExists: Result<boolean, Error> = await fileOps.exists(
      path.join(rootDir, 'package-lock.json')
    );
    if (npmLockExists.isOk() && npmLockExists.value === true) {
      return 'npm';
    }
  } catch (error) {
    console.warn(
      `Error checking for package-lock.json: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  try {
    const yarnLockExists: Result<boolean, Error> = await fileOps.exists(
      path.join(rootDir, 'yarn.lock')
    );
    if (yarnLockExists.isOk() && yarnLockExists.value === true) {
      return 'yarn';
    }
  } catch (error) {
    console.warn(
      `Error checking for yarn.lock: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  try {
    const pnpmLockExists: Result<boolean, Error> = await fileOps.exists(
      path.join(rootDir, 'pnpm-lock.yaml')
    );
    if (pnpmLockExists.isOk() && pnpmLockExists.value === true) {
      return 'pnpm';
    }
  } catch (error) {
    console.warn(
      `Error checking for pnpm-lock.yaml: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  return 'unknown';
}
