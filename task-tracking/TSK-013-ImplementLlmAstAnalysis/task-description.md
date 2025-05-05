---
taskId: TSK-013
taskName: Implement LLM Analysis of AST Data
status: Pending
priority: High (User Defined)
assignedTo: architect
dependencies: [TSK-008]
creationDate: 2025-05-05
completionDate: null
tags: [enhancement, llm, project-analysis, ast]
---

# Task Description: Implement LLM Analysis of AST Data

## 1. Overview

This task involves enhancing the `ProjectAnalyzer` component to leverage Large Language Models (LLMs) for analyzing the generic Abstract Syntax Tree (AST) JSON data (`astData`) generated during project analysis (as implemented in TSK-008). The goal is to extract structured insights about code elements (functions, classes, imports) directly from the `astData` and integrate these insights into the `ProjectContext` object. This will provide richer context for downstream generators like `AiMagicGenerator`.

This task builds directly upon the `astData` structure created in TSK-008.

## 2. Full Research Report: LLM Analysis of Generic JSON AST (`astData`)

_(Incorporated directly as requested)_

### Executive Summary

This report details research findings on leveraging Large Language Models (LLMs) like GPT-4, Claude 3, and Gemini to analyze a pre-generated generic JSON Abstract Syntax Tree (AST) structure, referred to as `astData`. The goal is to extract structured code insights (functions, classes, dependencies) directly from this JSON representation within the `roocode-generator` project, enhancing the `ProjectAnalyzer` without requiring the LLM to re-parse raw code.

Key findings indicate that while LLMs are capable of analyzing JSON structures, careful strategies are needed, especially for potentially large `astData` files. Context window limitations necessitate techniques like **chunking** (processing parts of the AST) or **summarization/filtering** (selecting relevant nodes), although modern LLMs with large context windows (128k-1M+ tokens) might handle moderately sized file ASTs directly. **Prompt engineering** is critical; prompts must clearly define the task, specify the desired structured JSON output format (ideally with a schema), and include few-shot examples demonstrating the mapping from `astData` snippets to the target insight structure.

For performance, **batching** multiple analysis requests (e.g., per file) and **parallel processing** are recommended. Integrating this analysis into `ProjectAnalyzer` could involve a dedicated method or service. While standard LLM SDKs (like Langchain) are primary tools, **streaming JSON parsers** (`stream-json` npm package) could be useful for pre-processing extremely large `astData` files if needed, though might be overkill if chunking strategies within the LLM interaction are sufficient. The LLM output should be structured JSON, easily mergeable into the existing `ProjectContext`.

### Research Methodology

- **Research focus**: Strategies, techniques, and patterns for using LLMs (GPT-4, Claude 3, Gemini via Langchain) to analyze a generic JSON AST (`astData`) to extract code insights (functions, classes, dependencies). Emphasis on processing the existing JSON, prompt design, integration, performance, and implementation patterns within a Node.js/TypeScript context.
- **Sources consulted**: Web search results focusing on LLM context window management, JSON processing with LLMs, prompt engineering for structured data extraction, performance optimization (batching/parallelism), and Node.js JSON stream processing libraries. Sources included technical blogs (Medium, DEV Community), documentation sites (Pinecone, Promptfoo), Q&A sites (Stack Overflow, Reddit), and vendor blogs (IBM, Databricks).
- **Tools used**: Brave Search MCP tool.
- **Date of research**: May 5, 2025.

### Key Findings

#### 1. Processing `astData` with LLMs

