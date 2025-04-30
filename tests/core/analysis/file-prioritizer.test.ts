import { FilePrioritizer } from '../../../src/core/analysis/file-prioritizer';
import { FileMetadata } from '../../../src/core/analysis/interfaces';

describe('FilePrioritizer', () => {
  const rootDir = '/project/root';

  describe('prioritizeFiles', () => {
    it('should prioritize files based on FILE_PRIORITY_PATTERNS', () => {
      const files: FileMetadata[] = [
        { path: 'src/app.ts', size: 1000 },
        { path: 'package.json', size: 500 },
        { path: 'README.md', size: 2000 },
        { path: 'test/app.test.ts', size: 800 },
        { path: 'webpack.config.js', size: 600 },
        { path: 'src/utils.ts', size: 1200 },
      ];

      const prioritizer = new FilePrioritizer();
      const prioritized = prioritizer.prioritizeFiles(files, rootDir);

      // Files matching priority 1 patterns should come first
      expect(prioritized.findIndex((f) => f.path === 'package.json')).toBeLessThan(
        prioritized.findIndex((f) => f.path === 'webpack.config.js')
      );
      // Priority 4 test files should come after source files (priority 3)
      expect(prioritized.findIndex((f) => f.path === 'test/app.test.ts')).toBeGreaterThan(
        prioritized.findIndex((f) => f.path === 'src/app.ts')
      );
      // Priority 5 docs last
      expect(prioritized.findIndex((f) => f.path === 'README.md')).toBeGreaterThan(
        prioritized.findIndex((f) => f.path === 'src/utils.ts')
      );
    });

    it('should order files by priority level correctly', () => {
      const files: FileMetadata[] = [
        { path: 'package.json', size: 500 }, // priority 1
        { path: 'webpack.config.js', size: 600 }, // priority 2
        { path: 'src/app.ts', size: 1000 }, // priority 3
        { path: 'test/app.test.ts', size: 800 }, // priority 4
        { path: 'README.md', size: 2000 }, // priority 5
      ];

      const prioritizer = new FilePrioritizer();
      const prioritized = prioritizer.prioritizeFiles(files, rootDir);

      expect(prioritized.map((f) => f.path)).toEqual([
        'package.json',
        'webpack.config.js',
        'src/app.ts',
        'test/app.test.ts',
        'README.md',
      ]);
    });

    it('should handle files not matching any priority pattern as lowest priority', () => {
      const files: FileMetadata[] = [
        { path: 'unknown.xyz', size: 100 },
        { path: 'anotherfile.abc', size: 200 },
      ];
      const prioritizer = new FilePrioritizer();
      const prioritized = prioritizer.prioritizeFiles(files, rootDir);

      // All files should be priority 5 (lowest), so order alphabetically
      expect(prioritized.map((f) => f.path)).toEqual(['anotherfile.abc', 'unknown.xyz']);
    });

    it('should prioritize files closer to root directory', () => {
      const files: FileMetadata[] = [
        { path: 'src/app.ts', size: 1000 },
        { path: 'src/utils/helper.ts', size: 800 },
        { path: 'app.ts', size: 500 },
        { path: 'lib/module.ts', size: 700 },
      ];
      const prioritizer = new FilePrioritizer();
      const prioritized = prioritizer.prioritizeFiles(files, rootDir);

      // app.ts and lib/module.ts are closer to root than src files
      expect(prioritized.findIndex((f) => f.path === 'app.ts')).toBeLessThan(
        prioritized.findIndex((f) => f.path === 'src/app.ts')
      );
      expect(prioritized.findIndex((f) => f.path === 'lib/module.ts')).toBeLessThan(
        prioritized.findIndex((f) => f.path === 'src/utils/helper.ts')
      );
    });

    it('should handle empty file list gracefully', () => {
      const prioritizer = new FilePrioritizer();
      const prioritized = prioritizer.prioritizeFiles([], rootDir);
      expect(prioritized).toEqual([]);
    });

    it('should maintain file metadata in prioritized results', () => {
      const files: FileMetadata[] = [
        { path: 'src/app.ts', size: 1000 },
        { path: 'package.json', size: 500 },
      ];
      const prioritizer = new FilePrioritizer();
      const prioritized = prioritizer.prioritizeFiles(files, rootDir);

      expect(prioritized).toEqual([
        { path: 'package.json', size: 500 },
        { path: 'src/app.ts', size: 1000 },
      ]);
    });
  });
});
