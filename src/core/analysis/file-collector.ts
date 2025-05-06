import { Injectable, Inject } from '../di/decorators';
import { IFileOperations } from '../file-operations/interfaces';
import { ILogger } from '../services/logger-service';
import { Result } from '../result/result';
import { IFileCollector } from './interfaces';
import {
  BINARY_EXTENSIONS,
  SKIP_DIRECTORIES,
  ANALYZABLE_EXTENSIONS,
  ANALYZABLE_FILENAMES,
} from './constants';
import path from 'path';

interface FileAnalysisRules {
  isSkippableDirectory(dirName: string): boolean;
  isAnalyzableFile(filePath: string): boolean;
}

@Injectable()
class DefaultFileAnalysisRules implements FileAnalysisRules {
  constructor(@Inject('ILogger') private readonly logger: ILogger) {}

  isSkippableDirectory(dirName: string): boolean {
    const shouldSkip = SKIP_DIRECTORIES.has(dirName) || dirName.startsWith('.');
    if (shouldSkip) {
      this.logger.debug(`Skipping directory: ${dirName}`);
    }
    return shouldSkip;
  }

  isAnalyzableFile(filePath: string): boolean {
    const fileName = path.basename(filePath);
    const ext = path.extname(fileName).toLowerCase();

    // Skip test, generated, and lock files
    if (
      fileName.includes('.test.') ||
      fileName.includes('.spec.') ||
      fileName.endsWith('.d.ts') ||
      fileName.endsWith('.map') ||
      fileName === 'package-lock.json' ||
      fileName === 'yarn.lock' ||
      fileName.endsWith('.lock')
    ) {
      this.logger.debug(`Skipping test/generated/lock file: ${fileName}`);
      return false;
    }

    // Skip binary files
    if (BINARY_EXTENSIONS.has(ext)) {
      this.logger.debug(`Skipping binary file: ${fileName}`);
      return false;
    }

    // Include known filenames
    if (ANALYZABLE_FILENAMES.has(fileName)) {
      this.logger.debug(`Including known filename: ${fileName}`);
      return true;
    }

    // Include known extensions
    if (ANALYZABLE_EXTENSIONS.has(ext)) {
      this.logger.debug(`Including file with known extension: ${fileName}`);
      return true;
    }

    // Include known filenames without extensions
    if (!ext && ANALYZABLE_FILENAMES.has(fileName)) {
      this.logger.debug(`Including known filename without extension: ${fileName}`);
      return true;
    }

    this.logger.debug(`Skipping file by default: ${fileName}`);
    return false;
  }
}

@Injectable()
export class ProjectFileCollector implements IFileCollector {
  private readonly rules: FileAnalysisRules;

  constructor(
    @Inject('IFileOperations') private readonly fileOps: IFileOperations,
    @Inject('ILogger') private readonly logger: ILogger
  ) {
    this.rules = new DefaultFileAnalysisRules(logger);
  }

  async collectFiles(rootDir: string): Promise<Result<string[], Error>> {
    try {
      const allFiles: string[] = [];
      await this.scanDirectory(rootDir, allFiles);

      this.logger.debug(`Collected ${allFiles.length} analyzable files from ${rootDir}`);
      return Result.ok(allFiles);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error collecting project files: ${errorMessage}`);
      return Result.err(new Error(`Failed to collect project files: ${errorMessage}`));
    }
  }

  private async scanDirectory(dirPath: string, allFiles: string[]): Promise<void> {
    const result = await this.fileOps.readDir(dirPath);
    if (!result.isOk() || !result.value) {
      this.logger.debug(`Failed to read directory: ${dirPath}`);
      return;
    }

    for (const item of result.value) {
      const itemName: string = typeof item === 'string' ? item : item.name;
      const fullPath: string = path.join(dirPath, itemName);

      if (this.rules.isSkippableDirectory(itemName)) {
        continue;
      }

      const isDirResult = await this.fileOps.isDirectory(fullPath);
      if (isDirResult.isErr()) {
        this.logger.warn(`Error checking directory status: ${fullPath} - ${isDirResult.error}`);
        continue;
      }

      if (isDirResult.value) {
        await this.scanDirectory(fullPath, allFiles);
      } else if (this.rules.isAnalyzableFile(fullPath)) {
        allFiles.push(fullPath);
      }
    }
  }
}
