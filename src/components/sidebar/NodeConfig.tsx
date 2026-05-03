'use client'

import { Trash2, Plus, X, Braces, GitFork } from 'lucide-react'
import { useGraphStore } from '@/store/graphStore'
import type { ToolConfig, ToolType, WebSearchProvider, OutputSchemaField, OutputFieldType, RouteDefinition } from '@/types'
import { MODEL_OPTIONS } from '@/lib/models'
import { cn } from '@/lib/cn'

const TOOL_LABELS: Record<ToolType, string> = {
  web_search: 'Web Search',
  http_request: 'HTTP Request',
  code_executor: 'Code Executor',
  mcp: 'MCP Server',
}

export function NodeConfig() {
  const selectedId = useGraphStore((s) => s.selectedNodeId)
  const node = useGraphStore((s) =>
    s.nodes.find((n) => n.id === selectedId) || null,
  )
  const updateNodeData = useGraphStore((s) => s.updateNodeData)
  const removeNode = useGraphStore((s) => s.removeNode)

  if (!node) {
    return (
      <aside className="flex w-[340px] flex-col border-l border-zinc-800 bg-zinc-950/80 p-6 text-sm text-zinc-500">
        <p className="mb-2 text-zinc-300">No node selected</p>
        <p className="text-xs leading-relaxed">
          Click a node on the canvas to edit its system prompt, model, and tools.
          Connect agents by dragging from the right handle to the left handle of another node.
        </p>
      </aside>
    )
  }

  if (node.type === 'routerNode') {
    return <RouterConfig node={node} updateNodeData={updateNodeData} removeNode={removeNode} />
  }

  const data = node.data
  const tools = data.tools

  const inputSchema = (data.inputSchema ?? []) as OutputSchemaField[]
  const setInputField = (i: number, patch: Partial<OutputSchemaField>) =>
    updateNodeData(node.id, { inputSchema: inputSchema.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) })
  const addInputField = () =>
    updateNodeData(node.id, { inputSchema: [...inputSchema, { key: '', type: 'string', description: '' }] })
  const removeInputField = (i: number) =>
    updateNodeData(node.id, { inputSchema: inputSchema.filter((_, idx) => idx !== i) })

  const outputSchema = (data.outputSchema ?? []) as OutputSchemaField[]
  const setSchemaField = (i: number, patch: Partial<OutputSchemaField>) => {
    const next = outputSchema.map((f, idx) => (idx === i ? { ...f, ...patch } : f))
    updateNodeData(node.id, { outputSchema: next })
  }
  const addSchemaField = () => {
    updateNodeData(node.id, {
      outputSchema: [...outputSchema, { key: '', type: 'string', description: '' }],
    })
  }
  const removeSchemaField = (i: number) =>
    updateNodeData(node.id, { outputSchema: outputSchema.filter((_, idx) => idx !== i) })

  const setTool = (i: number, patch: Partial<ToolConfig>) => {
    const next = tools.map((t, idx) => (idx === i ? { ...t, ...patch } : t))
    updateNodeData(node.id, { tools: next })
  }
  const addTool = (type: ToolType) => {
    const newTool: ToolConfig =
      type === 'web_search'
        ? { type, webSearchProvider: 'exa' }
        : type === 'code_executor'
          ? { type, language: 'python' }
          : type === 'http_request'
            ? { type, method: 'GET' }
            : { type, mcpServerName: 'mcp' }
    updateNodeData(node.id, { tools: [...tools, newTool] })
  }
  const removeTool = (i: number) =>
    updateNodeData(node.id, { tools: tools.filter((_, idx) => idx !== i) })

  return (
    <aside className="flex w-[340px] flex-col overflow-hidden border-l border-zinc-800 bg-zinc-950/80">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Configure Agent
        </h2>
        <button
          onClick={() => removeNode(node.id)}
          className="rounded p-1 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
          title="Delete node"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <Field label="Label">
          <input
            value={data.label}
            onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
            className={inputCls}
          />
        </Field>

        {!data.isInputNode && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2.5">
            <div>
              <p className="text-xs font-medium text-zinc-200">Output Node</p>
              <p className="text-[10px] text-zinc-500">This node's response is the chat answer</p>
            </div>
            <button
              role="switch"
              aria-checked={!!data.isOutputNode}
              onClick={() => updateNodeData(node.id, { isOutputNode: !data.isOutputNode })}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                data.isOutputNode ? 'bg-violet-600' : 'bg-zinc-700',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                  data.isOutputNode ? 'translate-x-4' : 'translate-x-0',
                )}
              />
            </button>
          </div>
        )}

        <Field label="Model">
          <select
            value={data.model ?? ''}
            onChange={(e) =>
              updateNodeData(node.id, { model: e.target.value || undefined })
            }
            className={inputCls}
          >
            <option value="">Inherit from global</option>
            {MODEL_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>

        <Field label="System Prompt">
          <textarea
            value={data.systemPrompt}
            onChange={(e) =>
              updateNodeData(node.id, { systemPrompt: e.target.value })
            }
            rows={6}
            className={cn(inputCls, 'resize-y font-mono text-xs leading-relaxed')}
          />
        </Field>

        <div className="mt-6">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Tools
          </label>
          <div className="mt-1.5 mb-2 flex flex-wrap gap-1">
            {([
              ['web_search', 'Search'],
              ['http_request', 'HTTP'],
              ['code_executor', 'Code'],
              ['mcp', 'MCP'],
            ] as [ToolType, string][]).map(([t, label]) => (
              <button
                key={t}
                onClick={() => addTool(t)}
                className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
                title={`Add ${TOOL_LABELS[t]}`}
              >
                <Plus className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>

          {tools.length === 0 && (
            <p className="rounded border border-dashed border-zinc-800 p-3 text-center text-xs text-zinc-500">
              No tools attached. The agent will respond with text only.
            </p>
          )}

          <div className="space-y-3">
            {tools.map((tool, i) => (
              <div
                key={i}
                className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-zinc-200">
                    {TOOL_LABELS[tool.type]}
                  </span>
                  <button
                    onClick={() => removeTool(i)}
                    className="rounded p-1 text-zinc-500 hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>

                {tool.type === 'web_search' && (
                  <>
                    <Field label="Provider" small>
                      <select
                        value={tool.webSearchProvider ?? 'exa'}
                        onChange={(e) =>
                          setTool(i, { webSearchProvider: e.target.value as WebSearchProvider })
                        }
                        className={inputCls}
                      >
                        <option value="exa">Exa</option>
                        <option value="firecrawl">Firecrawl</option>
                      </select>
                    </Field>
                    <Field label="API Key" small>
                      <input
                        type="password"
                        value={tool.webSearchApiKey ?? ''}
                        onChange={(e) => setTool(i, { webSearchApiKey: e.target.value })}
                        placeholder={
                          tool.webSearchProvider === 'firecrawl'
                            ? 'fc-... or __env__ for FIRECRAWL_API_KEY'
                            : '__env__ for EXA_API_KEY or paste key'
                        }
                        className={inputCls}
                      />
                    </Field>
                  </>
                )}

                {tool.type === 'code_executor' && (
                  <Field label="Language" small>
                    <select
                      value={tool.language || 'python'}
                      onChange={(e) =>
                        setTool(i, {
                          language: e.target.value as 'python' | 'javascript',
                        })
                      }
                      className={inputCls}
                    >
                      <option value="python">Python</option>
                      <option value="javascript">JavaScript</option>
                    </select>
                  </Field>
                )}

                {tool.type === 'mcp' && (
                  <>
                    <Field label="Server Name" small>
                      <input
                        value={tool.mcpServerName || ''}
                        onChange={(e) =>
                          setTool(i, { mcpServerName: e.target.value })
                        }
                        placeholder="exa"
                        className={inputCls}
                      />
                    </Field>
                    <Field label="Server URL" small>
                      <input
                        value={tool.mcpServerUrl || ''}
                        onChange={(e) =>
                          setTool(i, { mcpServerUrl: e.target.value })
                        }
                        placeholder="https://mcp.exa.ai/mcp"
                        className={inputCls}
                      />
                    </Field>
                    <Field label="API Key" small>
                      <input
                        type="password"
                        value={tool.mcpApiKey || ''}
                        onChange={(e) =>
                          setTool(i, { mcpApiKey: e.target.value })
                        }
                        placeholder="Optional — sent as exaApiKey query param"
                        className={inputCls}
                      />
                    </Field>
                  </>
                )}

                {tool.type === 'http_request' && (
                  <>
                    <Field label="Base URL" small>
                      <input
                        value={tool.url || ''}
                        onChange={(e) => setTool(i, { url: e.target.value })}
                        placeholder="https://api.example.com/v1/..."
                        className={inputCls}
                      />
                    </Field>
                    <Field label="API Key" small>
                      <input
                        type="password"
                        value={tool.apiKey || ''}
                        onChange={(e) => setTool(i, { apiKey: e.target.value })}
                        placeholder="sk-… · __env__:VAR · ?param=__env__:VAR"
                        className={inputCls}
                      />
                    </Field>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Input Schema */}
        {!data.isInputNode && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Input Schema
              </label>
              <button
                onClick={addInputField}
                className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
              >
                <Plus className="h-3 w-3" />
                Add field
              </button>
            </div>
            {inputSchema.length === 0 ? (
              <div className="rounded border border-dashed border-zinc-800 p-3 text-center">
                <p className="text-[10px] text-zinc-500">No input schema</p>
                <p className="mt-0.5 text-[9px] text-zinc-600">
                  Upstream context is passed as raw text
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {inputSchema.map((field, i) => (
                  <SchemaFieldRow
                    key={i}
                    field={field}
                    onChange={(patch) => setInputField(i, patch)}
                    onRemove={() => removeInputField(i)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Output Schema */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Output Schema
            </label>
            <button
              onClick={addSchemaField}
              className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
            >
              <Plus className="h-3 w-3" />
              Add field
            </button>
          </div>

          {outputSchema.length === 0 ? (
            <div className="rounded border border-dashed border-zinc-800 p-3 text-center">
              <Braces className="mx-auto mb-1.5 h-4 w-4 text-zinc-600" />
              <p className="text-[10px] text-zinc-500">Using default schema</p>
              <p className="mt-0.5 text-[9px] text-zinc-600">
                <span className="font-mono">response</span> · <span className="font-mono">keyPoints[]</span>
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {outputSchema.map((field, i) => (
                <SchemaFieldRow
                  key={i}
                  field={field}
                  onChange={(patch) => setSchemaField(i, patch)}
                  onRemove={() => removeSchemaField(i)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

const inputCls =
  'mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 outline-none transition focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40'

function SchemaFieldRow({
  field,
  onChange,
  onRemove,
}: {
  field: OutputSchemaField
  onChange: (patch: Partial<OutputSchemaField>) => void
  onRemove: () => void
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
      <div className="flex items-center gap-1.5">
        <input
          value={field.key}
          onChange={(e) => onChange({ key: e.target.value })}
          placeholder="fieldName"
          className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-[11px] text-zinc-100 outline-none focus:border-sky-500"
        />
        <select
          value={field.type}
          onChange={(e) => onChange({ type: e.target.value as OutputFieldType })}
          className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-1 text-[10px] text-zinc-300 outline-none focus:border-sky-500"
        >
          <option value="string">string</option>
          <option value="number">number</option>
          <option value="boolean">boolean</option>
          <option value="string[]">string[]</option>
        </select>
        <button
          onClick={onRemove}
          className="shrink-0 rounded p-1 text-zinc-500 hover:text-red-400"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <input
        value={field.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Description (helps the model understand this field)"
        className="mt-1.5 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-400 outline-none focus:border-sky-500"
      />
    </div>
  )
}

function RouterConfig({
  node,
  updateNodeData,
  removeNode,
}: {
  node: ReturnType<typeof useGraphStore.getState>['nodes'][number]
  updateNodeData: (id: string, patch: Partial<import('@/types').AgentNodeData>) => void
  removeNode: (id: string) => void
}) {
  const data = node.data
  const routes = (data.routes ?? []) as RouteDefinition[]

  const uid = () => `r_${Math.random().toString(36).slice(2, 7)}`

  const setRoute = (i: number, patch: Partial<RouteDefinition>) =>
    updateNodeData(node.id, { routes: routes.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) })

  const addRoute = () =>
    updateNodeData(node.id, { routes: [...routes, { id: uid(), label: 'New Route', description: '' }] })

  const removeRoute = (i: number) =>
    updateNodeData(node.id, { routes: routes.filter((_, idx) => idx !== i) })

  return (
    <aside className="flex w-[340px] flex-col overflow-hidden border-l border-zinc-800 bg-zinc-950/80">
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <GitFork className="h-4 w-4 text-violet-400" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Configure Router
          </h2>
        </div>
        <button
          onClick={() => removeNode(node.id)}
          className="rounded p-1 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Field label="Label">
          <input
            value={data.label}
            onChange={(e) => updateNodeData(node.id, { label: e.target.value })}
            className={inputCls}
          />
        </Field>

        <Field label="Model">
          <select
            value={data.model ?? ''}
            onChange={(e) => updateNodeData(node.id, { model: e.target.value || undefined })}
            className={inputCls}
          >
            <option value="">Inherit from global</option>
            {MODEL_OPTIONS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </Field>

        <Field label="Additional Instructions">
          <textarea
            value={data.systemPrompt}
            onChange={(e) => updateNodeData(node.id, { systemPrompt: e.target.value })}
            rows={3}
            placeholder="Optional extra context for the router (e.g. 'The user is a financial analyst')"
            className={cn(inputCls, 'resize-y text-xs leading-relaxed')}
          />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Routes
            </label>
            <button
              onClick={addRoute}
              className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800"
            >
              <Plus className="h-3 w-3" />
              Add route
            </button>
          </div>

          <p className="mb-2 text-[10px] text-zinc-600">
            Each route gets its own output handle. Drag edges from the matching handle to the nodes that should run on that branch.
          </p>

          {routes.length === 0 && (
            <p className="rounded border border-dashed border-zinc-800 p-3 text-center text-xs text-zinc-500">
              No routes yet. Add at least two.
            </p>
          )}

          <div className="space-y-3">
            {routes.map((route, i) => (
              <div key={route.id} className="rounded-lg border border-violet-900/50 bg-violet-950/30 p-3">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400 shrink-0" />
                  <input
                    value={route.label}
                    onChange={(e) => setRoute(i, { label: e.target.value })}
                    placeholder="Route name"
                    className="min-w-0 flex-1 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-100 outline-none focus:border-violet-500"
                  />
                  <button
                    onClick={() => removeRoute(i)}
                    className="shrink-0 rounded p-1 text-zinc-500 hover:text-red-400"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <input
                  value={route.description}
                  onChange={(e) => setRoute(i, { description: e.target.value })}
                  placeholder="When should this route be selected? (guides the LLM)"
                  className="w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-400 outline-none focus:border-violet-500"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}

function Field({
  label,
  children,
  small,
}: {
  label: string
  children: React.ReactNode
  small?: boolean
}) {
  return (
    <div className={small ? 'mt-2' : 'mt-4 first:mt-0'}>
      <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        {label}
      </label>
      {children}
    </div>
  )
}
