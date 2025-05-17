import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createE2ETestSetup } from './setup';

describe('Error Handling E2E Tests', () => {
  const workingDir = process.cwd();
  let testSetup: ReturnType<typeof createE2ETestSetup>;

  beforeAll(async () => {
    testSetup = createE2ETestSetup(workingDir);
    await testSetup.initialize();
  });

  describe('Invalid Configuration', () => {
    it('should handle invalid JSON configuration', () => {
      // Create invalid JSON configuration
      const invalidConfig = `{
        "projectRoot": "${workingDir}",
        "invalid": true,
        missing: "quotes"
      }`;

      writeFileSync(join(workingDir, '.roocode.json'), invalidConfig);

      try {
        execSync('npm start -- generate -g roo', { stdio: 'inherit' });
      } catch (error) {
        expect(error).toBeDefined();
        // Verify error handling
        const errorLog = join(workingDir, '.roocode', 'error.log');
        expect(existsSync(errorLog)).toBe(true);

        const logs = readFileSync(errorLog, 'utf-8');
        expect(logs).toContain('Invalid configuration');
        expect(logs).toContain('JSON parsing error');
      }
    });

    it('should handle missing required configuration', () => {
      // Create config without required fields
      const incompleteConfig = {
        // Missing projectRoot
        outputDir: join(workingDir, 'output'),
      };

      writeFileSync(join(workingDir, '.roocode.json'), JSON.stringify(incompleteConfig, null, 2));

      try {
        execSync('npm start -- generate -g roo', { stdio: 'inherit' });
      } catch (error) {
        expect(error).toBeDefined();
        // Verify error handling
        const errorLog = join(workingDir, '.roocode', 'error.log');
        expect(existsSync(errorLog)).toBe(true);

        const logs = readFileSync(errorLog, 'utf-8');
        expect(logs).toContain('Missing required configuration');
        expect(logs).toContain('projectRoot is required');
      }
    });
  });

  describe('API Failure Handling', () => {
    it('should handle API timeout gracefully', () => {
      // Configure short timeout
      const llmConfig = {
        provider: 'openai',
        model: 'gpt-4',
        timeout: 1, // 1ms timeout to force failure
      };

      writeFileSync(join(workingDir, '.roocode-llm.json'), JSON.stringify(llmConfig, null, 2));

      try {
        execSync('npm start -- generate -g roo', { stdio: 'inherit' });
      } catch (error) {
        expect(error).toBeDefined();
        // Verify error handling
        const errorLog = join(workingDir, '.roocode', 'error.log');
        expect(existsSync(errorLog)).toBe(true);

        const logs = readFileSync(errorLog, 'utf-8');
        expect(logs).toContain('API request timeout');
        expect(logs).toContain('Request exceeded timeout limit');
      }
    });

    it('should handle API rate limiting', () => {
      // Configure aggressive rate limiting
      const llmConfig = {
        provider: 'openai',
        model: 'gpt-4',
        rateLimit: {
          requestsPerMinute: 1,
          retryAfter: 60,
        },
      };

      writeFileSync(join(workingDir, '.roocode-llm.json'), JSON.stringify(llmConfig, null, 2));

      // Make multiple requests
      for (let i = 0; i < 3; i++) {
        try {
          execSync('npm start -- generate -g roo', { stdio: 'inherit' });
        } catch (error) {
          expect(error).toBeDefined();
          // Expected to fail after first request
          const errorLog = join(workingDir, '.roocode', 'error.log');
          expect(existsSync(errorLog)).toBe(true);

          const logs = readFileSync(errorLog, 'utf-8');
          expect(logs).toContain('Rate limit exceeded');
          expect(logs).toContain('Please try again');
        }
      }
    });
  });

  describe('File System Error Recovery', () => {
    it('should handle read permission errors', () => {
      // Attempt to read from non-existent directory
      try {
        execSync('npm start -- analyze /non/existent/path', { stdio: 'inherit' });
      } catch (error) {
        expect(error).toBeDefined();
        // Verify error handling
        const errorLog = join(workingDir, '.roocode', 'error.log');
        expect(existsSync(errorLog)).toBe(true);

        const logs = readFileSync(errorLog, 'utf-8');
        expect(logs).toContain('File system error');
        expect(logs).toContain('Unable to read directory');
      }
    });

    it('should handle write permission errors', () => {
      // Attempt to write to root directory (should fail)
      const llmConfig = {
        provider: 'openai',
        model: 'gpt-4',
        outputDir: '/root/forbidden',
      };

      writeFileSync(join(workingDir, '.roocode-llm.json'), JSON.stringify(llmConfig, null, 2));

      try {
        execSync('npm start -- generate -g roo', { stdio: 'inherit' });
      } catch (error) {
        expect(error).toBeDefined();
        // Verify error handling
        const errorLog = join(workingDir, '.roocode', 'error.log');
        expect(existsSync(errorLog)).toBe(true);

        const logs = readFileSync(errorLog, 'utf-8');
        expect(logs).toContain('File system error');
        expect(logs).toContain('Permission denied');
      }
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous requests', () => {
      // Attempt concurrent operations
      const operations = [
        'npm start -- generate -g roo',
        'npm start -- analyze',
        'npm start -- test-provider',
      ];

      const promises = operations.map((cmd) => {
        return new Promise<void>((resolve, reject) => {
          try {
            execSync(cmd, { stdio: 'inherit' });
            resolve();
          } catch {
            reject(new Error('Concurrent operation failed'));
          }
        });
      });

      // Verify concurrent operation handling
      return Promise.allSettled(promises).then((_results) => {
        const errorLog = join(workingDir, '.roocode', 'error.log');
        expect(existsSync(errorLog)).toBe(true);

        const logs = readFileSync(errorLog, 'utf-8');
        expect(logs).toContain('Concurrent operation detected');
        expect(logs).toContain('Operations queued');
      });
    });
  });
});
