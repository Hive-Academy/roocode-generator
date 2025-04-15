// generators/llm-provider.js
// LLM provider selection and API key management for RooCode Generator

const fs = require("fs");
const path = require("path");

class LLMProvider {
  constructor(options = {}) {
    this.isTesting = process.env.NODE_ENV === "test" || options.testing;
    this.config = this.loadLLMConfig();
  }

  loadLLMConfig() {
    try {
      const configPath = path.join(process.cwd(), "llm.config.json");
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        return {
          provider: config.provider || process.env.LLM_PROVIDER || "openai",
          apiKey: config.apiKey || process.env.OPENAI_API_KEY || "",
          model: config.model || process.env.LLM_MODEL || "gpt-3.5-turbo",
        };
      }
    } catch (error) {
      console.warn("Error loading LLM config:", error);
    }
    return {
      provider: process.env.LLM_PROVIDER || "openai",
      apiKey: process.env.OPENAI_API_KEY || "",
      model: process.env.LLM_MODEL || "gpt-3.5-turbo",
    };
  }

  async getCompletion(systemPrompt, userPrompt) {
    if (this.isTesting) {
      return JSON.stringify({
        name: "test-project",
        description: "A test project",
        workflow: "trunk-based",
        architecture: "CLI with LangChain integration",
        testing: "Jest (planned)",
        projectPatterns: "Command pattern, Factory pattern for LLM providers",
        dependencies: {
          runtime: [
            "langchain",
            "@langchain/openai",
            "@langchain/anthropic",
            "@langchain/google-genai",
          ],
          development: ["eslint", "prettier", "husky", "semantic-release"],
        },
        folderStructure: "bin/ (CLI), generators/ (core), templates/ (content)",
      });
    }

    const { ChatOpenAI } = require("@langchain/openai");
    const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
    const { ChatAnthropic } = require("@langchain/anthropic");

    let llm;
    if (this.config.provider === "openai") {
      llm = new ChatOpenAI({
        modelName: this.config.model,
        temperature: 0.2,
        openAIApiKey: this.config.apiKey,
      });
    } else if (this.config.provider === "google-genai") {
      llm = new ChatGoogleGenerativeAI({
        model: this.config.model,
        apiKey: this.config.apiKey,
      });
    } else if (this.config.provider === "anthropic") {
      llm = new ChatAnthropic({
        model: this.config.model,
        apiKey: this.config.apiKey,
      });
    } else {
      throw new Error(`Unsupported LLM provider: ${this.config.provider}`);
    }

    try {
      console.log(`[LLM] Using ${this.config.provider} with model ${this.config.model}`);
      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ];
      const response = await llm.invoke(messages);

      // Enhanced response processing
      let content = response.content;

      // Extract structured data if present
      try {
        if (typeof content === "string") {
          // Look for JSON blocks in markdown
          const jsonMatch =
            content.match(/```json\n([\s\S]*?)\n```/) ||
            content.match(/```\n([\s\S]*?)\n```/) ||
            content.match(/\{[\s\S]*\}/);

          if (jsonMatch) {
            const parsedJson = JSON.parse(jsonMatch[1] || jsonMatch[0]);
            // Add any additional analysis sections found in the response
            const additionalAnalysis = content.replace(jsonMatch[0], "").trim();
            if (additionalAnalysis) {
              parsedJson.additionalAnalysis = additionalAnalysis;
            }
            content = parsedJson;
          }
        }
      } catch (parseError) {
        console.warn("[LLM] Could not parse structured data from response:", parseError.message);
      }

      return content;
    } catch (error) {
      console.error("[LLM Error] Provider:", this.config.provider);
      console.error("[LLM Error] Model:", this.config.model);
      console.error("[LLM Error] Message:", error.message);
      if (error.response) {
        console.error("[LLM Error] Response:", error.response.data);
      }
      throw error;
    }
  }
}

function loadLLMConfig() {
  const provider = new LLMProvider();
  return provider.config;
}

module.exports = {
  LLMProvider,
  loadLLMConfig,
};
