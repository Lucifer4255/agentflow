import type { Edge } from '@xyflow/react'
import type { AgentNode } from '@/store/graphStore'

// '__env__' is a sentinel — runAgent.ts swaps it server-side with
// process.env.EXA_API_KEY so the real key never reaches the client.
const EXA_KEY = '__env__'

export const marketResearchNodes: AgentNode[] = [
  {
    id: 'input-node',
    type: 'agentNode',
    position: { x: 50, y: 300 },
    data: {
      label: 'Input',
      systemPrompt:
        'You are a query parser. The user will provide a company or stock ticker. Extract and clearly state: 1) Company name 2) Stock ticker if known 3) What research is being requested. Default to NVIDIA (NVDA) if no input is provided. Return a clean structured summary.',
      tools: [],
      status: 'idle',
    },
  },
  {
    id: 'news-agent',
    type: 'agentNode',
    position: { x: 350, y: 100 },
    data: {
      label: 'News Agent',
      systemPrompt:
        'You are a financial news researcher. Use the Exa search tool to find the latest news, developments, and announcements about the company from the input. Return a structured summary: recent events, market sentiment, key announcements.',
      tools: [
        {
          type: 'mcp',
          mcpServerUrl: 'https://mcp.exa.ai/mcp',
          mcpServerName: 'exa',
          mcpApiKey: EXA_KEY,
        },
      ],
      status: 'idle',
    },
  },
  {
    id: 'financials-agent',
    type: 'agentNode',
    position: { x: 350, y: 500 },
    data: {
      label: 'Financials Agent',
      systemPrompt:
        'You are a financial data analyst. Use the HTTP request tool to fetch public financial data for the company. Try Yahoo Finance unofficial endpoints (e.g. https://query1.finance.yahoo.com/v8/finance/chart/TICKER). Return: recent price trend, market cap if available, and any financial highlights.',
      tools: [{ type: 'http_request' }],
      status: 'idle',
    },
  },
  {
    id: 'sentiment-agent',
    type: 'agentNode',
    position: { x: 700, y: 300 },
    data: {
      label: 'Sentiment Agent',
      systemPrompt:
        'You are a market sentiment analyst. Based on the news and financial data from the previous agents, determine overall market sentiment. Rate: Bullish / Neutral / Bearish. Provide clear reasoning and a confidence level (Low / Medium / High).',
      tools: [],
      status: 'idle',
    },
  },
  {
    id: 'risk-agent',
    type: 'agentNode',
    position: { x: 1000, y: 300 },
    data: {
      label: 'Risk Agent',
      systemPrompt:
        'You are a risk analyst. Use the code executor to calculate a risk score (0-100) based on data from previous agents. Write Python code that scores based on sentiment, news volume, and financial indicators, then prints the score and a short breakdown.',
      tools: [{ type: 'code_executor', language: 'python' }],
      status: 'idle',
    },
  },
  {
    id: 'synthesis-agent',
    type: 'agentNode',
    position: { x: 1300, y: 300 },
    data: {
      label: 'Research Brief',
      systemPrompt:
        'You are a senior investment analyst. Synthesize all research from previous agents into a structured brief: Executive Summary, Key Findings, Sentiment & Risk Assessment, and Outlook. End with a disclaimer that this is for research purposes only, not financial advice.',
      tools: [],
      status: 'idle',
    },
  },
]

export const marketResearchEdges: Edge[] = [
  { id: 'e1', source: 'input-node', target: 'news-agent' },
  { id: 'e2', source: 'input-node', target: 'financials-agent' },
  { id: 'e3', source: 'news-agent', target: 'sentiment-agent' },
  { id: 'e4', source: 'financials-agent', target: 'sentiment-agent' },
  { id: 'e5', source: 'sentiment-agent', target: 'risk-agent' },
  { id: 'e6', source: 'risk-agent', target: 'synthesis-agent' },
]
