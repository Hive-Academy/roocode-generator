# Token Optimization and LLM Usage Guide for roocode-generator

This guide provides recommendations for optimizing the performance and resource usage of the `roocode-generator` CLI tool, with a strong focus on efficient interaction with Large Language Models (LLMs). Given that the tool leverages providers like OpenAI, Google Genai, and Anthropic via LangChain, managing token consumption and API interaction latency is crucial for both cost-effectiveness and user experience.

## Resource Usage Reference Table

The primary "resources" consumed by `roocode-generator` are related to LLM interactions and the configurations that drive them. Efficient management of these resources directly impacts performance and operational costs.

| Resource Type      | File / Location                       | Usage Guide & Optimization Strategy                                                                                                                                                                                                              |
| :----------------- | :------------------------------------ | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LLM API Calls      | External (OpenAI, Google, Anthropic)  | Minimize token count (input/output). Choose cost-effective models suitable for the task complexity. Structure prompts efficiently. Handle API rate limits and errors gracefully. Cache responses where feasible for repeated identical requests. |
| System Prompts     | Conceptual (within `generators/*`)    | Design clear, concise, and unambiguous instructions. Provide sufficient context without unnecessary verbosity. Tailor prompts specifically to the desired task and model capabilities.                                                           |
| User Prompts       | Interactive (Inquirer) / Config Files | Guide users towards providing specific and relevant information. Validate or preprocess user input before incorporating it into LLM prompts to avoid unnecessary tokens or ambiguity.                                                            |
| Templates          | `templates/*`                         | Keep output file templates concise and focused. Use placeholders effectively. Avoid generating overly verbose or redundant content by default.                                                                                                   |
| Memory Banks/Rules | User-defined / Generated Config Files | Structure configuration data (e.g., JSON, YAML) for efficient parsing. When used as context for LLMs, ensure the data is relevant and minimally verbose. Avoid storing large, unstructured, or redundant information.                            |
| Project Files      | User's Project Directory              | Implement efficient file reading and parsing. For large files or projects, consider strategies like summarization, chunking, or relevance filtering _before_ sending content to the LLM to reduce input token count.                             |

## Performance Metrics

Performance for `roocode-generator` is measured not just by CLI execution speed but significantly by the efficiency and cost of LLM interactions.

### Memory Management

- **Node.js:** Follow standard Node.js best practices for memory management (e.g., avoid memory leaks, manage large data structures efficiently).
- **File Processing:** Be mindful of memory usage when reading and processing large project files for analysis, especially before potentially summarizing or chunking them for LLM input.
- **LangChain Memory:** If using LangChain's memory modules (e.g., `BufferMemory`, `VectorStoreRetrieverMemory`), understand their token consumption patterns. Summarization buffers or vector stores can grow, impacting subsequent LLM call costs. Choose memory strategies appropriate for the task's context length requirements.

### Resource Management

- **API Keys:** Securely manage LLM API keys using environment variables or dedicated secrets management solutions. Do not hardcode keys in the source code.
- **API Interaction:** Implement robust error handling for LLM API calls, including retries with backoff strategies for transient network issues or rate limits. Log API errors effectively for debugging.
- **File System I/O:** Use asynchronous file system operations (`fs.promises`) for non-blocking reads (project analysis) and writes (generating files from templates).

### LLM Interaction Optimization

This is the most critical area for performance and cost optimization:

- **Prompt Engineering:**
  - **Clarity & Specificity:** Write clear, direct, and unambiguous prompts. Clearly define the task, the desired output format, and any constraints.
  - **Context:** Provide necessary context, but be concise. Avoid sending irrelevant information from the project or configuration.
  - **Token Count:** Be mindful of both input prompt tokens and maximum completion tokens. Use tokenizers (e.g., `tiktoken` for OpenAI models) to estimate prompt size before sending.
  - **Few-Shot Examples:** For complex tasks, providing a few high-quality examples within the prompt (few-shot learning) can often yield better results than lengthy instructions, potentially saving tokens.
