# MCP Servers Guide

## What is MCP?

Model Context Protocol (MCP) is an open standard that enables AI models to interact with external tools and services through a unified interface. MCP follows a client-server architecture where AI assistants (clients) can discover and use tools provided by MCP servers to perform tasks like file operations, API calls, and data access.

## MCP in VS Code

MCP enhances GitHub Copilot's agent mode by allowing connection to MCP-compatible servers to extend AI assistant capabilities.

### Configuration

1. **Workspace Configuration**: Create `.vscode/mcp.json` to share with collaborators
2. **User Settings**: Configure in VS Code settings to enable across all workspaces
3. **Auto-discovery**: VS Code can detect MCP servers defined in other tools

### Example Configuration

```json
{
  "inputs": [
    {
      "type": "promptString",
      "id": "api-key",
      "description": "API Key",
      "password": true
    }
  ],
  "servers": {
    "MyServer": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-name"],
      "env": {
        "API_KEY": "${input:api-key}"
      }
    }
  }
}
```

### Using MCP Tools

1. Open Chat view and select Agent mode
2. Use the Tools button to view and select available tools
3. Enter prompts and tools will be invoked as needed
4. Confirm tool actions or set auto-approval preferences
5. Optionally edit tool parameters before execution

Find MCP servers in the [official repository](https://github.com/modelcontextprotocol/servers) or create your own using available SDKs.


**Rule:** Always use tools from the defined MCP servers whenever possible.**