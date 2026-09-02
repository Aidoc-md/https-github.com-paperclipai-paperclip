# Higgsfield MCP Server

Documentation for connecting to the [Higgsfield](https://higgsfield.ai) Model
Context Protocol (MCP) server.

## Endpoint

```
https://mcp.higgsfield.ai/mcp
```

This is a remote, streamable-HTTP MCP server (JSON-RPC over HTTP, per the
[MCP spec](https://modelcontextprotocol.io)). It is not a browsable web page —
fetching it with a plain HTTP GET returns nothing useful; it must be spoken to
with an MCP client.

## Adding it to an MCP client

### Claude Code

```bash
claude mcp add --transport http higgsfield https://mcp.higgsfield.ai/mcp
```

### Claude Desktop / other JSON-config clients

```json
{
  "mcpServers": {
    "higgsfield": {
      "url": "https://mcp.higgsfield.ai/mcp"
    }
  }
}
```

Check whether your client needs an API key or auth header for this server —
Higgsfield's own docs/dashboard are the source of truth for credentials, since
that isn't discoverable from the bare endpoint URL.

## Discovering available tools

Once connected, list the server's tools from within the client (e.g. ask the
assistant "what tools does the higgsfield MCP server expose?", or run the
client's own `tools/list` inspection command). This repo does not hard-code a
tool catalog because:

- The catalog is defined by the live server and can change without notice.
- This environment's network egress is restricted and could not reach
  `mcp.higgsfield.ai` to introspect it directly.

If you need this README to document the actual tool list, connect a client
with access to the endpoint, capture the `tools/list` response, and update
this file with the confirmed tool names, descriptions, and parameters.

## About Higgsfield

Higgsfield AI is an AI-driven creative platform focused on video and image
generation (e.g. cinematic camera moves, image-to-video, and stylistic
effects). This MCP server is presumed to expose some subset of that
functionality as callable tools, but the exact surface should be confirmed
against the live server rather than assumed from general knowledge.
