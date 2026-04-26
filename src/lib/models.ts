export const MODEL_OPTIONS = [
    // OpenRouter free router (auto-picks a compatible free model)
    'openrouter/free',
  
    // Common paid/default options
    'anthropic/claude-sonnet-4-5',
    'anthropic/claude-opus-4',
    'openai/gpt-4o',
    'openai/gpt-4o-mini',
    'google/gemini-2.0-flash-exp',
  ] as const
  
  export type ModelOption = (typeof MODEL_OPTIONS)[number]
  
  