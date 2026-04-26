import type { ToolConfig } from '@/types'
import { executeCode } from './codeExecutor'
import { httpRequest, type HttpRequestArgs } from './httpRequest'

export interface OpenAIToolDef {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export const HTTP_TOOL_NAME = 'http_request'
export const CODE_TOOL_NAME = 'code_executor'

export function buildBuiltinToolDefinitions(tools: ToolConfig[]): OpenAIToolDef[] {
  const defs: OpenAIToolDef[] = []
  const types = new Set(tools.map((t) => t.type))

  if (types.has('http_request')) {
    defs.push({
      type: 'function',
      function: {
        name: HTTP_TOOL_NAME,
        description:
          'Make an HTTP request to any URL. Use this to fetch data from public APIs, web pages, or webhooks.',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'The full URL to request.' },
            method: {
              type: 'string',
              enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
              description: 'HTTP method. Defaults to GET.',
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
  if (name === HTTP_TOOL_NAME) {
    if (typeof args.url !== 'string') throw new Error('http_request requires a url')
    return httpRequest(args as unknown as HttpRequestArgs)
  }
  if (name === CODE_TOOL_NAME) {
    const codeTool = tools.find((t) => t.type === 'code_executor')
    const lang = codeTool?.language || 'python'
    return executeCode(lang, String(args.code || ''))
  }
  throw new Error(`Unknown built-in tool: ${name}`)
}
