#!/usr/bin/env node
// bin/roocode-llm-config.js
// Interactive CLI for setting LLM provider and API key

const readline = require("readline");
const { saveLLMConfig } = require("../generators/llm-provider");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const providers = [
  { name: "OpenAI (gpt-3.5-turbo, gpt-4)", value: "openai", defaultModel: "gpt-3.5-turbo" },
  {
    name: "Google Gemini (via @langchain/google-genai)",
    value: "google-genai",
    defaultModel: "gemini-2.0-flash-001",
  },
  {
    name: "Anthropic (Claude, via @langchain/anthropic)",
    value: "anthropic",
    defaultModel: "claude-3-5-sonnet-20241022",
  },
];

console.log("RooCode LLM Provider Configuration");
console.log("==================================");
console.log("Select your preferred LLM provider:");
providers.forEach((p, i) => {
  console.log(`${i + 1}. ${p.name}`);
});

rl.question("Enter provider number (1-3): ", (providerIdx) => {
  const idx = parseInt(providerIdx, 10) - 1;
  if (idx < 0 || idx >= providers.length) {
    console.log("Invalid selection. Exiting.");
    rl.close();
    return;
  }
  const provider = providers[idx].value;
  const defaultModel = providers[idx].defaultModel;
  rl.question(`Enter your API key for ${providers[idx].name}: `, (apiKey) => {
    if (!apiKey.trim()) {
      console.log("API key is required. Exiting.");
      rl.close();
      return;
    }
    rl.question(
      `Enter model name for ${providers[idx].name} (default: ${defaultModel}): `,
      (model) => {
        const modelName = model.trim() || defaultModel;
        saveLLMConfig(provider, apiKey.trim(), modelName);
        rl.close();
      }
    );
  });
});
