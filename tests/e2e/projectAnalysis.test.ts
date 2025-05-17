import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { createE2ETestSetup } from './setup';

describe('Project Analysis E2E Tests', () => {
  const workingDir = process.cwd();
  let testSetup: ReturnType<typeof createE2ETestSetup>;

  beforeAll(async () => {
    testSetup = createE2ETestSetup(workingDir);
    await testSetup.initialize();
  });

  describe('Source Structure Analysis', () => {
    it('should correctly analyze src/ directory structure', () => {
      // Run analysis
      execSync('npm start -- analyze', { stdio: 'inherit' });

      // Verify analysis output exists
      const analysisFile = join(workingDir, '.roocode', 'analysis', 'structure.json');
      expect(existsSync(analysisFile)).toBe(true);

      // Verify analysis content
      const analysis = JSON.parse(readFileSync(analysisFile, 'utf-8'));
      expect(analysis).toHaveProperty('directories');
      expect(analysis.directories).toContain('src');
      expect(analysis).toHaveProperty('files');
    });

    it('should detect key source files', () => {
      const analysisFile = join(workingDir, '.roocode', 'analysis', 'structure.json');
      const analysis = JSON.parse(readFileSync(analysisFile, 'utf-8'));

      // Verify detection of important files
      const sourceFiles = analysis.files;
      expect(sourceFiles).toContain('src/index.ts');
      expect(sourceFiles).toContain('src/container.ts');
      expect(sourceFiles).toContain('src/analyzer/index.ts');
    });
  });

  describe('Package.json Analysis', () => {
    it('should correctly parse package.json', () => {
      // Run dependency analysis
      execSync('npm start -- analyze -d', { stdio: 'inherit' });

      // Verify dependency analysis
      const depAnalysisFile = join(workingDir, '.roocode', 'analysis', 'dependencies.json');
      expect(existsSync(depAnalysisFile)).toBe(true);

      const depAnalysis = JSON.parse(readFileSync(depAnalysisFile, 'utf-8'));
      expect(depAnalysis).toHaveProperty('dependencies');
      expect(depAnalysis).toHaveProperty('devDependencies');
      expect(depAnalysis.dependencies).toHaveProperty('@langchain/core');
    });
  });

  describe('TypeScript Configuration', () => {
    it('should detect TypeScript configuration', () => {
      // Run TypeScript config analysis
      execSync('npm start -- analyze -t', { stdio: 'inherit' });

      // Verify TypeScript analysis
      const tsAnalysisFile = join(workingDir, '.roocode', 'analysis', 'typescript.json');
      expect(existsSync(tsAnalysisFile)).toBe(true);

      const tsAnalysis = JSON.parse(readFileSync(tsAnalysisFile, 'utf-8'));
      expect(tsAnalysis).toHaveProperty('compilerOptions');
      expect(tsAnalysis.compilerOptions).toHaveProperty('strict', true);
    });
  });

  describe('AST Parsing', () => {
    it('should successfully parse TypeScript AST', () => {
      // Run AST analysis
      execSync('npm start -- analyze -a', { stdio: 'inherit' });

      // Verify AST analysis
      const astAnalysisFile = join(workingDir, '.roocode', 'analysis', 'ast.json');
      expect(existsSync(astAnalysisFile)).toBe(true);

      const astAnalysis = JSON.parse(readFileSync(astAnalysisFile, 'utf-8'));
      expect(astAnalysis).toHaveProperty('classes');
      expect(astAnalysis).toHaveProperty('interfaces');
      expect(astAnalysis).toHaveProperty('decorators');
    });

    it('should identify dependency injection patterns', () => {
      const astAnalysisFile = join(workingDir, '.roocode', 'analysis', 'ast.json');
      const astAnalysis = JSON.parse(readFileSync(astAnalysisFile, 'utf-8'));

      // Verify DI pattern detection
      expect(astAnalysis.decorators).toContain('injectable');
      expect(astAnalysis.decorators).toContain('inject');
    });
  });
});
