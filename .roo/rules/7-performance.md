---
title: Performance
version: 1.0.0
lastUpdated: 2025-04-23T12:04:03.804Z
sectionId: 7
applicableLanguages: [TypeScript, JavaScript]
relatedSections: []
---

Okay, here are comprehensive coding rules and standards for the "Performance" section, tailored to your `roocode-generator` project using TypeScript, Langchain, Commander.js, and other specified technologies.

```markdown
# Coding Rules & Standards: Performance

## 1. Guiding Principles

1.  **Measure First:** Do not optimize prematurely. Use profiling tools to identify actual bottlenecks before applying complex optimizations. Focus on the most impactful areas.
2.  **Understand Trade-offs:** Performance improvements often come at the cost of readability, maintainability, or memory usage. Strive for balance and document significant trade-offs.
3.  **Target Hot Paths:** Concentrate optimization efforts on code paths executed frequently or those handling large amounts of data or complex computations (e.g., core generation loops, file analysis, LLM interactions).
4.  **Leverage Asynchronicity:** Node.js thrives on non-blocking I/O. Ensure asynchronous operations are handled efficiently to maximize throughput.

## 2. Asynchronous Operations (Node.js / TypeScript)

### 2.1. Prefer `async/await` for Clarity

*   **Rule:** Use `async/await` for managing Promises to improve code readability and maintainability compared to raw `.then()`/`.catch()` chains, especially for sequential asynchronous operations.
*   **Rationale:** Simplifies asynchronous logic, making it easier to reason about and debug.
*   **Example:**
    ```typescript
    // Good: Clear sequential execution
    async function processProject(projectId: string): Promise<Result<void, Error>> {
      const configResult = await this.configService.getProjectConfig(projectId);
      if (configResult.isErr()) return configResult;

      const analysisResult = await this.projectAnalyzer.analyze(configResult.value);
      if (analysisResult.isErr()) return analysisResult;

      // ... further processing
      return Result.ok(undefined);
    }

    // Less Ideal: Can become nested and harder to follow
    function processProjectLegacy(projectId: string): Promise<Result<void, Error>> {
      return this.configService.getProjectConfig(projectId).then(configResult => {
        if (configResult.isErr()) return configResult;
        return this.projectAnalyzer.analyze(configResult.value).then(analysisResult => {
          if (analysisResult.isErr()) return analysisResult;
          // ...
          return Result.ok(undefined);
        });
      });
    }
    ```

### 2.2. Use `Promise.all` / `Promise.allSettled` for Concurrency

*   **Rule:** When multiple independent asynchronous operations can run in parallel, use `Promise.all` (fail-fast) or `Promise.allSettled` (wait for all, regardless of success/failure) to execute them concurrently.
*   **Rationale:** Reduces total execution time compared to awaiting promises sequentially. Crucial for tasks like reading multiple configuration files or making parallelizable LLM calls (respecting rate limits).
*   **Example (`src/core/config/project-config.service.ts` or similar):**
    ```typescript
    import { promises as fs } from 'fs';
    import path from 'path';

    async function loadAuxiliaryConfigs(configDir: string): Promise<Result<[ConfigA, ConfigB], Error>> {
      try {
        const [configAResult, configBResult] = await Promise.allSettled([
          fs.readFile(path.join(configDir, 'a.json'), 'utf-8'),
          fs.readFile(path.join(configDir, 'b.yaml'), 'utf-8')
        ]);

        // Handle results from Promise.allSettled
        if (configAResult.status === 'rejected') {
           return Result.err(new Error(`Failed to load config A: ${configAResult.reason}`));
        }
        if (configBResult.status === 'rejected') {
           return Result.err(new Error(`Failed to load config B: ${configBResult.reason}`));
        }

        const configA = JSON.parse(configAResult.value);
        const configB = /* parse YAML */ YAML.parse(configBResult.value);

        return Result.ok([configA, configB]);
      } catch (error) {
         // Catch potential JSON/YAML parsing errors or other unexpected issues
         return Result.err(error instanceof Error ? error : new Error('Failed loading auxiliary configs'));
      }
    }
    ```

### 2.3. Avoid Blocking the Event Loop

*   **Rule:** Never perform long-running synchronous operations (complex calculations, synchronous file I/O, blocking external calls) on the main thread. Use asynchronous APIs or, if absolutely necessary for CPU-bound tasks, consider Worker Threads (though likely overkill for this project type unless a specific bottleneck is identified).
*   **Rationale:** Blocking the event loop prevents Node.js from handling other requests or events, leading to poor performance and responsiveness, especially noticeable in CLI interactions or potential future server modes.
*   **Anti-Pattern (`src/core/file-operations/file-operations.ts`):**
    ```typescript
    import fs from 'fs'; // DO NOT use synchronous methods in hot paths!

    // Bad: Blocks the entire process
    function readFileContentSync(filePath: string): string {
      try {
        // AVOID THIS for potentially large files or frequent calls
        return fs.readFileSync(filePath, 'utf-8');
      } catch (e) {
        // Handle error
        return '';
      }
    }
    ```
*   **Good Practice:** Always use the `fs.promises` API or callback-based `fs` methods within async functions.

## 3. I/O Operations (File System & Network)

### 3.1. Use Asynchronous File System APIs

*   **Rule:** Always use the `fs.promises` API for file system operations.
*   **Rationale:** Prevents blocking the event loop, crucial for application responsiveness.
*   **Example (`src/core/file-operations/file-operations.ts`):**
    ```typescript
    import { promises as fs } from 'fs';
    import { Result } from '../result/result'; // Assuming Result type

    @injectable()
    export class FileOperations implements IFileOperations {
        async readFile(filePath: string): Promise<Result<string, Error>> {
            try {
                const content = await fs.readFile(filePath, 'utf-8');
                return Result.ok(content);
            } catch (error) {
                // Consider specific error handling/wrapping
                return Result.err(this.handleFSError(error, `reading file: ${filePath}`));
            }
        }

        async writeFile(filePath: string, content: string): Promise<Result<void, Error>> {
            try {
                await fs.writeFile(filePath, content, 'utf-8');
                return Result.ok(undefined);
            } catch (error) {
                return Result.err(this.handleFSError(error, `writing file: ${filePath}`));
            }
        }

        // ... other async methods (mkdir, stat, etc.)

        private handleFSError(error: unknown, context: string): FileOperationError {
            // Implement specific error handling/logging
            const message = error instanceof Error ? error.message : String(error);
            return new FileOperationError(`File operation failed (${context}): ${message}`, error);
        }
    }
    ```

### 3.2. Optimize File Reading/Writing

*   **Rule:** For very large files (e.g., extensive project context, large generated outputs), consider using Node.js Streams instead of reading/writing the entire file content into memory at once.
*   **Rationale:** Reduces memory footprint and can improve performance for large data by processing chunks as they become available.
*   **Note:** Evaluate if file sizes in typical use cases warrant the added complexity of streams. For moderate file sizes, `fs.promises.readFile/writeFile` is often sufficient and simpler.

### 3.3. Be Mindful of Network Latency (Langchain)

*   **Rule:** Minimize the number of network requests to LLM APIs. Batch requests where possible (if the API supports it) or restructure logic to achieve the desired outcome with fewer calls.
*   **Rationale:** Network latency is often a significant performance bottleneck. Each round trip adds delay.
*   **Example (`src/core/llm/llm-agent.ts` or `src/generators/rules-generator.ts`):** Instead of asking the LLM multiple small questions sequentially, design prompts that elicit a more comprehensive response in a single call.

## 4. CPU-Intensive Operations

### 4.1. Optimize Loops and Iterations

*   **Rule:** Ensure loops are efficient. Avoid unnecessary work inside loops that run many times. Cache results of computations that are constant within the loop. Use appropriate iteration methods (`for...of` for arrays, `for...in` with `hasOwnProperty` check for objects where appropriate, or `Object.entries/keys/values`).
*   **Rationale:** Inefficient loops in critical sections (e.g., parsing analysis results, processing templates) can significantly impact performance.
*   **Example (`src/core/analysis/response-parser.ts`):**
    ```typescript
    // Assume 'items' can be large
    function processItems(items: SomeType[]): ProcessedItem[] {
      const results: ProcessedItem[] = [];
      // Good: Direct iteration if index isn't needed
      for (const item of items) {
        // Avoid complex calculations here if they can be done once outside the loop
        const processed = performComplexProcessing(item); // Ensure this function is optimized
        results.push(processed);
      }
      return results;

      // Less Ideal (potentially): Using map might create intermediate arrays
      // return items.map(item => performComplexProcessing(item)); // Profile if performance critical

      // Bad: Unnecessary work inside loop
      for (let i = 0; i < items.length; i++) {
          const threshold = calculateThreshold(); // Bad if threshold is constant
          if (items[i].value > threshold) {
              // ...
          }
      }
    }
    ```

### 4.2. Efficient String Manipulation

*   **Rule:** Be mindful of string concatenation performance, especially in loops. Use template literals or array `join('')` for building large strings from multiple parts. Avoid repeated concatenation with `+` inside tight loops.
*   **Rationale:** Repeated string concatenation with `+` can be inefficient in JavaScript due to immutable strings.
*   **Example (`src/generators/rules/rules-prompt-builder.ts`):**
    ```typescript
    // Good: Template literal
    function buildPrompt(context: string, rules: string[]): string {
      return `
        Context: ${context}

        Existing Rules:
        ${rules.map(rule => `- ${rule}`).join('\n')}

        Generate new rules based on the context.
      `;
    }

    // Less Ideal (for many parts): Array join
    function buildLargeStringFromArray(parts: string[]): string {
        return parts.join('');
    }

    // Bad (in loops): Repeated concatenation
    function buildStringInefficiently(parts: string[]): string {
        let result = "";
        for (const part of parts) {
            result += part; // Inefficient for large number of parts
        }
        return result;
    }
    ```

### 4.3. Optimize Regular Expressions

*   **Rule:** Write efficient regular expressions. Avoid catastrophic backtracking. Test and benchmark complex regex patterns. Compile regexes outside loops if they are used repeatedly.
*   **Rationale:** Poorly written regexes can consume excessive CPU time.
*   **Example (`src/core/analysis/response-parser.ts`):**
    ```typescript
    // Good: Compile regex once if used repeatedly
    const CODE_BLOCK_REGEX = /```(\w+)?\n([\s\S]*?)```/g;

    function extractCodeBlocks(text: string): string[] {
      const blocks: string[] = [];
      let match;
      // Reset lastIndex if using a global regex instance multiple times outside a loop
      // CODE_BLOCK_REGEX.lastIndex = 0;
      while ((match = CODE_BLOCK_REGEX.exec(text)) !== null) {
        blocks.push(match[2]); // Capture group 2 contains the code
      }
      return blocks;
    }
    ```

## 5. Memory Management

### 5.1. Avoid Unnecessary Memory Allocation

*   **Rule:** Avoid creating large objects or arrays unnecessarily, especially within loops or frequently called functions. Reuse objects or data structures where feasible.
*   **Rationale:** High memory churn puts pressure on the garbage collector, which can pause execution and impact performance.
*   **Example:** Instead of creating new configuration objects repeatedly, load them once and pass references (using DI helps here).

### 5.2. Release References

*   **Rule:** Ensure objects that are no longer needed are eligible for garbage collection by removing references to them (e.g., setting variables to `null`, removing elements from long-lived collections).
*   **Rationale:** Prevents memory leaks, especially in potentially long-running generation processes or if the tool evolves to have persistent state.
*   **Note:** This is less critical in short-lived CLI scripts but good practice nonetheless. Be particularly careful with caches or global state.

### 5.3. Use Appropriate Data Structures

*   **Rule:** Choose data structures appropriate for the task. Use `Map` for key-value lookups where keys are non-strings or performance is critical. Use `Set` for efficient checking of unique value existence.
*   **Rationale:** Using the right data structure leads to more efficient algorithms (e.g., O(1) average time complexity for Map/Set lookups vs. O(n) for array searches).
*   **Example (`src/core/di/container.ts` or analysis components):**
    ```typescript
    // Good: Fast lookups
    const serviceRegistry = new Map<string | symbol, Registration>();

    // Good: Fast existence checks
    const processedFiles = new Set<string>();
    if (!processedFiles.has(filePath)) {
        // process file
        processedFiles.add(filePath);
    }
    ```

## 6. Framework and Library Specifics

### 6.1. Langchain Optimization

*   **Rule:** Leverage Langchain features designed for performance and cost-efficiency.
    *   **Streaming:** Use LLM streaming (`llm.stream()`) where applicable to provide faster feedback to the user, even if the total generation time is similar. This improves *perceived* performance.
    *   **Caching:** Implement caching for LLM calls if the same prompts are likely to be generated repeatedly with identical context (e.g., using an in-memory cache or a more persistent one like Redis if needed). Be cautious about cache invalidation.
    *   **Prompt Optimization:** Minimize token count in prompts sent to LLMs. This reduces both latency and cost. Be concise but clear. Analyze context (`src/memory-bank/project-context-service.ts`) to include only relevant information.
    *   **Model Selection:** Choose LLM models appropriate for the task's complexity and performance requirements. Faster/cheaper models might suffice for simpler tasks.
    *   **Batching:** If dealing with many small, independent LLM tasks, investigate if the chosen Langchain provider integration supports batching requests.
*   **Example (`src/core/llm/llm-agent.ts` - Conceptual Streaming):**
    ```typescript
    async generateContentStream(prompt: string, onChunk: (chunk: string) => void): Promise<Result<void, Error>> {
        try {
            const stream = await this.llmProvider.getActiveModel().stream(prompt);
            for await (const chunk of stream) {
                // Assuming chunk has a 'content' property or similar based on Langchain version/model
                const content = chunk?.content ?? '';
                if (typeof content === 'string') {
                   onChunk(content);
                }
            }
            return Result.ok(undefined);
        } catch (error) {
            this.logger.error(`LLM streaming failed: ${error}`);
            return Result.err(error instanceof Error ? error : new Error('LLM streaming failed'));
        }
    }
    ```

### 6.2. Dependency Injection (`src/core/di`)

*   **Rule:** Prefer `singleton` scope for stateless services (most services like `FileOperations`, `ConfigService`, `LLMAgent` unless it holds per-request state). Use `transient` scope only when necessary for stateful instances.
*   **Rationale:** Avoids the overhead of repeatedly creating service instances and their dependencies. The custom DI container should be efficient in resolving dependencies, but minimizing resolution frequency helps, especially at startup.
*   **Example (`src/core/di/registrations.ts`):**
    ```typescript
    container.register(TYPES.FileOperations, { useClass: FileOperations }, { scope: 'singleton' });
    container.register(TYPES.LoggerService, { useClass: LoggerService }, { scope: 'singleton' });
    // Only use 'transient' if a new instance is needed per resolution
    // container.register(TYPES.RequestSpecificHandler, { useClass: Handler }, { scope: 'transient' });
    ```

### 6.3. Commander.js / Inquirer.js

*   **Rule:** Avoid performing slow (blocking or long async) operations directly within argument parsing logic (Commander.js) or complex prompt validation/choice generation (Inquirer.js) unless absolutely necessary and clearly indicated to the user (e.g., with a spinner from `ora`).
*   **Rationale:** Keeps the CLI interface responsive.

## 7. Measurement and Tooling

### 7.1. Use Profiling Tools

*   **Rule:** Regularly use Node.js built-in profiler or external tools to identify performance bottlenecks when needed.
    *   `node --prof ./dist/bin/roocode-generator.js [args]` -> Generates an isolate log file.
    *   `node --prof-process [isolate-log-file]` -> Processes the log file.
    *   `node --inspect ./dist/bin/roocode-generator.js [args]` -> Use Chrome DevTools for profiling (CPU and Memory).
*   **Rationale:** Provides concrete data on where time is spent and where memory is allocated, guiding optimization efforts effectively.

### 7.2. Use Benchmarking Tools

*   **Rule:** For critical performance-sensitive functions or algorithms, write micro-benchmarks (e.g., using simple `console.time`/`console.timeEnd` or libraries like `benchmark.js` integrated perhaps via Jest tests).
*   **Rationale:** Allows comparison of different implementation approaches and prevents performance regressions over time.
*   **Example (Simple timing):**
    ```typescript
    console.time('analyzeProjectStructure');
    const analysisResult = await projectAnalyzer.analyze(projectPath);
    console.timeEnd('analyzeProjectStructure');

    if (analysisResult.isErr()) {
      // handle error
    } else {
      this.logger.info(`Project analysis took ${/* retrieve time from somewhere or log within timeEnd */}`);
    }
    ```

### 7.3. Monitor External API Performance

*   **Rule:** Log the duration of external API calls, especially to LLMs. Monitor average response times and identify potential issues with the provider or network.
*   **Rationale:** External services are common bottlenecks; monitoring helps understand their impact.
*   **Example (`src/core/llm/llm-provider.ts`):**
    ```typescript
    async invokeModel(prompt: string): Promise<Result<string, Error>> {
        const startTime = performance.now();
        try {
            // Assuming Langchain's invoke returns the full response string
            const response = await this.activeModel.invoke(prompt);
            const duration = performance.now() - startTime;
            this.logger.debug(`LLM call completed in ${duration.toFixed(2)}ms`);
            // Ensure response is string or handle appropriately
            const content = typeof response === 'string' ? response : response?.content; // Adjust based on actual return type
             if (typeof content !== 'string') {
               return Result.err(new Error('Invalid LLM response format'));
            }
            return Result.ok(content);
        } catch (error) {
             const duration = performance.now() - startTime;
             this.logger.error(`LLM call failed after ${duration.toFixed(2)}ms: ${error}`);
            return Result.err(error instanceof Error ? error : new Error('LLM invocation failed'));
        }
    }
    ```

## 8. Build & Runtime Environment

### 8.1. TypeScript Compilation Target

*   **Rule:** Ensure the `target` in `tsconfig.json` is set to a reasonably modern ECMAScript version (e.g., `ES2020` or later) supported by the target Node.js environments.
*   **Rationale:** Newer JS versions often include performance optimizations that V8 can leverage better than transpiled older versions. Avoid unnecessarily down-leveling modern syntax if your target Node version supports it.

### 8.2. Keep Dependencies Updated

*   **Rule:** Regularly update dependencies (`npm update`), including Langchain, Node.js runtime, and TypeScript.
*   **Rationale:** Library authors often include performance improvements and bug fixes in newer versions.

By adhering to these performance rules and standards, the `roocode-generator` project can maintain responsiveness and efficiency, especially when dealing with file system operations, complex analysis, and interactions with external LLM services. Remember that profiling is key to directing optimization efforts effectively.
```