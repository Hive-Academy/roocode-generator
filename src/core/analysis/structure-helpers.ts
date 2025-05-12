import * as path from 'path';
import { IFileOperations } from '../file-operations/interfaces';

export interface TsConfigLike {
  // Added export
  compilerOptions?: {
    rootDir?: string;
    baseUrl?: string;
    paths?: Record<string, string[]>;
  };
  include?: string[];
  files?: string[];
}

export async function findSourceDir(
  rootDir: string,
  fileOps: IFileOperations,
  // tsconfigPath?: string, // Relative to rootDir - No longer primary way to pass tsconfig
  parsedTsConfig?: TsConfigLike // Accept pre-parsed tsconfig content
): Promise<string | undefined> {
  const commonSrcDirs = ['src', 'source', 'app', 'lib'];
  const tsconfigContent = parsedTsConfig;

  if (tsconfigContent) {
    // Use the provided or parsed content
    if (tsconfigContent?.compilerOptions?.rootDir) {
      const resolvedRootDir = path.resolve(rootDir, tsconfigContent.compilerOptions.rootDir);
      const existsResult = await fileOps.exists(resolvedRootDir);
      const isDirResult = await fileOps.isDirectory(resolvedRootDir);
      if (existsResult.isOk() && existsResult.value && isDirResult.isOk() && isDirResult.value) {
        return path.relative(rootDir, resolvedRootDir);
      }
    }
    if (tsconfigContent?.compilerOptions?.baseUrl) {
      const resolvedBaseUrl = path.resolve(rootDir, tsconfigContent.compilerOptions.baseUrl);
      // Check if baseUrl is one of the common source dirs or points to a valid dir
      if (commonSrcDirs.includes(path.basename(resolvedBaseUrl))) {
        const existsResult = await fileOps.exists(resolvedBaseUrl);
        const isDirResult = await fileOps.isDirectory(resolvedBaseUrl);
        if (existsResult.isOk() && existsResult.value && isDirResult.isOk() && isDirResult.value) {
          return path.relative(rootDir, resolvedBaseUrl);
        }
      }
    }
    if (tsconfigContent?.include) {
      for (const pattern of tsconfigContent.include) {
        // Example: "src/**/*" -> "src"
        const potentialDir = pattern.split('/')[0];
        if (potentialDir && !potentialDir.includes('*')) {
          const dirPath = path.join(rootDir, potentialDir);
          const existsResult = await fileOps.exists(dirPath);
          const isDirResult = await fileOps.isDirectory(dirPath);
          if (
            existsResult.isOk() &&
            existsResult.value &&
            isDirResult.isOk() &&
            isDirResult.value
          ) {
            return potentialDir;
          }
        }
      }
    }
  }
  // Removed extra closing brace here that was prematurely closing 'if (tsconfigContent)'

  for (const dir of commonSrcDirs) {
    const dirPath = path.join(rootDir, dir);
    const existsResult = await fileOps.exists(dirPath);
    const isDirResult = await fileOps.isDirectory(dirPath);
    if (existsResult.isOk() && existsResult.value && isDirResult.isOk() && isDirResult.value) {
      return dir;
    }
  }

  return undefined;
}

export async function findTestDir(
  rootDir: string,
  fileOps: IFileOperations,
  // tsconfigPath?: string, // Relative to rootDir - No longer primary way to pass tsconfig
  parsedTsConfig?: TsConfigLike // Accept pre-parsed tsconfig content
): Promise<string | undefined> {
  const commonTestDirs = ['tests', 'test', '__tests__', 'specs', 'spec']; // Added __tests__ and specs
  const tsconfigContent = parsedTsConfig;

  if (tsconfigContent) {
    if (tsconfigContent?.include) {
      for (const pattern of tsconfigContent.include) {
        for (const commonDir of commonTestDirs) {
          if (pattern.startsWith(commonDir + '/') || pattern === commonDir) {
            const dirPath = path.join(rootDir, commonDir);
            const existsResult = await fileOps.exists(dirPath);
            const isDirResult = await fileOps.isDirectory(dirPath);
            if (
              existsResult.isOk() &&
              existsResult.value &&
              isDirResult.isOk() &&
              isDirResult.value
            ) {
              return commonDir;
            }
          }
        }
      }
    }
  }
  // Removed extra closing brace here that was prematurely closing 'if (tsconfigContent)'

  for (const dir of commonTestDirs) {
    const dirPath = path.join(rootDir, dir);
    const existsResult = await fileOps.exists(dirPath);
    const isDirResult = await fileOps.isDirectory(dirPath);
    if (existsResult.isOk() && existsResult.value && isDirResult.isOk() && isDirResult.value) {
      return dir;
    }
  }
  return undefined;
}

