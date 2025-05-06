// run-analyzer.js (adjust imports based on compiled output in dist/)
import { Container } from './dist/core/di/container.js';
import { TYPES } from './dist/core/di/types.js';
import { AppModule } from './dist/core/di/modules/app-module.js';
import path from 'path';
import process from 'process'; // Import process

async function runAnalysis() {
  // Get the file path from command line arguments
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('Usage: node run-analyzer.js <file_path>');
    process.exit(1);
  }

  // Resolve the absolute path
  const absoluteFilePath = path.resolve(filePath);

  console.log(`Analyzing file at: ${absoluteFilePath}`);

  try {
    // Setup DI Container
    const container = new Container();
    container.load(AppModule); // Load necessary modules

    // Resolve ProjectAnalyzer instance
    const analyzer = container.get(TYPES.ProjectAnalyzer);

    // Run analysis on the single file
    const result = await analyzer.analyzeProject([absoluteFilePath]);

    if (result.isSuccess()) {
      console.log('\n--- ProjectContext Output ---');
      console.log(JSON.stringify(result.value, null, 2));
      console.log('---------------------------\n');
      console.log('Analysis successful.');
    } else {
      console.error('\n--- Analysis Failed ---');
      console.error(result.error);
      console.log('-----------------------\n');
      console.log('Analysis failed.');
    }
  } catch (error) {
    console.error('An unexpected error occurred during analysis:', error);
    console.log('Analysis failed.');
  }
}

runAnalysis();
