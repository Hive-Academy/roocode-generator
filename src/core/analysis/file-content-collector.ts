import { Injectable, Inject } from '../di/decorators';
import { ILogger } from '../services/logger-service';
import { Result } from '../result/result';
import {
  ITokenCounter,
  IFileContentCollector,
  FileContentResult,
  FileMetadata,
} from './interfaces';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class FileContentCollector implements IFileContentCollector {
  constructor(
    @Inject('ITokenCounter') private readonly tokenCounter: ITokenCounter,
    @Inject('ILogger') private readonly logger: ILogger
  ) {}

  async collectContent(
    filePaths: string[],
    rootDir: string,
    tokenLimit: number
  ): Promise<Result<FileContentResult, Error>> {
    try {
      let totalContent = '';
      let currentTokenCount = 0;
      const metadata: FileMetadata[] = [];

      for (const filePath of filePaths) {
        const fullPath = join(rootDir, filePath);

        try {
          // Get file stats for size
          const stats = await stat(fullPath);
          const fileSize = stats.size;

          // Read file content
          const content = await readFile(fullPath, 'utf-8');

          // Add to metadata
          metadata.push({
            path: filePath,
            size: fileSize,
          });

          // Format file content with header and separator
          const formattedContent = this.formatFileContent(filePath, content);

          // Check token count
          const tokenResult = await this.tokenCounter.countTokens(formattedContent);
          if (tokenResult.isErr()) {
            this.logger.error(
              `Failed to count tokens for file ${filePath}: ${tokenResult.error?.message || 'Unknown error'}`
            );
            continue;
          }

          // Since we checked isErr(), we know value is defined
          const tokenCount =
            tokenResult.value && isNaN(tokenResult.value) ? 0 : (tokenResult.value as number);
          const newTokenCount = currentTokenCount + tokenCount;

          // Stop if we would exceed the token limit
          if (newTokenCount > tokenLimit) {
            this.logger.debug(
              `Token limit ${tokenLimit} would be exceeded. Stopping content collection.`
            );
            break;
          }

          // Add the content and update token count
          totalContent += formattedContent;
          currentTokenCount = newTokenCount;

          this.logger.debug(`Added file ${filePath}. Current token count: ${currentTokenCount}`);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(`Error reading file ${filePath}: ${errorMessage}`);
          // Continue with next file instead of failing completely
          continue;
        }
      }

      if (!totalContent) {
        return Result.err(new Error('No content could be collected from the provided files'));
      }

      return Result.ok({
        content: totalContent,
        metadata,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Error collecting file contents: ${errorMessage}`);
      return Result.err(new Error(`Failed to collect file contents: ${errorMessage}`));
    }
  }

  private formatFileContent(filePath: string, content: string): string {
    return `\n=== File: ${filePath} ===\n\n${content}\n\n`;
  }
}
