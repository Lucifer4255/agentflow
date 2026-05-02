export interface HttpRequestArgs {
    url: string
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
    params?: Record<string, string>
    headers?: Record<string, string>
    body?: string
  }

  export async function httpRequest(args: HttpRequestArgs): Promise<string> {
    const method = args.method || 'GET'
    let resolvedUrl = args.url
    if (args.params && Object.keys(args.params).length > 0) {
      const url = new URL(resolvedUrl)
      for (const [k, v] of Object.entries(args.params)) url.searchParams.set(k, v)
      resolvedUrl = url.toString()
    }
    const response = await fetch(resolvedUrl, {
      method,
      headers: args.headers,
      body: method === 'GET' ? undefined : args.body,
    })
  
    const contentType = response.headers.get('content-type') || ''
    const status = `HTTP ${response.status}`
  
    let body: string
    if (contentType.includes('application/json')) {
      const json = await response.json().catch(() => null)
      body = json ? JSON.stringify(json, null, 2) : await response.text()
    } else {
      body = await response.text()
    }
  
    // Cap response size — agents don't need the whole world
    const MAX = 16_000
    const originalLength = body.length
    if (body.length > MAX) {
      body = body.slice(0, MAX) + `\n\n[truncated ${originalLength - MAX} chars]`
    }
  
    return `${status}\n${body}`
  }
  