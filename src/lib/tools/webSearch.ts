export interface WebSearchArgs {
  query: string
  numResults?: number
}

export async function searchExa(args: WebSearchArgs, apiKey: string): Promise<string> {
  const res = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: args.query,
      numResults: args.numResults ?? 5,
      contents: { text: { maxCharacters: 2000 } },
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`Exa search failed: HTTP ${res.status} ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  const results: Array<{ title?: string; url?: string; text?: string; publishedDate?: string }> =
    data.results ?? []

  if (results.length === 0) return 'No results found.'

  return results
    .map((r, i) =>
      [
        `[${i + 1}] ${r.title ?? 'Untitled'}`,
        `URL: ${r.url ?? 'N/A'}`,
        r.publishedDate ? `Date: ${r.publishedDate}` : null,
        r.text ? `\n${r.text.trim()}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n---\n\n')
}

export async function searchFirecrawl(args: WebSearchArgs, apiKey: string): Promise<string> {
  const res = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: args.query,
      limit: args.numResults ?? 5,
      scrapeOptions: { formats: ['markdown'] },
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`Firecrawl search failed: HTTP ${res.status} ${err.slice(0, 200)}`)
  }

  const data = await res.json()
  const results: Array<{ title?: string; url?: string; markdown?: string; description?: string }> =
    data.data ?? []

  if (results.length === 0) return 'No results found.'

  return results
    .map((r, i) =>
      [
        `[${i + 1}] ${r.title ?? 'Untitled'}`,
        `URL: ${r.url ?? 'N/A'}`,
        r.description ? `Summary: ${r.description}` : null,
        r.markdown ? `\n${r.markdown.slice(0, 2000).trim()}` : null,
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n\n---\n\n')
}
