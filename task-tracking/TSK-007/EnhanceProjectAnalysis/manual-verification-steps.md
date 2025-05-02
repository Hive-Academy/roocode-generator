# Manual Verification Steps for ProjectAnalyzer Enhancement (TSK-007)

This document outlines the steps to manually verify that the `ProjectAnalyzer` correctly extracts enhanced code structure details (`definedFunctions`, `definedClasses`, `internalDependencies`) after the changes implemented in TSK-007.

## Prerequisites

1.  Ensure the TSK-007 branch is checked out and the project is built (`npm run build`).
2.  The sample files created during Subtask 5 exist in `/tmp/tsk-007-manual-test`:
    - `/tmp/tsk-007-manual-test/utils.ts`
    - `/tmp/tsk-007-manual-test/models.ts`
    - `/tmp/tsk-007-manual-test/main.ts`

## Verification Steps

1.  **Create a temporary execution script:**
    Create a file named `run-analyzer.mjs` (or `.ts` if you prefer to compile it first) in the root of the `roocode-generator` project with the following content:

    ```typescript
    // run-analyzer.mjs (adjust imports based on compiled output in dist/)
    import { Container } from './dist/core/di/container.js';
    import { TYPES } from './dist/core/di/types.js';
    import { ProjectAnalyzer } from './dist/core/analysis/project-analyzer.js';
    import { AppModule } from './dist/core/di/modules/app-module.js';
    import path from 'path';
    import { fileURLToPath } from 'url';

    // Helper to get __dirname in ES modules
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

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
        const analyzer = container.get<ProjectAnalyzer>(TYPES.ProjectAnalyzer);

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
    ```

2.  **Execute the script:**
    Run the script from the project root using Node.js:

    ```bash
    node run-analyzer.mjs
    ```

3.  **Capture the Output:**
    Copy the JSON output printed between the `--- ProjectContext Output ---` markers.

4.  **Compare with Expected Output:**
    Compare the captured JSON with the "Expected `ProjectContext` JSON" section below. Pay close attention to the `structure.definedFunctions`, `structure.definedClasses`, and `dependencies.internalDependencies` fields. Minor variations in `techStack` are acceptable. The file paths should be relative to the `rootDir`.

## Expected `ProjectContext` JSON

```json
{
  "techStack": {
    "language": "TypeScript",
    "frameworks": [],
    "tools": []
  },
  "structure": {
    "rootDir": "/tmp/tsk-007-manual-test", // Note: Actual path might vary based on OS/environment (e.g., D:\tmp\tsk-007-manual-test on Windows)
    "filePaths": ["main.ts", "models.ts", "utils.ts"],
    "definedFunctions": {
      "utils.ts": [{ "name": "calculateCircumference" }],
      "models.ts": [],
      "main.ts": [{ "name": "displayGreeting" }]
    },
    "definedClasses": {
      "utils.ts": [],
      "models.ts": [{ "name": "Greeter" }],
      "main.ts": []
    }
  },
  "dependencies": {
    "packageJson": null,
    "internalDependencies": {
      "utils.ts": [],
      "models.ts": [],
      "main.ts": ["./utils", "./models", "fs"]
    }
  }
}
```

## Notes

- This manual test focuses on verifying the _structure_ and _content_ that the `ProjectAnalyzer` is _expected_ to produce based on the updated prompt and schema, using sample files.
- The actual execution of the `run-analyzer.mjs` script might still involve an LLM call depending on the environment configuration. The primary goal here is to have a defined input and expected output structure for verification.
- Discrepancies between the actual and expected output (especially in the new fields) should be investigated.
