# Research Report: Robust LLM Response Handling & Google GenAI API Interaction

## Executive Summary

This report details research findings on handling malformed JSON from LLMs, managing Google GenAI API errors (specifically for `gemini-2.5-flash-preview-04-17`), and determining model token limits. For JSON repair in TypeScript/Node.js, `jsonrepair` offers a simple and robust solution for common syntax errors, while `@solvers-hub/llm-json` adds schema validation, and `llm-json-parser` handles severely broken JSON using a schema. Google GenAI API errors generally follow standard HTTP codes (4xx/5xx), requiring standard retry logic (exponential backoff for 429, 500, 503). The observed HTML error during token counting is likely _not_ a standard API error but suggests issues with authentication, proxies, incorrect URLs, or SDK problems; direct investigation and logging are needed. Model token limits can be retrieved programmatically via the `getModels` REST endpoint or corresponding SDK methods, which is the most reliable way to get the context window size for `gemini-2.5-flash-preview-04-17` (likely 1M tokens, but confirmation via API is recommended).

## Research Methodology

- **Research focus:** Robust JSON parsing, Google GenAI API error handling (including non-standard HTML errors and `countTokens`), and retrieving token limits for `gemini-2.5-flash-preview-04-17`.
- **Sources consulted:** Official Google Cloud/AI documentation, npm package documentation, GitHub repositories/issues, technical blogs, search engine results.
- **Tools used:** Brave Search, Firecrawl Web Scraper.
- **Date of research:** 2025-05-06

## Key Findings

### 1. Robust JSON Repair/Parsing Techniques (TypeScript/Node.js)

LLMs often return JSON with syntax errors (missing quotes/commas/brackets, trailing commas, comments, extraneous text). Several libraries can help:

