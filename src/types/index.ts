export type ToolType = "web_search" | "http_request" | "code_executor" | "mcp"

export interface RouteDefinition {
  id: string
  label: string
  description: string
}
export type WebSearchProvider = "exa" | "firecrawl";

export type OutputFieldType = 'string' | 'number' | 'boolean' | 'string[]'

export interface OutputSchemaField {
  key: string
  type: OutputFieldType
  description: string
}

export interface ToolConfig {
  type: ToolType;
  // web_search
  webSearchProvider?: WebSearchProvider;
  webSearchApiKey?: string;
  // http_request
  url?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: string;
  apiKey?: string; // "sk-..." → Bearer · "__env__:VAR" → Bearer from env · "?param=__env__:VAR" → query param
  // code_executor
  language?: "python" | "javascript";
  // mcp
  mcpServerUrl?: string;
  mcpServerName?: string;
  mcpApiKey?: string;
}

export interface AgentNodeData {
  routes?: RouteDefinition[]    // router nodes only
  selectedRoute?: string        // router nodes only — set after execution
  userInput?: string;
  isInputNode?: boolean;
  isOutputNode?: boolean;
  label: string;
  systemPrompt: string;
  tools: ToolConfig[];
  model?: string;
  inputSchema?: OutputSchemaField[];
  outputSchema?: OutputSchemaField[];
  status?: "idle" | "running" | "done" | "error";
  output?: string;
  [key: string]: unknown;
}

export interface ExecutionState {
  running: boolean;
  currentNodeId: string | null;
  outputs: Record<string, string>;
  errors: Record<string, string>;
}