- **Context Window Limits**: While models like Claude 3 and Gemini 2.5 Pro boast large context windows (200k-1M+ tokens), very large or complex files/projects might still exceed these limits. The size of the serialized `astData` JSON string is the relevant metric.
- **Strategies for Large `astData`**:
  - **Direct Input (If Fits)**: For `astData` representing single files that fit within the context window, sending the entire JSON string is simplest.
  - **Chunking**: If `astData` is too large, break it down. Potential strategies:
    - _Top-Level Declaration Chunking_: Process the AST nodes corresponding to each top-level function, class, import, etc., separately. This requires identifying these nodes in the `astData`.
    - _Sub-Tree Chunking_: Divide the JSON AST into meaningful sub-trees. This is more complex as context (parent nodes, scope) might be lost if not handled carefully. Langchain's text splitters might be adaptable if the JSON is treated as a string, but structure-aware chunking is preferable.
    - _MapReduce Pattern_: Apply the analysis prompt to each chunk (Map) and then synthesize the results (Reduce). Langchain supports MapReduce chains.
  - **Summarization/Filtering (Pre-processing)**: Before sending to the LLM, programmatically traverse the `astData` to extract only relevant node types (e.g., `function_definition`, `class_definition`, `import_statement` nodes based on your generic AST structure) and their essential children, creating a smaller, focused JSON snippet. This requires understanding your specific `astData` schema.
- **LLM Optimization for JSON**: Some models/APIs offer specific modes or parameters to improve the likelihood of generating valid JSON (e.g., OpenAI's JSON mode, Anthropic's tool use/function calling). Leveraging these features via Langchain is recommended. Fine-tuning is an option for very high accuracy/specific needs but adds complexity.

#### 2. Prompt Engineering for Specific Insights from `astData`

- **Core Principles**:
  - **Task Definition**: Clearly state the goal: "Analyze the provided JSON AST (`astData`) and extract information about [e.g., function definitions, class structures, import dependencies]."
  - **Input Description**: Explain the input: "The input is a JSON object representing the Abstract Syntax Tree of a source code file. Key node types include 'program', 'function_definition', 'class_definition', 'identifier', 'parameter_list', etc." (Adjust based on your actual `astData` schema).
  - **Output Specification**: Define the desired output structure _explicitly_. Providing a JSON schema or a TypeScript interface definition in the prompt is highly effective.
  - **Few-Shot Examples**: Provide 1-3 examples showing a snippet of input `astData` and the corresponding desired output JSON snippet. This is crucial for guiding the LLM on how to map your specific AST structure to the desired insights.
  - **Instruction Placement**: Place instructions clearly, often at the beginning or end of the prompt. Use delimiters (like `### Instruction ###`) if needed.
