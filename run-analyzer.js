// run-analyzer.js (adjust imports based on compiled output in dist/)
import { Container } from './dist/core/di/container.js';
import { TYPES } from './dist/core/di/types.js';
import { AppModule } from './dist/core/di/modules/app-module.js';
import path from 'path';
// import { fileURLToPath } from 'url'; // Removed as unused

// Helper to get __filename in ES modules - Removed as unused
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename); // Removed unused variable

async function runAnalysis() {
  // Resolve the absolute path to the temporary test directory
  // IMPORTANT: Adjust this path separator if running on Windows vs Linux/macOS
  // Example for Linux/macOS:
  // const sampleProjectPath = path.resolve('/tmp/tsk-007-manual-test');
  // Example for Windows (adjust drive letter if needed):
  const sampleProjectPath = path.resolve('D:', 'tmp', 'tsk-007-manual-test');

  console.log(`Analyzing project at: ${sampleProjectPath}`);

  try {
    // Setup DI Container
    const container = new Container();
    container.load(AppModule); // Load necessary modules

    // Resolve ProjectAnalyzer instance
    const analyzer = container.get(TYPES.ProjectAnalyzer);

    // Run analysis
    // Note: This will likely still attempt an LLM call unless mocked.
    // For this *manual* verification design, we focus on the expected *structure*
    // the LLM *should* return based on the prompt, not the live LLM result itself yet.
    // The actual execution later will confirm the LLM interaction.
    const result = await analyzer.analyzeProject(sampleProjectPath);

    if (result.isSuccess()) {
      console.log('\n--- ProjectContext Output ---');
      console.log(JSON.stringify(result.value, null, 2));
      console.log('---------------------------\n');
      console.log('Verification successful (structure check).');
    } else {
      console.error('\n--- Analysis Failed ---');
      console.error(result.error);
      console.log('-----------------------\n');
      console.log('Verification failed.');
    }
  } catch (error) {
    console.error('An unexpected error occurred during analysis:', error);
    console.log('Verification failed.');
  }
}

runAnalysis();
