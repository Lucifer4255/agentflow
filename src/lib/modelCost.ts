// Prices in USD per 1M tokens [input, output]
const PRICES: Record<string, [number, number]> = {
  'anthropic/claude-opus-4': [15, 75],
  'anthropic/claude-sonnet-4-5': [3, 15],
  'anthropic/claude-3.5-sonnet': [3, 15],
  'anthropic/claude-3.5-haiku': [0.8, 4],
  'anthropic/claude-3-haiku': [0.25, 1.25],
  'openai/gpt-4o': [5, 15],
  'openai/gpt-4o-mini': [0.15, 0.6],
  'openai/o1': [15, 60],
  'openai/o3-mini': [1.1, 4.4],
  'google/gemini-2.0-flash-001': [0.1, 0.4],
  'google/gemini-flash-1.5': [0.075, 0.3],
  'google/gemini-pro-1.5': [3.5, 10.5],
  'meta-llama/llama-3.1-8b-instruct': [0.05, 0.05],
  'meta-llama/llama-3.1-70b-instruct': [0.35, 0.4],
  'meta-llama/llama-3.3-70b-instruct': [0.35, 0.4],
}

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number | null {
  const price = PRICES[model]
  if (!price) return null
  return (inputTokens * price[0] + outputTokens * price[1]) / 1_000_000
}

export function formatCost(usd: number): string {
  if (usd < 0.0001) return '<$0.0001'
  if (usd < 0.001) return `$${usd.toFixed(4)}`
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  if (usd < 1) return `$${usd.toFixed(3)}`
  return `$${usd.toFixed(2)}`
}
