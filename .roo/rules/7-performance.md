---
title: Performance
version: 1.0.0
lastUpdated: 2025-04-23T18:21:09.277Z
sectionId: 7
applicableLanguages: [TypeScript, JavaScript]
relatedSections: []
---

## Performance Rules

### Asynchronous Operations

- **Prefer `async/await`:** Use native `async/await` for clarity and better error handling over manual Promise chaining or callbacks.
- **Parallelize Independent Tasks:** Use `Promise.all` or `Promise.allSettled` for concurrent execution of independent async operations (e.g., multiple file reads, non-dependent LLM calls).

  ```typescript
  // Avoid sequential awaits for independent tasks
  // const data1 = await readFile('file1.txt');
  // const data2 = await readFile('file2.txt');

  // Prefer parallel execution
  const [data1, data2] = await Promise.all([readFile("file1.txt"), readFile("file2.txt")]);
  ```

- **Avoid `await` in Loops (if independent):** Collect promises in an array and use `Promise.all` after the loop for better concurrency.

  ```typescript
  const promises = files.map((file) => processFile(file)); // processFile is async
  const results = await Promise.all(promises);
  ```

- **Use Async I/O:** Always use asynchronous methods for file system (`fs.promises`) and network operations to prevent blocking the event loop.

### Langchain & LLM Interaction (`llm/`)

- **Utilize Streaming:** Employ LLM streaming (`.stream()`) methods where possible to provide faster initial feedback and reduce perceived latency, especially for user-facing generation.
- **Optimize Prompt Size:** Minimize context sent to LLMs. Load only necessary data (`memory-bank/project-context-service.ts`). Avoid sending excessively large files or irrelevant history.
- **Batch Requests (If Applicable):** If the LLM provider API supports batching and the use case allows, batch multiple requests to reduce network overhead.
- **Select Appropriate Models:** Choose LLMs based on the required balance between capability and latency/cost. Not all tasks require the largest models.
- **Implement Caching:** Cache LLM responses for identical prompts when feasible, especially for deterministic generation or during testing, to reduce redundant API calls.

### Data Handling & Processing (`analysis/`, `generators/`)

- **Use Efficient Data Structures:** Prefer `Map` and `Set` for frequent lookups over `Array.prototype.find` or `includes` within loops.
- **Optimize Loops:**
  - Minimize work inside loops. Avoid repeated computations or I/O operations.
  - Cache array lengths (`for (let i = 0, len = arr.length; i < len; i++)`).
- **Avoid Large Object Copies:** Be mindful when cloning large objects or arrays; use references where possible or perform selective copying.
- **Efficient String Operations:** Prefer template literals or `Array.prototype.join` over repeated string concatenation (`+`) in loops.

### File Operations (`file-operations/`)

- **Use Streams for Large Files:** For files potentially larger than available memory, use Node.js streams (`fs.createReadStream`, `fs.createWriteStream`) instead of reading/writing the entire content at once (`fs.readFile`, `fs.writeFile`).
- **Minimize I/O Calls:** Aggregate file reads/writes where practical. Avoid numerous small, sequential I/O operations.
- **Cache Frequent Reads:** Cache content of frequently read, rarely changing files (e.g., templates, configs) in memory if size permits.

### Dependency Injection (`di/`)

- **Favor Singleton Scope:** Use `@singleton` scope for services by default unless instance-specific state is required. This minimizes instantiation overhead.
- **Lazy Initialization (If Needed):** For expensive-to-initialize singletons not always needed, consider patterns for lazy initialization upon first use.

### General

- **Profile Bottlenecks:** Use Node.js profiling tools (`node --prof`, Chrome DevTools for Node) to identify actual performance hotspots before optimizing.
- **Monitor Memory Usage:** Be aware of potential memory leaks, especially with long-running processes, caching, or large data structures. Use heap snapshots if necessary.
