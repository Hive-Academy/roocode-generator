import { IProjectConfigService } from '../core/config/interfaces';
import { IFileOperations } from '../core/file-operations/interfaces';
import { Result } from '../core/result/result';
import { ILogger } from '../core/services/logger-service';
import { IProjectContextService } from './interfaces';
import { Injectable, Inject } from '../core/di/decorators';
import { Dirent } from 'fs';
import path from 'path';
import { MemoryBankError } from '../core/errors/memory-bank-errors';

@Injectable()
export class ProjectContextService implements IProjectContextService {
  // Common binary file extensions to skip
  private readonly BINARY_EXTENSIONS = new Set([
    '.jpg',
    '.jpeg',
    '.png',
    '.gif',
    '.ico',
    '.pdf',
    '.zip',
    '.tar',
    '.gz',
    '.7z',
    '.rar',
    '.exe',
    '.dll',
    '.so',
    '.dylib',
  ]);

  // Directories to skip
  private readonly SKIP_DIRECTORIES = new Set([
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
  ]);

  constructor(
    @Inject('IFileOperations') private readonly fileOperations: IFileOperations,
    @Inject('IProjectConfigService') private readonly projectConfigService: IProjectConfigService,
    @Inject('ILogger') private readonly logger: ILogger
  ) {}

  // Helper method to wrap caught errors during context gathering
  private _wrapContextError(
    message: string,
    operation: string,
    caughtError: unknown,
    additionalContext?: Record<string, unknown>
  ): Result<never> {
    const cause = caughtError instanceof Error ? caughtError : new Error(String(caughtError));
    const error = new MemoryBankError(message, { ...additionalContext, operation }, cause);
    this.logger.error(error.message, error); // Log the wrapped error
    return Result.err(error);
  }

  async gatherContext(paths: string[]): Promise<Result<string, Error>> {
    try {
      const contextData: string[] = [];

      for (const basePath of paths) {
        const result = await this.processPath(basePath, contextData);
        if (result.isErr()) {
          this.logger.warn(`Error processing path ${basePath}: ${result.error?.message}`);
          // Continue processing other paths even if one fails
          continue;
        }
      }

      if (contextData.length === 0) {
        return Result.err(
          new MemoryBankError('No valid content found in the provided paths', {
            paths,
            operation: 'gatherContext',
          })
        );
      }

      return Result.ok(contextData.join('\n'));
    } catch (error) {
      return this._wrapContextError('Error gathering context', 'gatherContextCatch', error, {
        paths,
      });
    }
  }

  private async processPath(
    currentPath: string,
    contextData: string[]
  ): Promise<Result<void, Error>> {
    try {
      // Normalize the path to handle any undefined cases
      const normalizedPath = this.fileOperations.normalizePath(currentPath);

      // Check if path is a directory
      const dirResult = await this.fileOperations.readDir(normalizedPath);

      if (dirResult.isErr()) {
        // If we can't read as directory, try reading as file
        const fileResult = await this.fileOperations.readFile(normalizedPath);
        if (fileResult.isErr()) {
          // Wrap the file reading error if directory read failed first
          return this._wrapContextError(
            `Failed to process path as directory or file: ${normalizedPath}`,
            'processPathFileRead',
            fileResult.error ?? new Error('Unknown file read error after dir read fail'),
            { path: normalizedPath }
          );
        }

        if (this.shouldProcessFile(normalizedPath)) {
          contextData.push(fileResult.value as string);
        }
        return Result.ok(void 0);
      }

      // Process directory contents
      const entries = dirResult.value as Dirent[];
      for (const entry of entries) {
        if (!entry.name || this.shouldSkipEntry(entry)) {
          continue;
        }

        const fullPath = path.join(normalizedPath, entry.name);
        if (entry.isDirectory()) {
          const result = await this.processPath(fullPath, contextData);
          if (result.isErr()) {
            this.logger.warn(
              `Skipping directory ${fullPath} due to error: ${result.error?.message}`
            );
            continue;
          }
        } else if (entry.isFile() && this.shouldProcessFile(entry.name)) {
          const fileResult = await this.fileOperations.readFile(fullPath);
          if (fileResult.isErr()) {
            this.logger.warn(
              `Skipping file ${fullPath} due to error: ${fileResult.error?.message}`
            );
            continue;
          }
          contextData.push(fileResult.value as string);
        }
      }

      return Result.ok(void 0);
    } catch (error) {
      return this._wrapContextError(
        `Error processing path ${currentPath}`,
        'processPathCatch',
        error,
        { path: currentPath }
      );
    }
  }

  private shouldProcessFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return !this.BINARY_EXTENSIONS.has(ext);
  }

  private shouldSkipEntry(entry: Dirent): boolean {
    return (
      !entry.name || // Skip entries with no name
      entry.name.startsWith('.') || // Skip hidden files/directories
      (entry.isDirectory() && this.SKIP_DIRECTORIES.has(entry.name))
    );
  }
}