// Component 3: configFiles Scanning
export async function findConfigFiles(
  rootDir: string,
  fileOps: IFileOperations
): Promise<string[]> {
  const commonConfigFiles = [
    'tsconfig.json',
    'jsconfig.json',
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.eslintrc.yaml',
    '.eslintrc.yml',
    '.eslintrc.json',
    'eslint.config.js',
    'eslint.config.mjs',
    'webpack.config.js',
    'webpack.config.ts',
    'vite.config.js',
    'vite.config.ts',
    'rollup.config.js',
    'rollup.config.ts',
    'jest.config.js',
    'jest.config.ts',
    'vitest.config.js',
    'vitest.config.ts',
    'babel.config.js',
    'babel.config.json',
    '.babelrc',
    '.babelrc.js',
    '.babelrc.json',
    'pyproject.toml',
    'setup.py',
    'requirements.txt',
    'pom.xml',
    'build.gradle',
    'build.sbt',
    'package.json',
    'docker-compose.yml',
    'docker-compose.yaml',
    'Dockerfile',
    '.prettierrc',
    '.prettierrc.js',
    '.prettierrc.json',
    'prettier.config.js',
    '.gitignore',
  ];

  const foundFiles: string[] = [];
  for (const configFile of commonConfigFiles) {
    const filePath = path.join(rootDir, configFile);
    const existsResult = await fileOps.exists(filePath);
    if (existsResult.isOk() && existsResult.value) {
      // Ensure it's a file, not a directory with the same name
      const isDirResult = await fileOps.isDirectory(filePath);
      if (isDirResult.isOk() && !isDirResult.value) {
        foundFiles.push(configFile); // Store relative path
      }
    }
  }
  return foundFiles;
}

