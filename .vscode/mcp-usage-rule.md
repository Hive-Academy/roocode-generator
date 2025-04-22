# MCP Servers Guide

## What is MCP?

Model Context Protocol (MCP) is an open standard that enables AI models to interact with external tools and services through a unified interface. MCP follows a client-server architecture where AI assistants (clients) can discover and use tools provided by MCP servers to perform tasks like file operations, API calls, and data access.

## MCP in VS Code

MCP enhances GitHub Copilot's agent mode by allowing connection to MCP-compatible servers to extend AI assistant capabilities.

---

## Table of Contents

1. [Overview of MCP and Its Role in VS Code](#overview-of-mcp-and-its-role-in-vs-code)
2. [Configuration of MCP Servers](#configuration-of-mcp-servers)
   - Workspace vs. User Settings
   - Editing Configuration Files
3. [Transport Mechanisms](#transport-mechanisms)
   - STDIO Transport
   - SSE Transport
4. [Server Management and Operational Controls](#server-management-and-operational-controls)
5. [Platform-Specific Configurations](#platform-specific-configurations)
   - Windows
   - macOS and Linux
6. [Runtime Version Manager Integration](#runtime-version-manager-integration)
   - mise Configuration
   - asdf Configuration
7. [Troubleshooting and Best Practices](#troubleshooting-and-best-practices)
8. [Insights and Recommendations](#insights-and-recommendations)
9. [References](#references)

---

## Overview of MCP and Its Role in VS Code

MCP servers are a key part of extending Copilot's agent mode. The protocol introduces a client-server model where VS Code (the client) communicates with external servers (MCP servers) to obtain specialized functions and tools.

- **Extended Capability**: Enables Copilot to leverage external tools such as databases, custom APIs, or automation services beyond its built-in features.
- **Interoperability**: Uses a standard protocol (MCP) to ensure consistent integration with various external systems.
- **Dynamic Tool Availability**: Once configured, MCP servers expose available tools directly in the Copilot Chat interface. This allows users to seamlessly integrate tool execution within their workflow.

---

## Configuration of MCP Servers

### Workspace vs. User Settings

- **Workspace Configuration**:
  - Create `.vscode/mcp.json` to share with collaborators.
  - Takes precedence over user settings for the workspace.
- **User Settings**:
  - Configure in VS Code settings to enable across all workspaces.
  - Useful for personal or global server setups.
- **Auto-discovery**: VS Code can detect MCP servers defined in other tools if `chat.mcp.discovery.enabled` is set.

### Editing Configuration Files

- Use the MCP Settings View or edit `.vscode/mcp.json` directly.
- Each server configuration includes parameters such as `type`, `command`, `args`, `env`, and `inputs`.

**Example Configuration:**

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

---

## Transport Mechanisms

### STDIO Transport

- Used for local servers running on your machine
- Lower latency, better security, simpler setup
- Communicates via standard input/output streams

### SSE Transport

- Used for remote servers (HTTP/HTTPS)
- Supports multiple client connections
- Requires network access and care with security credentials

---

## Server Management and Operational Controls

- Use the Command Palette: `MCP: List Servers` to view, start, stop, or restart servers
- View server logs for troubleshooting
- Set network timeouts and auto-approval for specific tools

---

## Platform-Specific Configurations

### Windows Configuration

- Use `cmd` and `/c` to run commands
- Example:

```json
{
  "servers": {
    "puppeteer": {
      "type": "stdio",
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-puppeteer"]
    }
  }
}
```

### macOS and Linux Configuration

- Directly use `npx` or other executables
- Example:

```json
{
  "servers": {
    "puppeteer": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-puppeteer"]
    }
  }
}
```

---

## Runtime Version Manager Integration

### mise Configuration

```json
{
  "servers": {
    "mcp-batchit": {
      "type": "stdio",
      "command": "mise",
      "args": ["x", "--", "node", "/Users/myself/workspace/mcp-batchit/build/index.js"]
    }
  }
}
```

### asdf Configuration

```json
{
  "servers": {
    "appsignal": {
      "type": "stdio",
      "command": "/Users/myself/.asdf/installs/nodejs/22.2.0/bin/node",
      "args": ["/Users/myself/Code/Personal/my-mcp/build/index.js"],
      "env": {
        "ASDF_NODE_VERSION": "22.2.0"
      }
    }
  }
}
```

---

## Troubleshooting and Best Practices

- **Server Not Responding**: Check process and network
- **Permission Errors**: Verify API keys and credentials
- **Tool Not Available**: Ensure the server implements the tool and it’s enabled
- **Slow Performance**: Adjust network timeouts
- **Best Practices**:
  - Use version control for project-specific MCP configurations
  - Regularly review and test configurations
  - Use logging and monitoring for server health
  - Avoid hardcoding secrets; use environment variables or input prompts

---

## Insights and Recommendations

- Use workspace settings for collaboration, user settings for personal/global servers
- Choose STDIO for local/secure, SSE for remote/scalable
- Integrate with version managers for consistent environments
- Engage with the community for server configs and support

---

## References

- [VS Code Docs: MCP Servers](https://code.visualstudio.com/progress-tracker/copilot/chat/mcp-servers)
- [Model Context Protocol Spec](https://github.com/modelcontextprotocol/spec)
- [Official MCP Server Repository](https://github.com/modelcontextprotocol/servers)


**Rule:** Always use tools from the defined MCP servers whenever possible.**