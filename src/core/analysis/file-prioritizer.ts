import { Injectable } from '../di/decorators';
import { IFilePrioritizer, FileMetadata } from './interfaces';
import { FILE_PRIORITY_PATTERNS, PriorityLevel } from './constants';
import path from 'path';

@Injectable()
export class FilePrioritizer implements IFilePrioritizer {
  /**
   * Prioritizes files based on predefined patterns and returns them in priority order.
   * Priority 1 is highest, 5 is lowest.
   * @param filePaths Array of file paths to prioritize
   * @param rootDir Root directory of the project
   * @returns Array of file paths sorted by priority
   */
  prioritizeFiles(files: FileMetadata[], rootDir: string): FileMetadata[] {
    // Map each file to its priority
    const priorityMap = files.map((file) => ({
      ...file,
      priority: this.getFilePriority(file.path),
    }));

    // Sort by priority, size, and path depth
    priorityMap.sort((a, b) => {
      // Primary sort by priority
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }

      // Secondary sort by size (smaller files first)
      if (a.size !== b.size) {
        return a.size - b.size;
      }

      // Tertiary sort by path depth (files closer to root get higher priority)
      const aDepth = this.getPathDepth(a.path, rootDir);
      const bDepth = this.getPathDepth(b.path, rootDir);
      if (aDepth !== bDepth) {
        return aDepth - bDepth;
      }

      // Quaternary sort alphabetically for stable ordering
      return a.path.localeCompare(b.path);
    });

    return priorityMap;
  }

  /**
   * Determines the priority level of a file based on its name and extension.
   * @param filePath Path to the file
   * @returns Priority level (1-5, where 1 is highest priority)
   */
  private getFilePriority(filePath: string): PriorityLevel {
    const fileName = path.basename(filePath);
    const ext = path.extname(fileName).toLowerCase();

    // Check each priority level for a match
    for (let priority = 1; priority <= 5; priority++) {
      const patterns = FILE_PRIORITY_PATTERNS[priority as PriorityLevel];

      // Check if the file matches any pattern in this priority level
      if (patterns.has(fileName) || patterns.has(ext)) {
        return priority as PriorityLevel;
      }
    }

    // Default to lowest priority if no patterns match
    return 5;
  }

  /**
   * Calculates the directory depth of a file relative to the root directory.
   * @param filePath Path to the file
   * @param rootDir Root directory path
   * @returns Number of directory levels from root
   */
  private getPathDepth(filePath: string, rootDir: string): number {
    const relativePath = path.relative(rootDir, filePath);
    // Count directory separators to determine depth
    return relativePath.split(path.sep).length - 1;
  }
}
