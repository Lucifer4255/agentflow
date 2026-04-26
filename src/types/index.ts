export type ToolType = "http_request" | "code_executor" | "mcp";

export interface ToolConfig {
  type: ToolType;
  url?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  headers?: Record<string, string>;
  body?: string;
  language?: "python" | "javascript";
  mcpServerUrl?: string;
  mcpServerName?: string;
  mcpApiKey?: string;
}

export interface AgentNodeData {
  userInput?: string;
  isInputNode?: boolean;
  label: string;
  systemPrompt: string;
  tools: ToolConfig[];
  model?: string;
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
