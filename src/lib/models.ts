export const MODEL_GROUPS = [
  { label: 'Router',    models: ['openrouter/auto', 'openrouter/free'] },
  { label: 'Anthropic', models: ['anthropic/claude-sonnet-4.5', 'anthropic/claude-haiku-4.5', 'anthropic/claude-opus-4.7'] },
  { label: 'OpenAI',    models: ['openai/gpt-4.1', 'openai/gpt-4.1-mini', 'openai/gpt-4o', 'openai/gpt-4o-mini', 'openai/o4-mini'] },
  { label: 'Google',    models: ['google/gemini-2.5-pro', 'google/gemini-2.5-flash', 'google/gemini-2.5-flash-lite', 'google/gemini-2.0-flash-001', 'google/gemma-4-31b-it', 'google/gemma-4-26b-a4b-it'] },
  { label: 'DeepSeek',  models: ['deepseek/deepseek-chat', 'deepseek/deepseek-v3.2', 'deepseek/deepseek-r1'] },
  { label: 'Qwen',      models: ['qwen/qwen3-235b-a22b-2507', 'qwen/qwen3-32b', 'qwen/qwen3-14b', 'qwen/qwen3-coder-30b-a3b-instruct'] },
  { label: 'Kimi',      models: ['moonshotai/kimi-k2-0905', 'moonshotai/kimi-k2.5'] },
  { label: 'GLM',       models: ['z-ai/glm-4.7', 'z-ai/glm-4.7-flash', 'z-ai/glm-4-32b'] },
  { label: 'MiniMax',   models: ['minimax/minimax-m1', 'minimax/minimax-m2.7', 'minimax/minimax-m2.5'] },
  { label: 'Meta',      models: ['meta-llama/llama-4-maverick', 'meta-llama/llama-3.3-70b-instruct'] },
  { label: 'Mistral',   models: ['mistralai/mistral-small-3.2-24b-instruct', 'mistralai/devstral-medium'] },
  { label: 'ByteDance', models: ['bytedance-seed/seed-1.6-flash', 'bytedance-seed/seed-2.0-mini'] },
  { label: 'Other',     models: ['xiaomi/mimo-v2-flash', 'inclusionai/ling-2.6-flash'] },
]

export const MODEL_OPTIONS = [
  // ── Budget router ──────────────────────────────────────────────────────────
  'openrouter/auto',            // OpenRouter picks best model automatically

  // ── Free ───────────────────────────────────────────────────────────────────
  'openrouter/free',

  // ── Anthropic ─────────────────────────────────────────────────────────────
  'anthropic/claude-sonnet-4.5',
  'anthropic/claude-haiku-4.5',
  'anthropic/claude-opus-4.7',

  // ── OpenAI ────────────────────────────────────────────────────────────────
  'openai/gpt-4.1',
  'openai/gpt-4.1-mini',
  'openai/gpt-4o',
  'openai/gpt-4o-mini',
  'openai/o4-mini',

  // ── Google ────────────────────────────────────────────────────────────────
  'google/gemini-2.5-pro',
  'google/gemini-2.5-flash',
  'google/gemini-2.5-flash-lite',
  'google/gemini-2.0-flash-001',
  'google/gemma-4-31b-it',
  'google/gemma-4-26b-a4b-it',

  // ── DeepSeek ──────────────────────────────────────────────────────────────
  'deepseek/deepseek-chat',
  'deepseek/deepseek-v3.2',
  'deepseek/deepseek-r1',

  // ── Qwen ──────────────────────────────────────────────────────────────────
  'qwen/qwen3-235b-a22b-2507',
  'qwen/qwen3-32b',
  'qwen/qwen3-14b',
  'qwen/qwen3-coder-30b-a3b-instruct',

  // ── Moonshot / Kimi ───────────────────────────────────────────────────────
  'moonshotai/kimi-k2-0905',
  'moonshotai/kimi-k2.5',

  // ── GLM (Z-AI) ────────────────────────────────────────────────────────────
  'z-ai/glm-4.7',
  'z-ai/glm-4.7-flash',
  'z-ai/glm-4-32b',

  // ── MiniMax ───────────────────────────────────────────────────────────────
  'minimax/minimax-m1',
  'minimax/minimax-m2.7',
  'minimax/minimax-m2.5',

  // ── Meta / Llama ──────────────────────────────────────────────────────────
  'meta-llama/llama-4-maverick',
  'meta-llama/llama-3.3-70b-instruct',

  // ── Mistral ───────────────────────────────────────────────────────────────
  'mistralai/mistral-small-3.2-24b-instruct',
  'mistralai/devstral-medium',

  // ── ByteDance ─────────────────────────────────────────────────────────────
  'bytedance-seed/seed-1.6-flash',
  'bytedance-seed/seed-2.0-mini',

  // ── Other budget picks ────────────────────────────────────────────────────
  'xiaomi/mimo-v2-flash',
  'inclusionai/ling-2.6-flash',
] as const