- **`jsonrepair`** ([npm](https://www.npmjs.com/package/jsonrepair), [GitHub](https://github.com/josdejong/jsonrepair)):

  - **Functionality:** Fixes common JSON errors like missing quotes, commas, brackets, trailing commas, comments, Python constants (`None`, `True`, `False`), special quotes, etc. Can also handle newline-delimited JSON and concatenate strings.
  - **Features:** Built-in TypeScript types, streaming API support, CLI tool.
  - **Trade-offs:** Simple, focused on syntax repair. Doesn't handle structural issues beyond basic repairs or validate against a schema. Widely used (290k+ weekly downloads).
  - **Recommendation:** Good default choice for fixing common LLM JSON syntax errors due to its simplicity, robustness, and TS support.

- **`@solvers-hub/llm-json`** ([Article](https://v-nitish.medium.com/introducing-llm-json-a-robust-sdk-for-extracting-and-validating-json-from-llm-outputs-2fc734a9d0d6), [GitHub](https://github.com/solvers-hub/llm-json)):

  - **Functionality:** Extracts JSON from text (including Markdown blocks), attempts correction of common errors (similar to `jsonrepair`), and validates extracted JSON against provided JSON schemas.
  - **Features:** TypeScript support, separates text from JSON, handles multiple JSON objects in one output, schema validation.
  - **Trade-offs:** Combines extraction, repair, and validation. Might be slightly more complex than `jsonrepair` if only repair is needed. Newer/less widely adopted.
  - **Recommendation:** Suitable if you need to extract JSON from mixed text _and_ validate it against a schema in addition to basic repairs.

- **`llm-json-parser`** ([GitHub](https://github.com/divinciest/llm-json-parser)):
  - **Functionality:** Designed to parse and reconstruct _severely_ broken JSON using a predefined schema. Uses heuristics to infer structure and types. Can handle misplaced data (hallucinations).
  - **Features:** TypeScript library, returns multiple possible results with confidence scores, schema-guided reconstruction.
  - **Trade-offs:** Powerful for extreme cases but requires a schema. Likely more complex than the others. Very new/low adoption.
  - **Recommendation:** Consider only if `jsonrepair` or `llm-json` prove insufficient for highly malformed or structurally ambiguous LLM outputs, and a reliable schema is available.

**General Approach:**

1.  Attempt standard `JSON.parse()`.
2.  If it fails, pass the string to a repair library (like `jsonrepair`).
3.  Attempt `JSON.parse()` on the repaired string.
4.  Implement robust error handling around this process.

```typescript
import { jsonrepair } from 'jsonrepair';

function parseLlmJson<T>(llmOutput: string): T | null {
  try {
    // Try standard parsing first
    return JSON.parse(llmOutput) as T;
  } catch (e1) {
    console.warn('Standard JSON parsing failed, attempting repair...');
    try {
      const repairedJson = jsonrepair(llmOutput);
      // Try parsing the repaired string
      return JSON.parse(repairedJson) as T;
    } catch (e2) {
      console.error('JSON repair and parsing failed:', e2);
      // Log the original and repaired strings for debugging
      console.error('Original:', llmOutput);
      // Consider logging repairedJson if needed, might be large
      return null; // Or throw a custom error
    }
  }
}

// Example Usage:
const potentiallyMalformed = '{ name: "Test", value: 123, } // trailing comma';
const parsed = parseLlmJson<{ name: string; value: number }>(potentiallyMalformed);

if (parsed) {
  console.log('Successfully parsed:', parsed);
} else {
  console.log('Failed to parse JSON.');
}
```

### 2. Google GenAI API Error Handling

- **Standard Errors:** The API generally uses standard Google Cloud API errors ([Docs](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/api-errors)). Key codes include:
  - `400 INVALID_ARGUMENT`: Bad request (e.g., token limit exceeded, invalid params). Check request format and size.
  - `403 PERMISSION_DENIED`: Auth/permissions issue. Verify API key/service account permissions.
  - `429 RESOURCE_EXHAUSTED`: Rate limit/quota exceeded or server overload. Implement exponential backoff and retry (max 2-3 retries recommended by Google).
  - `500 INTERNAL`/`UNKNOWN`: Server-side error. Implement exponential backoff and retry.
  - `503 UNAVAILABLE`: Service temporarily down. Implement exponential backoff and retry.
- **`countTokens` Endpoint:** The documentation for `countTokens` ([Docs](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/count-tokens)) shows it uses the standard API structure and should return standard errors or a `{ "totalTokens": N }` JSON response.
- **HTML `<!DOCTYPE ...>` Error:** This specific error is **not documented** as a standard API response for `countTokens` or other GenAI endpoints. It strongly suggests an issue _outside_ the core API logic:
  - **Authentication Failure:** The request might be hitting an authentication gateway or proxy that returns an HTML login/error page instead of forwarding to the API. Verify API keys/auth tokens are valid _at the time of the call_.
  - **Incorrect URL/Endpoint:** The SDK or configuration might be pointing to the wrong URL (e.g., a web console URL instead of the API endpoint `...googleapis.com/...:countTokens`). Double-check the endpoint used by the SDK.
  - **Network Proxy/Firewall:** An intermediary network device could be intercepting the request and returning an HTML block page.
  - **SDK Bug:** Less likely, but possible issue within `@langchain/google-genai` or `@google/genai` when handling `countTokens` requests/responses.
- **Handling Strategy:**
  - Implement retries with exponential backoff for `429`, `500`, `503`.
  - Catch `400` errors, log details, and potentially adjust input size if related to token limits.
  - Specifically check for non-JSON responses (like checking if the response string starts with `<!DOCTYPE` or `<html`). Treat this as a critical configuration/authentication/network error.
  - Log the _full_ HTML response when this error occurs for debugging.
  - Attempt a direct REST call to `countTokens` using `curl` or `fetch` with the same credentials/input to isolate the issue (SDK vs. environment).

```typescript
async function safeCountTokens(
  model: GenerativeModel,
  request: CountTokensRequest
): Promise<number | null> {
  try {
    const response = await model.countTokens(request);
    return response.totalTokens;
  } catch (error: any) {
    console.error(`Error counting tokens: ${error.message}`);

    // Check for specific Google API error structure if available (depends on SDK)
    if (error.details && error.code) {
      console.error(`Google API Error Code: ${error.code}, Details: ${error.details}`);
      // Handle specific codes like 429, 500, 503 with retries (not shown here)
    }

    // Check if the raw response might be HTML (example check)
    // This part depends heavily on how the SDK surfaces raw error responses
    const rawResponse = error.response?.data || error.message; // Adjust based on actual error structure
    if (
      typeof rawResponse === 'string' &&
      rawResponse.trim().toLowerCase().startsWith('<!doctype')
    ) {
      console.error('Received non-JSON (HTML?) response during token count. Check auth/URL/proxy.');
      console.error('Raw Response Snippet:', rawResponse.substring(0, 500)); // Log snippet
    }

    return null; // Indicate failure
  }
}
```

### 3. Retrieving Google GenAI Model Token Limits

- **Method:** The official way to get model limits is via the `getModels` endpoint (REST API) or the corresponding SDK method.
  - **REST:** `GET https://generativelanguage.googleapis.com/v1/models/{model_name}` (Replace `{model_name}` with `gemini-2.5-flash-preview-04-17` or `models/gemini-2.5-flash-preview-04-17`). The Vertex AI endpoint might differ slightly.
  - **SDK:** Use the equivalent of `client.models.get(model="models/gemini-2.5-flash-preview-04-17")`. The response object contains `input_token_limit` and `output_token_limit`. ([Docs showing method](https://ai.google.dev/gemini-api/docs/tokens?lang=python#context-windows)).
- **`gemini-2.5-flash-preview-04-17` Limit:** Documentation and blogs suggest Gemini 2.5 models (including Flash) have a **1 million token context window** (input limit). However, preview models can change. **Using the API/SDK `getModels` method is the most reliable way to confirm the current limit.**
- **Fallback:** If programmatic retrieval fails or isn't implemented:
  1.  Consult the latest official Google AI model documentation or release notes for `gemini-2.5-flash-preview-04-17`.
  2.  Use a known safe, potentially conservative value (though 1M is the likely target for 2.5 Flash).
  3.  Rely on catching `400 INVALID_ARGUMENT` errors as an indicator of exceeding the limit.

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai'; // Assuming use of official SDK

async function getModelLimits(
  apiKey: string,
  modelName: string
): Promise<{ input: number; output: number } | null> {
  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // Note: The exact method might differ slightly in the Node SDK.
    // Check SDK documentation for the equivalent of Python's `client.models.get()`
    // It might be part of the GenerativeModel instance or the top-level client.
    // This is a conceptual example:
    const modelInfo = await genAI.getGenerativeModel({ model: modelName }).getModel(); // Hypothetical method

    if (modelInfo && modelInfo.inputTokenLimit && modelInfo.outputTokenLimit) {
      console.log(
        `Token limits for ${modelName}: Input=${modelInfo.inputTokenLimit}, Output=${modelInfo.outputTokenLimit}`
      );
      return {
        input: modelInfo.inputTokenLimit,
        output: modelInfo.outputTokenLimit,
      };
    } else {
      console.warn(`Could not retrieve token limits for ${modelName} via API.`);
      return null;
    }
  } catch (error: any) {
    console.error(`Failed to get model info for ${modelName}: ${error.message}`);
    return null;
  }
}

// Example Usage:
// const limits = await getModelLimits(process.env.GEMINI_API_KEY!, 'gemini-2.5-flash-preview-04-17');
// const inputLimit = limits?.input ?? 1000000; // Fallback to 1M if API fails
```

## Recommendations for Task Implementation (TSK-017)

1.  **JSON Handling:**
    - Integrate the `jsonrepair` library into `project-analyzer.ts` (or a utility function).
    - Wrap `JSON.parse()` calls that handle LLM output in a try-catch block.
    - In the catch block, attempt repair using `jsonrepair` and then re-parse.
    - Log errors clearly if both standard parsing and repair fail.
2.  **Google GenAI Error Handling (`google-genai-provider.ts`):**
    - Implement retry logic with exponential backoff specifically for `429`, `500`, `503` errors when calling `generateContent` and `countTokens`.
    - Add specific error handling for the `countTokens` call to detect non-JSON responses (e.g., `responseString.trim().startsWith('<!DOCTYPE')`). Log the full HTML response and treat this as a critical failure (likely auth/config/network).
    - Ensure `400 INVALID_ARGUMENT` errors are caught and logged, potentially indicating token limit issues.
    - Verify the `countTokens` endpoint URL being used by the SDK. Consider a direct `fetch` test if the HTML error persists.
3.  **Token Limits:**
    - Ideally, implement a function (perhaps in `llm-config.service.ts` or the provider) to call the `getModels` API/SDK method on startup or periodically to fetch the `input_token_limit` for the configured model (`gemini-2.5-flash-preview-04-17`).
    - Store this limit and use it in `project-analyzer.ts` to validate input size _before_ calling `countTokens` or `generateContent`.
    - Provide a sensible default/fallback value (e.g., 1,000,000) in case the API call fails.

## References

1.  **jsonrepair (npm):** [https://www.npmjs.com/package/jsonrepair](https://www.npmjs.com/package/jsonrepair)
2.  **@solvers-hub/llm-json (Article):** [https://v-nitish.medium.com/introducing-llm-json-a-robust-sdk-for-extracting-and-validating-json-from-llm-outputs-2fc734a9d0d6](https://v-nitish.medium.com/introducing-llm-json-a-robust-sdk-for-extracting-and-validating-json-from-llm-outputs-2fc734a9d0d6)
3.  **llm-json-parser (GitHub):** [https://github.com/divinciest/llm-json-parser](https://github.com/divinciest/llm-json-parser)
4.  **Google Cloud GenAI API Errors:** [https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/api-errors](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/api-errors)
5.  **Google Cloud CountTokens API:** [https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/count-tokens](https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/count-tokens)
6.  **Google AI Token Counting Docs:** [https://ai.google.dev/gemini-api/docs/tokens](https://ai.google.dev/gemini-api/docs/tokens)
7.  **Google GenAI JS SDK Issue #82 (Error Handling):** [https://github.com/google-gemini/generative-ai-js/issues/82](https://github.com/google-gemini/generative-ai-js/issues/82)
8.  **Gemini 2.5 Flash Blog Post:** [https://developers.googleblog.com/en/start-building-with-gemini-25-flash/](https://developers.googleblog.com/en/start-building-with-gemini-25-flash/)

This research report provides a comprehensive analysis of JSON repair techniques, Google GenAI API error handling patterns, and methods for determining model token limits relevant to the task requirements.
