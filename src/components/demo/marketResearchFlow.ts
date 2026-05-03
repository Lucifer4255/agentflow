import type { Edge } from '@xyflow/react'
import type { AgentNode } from '@/store/graphStore'

const EXA_KEY = '__env__'

export const marketResearchNodes: AgentNode[] = [
  // ── Input ──────────────────────────────────────────────────────────────────
  {
    id: 'input-node',
    type: 'inputNode',
    position: { x: 50, y: 350 },
    data: {
      label: 'Input',
      isInputNode: true,
      userInput: 'Research NVIDIA (NVDA)',
      systemPrompt: 'Pass the user message through as-is.',
      tools: [],
      status: 'idle',
    },
  },

  // ── Router ─────────────────────────────────────────────────────────────────
  {
    id: 'router',
    type: 'routerNode',
    position: { x: 300, y: 350 },
    data: {
      label: 'Intent Router',
      systemPrompt: 'You are routing messages for a financial research assistant.',
      tools: [],
      routes: [
        {
          id: 'research',
          label: 'Full Research',
          description: 'User wants to research or analyse a specific company or stock (e.g. "Research NVIDIA", "Analyse Apple", "What do you think of TSLA?")',
        },
        {
          id: 'general',
          label: 'General Finance',
          description: 'User is asking a general finance or investment question that does not require researching a specific company right now (e.g. "What is P/E ratio?", "Explain EPS", "How does short selling work?")',
        },
      ],
      status: 'idle',
    },
  },

  // ── Research branch ────────────────────────────────────────────────────────
  {
    id: 'news-agent',
    type: 'agentNode',
    position: { x: 600, y: 100 },
    data: {
      label: 'News Agent',
      systemPrompt:
        'You are a financial news researcher. Use the Exa search tool to find the latest news, developments, and announcements about the company.',
      tools: [{ type: 'web_search', webSearchProvider: 'exa', webSearchApiKey: EXA_KEY }],
      inputSchema: [
        { key: 'company', type: 'string', description: 'Company to research' },
        { key: 'ticker', type: 'string', description: 'Stock ticker' },
      ],
      outputSchema: [
        { key: 'headlines', type: 'string[]', description: 'Top 5 recent news headlines' },
        { key: 'recentEvents', type: 'string', description: 'Summary of key recent events and announcements' },
        { key: 'newsSentiment', type: 'string', description: 'Overall tone: positive, negative, or mixed' },
      ],
      status: 'idle',
    },
  },
  {
    id: 'financials-agent',
    type: 'agentNode',
    position: { x: 600, y: 550 },
    data: {
      label: 'Financials Agent',
      systemPrompt:
        'You are a financial data analyst. Use the web search tool to find current financial data for the company. ' +
        'Search for: current stock price, market cap, P/E ratio, EPS, 52-week range, and recent price movement. ' +
        'Use queries like "<ticker> stock price today", "<company> market cap P/E ratio EPS", "<ticker> 52-week high low". ' +
        'Compile the most recent figures you find into a structured financial summary.',
      tools: [{ type: 'web_search', webSearchProvider: 'exa', webSearchApiKey: EXA_KEY }],
      inputSchema: [
        { key: 'company', type: 'string', description: 'Company name' },
        { key: 'ticker', type: 'string', description: 'Stock ticker to fetch data for' },
      ],
      outputSchema: [
        { key: 'currentPrice', type: 'string', description: 'Current stock price with currency' },
        { key: 'priceChange', type: 'string', description: 'Price change and percentage over the last trading day' },
        { key: 'marketCap', type: 'string', description: 'Market capitalisation' },
        { key: 'financialHighlights', type: 'string', description: 'Key metrics: P/E ratio, EPS, 52-week range, analyst target' },
      ],
      status: 'idle',
    },
  },
  {
    id: 'sentiment-agent',
    type: 'agentNode',
    position: { x: 950, y: 300 },
    data: {
      label: 'Sentiment Agent',
      systemPrompt:
        'You are a market sentiment analyst. Based on news coverage and financial data, determine the overall market sentiment with clear reasoning.',
      tools: [],
      inputSchema: [
        { key: 'headlines', type: 'string[]', description: 'Recent news headlines' },
        { key: 'recentEvents', type: 'string', description: 'Key recent events' },
        { key: 'newsSentiment', type: 'string', description: 'News tone' },
        { key: 'currentPrice', type: 'string', description: 'Current stock price' },
        { key: 'priceChange', type: 'string', description: 'Recent price movement' },
      ],
      outputSchema: [
        { key: 'verdict', type: 'string', description: 'Bullish, Neutral, or Bearish' },
        { key: 'confidence', type: 'string', description: 'Low, Medium, or High' },
        { key: 'reasoning', type: 'string', description: 'Explanation for the verdict' },
        { key: 'keySignals', type: 'string[]', description: 'Top 3 signals driving the sentiment' },
      ],
      status: 'idle',
    },
  },
  {
    id: 'risk-agent',
    type: 'agentNode',
    position: { x: 1200, y: 300 },
    data: {
      label: 'Risk Agent',
      systemPrompt:
        'You are a risk analyst. Use the code executor to calculate a risk score (0–100) in Python based on sentiment verdict, confidence, and price movement. Print the score and a short breakdown.',
      tools: [{ type: 'code_executor', language: 'python' }],
      inputSchema: [
        { key: 'verdict', type: 'string', description: 'Sentiment verdict' },
        { key: 'confidence', type: 'string', description: 'Confidence level' },
        { key: 'priceChange', type: 'string', description: 'Recent price movement' },
        { key: 'keySignals', type: 'string[]', description: 'Key sentiment signals' },
      ],
      outputSchema: [
        { key: 'riskScore', type: 'number', description: 'Risk score 0–100' },
        { key: 'riskLevel', type: 'string', description: 'Low, Medium, or High' },
        { key: 'riskFactors', type: 'string[]', description: 'Top risk factors' },
        { key: 'mitigatingFactors', type: 'string[]', description: 'Factors that reduce risk' },
      ],
      status: 'idle',
    },
  },
  {
    id: 'synthesis-agent',
    type: 'agentNode',
    position: { x: 1500, y: 300 },
    data: {
      label: 'Research Brief',
      isOutputNode: true,
      systemPrompt:
        'You are a senior investment analyst. Synthesise all research into a structured investment brief. End with a disclaimer that this is for research purposes only, not financial advice.',
      tools: [],
      inputSchema: [
        { key: 'recentEvents', type: 'string', description: 'Key news and events' },
        { key: 'financialHighlights', type: 'string', description: 'Financial metrics' },
        { key: 'verdict', type: 'string', description: 'Sentiment verdict' },
        { key: 'riskScore', type: 'number', description: 'Calculated risk score' },
        { key: 'riskLevel', type: 'string', description: 'Risk level classification' },
        { key: 'riskFactors', type: 'string[]', description: 'Key risk factors' },
      ],
      outputSchema: [
        { key: 'executiveSummary', type: 'string', description: 'One paragraph executive summary' },
        { key: 'keyFindings', type: 'string[]', description: 'Top 5 findings from the research' },
        { key: 'sentimentAndRisk', type: 'string', description: 'Combined sentiment and risk assessment' },
        { key: 'outlook', type: 'string', description: 'Short-term outlook and considerations' },
        { key: 'disclaimer', type: 'string', description: 'Research disclaimer' },
      ],
      status: 'idle',
    },
  },

  // ── General finance branch ─────────────────────────────────────────────────
  {
    id: 'general-agent',
    type: 'agentNode',
    position: { x: 600, y: 820 },
    data: {
      label: 'Finance Expert',
      systemPrompt:
        'You are a knowledgeable financial expert and educator. Answer the user\'s finance question clearly and concisely. ' +
        'Use real-world examples where helpful. If the question requires current market data you don\'t have, say so and explain the concept anyway. ' +
        'Do not give personalised financial advice.',
      tools: [{ type: 'web_search', webSearchProvider: 'exa', webSearchApiKey: EXA_KEY }],
      outputSchema: [
        { key: 'answer', type: 'string', description: 'Clear answer to the finance question' },
        { key: 'keyPoints', type: 'string[]', description: 'Key takeaways or important nuances' },
        { key: 'example', type: 'string', description: 'A real-world example to illustrate the concept (if applicable)' },
      ],
      status: 'idle',
    },
  },
]

export const marketResearchEdges: Edge[] = [
  // Input → Router
  { id: 'e-input-router', source: 'input-node', target: 'router' },

  // Router → Research branch (via "research" handle)
  { id: 'e-router-news',       source: 'router', sourceHandle: 'research', target: 'news-agent' },
  { id: 'e-router-financials', source: 'router', sourceHandle: 'research', target: 'financials-agent' },

  // Research pipeline
  { id: 'e-news-sentiment',      source: 'news-agent',       target: 'sentiment-agent' },
  { id: 'e-financials-sentiment',source: 'financials-agent', target: 'sentiment-agent' },
  { id: 'e-sentiment-risk',      source: 'sentiment-agent',  target: 'risk-agent' },
  { id: 'e-risk-synthesis',      source: 'risk-agent',       target: 'synthesis-agent' },

  // Router → General finance branch (via "general" handle)
  { id: 'e-router-general', source: 'router', sourceHandle: 'general', target: 'general-agent' },
]