- **Model Selection:**
  - Choose the most appropriate LLM model for the specific task within each generator module. Simpler tasks (e.g., basic file identification) might use faster, cheaper models (like GPT-3.5-Turbo, Gemini Flash, or Claude Haiku), while complex analysis or generation might require more capable models (like GPT-4o, Gemini Pro, or Claude Opus/Sonnet). Balance capability, cost, and latency.
- **Input Data Reduction:**
  - Analyze only relevant project files. Use `.gitignore` or explicit include/exclude patterns.
  - For large code files, consider sending only relevant sections, summaries, or abstract representations (e.g., function signatures, class definitions) instead of the full source. LangChain's Document Transformers can assist here.
- **Output Control:**
  - Specify `max_tokens` (or equivalent parameter) in API calls to limit the length of the generated response and control costs.
- **Caching:**
  - Implement caching for LLM responses if the same prompts (based on identical project state or inputs) are likely to be generated repeatedly during a session or across runs. Use the prompt content or a hash of it as the cache key.

## Mode-Specific Guidelines

### Standard Mode (Default Generation)

- Optimize the default prompts used for project analysis and configuration suggestions to provide a good balance between useful insights and token efficiency.
- Ensure the standard flow doesn't unnecessarily analyze excessively large files or directories by default.
- Consider if the standard analysis can offer different levels of depth (e.g., a "quick scan" vs. "deep analysis") with corresponding token usage differences.

### Custom Modes (Using Memory Banks, Rules, Custom Prompts)

- Guide users on creating token-efficient custom memory banks and rules. Very large or verbose configurations included in prompts will significantly increase costs.
- When allowing custom system prompts, advise users on the principles of effective and concise prompt engineering mentioned above.
- Validate user-provided configurations to prevent malformed data from causing issues or excessive token usage during LLM interaction.

## Best Practices

- **Precise Prompt Engineering:** Invest time in crafting and refining prompts for each LLM interaction point.
- **Smart Model Selection:** Don't default to the most powerful model for every task. Match the model to the need.
- **Token Awareness:** Regularly estimate or measure token usage for different operations. Understand the pricing models of the LLM providers being used.
- **Input Minimization:** Actively reduce the amount of data sent to LLMs through filtering, summarization, or abstraction.
- **Leverage LangChain:** Utilize LangChain's abstractions effectively (Chains, Agents, Document Loaders/Transformers, Caching) as they often incorporate performance best practices.
- **Asynchronous Operations:** Ensure all I/O (network, file system) is handled asynchronously (`async/await`).
- **Robust Error Handling:** Implement retries and fallbacks for API calls.
- **Secure Configuration:** Manage API keys and sensitive configuration securely.

## Monitoring and Optimization

### Monitoring Strategy

- **Logging:** Implement detailed logging for LLM interactions:
  - Timestamp
  - LLM Provider & Model used
  - Input Prompt (or a truncated/hashed version for brevity/privacy)
  - Input Token Count
  - Output Completion (or a truncated/hashed version)
  - Output Token Count
  - API Call Latency
  - Success/Error Status & Error details
- **Cost Tracking:** Utilize the dashboards provided by LLM providers (OpenAI, Google Cloud, Anthropic) to monitor API usage and associated costs. Correlate dashboard data with internal logs if possible.
- **CLI Performance:** Log execution times for major stages of the CLI tool (e.g., project scanning, LLM analysis, file generation).

### Optimization Approach

- **Iterative Refinement:** Regularly review logs to identify the most frequent, most expensive, or slowest LLM calls. Iteratively refine the prompts, model selection, or input data for these calls.
- **Experimentation:** A/B test different prompt variations, models, or parameters (like `temperature`) to find optimal balances of cost, quality, and speed.
- **Caching Implementation:** Identify opportunities for caching LLM responses based on monitoring data showing repeated identical requests.
- **Review LangChain Usage:** Periodically review how LangChain components (chains, agents, memory) are used to ensure they are configured efficiently for the specific tasks.

## Version Information

- **Last Updated**: [Date]
- **Version**: [Current Version]
- **Status**: [Status - e.g., Draft, Active, Deprecated]
