import type { ToolConfig } from '@/types'
import { executeCode } from './codeExecutor'
import { httpRequest, type HttpRequestArgs } from './httpRequest'
import { searchExa, searchFirecrawl } from './webSearch'

export interface OpenAIToolDef {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export const WEB_SEARCH_TOOL_NAME = 'web_search'
export const HTTP_TOOL_NAME = 'http_request'
export const CODE_TOOL_NAME = 'code_executor'

export function buildBuiltinToolDefinitions(tools: ToolConfig[]): OpenAIToolDef[] {
  const defs: OpenAIToolDef[] = []
  const types = new Set(tools.map((t) => t.type))

  if (types.has('web_search')) {
    const cfg = tools.find((t) => t.type === 'web_search')
    const provider = cfg?.webSearchProvider ?? 'exa'
    defs.push({
      type: 'function',
      function: {
        name: WEB_SEARCH_TOOL_NAME,
        description:
          `Search the web using ${provider === 'exa' ? 'Exa' : 'Firecrawl'}. ` +
          `Returns titles, URLs, and content excerpts for the most relevant results.`,
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'The search query.' },
            numResults: {
              type: 'number',
              description: 'Number of results to return (default 5, max 10).',
            },
          },
          required: ['query'],
        },
      },
    })
  }

  if (types.has('http_request')) {
    const httpTool = tools.find((t) => t.type === 'http_request')
    const urlHint = httpTool?.url
      ? ` The pre-configured endpoint is: ${httpTool.url}`
      : ''
    defs.push({
      type: 'function',
      function: {
        name: HTTP_TOOL_NAME,
        description:
          `Make an HTTP request.${urlHint ? ` Use the pre-configured endpoint unless told otherwise: ${httpTool!.url}` : ' Provide the full URL.'}`,
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: httpTool?.url ? `Base URL — defaults to ${httpTool.url}` : 'The full URL to request.' },
            method: {
              type: 'string',
              enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
              description: 'HTTP method. Defaults to GET.',
            },
            params: {
              type: 'object',
              description: 'Query parameters as key/value pairs — appended to the URL.',
              additionalProperties: { type: 'string' },
            },
            headers: {
              type: 'object',
              description: 'Optional request headers as key/value pairs.',
              additionalProperties: { type: 'string' },
            },
            body: {
              type: 'string',
              description: 'Optional request body (already serialized).',
            },
          },
          required: ['url'],
        },
      },
    })
  }

  if (types.has('code_executor')) {
    const codeTool = tools.find((t) => t.type === 'code_executor')
    const lang = codeTool?.language || 'python'
    defs.push({
      type: 'function',
      function: {
        name: CODE_TOOL_NAME,
        description: `Execute ${lang} code in a sandboxed environment and return stdout/stderr. Use print() to return values.`,
        parameters: {
          type: 'object',
          properties: {
            code: {
              type: 'string',
              description: `${lang} source code to execute.`,
            },
          },
          required: ['code'],
        },
      },
    })
  }

  return defs
}

export async function executeBuiltinTool(
  name: string,
  args: Record<string, unknown>,
  tools: ToolConfig[],
): Promise<string> {
  if (name === WEB_SEARCH_TOOL_NAME) {
    const cfg = tools.find((t) => t.type === 'web_search')
    const provider = cfg?.webSearchProvider ?? 'exa'
    const rawKey = cfg?.webSearchApiKey ?? ''
    const apiKey = resolveWebSearchApiKey(rawKey, provider)
    if (!apiKey) throw new Error(`Web search API key not configured for ${provider}`)
    const query = String(args.query ?? '')
    const numResults = typeof args.numResults === 'number' ? args.numResults : 5
    if (provider === 'firecrawl') {
      return searchFirecrawl({ query, numResults }, apiKey)
    }
    return searchExa({ query, numResults }, apiKey)
  }

  if (name === HTTP_TOOL_NAME) {
    const httpTool = tools.find((t) => t.type === 'http_request')
    if (typeof args.url !== 'string') {
      if (httpTool?.url) args = { ...args, url: httpTool.url }
      else throw new Error('http_request requires a url')
    }
    const merged: HttpRequestArgs = args as unknown as HttpRequestArgs
    if (httpTool?.apiKey) {
      const auth = resolveHttpApiKey(httpTool.apiKey)
      if (auth) {
        if (auth.param) {
          const url = new URL(merged.url)
          url.searchParams.set(auth.param, auth.key)
          merged.url = url.toString()
        } else {
          merged.headers = {
            Authorization: `Bearer ${auth.key}`,
            ...((args.headers as Record<string, string>) || {}),
          }
        }
      }
    }
    return httpRequest(merged)
  }
  if (name === CODE_TOOL_NAME) {
    const codeTool = tools.find((t) => t.type === 'code_executor')
    const lang = codeTool?.language || 'python'
    return executeCode(lang, String(args.code || ''))
  }
  throw new Error(`Unknown built-in tool: ${name}`)
}

function resolveWebSearchApiKey(raw: string, provider: string): string | undefined {
  if (raw !== '__env__') return raw || undefined
  if (provider === 'firecrawl') return process.env.FIRECRAWL_API_KEY
  return process.env.EXA_API_KEY
}

// Parses apiKey field: "?param=value" → query param · "__env__:VAR" → Bearer from env · plain value → Bearer
function resolveHttpApiKey(raw: string): { key: string; param?: string } | null {
  if (!raw) return null
  if (raw.startsWith('?')) {
    const eq = raw.indexOf('=')
    if (eq === -1) return null
    const param = raw.slice(1, eq)
    const keyRaw = raw.slice(eq + 1)
    const key = resolveEnvSentinel(keyRaw)
    return key ? { key, param } : null
  }
  const key = resolveEnvSentinel(raw)
  return key ? { key } : null
}

function resolveEnvSentinel(raw: string): string | undefined {
  if (!raw.startsWith('__env__')) return raw || undefined
  const varName = raw.includes(':') ? raw.split(':')[1] : undefined
  return varName ? process.env[varName] : undefined
}
