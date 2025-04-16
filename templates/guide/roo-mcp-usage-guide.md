# MCP Servers Guide

## What is MCP?

Model Context Protocol (MCP) is an open standard that enables AI models to interact with external tools and services through a unified interface. MCP follows a client-server architecture where AI assistants (clients) can discover and use tools provided by MCP servers to perform tasks like file operations, API calls, and data access.

## MCP in Roo Code

MCP extends Roo Code's capabilities by connecting to external tools and services. Servers can be configured at global or project level.

### Configuration

1. **Global Configuration**: Edit via `mcp_settings.json` (accessible from Roo settings)
2. **Project Configuration**: Add `.roo/mcp.json` in project root (takes precedence)

### Transport Types

- **STDIO Transport**: For local servers (lower latency, better security)
  ```json
  {
    "mcpServers": {
      "local-server": {
        "command": "node",
        "args": ["server.js"],
        "env": { "API_KEY": "your_api_key" }
      }
    }
  }
  ```
- **SSE Transport**: For remote servers (HTTP/HTTPS)
  ```json
  {
    "mcpServers": {
      "remote-server": {
        "url": "https://your-server-url.com/mcp",
        "headers": { "Authorization": "Bearer your-token" }
      }
    }
  }
  ```

### Managing Servers

- Enable/disable MCP servers globally from Roo settings
- Restart, delete, or toggle individual servers
- Set network timeouts (30 seconds to 5 minutes)
- Configure auto-approval for specific tools
