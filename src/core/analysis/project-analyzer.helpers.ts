import path from 'path';
import { Injectable, Inject } from '../di/decorators';
import { IFileOperations } from '../file-operations/interfaces';
import { ILogger } from '../services/logger-service';
import { Result } from '../result/result';
import { ProjectContext } from './types';
import {
  BINARY_EXTENSIONS,
  SKIP_DIRECTORIES,
  ANALYZABLE_EXTENSIONS,
  ANALYZABLE_FILENAMES,
} from './constants';

@Injectable()
export class ProjectAnalyzerHelpers {
  constructor(
    @Inject('IFileOperations') private readonly fileOps: IFileOperations,
    @Inject('ILogger') private readonly logger: ILogger
  ) {}

  public stripJsonComments(jsonString: string): string {
    this.logger.trace('Attempting to strip comments from JSON string');
    // Remove block comments first (e.g., /* ... */)
    let cleanedString = jsonString.replace(/\/\*[\s\S]*?\*\//g, '');

    // Then remove single-line comments (e.g., // ...),
    // ensuring not to remove parts of URLs like http://, https://, file://
    // The negative lookbehind `(?<!http:|https:|file:)` ensures that `//` is not preceded by these protocols.
    cleanedString = cleanedString.replace(/(?<!http:|https:|file:)\/\/[^\r\n]*/g, '');

    this.logger.trace('Successfully stripped comments from JSON string');
    return cleanedString;
  }

  public shouldAnalyzeFile(filePath: string): boolean {
    const fileName = path.basename(filePath);
    const ext = path.extname(fileName).toLowerCase();

    if (
      fileName.includes('.test.') ||
      fileName.includes('.spec.') ||
      fileName.endsWith('.d.ts') ||
      fileName.endsWith('.map') ||
      fileName === 'package-lock.json' ||
      fileName === 'yarn.lock' ||
      fileName.endsWith('.lock')
    ) {
      this.logger.trace(`Skipping test/generated/lock file: ${fileName}`);
      return false;
    }

    if (BINARY_EXTENSIONS.has(ext)) {
      this.logger.trace(`Skipping binary file: ${fileName}`);
      return false;
    }

    if (ANALYZABLE_FILENAMES.has(fileName)) {
      this.logger.trace(`Including known filename: ${fileName}`);
      return true;
    }

    if (ANALYZABLE_EXTENSIONS.has(ext)) {
      this.logger.trace(`Including file with known extension: ${fileName}`);
      return true;
    }

    // Note: This condition was `!ext && ANALYZABLE_FILENAMES.has(fileName)`
    // which is equivalent to `ANALYZABLE_FILENAMES.has(fileName)` if ext is empty.
    // The previous `ANALYZABLE_FILENAMES.has(fileName)` check already covers this.
    // However, to maintain exact logic:
    if (!ext && ANALYZABLE_FILENAMES.has(fileName)) {
      this.logger.trace(`Including known filename without extension: ${fileName}`);
      return true;
    }

    this.logger.trace(`Skipping file by default: ${fileName}`);
    return false;
  }

  public async isDirectory(filePath: string): Promise<Result<boolean, Error>> {
    const result = await this.fileOps.isDirectory(filePath);
    if (result.isErr()) {
      this.logger.warn(`Error checking if path is directory: ${filePath} - ${result.error}`);
      return Result.err(result.error as Error);
    }
    return Result.ok(result.value as boolean);
  }

  public async saveProjectContextToFile(
    context: ProjectContext,
    projectRootPath: string
  ): Promise<void> {
    try {
      const cacheDir = path.join(projectRootPath, '.cache');
      let outputPath = path.join(cacheDir, 'project-context-output.json');

      const createDirResult = await this.fileOps.createDirectory(cacheDir);

      if (createDirResult.isErr()) {
        this.logger.warn(
          `Failed to create .cache directory at ${cacheDir}: ${createDirResult.error?.message}. Attempting to write to project root instead.`
        );
        outputPath = path.join(projectRootPath, 'project-context-output.json');
      }

      const jsonContent = JSON.stringify(context, null, 2);
      const writeFileResult = await this.fileOps.writeFile(outputPath, jsonContent);

      if (writeFileResult.isOk()) {
        this.logger.info(`ProjectContext successfully written to: ${outputPath}`);
      } else {
        if (writeFileResult.error instanceof Error) {
          throw writeFileResult.error;
        } else {
          throw new Error(String(writeFileResult.error ?? 'Unknown error writing file'));
        }
      }
    } catch (fileWriteError) {
      const finalAttemptPath = path.join(projectRootPath, 'project-context-output.json');
      let warningMessage = `Failed to write ProjectContext to file. Last attempted path was in vicinity of ${finalAttemptPath}.`;
      if (fileWriteError instanceof Error) {
        warningMessage += ` Error: ${fileWriteError.message}`;
      } else if (typeof fileWriteError === 'string') {
        warningMessage += ` Error: ${fileWriteError}`;
      } else {
        try {
          warningMessage += ` Unknown error: ${JSON.stringify(fileWriteError)}`;
        } catch {
          warningMessage += ` Unknown error: ${String(fileWriteError)}`;
        }
      }
      this.logger.warn(warningMessage);
    }
  }

  public async collectAnalyzableFiles(rootDir: string): Promise<Result<string[], Error>> {
    try {
      const allFiles: string[] = [];
      const scanDir = async (dirPath: string): Promise<Result<void, Error>> => {
        const readDirResult = await this.fileOps.readDir(dirPath);
        if (readDirResult.isErr()) {
          return Result.err(
            new Error(
              `Read directory failed: ${readDirResult.error instanceof Error ? readDirResult.error.message : String(readDirResult.error)}`
            )
          );
        }
        if (!readDirResult.value) {
          this.logger.warn(`readDir for ${dirPath} returned ok but no value.`);
          return Result.ok(undefined);
        }

        const items = readDirResult.value;
        for (const item of items) {
          const itemName: string = typeof item === 'string' ? item : item.name;
          const fullPath: string = path.join(dirPath, itemName);

          if (SKIP_DIRECTORIES.has(itemName)) {
            this.logger.trace(`Skipping excluded directory: ${itemName}`);
            continue;
          }

          if (itemName.startsWith('.')) {
            this.logger.trace(`Skipping hidden item: ${itemName}`);
            continue;
          }

          const isDirResult = await this.isDirectory(fullPath); // Calls helper's isDirectory
          if (isDirResult.isErr()) {
            this.logger.warn(`Error checking directory status: ${fullPath} - ${isDirResult.error}`);
            return Result.err(
              new Error(
                `Is directory check failed: ${isDirResult.error instanceof Error ? isDirResult.error.message : String(isDirResult.error)}`
              )
            );
          }

          if (isDirResult.value) {
            const scanResult = await scanDir(fullPath);
            if (scanResult.isErr()) {
              return scanResult;
            }
          } else if (this.shouldAnalyzeFile(fullPath)) {
            // Calls helper's shouldAnalyzeFile
            allFiles.push(fullPath);
          }
        }
        return Result.ok(undefined);
      };

      const startTime = Date.now();
      const finalScanResult = await scanDir(rootDir);
      if (finalScanResult.isErr()) {
        return Result.err(finalScanResult.error as Error);
      }
      const elapsedTime = Date.now() - startTime;
      this.logger.info(
        `File path collection completed in ${elapsedTime} ms. Found ${allFiles.length} analyzable files.`
      );

      return Result.ok(allFiles);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error collecting analyzable files: ${errorMessage}`);
      return Result.err(new Error(`Error collecting analyzable files: ${errorMessage}`));
    }
  }
}