// Component 4: mainEntryPoints Derivation
export async function findMainEntryPoints(
  rootDir: string,
  packageJsonContent: any, // Already parsed
  sourceDir: string | undefined, // Relative to rootDir
  fileOps: IFileOperations,
  tsconfigContent?: TsConfigLike // Already parsed, use the new type
): Promise<string[]> {
  const entryPoints = new Set<string>();

  // 1. package.json Analysis
  if (packageJsonContent) {
    const fieldsToCheck = ['main', 'module'];
    for (const field of fieldsToCheck) {
      if (typeof packageJsonContent[field] === 'string') {
        entryPoints.add(packageJsonContent[field]);
      }
    }

    if (typeof packageJsonContent.exports === 'string') {
      entryPoints.add(packageJsonContent.exports as string);
    } else if (
      typeof packageJsonContent.exports === 'object' &&
      packageJsonContent.exports !== null
    ) {
      const exportsObj: Record<string, any> = packageJsonContent.exports;
      // Check common patterns like '.', './index', 'import', 'require'
      const mainExportKeys = ['.', './index'];
      for (const key of mainExportKeys) {
        const exportEntry = exportsObj[key];
        if (typeof exportEntry === 'string') {
          entryPoints.add(exportEntry);
        } else if (typeof exportEntry === 'object' && exportEntry !== null) {
          if (typeof exportEntry.import === 'string') entryPoints.add(exportEntry.import as string);
          if (typeof exportEntry.require === 'string')
            entryPoints.add(exportEntry.require as string);
          if (typeof exportEntry.default === 'string')
            entryPoints.add(exportEntry.default as string);
        }
      }
      // Fallback: iterate through all string values in exports if specific keys not found
      Object.values(exportsObj).forEach((value) => {
        if (typeof value === 'string') {
          entryPoints.add(value);
        } else if (typeof value === 'object' && value !== null) {
          const nestedExport = value as Record<string, unknown>; // More specific than 'any'
          if (typeof nestedExport.import === 'string') entryPoints.add(nestedExport.import);
          if (typeof nestedExport.require === 'string') entryPoints.add(nestedExport.require);
          if (typeof nestedExport.default === 'string') entryPoints.add(nestedExport.default);
        }
      });
    }

    if (typeof packageJsonContent.bin === 'string') {
      entryPoints.add(packageJsonContent.bin as string);
    } else if (typeof packageJsonContent.bin === 'object' && packageJsonContent.bin !== null) {
      const binObj: Record<string, any> = packageJsonContent.bin;
      Object.values(binObj).forEach((val) => {
        if (typeof val === 'string') {
          entryPoints.add(val);
        }
      });
    }
  }

  // 2. Common Entry File Names
  const commonNames = ['index', 'main', 'app'];
  const commonExtensions = ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs']; // Added more extensions
  const searchPaths: string[] = [];

  if (sourceDir && sourceDir !== '.') {
    searchPaths.push(path.join(rootDir, sourceDir));
  }
  searchPaths.push(rootDir); // Always check rootDir

  for (const basePath of searchPaths) {
    for (const name of commonNames) {
      for (const ext of commonExtensions) {
        const potentialFile = path.join(basePath, `${name}${ext}`);
        entryPoints.add(path.relative(rootDir, potentialFile)); // Add relative path
      }
    }
  }

  // 3. tsconfig.json Analysis
  if (tsconfigContent) {
    if (Array.isArray(tsconfigContent.files)) {
      tsconfigContent.files.forEach((file: string) => {
        if (typeof file === 'string') {
          entryPoints.add(file); // Assuming these are already relative or will be normalized
        }
      });
    }
    // 'include' is often too broad (e.g., "src/**/*"), but if very specific, it could be a hint.
    // This is lower priority and might add too many non-entry files.
    // Example: if include is ["src/main.ts"], that's a strong hint.
    if (Array.isArray(tsconfigContent.include)) {
      for (const pattern of tsconfigContent.include) {
        if (
          typeof pattern === 'string' &&
          !pattern.includes('*') &&
          (pattern.endsWith('.ts') || pattern.endsWith('.js'))
        ) {
          // Check if this specific file exists
          const filePath = path.join(rootDir, pattern);
          const existsResult = await fileOps.exists(filePath);
          if (existsResult.isOk() && existsResult.value) {
            const isDirResult = await fileOps.isDirectory(filePath);
            if (isDirResult.isOk() && !isDirResult.value) {
              entryPoints.add(pattern);
            }
          }
        }
      }
    }
  }

  // Validate and filter existing files
  const validEntryPoints: string[] = [];
  for (let entryPath of Array.from(entryPoints)) {
    // Normalize paths that might be like './dist/index.js' to 'dist/index.js'
    if (entryPath.startsWith('./')) {
      entryPath = entryPath.substring(2);
    }
    const absolutePath = path.resolve(rootDir, entryPath); // Resolve to ensure it's within root
    const relativeToRoot = path.relative(rootDir, absolutePath);

    // Ensure the path is not outside the rootDir (e.g. '../something')
    if (relativeToRoot.startsWith('..')) {
      continue;
    }

    const existsResult = await fileOps.exists(absolutePath);
    if (existsResult.isOk() && existsResult.value) {
      const isDirResult = await fileOps.isDirectory(absolutePath);
      if (isDirResult.isOk() && !isDirResult.value) {
        // Must be a file
        validEntryPoints.push(relativeToRoot);
      }
    }
  }

  // Deduplicate again after path normalization and validation
  return [...new Set(validEntryPoints)];
}
