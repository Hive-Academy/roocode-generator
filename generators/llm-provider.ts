import { ChatAnthropic } from "@langchain/anthropic";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import * as fs from "fs";
import * as path from "path";

export interface MemoryFiles {
  ProjectOverview: string;
  DeveloperGuide: string;
  DevelopmentStatus: string;
  TechnicalArchitecture: string;
}

interface MCPServerConfig {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  disabled?: boolean;
  alwaysAllow?: string[];
}

export class LLMProvider {
  config: any;
  constructor() {
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

  async getCompletion(systemPrompt: string, userPrompt: string) {
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
      } catch (parseError: any) {
        console.warn("[LLM] Could not parse structured data from response:", parseError.message);
      }

      return content;
    } catch (error: any) {
      console.error("[LLM Error] Provider:", this.config.provider);
      console.error("[LLM Error] Model:", this.config.model);
      console.error("[LLM Error] Message:", error.message);
      if (error.response) {
        console.error("[LLM Error] Response:", error.response.data);
      }
      throw error;
    }
  }

  private findMcpJsonFiles(baseDir: string): string[] {
    const candidates = [
      path.join(baseDir, ".vscode", "mcp.json"),
      path.join(baseDir, ".roo", "mcp.json"),
      path.join(baseDir, "mcp.json"),
    ];
    return candidates.filter(fs.existsSync);
  }

  private extractMcpServers(filePath: string): Record<string, MCPServerConfig> {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return data.mcpServers || {};
    } catch (e) {
      return {};
    }
  }

  private generateMcpServersBinding(projectConfig: Record<string, any>): string {
    const baseDir = projectConfig.baseDir || process.cwd();
    let output = [];

    // 1. Add MCP Overview
    output.push("# Model Context Protocol (MCP) Configuration\n");
    output.push(
      "MCP enables AI models to interact with external tools and services through a unified interface, following a client-server architecture where AI assistants can discover and use tools provided by MCP servers.\n"
    );

    // 2. Transport Information
    output.push("## Transport Mechanisms");
    output.push(
      "- STDIO Transport: Used for local servers, provides lower latency and better security"
    );
    output.push("- SSE Transport: Used for remote servers, supports multiple client connections\n");

    // 3. Scan and format configured servers
    const mcpFiles = this.findMcpJsonFiles(baseDir);
    const mcpServers: Record<string, MCPServerConfig> = {};

    for (const file of mcpFiles) {
      const servers = this.extractMcpServers(file);
      Object.assign(mcpServers, servers);
    }

    output.push("## Configured Servers");
    const activeServers = Object.entries(mcpServers).filter(([, config]) => !config.disabled);

    if (activeServers.length === 0) {
      output.push(
        "No MCP servers are currently configured. To add servers, create a configuration in either:"
      );
      output.push("- .roo/mcp.json (project-specific)");
      output.push("- .vscode/mcp.json (workspace-specific)");
      output.push("- mcp.json (root level)\n");
    } else {
      activeServers.forEach(([name, config]) => {
        output.push(`### ${name}`);
        if (config.url) {
          output.push(`Type: Remote SSE Server`);
          output.push(`URL: ${config.url}`);
          if (config.headers) {
            output.push(`Authentication: Required (via headers)`);
          }
        } else {
          output.push(`Type: Local STDIO Server`);
          output.push(`Command: ${config.command} ${(config.args || []).join(" ")}`);
          if (config.env) {
            output.push(`Environment Variables: Configured`);
          }
        }
        if (config.alwaysAllow && config.alwaysAllow.length > 0) {
          output.push(`Auto-approved Tools: ${config.alwaysAllow.join(", ")}`);
        }
        output.push(""); // Empty line for spacing
      });
    }

    // 4. Add Best Practices
    output.push("## Best Practices");
    output.push("- Use STDIO transport for local/secure operations");
    output.push("- Use SSE transport for remote/scalable operations");
    output.push("- Store secrets in environment variables");
    output.push("- Version control project-specific configurations");
    output.push("- Regular testing and monitoring of server health");
    output.push("- Use appropriate timeout settings for network operations\n");

    // 5. Add Platform-Specific Guidelines
    output.push("## Platform-Specific Configuration");
    output.push("### Windows");
    output.push("Use cmd and /c for command execution:");
    output.push('Example: { command: \'cmd\', args: ["/c", "npx", "-y", "server"] }\n');
    output.push("### Unix (macOS/Linux)");
    output.push("Direct executable usage:");
    output.push('Example: { command: \'npx\', args: ["-y", "server"] }\n');

    // 6. Add Runtime Manager Integration
    output.push("## Runtime Version Management");
    output.push("- mise configuration supported");
    output.push("- asdf configuration supported");
    output.push("- Ensures consistent runtime environments\n");

    // 7. Add Troubleshooting Tips
    output.push("## Quick Troubleshooting");
    output.push("- Server not responding → Check process and network");
    output.push("- Permission errors → Verify API keys and credentials");
    output.push("- Tool unavailable → Verify server implementation");
    output.push("- Performance issues → Check network timeouts");

    return output.join("\n");
  }

  async analyzeAndMapBindings(
    projectConfig: Record<string, any>,
    memoryFiles: MemoryFiles,
    requiredBindings: string[]
  ): Promise<Record<string, any>> {
    // Special handling for mcpServers binding
    const mcpServersBinding = this.generateMcpServersBinding(projectConfig);

    const systemPrompt = `You are an expert system tasked with analyzing project documentation and configuration to intelligently map template bindings.
Your role is to understand the context deeply and extract or generate appropriate values for each required binding.
Consider:
- The relationships between different pieces of information
- The project's overall architecture and patterns
- Development standards and best practices
- Task management and workflow processes
- Technical constraints and dependencies

Analyze the provided memory files and project configuration holistically to generate meaningful, contextually-appropriate values for each binding.`;

    const userPrompt = `Based on the following project context, analyze and generate appropriate values for the required template bindings.

Project Configuration:
${JSON.stringify(projectConfig, null, 2)}

Memory Files:
${Object.entries(memoryFiles)
  .map(([name, content]) => `=== ${name} ===\n${content}\n`)
  .join("\n")}

MCP Servers Configuration:
${mcpServersBinding}

Required Bindings:
${requiredBindings.join("\n")}

Instructions:
1. Analyze the provided context holistically
2. For each required binding:
   - Extract relevant information from the memory files and project config
   - Consider the relationships between different pieces of information
   - Generate contextually appropriate values
   - Ensure consistency with project standards and patterns
3. Return a single JSON object with:
   - Keys: The required binding names
   - Values: The extracted or generated values
   - Additional context where relevant

For the mcpServers binding, use the provided MCP Servers Configuration.
Return only a valid JSON object containing the mapped bindings.`;

    try {
      const response = await this.getCompletion(systemPrompt, userPrompt);
      if (typeof response === "object") {
        // Ensure mcpServers is always set from our scanning
        return {
          ...response,
          mcpServers: mcpServersBinding,
        };
      }
      throw new Error("LLM response was not in the expected JSON format");
    } catch (error) {
      console.error("[LLM Binding Analysis Error]:", error);
      // Even if analysis fails, return at least the mcpServers binding
      return { mcpServers: mcpServersBinding };
    }
  }
}

export function saveConfigToFile(config: Record<string, any>) {
  const configPath = path.join(config.baseDir, "llm.config.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`Configuration saved to ${configPath}`);
}

export function loadLLMConfig() {
  const provider = new LLMProvider();
  return provider.config;
}