export type ModelOption = (typeof MODEL_OPTIONS)[number]

// Budget model router — picks cheapest model suitable for the task complexity.
// supportsTools: confirmed to work with function calling via OpenRouter.
export const BUDGET_MODEL_OPTIONS: {
  label: string
  model: string
  priceIn: number
  priceOut: number
  supportsTools: boolean
}[] = [
  { label: 'Mistral Small 3.2',      model: 'mistralai/mistral-small-3.2-24b-instruct', priceIn: 0.07, priceOut: 0.20, supportsTools: true  },
  { label: 'Qwen3 235B',             model: 'qwen/qwen3-235b-a22b-2507',                priceIn: 0.07, priceOut: 0.10, supportsTools: true  },
  { label: 'Gemini 2.0 Flash',       model: 'google/gemini-2.0-flash-001',              priceIn: 0.10, priceOut: 0.40, supportsTools: true  },
  { label: 'Gemini 2.5 Flash Lite',  model: 'google/gemini-2.5-flash-lite',             priceIn: 0.10, priceOut: 0.40, supportsTools: true  },
  { label: 'Llama 3.3 70B',          model: 'meta-llama/llama-3.3-70b-instruct',        priceIn: 0.10, priceOut: 0.32, supportsTools: false },
  { label: 'GLM-4.7 Flash',          model: 'z-ai/glm-4.7-flash',                       priceIn: 0.06, priceOut: 0.40, supportsTools: false },
  { label: 'Gemma 4 26B',            model: 'google/gemma-4-26b-a4b-it',                priceIn: 0.06, priceOut: 0.33, supportsTools: false },
  { label: 'Seed 1.6 Flash',         model: 'bytedance-seed/seed-1.6-flash',             priceIn: 0.07, priceOut: 0.30, supportsTools: false },
  { label: 'Llama 4 Maverick',       model: 'meta-llama/llama-4-maverick',               priceIn: 0.15, priceOut: 0.60, supportsTools: false },
  { label: 'MiniMax M2.5',           model: 'minimax/minimax-m2.5',                      priceIn: 0.15, priceOut: 1.15, supportsTools: false },
  { label: 'Gemini 2.5 Flash',       model: 'google/gemini-2.5-flash',                   priceIn: 0.30, priceOut: 2.50, supportsTools: true  },
  { label: 'Kimi K2',                model: 'moonshotai/kimi-k2-0905',                   priceIn: 0.40, priceOut: 2.00, supportsTools: true  },
  { label: 'Claude Haiku 4.5',       model: 'anthropic/claude-haiku-4.5',                priceIn: 1.00, priceOut: 5.00, supportsTools: true  },
]

/**
 * Picks the cheapest model at or below the given per-1M-token budget.
 * When needsTools is true, only considers models with confirmed tool support.
 */
export function pickBudgetModel(maxPricePerMIn: number, needsTools = false): string {
  const candidates = BUDGET_MODEL_OPTIONS.filter(
    (m) => m.priceIn <= maxPricePerMIn && (!needsTools || m.supportsTools),
  )
  if (candidates.length === 0) {
    // Fallback: cheapest tool-capable model regardless of budget
    const toolModels = BUDGET_MODEL_OPTIONS.filter((m) => !needsTools || m.supportsTools)
    return toolModels.sort((a, b) => a.priceIn - b.priceIn)[0]?.model ?? BUDGET_MODEL_OPTIONS[0].model
  }
  // Among candidates, pick highest quality (highest priceIn = most capable)
  return candidates.sort((a, b) => b.priceIn - a.priceIn)[0].model
}
