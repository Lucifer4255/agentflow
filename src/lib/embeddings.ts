export async function embed(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_AI_API_KEY
  if (!apiKey) throw new Error('GOOGLE_AI_API_KEY is not set')

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text: text.slice(0, 8000) }] },
      }),
    },
  )

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText)
    throw new Error(`Embedding API error ${res.status}: ${err}`)
  }

  const data = (await res.json()) as { embedding: { values: number[] } }
  return data.embedding.values
}
