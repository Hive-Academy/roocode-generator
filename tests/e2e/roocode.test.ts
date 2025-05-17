import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { createE2ETestSetup } from './setup';

describe('RooCode Generator E2E Tests', () => {
  const workingDir = process.cwd();
  let testSetup: ReturnType<typeof createE2ETestSetup>;

  beforeAll(async () => {
    testSetup = createE2ETestSetup(workingDir);
    await testSetup.initialize();
  });

  describe('Phase 1: Build & Setup', () => {
    it('should complete build process successfully', () => {
      // Run build process
      execSync('npm run build', { stdio: 'inherit' });

      // Verify dist directory exists
      expect(existsSync(join(workingDir, 'dist'))).toBe(true);
    });

    it('should create local link successfully', () => {
      execSync('npm link', { stdio: 'inherit' });
      // Verify binary is accessible
      const result = execSync('roocode --version').toString();
      expect(result).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should create configuration files', () => {
      execSync('npm start -- config', { stdio: 'inherit' });

      // Verify config files exist
      expect(existsSync(join(workingDir, '.roocode.json'))).toBe(true);
      expect(existsSync(join(workingDir, '.roocode-llm.json'))).toBe(true);

      // Verify config file contents
      const config = JSON.parse(readFileSync(join(workingDir, '.roocode.json'), 'utf-8'));
      expect(config).toHaveProperty('projectRoot');
      expect(config).toHaveProperty('outputDir');
    });
  });

  describe('Phase 2: Self-Analysis Execution', () => {
    it('should generate artifacts successfully', () => {
      execSync('npm start -- generate -g roo', { stdio: 'inherit' });

      // Verify expected directory structure
      const memoryBankDir = join(workingDir, '.roocode', 'memory-bank');
      expect(existsSync(memoryBankDir)).toBe(true);
      expect(existsSync(join(memoryBankDir, 'ProjectOverview.md'))).toBe(true);
      expect(existsSync(join(memoryBankDir, 'TechnicalArchitecture.md'))).toBe(true);
      expect(existsSync(join(workingDir, '.roocode', '.roomodes'))).toBe(true);
    });

    it('should generate contextually accurate content', () => {
      // Read and verify ProjectOverview.md content
      const overview = readFileSync(
        join(workingDir, '.roocode', 'memory-bank', 'ProjectOverview.md'),
        'utf-8'
      );
      expect(overview).toContain('RooCode Generator');
      expect(overview).toContain('TypeScript');

      // Read and verify TechnicalArchitecture.md content
      const architecture = readFileSync(
        join(workingDir, '.roocode', 'memory-bank', 'TechnicalArchitecture.md'),
        'utf-8'
      );
      expect(architecture).toContain('Dependency Injection');
      expect(architecture).toContain('LLM Integration');
    });
  });

  // Note: Phase 3 tests will be implemented in separate files for better organization
  // We'll create specific test files for each component:
  // - projectAnalysis.test.ts
  // - llmIntegration.test.ts
  // - generator.test.ts
  // - errorHandling.test.ts
});
