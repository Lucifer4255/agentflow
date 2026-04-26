# AgentFlow

A no-code visual builder for agentic workflows. Drag agent nodes onto a canvas, wire them into a graph, attach tools per node, and run the whole pipeline. Each node can connect to **any MCP (Model Context Protocol) server** — no proprietary plugin format, no vendor lock-in.

## The MCP differentiator

n8n, Flowise, and MindStudio all ship their own bespoke tool/integration formats. To add a new capability you write a custom node, learn their abstractions, and wait for the marketplace to catch up.

AgentFlow agents speak **MCP natively**. Paste a URL like `https://mcp.exa.ai/mcp` into a node and that agent immediately gets every tool that server exposes — discovered live, schemas auto-mapped to OpenAI-compatible function calls. Any new MCP server on the planet is plug-and-play.

The included Market Research demo dogfoods this: the News Agent uses the public Exa MCP server for web search.

## Quick start

```bash
git clone <repo>
cd agentflow
npm install
cp .env.example .env.local
# fill in OPENROUTER_API_KEY and EXA_API_KEY
npm run dev
```

Open http://localhost:3000. The Market Research workflow loads automatically. Press **Run**.

## Architecture

- **Next.js 16** App Router, TypeScript throughout
- **React Flow** (`@xyflow/react`) for the canvas
- **Zustand** for graph state (no DB — in-memory MVP)
- **OpenRouter** for LLM calls (OpenAI-compatible) — default model `anthropic/claude-sonnet-4-5`
- **Piston** for sandboxed Python/JS code execution (free, no key)
- **MCP SDK** (`@modelcontextprotocol/sdk`) — Streamable HTTP transport, SSE fallback

The graph executor uses Kahn's algorithm to compute topological **levels** — nodes at the same level run in parallel via `Promise.all`. The demo's News Agent and Financials Agent execute concurrently because they have no dependency between them.

Execution streams back to the client as newline-delimited JSON over a `ReadableStream`, so node statuses light up live.

## Adding your own MCP server

1. Click any agent node to open its config panel
2. Click **+ MCP** under Tools
3. Paste the server URL and an API key (sent as `?exaApiKey=` query param by convention — works for Exa; adjust as needed for other servers)
4. Run — the agent now has every tool the server exposes

The agent decides how to use the discovered tools based on their descriptions. Nothing is hardcoded.

## Building your own workflow

1. **Clear** the canvas
2. **+ Add Node** — repeat as needed
3. Click each node to edit its label, system prompt, and tools
4. Drag from a node's right handle to another's left handle to wire them
5. Hit **Run**. Outputs from upstream nodes are passed as context to downstream agents.

## Tools available per node

- **HTTP Request** — agent picks URL, method, headers, body at runtime
- **Code Executor** — Python or JavaScript, executed in a Piston sandbox
- **MCP Server** — any URL with optional API key

## Roadmap

- Persistence (workflow save/load to localStorage, then DB)
- Workflow sharing via shareable URLs
- Loop and branch nodes
- More built-in tools (file I/O, vector search)
- Streaming token output per node
- Run history with replay

## Tech stack

Next.js 16 · React 19 · TypeScript · React Flow · Zustand · Tailwind · ShadCN-style components · OpenRouter · Piston · MCP SDK
