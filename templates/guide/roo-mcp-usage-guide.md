# MCP Servers Guide

## Introduction

Model Context Protocol (MCP) is an open standard that enables AI models to interact with external tools and services through a unified interface. MCP follows a client-server architecture where AI assistants (clients) can discover and use tools provided by MCP servers to perform tasks like file operations, API calls, and data access.

---

## Table of Contents

1. [Overview of MCP and Its Role in Roo Code](#overview-of-mcp-and-its-role-in-roo-code)
2. [Configuration of MCP Servers](#configuration-of-mcp-servers)
   - Global vs. Project-level Settings
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

## Overview of MCP and Its Role in Roo Code

MCP servers serve as an integral component of Roo Code’s extended functionality. The protocol introduces a client-server model where the client interface (Roo Code) communicates with external servers (MCP servers) to obtain specialized functions and tools.

- **Extended Capability**: Enables Roo Code to leverage external tools such as databases, custom APIs, or automation services beyond its built-in features.
- **Interoperability**: Uses a standard protocol (MCP) to ensure consistent integration with various external systems.
- **Dynamic Tool Availability**: Once configured, MCP servers expose available tools directly in the Roo Code interface. This allows users to seamlessly integrate tool execution within their workflow.

This architecture allows for reduced token consumption by migrating resource-intensive tasks to dedicated servers, as well as enhanced security by isolating sensitive operations.

---

## Configuration of MCP Servers

MCP servers can be configured at two levels:

### Global vs. Project-level Settings

- **Global Configuration**:
  - Stored in the `mcp_settings.json` file.
  - Accessible via VS Code settings.
  - Applies universally across all workspaces.
- **Project-level Configuration**:
  - Defined in the `.roo/mcp.json` file at the project root.
  - Enables server configurations specific to individual projects.
  - Takes precedence over global configurations if conflicts occur.

### Editing Configuration Files

- Access the MCP Settings View in Roo Code to edit global or project-level settings.
- Both configuration files follow a JSON structure with a primary key `"mcpServers"`.
- Each server configuration includes parameters such as `command`, `args`, `env`, `alwaysAllow`, and `disabled`.

**Example STDIO Server (local):**

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

**Example SSE Server (remote):**

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

---

## Transport Mechanisms

MCP servers utilize two distinct transport protocols to communicate with Roo Code:

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

- Enable/disable, restart, or delete servers from Roo settings
- Set network timeouts and auto-approval for specific tools
- Use version managers (e.g., asdf, mise) for runtime flexibility

---

## Platform-Specific Configurations

### Windows Configuration

- Use `cmd` and `/c` to run commands
- Example:

```json
{
  "mcpServers": {
    "puppeteer": {
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
  "mcpServers": {
    "puppeteer": {
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
  "mcpServers": {
    "mcp-batchit": {
      "command": "mise",
      "args": ["x", "--", "node", "/Users/myself/workspace/mcp-batchit/build/index.js"],
      "disabled": false,
      "alwaysAllow": ["search", "batch_execute"]
    }
  }
}
```

### asdf Configuration

```json
{
  "mcpServers": {
    "appsignal": {
      "command": "/Users/myself/.asdf/installs/nodejs/22.2.0/bin/node",
      "args": ["/Users/myself/Code/Personal/my-mcp/build/index.js"],
      "env": {
        "ASDF_NODE_VERSION": "22.2.0"
      },
      "disabled": false,
      "alwaysAllow": []
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

- Use global settings for baseline, project-level for customization
- Choose STDIO for local/secure, SSE for remote/scalable
- Integrate with version managers for consistent environments
- Engage with the community for server configs and support

---

## References

- [Roo Code MCP Overview](https://docs.roocode.com/features/mcp/overview)
- [Using MCP in Roo Code](https://docs.roocode.com/features/mcp/using-mcp-in-roo)
- [STDIO & SSE Transports](https://docs.roocode.com/features/mcp/server-transports)
- [Runtime Version Manager Configuration](https://docs.roocode.com/features/mcp/using-mcp-in-roo#runtime-version-manager-configuration)
- [mise](https://mise.jdx.dev/)
- [asdf](https://asdf-vm.com/)
