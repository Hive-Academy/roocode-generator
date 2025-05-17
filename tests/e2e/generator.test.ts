import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { createE2ETestSetup } from './setup';

describe('Generator System E2E Tests', () => {
  const workingDir = process.cwd();
  let testSetup: ReturnType<typeof createE2ETestSetup>;

  beforeAll(async () => {
    testSetup = createE2ETestSetup(workingDir);
    await testSetup.initialize();
  });

  describe('Memory Bank Generation', () => {
    beforeEach(() => {
      // Clean previous generations
      execSync('rm -rf .roocode/memory-bank', { stdio: 'inherit' });
    });

    it('should generate complete memory bank', () => {
      // Generate memory bank
      execSync('npm start -- generate -g memory-bank', { stdio: 'inherit' });

      // Verify memory bank structure
      const memoryBankDir = join(workingDir, '.roocode', 'memory-bank');
      expect(existsSync(memoryBankDir)).toBe(true);

      // Check required files
      const requiredFiles = [
        'ProjectOverview.md',
        'TechnicalArchitecture.md',
        'DependencyGraph.md',
        'TestingStrategy.md',
      ];

      requiredFiles.forEach((file) => {
        expect(existsSync(join(memoryBankDir, file))).toBe(true);
      });
    });

    it('should generate accurate project overview', () => {
      const overviewPath = join(workingDir, '.roocode', 'memory-bank', 'ProjectOverview.md');
      const overview = readFileSync(overviewPath, 'utf-8');

      // Verify content accuracy
      expect(overview).toContain('RooCode Generator');
      expect(overview).toContain('TypeScript');
      expect(overview).toContain('CLI tool');
      expect(overview).toContain('LLM integration');
    });

    it('should generate accurate technical architecture', () => {
      const architecturePath = join(
        workingDir,
        '.roocode',
        'memory-bank',
        'TechnicalArchitecture.md'
      );
      const architecture = readFileSync(architecturePath, 'utf-8');

      // Verify architectural components
      expect(architecture).toContain('Dependency Injection');
      expect(architecture).toContain('LLM Providers');
      expect(architecture).toContain('Project Analysis');
      expect(architecture).toContain('Code Generation');
    });
  });

  describe('VSCode Rules Generation', () => {
    it('should generate TypeScript-specific rules', () => {
      // Generate VSCode rules
      execSync('npm start -- generate -g vscode', { stdio: 'inherit' });

      // Verify rules file
      const rulesPath = join(workingDir, '.roocode', 'vscode', 'typescript-rules.json');
      expect(existsSync(rulesPath)).toBe(true);

      const rules = JSON.parse(readFileSync(rulesPath, 'utf-8'));
      expect(rules).toHaveProperty('typeScriptRules');
      expect(rules.typeScriptRules).toContain('strict');
      expect(rules.typeScriptRules).toContain('noImplicitAny');
    });

    it('should generate dependency injection rules', () => {
      const rulesPath = join(workingDir, '.roocode', 'vscode', 'typescript-rules.json');
      const rules = JSON.parse(readFileSync(rulesPath, 'utf-8'));

      // Verify DI rules
      expect(rules).toHaveProperty('dependencyInjectionRules');
      expect(rules.dependencyInjectionRules).toContain('injectableDecorator');
      expect(rules.dependencyInjectionRules).toContain('containerRegistration');
    });

    it('should generate test-related rules', () => {
      const rulesPath = join(workingDir, '.roocode', 'vscode', 'typescript-rules.json');
      const rules = JSON.parse(readFileSync(rulesPath, 'utf-8'));

      // Verify test rules
      expect(rules).toHaveProperty('testingRules');
      expect(rules.testingRules).toContain('jestTestPattern');
      expect(rules.testingRules).toContain('testFileNaming');
    });
  });

  describe('System Prompts Generation', () => {
    it('should generate mode-specific prompts', () => {
      // Generate system prompts
      execSync('npm start -- generate -g prompts', { stdio: 'inherit' });

      // Verify prompts directory
      const promptsDir = join(workingDir, '.roocode', 'prompts');
      expect(existsSync(promptsDir)).toBe(true);

      // Check mode-specific prompts
      const modes = ['architect', 'senior-developer', 'code-reviewer'];
      modes.forEach((mode) => {
        const promptPath = join(promptsDir, `${mode}.md`);
        expect(existsSync(promptPath)).toBe(true);

        const prompt = readFileSync(promptPath, 'utf-8');
        expect(prompt).toContain(mode);
        expect(prompt).toContain('Role Description');
        expect(prompt).toContain('Responsibilities');
      });
    });

    it('should verify context integration in prompts', () => {
      const architectPrompt = readFileSync(
        join(workingDir, '.roocode', 'prompts', 'architect.md'),
        'utf-8'
      );

      // Verify context integration
      expect(architectPrompt).toContain('TypeScript');
      expect(architectPrompt).toContain('Dependency Injection');
      expect(architectPrompt).toContain('Project Structure');
    });
  });

  describe('Template Processing', () => {
    it('should process templates correctly', () => {
      // Generate from templates
      execSync('npm start -- generate -g templates', { stdio: 'inherit' });

      // Verify template processing
      const outputDir = join(workingDir, '.roocode', 'output');
      expect(existsSync(outputDir)).toBe(true);

      // Check processed files
      const processedFiles = ['README.md', 'CONTRIBUTING.md', 'ARCHITECTURE.md'];

      processedFiles.forEach((file) => {
        expect(existsSync(join(outputDir, file))).toBe(true);
      });
    });

    it('should include project-specific information', () => {
      const readmePath = join(workingDir, '.roocode', 'output', 'README.md');
      const readme = readFileSync(readmePath, 'utf-8');

      // Verify content customization
      expect(readme).toContain('RooCode Generator');
      expect(readme).toContain('TypeScript');
      expect(readme).toContain('Installation');
      expect(readme).toContain('Usage');
    });
  });
});