- **Example Prompt Snippets (Conceptual - Adapt to your `astData` schema)**:

  ````prompt
  ### Instruction ###
  Analyze the provided JSON AST (`astData`) representing a source code file. Extract all function definitions and class definitions.
  The `astData` has nodes with a 'type' property (e.g., 'function_definition', 'class_definition', 'identifier', 'formal_parameters') and a 'children' array. Function/class names are typically found in 'identifier' nodes within the definition node. Parameters are in 'formal_parameters'.

  Return the results ONLY as a valid JSON object matching the following TypeScript interface:

  ```typescript
  interface AnalysisResult {
    functions: { name: string; parameters: string[] }[];
    classes: { name: string; methods: string[] }[]; // Assuming methods are also functions found within the class scope
  }
  ````

  ### Example Input (`astData` Snippet)

  ```json
  {
    "type": "program",
    "children": [
      {
        "type": "function_definition",
        "children": [
          { "type": "type_identifier", "text": "void" }, // Example: Assuming type info exists
          { "type": "identifier", "text": "myFunction" },
          {
            "type": "formal_parameters",
            "children": [
              {
                "type": "parameter_declaration",
                "children": [{ "type": "identifier", "text": "arg1" }]
              },
              {
                "type": "parameter_declaration",
                "children": [{ "type": "identifier", "text": "arg2" }]
              }
            ]
          },
          {
            "type": "block",
            "children": [
              /* ... function body nodes ... */
            ]
          }
        ]
      }
      // ... other nodes ...
    ]
  }
  ```

  ### Example Output (JSON)

  ```json
  {
    "functions": [{ "name": "myFunction", "parameters": ["arg1", "arg2"] }],
    "classes": []
  }
  ```

  ### Input `astData`

  ```json
  ${JSON.stringify(astData)}
  ```

  ### Output (JSON only)

  ```json

  ```

- **Dependency Mapping**: This is more complex via AST alone, especially for dynamic languages. Prompts would need to instruct the LLM to find `import_statement` nodes (for file dependencies) and `call_expression` nodes, trying to resolve the called function/method name. Accuracy might be limited without semantic analysis.
- **Output Validation**: Always validate the LLM's output to ensure it's valid JSON and conforms to the expected schema. Implement retry logic or error handling if validation fails. Langchain has output parsers that can help.

#### 3. Integrating Analysis Results into `ProjectContext`

- **Structured Output**: The LLM should output a well-defined JSON object containing arrays of identified elements (functions, classes, imports, variables, etc.), as shown in the prompt example. Use clear, descriptive keys.
- **Merging Strategy**:
  - Add a new property to `ProjectContext` (defined in `src/core/analysis/types.ts`), perhaps named `codeInsights` or `llmAnalysis`, typed according to the expected LLM output structure (e.g., the `AnalysisResult` interface from the prompt example).
  - After receiving and validating the JSON output from the LLM for a given file's `astData`, parse the JSON string and assign the resulting object to `projectContext.codeInsights[filePath]`.
  - Ensure the `ProjectContext` structure remains serializable if needed.

#### 4. Performance & Scalability with `astData`

- **Token Limits**: Monitor the token count of your serialized `astData` JSON. Use a tokenizer (like `tiktoken` for OpenAI models) to estimate size beforehand. If exceeding limits, apply chunking/filtering strategies (Finding 1).
- **Optimization Strategies**:
  - **Parallel Processing**: Analyze multiple `astData` structures (files) concurrently using `Promise.all` or similar asynchronous patterns in Node.js. This significantly speeds up project-wide analysis.
  - **Batching**: If your LLM provider API and Langchain integration support batch endpoints, send requests for multiple files/chunks in a single API call. This reduces network overhead and can leverage server-side optimizations (e.g., continuous batching). Check Langchain documentation for provider-specific batching support.
- **Cost**: Larger inputs/outputs consume more tokens, increasing cost. Efficient prompting and potentially pre-filtering `astData` can help manage costs.

#### 5. Implementation Patterns within `ProjectAnalyzer`

- **Integration Pattern**:
  - **Dedicated Method**: Add a new private async method to `ProjectAnalyzer`, e.g., `analyzeAstWithLlm(astData: YourAstJsonType): Promise<AnalysisResult>`. This method would construct the prompt, call the `LLMAgent`, parse/validate the response.
  - **Separate Service**: For more complex logic or better separation of concerns, create a new service (e.g., `AstAnalysisService`) injected into `ProjectAnalyzer`. This service would encapsulate the LLM interaction logic for AST analysis. This is likely cleaner.
  - The main `analyzeProject` or `analyzeFile` method in `ProjectAnalyzer` would first generate `astData` using Tree-sitter, then call this new method/service to perform the LLM analysis, and finally merge the results into the `ProjectContext`.
- **Relevant Libraries**:
  - **Langchain (and specific provider SDKs)**: Essential for interacting with LLMs, managing prompts, and potentially handling output parsing and chunking.
  - **`stream-json` (npm)**: A streaming JSON parser for Node.js. Use case: If you need to _pre-process_ extremely large `astData` JSON files _before_ sending them to the LLM (e.g., filtering nodes, extracting specific sub-trees) without loading the entire file into memory. May not be necessary if context windows are sufficient or if Langchain's chunking/MapReduce handles the size.
  - **`zod` or `io-ts` (npm)**: Useful for defining the expected LLM output schema and validating the received JSON at runtime.

### Technology/Pattern Analysis

#### LLM for AST Analysis

- **Overview**: Using general-purpose LLMs to query structured JSON AST data instead of raw code.
- **Strengths**: Leverages existing `astData`, potentially faster/cheaper than having LLM re-parse code, can extract complex relationships with sophisticated prompts.
- **Limitations**: Dependent on the quality/detail of `astData`, prompt engineering complexity, potential for LLM hallucination/errors, context window limits for large files, dependency analysis might be imprecise from AST alone.
- **Implementation Complexity**: Moderate. Requires careful prompt design, handling large inputs, output validation, and integration.
- **Architectural Compatibility**: Fits well by adding a distinct analysis step after AST generation, enriching the `ProjectContext`. Uses existing `LLMAgent`.
- **Example Implementation**: See prompt examples and integration pattern discussion above.

#### Chunking/MapReduce for Large Inputs

- **Overview**: Breaking large data (like `astData` JSON string) into smaller pieces, processing each, and combining results.
- **Strengths**: Overcomes context window limits, allows parallel processing of chunks.
- **Limitations**: Can lose context between chunks (especially for ASTs), adds complexity to processing and result synthesis, potentially increases token usage/cost due to overhead/repeated context.
- **Implementation Complexity**: Moderate to High, depending on the chunking strategy and synthesis logic. Langchain offers helpers.
- **Architectural Compatibility**: Compatible; can be implemented within the `AstAnalysisService` or using Langchain chains.

### Best Practices Identified

- **Explicit Prompting**: Clearly define the task, input structure (`astData` schema), and desired output JSON schema within the prompt.
- **Few-Shot Examples**: Include concrete examples of input `astData` snippets and corresponding output JSON in prompts.
- **Leverage Model Features**: Use provider-specific JSON modes or function calling/tool use features if available via Langchain.
- **Output Validation**: Always parse and validate the LLM's JSON output against a predefined schema (using libraries like `zod`). Implement retries/error handling.
- **Optimize for Scale**: Use parallel processing for multiple files and batching where supported by the LLM API.
- **Monitor Tokens**: Be aware of `astData` size relative to context window limits and implement chunking/filtering if necessary.
- **Iterative Development**: Start with simple extractions (e.g., function names) and gradually increase complexity. Test prompts thoroughly.

### Implementation Approaches

#### Approach 1: Direct LLM Call per File (Optimistic)

- **Overview**: Assumes most `astData` files fit context. `ProjectAnalyzer` generates `astData`, then calls `AstAnalysisService` which sends the full `astData` JSON string to the LLM with a detailed prompt.
- **Key components**: `ProjectAnalyzer`, `AstAnalysisService`, `LLMAgent`, Prompt Template, Output Validator (`zod`).
- **Architecture alignment**: Simple integration, leverages existing components.
- **Advantages**: Simplest approach if context windows suffice.
- **Challenges**: Fails for files with large `astData`. Requires robust error handling for LLM failures/invalid JSON.
- **Resource requirements**: LLM API access, careful prompt engineering.

#### Approach 2: Chunking/Filtering within Analysis Service

- **Overview**: `AstAnalysisService` checks `astData` size. If large, it either pre-filters the JSON to essential nodes OR chunks the `astData` (e.g., by top-level nodes) and uses a MapReduce approach via Langchain or custom logic to query the LLM for each chunk and combine results.
- **Key components**: Adds chunking/filtering logic or MapReduce chain configuration (potentially using `stream-json` for pre-filtering if memory is a concern).
- **Architecture alignment**: More complex but robust to large files.
- **Advantages**: Handles large files gracefully.
- **Challenges**: Increased complexity in chunking logic and result synthesis. Potential loss of cross-chunk context. Higher token usage possible.
- **Resource requirements**: More development effort for chunking/synthesis logic.

### Recent Developments

- **Increasing Context Windows**: Models like Gemini 2.5 Pro and Claude 3.7 continue to push context window sizes (1M+ tokens), making Approach 1 more feasible for a wider range of files.
- **Improved JSON Modes**: LLM providers are improving built-in support for constrained JSON output, increasing reliability.
- **Advanced RAG/Processing Techniques**: Techniques developed for processing long documents (like advanced chunking, summarization chains) might be adaptable for large ASTs.

### References

1.  **LLM JSON Output Techniques**:
    - https://medium.com/@dinber19/enhancing-json-output-with-large-language-models-a-comprehensive-guide-f1935aa724fb
    - https://mychen76.medium.com/practical-techniques-to-constraint-llm-output-in-json-format-e3e72396c670
    - https://stackoverflow.com/questions/77407632/how-can-i-get-llm-to-only-respond-in-json-strings
    - https://www.promptfoo.dev/docs/guides/evaluate-json/
2.  **Handling Large Contexts/Chunking**:
    - https://dev.to/rogiia/how-to-use-llms-summarize-long-documents-4ee1 (MapReduce concept)
    - https://www.pinecone.io/learn/chunking-strategies/ (General chunking)
    - https://mohdmus99.medium.com/strategies-and-techniques-for-managing-the-size-of-the-context-window-when-using-llm-large-3c2dbc5dcc3a
3.  **Performance/Scalability**:
    - https://www.anyscale.com/blog/continuous-batching-llm-inference (Batching)
    - https://www.databricks.com/blog/introducing-simple-fast-and-scalable-batch-llm-inference-mosaic-ai-model-serving (Batching)
4.  **Node.js JSON Streaming**:
    - https://www.npmjs.com/package/stream-json
    - https://www.npmjs.com/package/big-json

### Recommendations for Task Implementation

1.  **Start with Approach 1 (Direct LLM Call)**: Implement the simpler approach first. Add token counting for `astData`. Test with various file sizes. This establishes the baseline and may be sufficient for many files given large context windows.
2.  **Prioritize Robust Prompting**: Invest time in crafting detailed prompts including your specific `astData` structure details, explicit output schema (use TypeScript interfaces in the prompt), and few-shot examples.
3.  **Implement Output Validation**: Use `zod` or similar to strictly validate the LLM's JSON output against your defined schema. Handle parsing errors and schema mismatches gracefully (e.g., log errors, potentially retry).
4.  **Integrate as a Separate Service**: Create an `AstAnalysisService` for better separation of concerns, making it easier to add complexity (like chunking) later if needed.
5.  **Use Parallelism**: Implement `Promise.all` in `ProjectAnalyzer` to call the `AstAnalysisService` for multiple files concurrently.
6.  **Consider Batching**: Investigate and implement batching if supported by your primary LLM provider(s) via Langchain for further performance gains when analyzing many files.
7.  **Defer Complex Chunking**: Only implement Approach 2 (Chunking/Filtering) if Approach 1 proves insufficient due to context window limitations with real-world large `astData` files. If needed, start with top-level declaration chunking as it's likely simpler than arbitrary sub-tree chunking.

### Questions/Areas for Further Research

- **`astData` Schema Specifics**: The effectiveness of prompts heavily depends on the _exact_ structure and node types within your generic `astData`. Deeper analysis of this specific schema would allow for more precise prompt examples.
- **Langchain Provider Capabilities**: Detailed capabilities of specific Langchain integrations (OpenAI, Anthropic, Google GenAI) regarding JSON mode enforcement, batching support, and built-in chunking mechanisms suitable for JSON ASTs.
- **Cost/Performance Benchmarks**: Actual cost and latency benchmarks for analyzing typical `astData` sizes using different models and strategies (direct vs. chunked).

---

_(End of Research Report Section)_

## 3. Current Implementation Analysis

- `ProjectAnalyzer` (`src/core/analysis/project-analyzer.ts`) currently uses `TreeSitterParserService` to generate `astData` (a generic JSON AST) for each analyzed file and stores it in `ProjectContext`.
- It does _not_ currently perform any LLM-based analysis on this `astData`.
- `ProjectContext` (`src/core/analysis/types.ts`) contains `astData` but lacks fields for structured code insights derived from it.
- `LLMAgent` (`src/core/llm/llm-agent.ts`) provides the interface for LLM interaction.

## 4. Affected Files and Components

- **Create**: `src/core/analysis/ast-analysis.service.ts` (implements `IAstAnalysisService`)
- **Create**: `src/core/analysis/ast-analysis.interfaces.ts` (defines `IAstAnalysisService`, `CodeInsights`, `FunctionInfo`, `ClassInfo`, `ImportInfo` etc.)
- **Modify**: `src/core/analysis/project-analyzer.ts` (inject `IAstAnalysisService`, orchestrate analysis call, merge results)
- **Modify**: `src/core/analysis/types.ts` (update `ProjectContext` interface)
- **Modify**: `src/core/di/modules/core-module.ts` (or new `analysis-module.ts`) (register `AstAnalysisService`)
- **Use**: `src/core/llm/llm-agent.ts`
- **Use**: `src/core/result/result.ts`
- **Use**: `src/core/services/logger-service.ts` (via `ILogger`)

## 5. Detailed Requirements

1.  **Create `AstAnalysisService`**:
    - Implement a new service `AstAnalysisService` conforming to an `IAstAnalysisService` interface.
    - This service should encapsulate the logic for interacting with the LLM to analyze `astData`.
    - It should accept `astData` (type `GenericAstNode` from `src/core/analysis/types.ts`) as input.
    - It must construct a detailed prompt based on the research findings (Section 2), including:
      - Clear instructions for the LLM.
      - A description of the generic `astData` structure.
      - The target output JSON schema (defined via a TypeScript interface like `CodeInsights`).
      - At least one few-shot example mapping an `astData` snippet to the target `CodeInsights` structure.
    - It must use the injected `LLMAgent` to call the configured LLM.
    - It must validate the LLM response:
      - Check if it's valid JSON.
      - Validate the parsed JSON against the `CodeInsights` schema (recommend using `zod`).
    - On successful validation, it should return `Result.ok(parsedCodeInsights)`.
    - On any failure (LLM error, invalid JSON, schema mismatch), it should return `Result.err(new RooCodeError(...))` with a descriptive error.
    - Register this service for Dependency Injection.
2.  **Update `ProjectContext`**:
    - Define new interfaces in `src/core/analysis/ast-analysis.interfaces.ts` (or similar):
      - `CodeInsights`: Structure to hold arrays of functions, classes, imports, etc.
      - `FunctionInfo`: e.g., `{ name: string; parameters: string[]; /* potentially start/end line numbers */ }`
      - `ClassInfo`: e.g., `{ name: string; /* potentially methods, properties */ }`
      - `ImportInfo`: e.g., `{ source: string; /* potentially imported symbols */ }`
      - _(Define structure based on what's reasonably extractable from `astData` via LLM)_
    - Modify the `ProjectContext` interface in `src/core/analysis/types.ts` to include:
      - `codeInsights?: { [filePath: string]: CodeInsights };` (A map where keys are file paths and values are the extracted insights for that file).
3.  **Integrate into `ProjectAnalyzer`**:
    - Inject `IAstAnalysisService` into `ProjectAnalyzer`.
    - Modify the logic where files are analyzed (likely within a loop or map operation).
    - After successfully generating `astData` for a file:
      - Call `astAnalysisService.analyzeAst(astData)`.
      - Use `await Promise.all()` or similar to run these analysis calls concurrently for multiple files.
      - If the analysis returns `Result.ok(insights)`, add the `insights` to the `projectContext.codeInsights` map using the file path as the key.
      - If the analysis returns `Result.err(error)`, log a warning using `ILogger` (e.g., "Failed to analyze AST for file [path]: [error message]") and continue without adding insights for that file. Do not fail the entire analysis process for one file's AST analysis failure.
4.  **Targeted Insights**: The initial implementation should focus on reliably extracting:
    - Function definitions (name, parameters).
    - Class definitions (name).
    - Import statements (source/path).
    - _(Further insights like variable declarations or dependency mapping can be considered future enhancements)_.

## 6. Acceptance Criteria

1.  **[✅ AC1] New Service Created**: An `AstAnalysisService` implementing `IAstAnalysisService` exists in `src/core/analysis/` and is registered for DI.
2.  **[✅ AC2] `ProjectContext` Updated**: `ProjectContext` interface in `src/core/analysis/types.ts` includes `codeInsights` map and related interfaces (`CodeInsights`, `FunctionInfo`, `ClassInfo`, `ImportInfo`) are defined.
3.  **[✅ AC3] `ProjectAnalyzer` Integration**: `ProjectAnalyzer` injects `IAstAnalysisService`, calls `analyzeAst` for each file's `astData`, merges successful results into `projectContext.codeInsights`, and handles errors gracefully (logs warning, continues).
4.  **[✅ AC4] Concurrent Execution**: `ProjectAnalyzer` processes the `analyzeAst` calls for multiple files concurrently.
5.  **[✅ AC5] LLM Interaction**: `AstAnalysisService` uses `LLMAgent` to call the LLM with `astData` and a prompt.
6.  **[✅ AC6] Prompt Definition**: The prompt used includes task definition, `astData` description, explicit output JSON schema (matching `CodeInsights`), and at least one few-shot example, following research best practices.
7.  **[✅ AC7] Structured Output Extraction**: The implementation attempts to extract function names/params, class names, and import sources, requesting structured JSON output.
8.  **[✅ AC8] Output Validation**: `AstAnalysisService` validates the LLM response is valid JSON conforming to the `CodeInsights` schema (using `zod` or similar). Invalid responses result in an error `Result`.
9.  **[✅ AC9] Error Handling**: `Result` pattern is used for fallible operations in `AstAnalysisService` and handled correctly in `ProjectAnalyzer`.
10. **[✅ AC10] Basic Functionality**: Analyzing a simple TS file (`tests/fixtures/sample.ts` - _to be created if needed_) with 1 function, 1 class, 1 import results in a populated `projectContext.codeInsights` entry for that file containing the identified elements. (Verification: Log output or integration test).
11. **[✅ AC11] No New Config**: Feature uses existing LLM config; no new user config added.
12. **[✅ AC12] Code Documentation**: TSDoc comments added for new service, interfaces, and significant modifications.

## 7. Implementation Guidance

- **Follow Research**: Adhere closely to the recommendations in the embedded research report (Section 2).
- **Start Simple**: Implement "Approach 1: Direct LLM Call per File" first. Monitor `astData` size; implement chunking only if context limits are hit in practice.
- **Prompt Engineering**: Focus heavily on crafting a robust prompt for `AstAnalysisService`. Iterate as needed.
- **Validation**: Use `zod` for schema validation of the LLM response.
- **Concurrency**: Ensure `Promise.all` is used correctly for concurrency in `ProjectAnalyzer`.
- **Testing**: Write unit tests for `AstAnalysisService`, mocking `LLMAgent`. Consider an integration test for `ProjectAnalyzer`.
- **Awareness**: Remember the deferred unit test debt from TSK-008 related to `astData` generation itself. While not part of this task to fix, be aware it could impact the quality of the input to this feature.

## 8. Memory Bank References

- **Technical Architecture**: `ProjectAnalyzer` (Lines 129-133), `LLMAgent` (Line 106), Data Flow (Lines 191-213).
- **Developer Guide**: DI Pattern (Lines 297-334), `Result` Pattern (Lines 267-272), Logging (Line 273), Testing (Lines 335-360).
- **Project Overview**: `ProjectAnalyzer` role (Line 46).
