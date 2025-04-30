# Task Description: Fix Project Analyzer JSON Parsing Error

**Task ID:** TSK-005
**Task Name:** fix-project-analyzer-json-error
**Status:** In Progress
**Dependencies:** None

## 1. Task Overview

Address a recurring `JSON parsing failed: SyntaxError` error occurring during the project analysis phase within the `AiMagicGenerator`. This error prevents the application from successfully analyzing the project structure and dependencies, halting the generation process. The root cause is believed to be the LLM returning truncated or malformed JSON when processing large codebases, likely due to context window limitations.

## 2. Current Implementation Analysis

The `ProjectAnalyzer` (`src/core/analysis/project-analyzer.ts`) collects project files and concatenates their contents into a single string. This string, along with a detailed system prompt, is sent to the configured LLM (`google/gemini-2.5-flash-preview`) via the `LLMAgent` to generate a JSON representation of the project's tech stack, structure, and dependencies. The `ResponseParser` (`src/core/analysis/response-parser.ts`) attempts to clean and parse the LLM's text response into a JSON object. The error occurs during this parsing step when the LLM's output is not valid JSON.

The current approach of sending the entire codebase content at once is susceptible to exceeding the LLM's effective context window for larger projects, leading to incomplete or malformed JSON output.

Affected files:

- `src/core/analysis/project-analyzer.ts`
- `src/core/analysis/response-parser.ts`
- Potentially `src/core/llm/llm-agent.ts` or LLM configuration if a different model is considered.

## 3. Detailed Requirements

- Investigate and confirm the root cause of the JSON parsing error.
- Implement a robust solution to ensure reliable project analysis even for large codebases.
- The solution should prevent or gracefully handle LLM output truncation/malformation.
- Maintain the accuracy and completeness of the generated project context JSON as much as possible.
- Ensure the fix is integrated into the existing `ProjectAnalyzer` workflow.

## 4. Acceptance Criteria Checklist

- [ ] The `analyzeProject` method in `ProjectAnalyzer` completes successfully without JSON parsing errors for the current project codebase.
- [ ] The generated `ProjectContext` object contains accurate information about the project's tech stack, structure, and dependencies.
- [ ] The solution effectively handles projects of varying sizes, mitigating issues related to LLM context windows.
- [ ] Unit tests are updated or added to cover the changes in `ProjectAnalyzer` and potentially `ResponseParser`.
- [ ] The fix is documented in the Developer Guide if it introduces new patterns or significant changes to the analysis process.

## 5. Implementation Guidance

The Architect should investigate the root cause by:

1.  Measuring the token count of the combined system prompt and file contents sent to the LLM.
2.  Testing the analysis with a smaller subset of project files.
3.  Attempting to log the raw LLM response before parsing to check for truncation.

Based on the confirmed cause, consider the following solution approaches:

- **Prioritize Input:** Modify `collectProjectFiles` to prioritize key files and limit the total input size.
- **Refine Prompt:** Simplify the LLM prompt to reduce the complexity of the required JSON output.
- **Implement Chunking:** Split the codebase into chunks for iterative analysis and result aggregation (more complex).
- **Robust Parsing/Correction:** Enhance `ResponseParser` to attempt minor corrections or use a feedback loop with the LLM (risky).
- **Alternative Model:** Evaluate if a different LLM model is better suited for this task.

The chosen solution should be implemented within `ProjectAnalyzer` and potentially involve changes to `ResponseParser` or `LLMAgent`.

## 6. File and Component References

- `src/core/analysis/project-analyzer.ts` (Primary focus)
- `src/core/analysis/response-parser.ts` (Potential modifications for robustness)
- `src/core/llm/llm-agent.ts` (Potential changes for model selection or interaction)
- `src/core/analysis/constants.ts` (If file filtering logic is adjusted)
- LLM configuration files (If a different model is used)
