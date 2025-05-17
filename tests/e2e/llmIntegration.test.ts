import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createE2ETestSetup } from './setup';

describe('LLM Integration E2E Tests', () => {
  const workingDir = process.cwd();
  let testSetup: ReturnType<typeof createE2ETestSetup>;

  beforeAll(async () => {
    testSetup = createE2ETestSetup(workingDir);
    await testSetup.initialize();
  });

  describe('Provider Configuration', () => {
    const providers = ['openai', 'google-genai', 'anthropic', 'openrouter'];

    providers.forEach((provider) => {
      it(`should configure ${provider} provider`, () => {
        // Update LLM configuration
        const llmConfig = {
          provider,
          model:
            provider === 'openai'
              ? 'gpt-4'
              : provider === 'google-genai'
                ? 'gemini-pro'
                : provider === 'anthropic'
                  ? 'claude-3-opus'
                  : 'openai/gpt-4',
          temperature: 0.7,
          maxTokens: 2000,
        };

        writeFileSync(join(workingDir, '.roocode-llm.json'), JSON.stringify(llmConfig, null, 2));

        // Test provider configuration
        execSync('npm start -- test-provider', { stdio: 'inherit' });

        // Verify provider test results
        const testResultFile = join(workingDir, '.roocode', 'provider-test.json');
        expect(existsSync(testResultFile)).toBe(true);

        const testResult = JSON.parse(readFileSync(testResultFile, 'utf-8'));
        expect(testResult.status).toBe('success');
        expect(testResult.provider).toBe(provider);
      });
    });
  });

  describe('Provider Switching', () => {
    it('should switch between providers seamlessly', () => {
      // Test switching between providers
      execSync('npm start -- switch-provider openai', { stdio: 'inherit' });
      execSync('npm start -- generate -g roo', { stdio: 'inherit' });

      // Verify first generation
      const firstGeneration = join(workingDir, '.roocode', 'memory-bank', 'ProjectOverview.md');
      expect(existsSync(firstGeneration)).toBe(true);

      // Switch provider and generate again
      execSync('npm start -- switch-provider anthropic', { stdio: 'inherit' });
      execSync('npm start -- generate -g roo', { stdio: 'inherit' });

      // Verify second generation
      const secondGeneration = join(workingDir, '.roocode', 'memory-bank', 'ProjectOverview.md');
      expect(existsSync(secondGeneration)).toBe(true);

      // Compare generations
      const firstContent = readFileSync(firstGeneration, 'utf-8');
      const secondContent = readFileSync(secondGeneration, 'utf-8');
      expect(firstContent).not.toBe(secondContent);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limits appropriately', () => {
      // Configure short rate limit window
      const llmConfig = {
        provider: 'openai',
        model: 'gpt-4',
        rateLimit: {
          requestsPerMinute: 3,
          retryAfter: 60,
        },
      };

      writeFileSync(join(workingDir, '.roocode-llm.json'), JSON.stringify(llmConfig, null, 2));

      // Make multiple requests
      for (let i = 0; i < 5; i++) {
        execSync('npm start -- generate -g roo', { stdio: 'inherit' });
      }

      // Verify rate limit handling
      const logFile = join(workingDir, '.roocode', 'rate-limit.log');
      expect(existsSync(logFile)).toBe(true);

      const logs = readFileSync(logFile, 'utf-8');
      expect(logs).toContain('Rate limit reached');
      expect(logs).toContain('Waiting for rate limit window');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid API keys gracefully', () => {
      // Set invalid API key
      const llmConfig = {
        provider: 'openai',
        model: 'gpt-4',
        apiKey: 'invalid-key',
      };

      writeFileSync(join(workingDir, '.roocode-llm.json'), JSON.stringify(llmConfig, null, 2));

      // Attempt generation
      try {
        execSync('npm start -- generate -g roo', { stdio: 'inherit' });
      } catch (error) {
        expect(error).toBeDefined();
        // Verify error handling
        const errorLog = join(workingDir, '.roocode', 'error.log');
        expect(existsSync(errorLog)).toBe(true);

        const logs = readFileSync(errorLog, 'utf-8');
        expect(logs).toContain('Invalid API key');
        expect(logs).toContain('Please check your configuration');
      }
    });

    it('should handle network errors gracefully', () => {
      // Simulate network error by using invalid endpoint
      const llmConfig = {
        provider: 'openai',
        model: 'gpt-4',
        endpoint: 'https://invalid-endpoint.example.com',
      };

      writeFileSync(join(workingDir, '.roocode-llm.json'), JSON.stringify(llmConfig, null, 2));

      // Attempt generation
      try {
        execSync('npm start -- generate -g roo', { stdio: 'inherit' });
      } catch (error) {
        expect(error).toBeDefined();
        // Verify error handling
        const errorLog = join(workingDir, '.roocode', 'error.log');
        expect(existsSync(errorLog)).toBe(true);

        const logs = readFileSync(errorLog, 'utf-8');
        expect(logs).toContain('Network error');
        expect(logs).toContain('Failed to connect');
      }
    });
  });
});
